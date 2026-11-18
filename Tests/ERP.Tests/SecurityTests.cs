using System;
using System.Collections.Generic;
using ERP.Devices;
using GateWay.Security;
using Microsoft.AspNetCore.Identity;
using Xunit;

namespace ERP.Tests
{
    public class PairingCryptoTests
    {
        [Fact]
        public void Normalize_StripsAndMaps()
        {
            Assert.Equal("7KQ2M9XD", PairingCrypto.Normalize("7KQ2-M9XD"));
            Assert.Equal("10100", PairingCrypto.Normalize("iO-lOO")); // I->1,O->0,L->1,O->0,O->0
        }

        [Fact]
        public void HashCode_StableAndCaseInsensitive()
        {
            var a = PairingCrypto.HashCode("7KQ2-M9XD");
            var b = PairingCrypto.HashCode("7kq2m9xd");
            Assert.Equal(a, b);                       // normalisation makes them equal
            Assert.Equal(64, a.Length);               // lower-hex SHA-256
            Assert.Equal(a.ToLowerInvariant(), a);
        }

        [Fact]
        public void Token_RoundTrips()
        {
            var secret = PairingCrypto.GenerateSecret();
            Assert.Equal(43, secret.Length);          // 32 bytes base64url no padding
            var token = PairingCrypto.BuildToken(12, secret);
            Assert.Equal("d1.12." + secret, token);
            var parsed = PairingCrypto.ParseToken(token);
            Assert.NotNull(parsed);
            Assert.Equal(12, parsed!.Value.deviceId);
            Assert.Equal(secret, parsed.Value.secret);
            var h1 = PairingCrypto.HashSecret(secret);
            Assert.True(PairingCrypto.FixedTimeEqualsHex(h1, PairingCrypto.HashSecret(secret)));
        }

        [Fact]
        public void GenerateCode_Formatted()
        {
            var c = PairingCrypto.GenerateCode();
            Assert.Equal(9, c.Length);
            Assert.Equal('-', c[4]);
        }
    }

    public class SensitiveDataGuardTests
    {
        private readonly SensitiveDataGuard _g = new();

        [Fact]
        public void Redact_DropsPasswordAndToken()
        {
            var rows = new List<Dictionary<string, object>>
            {
                new() { ["UserID"] = 1, ["USER_CODE"] = "admin", ["USER_PASSWORD"] = "x", ["Token"] = "t", ["USER_PasswordHash"] = "h" }
            };
            _g.Redact("Sys_Users", rows);
            Assert.True(rows[0].ContainsKey("USER_CODE"));
            Assert.False(rows[0].ContainsKey("USER_PASSWORD"));
            Assert.False(rows[0].ContainsKey("Token"));
            Assert.False(rows[0].ContainsKey("USER_PasswordHash"));
        }

        [Fact]
        public void Redact_SysDevices_DropsSecrets()
        {
            var rows = new List<Dictionary<string, object>> { new() { ["DeviceId"] = 1, ["TokenHash"] = "h", ["SecretsEnc"] = "s" } };
            _g.Redact("[dbo].[Sys_Devices]", rows);
            Assert.False(rows[0].ContainsKey("TokenHash"));
            Assert.False(rows[0].ContainsKey("SecretsEnc"));
        }

        [Fact]
        public void CheckWrite_BlocksDedicatedTables()
        {
            Assert.Throws<InvalidOperationException>(() => _g.CheckWrite("Sys_PrintJobs"));
            Assert.Throws<InvalidOperationException>(() => _g.CheckWrite("dbo.Sys_Devices"));
            Assert.Throws<InvalidOperationException>(() => _g.CheckWrite("Att_RawPunch"));
        }

        [Fact]
        public void CheckWrite_RejectsSysUsersSensitiveColumns()
        {
            Assert.Throws<InvalidOperationException>(() => _g.CheckWrite("Sys_Users", new[] { "USER_CODE", "Token" }));
            // normal columns are fine
            _g.CheckWrite("Sys_Users", new[] { "USER_CODE", "USER_NAME" });
        }

        [Fact]
        public void CheckWrite_AllowsOrdinaryTable()
        {
            _g.CheckWrite("CashTypes");
            _g.CheckWrite("I_TR_Sales", new[] { "DocNo", "NetAmount" });
        }
    }

    public class PasswordHasherFormatTests
    {
        [Fact]
        public void HashVerify_RoundTrip()
        {
            var h = new PasswordHasher<object>();
            var hash = h.HashPassword(null!, "p@ss123");
            Assert.NotEqual("p@ss123", hash);
            Assert.Equal(PasswordVerificationResult.Success, h.VerifyHashedPassword(null!, hash, "p@ss123"));
            Assert.Equal(PasswordVerificationResult.Failed, h.VerifyHashedPassword(null!, hash, "wrong"));
        }
    }
}
