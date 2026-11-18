#nullable enable
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Cronos;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ERP.Common;
using ERP.Attendance;
using ERP.Auth;

namespace ERP.Jobs
{
    public class JobResult { public bool Ok { get; set; } = true; public string? Message { get; set; } public object? Result { get; set; } }
    public class JobContext { public long RunId { get; set; } public string JobCode { get; set; } = ""; public JObject Params { get; set; } = new(); }

    public interface IJobHandler
    {
        string JobType { get; }
        Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct);
    }

    // W1-2: own scheduler. Tick every Jobs:TickSeconds; schedule cron jobs; claim queued runs with sp_getapplock lease.
    public class JobScheduler : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<JobScheduler> _log;
        private readonly int _tick;
        private readonly bool _enabled;

        public JobScheduler(IServiceScopeFactory scopes, ILogger<JobScheduler> log, Microsoft.Extensions.Configuration.IConfiguration cfg)
        {
            _scopes = scopes; _log = log;
            _tick = cfg.GetValue<int?>("Jobs:TickSeconds") ?? 15;
            _enabled = cfg.GetValue<bool?>("Jobs:Enabled") ?? true;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled) return;
            // let the app finish starting
            try { await Task.Delay(5000, stoppingToken); } catch { }
            while (!stoppingToken.IsCancellationRequested)
            {
                try { await ScheduleDueAsync(); await ClaimAndRunAsync(stoppingToken); }
                catch (Exception ex) { _log.LogError(ex, "JobScheduler tick failed"); }
                try { await Task.Delay(TimeSpan.FromSeconds(_tick), stoppingToken); } catch { }
            }
        }

        private async Task ScheduleDueAsync()
        {
            var jobs = await RuntimeDb.QueryAsync(
                "SELECT JobCode, CronExpr, TimeZoneId, NextRunAtUtc FROM dbo.Sys_Jobs WHERE IsEnabled=1 AND CronExpr IS NOT NULL");
            var now = DateTime.UtcNow;
            foreach (var j in jobs)
            {
                var next = j["NextRunAtUtc"] as DateTime?;
                var expr = RuntimeDb.S(j["CronExpr"]);
                if (string.IsNullOrEmpty(expr)) continue;
                CronExpression cron;
                try { cron = CronExpression.Parse(expr, CronFormat.Standard); } catch { continue; }
                var tz = TimeZoneInfo.Utc;
                var tzId = RuntimeDb.S(j["TimeZoneId"]);
                if (!string.IsNullOrEmpty(tzId)) { try { tz = TimeZoneInfo.FindSystemTimeZoneById(tzId); } catch { } }

                if (next == null || next <= now)
                {
                    var code = RuntimeDb.S(j["JobCode"])!;
                    await RuntimeDb.ExecuteAsync(
                        "INSERT INTO dbo.Sys_JobRuns (JobCode, Status, TriggeredBy) VALUES (@c,'queued','schedule')", ("@c", code));
                    var upcoming = cron.GetNextOccurrence(now, tz);
                    await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_Jobs SET NextRunAtUtc=@n WHERE JobCode=@c",
                        ("@n", (object?)upcoming ?? DBNull.Value), ("@c", code));
                }
            }
        }

        private async Task ClaimAndRunAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                // claim one queued run
                var row = await RuntimeDb.FirstAsync(
                    "UPDATE TOP (1) r WITH (READPAST, ROWLOCK) SET Status='running', StartedAtUtc=SYSUTCDATETIME(), Host=@h " +
                    "OUTPUT inserted.RunId, inserted.JobCode, inserted.ParamsJson " +
                    "FROM dbo.Sys_JobRuns r WHERE r.Status='queued';", ("@h", Environment.MachineName));
                if (row == null) break;

                long runId = Convert.ToInt64(row["RunId"]);
                string jobCode = RuntimeDb.S(row["JobCode"])!;
                var paramsJson = RuntimeDb.S(row["ParamsJson"]);

                // app-lock lease per job code on a dedicated connection
                using var lockCon = await RuntimeDb.OpenAsync();
                int granted;
                using (var cmd = new SqlCommand("sp_getapplock", lockCon) { CommandType = System.Data.CommandType.StoredProcedure })
                {
                    cmd.Parameters.AddWithValue("@Resource", "job:" + jobCode);
                    cmd.Parameters.AddWithValue("@LockMode", "Exclusive");
                    cmd.Parameters.AddWithValue("@LockOwner", "Session");
                    cmd.Parameters.AddWithValue("@LockTimeout", 0);
                    var ret = new SqlParameter { Direction = System.Data.ParameterDirection.ReturnValue };
                    cmd.Parameters.Add(ret);
                    await cmd.ExecuteNonQueryAsync();
                    granted = Convert.ToInt32(ret.Value);
                }
                if (granted < 0)
                {
                    await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_JobRuns SET Status='queued', StartedAtUtc=NULL WHERE RunId=@r", ("@r", runId));
                    break;
                }

                await RunOneAsync(runId, jobCode, paramsJson, ct);
                // app lock released when lockCon disposes
            }
        }

        private async Task RunOneAsync(long runId, string jobCode, string? paramsJson, CancellationToken ct)
        {
            using var scope = _scopes.CreateScope();
            var sp = scope.ServiceProvider;
            var jobType = RuntimeDb.S(await RuntimeDb.ScalarAsync("SELECT JobType FROM dbo.Sys_Jobs WHERE JobCode=@c", ("@c", jobCode))) ?? jobCode;
            int timeout = RuntimeDb.I(await RuntimeDb.ScalarAsync("SELECT TimeoutSec FROM dbo.Sys_Jobs WHERE JobCode=@c", ("@c", jobCode)) ?? 600);

            IJobHandler? handler = null;
            foreach (var h in sp.GetServices<IJobHandler>())
                if (string.Equals(h.JobType, jobType, StringComparison.OrdinalIgnoreCase)) { handler = h; break; }

            var ctx = new JobContext { RunId = runId, JobCode = jobCode };
            try { if (!string.IsNullOrEmpty(paramsJson)) ctx.Params = JObject.Parse(paramsJson!); } catch { }

            string status; string? message = null; string? resultJson = null;
            if (handler == null) { status = "failed"; message = $"no handler for {jobType}"; }
            else
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(timeout));
                try
                {
                    var res = await handler.RunAsync(ctx, cts.Token);
                    status = res.Ok ? "succeeded" : "failed";
                    message = res.Message;
                    if (res.Result != null) resultJson = JsonConvert.SerializeObject(res.Result);
                }
                catch (OperationCanceledException) when (cts.IsCancellationRequested && !ct.IsCancellationRequested) { status = "timeout"; message = "timed out"; }
                catch (Exception ex) { status = "failed"; message = ex.Message; }
            }

            await RuntimeDb.ExecuteAsync(
                "UPDATE dbo.Sys_JobRuns SET Status=@s, Message=@m, ResultJson=@rj, FinishedAtUtc=SYSUTCDATETIME() WHERE RunId=@r",
                ("@s", status), ("@m", (object?)message), ("@rj", (object?)resultJson), ("@r", runId));
            await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_Jobs SET LastRunId=@r WHERE JobCode=@c", ("@r", runId), ("@c", jobCode));
        }
    }

    // ---- handlers ----
    public class AttMapHandler : IJobHandler
    {
        private readonly PunchMapper _mapper;
        public AttMapHandler(PunchMapper m) { _mapper = m; }
        public string JobType => "att.map";
        public async Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
        { var n = await _mapper.MapPendingAsync(); return new JobResult { Message = $"mapped {n}", Result = new { mapped = n } }; }
    }

    public class AttProcessHandler : IJobHandler
    {
        private readonly AttProcessService _svc;
        public AttProcessHandler(AttProcessService s) { _svc = s; }
        public string JobType => "att.process";
        public async Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
        {
            int comp = ctx.Params.Value<int?>("compCode") ?? 0;
            int? branch = ctx.Params.Value<int?>("branchCode");
            var to = ctx.Params.Value<DateTime?>("to") ?? DateTime.Today;
            var from = ctx.Params.Value<DateTime?>("from") ?? to.AddDays(-(ctx.Params.Value<int?>("daysBack") ?? 2));
            if (comp == 0) return new JobResult { Ok = true, Message = "no compCode (scheduled no-op)" };
            var (days, emps) = await _svc.ProcessAsync(comp, branch, from, to, ctx.RunId);
            return new JobResult { Message = $"processed {days} day-rows for {emps} employees", Result = new { days, emps } };
        }
    }

    public class PrintExpireHandler : IJobHandler
    {
        public string JobType => "print.expire";
        public async Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
        { var n = await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_PrintJobs SET Status='expired' WHERE Status IN ('queued','sent','accepted') AND ExpiresAtUtc < SYSUTCDATETIME()"); return new JobResult { Message = $"expired {n}" }; }
    }

    public class PrintPurgeHandler : IJobHandler
    {
        public string JobType => "print.purge";
        public async Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
        {
            int days = ctx.Params.Value<int?>("days") ?? 7;
            var n = await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_PrintJobs SET PayloadJson=NULL, PayloadPurgedAtUtc=SYSUTCDATETIME() WHERE PayloadJson IS NOT NULL AND CreatedAtUtc < DATEADD(DAY,-@d,SYSUTCDATETIME())", ("@d", days));
            return new JobResult { Message = $"purged {n} payloads" };
        }
    }

    public class DeviceOfflineSweepHandler : IJobHandler
    {
        public string JobType => "device.sweep";
        public async Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
        { var n = await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_Devices SET IsOnline=0 WHERE IsOnline=1 AND LastSeenAtUtc < DATEADD(SECOND,-90,SYSUTCDATETIME())"); return new JobResult { Message = $"swept {n}" }; }
    }

    public class DeviceTimeSyncHandler : IJobHandler
    {
        public string JobType => "device.timesync";
        public Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
            => Task.FromResult(new JobResult { Message = "queues att.settime for zk-tcp devices (dispatched by bridge)" });
    }

    public class AuditPurgeHandler : IJobHandler
    {
        public string JobType => "audit.purge";
        public async Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
        {
            var days = Convert.ToInt32(await RuntimeDb.ScalarAsync("SELECT SettingValue FROM dbo.Sys_RuntimeSettings WHERE SettingKey='Audit.RetentionDays'") ?? "730");
            await RuntimeDb.ExecuteAsync("EXEC dbo.Sys_AuditPurge @RetentionDays=@d", ("@d", days));
            return new JobResult { Message = $"purged audit older than {days}d" };
        }
    }

    public class PasswordMigrateHandler : IJobHandler
    {
        private readonly PasswordService _pw;
        public PasswordMigrateHandler(PasswordService pw) { _pw = pw; }
        public string JobType => "auth.hash.migrate";
        public async Task<JobResult> RunAsync(JobContext ctx, CancellationToken ct)
        { int batch = ctx.Params.Value<int?>("batch") ?? 200; var n = await _pw.MigratePlaintextBatchAsync(batch); return new JobResult { Message = $"hashed {n}", Result = new { hashed = n } }; }
    }
}
