using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using GateWay.App;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;

// =====================================================================================
//  ExternalApisController  -  Phase 9 runtime  (api/ExternalApis/Use)
//  Screens side only: Use -> any logged-in user (JWT) - only for ENABLED APIs and allow-listed operations.
//  Enabling APIs and saving keys (Sys_ExternalApis) is done from ERP Studio (Integrations).
//  Expected failures (disabled, bad params, upstream error) come back as IsSuccess=true with
//  Response = { ok:false, code, message } so screens can degrade gracefully.
// =====================================================================================
namespace ERP.Controllers.ExternalApis
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]   // JWT is checked in the action
    public class ExternalApisController : ControllerBase
    {
        public ExternalApisController(IConfiguration cfg, IWebHostEnvironment env)
        {
            ExternalApiService.Configure(cfg, env.ContentRootPath);
        }

        public class CallRequest { public string Code { get; set; } public string Op { get; set; } public Dictionary<string, object> Params { get; set; } }

        private IActionResult Fail(string msg, HttpStatusCode code = HttpStatusCode.BadRequest) => Ok(JsonConvert.SerializeObject(new BaseResponse(code, msg)));
        private IActionResult Good(object data) => Ok(JsonConvert.SerializeObject(new BaseResponse(data)));

        private int CurrentUserId()
        {
            var v = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(v, out var id) ? id : 0;
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

        [HttpPost("Use")]
        public async Task<IActionResult> UseOp([FromBody] CallRequest req)
        {
            if (CurrentUserId() <= 0) return Fail("Unauthorized", HttpStatusCode.Unauthorized);
            if (req == null) return Fail("Bad request");
            return Good(Result(await ExternalApiService.Call(req.Code, req.Op, ToParams(req.Params))));
        }
    }
}
