using System;
using System.Collections.Generic;
using ERP.Attendance;
using Xunit;

namespace ERP.Tests
{
    public class AdmsProtocolTests
    {
        [Fact]
        public void Handshake_ContainsStampAndSn()
        {
            var txt = AdmsProtocol.BuildHandshake("ABC123", "9999", 2);
            Assert.Contains("GET OPTION FROM: ABC123", txt);
            Assert.Contains("ATTLOGStamp=9999", txt);
            Assert.Contains("TimeZone=2", txt);
            Assert.Contains("Realtime=1", txt);
        }

        [Fact]
        public void Handshake_NoneStampWhenNull()
        {
            var txt = AdmsProtocol.BuildHandshake("SN1", null, 0);
            Assert.Contains("ATTLOGStamp=None", txt);
        }

        [Fact]
        public void ParseAttlog_GoodAndBadLines()
        {
            var body = "105\t2026-11-12 08:55:03\t0\t1\t0\n" +
                       "garbage line without tabs\n" +
                       "106\t2026-11-12 17:05:10\t1\t15\n" +
                       "107\tnot-a-date\t0\t1\n";
            var list = AdmsProtocol.ParseAttlog(body);
            Assert.Equal(2, list.Count);                 // 2 bad lines skipped
            Assert.Equal("105", list[0].Pin);
            Assert.Equal(new DateTime(2026, 11, 12, 8, 55, 3), list[0].PunchLocal);
            Assert.Equal(0, list[0].State);
            Assert.Equal(1, list[0].Verify);
            Assert.Equal(1, list[1].State);
            Assert.Equal(15, list[1].Verify);
        }

        [Fact]
        public void ParseDeviceCmd_Parses()
        {
            var list = AdmsProtocol.ParseDeviceCmd("ID=901&Return=0&CMD=DATA\nID=902&Return=-1&CMD=USER");
            Assert.Equal(2, list.Count);
            Assert.Equal(901, list[0].Id); Assert.Equal(0, list[0].Return);
            Assert.Equal(902, list[1].Id); Assert.Equal(-1, list[1].Return);
        }

        [Fact]
        public void BuildCommandLine_Upsert()
        {
            var line = AdmsProtocol.BuildCommandLine(5, "att.user.upsert", "105", "Ahmed");
            Assert.StartsWith("C:5:DATA UPDATE USERINFO PIN=105", line);
            Assert.Contains("Name=Ahmed", line);
        }
    }

    public class CsvPunchParserTests
    {
        [Fact]
        public void Parse_HeaderByName_DateTime()
        {
            var csv = "EnrollNo,Time,State\n105,2026-11-12 08:55:03,In\n106,2026-11-12 17:00:00,Out\n";
            var p = new CsvProfile
            {
                HasHeader = true,
                ColUserId = "EnrollNo",
                ColDateTime = "Time",
                ColState = "State",
                StateMap = new Dictionary<string, int> { ["In"] = 0, ["Out"] = 1 }
            };
            var r = CsvPunchParser.Parse(csv, p);
            Assert.Equal(2, r.Punches.Count);
            Assert.Empty(r.Errors);
            Assert.Equal("105", r.Punches[0].DeviceUserId);
            Assert.Equal(0, r.Punches[0].State);
            Assert.Equal(1, r.Punches[1].State);
        }

        [Fact]
        public void Parse_NoHeader_ByIndex_SeparateDateTime()
        {
            var csv = "105;2026-11-12;08:55:03\n106;2026-11-12;17:00:00\n";
            var p = new CsvProfile
            {
                Delimiter = ';',
                HasHeader = false,
                ColUserId = "1",
                ColDate = "2",
                ColTime = "3",
                DateTimeFormat = "yyyy-MM-dd HH:mm:ss"
            };
            var r = CsvPunchParser.Parse(csv, p);
            Assert.Equal(2, r.Punches.Count);
            Assert.Equal(new DateTime(2026, 11, 12, 8, 55, 3), r.Punches[0].PunchLocal);
        }

        [Fact]
        public void Parse_BadRowReported()
        {
            var csv = "EnrollNo,Time\n105,not-a-date\n";
            var p = new CsvProfile { HasHeader = true, ColUserId = "EnrollNo", ColDateTime = "Time" };
            var r = CsvPunchParser.Parse(csv, p);
            Assert.Empty(r.Punches);
            Assert.Single(r.Errors);
        }
    }
}
