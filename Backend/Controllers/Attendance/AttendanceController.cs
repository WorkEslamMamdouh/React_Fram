#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using GateWay.App;
using ERP.Common;

namespace ERP.Attendance
{
    [ApiController]
    [Route("api/att")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly PunchIngestService _ingest;
        private readonly PermissionChecker _perm;
        public AttendanceController(PunchIngestService ingest, PermissionChecker perm) { _ingest = ingest; _perm = perm; }

        private int UserId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;
        private IActionResult R(object o) => Ok(JsonConvert.SerializeObject(new BaseResponse(o)));
        private IActionResult Bad(string m) => Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, m)));
        private IActionResult Forbidden() => Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.Forbidden, "no permission")));

        [HttpPost("ImportCsv")]
        public async Task<IActionResult> ImportCsv([FromForm] IFormFile file, [FromForm] string profileCode, [FromForm] int deviceId, [FromForm] bool dryRun = false)
        {
            if (file == null || file.Length == 0) return Bad("file required");
            if (file.Length > 10_000_000) return Bad("file too large");

            var prof = await RuntimeDb.FirstAsync("SELECT * FROM dbo.Att_CsvProfile WHERE ProfileCode=@p", ("@p", profileCode));
            if (prof == null) return Bad("unknown profile");
            int comp = RuntimeDb.I(prof["CompCode"]);
            if (!await _perm.HasAsync(UserId, "Att_Import", comp, 0, "CREATE")) return Forbidden();

            var p = new CsvProfile
            {
                Delimiter = (RuntimeDb.S(prof["Delimiter"]) ?? ",").FirstOrDefault(','),
                HasHeader = Convert.ToBoolean(prof["HasHeader"]),
                ColUserId = RuntimeDb.S(prof["ColUserId"]) ?? "1",
                ColDateTime = RuntimeDb.S(prof["ColDateTime"]),
                ColDate = RuntimeDb.S(prof["ColDate"]),
                ColTime = RuntimeDb.S(prof["ColTime"]),
                ColState = RuntimeDb.S(prof["ColState"]),
                DateTimeFormat = RuntimeDb.S(prof["DateTimeFormat"]) ?? "yyyy-MM-dd HH:mm:ss"
            };
            var smap = RuntimeDb.S(prof["StateMapJson"]);
            if (!string.IsNullOrEmpty(smap)) { try { p.StateMap = JObject.Parse(smap!).Properties().ToDictionary(x => x.Name, x => x.Value.Value<int>()); } catch { } }

            using var reader = new StreamReader(file.OpenReadStream());
            var text = await reader.ReadToEndAsync();
            var parsed = CsvPunchParser.Parse(text, p);
            if (parsed.Rows > 200_000) return Bad("too many rows");

            if (dryRun)
                return R(new { rows = parsed.Rows, inserted = 0, duplicates = 0, errors = parsed.Errors.Select(e => new { line = e.line, message = e.message }) });

            var recs = parsed.Punches.Select(x => new PunchRecord { DeviceUserId = x.DeviceUserId, PunchLocal = x.PunchLocal, State = x.State }).ToList();
            int useDevice = deviceId > 0 ? deviceId : RuntimeDb.NI(prof["DefaultDeviceId"]) ?? 0;
            if (useDevice == 0) return Bad("deviceId required");
            var res = await _ingest.IngestAsync(useDevice, "csv", recs);
            return R(new { rows = parsed.Rows, inserted = res.Inserted, duplicates = res.Duplicates, errors = parsed.Errors.Select(e => new { line = e.line, message = e.message }) });
        }

        public class ProcessRequest { public int compCode { get; set; } public int? branchCode { get; set; } public DateTime from { get; set; } public DateTime to { get; set; } public List<int>? empIds { get; set; } }

        [HttpPost("Process")]
        public async Task<IActionResult> Process([FromBody] ProcessRequest req)
        {
            if (!await _perm.HasAsync(UserId, "Att_Daily", req.compCode, req.branchCode ?? 0, "CUSTOM1")) return Forbidden();
            var pj = JsonConvert.SerializeObject(new { compCode = req.compCode, branchCode = req.branchCode, from = req.from.ToString("yyyy-MM-dd"), to = req.to.ToString("yyyy-MM-dd"), empIds = req.empIds });
            var runId = await RuntimeDb.ScalarAsync(
                "INSERT INTO dbo.Sys_JobRuns (JobCode, Status, TriggeredBy, ParamsJson) OUTPUT INSERTED.RunId VALUES ('att.process','queued',@by,@p)",
                ("@by", $"user:{UserId}"), ("@p", pj));
            return R(new { runId = Convert.ToInt64(runId) });
        }

        [HttpGet("RunInfo")]
        public async Task<IActionResult> RunInfo(long runId)
        {
            var row = await RuntimeDb.FirstAsync("SELECT RunId, JobCode, Status, Message, QueuedAtUtc, StartedAtUtc, FinishedAtUtc, ResultJson FROM dbo.Sys_JobRuns WHERE RunId=@r", ("@r", runId));
            if (row == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.NotFound, "not found")));
            return R(row);
        }

        public class ManualPunchRequest { public int compCode { get; set; } public int? branchCode { get; set; } public int empId { get; set; } public DateTime punchLocal { get; set; } public string direction { get; set; } = "I"; public string reason { get; set; } = ""; }

        [HttpPost("ManualPunch")]
        public async Task<IActionResult> ManualPunch([FromBody] ManualPunchRequest req)
        {
            if (!await _perm.HasAsync(UserId, "Att_ManualPunch", req.compCode, req.branchCode ?? 0, "CREATE")) return Forbidden();
            if (string.IsNullOrWhiteSpace(req.reason)) return Bad("reason required");
            var dir = req.direction == "O" ? "O" : "I";
            var punchId = await RuntimeDb.ScalarAsync(
                "INSERT INTO dbo.Att_Punch (CompCode, BranchCode, EmpID, PunchLocal, Direction, Source, IsManual, ManualReason, ApprovalStatus, CreatedBy) " +
                "OUTPUT INSERTED.PunchId VALUES (@c,@b,@e,@t,@dir,'manual',1,@r,'pending',@by)",
                ("@c", req.compCode), ("@b", (object?)req.branchCode), ("@e", req.empId), ("@t", req.punchLocal), ("@dir", dir), ("@r", req.reason), ("@by", UserId));
            return R(new { punchId = Convert.ToInt64(punchId) });
        }

        public class ApproveRequest { public long punchId { get; set; } public bool approve { get; set; } public int compCode { get; set; } public int? branchCode { get; set; } }

        [HttpPost("ApproveManualPunch")]
        public async Task<IActionResult> ApproveManualPunch([FromBody] ApproveRequest req)
        {
            if (!await _perm.HasAsync(UserId, "Att_ManualPunch", req.compCode, req.branchCode ?? 0, "CUSTOM1")) return Forbidden();
            await RuntimeDb.ExecuteAsync(
                "UPDATE dbo.Att_Punch SET ApprovalStatus=@s, ApprovedBy=@by, ApprovedAtUtc=SYSUTCDATETIME() WHERE PunchId=@id AND IsManual=1",
                ("@s", req.approve ? "approved" : "rejected"), ("@by", UserId), ("@id", req.punchId));
            await RuntimeDb.ExecuteAsync("INSERT INTO dbo.Sys_AuditLog (Source, Action, UserID, RecordKey) VALUES ('runtime','PUNCH_MANUAL',@u,@k)", ("@u", UserId), ("@k", req.punchId.ToString()));
            return R(new { ok = true });
        }

        public class ResolveExceptionRequest { public long exceptionId { get; set; } public string action { get; set; } = "ignore"; public int? empId { get; set; } public int compCode { get; set; } }

        [HttpPost("ResolveException")]
        public async Task<IActionResult> ResolveException([FromBody] ResolveExceptionRequest req)
        {
            if (!await _perm.HasAsync(UserId, "Att_Exceptions", req.compCode, 0, "EDIT")) return Forbidden();
            var ex = await RuntimeDb.FirstAsync("SELECT DeviceUserId FROM dbo.Att_Exception WHERE ExceptionId=@id", ("@id", req.exceptionId));
            if (ex == null) return Bad("exception not found");
            if (req.action == "map" && req.empId.HasValue)
            {
                await RuntimeDb.ExecuteAsync(
                    "INSERT INTO dbo.Att_DeviceUserMap (DeviceId, DeviceUserId, EmpID, CreatedBy) VALUES (NULL, @u, @e, @by)",
                    ("@u", RuntimeDb.S(ex["DeviceUserId"])), ("@e", req.empId.Value), ("@by", $"user:{UserId}"));
                // re-queue mapping for existing raw rows
                await RuntimeDb.ExecuteAsync("UPDATE dbo.Att_RawPunch SET IsMapped=0, MapStatus=NULL WHERE DeviceUserId=@u AND MapStatus='unknown'", ("@u", RuntimeDb.S(ex["DeviceUserId"])));
            }
            await RuntimeDb.ExecuteAsync("UPDATE dbo.Att_Exception SET Status=@s, ResolvedBy=@by, ResolvedAtUtc=SYSUTCDATETIME() WHERE ExceptionId=@id",
                ("@s", req.action == "map" ? "resolved" : "ignored"), ("@by", UserId), ("@id", req.exceptionId));
            return R(new { ok = true });
        }
    }
}
