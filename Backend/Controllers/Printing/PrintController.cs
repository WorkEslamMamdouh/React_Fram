#nullable enable
using System;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using GateWay.App;
using ERP.Common;

namespace ERP.Printing
{
    public class ResolveRequest { public string docKey { get; set; } = ""; public string? station { get; set; } public int compCode { get; set; } public int branchCode { get; set; } public string? terminalKey { get; set; } }
    public class CreateJobRequest
    {
        public string docKey { get; set; } = ""; public string? moduleCode { get; set; } public string? reportCode { get; set; } public string? recordKey { get; set; }
        public int compCode { get; set; } public int branchCode { get; set; } public string? terminalKey { get; set; }
        public int routeId { get; set; } public string? station { get; set; } public int? copies { get; set; } public bool isReprint { get; set; }
        public JObject? payload { get; set; }
    }

    [ApiController]
    [Route("api/print")]
    [Authorize]
    public class PrintController : ControllerBase
    {
        private readonly PrintService _print;
        private readonly PermissionChecker _perm;
        private readonly IConfiguration _cfg;

        public PrintController(PrintService print, PermissionChecker perm, IConfiguration cfg)
        {
            _print = print; _perm = perm; _cfg = cfg;
        }

        private int UserId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

        [HttpPost("Resolve")]
        public async Task<IActionResult> Resolve([FromBody] ResolveRequest req)
        {
            var r = await _print.ResolveAsync(req.docKey, req.station, req.compCode, req.branchCode, UserId, req.terminalKey);
            return Ok(JsonConvert.SerializeObject(new BaseResponse(r)));
        }

