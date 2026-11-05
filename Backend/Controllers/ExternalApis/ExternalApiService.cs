using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using GateWay.App;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

// =====================================================================================
//  ExternalApiService  -  Phase 9
//  - settings (enabled / encrypted key / last test) live in dbo.Sys_ExternalApis when that table exists,
//    otherwise in Backend/App_Data/external-apis.json (atomic write).
//  - API keys: AES-256-GCM with a key derived from config (ExternalApis:EncryptionKey, else Jwt:Key). Never returned.
//  - outbound calls: fixed catalog only, 10s timeout, 1 retry on 5xx/timeout, no redirects,
//    in-memory cache, per-API rate limit, Nominatim 1 req/sec throttle, sanitized errors.
// =====================================================================================
namespace ERP.Controllers.ExternalApis
{
    public class ApiSetting
    {
        public string Code { get; set; }
        public bool Enabled { get; set; }
        public string KeyEnc { get; set; }
        public DateTime? LastTestAt { get; set; }
        public bool? LastTestOk { get; set; }
        public int? LastTestMs { get; set; }
        public string LastTestMsg { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }
    }

    public class CallResult
    {
        public bool Ok { get; set; }
        public string Code { get; set; }          // OK | DISABLED | NO_KEY | BAD_REQUEST | RATE_LIMIT | UPSTREAM | TIMEOUT | UNKNOWN_API | UNKNOWN_OP
        public string Message { get; set; }
        public object Data { get; set; }
        public int Ms { get; set; }
        public bool Cached { get; set; }
    }

    public static class ExternalApiService
    {
        // ------------------------------------------------------------------ init
        static string _dataDir;
        static byte[] _aesKey;
        static readonly object _initLock = new object();

        public static void Configure(IConfiguration cfg, string contentRoot)
        {
            if (_aesKey != null) return;
            lock (_initLock)
            {
                if (_aesKey != null) return;
                _dataDir = Path.Combine(contentRoot ?? AppContext.BaseDirectory, "App_Data");
                var secret = cfg["ExternalApis:EncryptionKey"];
                if (string.IsNullOrWhiteSpace(secret)) secret = cfg["Jwt:Key"];
                if (string.IsNullOrWhiteSpace(secret)) secret = "ERP-ExternalApis-default";
                _aesKey = SHA256.HashData(Encoding.UTF8.GetBytes("ERP.ExternalApis.v1|" + secret));
            }
        }

        // ------------------------------------------------------------------ crypto
        public static string Encrypt(string plain)
        {
            var nonce = RandomNumberGenerator.GetBytes(12);
            var data = Encoding.UTF8.GetBytes(plain);
            var cipher = new byte[data.Length];
            var tag = new byte[16];
            using (var g = new AesGcm(_aesKey, 16)) g.Encrypt(nonce, data, cipher, tag);
            return Convert.ToBase64String(nonce.Concat(tag).Concat(cipher).ToArray());
        }

        public static string Decrypt(string enc)
        {
            if (string.IsNullOrEmpty(enc)) return null;
            try
            {
                var all = Convert.FromBase64String(enc);
                var nonce = all.Take(12).ToArray(); var tag = all.Skip(12).Take(16).ToArray(); var cipher = all.Skip(28).ToArray();
                var plain = new byte[cipher.Length];
                using (var g = new AesGcm(_aesKey, 16)) g.Decrypt(nonce, cipher, tag, plain);
                return Encoding.UTF8.GetString(plain);
            }
            catch { return null; }      // wrong key / corrupted -> treated as "no key"
        }

        public static string Mask(string key)
        {
            if (string.IsNullOrEmpty(key)) return null;
            return key.Length >= 12 ? "••••" + key.Substring(key.Length - 4) : "••••••••";
        }

        // ------------------------------------------------------------------ settings store
        static readonly SemaphoreSlim _storeLock = new SemaphoreSlim(1, 1);
        static DateTime _tableCheckedAt = DateTime.MinValue;
        static bool _tableExists;

