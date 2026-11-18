using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using GateWay.App;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;

// =====================================================================================
//  ExternalApisController  -  Phase 9  (api/ExternalApis/*)
//  Admin side  : List / Toggle / SetKey / Test / Call   -> admin role (Sys_Role.IsAdmin=1) OR module Sys_ExternalApisAdmin
//                (so it works BEFORE the module is registered by Database/Phase9_ExternalApis.sql)
//  Screens side: Use  -> any logged-in user (JWT) - only for ENABLED APIs and allow-listed operations.
//  Every response is the usual BaseResponse. Expected failures of Call/Use (disabled, bad params, upstream error)
//  come back as IsSuccess=true with Response = { ok:false, code, message } so screens can degrade gracefully.
// =====================================================================================
namespace ERP.Controllers.ExternalApis
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]   // auth is checked per action: JWT (Guard / Use) or X-Admin-Token (admin portal)
    public class ExternalApisController : ControllerBase
    {
        private const string ModuleCode = "Sys_ExternalApisAdmin";

        public ExternalApisController(IConfiguration cfg, IWebHostEnvironment env)
        {
            ExternalApiService.Configure(cfg, env.ContentRootPath);
        }

        public class CodeRequest { public string Code { get; set; } }
        public class ToggleRequest { public string Code { get; set; } public bool Enabled { get; set; } }
        public class SetKeyRequest { public string Code { get; set; } public string Key { get; set; } }
        public class CallRequest { public string Code { get; set; } public string Op { get; set; } public Dictionary<string, object> Params { get; set; } }

        // ------------------------------------------------------------------ helpers
        private IActionResult Fail(string msg, HttpStatusCode code = HttpStatusCode.BadRequest) => Ok(JsonConvert.SerializeObject(new BaseResponse(code, msg)));
        private IActionResult Good(object data) => Ok(JsonConvert.SerializeObject(new BaseResponse(data)));

        private int CurrentUserId()
        {
            var v = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(v, out var id) ? id : 0;
        }

        private static bool B(object v) => v != null && v != DBNull.Value && (v is bool b ? b : Convert.ToInt32(v) != 0);

        /// 0 = no access, 1 = read (EXECUTE), 2 = write. Admin roles always get 2.
        private static async Task<int> AccessLevel(int userId)
        {
            if (userId <= 0) return 0;
            using var c = new SqlConnection(ConnectionString.connectionString);
            await c.OpenAsync();

            async Task<object> Scalar(string sql, params SqlParameter[] ps)
            {
                using var cmd = new SqlCommand(sql, c) { CommandTimeout = 30 };
                cmd.Parameters.AddRange(ps);
                var v = await cmd.ExecuteScalarAsync();
                return v == DBNull.Value ? null : v;
            }

            // 1) admin role (works even if the module is not registered yet)
            if (await Scalar("SELECT COL_LENGTH('dbo.Sys_Role','IsAdmin')") != null)
            {
                var admin = await Scalar(@"SELECT TOP 1 1 FROM Sys_RoleUsers ru JOIN Sys_Role r ON r.RoleId = ru.RoleId
                                           WHERE ru.UserID=@u AND ru.ISActive=1 AND ISNULL(r.IsAdmin,0)=1", new SqlParameter("@u", userId));
                if (admin != null) return 2;
            }

            // 2) normal module permission (same logic as AdminUsersController)
            var avail = await Scalar("SELECT ISNULL(AVAILABLE,1) FROM Sys_Modules WHERE MODULE_CODE=@m", new SqlParameter("@m", ModuleCode));
            if (avail == null || Convert.ToInt32(avail) != 1) return 0;

            var level = 0;
            async Task Collect(string sql)
            {
                using var cmd = new SqlCommand(sql, c) { CommandTimeout = 30 };
                cmd.Parameters.AddWithValue("@u", userId);
                cmd.Parameters.AddWithValue("@m", ModuleCode);
                using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    if (B(r[0])) level = Math.Max(level, (B(r[1]) || B(r[2])) ? 2 : 1);
            }
            await Collect("SELECT [EXECUTE],[CREATE],[EDIT] FROM Sys_UserModule WHERE UserID=@u AND MODULE_CODE=@m");
            if (level == 0)
                await Collect(@"SELECT rm.[EXECUTE], rm.[CREATE], rm.[EDIT] FROM Sys_RoleModule rm
                                WHERE rm.MODULE_CODE=@m AND rm.RoleId IN (SELECT RoleId FROM Sys_RoleUsers WHERE UserID=@u AND ISActive=1)");
            return level;
        }

        /// Admin portal caller: valid X-Admin-Token (in-memory store of AdminAuthController) = super admin.
        private bool IsAdminToken() => AdminTokenStore.IsValid(Request.Headers["X-Admin-Token"].ToString());

        private async Task<IActionResult> Guard(int need)
        {
            try
            {
                if (IsAdminToken()) return null;
                if (CurrentUserId() <= 0) return Fail("Login required / سجّل الدخول أولاً", HttpStatusCode.Unauthorized);
                if (await AccessLevel(CurrentUserId()) >= need) return null;
                return Fail("You do not have permission for this operation / ليس لديك صلاحية لهذه العملية", HttpStatusCode.Forbidden);
            }
            catch (Exception) { return Fail("Could not verify permissions / تعذر التحقق من الصلاحيات", HttpStatusCode.InternalServerError); }
        }

        private static Dictionary<string, string> ToParams(Dictionary<string, object> src)
        {
            var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (src == null) return d;
            foreach (var kv in src)
            {
                if (kv.Value == null) continue;
                string s;
                if (kv.Value is System.Text.Json.JsonElement je)
                    s = je.ValueKind == System.Text.Json.JsonValueKind.String ? je.GetString()
                      : je.ValueKind == System.Text.Json.JsonValueKind.Number ? je.GetRawText()
                      : je.ValueKind == System.Text.Json.JsonValueKind.True ? "true"
                      : je.ValueKind == System.Text.Json.JsonValueKind.False ? "false" : null;
                else s = Convert.ToString(kv.Value, System.Globalization.CultureInfo.InvariantCulture);
                if (s != null) d[kv.Key] = s;
            }
            return d;
        }

        private static object Result(CallResult r) => new { ok = r.Ok, code = r.Code, message = r.Message, data = r.Data, ms = r.Ms, cached = r.Cached };

        // ------------------------------------------------------------------ admin: list
        [HttpPost("List")]
        public async Task<IActionResult> List()
        {
            var denied = await Guard(1); if (denied != null) return denied;
            var level = IsAdminToken() ? 2 : await AccessLevel(CurrentUserId());
            var set = await ExternalApiService.LoadSettings();
            var apis = ExternalApiCatalog.All.Select(a =>
            {
                set.TryGetValue(a.Code, out var s);
                var key = ExternalApiService.Decrypt(s?.KeyEnc);
                return new
                {
                    code = a.Code, nameA = a.NameA, nameE = a.NameE, category = a.Category, icon = a.Icon, descA = a.DescA, descE = a.DescE,
                    noteA = a.NoteA, noteE = a.NoteE, docsUrl = a.DocsUrl, authType = a.AuthType, requiresKey = a.RequiresKey, priority = a.Priority,
                    rateLimitPerMin = a.RateLimitPerMin, cacheMinutes = a.CacheMinutes,
                    ops = a.Ops.Values.Select(o => new { name = o.Name, descE = o.DescE, descA = o.DescA, @params = o.Params.Select(p => new { name = p.Name, type = p.Type.ToString(), required = p.Required }) }),
                    enabled = s != null && s.Enabled,
                    hasKey = !string.IsNullOrEmpty(key),
                    keyMasked = ExternalApiService.Mask(key),
                    lastTestAt = s?.LastTestAt, lastTestOk = s?.LastTestOk, lastTestMs = s?.LastTestMs, lastTestMsg = s?.LastTestMsg
                };
            }).ToList();
            return Good(new { apis, canWrite = level >= 2, storage = ExternalApiService.StorageMode });
        }

        // ------------------------------------------------------------------ admin: toggle / key / test
        [HttpPost("Toggle")]
        public async Task<IActionResult> Toggle([FromBody] ToggleRequest req)
        {
            var denied = await Guard(2); if (denied != null) return denied;
            var api = req == null ? null : ExternalApiCatalog.Find(req.Code);
            if (api == null) return Fail("Unknown API / خدمة غير معروفة");
            try
            {
                if (req.Enabled && api.RequiresKey)
                {
                    var set = await ExternalApiService.LoadSettings();
                    set.TryGetValue(api.Code, out var cur);
                    if (string.IsNullOrEmpty(ExternalApiService.Decrypt(cur?.KeyEnc)))
                        return Fail("Save the API key first / احفظ المفتاح (API key) الأول");
                }
                int uid = CurrentUserId();
                await ExternalApiService.SaveSetting(api.Code, s => { s.Enabled = req.Enabled; s.UpdatedAt = DateTime.UtcNow; s.UpdatedBy = uid; });
                return Good(new { code = api.Code, enabled = req.Enabled });
            }
            catch (Exception) { return Fail("Could not save the setting / تعذر حفظ الإعداد", HttpStatusCode.InternalServerError); }
        }

        [HttpPost("SetKey")]
        public async Task<IActionResult> SetKey([FromBody] SetKeyRequest req)
        {
            var denied = await Guard(2); if (denied != null) return denied;
            var api = req == null ? null : ExternalApiCatalog.Find(req.Code);
            if (api == null) return Fail("Unknown API / خدمة غير معروفة");
            if (!api.RequiresKey) return Fail("This service does not use a key / الخدمة دي مش محتاجة مفتاح");
            var key = (req.Key ?? "").Trim();
            if (key.Length > 200 || key.Any(ch => char.IsControl(ch) || char.IsWhiteSpace(ch))) return Fail("Invalid key format / شكل المفتاح غير صالح");
            try
            {
                int uid = CurrentUserId();
                await ExternalApiService.SaveSetting(api.Code, s =>
                {
                    s.KeyEnc = key.Length == 0 ? null : ExternalApiService.Encrypt(key);
                    if (key.Length == 0) s.Enabled = false;          // removing the key also disables the API
                    s.UpdatedAt = DateTime.UtcNow; s.UpdatedBy = uid;
                });
                ExternalApiService.ClearCache();
                return Good(new { code = api.Code, hasKey = key.Length > 0, keyMasked = ExternalApiService.Mask(key) });
            }
            catch (Exception) { return Fail("Could not save the key / تعذر حفظ المفتاح", HttpStatusCode.InternalServerError); }
        }

        [HttpPost("Test")]
        public async Task<IActionResult> Test([FromBody] CodeRequest req)
        {
            var denied = await Guard(2); if (denied != null) return denied;
            var api = req == null ? null : ExternalApiCatalog.Find(req.Code);
            if (api == null) return Fail("Unknown API / خدمة غير معروفة");
            ExternalApiService.ClearCache();                        // a test must really hit the service
            var r = await ExternalApiService.Call(api.Code, api.TestOp, new Dictionary<string, string>(api.TestParams), skipEnabled: true);
            var msg = r.Ok ? "OK" : r.Message;
            try
            {
                await ExternalApiService.SaveSetting(api.Code, s => { s.LastTestAt = DateTime.UtcNow; s.LastTestOk = r.Ok; s.LastTestMs = r.Ms; s.LastTestMsg = msg; });
            }
            catch (Exception) { /* result is still returned */ }
            return Good(new { code = api.Code, ok = r.Ok, ms = r.Ms, message = msg, lastTestAt = DateTime.UtcNow });
        }

        // ------------------------------------------------------------------ admin: call (try any op from the screen) / users: use
        [HttpPost("Call")]
        public async Task<IActionResult> CallOp([FromBody] CallRequest req)
        {
            var denied = await Guard(1); if (denied != null) return denied;
            if (req == null) return Fail("Bad request");
            return Good(Result(await ExternalApiService.Call(req.Code, req.Op, ToParams(req.Params))));
        }

        [HttpPost("Use")]
        public async Task<IActionResult> UseOp([FromBody] CallRequest req)
        {
            if (CurrentUserId() <= 0) return Fail("Unauthorized", HttpStatusCode.Unauthorized);
            if (req == null) return Fail("Bad request");
            return Good(Result(await ExternalApiService.Call(req.Code, req.Op, ToParams(req.Params))));
        }
    }
}
