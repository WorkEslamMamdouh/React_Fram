#nullable enable
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using ERP.Common;

namespace ERP.Numbering
{
    // W1-9: document numbering. Binding hook fills the bound column inside the save transaction (gapless by construction).
    public class NumberingService
    {
        private static readonly string[] AutoMarkers = { "", "0", "AUTO" };

        // cached set of bound table names so plain screens skip the hook without a per-save DB hit
        private static HashSet<string>? _boundTables;
        private static DateTime _expiry = DateTime.MinValue;
        private static readonly System.Threading.SemaphoreSlim _lock = new(1, 1);

        public async Task<bool> HasBindingAsync(string table)
        {
            var t = Strip(table);
            if (_boundTables == null || DateTime.UtcNow >= _expiry)
            {
                await _lock.WaitAsync();
                try
                {
                    if (_boundTables == null || DateTime.UtcNow >= _expiry)
                    {
                        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        try { foreach (var r in await RuntimeDb.QueryAsync("SELECT DISTINCT TableName FROM dbo.Sys_DocSeriesBinding WHERE IsActive=1")) set.Add(Strip(RuntimeDb.S(r["TableName"]) ?? "")); }
                        catch { }
                        _boundTables = set; _expiry = DateTime.UtcNow.AddSeconds(30);
                    }
                }
                finally { _lock.Release(); }
            }
            return _boundTables!.Contains(t);
        }

        // Called inside ManageDataSQL save transaction. Mutates dict in place for each active binding of the table.
        public async Task FillAsync(SqlConnection con, SqlTransaction? tran, string table, Dictionary<string, object> dict)
        {
            var t = Strip(table);
            var bindings = await RuntimeDb.QueryAsync(con, tran,
                "SELECT ColumnName, DocKey, CompColumn, BranchColumn, DateColumn, OverwriteClientValue FROM dbo.Sys_DocSeriesBinding WHERE IsActive=1 AND TableName=@t", ("@t", t));
            foreach (var b in bindings)
            {
                var col = RuntimeDb.S(b["ColumnName"])!;
                bool overwrite = Convert.ToBoolean(b["OverwriteClientValue"]);
                bool needs = overwrite || !dict.TryGetValue(col, out var cur) || cur == null || cur == DBNull.Value
                             || Array.Exists(AutoMarkers, m => string.Equals(cur?.ToString()?.Trim(), m, StringComparison.OrdinalIgnoreCase));
                if (!needs) continue;

                int comp = GetInt(dict, RuntimeDb.S(b["CompColumn"]));
                int? branch = GetNullableInt(dict, RuntimeDb.S(b["BranchColumn"]));
                DateTime? docDate = GetDate(dict, RuntimeDb.S(b["DateColumn"]));
                var (docNo, _, _) = await NextDocNoAsync(con, tran, RuntimeDb.S(b["DocKey"])!, comp, branch, null, docDate, null);
                dict[col] = docNo;
            }
        }

        public async Task<(string docNo, int seriesId, long seqNo)> NextDocNoAsync(
            SqlConnection con, SqlTransaction? tran, string docKey, int comp, int? branch, int? terminal, DateTime? docDate, int? finYear)
        {
            using var cmd = new SqlCommand("dbo.Sys_NextDocNo", con) { CommandType = CommandType.StoredProcedure };
            if (tran != null) cmd.Transaction = tran;
            cmd.Parameters.AddWithValue("@DocKey", docKey);
            cmd.Parameters.AddWithValue("@CompCode", comp);
            cmd.Parameters.AddWithValue("@BranchCode", (object?)branch ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@TerminalDeviceId", (object?)terminal ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@DocDate", (object?)docDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@FinYear", (object?)finYear ?? DBNull.Value);
            var pNo = new SqlParameter("@DocNo", SqlDbType.NVarChar, 200) { Direction = ParameterDirection.Output };
            var pSid = new SqlParameter("@SeriesId", SqlDbType.Int) { Direction = ParameterDirection.Output };
            var pSeq = new SqlParameter("@SeqNo", SqlDbType.BigInt) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(pNo); cmd.Parameters.Add(pSid); cmd.Parameters.Add(pSeq);
            await cmd.ExecuteNonQueryAsync();
            return (pNo.Value?.ToString() ?? "", pSid.Value == DBNull.Value ? 0 : Convert.ToInt32(pSid.Value), pSeq.Value == DBNull.Value ? 0 : Convert.ToInt64(pSeq.Value));
        }

        public async Task<bool> IsGaplessAsync(string docKey, int comp)
        {
            var o = await RuntimeDb.ScalarAsync(
                "SELECT TOP 1 CAST(IsGapless AS INT) FROM dbo.Sys_DocSeries WHERE DocKey=@d AND CompCode=@c AND IsActive=1 ORDER BY Priority DESC", ("@d", docKey), ("@c", comp));
            return o != null && Convert.ToInt32(o) == 1;
        }

        private static string Strip(string table)
        {
            var t = table.Replace("[", "").Replace("]", "");
            int dot = t.LastIndexOf('.'); if (dot >= 0) t = t.Substring(dot + 1);
            return t.Trim();
        }
        private static int GetInt(Dictionary<string, object> d, string? col) => col != null && d.TryGetValue(col, out var v) && v != null && v != DBNull.Value ? Convert.ToInt32(v) : 0;
        private static int? GetNullableInt(Dictionary<string, object> d, string? col) => col != null && d.TryGetValue(col, out var v) && v != null && v != DBNull.Value ? Convert.ToInt32(v) : (int?)null;
        private static DateTime? GetDate(Dictionary<string, object> d, string? col) => col != null && d.TryGetValue(col, out var v) && v != null && v != DBNull.Value && DateTime.TryParse(v.ToString(), out var dt) ? dt : (DateTime?)null;
    }
}
