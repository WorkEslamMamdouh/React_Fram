#nullable enable
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ERP.Common;

namespace ERP.Devices
{
    // Scheme "Device" (4.6). Bearer d1.{id}.{secret} or ?access_token=. Valid tokens cached 30 s.
    public class DeviceAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SchemeName = "Device";
        private readonly IMemoryCache _cache;

        public DeviceAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger, UrlEncoder encoder, IMemoryCache cache)
            : base(options, logger, encoder)
        {
            _cache = cache;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            string? token = null;
            if (Request.Headers.TryGetValue("Authorization", out var auth))
            {
                var v = auth.ToString();
                if (v.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) token = v.Substring(7).Trim();
            }
            if (string.IsNullOrEmpty(token) && Request.Query.TryGetValue("access_token", out var qt))
                token = qt.ToString();

            if (string.IsNullOrEmpty(token)) return AuthenticateResult.NoResult();

            var parsed = PairingCrypto.ParseToken(token);
            if (parsed == null) return AuthenticateResult.Fail("bad token");
            var (deviceId, secret) = parsed.Value;

            var cacheKey = $"devtok:{deviceId}";
            ClaimsPrincipal? principal = null;
            if (_cache.TryGetValue(cacheKey, out DeviceClaims? cached) && cached != null
                && PairingCrypto.FixedTimeEqualsHex(cached.TokenHash, PairingCrypto.HashSecret(secret)))
            {
                principal = Build(cached);
            }
            else
            {
                var row = await RuntimeDb.FirstAsync(
                    "SELECT DeviceId, TokenHash, CompCode, BranchCode, DeviceKind FROM dbo.Sys_Devices " +
                    "WHERE DeviceId=@id AND IsActive=1 AND TokenHash IS NOT NULL AND RevokedAtUtc IS NULL",
                    ("@id", deviceId));
                if (row == null) return AuthenticateResult.Fail("unknown or revoked device");
                var hash = RuntimeDb.S(row["TokenHash"]) ?? "";
                if (!PairingCrypto.FixedTimeEqualsHex(hash, PairingCrypto.HashSecret(secret)))
                    return AuthenticateResult.Fail("bad secret");
                var dc = new DeviceClaims
                {
                    DeviceId = deviceId,
                    TokenHash = hash,
                    Comp = RuntimeDb.I(row["CompCode"]),
                    Branch = RuntimeDb.NI(row["BranchCode"]),
                    Kind = RuntimeDb.S(row["DeviceKind"]) ?? ""
                };
                _cache.Set(cacheKey, dc, TimeSpan.FromSeconds(30));
                principal = Build(dc);
            }

            var ticket = new AuthenticationTicket(principal!, SchemeName);
            return AuthenticateResult.Success(ticket);
        }

        private static ClaimsPrincipal Build(DeviceClaims dc)
        {
            var claims = new List<Claim>
            {
                new("device_id", dc.DeviceId.ToString()),
                new("comp", dc.Comp.ToString()),
                new("branch", (dc.Branch ?? 0).ToString()),
                new("kind", dc.Kind)
            };
            return new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        }

        private class DeviceClaims
        {
            public int DeviceId { get; set; }
            public string TokenHash { get; set; } = "";
            public int Comp { get; set; }
            public int? Branch { get; set; }
            public string Kind { get; set; } = "";
        }
    }
}
