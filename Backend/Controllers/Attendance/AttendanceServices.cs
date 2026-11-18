#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json.Linq;
using ERP.Common;

namespace ERP.Attendance
{
    // W1-5: map raw punches to employees -> Att_Punch. Double-tap ignored; unknown -> exception.
    public class PunchMapper
    {
        private static readonly Regex Ident = new("^[A-Za-z_][A-Za-z0-9_]{0,127}$", RegexOptions.Compiled);

        public async Task<int> MapPendingAsync(int max = 5000)
        {
            int mapped = 0;
            var raws = await RuntimeDb.QueryAsync(
                "SELECT TOP (@n) r.RawId, r.DeviceId, r.DeviceUserId, r.PunchLocal, r.PunchUtc, r.State, d.CompCode, d.BranchCode " +
                "FROM dbo.Att_RawPunch r JOIN dbo.Sys_Devices d ON d.DeviceId=r.DeviceId " +
                "WHERE r.IsMapped=0 ORDER BY r.RawId", ("@n", max));
            if (raws.Count == 0) return 0;

            // settings + employee source (cache per comp)
            var srcTable = (await RuntimeDb.ScalarAsync("SELECT SettingValue FROM dbo.Sys_RuntimeSettings WHERE SettingKey='Att.EmployeeSource'"))?.ToString();
            var codeCol = (await RuntimeDb.ScalarAsync("SELECT SettingValue FROM dbo.Sys_RuntimeSettings WHERE SettingKey='Att.EmpCodeColumn'"))?.ToString();
            var idCol = (await RuntimeDb.ScalarAsync("SELECT SettingValue FROM dbo.Sys_RuntimeSettings WHERE SettingKey='Att.EmpIdColumn'"))?.ToString();

            foreach (var r in raws)
            {
                long rawId = Convert.ToInt64(r["RawId"]);
                int deviceId = RuntimeDb.I(r["DeviceId"]);
                string devUser = RuntimeDb.S(r["DeviceUserId"]) ?? "";
                var punchLocal = Convert.ToDateTime(r["PunchLocal"]);
                int comp = RuntimeDb.I(r["CompCode"]);
                int? branch = RuntimeDb.NI(r["BranchCode"]);

                int? empId = await ResolveEmpAsync(deviceId, devUser, punchLocal.Date, comp, srcTable, codeCol, idCol);
                if (empId == null)
                {
                    await RuntimeDb.ExecuteAsync(
                        "IF NOT EXISTS (SELECT 1 FROM dbo.Att_Exception WHERE DeviceId=@d AND DeviceUserId=@u AND ExType='unknown_user' AND Status='open') " +
                        "INSERT INTO dbo.Att_Exception (CompCode, DeviceId, DeviceUserId, ExType, Details) VALUES (@c,@d,@u,'unknown_user',@det);",
                        ("@d", deviceId), ("@u", devUser), ("@c", comp), ("@det", $"device user {devUser}"));
                    await RuntimeDb.ExecuteAsync("UPDATE dbo.Att_RawPunch SET IsMapped=1, MapStatus='unknown' WHERE RawId=@r", ("@r", rawId));
                    continue;
                }

                // double-tap within DoubleTapSec
                var tap = RuntimeDb.I(await RuntimeDb.ScalarAsync("SELECT ISNULL(DoubleTapSec,120) FROM dbo.Att_Settings WHERE CompCode=@c", ("@c", comp)) ?? 120);
                bool ignore = false;
                if (tap > 0)
                {
                    var near = await RuntimeDb.FirstAsync(
                        "SELECT TOP 1 PunchId FROM dbo.Att_Punch WHERE EmpID=@e AND IsIgnored=0 AND ABS(DATEDIFF(SECOND, PunchLocal, @t)) <= @tap",
                        ("@e", empId.Value), ("@t", punchLocal), ("@tap", tap));
                    ignore = near != null;
                }

                await RuntimeDb.ExecuteAsync(
                    "IF NOT EXISTS (SELECT 1 FROM dbo.Att_Punch WHERE RawId=@r) " +
                    "INSERT INTO dbo.Att_Punch (CompCode, BranchCode, EmpID, PunchLocal, PunchUtc, DeviceId, RawId, Source, IsIgnored, IgnoreReason) " +
                    "SELECT @c,@b,@e,@t,@utc,@d,@r,'pull',@ig,@ir;",
                    ("@c", comp), ("@b", (object?)branch), ("@e", empId.Value), ("@t", punchLocal),
                    ("@utc", (object?)(r["PunchUtc"] as DateTime?)), ("@d", deviceId), ("@r", rawId),
                    ("@ig", ignore ? 1 : 0), ("@ir", ignore ? "double-tap" : null));
                await RuntimeDb.ExecuteAsync("UPDATE dbo.Att_RawPunch SET IsMapped=1, MapStatus=@ms WHERE RawId=@r", ("@ms", ignore ? "ignored" : "ok"), ("@r", rawId));
                mapped++;
            }
            return mapped;
        }

