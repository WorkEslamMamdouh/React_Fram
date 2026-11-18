#nullable enable
using System;
using System.Security.Cryptography;
using System.Text;

namespace ERP.Devices
{
    // Shared contract 4.5 (pairing code) + 4.6 (device token). Pure, testable; must match the Studio side.
    public static class PairingCrypto
    {
        // Crockford base32
        private const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

        // 8 chars (~40 bits), shown as XXXX-XXXX.
        public static string GenerateCode()
        {
            var bytes = RandomNumberGenerator.GetBytes(8);
            var sb = new StringBuilder(9);
            for (int i = 0; i < 8; i++)
            {
                if (i == 4) sb.Append('-');
                sb.Append(Alphabet[bytes[i] % 32]);
            }
            return sb.ToString();
        }

        // Normalise both sides: upper-case, remove '-'/spaces, O->0, I->1, L->1.
        public static string Normalize(string code)
        {
            if (string.IsNullOrEmpty(code)) return "";
            var sb = new StringBuilder(code.Length);
            foreach (var ch0 in code.ToUpperInvariant())
            {
                if (ch0 == '-' || ch0 == ' ') continue;
                char ch = ch0;
                if (ch == 'O') ch = '0';
                else if (ch == 'I' || ch == 'L') ch = '1';
                sb.Append(ch);
            }
            return sb.ToString();
        }

        // CodeHash = lower-hex( SHA-256( UTF-8( "pair:v1:" + normalized ) ) )
        public static string HashCode(string code)
        {
            var norm = Normalize(code);
            return Sha256Hex("pair:v1:" + norm);
        }

        // Device token secret: 32 random bytes, base64url no padding (43 chars).
        public static string GenerateSecret()
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        public static string BuildToken(int deviceId, string secret) => $"d1.{deviceId}.{secret}";

        // Returns (deviceId, secret) or null if malformed.
        public static (int deviceId, string secret)? ParseToken(string? token)
        {
            if (string.IsNullOrEmpty(token)) return null;
            var parts = token.Split('.');
            if (parts.Length != 3 || parts[0] != "d1") return null;
            if (!int.TryParse(parts[1], out var id)) return null;
            if (string.IsNullOrEmpty(parts[2])) return null;
            return (id, parts[2]);
        }

        // TokenHash = lower-hex(SHA-256(UTF-8(secret)))
        public static string HashSecret(string secret) => Sha256Hex(secret);

        public static bool FixedTimeEqualsHex(string a, string b)
        {
            if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b) || a.Length != b.Length) return false;
            return CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(a.ToLowerInvariant()),
                Encoding.ASCII.GetBytes(b.ToLowerInvariant()));
        }

        private static string Sha256Hex(string s)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(s));
            var sb = new StringBuilder(hash.Length * 2);
            foreach (var b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }
    }
}
