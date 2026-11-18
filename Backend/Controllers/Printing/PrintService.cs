#nullable enable
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json;
using ERP.Common;
using ERP.Realtime;

namespace ERP.Printing
{
    public class ResolveResult
    {
        public string mode { get; set; } = "viewer"; // bridge | viewer
        public string? reason { get; set; }
        public object? route { get; set; }
        public object? printer { get; set; }
        public int? bridgeDeviceId { get; set; }
        public int? printerId { get; set; }
        public int? terminalDeviceId { get; set; }
    }

    public class PrintService
    {
        private readonly RealtimeNotifier _notifier;
        public PrintService(RealtimeNotifier notifier) { _notifier = notifier; }

        // Terminal auto-registration (4.4 / W1-4): map a browser terminalKey to a Sys_Devices terminal row.
        public async Task<int?> ResolveTerminalAsync(string? terminalKey, int compCode, int branchCode)
        {
            if (string.IsNullOrEmpty(terminalKey) || !Guid.TryParse(terminalKey, out var g)) return null;
            var row = await RuntimeDb.FirstAsync("SELECT DeviceId FROM dbo.Sys_Devices WHERE TerminalKey=@k", ("@k", g));
            if (row != null) return RuntimeDb.I(row["DeviceId"]);
            var name = "Terminal-" + terminalKey.Substring(0, Math.Min(4, terminalKey.Length));
            var idObj = await RuntimeDb.ScalarAsync(
                "INSERT INTO dbo.Sys_Devices (DeviceKind, Name, CompCode, BranchCode, TerminalKey) OUTPUT INSERTED.DeviceId VALUES ('terminal', @n, @c, @b, @k)",
                ("@n", name), ("@c", compCode), ("@b", branchCode), ("@k", g));
            return idObj == null ? (int?)null : Convert.ToInt32(idObj);
        }

        public async Task<ResolveResult> ResolveAsync(string docKey, string? station, int compCode, int branchCode, int userId, string? terminalKey)
        {
            var terminalId = await ResolveTerminalAsync(terminalKey, compCode, branchCode);
            var cands = await RuntimeDb.QueryAsync(
                "SELECT * FROM dbo.Sys_PrintRouteCandidates(@d,@s,@c,@b,@u,@t) ORDER BY Score DESC, Priority DESC, RouteId DESC",
                ("@d", docKey), ("@s", (object?)station), ("@c", compCode), ("@b", branchCode), ("@u", userId), ("@t", (object?)terminalId));
            if (cands.Count == 0)
                return new ResolveResult { mode = "viewer", reason = "no_route", terminalDeviceId = terminalId };

            var win = cands[0];
            int printerId = RuntimeDb.I(win["PrinterId"]);
            var pr = await RuntimeDb.FirstAsync("SELECT * FROM dbo.Sys_Printers WHERE PrinterId=@id AND IsActive=1", ("@id", printerId));
            if (pr == null) return new ResolveResult { mode = "viewer", reason = "no_printer", terminalDeviceId = terminalId };
            int bridgeId = RuntimeDb.I(pr["BridgeDeviceId"]);
            var bridge = await RuntimeDb.FirstAsync("SELECT IsOnline FROM dbo.Sys_Devices WHERE DeviceId=@id", ("@id", bridgeId));
            bool online = bridge != null && Convert.ToBoolean(bridge["IsOnline"]);

            var result = new ResolveResult
            {
                mode = online ? "bridge" : "viewer",
                reason = online ? null : "bridge_offline",
                bridgeDeviceId = bridgeId,
                printerId = printerId,
                terminalDeviceId = terminalId,
                route = new
                {
                    routeId = RuntimeDb.I(win["RouteId"]),
                    layoutCode = RuntimeDb.S(win["LayoutCode"]),
                    copies = Convert.ToInt32(win["Copies"]),
                    autoPrintOnSave = Convert.ToBoolean(win["AutoPrintOnSave"]),
                    openDrawer = Convert.ToBoolean(win["OpenDrawer"]),
                    copyWatermark = Convert.ToBoolean(win["CopyWatermark"]),
                    ttlMin = RuntimeDb.NI(win["TtlMin"])
                },
                printer = new
                {
                    printerId,
                    name = RuntimeDb.S(pr["Name"]),
                    kind = RuntimeDb.S(pr["Kind"]),
                    language = RuntimeDb.S(pr["Language"]),
                    paperWidthMm = pr["PaperWidthMm"],
                    paperHeightMm = pr["PaperHeightMm"],
                    isOnline = online
                }
            };
            return result;
        }

