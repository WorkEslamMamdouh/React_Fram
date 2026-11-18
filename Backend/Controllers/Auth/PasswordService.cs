using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GateWay.App;
using ERP.Audit;

namespace ERP.Auth
{
    // W0-1: verify / migrate / lockout. All SQL parameterised. Password never logged.
    public class PasswordService
    {
        private static readonly PasswordHasher<object> Hasher = new();
        private readonly AuthOptions _opt;
        private readonly AuditWriter _audit;

        public PasswordService(IConfiguration cfg, AuditWriter audit)
        {
            _opt = new AuthOptions();
            cfg.GetSection("Auth").Bind(_opt);
            _audit = audit;
        }

        public AuthOptions Options => _opt;
        public string HashPassword(string password) => Hasher.HashPassword(null!, password);

        public async Task<LoginOutcome> LoginAsync(string username, string password, string? clientIp)
        {
            username ??= ""; password ??= "";
            using var con = new SqlConnection(ConnectionString.connectionString);
            await con.OpenAsync();

            var user = await LoadUserAsync(con, username);
            if (user == null)
                return new LoginOutcome { Success = false, FailReason = "Unauthorized" };

            int userId = ToInt(user.GetValueOrDefault("UserID"));

            // 2) lockout window
            var lockoutUntil = user.GetValueOrDefault("LockoutUntil");
            if (lockoutUntil != null && lockoutUntil != DBNull.Value && Convert.ToDateTime(lockoutUntil) > DateTime.UtcNow)
                return new LoginOutcome { Success = false, FailReason = "Unauthorized" };

            string hash = (user.GetValueOrDefault("USER_PasswordHash") as string) ?? "";
            string plain = (user.GetValueOrDefault("USER_PASSWORD") as string) ?? "";

            bool ok = false;
            bool needMigrate = false;

            if (!string.IsNullOrEmpty(hash))
            {
                var vr = Hasher.VerifyHashedPassword(null!, hash, password);
                if (vr == PasswordVerificationResult.Success) ok = true;
                else if (vr == PasswordVerificationResult.SuccessRehashNeeded) { ok = true; needMigrate = true; }
            }
            else if (_opt.AllowPlaintextFallback && plain.Length > 0 && FixedEquals(plain, password))
            {
                ok = true;
                needMigrate = true; // migrate plaintext -> hash
            }

            if (!ok)
            {
                await RegisterFailureAsync(con, userId);
                await _audit.WriteAsync(new AuditEntry { Source = "runtime", Action = "LOGIN_FAIL", UserID = userId, UserCode = username, ClientIp = clientIp });
                return new LoginOutcome { Success = false, FailReason = "Unauthorized" };
            }

            // success: migrate hash if needed, reset counters
            if (needMigrate)
            {
                var newHash = HashPassword(password);
                await MigrateHashAsync(con, userId, newHash, _opt.ClearPlaintextOnMigrate);
                user["USER_PasswordHash"] = newHash;
                await _audit.WriteAsync(new AuditEntry { Source = "runtime", Action = "PWD_MIGRATE", UserID = userId, UserCode = username, ClientIp = clientIp });
            }
            await ResetCountersAsync(con, userId);
            await _audit.WriteAsync(new AuditEntry { Source = "runtime", Action = "LOGIN", UserID = userId, UserCode = username, ClientIp = clientIp });
            return new LoginOutcome { Success = true, User = user };
        }

        public async Task<(bool ok, string? error)> ChangePasswordAsync(int userId, string oldPassword, string newPassword, string? clientIp)
        {
            if (string.IsNullOrEmpty(newPassword) || newPassword.Length < _opt.MinPasswordLength)
                return (false, $"Password must be at least {_opt.MinPasswordLength} characters.");

            using var con = new SqlConnection(ConnectionString.connectionString);
            await con.OpenAsync();

            var user = await LoadUserByIdAsync(con, userId);
            if (user == null) return (false, "Unauthorized");

            string hash = (user.GetValueOrDefault("USER_PasswordHash") as string) ?? "";
            string plain = (user.GetValueOrDefault("USER_PASSWORD") as string) ?? "";
            bool ok = false;
            if (!string.IsNullOrEmpty(hash))
                ok = Hasher.VerifyHashedPassword(null!, hash, oldPassword) != PasswordVerificationResult.Failed;
            else if (_opt.AllowPlaintextFallback && plain.Length > 0)
                ok = FixedEquals(plain, oldPassword);
            if (!ok) return (false, "Old password is incorrect.");

            var newHash = HashPassword(newPassword);
            await MigrateHashAsync(con, userId, newHash, clearPlain: true); // change always clears plaintext for the new password
            await _audit.WriteAsync(new AuditEntry { Source = "runtime", Action = "PWD_CHANGE", UserID = userId, UserCode = user.GetValueOrDefault("USER_CODE") as string, ClientIp = clientIp });
            return (true, null);
        }

