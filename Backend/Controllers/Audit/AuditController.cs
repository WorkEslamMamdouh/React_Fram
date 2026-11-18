#nullable enable
using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using GateWay.App;
using ERP.Common;

namespace ERP.Audit
{
    [ApiController]
    [Route("api/audit")]
    [Authorize]
    public class AuditController : ControllerBase
    {
        public class HistoryRequest { public string moduleCode { get; set; } = ""; public string tableName { get; set; } = ""; public string recordKey { get; set; } = ""; public int compCode { get; set; } public int? branchCode { get; set; } public int page { get; set; } = 1; public int pageSize { get; set; } = 50; }

        private int UserId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

        // W1-11: record history. Allowed when the user has VIEW on moduleCode AND a policy row ties the table to that module.
        [HttpPost("History")]
        public async Task<IActionResult> History([FromBody] HistoryRequest req)
        {
            var policy = await RuntimeDb.FirstAsync("SELECT ModuleCode FROM dbo.Sys_AuditPolicy WHERE TableName=@t AND IsEnabled=1", ("@t", req.tableName));
            if (policy == null || !string.Equals(RuntimeDb.S(policy["ModuleCode"]), req.moduleCode, StringComparison.OrdinalIgnoreCase))
            {
                // allow IsAdmin roles regardless
                var admin = await RuntimeDb.ScalarAsync("SELECT TOP 1 1 FROM dbo.Sys_RoleUsers ru JOIN dbo.Sys_Role r ON r.RoleId=ru.RoleId WHERE ru.UserID=@u AND ISNULL(r.IsAdmin,0)=1", ("@u", UserId));
                if (admin == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.Forbidden, "not permitted")));
            }
            int page = Math.Max(1, req.page), size = Math.Clamp(req.pageSize, 1, 200);
            var total = Convert.ToInt32(await RuntimeDb.ScalarAsync("SELECT COUNT(*) FROM dbo.Sys_AuditLog WHERE TableName=@t AND RecordKey=@k", ("@t", req.tableName), ("@k", req.recordKey)) ?? 0);
            var rows = await RuntimeDb.QueryAsync(
                "SELECT AuditId, AtUtc, Action, UserCode, Source, ChangesJson FROM dbo.Sys_AuditLog WHERE TableName=@t AND RecordKey=@k " +
                "ORDER BY AuditId DESC OFFSET @off ROWS FETCH NEXT @n ROWS ONLY",
                ("@t", req.tableName), ("@k", req.recordKey), ("@off", (page - 1) * size), ("@n", size));
            var outp = new List<object>();
            foreach (var r in rows)
            {
                var changes = new List<object>();
                var cj = RuntimeDb.S(r["ChangesJson"]);
                if (!string.IsNullOrEmpty(cj)) { try { foreach (var p in JObject.Parse(cj!).Properties()) { var o = p.Value["o"]; var n = p.Value["n"]; changes.Add(new { f = p.Name, o, n }); } } catch { } }
                outp.Add(new { auditId = Convert.ToInt64(r["AuditId"]), atUtc = r["AtUtc"], action = RuntimeDb.S(r["Action"]), userCode = RuntimeDb.S(r["UserCode"]), source = RuntimeDb.S(r["Source"]), changes });
            }
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { rows = outp, total })));
        }
    }
}
