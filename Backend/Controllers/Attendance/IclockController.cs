#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json.Linq;
using ERP.Common;
using ERP.Audit;

namespace ERP.Attendance
{
    // W1-5: ZKTeco ADMS / iClock push receiver. Anonymous; responds text/plain. Keeps RawPayload.
    [ApiController]
    [AllowAnonymous]
    [Route("iclock")]
    public class IclockController : ControllerBase
    {
        private readonly PunchIngestService _ingest;
        private readonly AuditWriter _audit;
        private readonly IMemoryCache _cache;

        public IclockController(PunchIngestService ingest, AuditWriter audit, IMemoryCache cache)
        {
            _ingest = ingest; _audit = audit; _cache = cache;
        }

        private async Task<Dictionary<string, object?>?> FindDeviceAsync(string sn)
            => await RuntimeDb.FirstAsync(
                "SELECT DeviceId, CompCode, TimeZoneId, SyncStateJson FROM dbo.Sys_Devices WHERE Vendor='zk-adms' AND SerialNo=@sn AND IsActive=1",
                ("@sn", sn));

        [HttpGet("cdata")]
        public async Task<IActionResult> CdataGet([FromQuery(Name = "SN")] string? SN)
        {
            if (string.IsNullOrEmpty(SN)) return Content("OK", "text/plain");
            var dev = await FindDeviceAsync(SN);
            if (dev == null) { await AuditUnknown(SN); return Content("OK", "text/plain"); }

            await Touch(RuntimeDb.I(dev["DeviceId"]));
            int tzHours = 2;
            var tzId = RuntimeDb.S(dev["TimeZoneId"]);
            if (!string.IsNullOrEmpty(tzId)) { try { tzHours = (int)TimeZoneInfo.FindSystemTimeZoneById(tzId).BaseUtcOffset.TotalHours; } catch { } }
            string? stamp = null;
            var sync = RuntimeDb.S(dev["SyncStateJson"]);
            if (!string.IsNullOrEmpty(sync)) { try { stamp = JObject.Parse(sync).Value<string>("attLogStamp"); } catch { } }
            return Content(AdmsProtocol.BuildHandshake(SN, stamp, tzHours), "text/plain");
        }

        [HttpPost("cdata")]
        public async Task<IActionResult> CdataPost([FromQuery(Name = "SN")] string? SN, [FromQuery] string? table)
        {
            if (string.IsNullOrEmpty(SN)) return Content("OK", "text/plain");
            var dev = await FindDeviceAsync(SN);
            if (dev == null) { await AuditUnknown(SN); return Content("OK", "text/plain"); }
            int deviceId = RuntimeDb.I(dev["DeviceId"]);
            await Touch(deviceId);

            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            if (string.Equals(table, "ATTLOG", StringComparison.OrdinalIgnoreCase))
            {
                var punches = AdmsProtocol.ParseAttlog(body);
                var recs = new List<PunchRecord>();
                foreach (var p in punches)
                    recs.Add(new PunchRecord { DeviceUserId = p.Pin, PunchLocal = p.PunchLocal, State = p.State, Verify = p.Verify, WorkCode = p.WorkCode, Raw = p.Raw });
                var res = await _ingest.IngestAsync(deviceId, "push", recs);
                return Content($"OK: {punches.Count}", "text/plain");
            }
            // OPERLOG and other tables: acknowledge count (stored only in log file in a fuller impl)
            int lines = 0;
            foreach (var l in body.Replace("\r\n", "\n").Split('\n')) if (l.Trim().Length > 0) lines++;
            return Content($"OK: {lines}", "text/plain");
        }

        [HttpGet("getrequest")]
        public async Task<IActionResult> GetRequest([FromQuery(Name = "SN")] string? SN)
        {
            if (string.IsNullOrEmpty(SN)) return Content("OK", "text/plain");
            var dev = await FindDeviceAsync(SN);
            if (dev == null) { await AuditUnknown(SN); return Content("OK", "text/plain"); }
            int deviceId = RuntimeDb.I(dev["DeviceId"]);
            await Touch(deviceId);

            var cmds = await RuntimeDb.QueryAsync(
                "SELECT CommandId, CommandType, ArgsJson FROM dbo.Sys_DeviceCommands " +
                "WHERE DeviceId=@id AND Status='queued' AND ExpiresAtUtc > SYSUTCDATETIME() " +
                "AND CommandType IN ('att.user.upsert','att.user.delete','att.reboot') ORDER BY CommandId",
                ("@id", deviceId));
            if (cmds.Count == 0) return Content("OK", "text/plain");

            var sb = new System.Text.StringBuilder();
            foreach (var c in cmds)
            {
                long id = Convert.ToInt64(c["CommandId"]);
                string type = RuntimeDb.S(c["CommandType"]) ?? "";
                string? pin = null, name = null;
                var args = RuntimeDb.S(c["ArgsJson"]);
                if (!string.IsNullOrEmpty(args)) { try { var o = JObject.Parse(args); pin = o.Value<string>("deviceUserId"); name = o.Value<string>("name"); } catch { } }
                sb.Append(AdmsProtocol.BuildCommandLine(id, type, pin, name)).Append('\n');
                await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_DeviceCommands SET Status='sent', SentAtUtc=SYSUTCDATETIME() WHERE CommandId=@id", ("@id", id));
            }
            return Content(sb.ToString(), "text/plain");
        }

        [HttpPost("devicecmd")]
        public async Task<IActionResult> DeviceCmd([FromQuery(Name = "SN")] string? SN)
        {
            if (string.IsNullOrEmpty(SN)) return Content("OK", "text/plain");
            var dev = await FindDeviceAsync(SN);
            if (dev == null) { await AuditUnknown(SN); return Content("OK", "text/plain"); }
            await Touch(RuntimeDb.I(dev["DeviceId"]));

            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();
            foreach (var r in AdmsProtocol.ParseDeviceCmd(body))
                await RuntimeDb.ExecuteAsync(
                    "UPDATE dbo.Sys_DeviceCommands SET Status=CASE WHEN @rc=0 THEN 'done' ELSE 'failed' END, Error=CASE WHEN @rc=0 THEN NULL ELSE @e END, DoneAtUtc=SYSUTCDATETIME(), ResultJson=@j WHERE CommandId=@id",
                    ("@rc", r.Return), ("@e", $"return {r.Return}"), ("@j", $"{{\"return\":{r.Return}}}"), ("@id", r.Id));
            return Content("OK", "text/plain");
        }

        private async Task Touch(int deviceId)
            => await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_Devices SET LastSeenAtUtc=SYSUTCDATETIME() WHERE DeviceId=@id", ("@id", deviceId));

        private async Task AuditUnknown(string sn)
        {
            var key = $"adms_unknown::{sn}";
            if (_cache.TryGetValue(key, out _)) return;
            _cache.Set(key, 1, TimeSpan.FromHours(1));
            await _audit.WriteAsync(new AuditEntry { Source = "device", Action = "ADMS_UNKNOWN", RecordKey = sn, ClientIp = HttpContext.Connection.RemoteIpAddress?.ToString() });
        }
    }
}
