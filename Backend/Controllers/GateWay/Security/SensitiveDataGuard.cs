using System;
using System.Collections.Generic;
using System.Linq;

namespace GateWay.Security
{
    // W0-2: strips/blocks sensitive columns on every ManageDataSQL read, and blocks
    // writes to tables that have dedicated APIs. Procs (IsProc=true) are trusted and not filtered.
    public class SensitiveDataGuard
    {
        // read: table -> columns dropped from every returned row
        private static readonly Dictionary<string, string[]> ReadRedactions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Sys_Users"]    = new[] { "USER_PASSWORD", "USER_PASSWORD2", "USER_PasswordHash", "Token" },
            ["IQ_Sys_Users"] = new[] { "USER_PASSWORD", "USER_PASSWORD2", "USER_PasswordHash", "Token" },
            ["Sys_Devices"]  = new[] { "TokenHash", "SecretsEnc" },
        };

        // write: columns Sys_Users must never accept through the generic data API
        private static readonly string[] SysUsersRejectCols = { "USER_PASSWORD", "USER_PASSWORD2", "USER_PasswordHash", "Token" };

        // write: tables fully rejected (they have dedicated endpoints)
        private static readonly HashSet<string> WriteBlockedTables = new(StringComparer.OrdinalIgnoreCase)
        {
            "Sys_AuditLog", "Sys_DevicePairing", "Sys_RuntimeKeys", "Sys_PrintJobs",
            "Sys_DeviceCommands", "Sys_Devices", "Att_RawPunch", "Sys_DocSeriesCounter", "Sys_RecordExtra"
        };

        public static string Normalize(string? table)
        {
            if (string.IsNullOrWhiteSpace(table)) return "";
            var t = table.Trim();
            // strip schema prefix and brackets: [dbo].[Sys_Users] / dbo.Sys_Users -> Sys_Users
            t = t.Replace("[", "").Replace("]", "");
            int dot = t.LastIndexOf('.');
            if (dot >= 0) t = t.Substring(dot + 1);
            return t.Trim();
        }

        public void CheckWrite(string? table)
        {
            var t = Normalize(table);
            if (WriteBlockedTables.Contains(t))
                throw new InvalidOperationException($"Table '{t}' is read-only through this API; use its dedicated endpoint.");
        }

        public void CheckWrite(string? table, IEnumerable<string>? columns)
        {
            var t = Normalize(table);
            CheckWrite(table);
            if (t.Equals("Sys_Users", StringComparison.OrdinalIgnoreCase) && columns != null)
            {
                foreach (var c in columns)
                    if (SysUsersRejectCols.Contains(c, StringComparer.OrdinalIgnoreCase))
                        throw new InvalidOperationException($"Column '{c}' cannot be written through this API.");
            }
        }

        // Remove sensitive columns from rows of a single result set for the given table.
        public void Redact(string? table, List<Dictionary<string, object>>? rows)
        {
            if (rows == null || rows.Count == 0) return;
            var t = Normalize(table);
            if (!ReadRedactions.TryGetValue(t, out var cols)) return;
            foreach (var row in rows)
            {
                if (row == null) continue;
                // keys are case-sensitive in the dict; match case-insensitively
                var toRemove = row.Keys.Where(k => cols.Contains(k, StringComparer.OrdinalIgnoreCase)).ToList();
                foreach (var k in toRemove) row.Remove(k);
            }
        }

        public bool HasReadRedaction(string? table) => ReadRedactions.ContainsKey(Normalize(table));
    }
}
