#nullable enable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using GateWay.App;

namespace ERP.Common
{
    // Small parameterised SQL helper for Wave-1 runtime services (devices, printing, attendance, numbering...).
    public static class RuntimeDb
    {
        public static SqlConnection Open()
        {
            var con = new SqlConnection(ConnectionString.connectionString);
            con.Open();
            return con;
        }

        public static async Task<SqlConnection> OpenAsync()
        {
            var con = new SqlConnection(ConnectionString.connectionString);
            await con.OpenAsync();
            return con;
        }

        public static async Task<List<Dictionary<string, object?>>> QueryAsync(string sql, params (string, object?)[] ps)
        {
            using var con = await OpenAsync();
            return await QueryAsync(con, null, sql, ps);
        }

        public static async Task<List<Dictionary<string, object?>>> QueryAsync(SqlConnection con, SqlTransaction? tran, string sql, params (string, object?)[] ps)
        {
            using var cmd = new SqlCommand(sql, con);
            if (tran != null) cmd.Transaction = tran;
            foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
            var rows = new List<Dictionary<string, object?>>();
            using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < r.FieldCount; i++)
                    row[r.GetName(i)] = r.IsDBNull(i) ? null : r.GetValue(i);
                rows.Add(row);
            }
            return rows;
        }

        public static async Task<Dictionary<string, object?>?> FirstAsync(string sql, params (string, object?)[] ps)
        {
            var rows = await QueryAsync(sql, ps);
            return rows.Count > 0 ? rows[0] : null;
        }

        public static async Task<Dictionary<string, object?>?> FirstAsync(SqlConnection con, SqlTransaction? tran, string sql, params (string, object?)[] ps)
        {
            var rows = await QueryAsync(con, tran, sql, ps);
            return rows.Count > 0 ? rows[0] : null;
        }

        public static async Task<int> ExecuteAsync(string sql, params (string, object?)[] ps)
        {
            using var con = await OpenAsync();
            return await ExecuteAsync(con, null, sql, ps);
        }

        public static async Task<int> ExecuteAsync(SqlConnection con, SqlTransaction? tran, string sql, params (string, object?)[] ps)
        {
            using var cmd = new SqlCommand(sql, con);
            if (tran != null) cmd.Transaction = tran;
            foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
            return await cmd.ExecuteNonQueryAsync();
        }

        public static async Task<object?> ScalarAsync(string sql, params (string, object?)[] ps)
        {
            using var con = await OpenAsync();
            using var cmd = new SqlCommand(sql, con);
            foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
            var o = await cmd.ExecuteScalarAsync();
            return o == DBNull.Value ? null : o;
        }

        public static async Task BumpConfigVersionAsync(string area)
        {
            try { await ExecuteAsync("EXEC dbo.Sys_BumpConfigVersion @Area", ("@Area", area)); } catch { }
        }

        public static int I(object? o) => o == null || o == DBNull.Value ? 0 : Convert.ToInt32(o);
        public static int? NI(object? o) => o == null || o == DBNull.Value ? (int?)null : Convert.ToInt32(o);
        public static string? S(object? o) => o == null || o == DBNull.Value ? null : o.ToString();
    }
}
