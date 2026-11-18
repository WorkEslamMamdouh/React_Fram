using System;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using GateWay.App;

namespace ERP.Audit
{
    // W0-5: single writer for dbo.Sys_AuditLog. Used by auth (LOGIN/LOGIN_FAIL/PWD_*),
    // the data-API guard, the print/attendance/numbering paths and jobs.
    public class AuditEntry
    {
        public string Source { get; set; } = "runtime"; // runtime|studio|bridge|device|job
        public string Action { get; set; } = "";          // see 4.15
        public int? UserID { get; set; }
        public string? UserCode { get; set; }
        public int? CompCode { get; set; }
        public int? BranchCode { get; set; }
        public string? ModuleCode { get; set; }
        public string? TableName { get; set; }
        public string? RecordKey { get; set; }
        public string? ChangesJson { get; set; }
        public string? ClientIp { get; set; }
        public Guid? CorrelationId { get; set; }
    }

    public class AuditWriter
    {
        private const string Sql =
            "INSERT INTO dbo.Sys_AuditLog (Source, Action, UserID, UserCode, CompCode, BranchCode, ModuleCode, TableName, RecordKey, ChangesJson, ClientIp, CorrelationId) " +
            "VALUES (@Source, @Action, @UserID, @UserCode, @CompCode, @BranchCode, @ModuleCode, @TableName, @RecordKey, @ChangesJson, @ClientIp, @CorrelationId);";

        // Own connection (fire-and-forget safe path).
        public async Task WriteAsync(AuditEntry e)
        {
            try
            {
                using var con = new SqlConnection(ConnectionString.connectionString);
                await con.OpenAsync();
                using var cmd = Build(con, null, e);
                await cmd.ExecuteNonQueryAsync();
            }
            catch { /* auditing must never break the request on its own connection */ }
        }

        // Inside an existing save transaction (W1-11 uses this after a savepoint).
        public async Task WriteAsync(SqlConnection con, SqlTransaction? tran, AuditEntry e)
        {
            using var cmd = Build(con, tran, e);
            await cmd.ExecuteNonQueryAsync();
        }

        private static SqlCommand Build(SqlConnection con, SqlTransaction? tran, AuditEntry e)
        {
            var cmd = new SqlCommand(Sql, con);
            if (tran != null) cmd.Transaction = tran;
            cmd.Parameters.AddWithValue("@Source", e.Source);
            cmd.Parameters.AddWithValue("@Action", e.Action);
            cmd.Parameters.AddWithValue("@UserID", (object?)e.UserID ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@UserCode", (object?)e.UserCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@CompCode", (object?)e.CompCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@BranchCode", (object?)e.BranchCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ModuleCode", (object?)e.ModuleCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@TableName", (object?)e.TableName ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RecordKey", (object?)e.RecordKey ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ChangesJson", (object?)e.ChangesJson ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ClientIp", (object?)e.ClientIp ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@CorrelationId", (object?)e.CorrelationId ?? DBNull.Value);
            return cmd;
        }
    }
}
