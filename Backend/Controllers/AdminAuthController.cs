using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using System.Net;
using GateWay.App;

namespace ERP.Controllers
{
    // Phase 5: tokens issued by admin login (kept in memory) so ScreenBuilder endpoints can verify them
    public static class AdminTokenStore
    {
        public static readonly System.Collections.Concurrent.ConcurrentDictionary<string, System.DateTime> Issued = new();
        public static bool IsValid(string token) => !string.IsNullOrWhiteSpace(token) && Issued.TryGetValue(token, out var t) && (System.DateTime.UtcNow - t).TotalHours < 24;
    }

    [ApiController]
    [Route("api/admin")]
    public class AdminAuthController : ControllerBase
    {
        private readonly IConfiguration _cfg;

        public AdminAuthController(IConfiguration cfg)
        {
            _cfg = cfg;
        }

        public class AdminLoginDto
        {
            public string User { get; set; }
            public string Pass { get; set; }
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] AdminLoginDto dto)
        {
            var u = _cfg["Admin:User"];
            var p = _cfg["Admin:Pass"];

            if (dto == null || dto.User != u || dto.Pass != p)
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, "Invalid admin credentials")));

            var model = new { Token = "admin-" + System.Guid.NewGuid().ToString("N") };
            AdminTokenStore.Issued[model.Token] = System.DateTime.UtcNow;
            return Ok(JsonConvert.SerializeObject(new BaseResponse(model)));
        }
    }
}