        public static string StorageMode => _tableExists ? "database" : "json";
        static string JsonPath => Path.Combine(_dataDir, "external-apis.json");

        static async Task<bool> TableExists()
        {
            if ((DateTime.UtcNow - _tableCheckedAt).TotalSeconds < 30) return _tableExists;
            try
            {
                using var c = new SqlConnection(ConnectionString.connectionString);
                await c.OpenAsync();
                using var cmd = new SqlCommand("SELECT OBJECT_ID(N'dbo.Sys_ExternalApis', N'U')", c) { CommandTimeout = 10 };
                var v = await cmd.ExecuteScalarAsync();
                _tableExists = v != null && v != DBNull.Value;
            }
            catch { _tableExists = false; }
            _tableCheckedAt = DateTime.UtcNow;
            return _tableExists;
        }

        public static async Task<Dictionary<string, ApiSetting>> LoadSettings()
        {
            await _storeLock.WaitAsync();
            try
            {
                if (await TableExists())
                {
                    try
                    {
                        var res = new Dictionary<string, ApiSetting>(StringComparer.OrdinalIgnoreCase);
                        using var c = new SqlConnection(ConnectionString.connectionString);
                        await c.OpenAsync();
                        using var cmd = new SqlCommand("SELECT Code,IsEnabled,ApiKeyEnc,LastTestAt,LastTestOk,LastTestMs,LastTestMsg,UpdatedAt,UpdatedBy FROM dbo.Sys_ExternalApis", c) { CommandTimeout = 15 };
                        using var r = await cmd.ExecuteReaderAsync();
                        while (await r.ReadAsync())
                        {
                            var s = new ApiSetting
                            {
                                Code = r.GetString(0),
                                Enabled = !r.IsDBNull(1) && r.GetBoolean(1),
                                KeyEnc = r.IsDBNull(2) ? null : r.GetString(2),
                                LastTestAt = r.IsDBNull(3) ? (DateTime?)null : r.GetDateTime(3),
                                LastTestOk = r.IsDBNull(4) ? (bool?)null : r.GetBoolean(4),
                                LastTestMs = r.IsDBNull(5) ? (int?)null : r.GetInt32(5),
                                LastTestMsg = r.IsDBNull(6) ? null : r.GetString(6),
                                UpdatedAt = r.IsDBNull(7) ? (DateTime?)null : r.GetDateTime(7),
                                UpdatedBy = r.IsDBNull(8) ? (int?)null : r.GetInt32(8)
                            };
                            res[s.Code] = s;
                        }
                        return res;
                    }
                    catch { _tableExists = false; }
                }
                return ReadJson();
            }
            finally { _storeLock.Release(); }
        }

        static Dictionary<string, ApiSetting> ReadJson()
        {
            var res = new Dictionary<string, ApiSetting>(StringComparer.OrdinalIgnoreCase);
            try
            {
                if (File.Exists(JsonPath))
                {
                    var list = JsonConvert.DeserializeObject<List<ApiSetting>>(File.ReadAllText(JsonPath, Encoding.UTF8)) ?? new List<ApiSetting>();
                    foreach (var s in list) if (!string.IsNullOrEmpty(s.Code)) res[s.Code] = s;
                }
            }
            catch { /* corrupted file: start empty, next save rewrites it */ }
            return res;
        }

