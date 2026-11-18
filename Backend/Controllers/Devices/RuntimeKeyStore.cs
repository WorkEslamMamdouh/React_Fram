#nullable enable
using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using ERP.Common;

namespace ERP.Devices
{
    // 4.7: RSA-3072 key pair. Public PEM in Sys_RuntimeKeys; private PEM on disk under App_Data/keys.
    // NOTE: private key is stored as PEM (file-ACL protected). DPAPI LocalMachine wrapping is a hardening TODO
    // (needs the System.Security.Cryptography.ProtectedData package) and is noted in the runtime README.
    public class RuntimeKeyStore
    {
        private static readonly SemaphoreSlim _lock = new(1, 1);
        private readonly string _dir;

        public RuntimeKeyStore()
        {
            _dir = Path.Combine(AppContext.BaseDirectory, "App_Data", "keys");
            Directory.CreateDirectory(_dir);
        }

        public async Task EnsureActiveKeyAsync()
        {
            var active = await RuntimeDb.FirstAsync("SELECT TOP 1 Kid FROM dbo.Sys_RuntimeKeys WHERE IsActive=1");
            if (active != null) return;
            await _lock.WaitAsync();
            try
            {
                active = await RuntimeDb.FirstAsync("SELECT TOP 1 Kid FROM dbo.Sys_RuntimeKeys WHERE IsActive=1");
                if (active != null) return;
                using var rsa = RSA.Create(3072);
                var kid = "k" + DateTime.UtcNow.ToString("yyyyMMddHHmmss");
                var pub = rsa.ExportSubjectPublicKeyInfoPem();
                var priv = rsa.ExportPkcs8PrivateKeyPem();
                await File.WriteAllTextAsync(Path.Combine(_dir, kid + ".key"), priv);
                await RuntimeDb.ExecuteAsync(
                    "INSERT INTO dbo.Sys_RuntimeKeys (Kid, Algorithm, PublicKeyPem, IsActive) VALUES (@k, 'RSA-OAEP-256', @p, 1)",
                    ("@k", kid), ("@p", pub));
            }
            finally { _lock.Release(); }
        }

        // secretsEnc = "rsa1:{Kid}:{base64(RSA-OAEP-SHA256(json))}" -> plaintext json, or null on failure.
        public string? Decrypt(string? secretsEnc)
        {
            if (string.IsNullOrEmpty(secretsEnc) || !secretsEnc.StartsWith("rsa1:")) return null;
            var parts = secretsEnc.Split(':', 3);
            if (parts.Length != 3) return null;
            var kid = parts[1];
            var keyPath = Path.Combine(_dir, kid + ".key");
            if (!File.Exists(keyPath)) return null;
            try
            {
                using var rsa = RSA.Create();
                rsa.ImportFromPem(File.ReadAllText(keyPath));
                var data = Convert.FromBase64String(parts[2]);
                var plain = rsa.Decrypt(data, RSAEncryptionPadding.OaepSHA256);
                return System.Text.Encoding.UTF8.GetString(plain);
            }
            catch { return null; }
        }
    }
}