        // Insert a Sys_PrintJobs row and offer it to the bridge. Returns the new JobId.
        public async Task<Guid> CreateJobAsync(
            string docKey, string? reportCode, string? moduleCode, string? recordKey,
            int compCode, int branchCode, int userId, int? terminalDeviceId, string? station,
            int routeId, int printerId, int bridgeDeviceId, int copies, bool watermark, bool openDrawer,
            string payloadKind, string payloadJson, int? ttlMin, bool isReprint)
        {
            var sha = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payloadJson))).ToLowerInvariant();
            int ttl = ttlMin ?? (docKey.Contains("Kitchen", StringComparison.OrdinalIgnoreCase) ? 15 : 60);

            using var con = await RuntimeDb.OpenAsync();
            // fallback printer + printer dto for the offer
            var pr = await RuntimeDb.FirstAsync(con, null, "SELECT * FROM dbo.Sys_Printers WHERE PrinterId=@id", ("@id", printerId));
            int? fallback = (await RuntimeDb.QueryAsync(con, null, "SELECT FallbackPrinterId FROM dbo.Sys_PrintRoutes WHERE RouteId=@r", ("@r", routeId)))
                            is { Count: > 0 } fr ? RuntimeDb.NI(fr[0]["FallbackPrinterId"]) : null;

            var jobIdObj = await RuntimeDb.ScalarAsync(
                "INSERT INTO dbo.Sys_PrintJobs (DocKey, ReportCode, ModuleCode, RecordKey, CompCode, BranchCode, UserID, TerminalDeviceId, Station, RouteId, PrinterId, FallbackPrinterId, BridgeDeviceId, Copies, CopyWatermark, OpenDrawer, PayloadKind, PayloadJson, PayloadSha256, PayloadBytes, Status, ExpiresAtUtc) " +
                "OUTPUT INSERTED.JobId " +
                "VALUES (@dk,@rc,@mc,@rk,@c,@b,@u,@td,@st,@ro,@pi,@fb,@bd,@cp,@wm,@od,@pk,@pj,@sh,@by,'sent',DATEADD(MINUTE,@ttl,SYSUTCDATETIME()))",
                ("@dk", docKey), ("@rc", (object?)reportCode), ("@mc", (object?)moduleCode), ("@rk", (object?)recordKey),
                ("@c", compCode), ("@b", branchCode), ("@u", userId), ("@td", (object?)terminalDeviceId), ("@st", (object?)station),
                ("@ro", routeId), ("@pi", printerId), ("@fb", (object?)fallback), ("@bd", bridgeDeviceId),
                ("@cp", (byte)copies), ("@wm", watermark ? 1 : 0), ("@od", openDrawer ? 1 : 0),
                ("@pk", payloadKind), ("@pj", payloadJson), ("@sh", sha), ("@by", Encoding.UTF8.GetByteCount(payloadJson)), ("@ttl", ttl));
            var jobId = (Guid)jobIdObj!;

            await RuntimeDb.ExecuteAsync(
                "INSERT INTO dbo.Sys_AuditLog (Source, Action, UserID, CompCode, BranchCode, ModuleCode, RecordKey) VALUES ('runtime',@a,@u,@c,@b,@m,@rk)",
                ("@a", isReprint ? "REPRINT" : "PRINT"), ("@u", userId), ("@c", compCode), ("@b", branchCode), ("@m", (object?)moduleCode), ("@rk", jobId.ToString()));

            // offer to the bridge
            var env = new JobEnvelope
            {
                jobId = jobId.ToString(),
                docKey = docKey,
                isReprint = isReprint,
                copies = copies,
                copyWatermark = watermark,
                openDrawer = openDrawer,
                printer = pr == null ? null : new PrinterDto
                {
                    printerId = printerId,
                    name = RuntimeDb.S(pr["Name"]) ?? "",
                    kind = RuntimeDb.S(pr["Kind"]) ?? "",
                    transport = RuntimeDb.S(pr["Transport"]) ?? "",
                    target = RuntimeDb.S(pr["Target"]) ?? "",
                    language = RuntimeDb.S(pr["Language"]) ?? "",
                    paperWidthMm = pr["PaperWidthMm"] as decimal?,
                    paperHeightMm = pr["PaperHeightMm"] as decimal?,
                    dpi = RuntimeDb.I(pr["Dpi"]),
                    dotsWidth = RuntimeDb.NI(pr["DotsWidth"]),
                    hasDrawer = Convert.ToBoolean(pr["HasDrawer"]),
                    drawerPin = Convert.ToInt32(pr["DrawerPin"]),
                    drawerOnMs = RuntimeDb.I(pr["DrawerOnMs"]),
                    drawerOffMs = RuntimeDb.I(pr["DrawerOffMs"]),
                    cutMode = RuntimeDb.S(pr["CutMode"]) ?? "partial"
                },
                payload = new JobPayloadRef { kind = payloadKind, url = $"/api/devices/jobs/{jobId}/payload", sha256 = sha, bytes = Encoding.UTF8.GetByteCount(payloadJson) }
            };
            try { await _notifier.JobOfferAsync(bridgeDeviceId, env); } catch { }
            return jobId;
        }
    }
}
