// GateWay/Helpers/CryptoHelper.cs
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace GateWay.App
{
    public static class CryptoHelper
    { 
        private static readonly string FastKey = "QDYxOUA2MTlANjE5QA==";

    
        // Fast XOR Decryption
        public static string DecryptFast(string cipherText, string key = null)
        {
            if (string.IsNullOrEmpty(cipherText)) return cipherText;
            try
            {
                var keyBytes = Convert.FromBase64String(key ?? FastKey);
                var cipherBytes = Convert.FromBase64String(cipherText);
                var result = new byte[cipherBytes.Length];
                for (int i = 0; i < cipherBytes.Length; i++)
                    result[i] = (byte)(cipherBytes[i] ^ keyBytes[i % keyBytes.Length]);
                return Encoding.UTF8.GetString(result);
            }
            catch { return cipherText; }
        }
    }
}