        private async Task<int?> ResolveEmpAsync(int deviceId, string devUser, DateTime date, int comp, string? srcTable, string? codeCol, string? idCol)
        {
            // device-specific map first, then global; by validity dates
            var m = await RuntimeDb.FirstAsync(
                "SELECT TOP 1 EmpID FROM dbo.Att_DeviceUserMap WHERE DeviceUserId=@u AND (DeviceId=@d OR DeviceId IS NULL) " +
                "AND ValidFrom <= @dt AND (ValidTo IS NULL OR ValidTo >= @dt) ORDER BY CASE WHEN DeviceId=@d THEN 0 ELSE 1 END, ValidFrom DESC",
                ("@u", devUser), ("@d", deviceId), ("@dt", date));
            if (m != null) return RuntimeDb.I(m["EmpID"]);

            // auto-match DeviceUserId = EmpCode
            var autoMatch = RuntimeDb.I(await RuntimeDb.ScalarAsync("SELECT ISNULL(AutoMatchByCode,1) FROM dbo.Att_Settings WHERE CompCode=@c", ("@c", comp)) ?? 1);
            if (autoMatch == 1 && !string.IsNullOrEmpty(srcTable) && !string.IsNullOrEmpty(codeCol) && !string.IsNullOrEmpty(idCol)
                && Ident.IsMatch(srcTable!) && Ident.IsMatch(codeCol!) && Ident.IsMatch(idCol!))
            {
                try
                {
                    var row = await RuntimeDb.FirstAsync(
                        $"SELECT TOP 1 [{idCol}] AS EmpID FROM dbo.[{srcTable}] WHERE CAST([{codeCol}] AS NVARCHAR(50)) = @u", ("@u", devUser));
                    if (row != null) return RuntimeDb.I(row["EmpID"]);
                }
                catch { }
            }
            return null;
        }
    }

    // W1-5: shift for (emp, date): employee roster > branch roster > company roster, else default.
    public class RosterResolver
    {
        public async Task<int?> ResolveShiftAsync(int empId, DateTime date, int comp)
        {
            var rows = await RuntimeDb.QueryAsync(
                "SELECT ShiftId, PatternJson, EmpID, BranchCode FROM dbo.Att_Roster " +
                "WHERE CompCode=@c AND (EmpID=@e OR EmpID IS NULL) AND FromDate<=@d AND (ToDate IS NULL OR ToDate>=@d) " +
                "ORDER BY CASE WHEN EmpID IS NOT NULL THEN 2 WHEN BranchCode IS NOT NULL THEN 1 ELSE 0 END DESC, Priority DESC, FromDate DESC",
                ("@c", comp), ("@e", empId), ("@d", date));
            foreach (var r in rows)
            {
                var sid = RuntimeDb.NI(r["ShiftId"]);
                if (sid != null) return sid;
                var pat = RuntimeDb.S(r["PatternJson"]);
                if (!string.IsNullOrEmpty(pat))
                {
                    try
                    {
                        var o = JObject.Parse(pat!);
                        var anchor = o.Value<DateTime?>("anchor");
                        var days = o["days"] as JArray;
                        if (anchor != null && days != null && days.Count > 0)
                        {
                            int idx = (int)(((date.Date - anchor.Value.Date).Days % days.Count + days.Count) % days.Count);
                            var code = days[idx]?.ToString();
                            if (!string.IsNullOrEmpty(code) && code != "OFF")
                            {
                                var sh = await RuntimeDb.FirstAsync("SELECT ShiftId FROM dbo.Att_Shift WHERE CompCode=@c AND Code=@k AND IsActive=1", ("@c", comp), ("@k", code));
                                if (sh != null) return RuntimeDb.I(sh["ShiftId"]);
                            }
                        }
                    }
                    catch { }
                }
            }
            var def = await RuntimeDb.ScalarAsync("SELECT DefaultShiftId FROM dbo.Att_Settings WHERE CompCode=@c", ("@c", comp));
            return RuntimeDb.NI(def);
        }
    }

