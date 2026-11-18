#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ERP.Common;

namespace ERP.Audit
{
    public class AuditPolicyRow
    {
        public string TableName { get; set; } = "";
        public string? ModuleCode { get; set; }
        public string? KeyColumn { get; set; }
        public bool AuditInsert { get; set; } = true;
        public bool AuditUpdate { get; set; } = true;
        public bool AuditDelete { get; set; } = true;
        public HashSet<string> ExcludeColumns { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    // W1-11: policy cache + diff capture inside the save transaction (behind SAVE TRANSACTION audit_sp).
    public class AuditService
    {
        private static readonly string[] AlwaysExclude = { "USER_PASSWORD", "USER_PASSWORD2", "USER_PasswordHash", "Token", "TokenHash", "SecretsEnc", "RowVer" };
        private readonly bool _enabled;
        private readonly bool _failClosed;

        private static Dictionary<string, AuditPolicyRow>? _cache;
        private static DateTime _expiry = DateTime.MinValue;
        private static readonly SemaphoreSlim _lock = new(1, 1);

        public AuditService(IConfiguration cfg)
        {
            _enabled = cfg.GetValue<bool?>("Audit:Enabled") ?? true;
            _failClosed = cfg.GetValue<bool?>("Audit:FailClosed") ?? false;
        }

        public bool Enabled => _enabled;

        public async Task<AuditPolicyRow?> GetPolicyAsync(string table)
        {
            if (!_enabled) return null;
            var t = Strip(table);
            await EnsureCacheAsync();
            return _cache != null && _cache.TryGetValue(t, out var p) ? p : null;
        }

        private static async Task EnsureCacheAsync()
        {
            if (_cache != null && DateTime.UtcNow < _expiry) return;
            await _lock.WaitAsync();
            try
            {
                if (_cache != null && DateTime.UtcNow < _expiry) return;
                var d = new Dictionary<string, AuditPolicyRow>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    var rows = await RuntimeDb.QueryAsync("SELECT TableName, ModuleCode, KeyColumn, AuditInsert, AuditUpdate, AuditDelete, ExcludeColumns FROM dbo.Sys_AuditPolicy WHERE IsEnabled=1");
                    foreach (var r in rows)
                    {
                        var p = new AuditPolicyRow
                        {
                            TableName = RuntimeDb.S(r["TableName"]) ?? "",
                            ModuleCode = RuntimeDb.S(r["ModuleCode"]),
                            KeyColumn = RuntimeDb.S(r["KeyColumn"]),
                            AuditInsert = Convert.ToBoolean(r["AuditInsert"]),
                            AuditUpdate = Convert.ToBoolean(r["AuditUpdate"]),
                            AuditDelete = Convert.ToBoolean(r["AuditDelete"])
                        };
                        var ex = RuntimeDb.S(r["ExcludeColumns"]);
                        if (!string.IsNullOrEmpty(ex)) foreach (var c in ex!.Split(',')) p.ExcludeColumns.Add(c.Trim());
                        d[Strip(p.TableName)] = p;
                    }
                }
                catch { /* table may not exist yet */ }
                _cache = d;
                _expiry = DateTime.UtcNow.AddSeconds(30);
            }
            finally { _lock.Release(); }
        }

        public async Task<Dictionary<string, object?>?> LoadOldAsync(SqlConnection con, SqlTransaction? tran, string table, string keyColumn, object keyValue)
        {
            var rows = await RuntimeDb.QueryAsync(con, tran, $"SELECT * FROM {table} WHERE [{keyColumn}] = @k", ("@k", keyValue));
            return rows.Count > 0 ? rows[0] : null;
        }

        // action: I|U|D. Wrapped in a savepoint so an audit failure never loses the save (unless FailClosed).
        public async Task CaptureAsync(SqlConnection con, SqlTransaction? tran, string action, AuditPolicyRow pol, string table,
            string? recordKey, Dictionary<string, object?>? oldRow, IDictionary<string, object>? newValues,
            int? userId, int? compCode, int? branchCode)
        {
            if (!_enabled) return;
            var changes = BuildChanges(action, pol, oldRow, newValues);
            if (changes == null) return; // nothing to record (e.g. update with no changed fields)

            if (tran != null) { try { await RuntimeDb.ExecuteAsync(con, tran, "SAVE TRANSACTION audit_sp;"); } catch { } }
            try
            {
                await RuntimeDb.ExecuteAsync(con, tran,
                    "INSERT INTO dbo.Sys_AuditLog (Source, Action, UserID, CompCode, BranchCode, ModuleCode, TableName, RecordKey, ChangesJson) " +
                    "VALUES ('runtime', @a, @u, @c, @b, @m, @t, @k, @j)",
                    ("@a", action), ("@u", (object?)userId), ("@c", (object?)compCode), ("@b", (object?)branchCode),
                    ("@m", (object?)pol.ModuleCode), ("@t", Strip(table)), ("@k", (object?)recordKey), ("@j", changes));
            }
            catch (Exception)
            {
                if (tran != null) { try { await RuntimeDb.ExecuteAsync(con, tran, "ROLLBACK TRANSACTION audit_sp;"); } catch { } }
                if (_failClosed) throw; // else swallow: the user's save stays
            }
        }

        private string? BuildChanges(string action, AuditPolicyRow pol, Dictionary<string, object?>? oldRow, IDictionary<string, object>? newValues)
        {
            bool Excluded(string c) => pol.ExcludeColumns.Contains(c) || AlwaysExclude.Contains(c, StringComparer.OrdinalIgnoreCase);
            var o = new JObject();

            if (action == "I" && newValues != null)
            {
                foreach (var kv in newValues) if (!Excluded(kv.Key)) o[kv.Key] = new JObject { ["o"] = null, ["n"] = Trunc(kv.Value) };
                return o.HasValues ? o.ToString(Formatting.None) : null;
            }
            if (action == "D" && oldRow != null)
            {
                foreach (var kv in oldRow) if (!Excluded(kv.Key)) o[kv.Key] = new JObject { ["o"] = Trunc(kv.Value), ["n"] = null };
                return o.HasValues ? o.ToString(Formatting.None) : null;
            }
            if (action == "U" && newValues != null)
            {
                foreach (var kv in newValues)
                {
                    if (Excluded(kv.Key)) continue;
                    object? ov = oldRow != null && oldRow.TryGetValue(kv.Key, out var v) ? v : null;
                    if (!ValuesEqual(ov, kv.Value))
                        o[kv.Key] = new JObject { ["o"] = Trunc(ov), ["n"] = Trunc(kv.Value) };
                }
                return o.HasValues ? o.ToString(Formatting.None) : null;
            }
            return null;
        }

        private static JToken Trunc(object? v)
        {
            if (v == null || v == DBNull.Value) return JValue.CreateNull();
            var s = v.ToString() ?? "";
            if (s.Length > 1000) s = s.Substring(0, 1000);
            return new JValue(s);
        }

        private static bool ValuesEqual(object? a, object? b)
        {
            var sa = a == null || a == DBNull.Value ? null : a.ToString();
            var sb = b == null || b == DBNull.Value ? null : b.ToString();
            return string.Equals(sa, sb, StringComparison.Ordinal);
        }

        private static string Strip(string t) { t = t.Replace("[", "").Replace("]", ""); int i = t.LastIndexOf('.'); return (i >= 0 ? t.Substring(i + 1) : t).Trim(); }
    }
}