        /// Read-modify-write one setting under the store lock.
        public static async Task SaveSetting(string code, Action<ApiSetting> mutate)
        {
            await _storeLock.WaitAsync();
            try
            {
                if (await TableExists())
                {
                    try
                    {
                        ApiSetting cur = null;
                        using (var c = new SqlConnection(ConnectionString.connectionString))
                        {
                            await c.OpenAsync();
                            using (var cmd = new SqlCommand("SELECT Code,IsEnabled,ApiKeyEnc,LastTestAt,LastTestOk,LastTestMs,LastTestMsg,UpdatedAt,UpdatedBy FROM dbo.Sys_ExternalApis WHERE Code=@c", c))
                            {
                                cmd.Parameters.AddWithValue("@c", code);
                                using var r = await cmd.ExecuteReaderAsync();
                                if (await r.ReadAsync())
                                    cur = new ApiSetting
                                    {
                                        Code = code,
                                        Enabled = !r.IsDBNull(1) && r.GetBoolean(1),
                                        KeyEnc = r.IsDBNull(2) ? null : r.GetString(2),
                                        LastTestAt = r.IsDBNull(3) ? (DateTime?)null : r.GetDateTime(3),
                                        LastTestOk = r.IsDBNull(4) ? (bool?)null : r.GetBoolean(4),
                                        LastTestMs = r.IsDBNull(5) ? (int?)null : r.GetInt32(5),
                                        LastTestMsg = r.IsDBNull(6) ? null : r.GetString(6)
                                    };
                            }
                            cur ??= new ApiSetting { Code = code };
                            mutate(cur);
                            const string sql = @"MERGE dbo.Sys_ExternalApis AS t USING (SELECT @Code AS Code) s ON t.Code = s.Code
WHEN MATCHED THEN UPDATE SET IsEnabled=@En, ApiKeyEnc=@Key, LastTestAt=@TA, LastTestOk=@TO, LastTestMs=@TM, LastTestMsg=@TG, UpdatedAt=@UA, UpdatedBy=@UB
WHEN NOT MATCHED THEN INSERT (Code,IsEnabled,ApiKeyEnc,LastTestAt,LastTestOk,LastTestMs,LastTestMsg,UpdatedAt,UpdatedBy) VALUES (@Code,@En,@Key,@TA,@TO,@TM,@TG,@UA,@UB);";
                            using var up = new SqlCommand(sql, c) { CommandTimeout = 15 };
                            up.Parameters.AddWithValue("@Code", code);
                            up.Parameters.AddWithValue("@En", cur.Enabled);
                            up.Parameters.AddWithValue("@Key", (object)cur.KeyEnc ?? DBNull.Value);
                            up.Parameters.AddWithValue("@TA", (object)cur.LastTestAt ?? DBNull.Value);
                            up.Parameters.AddWithValue("@TO", (object)cur.LastTestOk ?? DBNull.Value);
                            up.Parameters.AddWithValue("@TM", (object)cur.LastTestMs ?? DBNull.Value);
                            up.Parameters.AddWithValue("@TG", (object)Trunc(cur.LastTestMsg, 400) ?? DBNull.Value);
                            up.Parameters.AddWithValue("@UA", (object)cur.UpdatedAt ?? DBNull.Value);
                            up.Parameters.AddWithValue("@UB", (object)cur.UpdatedBy ?? DBNull.Value);
                            await up.ExecuteNonQueryAsync();
                        }
                        return;
                    }
                    catch (SqlException) { _tableExists = false; _tableCheckedAt = DateTime.UtcNow; }
                }

                var all = ReadJson();
                if (!all.TryGetValue(code, out var s)) { s = new ApiSetting { Code = code }; all[code] = s; }
                mutate(s);
                Directory.CreateDirectory(_dataDir);
                var tmp = JsonPath + ".tmp";
                File.WriteAllText(tmp, JsonConvert.SerializeObject(all.Values.OrderBy(x => x.Code).ToList(), Formatting.Indented), new UTF8Encoding(false));
                if (File.Exists(JsonPath)) File.Replace(tmp, JsonPath, null); else File.Move(tmp, JsonPath);
            }
            finally { _storeLock.Release(); }
        }

        static string Trunc(string s, int n) => s == null ? null : (s.Length <= n ? s : s.Substring(0, n));

        // ------------------------------------------------------------------ http / cache / limits
        static readonly HttpClient Http = new HttpClient(new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli,
            ConnectTimeout = TimeSpan.FromSeconds(8)
        })
        { Timeout = TimeSpan.FromSeconds(10) };

        const int MaxBytes = 5 * 1024 * 1024;

        class CacheItem { public DateTime Exp; public object Data; }
        static readonly ConcurrentDictionary<string, CacheItem> Cache = new ConcurrentDictionary<string, CacheItem>();