    // W1-5: att.process - rebuild Att_DailySummary for a range (skips locked periods).
    public class AttProcessService
    {
        private readonly RosterResolver _roster;
        public AttProcessService(RosterResolver roster) { _roster = roster; }

        public async Task<(int days, int employees)> ProcessAsync(int comp, int? branch, DateTime from, DateTime to, long? runId)
        {
            // employees that have punches in range
            var emps = (await RuntimeDb.QueryAsync(
                "SELECT DISTINCT EmpID FROM dbo.Att_Punch WHERE CompCode=@c AND PunchLocal >= @f AND PunchLocal < DATEADD(DAY,1,@t) AND IsIgnored=0 AND ApprovalStatus='approved'",
                ("@c", comp), ("@f", from.Date), ("@t", to.Date)))
                .Select(r => RuntimeDb.I(r["EmpID"])).Distinct().ToList();

            var weekend = new HashSet<int>();
            var wkd = (await RuntimeDb.ScalarAsync("SELECT WeekendDays FROM dbo.Att_Settings WHERE CompCode=@c", ("@c", comp)))?.ToString() ?? "5";
            foreach (var p in wkd.Split(',')) if (int.TryParse(p.Trim(), out var dnum)) weekend.Add(dnum);

            int dayCount = 0;
            foreach (var empId in emps)
            {
                for (var d = from.Date; d <= to.Date; d = d.AddDays(1))
                {
                    // skip locked periods
                    var locked = await RuntimeDb.ScalarAsync(
                        "SELECT TOP 1 1 FROM dbo.Att_Period WHERE CompCode=@c AND Status='locked' AND @d BETWEEN FromDate AND ToDate", ("@c", comp), ("@d", d));
                    if (locked != null) continue;

                    string dayType = "work";
                    int dow = (int)d.DayOfWeek; // 0=Sun..6=Sat
                    if (weekend.Contains(dow)) dayType = "weekend";
                    var hol = await RuntimeDb.ScalarAsync("SELECT TOP 1 1 FROM dbo.Att_Holiday WHERE CompCode=@c AND HolidayDate=@d", ("@c", comp), ("@d", d));
                    if (hol != null) dayType = "holiday";

                    int? shiftId = await _roster.ResolveShiftAsync(empId, d, comp);
                    ShiftResult res;
                    if (shiftId == null)
                    {
                        res = new ShiftResult { DayType = dayType, Status = dayType == "work" ? "absent" : (dayType == "holiday" ? "holiday" : "off"), IsAbsent = dayType == "work" };
                    }
                    else
                    {
                        var sh = await RuntimeDb.FirstAsync("SELECT * FROM dbo.Att_Shift WHERE ShiftId=@s", ("@s", shiftId.Value));
                        var input = ToInput(sh!);
                        var punches = (await RuntimeDb.QueryAsync(
                            "SELECT PunchLocal FROM dbo.Att_Punch WHERE EmpID=@e AND IsIgnored=0 AND ApprovalStatus='approved' " +
                            "AND PunchLocal BETWEEN @w1 AND @w2 ORDER BY PunchLocal",
                            ("@e", empId), ("@w1", d.AddMinutes(-input.EarlyInWindowMin)), ("@w2", d.AddDays(2))))
                            .Select(r => Convert.ToDateTime(r["PunchLocal"])).ToList();
                        res = ShiftEngine.Evaluate(input, d, punches, dayType);
                    }

                    await UpsertSummaryAsync(empId, d, comp, branch, shiftId, res, runId);
                    dayCount++;
                }
            }
            return (dayCount, emps.Count);
        }

