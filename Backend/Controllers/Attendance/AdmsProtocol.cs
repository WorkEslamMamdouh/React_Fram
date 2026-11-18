#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace ERP.Attendance
{
    // W1-5 ZKTeco ADMS/iClock PUSH protocol. Pure parser/formatter (testable). Keep RawPayload.
    public class AdmsPunch
    {
        public string Pin { get; set; } = "";
        public DateTime PunchLocal { get; set; }
        public int State { get; set; } = 255;
        public int? Verify { get; set; }
        public string? WorkCode { get; set; }
        public string Raw { get; set; } = "";
    }

    public class AdmsCmdResult
    {
        public long Id { get; set; }
        public int Return { get; set; }
        public string? Cmd { get; set; }
    }

    public static class AdmsProtocol
    {
        // Handshake returned to GET /iclock/cdata?SN=...&options=all for a known SN.
        public static string BuildHandshake(string sn, string? attLogStamp, int timeZoneOffsetHours)
        {
            var stamp = string.IsNullOrEmpty(attLogStamp) ? "None" : attLogStamp;
            var sb = new StringBuilder();
            sb.Append("GET OPTION FROM: ").Append(sn).Append('\n');
            sb.Append("ATTLOGStamp=").Append(stamp).Append('\n');
            sb.Append("OPERLOGStamp=9999\n");
            sb.Append("ATTPHOTOStamp=None\n");
            sb.Append("ErrorDelay=30\n");
            sb.Append("Delay=10\n");
            sb.Append("TransTimes=00:00;14:05\n");
            sb.Append("TransInterval=1\n");
            sb.Append("TransFlag=TransData AttLog\n");
            sb.Append("TimeZone=").Append(timeZoneOffsetHours).Append('\n');
            sb.Append("Realtime=1\n");
            sb.Append("Encrypt=None\n");
            return sb.ToString();
        }

        // Parse an ATTLOG body: lines "PIN\tYYYY-MM-DD HH:MM:SS\tStatus\tVerify\tWorkcode...". Bad lines skipped.
        public static List<AdmsPunch> ParseAttlog(string body)
        {
            var list = new List<AdmsPunch>();
            if (string.IsNullOrEmpty(body)) return list;
            foreach (var raw in body.Replace("\r\n", "\n").Split('\n'))
            {
                var line = raw.TrimEnd('\r');
                if (line.Length == 0) continue;
                var parts = line.Split('\t');
                if (parts.Length < 2) continue;
                if (!DateTime.TryParseExact(parts[1].Trim(), "yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var t))
                    if (!DateTime.TryParse(parts[1].Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out t))
                        continue; // bad line
                var p = new AdmsPunch { Pin = parts[0].Trim(), PunchLocal = t, Raw = line };
                if (parts.Length > 2 && int.TryParse(parts[2].Trim(), out var st)) p.State = st;
                if (parts.Length > 3 && int.TryParse(parts[3].Trim(), out var vf)) p.Verify = vf;
                if (parts.Length > 4) p.WorkCode = parts[4].Trim();
                list.Add(p);
            }
            return list;
        }

        // Parse POST /iclock/devicecmd body: lines "ID={id}&Return={code}&CMD={cmd}".
        public static List<AdmsCmdResult> ParseDeviceCmd(string body)
        {
            var list = new List<AdmsCmdResult>();
            if (string.IsNullOrEmpty(body)) return list;
            foreach (var raw in body.Replace("\r\n", "\n").Split('\n'))
            {
                var line = raw.Trim();
                if (line.Length == 0) continue;
                var res = new AdmsCmdResult();
                bool hasId = false;
                foreach (var kv in line.Split('&'))
                {
                    var eq = kv.IndexOf('=');
                    if (eq <= 0) continue;
                    var k = kv.Substring(0, eq).Trim();
                    var v = kv.Substring(eq + 1).Trim();
                    if (k.Equals("ID", StringComparison.OrdinalIgnoreCase) && long.TryParse(v, out var id)) { res.Id = id; hasId = true; }
                    else if (k.Equals("Return", StringComparison.OrdinalIgnoreCase) && int.TryParse(v, out var rc)) res.Return = rc;
                    else if (k.Equals("CMD", StringComparison.OrdinalIgnoreCase)) res.Cmd = v;
                }
                if (hasId) list.Add(res);
            }
            return list;
        }

        // Build one getrequest command line "C:{CommandId}:{text}".
        public static string BuildCommandLine(long commandId, string commandType, string? pin, string? name)
        {
            string text = commandType switch
            {
                "att.user.upsert" => $"DATA UPDATE USERINFO PIN={pin}\tName={name}\tPri=0",
                "att.user.delete" => $"DATA DELETE USERINFO PIN={pin}",
                "att.reboot" => "REBOOT",
                _ => ""
            };
            return $"C:{commandId}:{text}";
        }
    }
}
