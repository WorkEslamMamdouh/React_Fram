#nullable enable
using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using ERP.Common;
using ERP.Realtime;

namespace ERP.Jobs
{
    // W1-3: dispatch queued device commands to bridges (hub) / expire them. zk-adms commands are served via /iclock/getrequest.
    public class DeviceCommandDispatcher : BackgroundService
    {
        private readonly RealtimeNotifier _notifier;
        private readonly ILogger<DeviceCommandDispatcher> _log;
        public DeviceCommandDispatcher(RealtimeNotifier notifier, ILogger<DeviceCommandDispatcher> log) { _notifier = notifier; _log = log; }

        protected override async Task ExecuteAsync(CancellationToken ct)
        {
            try { await Task.Delay(6000, ct); } catch { }
            int ticks = 0;
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_DeviceCommands SET Status='expired' WHERE Status IN ('queued','sent') AND ExpiresAtUtc < SYSUTCDATETIME()");

                    var cmds = await RuntimeDb.QueryAsync(
                        "SELECT c.CommandId, c.CommandType, c.ArgsJson, c.DeviceId, d.DeviceKind, d.Vendor, d.BridgeDeviceId " +
                        "FROM dbo.Sys_DeviceCommands c JOIN dbo.Sys_Devices d ON d.DeviceId=c.DeviceId " +
                        "WHERE c.Status='queued' AND c.ExpiresAtUtc > SYSUTCDATETIME()");
                    foreach (var c in cmds)
                    {
                        var kind = RuntimeDb.S(c["DeviceKind"]);
                        var vendor = RuntimeDb.S(c["Vendor"]);
                        if (kind == "attendance" && vendor == "zk-adms") continue; // served by getrequest
                        int targetDeviceId = RuntimeDb.I(c["DeviceId"]);
                        int bridgeId = kind == "bridge" ? targetDeviceId : RuntimeDb.NI(c["BridgeDeviceId"]) ?? 0;
                        if (bridgeId == 0) continue;
                        JToken? args = null;
                        var aj = RuntimeDb.S(c["ArgsJson"]); if (!string.IsNullOrEmpty(aj)) { try { args = JToken.Parse(aj!); } catch { } }
                        var env = new CommandEnvelope { commandId = Convert.ToInt64(c["CommandId"]), type = RuntimeDb.S(c["CommandType"]) ?? "", targetDeviceId = targetDeviceId, args = args };
                        try { await _notifier.CommandAsync(bridgeId, env); } catch { }
                        await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_DeviceCommands SET Status='sent', SentAtUtc=SYSUTCDATETIME() WHERE CommandId=@id", ("@id", env.commandId));
                    }

                    // every ~10s: notify revoked devices
                    if (ticks % 5 == 0)
                    {
                        var revoked = await RuntimeDb.QueryAsync(
                            "SELECT DeviceId FROM dbo.Sys_Devices WHERE IsOnline=1 AND (RevokedAtUtc IS NOT NULL OR IsActive=0 OR TokenHash IS NULL)");
                        foreach (var d in revoked)
                            try { await _notifier.RevokedAsync(RuntimeDb.I(d["DeviceId"]), "revoked"); } catch { }
                    }
                }
                catch (Exception ex) { _log.LogError(ex, "DeviceCommandDispatcher failed"); }
                ticks++;
                try { await Task.Delay(2000, ct); } catch { }
            }
        }
    }

    // W1-3/W1-4: re-offer print jobs that were sent but not accepted within 60s.
    public class PrintJobDispatcher : BackgroundService
    {
        private readonly RealtimeNotifier _notifier;
        private readonly ILogger<PrintJobDispatcher> _log;
        public PrintJobDispatcher(RealtimeNotifier notifier, ILogger<PrintJobDispatcher> log) { _notifier = notifier; _log = log; }

        protected override async Task ExecuteAsync(CancellationToken ct)
        {
            try { await Task.Delay(8000, ct); } catch { }
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    var jobs = await RuntimeDb.QueryAsync(
                        "SELECT JobId, DocKey, BridgeDeviceId, Copies, CopyWatermark, OpenDrawer, IsReprint, PayloadKind, PayloadSha256, PayloadBytes, ExpiresAtUtc " +
                        "FROM dbo.Sys_PrintJobs WHERE Status='sent' AND ExpiresAtUtc > SYSUTCDATETIME() AND CreatedAtUtc < DATEADD(SECOND,-60,SYSUTCDATETIME())");
                    foreach (var j in jobs)
                    {
                        var jobId = ((Guid)j["JobId"]!).ToString();
                        var env = new JobEnvelope
                        {
                            jobId = jobId,
                            docKey = RuntimeDb.S(j["DocKey"]) ?? "",
                            isReprint = Convert.ToBoolean(j["IsReprint"]),
                            copies = Convert.ToInt32(j["Copies"]),
                            copyWatermark = Convert.ToBoolean(j["CopyWatermark"]),
                            openDrawer = Convert.ToBoolean(j["OpenDrawer"]),
                            expiresAtUtc = ((DateTime)j["ExpiresAtUtc"]!).ToString("o"),
                            payload = new JobPayloadRef { kind = RuntimeDb.S(j["PayloadKind"]) ?? "html", url = $"/api/devices/jobs/{jobId}/payload", sha256 = RuntimeDb.S(j["PayloadSha256"]), bytes = RuntimeDb.I(j["PayloadBytes"]) }
                        };
                        try { await _notifier.JobOfferAsync(RuntimeDb.I(j["BridgeDeviceId"]), env); } catch { }
                    }
                }
                catch (Exception ex) { _log.LogError(ex, "PrintJobDispatcher failed"); }
                try { await Task.Delay(30000, ct); } catch { }
            }
        }
    }
}