        private static ShiftInput ToInput(Dictionary<string, object?> sh) => new ShiftInput
        {
            StartTime = (TimeSpan)sh["StartTime"]!,
            EndTime = (TimeSpan)sh["EndTime"]!,
            BreakMinutes = RuntimeDb.I(sh["BreakMinutes"]),
            BreakIsPaid = Convert.ToBoolean(sh["BreakIsPaid"]),
            GraceInMin = RuntimeDb.I(sh["GraceInMin"]),
            GraceOutMin = RuntimeDb.I(sh["GraceOutMin"]),
            LateFromStart = Convert.ToBoolean(sh["LateFromStart"]),
            OtAfterMin = RuntimeDb.I(sh["OtAfterMin"]),
            OtRoundingMin = RuntimeDb.I(sh["OtRoundingMin"]),
            OtBeforeStart = Convert.ToBoolean(sh["OtBeforeStart"]),
            EarlyInWindowMin = RuntimeDb.I(sh["EarlyInWindowMin"]),
            LateOutWindowMin = RuntimeDb.I(sh["LateOutWindowMin"]),
            IsFlexible = Convert.ToBoolean(sh["IsFlexible"]),
            RequiredMinutes = RuntimeDb.I(sh["RequiredMinutes"])
        };

        private static async Task UpsertSummaryAsync(int empId, DateTime d, int comp, int? branch, int? shiftId, ShiftResult res, long? runId)
        {
            await RuntimeDb.ExecuteAsync(
                "MERGE dbo.Att_DailySummary AS t USING (SELECT @e AS EmpID, @d AS WorkDate) s ON t.EmpID=s.EmpID AND t.WorkDate=s.WorkDate " +
                "WHEN MATCHED THEN UPDATE SET CompCode=@c, BranchCode=@b, ShiftId=@sh, DayType=@dt, SchedIn=@si, SchedOut=@so, ActualIn=@ai, ActualOut=@ao, " +
                "PunchCount=@pc, WorkedMin=@wm, LateMin=@lm, EarlyLeaveMin=@el, OtMin=@ot, BreakMin=@bk, IsAbsent=@ab, Status=@st, CalcAtUtc=SYSUTCDATETIME(), CalcRunId=@run " +
                "WHEN NOT MATCHED THEN INSERT (EmpID, WorkDate, CompCode, BranchCode, ShiftId, DayType, SchedIn, SchedOut, ActualIn, ActualOut, PunchCount, WorkedMin, LateMin, EarlyLeaveMin, OtMin, BreakMin, IsAbsent, Status, CalcRunId) " +
                "VALUES (@e,@d,@c,@b,@sh,@dt,@si,@so,@ai,@ao,@pc,@wm,@lm,@el,@ot,@bk,@ab,@st,@run);",
                ("@e", empId), ("@d", d), ("@c", comp), ("@b", (object?)branch), ("@sh", (object?)shiftId), ("@dt", res.DayType),
                ("@si", (object?)res.SchedIn), ("@so", (object?)res.SchedOut), ("@ai", (object?)res.ActualIn), ("@ao", (object?)res.ActualOut),
                ("@pc", res.PunchCount), ("@wm", res.WorkedMin), ("@lm", res.LateMin), ("@el", res.EarlyLeaveMin), ("@ot", res.OtMin),
                ("@bk", res.BreakMin), ("@ab", res.IsAbsent ? 1 : 0), ("@st", res.Status), ("@run", (object?)runId));
        }
    }
}