        static readonly Dictionary<string, Queue<DateTime>> Hits = new Dictionary<string, Queue<DateTime>>();
        static bool RateAllowed(ApiDef api)
        {
            lock (Hits)
            {
                if (!Hits.TryGetValue(api.Code, out var q)) Hits[api.Code] = q = new Queue<DateTime>();
                var now = DateTime.UtcNow;
                while (q.Count > 0 && (now - q.Peek()).TotalSeconds > 60) q.Dequeue();
                if (q.Count >= api.RateLimitPerMin) return false;
                q.Enqueue(now);
                return true;
            }
        }

        static readonly SemaphoreSlim NominatimGate = new SemaphoreSlim(1, 1);
        static DateTime _lastNominatim = DateTime.MinValue;

        static async Task Throttle(ApiDef api, CancellationToken ct)
        {
            if (api.Code != "nominatim") return;
            await NominatimGate.WaitAsync(ct);
            try
            {
                var wait = 1100 - (int)(DateTime.UtcNow - _lastNominatim).TotalMilliseconds;
                if (wait > 0) await Task.Delay(wait, ct);
                _lastNominatim = DateTime.UtcNow;
            }
            finally { NominatimGate.Release(); }
        }

        static CallResult Fail(string code, string msg, int ms = 0) => new CallResult { Ok = false, Code = code, Message = msg, Ms = ms };

        // ------------------------------------------------------------------ main entry
        /// skipEnabled = true only for the admin "test" action.
        public static async Task<CallResult> Call(string apiCode, string opName, Dictionary<string, string> prm, bool skipEnabled = false)
        {
            var api = ExternalApiCatalog.Find(apiCode);
            if (api == null) return Fail("UNKNOWN_API", "Unknown API / خدمة غير معروفة");
            if (string.IsNullOrWhiteSpace(opName) || !api.Ops.TryGetValue(opName, out var op))
                return Fail("UNKNOWN_OP", "Operation not allowed / العملية غير مسموحة");

            var settings = await LoadSettings();
            settings.TryGetValue(api.Code, out var st);
            if (!skipEnabled && (st == null || !st.Enabled))
                return Fail("DISABLED", $"The service '{api.NameE}' is disabled. Ask an administrator to enable it from the External APIs screen. / الخدمة '{api.NameA}' غير مفعّلة، اطلب من المسؤول تفعيلها من شاشة الخدمات الخارجية.");

            string key = null;
            if (api.RequiresKey)
            {
                key = Decrypt(st?.KeyEnc);
                if (string.IsNullOrEmpty(key)) return Fail("NO_KEY", "This service needs an API key. / هذه الخدمة تحتاج مفتاح (API key).");
            }

            prm = prm == null ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) : new Dictionary<string, string>(prm, StringComparer.OrdinalIgnoreCase);
            var bad = ExternalApiCatalog.Validate(op, prm);
            if (bad != null) return Fail("BAD_REQUEST", bad);

            int cacheMin = op.CacheMinutes ?? api.CacheMinutes;
            string cacheKey = api.Code + "|" + op.Name + "|" + string.Join("&", prm.OrderBy(x => x.Key, StringComparer.Ordinal).Select(x => x.Key + "=" + x.Value));
            if (cacheMin > 0 && Cache.TryGetValue(cacheKey, out var hit) && hit.Exp > DateTime.UtcNow)
                return new CallResult { Ok = true, Code = "OK", Data = hit.Data, Cached = true };

            if (!RateAllowed(api)) return Fail("RATE_LIMIT", $"Too many requests for '{api.NameE}', try again in a minute. / طلبات كتيرة للخدمة، حاول بعد دقيقة.");

