#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using GateWay.App;
using ERP.Common;
using ERP.Attendance;

namespace ERP.Devices
{
    public class PairRequest { public string code { get; set; } = ""; public string? machineName { get; set; } public string? agentVersion { get; set; } public string? osVersion { get; set; } }
    public class AttPunchItem { public string u { get; set; } = ""; public DateTime t { get; set; } public int s { get; set; } public int? v { get; set; } public string? w { get; set; } }
    public class AttPunchBatch { public int attendanceDeviceId { get; set; } public string? batchId { get; set; } public DateTime? deviceClockLocal { get; set; } public List<AttPunchItem> records { get; set; } = new(); }

    [ApiController]
    [Route("api/devices")]
    public class DevicesController : ControllerBase
    {
        private readonly PairingService _pairing;
        private readonly PunchIngestService _ingest;
        private readonly IConfiguration _cfg;

        public DevicesController(PairingService pairing, PunchIngestService ingest, IConfiguration cfg)
        {
            _pairing = pairing; _ingest = ingest; _cfg = cfg;
        }

        private int DeviceId => int.TryParse(User.FindFirst("device_id")?.Value, out var id) ? id : 0;

        private string BaseUrl()
        {
            var pub = _cfg["Runtime:PublicUrl"];
            if (!string.IsNullOrEmpty(pub)) return pub.TrimEnd('/');
            return $"{Request.Scheme}://{Request.Host}";
        }

        // Anonymous, rate-limited.
        [HttpPost("pair")]
        [AllowAnonymous]
        [EnableRateLimiting("pair")]
        public async Task<IActionResult> Pair([FromBody] PairRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.code))
                return BadRequest(new { error = "invalid_code" });
            var r = await _pairing.PairAsync(req.code, req.machineName, req.agentVersion, req.osVersion);
            if (!r.Ok) return BadRequest(new { error = r.Error ?? "invalid_code" });
            var baseUrl = BaseUrl();
            return Ok(new
            {
                deviceId = r.DeviceId,
                deviceToken = r.DeviceToken,
                hubUrl = baseUrl + "/hubs/devices",
                apiBaseUrl = baseUrl + "/api/",
                name = r.Name,
                compCode = r.CompCode,
                branchCode = r.BranchCode
            });
        }

        // Device-authenticated payload fetch.
        [HttpGet("jobs/{jobId}/payload")]
        [Authorize(AuthenticationSchemes = DeviceAuthenticationHandler.SchemeName)]
        public async Task<IActionResult> JobPayload(string jobId)
        {
            if (!Guid.TryParse(jobId, out var g)) return BadRequest();
            var row = await RuntimeDb.FirstAsync(
                "SELECT PayloadJson, PayloadPurgedAtUtc, ExpiresAtUtc, BridgeDeviceId FROM dbo.Sys_PrintJobs WHERE JobId=@j", ("@j", g));
            if (row == null) return NotFound();
            if (RuntimeDb.I(row["BridgeDeviceId"]) != DeviceId) return Forbid();
            if (row["PayloadPurgedAtUtc"] != null || Convert.ToDateTime(row["ExpiresAtUtc"]) < DateTime.UtcNow || row["PayloadJson"] == null)
                return StatusCode((int)HttpStatusCode.Gone);
            return Content(RuntimeDb.S(row["PayloadJson"]) ?? "{}", "application/json");
        }

        // Device-authenticated punch upload.
        [HttpPost("att/punches")]
        [Authorize(AuthenticationSchemes = DeviceAuthenticationHandler.SchemeName)]
        public async Task<IActionResult> UploadPunches([FromBody] AttPunchBatch batch)
        {
            if (batch == null || batch.records.Count == 0) return Ok(new { ok = true, inserted = 0, duplicates = 0 });
            if (batch.records.Count > 1000) return BadRequest(new { error = "too_many_records" });
            // the attendance device must belong to this bridge
            var dev = await RuntimeDb.FirstAsync(
                "SELECT BridgeDeviceId FROM dbo.Sys_Devices WHERE DeviceId=@id AND DeviceKind='attendance'", ("@id", batch.attendanceDeviceId));
            if (dev == null || RuntimeDb.I(dev["BridgeDeviceId"]) != DeviceId) return Forbid();

            var recs = new List<PunchRecord>();
            foreach (var x in batch.records)
                recs.Add(new PunchRecord { DeviceUserId = x.u, PunchLocal = x.t, State = x.s, Verify = x.v, WorkCode = x.w });
            var res = await _ingest.IngestAsync(batch.attendanceDeviceId, "pull", recs);
            return Ok(new { ok = true, inserted = res.Inserted, duplicates = res.Duplicates, lastPunchLocal = res.LastPunchLocal?.ToString("s") });
        }

        // Device-authenticated log upload (text/plain).
        [HttpPost("logs")]
        [Authorize(AuthenticationSchemes = DeviceAuthenticationHandler.SchemeName)]
        public async Task<IActionResult> UploadLogs()
        {
            using var reader = new StreamReader(Request.Body);
            var text = await reader.ReadToEndAsync();
            if (text.Length > 2_000_000) text = text.Substring(0, 2_000_000);
            var dir = Path.Combine(AppContext.BaseDirectory, "App_Data", "bridge-logs", DeviceId.ToString());
            Directory.CreateDirectory(dir);
            var file = Path.Combine(dir, $"bridge-{DateTime.UtcNow:yyyyMMddHHmmss}.log");
            await System.IO.File.WriteAllTextAsync(file, text);
            return Ok(new { ok = true, bytes = text.Length });
        }

        // JWT: device status list for a scope.
        [HttpGet("Status")]
        [Authorize]
        public async Task<IActionResult> Status(int compCode, int? branchCode = null)
        {
            var rows = await RuntimeDb.QueryAsync(
                "SELECT DeviceId, Name, DeviceKind, IsOnline, LastSeenAtUtc, AgentVersion FROM dbo.Sys_Devices " +
                "WHERE CompCode=@c AND (@b IS NULL OR BranchCode=@b) AND IsActive=1 ORDER BY DeviceKind, Name",
                ("@c", compCode), ("@b", (object?)branchCode));
            var list = new List<object>();
            foreach (var r in rows)
                list.Add(new
                {
                    deviceId = RuntimeDb.I(r["DeviceId"]),
                    name = RuntimeDb.S(r["Name"]),
                    kind = RuntimeDb.S(r["DeviceKind"]),
                    isOnline = Convert.ToBoolean(r["IsOnline"]),
                    lastSeenAtUtc = r["LastSeenAtUtc"],
                    agentVersion = RuntimeDb.S(r["AgentVersion"])
                });
            return Ok(JsonConvert.SerializeObject(new BaseResponse(list)));
        }
    }
}