        // Batch migrate remaining plain-text passwords (job auth.hash.migrate).
        public async Task<int> MigratePlaintextBatchAsync(int batch)
        {
            if (batch <= 0) batch = 200;
            using var con = new SqlConnection(ConnectionString.connectionString);
            await con.OpenAsync();
            var ids = new List<(int id, string plain)>();
            using (var cmd = new SqlCommand(
                "SELECT TOP (@n) UserID, USER_PASSWORD FROM dbo.Sys_Users WHERE ISNULL(USER_PasswordHash,N'')=N'' AND ISNULL(USER_PASSWORD,N'')<>N'';", con))
            {
                cmd.Parameters.AddWithValue("@n", batch);
                using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    ids.Add((r.GetInt32(0), r.IsDBNull(1) ? "" : r.GetString(1)));
            }
            int n = 0;
            foreach (var (id, plain) in ids)
            {
                if (string.IsNullOrEmpty(plain)) continue;
                await MigrateHashAsync(con, id, HashPassword(plain), _opt.ClearPlaintextOnMigrate);
                n++;
            }
            return n;
        }

        // ---------- data helpers (parameterised) ----------
        private static async Task<Dictionary<string, object>?> LoadUserAsync(SqlConnection con, string username)
        {
            using var cmd = new SqlCommand("SELECT TOP 1 * FROM dbo.Sys_Users WHERE USER_CODE = @u AND ISNULL(USER_ACTIVE,0) = 1;", con);
            cmd.Parameters.AddWithValue("@u", username);
            return await ReadOneAsync(cmd);
        }

        private static async Task<Dictionary<string, object>?> LoadUserByIdAsync(SqlConnection con, int userId)
        {
            using var cmd = new SqlCommand("SELECT TOP 1 * FROM dbo.Sys_Users WHERE UserID = @id;", con);
            cmd.Parameters.AddWithValue("@id", userId);
            return await ReadOneAsync(cmd);
        }

        private static async Task<Dictionary<string, object>?> ReadOneAsync(SqlCommand cmd)
        {
            using var r = await cmd.ExecuteReaderAsync();
            if (!await r.ReadAsync()) return null;
            var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < r.FieldCount; i++)
                dict[r.GetName(i)] = r.IsDBNull(i) ? DBNull.Value : r.GetValue(i);
            return dict;
        }

        private async Task RegisterFailureAsync(SqlConnection con, int userId)
        {
            using var cmd = new SqlCommand(
                "UPDATE dbo.Sys_Users SET FailedLoginCount = ISNULL(FailedLoginCount,0) + 1, " +
                "LockoutUntil = CASE WHEN ISNULL(FailedLoginCount,0) + 1 >= @thr THEN DATEADD(MINUTE, @mins, SYSUTCDATETIME()) ELSE LockoutUntil END " +
                "WHERE UserID = @id;", con);
            cmd.Parameters.AddWithValue("@thr", _opt.LockoutThreshold);
            cmd.Parameters.AddWithValue("@mins", _opt.LockoutMinutes);
            cmd.Parameters.AddWithValue("@id", userId);
            await cmd.ExecuteNonQueryAsync();
        }

        private static async Task ResetCountersAsync(SqlConnection con, int userId)
        {
            using var cmd = new SqlCommand("UPDATE dbo.Sys_Users SET FailedLoginCount = 0, LockoutUntil = NULL WHERE UserID = @id;", con);
            cmd.Parameters.AddWithValue("@id", userId);
            await cmd.ExecuteNonQueryAsync();
        }

        private static async Task MigrateHashAsync(SqlConnection con, int userId, string hash, bool clearPlain)
        {
            string sql = clearPlain
                ? "UPDATE dbo.Sys_Users SET USER_PasswordHash = @h, PasswordMigratedAt = SYSUTCDATETIME(), USER_PASSWORD = N'' WHERE UserID = @id;"
                : "UPDATE dbo.Sys_Users SET USER_PasswordHash = @h, PasswordMigratedAt = SYSUTCDATETIME() WHERE UserID = @id;";
            using var cmd = new SqlCommand(sql, con);
            cmd.Parameters.AddWithValue("@h", hash);
            cmd.Parameters.AddWithValue("@id", userId);
            await cmd.ExecuteNonQueryAsync();
        }

        private static bool FixedEquals(string a, string b)
        {
            var ba = Encoding.UTF8.GetBytes(a);
            var bb = Encoding.UTF8.GetBytes(b);
            if (ba.Length != bb.Length) return false;
            return CryptographicOperations.FixedTimeEquals(ba, bb);
        }

        private static int ToInt(object? o) => o == null || o == DBNull.Value ? 0 : Convert.ToInt32(o);
    }
}
