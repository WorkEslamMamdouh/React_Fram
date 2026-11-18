#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;

namespace ERP.Attendance
{
    // Shared contract 4.14 (wave1-v1). Pure function; mirror of Studio shiftMath.ts.
    public class ShiftInput
    {
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }          // EndTime <= StartTime => cross midnight
        public int BreakMinutes { get; set; }
        public bool BreakIsPaid { get; set; }
        public int GraceInMin { get; set; }
        public int GraceOutMin { get; set; }
        public bool LateFromStart { get; set; } = true;
        public int OtAfterMin { get; set; } = 30;
        public int OtRoundingMin { get; set; } = 15;
        public bool OtBeforeStart { get; set; }
        public int EarlyInWindowMin { get; set; } = 240;
        public int LateOutWindowMin { get; set; } = 360;
        public bool IsFlexible { get; set; }
        public int RequiredMinutes { get; set; }
    }

    public class ShiftResult
    {
        public DateTime? SchedIn { get; set; }
        public DateTime? SchedOut { get; set; }
        public DateTime? ActualIn { get; set; }
        public DateTime? ActualOut { get; set; }
        public int PunchCount { get; set; }
        public int WorkedMin { get; set; }
        public int LateMin { get; set; }
        public int EarlyLeaveMin { get; set; }
        public int OtMin { get; set; }
        public int BreakMin { get; set; }
        public bool IsAbsent { get; set; }
        public string Status { get; set; } = "ok";     // ok|late|early|absent|incomplete|off|holiday
        public string DayType { get; set; } = "work";   // work|weekend|holiday|off
        public List<string> Exceptions { get; } = new();
    }

    public static class ShiftEngine
    {
        // dayType: "work" | "weekend" | "holiday"
        public static ShiftResult Evaluate(ShiftInput s, DateTime workDate, IEnumerable<DateTime> punches, string dayType = "work")
        {
            var r = new ShiftResult { DayType = dayType == "work" ? "work" : dayType };
            var D = workDate.Date;
            bool cross = s.EndTime <= s.StartTime;
            var schedIn = D + s.StartTime;
            var schedOut = D + s.EndTime + (cross ? TimeSpan.FromDays(1) : TimeSpan.Zero);
            r.SchedIn = schedIn; r.SchedOut = schedOut;
            int R = Math.Max(1, s.OtRoundingMin);

            var winStart = schedIn.AddMinutes(-s.EarlyInWindowMin);
            var winEnd = schedOut.AddMinutes(s.LateOutWindowMin);
            var inWin = punches.Where(p => p >= winStart && p <= winEnd).OrderBy(p => p).ToList();
            r.PunchCount = inWin.Count;
            r.BreakMin = s.BreakIsPaid ? 0 : s.BreakMinutes;

            bool weekendOrHoliday = dayType == "weekend" || dayType == "holiday";

            // rule 3: no punches
            if (inWin.Count == 0)
            {
                if (weekendOrHoliday) { r.Status = dayType == "holiday" ? "holiday" : "off"; r.DayType = dayType; }
                else { r.IsAbsent = true; r.Status = "absent"; }
                return r;
            }

            var actualIn = inWin.First();
            var actualOut = inWin.Last();
            r.ActualIn = actualIn; r.ActualOut = actualOut;

            // rule 4: single punch
            if (inWin.Count == 1)
            {
                var mid = schedIn + TimeSpan.FromTicks((schedOut - schedIn).Ticks / 2);
                if (actualIn < mid) { r.ActualOut = null; r.Exceptions.Add("missing_out"); }
                else { r.ActualIn = null; r.Exceptions.Add("missing_in"); }
                r.WorkedMin = 0;
                r.Status = weekendOrHoliday ? (dayType == "holiday" ? "holiday" : "off") : "incomplete";
                return r;
            }

            // rule 10: weekend/holiday with punches -> all time is OT
            if (weekendOrHoliday)
            {
                r.WorkedMin = Math.Max(0, (int)(actualOut - actualIn).TotalMinutes - r.BreakMin);
                r.OtMin = (r.WorkedMin / R) * R;
                r.Status = dayType == "holiday" ? "holiday" : "off";
                return r;
            }

            // rule 7: worked minutes
            r.WorkedMin = Math.Max(0, (int)(actualOut - actualIn).TotalMinutes - r.BreakMin);

            if (s.IsFlexible)
            {
                // rule 9
                int diff = r.WorkedMin - s.RequiredMinutes;
                if (diff >= s.OtAfterMin) r.OtMin = (diff / R) * R;
                else if (diff < 0) r.EarlyLeaveMin = -diff;
            }
            else
            {
                // rule 5: late
                int d = (int)(actualIn - schedIn).TotalMinutes;
                r.LateMin = d > s.GraceInMin ? (s.LateFromStart ? d : d - s.GraceInMin) : 0;
                if (r.LateMin < 0) r.LateMin = 0;

                // rule 6: early leave
                int e = (int)(schedOut - actualOut).TotalMinutes;
                r.EarlyLeaveMin = e > s.GraceOutMin ? (s.LateFromStart ? e : e - s.GraceOutMin) : 0;
                if (r.EarlyLeaveMin < 0) r.EarlyLeaveMin = 0;

                // rule 8: overtime after shift
                int after = (int)(actualOut - schedOut).TotalMinutes;
                if (after >= s.OtAfterMin) r.OtMin += (after / R) * R;
                if (s.OtBeforeStart)
                {
                    int before = (int)(schedIn - actualIn).TotalMinutes;
                    if (before >= s.OtAfterMin) r.OtMin += (before / R) * R;
                }
            }

            // rule 11: status priority
            r.Status = r.LateMin > 0 ? "late" : (r.EarlyLeaveMin > 0 ? "early" : "ok");
            return r;
        }
    }
}
