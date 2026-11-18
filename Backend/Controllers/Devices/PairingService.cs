#nullable enable
using System;
using System.Threading.Tasks;
using ERP.Common;

namespace ERP.Devices
{
    public class PairResult
    {
        public bool Ok { get; set; }
        public string? Error { get; set; }
        public int DeviceId { get; set; }
        public string? DeviceToken { get; set; }
        public string? Name { get; set; }
        public int CompCode { get; set; }
        public int? BranchCode { get; set; }
    }

    // 4.5 / 4.6 / 7.3. Pairing rows are normally inserted by Studio; the runtime consumes them here.
    public class PairingService
    {
        // Create a pairing code for a device (also usable by a runtime admin screen). Returns the plain code (shown once).
        public async Task<string> CreateCodeAsync(int deviceId, string createdBy, int validMinutes = 10)
        {
            var code = PairingCrypto.GenerateCode();
            var hash = PairingCrypto.HashCode(code);
            await RuntimeDb.ExecuteAsync(
                "INSERT INTO dbo.Sys_DevicePairing (DeviceId, CodeHash, ExpiresAtUtc, CreatedBy) VALUES (@d, @h, DATEADD(MINUTE, @m, SYSUTCDATETIME()), @by)",
                ("@d", deviceId), ("@h", hash), ("@m", validMinutes), ("@by", createdBy));
            return code;
        }

        public async Task<PairResult> PairAsync(string code, string? machineName, string? agentVersion, string? osVersion)
        {
            var hash = PairingCrypto.HashCode(code ?? "");
            var row = await RuntimeDb.FirstAsync(
                "SELECT TOP 1 p.PairingId, p.DeviceId, p.ExpiresAtUtc, p.UsedAtUtc, d.Name, d.CompCode, d.BranchCode " +
                "FROM dbo.Sys_DevicePairing p JOIN dbo.Sys_Devices d ON d.DeviceId = p.DeviceId " +
                "WHERE p.CodeHash = @h ORDER BY p.PairingId DESC", ("@h", hash));
            if (row == null) return new PairResult { Ok = false, Error = "invalid_code" };
            if (row["UsedAtUtc"] != null) return new PairResult { Ok = false, Error = "invalid_code" };
            var exp = Convert.ToDateTime(row["ExpiresAtUtc"]);
            if (exp < DateTime.UtcNow) return new PairResult { Ok = false, Error = "invalid_code" };

            int deviceId = RuntimeDb.I(row["DeviceId"]);
            long pairingId = Convert.ToInt64(row["PairingId"]);

            var secret = PairingCrypto.GenerateSecret();
            var tokenHash = PairingCrypto.HashSecret(secret);

            // mark used + set token (re-pair replaces the token)
            await RuntimeDb.ExecuteAsync("UPDATE dbo.Sys_DevicePairing SET UsedAtUtc = SYSUTCDATETIME() WHERE PairingId=@p", ("@p", pairingId));
            await RuntimeDb.ExecuteAsync(
                "UPDATE dbo.Sys_Devices SET TokenHash=@th, PairedAtUtc=SYSUTCDATETIME(), RevokedAtUtc=NULL, IsActive=1, MachineName=@m, AgentVersion=@v WHERE DeviceId=@id",
                ("@th", tokenHash), ("@m", machineName), ("@v", agentVersion), ("@id", deviceId));

            await RuntimeDb.ExecuteAsync(
                "INSERT INTO dbo.Sys_AuditLog (Source, Action, TableName, RecordKey, ChangesJson) VALUES ('device','PAIR','Sys_Devices',@k,@c)",
                ("@k", deviceId.ToString()), ("@c", "{\"machineName\":" + Newtonsoft.Json.JsonConvert.ToString(machineName ?? "") + "}"));

            return new PairResult
            {
                Ok = true,
                DeviceId = deviceId,
                DeviceToken = PairingCrypto.BuildToken(deviceId, secret),
                Name = RuntimeDb.S(row["Name"]),
                CompCode = RuntimeDb.I(row["CompCode"]),
                BranchCode = RuntimeDb.NI(row["BranchCode"])
            };
        }
    }
}