            var sw = Stopwatch.StartNew();
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
                await Throttle(api, cts.Token);
                var req = op.Build(prm, key);
                var (status, bytes, ctype) = await Fetch(req, cts.Token);
                if (status >= 400)
                    return Fail("UPSTREAM", status == 404 ? "Not found at the service / غير موجود في الخدمة" : (status == 401 || status == 403) ? "The service rejected the request (check the API key) / الخدمة رفضت الطلب (راجع المفتاح)" : status == 429 ? "The service is rate-limiting us / الخدمة بتحدّ من الطلبات" : $"The service returned HTTP {status} / الخدمة رجّعت خطأ {status}", (int)sw.ElapsedMilliseconds);

                object data;
                if (req.Binary)
                    data = new { contentType = string.IsNullOrEmpty(ctype) ? "image/png" : ctype.Split(';')[0].Trim(), base64 = Convert.ToBase64String(bytes) };
                else
                {
                    JToken j;
                    try { j = JToken.Parse(Encoding.UTF8.GetString(bytes)); }
                    catch { return Fail("UPSTREAM", "The service returned an unexpected response / رد غير متوقع من الخدمة", (int)sw.ElapsedMilliseconds); }
                    data = op.Shape != null ? op.Shape(j, prm) : j;
                    if (data is JToken jt) data = jt;
                }

                if (cacheMin > 0)
                {
                    if (Cache.Count > 500) foreach (var k in Cache.Where(x => x.Value.Exp < DateTime.UtcNow).Select(x => x.Key).ToList()) Cache.TryRemove(k, out _);
                    if (Cache.Count > 800) Cache.Clear();
                    Cache[cacheKey] = new CacheItem { Exp = DateTime.UtcNow.AddMinutes(cacheMin), Data = data };
                }
                return new CallResult { Ok = true, Code = "OK", Data = data, Ms = (int)sw.ElapsedMilliseconds };
            }
            catch (ExternalApiException ex) { return Fail("UPSTREAM", ex.Message, (int)sw.ElapsedMilliseconds); }
            catch (OperationCanceledException) { return Fail("TIMEOUT", "The service timed out / الخدمة تأخرت في الرد", (int)sw.ElapsedMilliseconds); }
            catch (HttpRequestException) { return Fail("UPSTREAM", "Could not reach the service / تعذر الوصول للخدمة", (int)sw.ElapsedMilliseconds); }
            catch (Exception) { return Fail("UPSTREAM", "Unexpected error while calling the service / خطأ غير متوقع", (int)sw.ElapsedMilliseconds); }
        }

        /// GET with a 10s timeout per attempt and ONE retry on 5xx / timeout / network error.
        static async Task<(int status, byte[] bytes, string ctype)> Fetch(UpstreamRequest r, CancellationToken ct)
        {
            for (int attempt = 0; ; attempt++)
            {
                try
                {
                    using var msg = new HttpRequestMessage(HttpMethod.Get, r.Url);
                    msg.Headers.TryAddWithoutValidation("User-Agent", r.UserAgent ?? ExternalApiCatalog.UserAgent);
                    msg.Headers.TryAddWithoutValidation("Accept", r.Binary ? "image/*" : "application/json");
                    foreach (var h in r.Headers) msg.Headers.TryAddWithoutValidation(h.Key, h.Value);
                    using var resp = await Http.SendAsync(msg, HttpCompletionOption.ResponseHeadersRead, ct);
                    int code = (int)resp.StatusCode;
                    if (code >= 500 && attempt == 0) { await Task.Delay(300, ct); continue; }
                    if (resp.Content.Headers.ContentLength > MaxBytes) throw new ExternalApiException("Response too large / الرد كبير جداً");
                    var bytes = await resp.Content.ReadAsByteArrayAsync(ct);
                    if (bytes.Length > MaxBytes) throw new ExternalApiException("Response too large / الرد كبير جداً");
                    return (code, bytes, resp.Content.Headers.ContentType?.ToString());
                }
                catch (Exception ex) when (attempt == 0 && !ct.IsCancellationRequested && !(ex is ExternalApiException) && (ex is HttpRequestException || ex is TaskCanceledException || ex is OperationCanceledException))
                {
                    await Task.Delay(300, ct);
                }
            }
        }

        public static void ClearCache() => Cache.Clear();
    }
}