        [HttpPost("CreateJob")]
        public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest req)
        {
            if (req.payload == null) return Bad("payload required");
            int maxBytes = _cfg.GetValue<int?>("Printing:MaxPayloadBytes") ?? 4194304;
            var payloadJson = req.payload.ToString(Formatting.None);
            if (System.Text.Encoding.UTF8.GetByteCount(payloadJson) > maxBytes) return Bad("payload too large");
            var kind = req.payload.Value<string>("kind") ?? "html";
            if (kind == "html")
            {
                var html = req.payload.Value<string>("html") ?? "";
                if (!html.TrimStart().StartsWith("<!doctype html>", StringComparison.OrdinalIgnoreCase)) return Bad("html must start with <!doctype html>");
            }

            // permission: PRINT (or reprint permission) on moduleCode
            var reprintPerm = (await RuntimeDb.ScalarAsync("SELECT SettingValue FROM dbo.Sys_RuntimeSettings WHERE SettingKey='Print.ReprintPermission'"))?.ToString() ?? "PRINT";
            var flag = req.isReprint ? reprintPerm : "PRINT";
            if (!string.IsNullOrEmpty(req.moduleCode) && !await _perm.HasAsync(UserId, req.moduleCode!, req.compCode, req.branchCode, flag))
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.Forbidden, "no print permission")));

            // route still a candidate?
            var terminalId = await _print.ResolveTerminalAsync(req.terminalKey, req.compCode, req.branchCode);
            var cands = await RuntimeDb.QueryAsync(
                "SELECT * FROM dbo.Sys_PrintRouteCandidates(@d,@s,@c,@b,@u,@t)",
                ("@d", req.docKey), ("@s", (object?)req.station), ("@c", req.compCode), ("@b", req.branchCode), ("@u", UserId), ("@t", (object?)terminalId));
            var win = cands.FirstOrDefault(x => RuntimeDb.I(x["RouteId"]) == req.routeId);
            if (win == null) return Bad("route no longer valid for this scope");

            int printerId = RuntimeDb.I(win["PrinterId"]);
            var pr = await RuntimeDb.FirstAsync("SELECT BridgeDeviceId FROM dbo.Sys_Printers WHERE PrinterId=@id AND IsActive=1", ("@id", printerId));
            if (pr == null) return Bad("printer inactive");
            int bridgeId = RuntimeDb.I(pr["BridgeDeviceId"]);
            int copies = req.copies ?? Convert.ToInt32(win["Copies"]);

            var jobId = await _print.CreateJobAsync(
                req.docKey, req.reportCode, req.moduleCode, req.recordKey,
                req.compCode, req.branchCode, UserId, terminalId, req.station,
                req.routeId, printerId, bridgeId, copies,
                Convert.ToBoolean(win["CopyWatermark"]), Convert.ToBoolean(win["OpenDrawer"]),
                kind, payloadJson, RuntimeDb.NI(win["TtlMin"]), req.isReprint);

            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { mode = "bridge", jobs = new[] { new { jobId = jobId.ToString(), status = "sent" } } })));
        }

        [HttpGet("JobInfo")]
        public async Task<IActionResult> JobInfo(string jobId)
        {
            if (!Guid.TryParse(jobId, out var g)) return Bad("bad jobId");
            var row = await RuntimeDb.FirstAsync("SELECT JobId, DocKey, Status, Attempts, Error, PrinterId, CreatedAtUtc, PrintedAtUtc, ExpiresAtUtc FROM dbo.Sys_PrintJobs WHERE JobId=@j", ("@j", g));
            if (row == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.NotFound, "not found")));
            return Ok(JsonConvert.SerializeObject(new BaseResponse(row)));
        }

        [HttpPost("Retry")]
        public async Task<IActionResult> Retry([FromBody] JobIdRequest req)
        {
            if (!Guid.TryParse(req.jobId, out var g)) return Bad("bad jobId");
            var n = await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_PrintJobs SET Status='sent', Error=NULL WHERE JobId=@j AND Status IN ('failed','expired')", ("@j", g));
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { retried = n > 0 })));
        }

        [HttpPost("Reprint")]
        public async Task<IActionResult> Reprint([FromBody] JobIdRequest req)
        {
            if (!Guid.TryParse(req.jobId, out var g)) return Bad("bad jobId");
            var row = await RuntimeDb.FirstAsync("SELECT PayloadJson, PayloadPurgedAtUtc FROM dbo.Sys_PrintJobs WHERE JobId=@j", ("@j", g));
            if (row == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.NotFound, "not found")));
            if (row["PayloadJson"] == null || row["PayloadPurgedAtUtc"] != null)
                return StatusCode((int)HttpStatusCode.Gone, JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.Gone, "payload purged - call printDocument with isReprint")));
            // clone handled by the client calling CreateJob with isReprint=true; here we just acknowledge availability
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { canReprint = true })));
        }

        [HttpPost("OpenDrawer")]
        public async Task<IActionResult> OpenDrawer([FromBody] OpenDrawerRequest req)
        {
            // needs CUSTOM1 on module Sys_PrintLog
            if (!await _perm.HasAsync(UserId, "Sys_PrintLog", req.compCode, req.branchCode, "CUSTOM1"))
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.Forbidden, "no drawer permission")));
            var r = await _print.ResolveAsync("__drawer__", null, req.compCode, req.branchCode, UserId, req.terminalKey);
            if (r.mode != "bridge" || r.printerId == null || r.bridgeDeviceId == null)
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, "no bridge/printer for terminal")));
            var jobId = await _print.CreateJobAsync("__drawer__", null, "Sys_PrintLog", null, req.compCode, req.branchCode, UserId, r.terminalDeviceId, null,
                0, r.printerId.Value, r.bridgeDeviceId.Value, 1, false, true,
                "test", "{\"kind\":\"test\",\"variant\":\"drawer\"}", 5, false);
            await RuntimeDb.ExecuteAsync("INSERT INTO dbo.Sys_AuditLog (Source, Action, UserID, CompCode, BranchCode, ModuleCode, RecordKey) VALUES ('runtime','DRAWER',@u,@c,@b,'Sys_PrintLog',@k)",
                ("@u", UserId), ("@c", req.compCode), ("@b", req.branchCode), ("@k", jobId.ToString()));
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { jobId = jobId.ToString() })));
        }

        private IActionResult Bad(string msg) => Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, msg)));

        public class JobIdRequest { public string jobId { get; set; } = ""; }
        public class OpenDrawerRequest { public string? terminalKey { get; set; } public int compCode { get; set; } public int branchCode { get; set; } public string? reason { get; set; } }
    }
}
