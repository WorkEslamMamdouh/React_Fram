using System;
using System.Collections.Generic;
using ERP.Attendance;
using Xunit;

namespace ERP.Tests
{
    // Shared contract 4.14 V1-V7. Shift 09:00-17:00, grace in 15 / out 10, LateFromStart=1, break 60 unpaid, OT after 30, rounding 15.
    public class ShiftEngineTests
    {
        private static ShiftInput Std(bool lateFromStart = true) => new ShiftInput
        {
            StartTime = new TimeSpan(9, 0, 0),
            EndTime = new TimeSpan(17, 0, 0),
            GraceInMin = 15,
            GraceOutMin = 10,
            LateFromStart = lateFromStart,
            BreakMinutes = 60,
            BreakIsPaid = false,
            OtAfterMin = 30,
            OtRoundingMin = 15
        };

        private static DateTime D(string d, string t) => DateTime.Parse($"{d} {t}");

        [Fact]
        public void V1_OnTime()
        {
            var r = ShiftEngine.Evaluate(Std(), DateTime.Parse("2026-11-12"),
                new[] { D("2026-11-12", "08:55"), D("2026-11-12", "17:05") });
            Assert.Equal(0, r.LateMin); Assert.Equal(0, r.EarlyLeaveMin);
            Assert.Equal(430, r.WorkedMin); Assert.Equal(0, r.OtMin); Assert.Equal("ok", r.Status);
        }

        [Fact]
        public void V2_Late()
        {
            var r = ShiftEngine.Evaluate(Std(), DateTime.Parse("2026-11-12"),
                new[] { D("2026-11-12", "09:20"), D("2026-11-12", "17:00") });
            Assert.Equal(20, r.LateMin); Assert.Equal(0, r.EarlyLeaveMin);
            Assert.Equal(400, r.WorkedMin); Assert.Equal(0, r.OtMin); Assert.Equal("late", r.Status);
        }

        [Fact]
        public void V3_Early()
        {
            var r = ShiftEngine.Evaluate(Std(), DateTime.Parse("2026-11-12"),
                new[] { D("2026-11-12", "09:10"), D("2026-11-12", "16:45") });
            Assert.Equal(0, r.LateMin); Assert.Equal(15, r.EarlyLeaveMin);
            Assert.Equal(395, r.WorkedMin); Assert.Equal(0, r.OtMin); Assert.Equal("early", r.Status);
        }

        [Fact]
        public void V4_Overtime()
        {
            var r = ShiftEngine.Evaluate(Std(), DateTime.Parse("2026-11-12"),
                new[] { D("2026-11-12", "09:00"), D("2026-11-12", "18:40") });
            Assert.Equal(0, r.LateMin); Assert.Equal(0, r.EarlyLeaveMin);
            Assert.Equal(520, r.WorkedMin); Assert.Equal(90, r.OtMin); Assert.Equal("ok", r.Status);
        }

        [Fact]
        public void V5_NightCrossMidnight()
        {
            var s = Std();
            s.StartTime = new TimeSpan(22, 0, 0);
            s.EndTime = new TimeSpan(6, 0, 0); // cross midnight
            var r = ShiftEngine.Evaluate(s, DateTime.Parse("2026-11-12"),
                new[] { D("2026-11-12", "21:50"), D("2026-11-13", "06:20") });
            Assert.Equal(0, r.LateMin); Assert.Equal(0, r.EarlyLeaveMin);
            Assert.Equal(450, r.WorkedMin); Assert.Equal(0, r.OtMin); Assert.Equal("ok", r.Status);
        }

        [Fact]
        public void V6_SinglePunchIncomplete()
        {
            var r = ShiftEngine.Evaluate(Std(), DateTime.Parse("2026-11-12"),
                new[] { D("2026-11-12", "09:05") });
            Assert.Equal(0, r.LateMin); Assert.Equal(0, r.EarlyLeaveMin);
            Assert.Equal(0, r.WorkedMin); Assert.Equal(0, r.OtMin);
            Assert.Equal("incomplete", r.Status);
            Assert.Contains("missing_out", r.Exceptions);
        }

        [Fact]
        public void V7_LateFromStartFalse()
        {
            var r = ShiftEngine.Evaluate(Std(lateFromStart: false), DateTime.Parse("2026-11-12"),
                new[] { D("2026-11-12", "09:20"), D("2026-11-12", "17:00") });
            Assert.Equal(5, r.LateMin); Assert.Equal(0, r.EarlyLeaveMin);
            Assert.Equal(400, r.WorkedMin); Assert.Equal("late", r.Status);
        }

        [Fact]
        public void NoPunches_Absent()
        {
            var r = ShiftEngine.Evaluate(Std(), DateTime.Parse("2026-11-12"), new DateTime[0]);
            Assert.True(r.IsAbsent); Assert.Equal("absent", r.Status);
        }
    }
}
