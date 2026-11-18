#nullable enable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace ERP.Attendance
{
    // W1-5 profile-driven CSV punch import (delimiter, header, columns by name or 1-based index, date format, state map).
    public class CsvProfile
    {
        public char Delimiter { get; set; } = ',';
        public bool HasHeader { get; set; } = true;
        public string ColUserId { get; set; } = "1";     // header name or 1-based index
        public string? ColDateTime { get; set; }
        public string? ColDate { get; set; }
        public string? ColTime { get; set; }
        public string? ColState { get; set; }
        public string DateTimeFormat { get; set; } = "yyyy-MM-dd HH:mm:ss";
        public Dictionary<string, int>? StateMap { get; set; }   // raw token -> state code
    }

    public class CsvPunchRow
    {
        public string DeviceUserId { get; set; } = "";
        public DateTime PunchLocal { get; set; }
        public int State { get; set; } = 255;
        public int LineNumber { get; set; }
    }

    public class CsvParseResult
    {
        public int Rows { get; set; }
        public List<CsvPunchRow> Punches { get; } = new();
        public List<(int line, string message)> Errors { get; } = new();
    }

    public static class CsvPunchParser
    {
        public static CsvParseResult Parse(string text, CsvProfile p)
        {
            var result = new CsvParseResult();
            if (string.IsNullOrEmpty(text)) return result;
            var lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
            Dictionary<string, int>? headerMap = null;
            int start = 0;

            if (p.HasHeader)
            {
                for (; start < lines.Length; start++)
                    if (lines[start].Trim().Length > 0) break;
                if (start < lines.Length)
                {
                    var hdr = SplitLine(lines[start], p.Delimiter);
                    headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    for (int i = 0; i < hdr.Length; i++)
                        headerMap[hdr[i].Trim()] = i;
                    start++;
                }
            }

            for (int li = start; li < lines.Length; li++)
            {
                var line = lines[li];
                if (line.Trim().Length == 0) continue;
                result.Rows++;
                var cells = SplitLine(line, p.Delimiter);
                try
                {
                    var uid = Cell(cells, headerMap, p.ColUserId);
                    if (string.IsNullOrWhiteSpace(uid)) { result.Errors.Add((li + 1, "missing user id")); continue; }

                    DateTime dt;
                    if (!string.IsNullOrEmpty(p.ColDateTime))
                    {
                        var s = Cell(cells, headerMap, p.ColDateTime!);
                        if (!TryParseDate(s, p.DateTimeFormat, out dt)) { result.Errors.Add((li + 1, $"bad datetime '{s}'")); continue; }
                    }
                    else
                    {
                        var ds = Cell(cells, headerMap, p.ColDate ?? "");
                        var ts = Cell(cells, headerMap, p.ColTime ?? "");
                        if (!TryParseDate((ds + " " + ts).Trim(), p.DateTimeFormat, out dt)) { result.Errors.Add((li + 1, $"bad date/time '{ds} {ts}'")); continue; }
                    }

                    int state = 255;
                    if (!string.IsNullOrEmpty(p.ColState))
                    {
                        var raw = Cell(cells, headerMap, p.ColState!);
                        if (p.StateMap != null && p.StateMap.TryGetValue(raw, out var mapped)) state = mapped;
                        else if (int.TryParse(raw, out var sv)) state = sv;
                    }

                    result.Punches.Add(new CsvPunchRow { DeviceUserId = uid.Trim(), PunchLocal = dt, State = state, LineNumber = li + 1 });
                }
                catch (Exception ex) { result.Errors.Add((li + 1, ex.Message)); }
            }
            return result;
        }

        private static bool TryParseDate(string s, string fmt, out DateTime dt)
        {
            s = s.Trim();
            if (DateTime.TryParseExact(s, fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out dt)) return true;
            return DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out dt);
        }

        private static string Cell(string[] cells, Dictionary<string, int>? headerMap, string colSpec)
        {
            if (string.IsNullOrEmpty(colSpec)) return "";
            int idx;
            if (headerMap != null && headerMap.TryGetValue(colSpec, out idx)) { }
            else if (int.TryParse(colSpec, out var oneBased)) idx = oneBased - 1;  // 1-based index
            else return "";
            return idx >= 0 && idx < cells.Length ? cells[idx].Trim() : "";
        }

        // Minimal CSV splitter with double-quote support.
        private static string[] SplitLine(string line, char delim)
        {
            var outp = new List<string>();
            var cur = new System.Text.StringBuilder();
            bool inQ = false;
            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (inQ)
                {
                    if (c == '"') { if (i + 1 < line.Length && line[i + 1] == '"') { cur.Append('"'); i++; } else inQ = false; }
                    else cur.Append(c);
                }
                else
                {
                    if (c == '"') inQ = true;
                    else if (c == delim) { outp.Add(cur.ToString()); cur.Clear(); }
                    else cur.Append(c);
                }
            }
            outp.Add(cur.ToString());
            return outp.ToArray();
        }
    }
}
