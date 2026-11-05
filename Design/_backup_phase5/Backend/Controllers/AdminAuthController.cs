using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using System.Net;
using GateWay.App;

namespace ERP.Controllers
{
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
            return Ok(JsonConvert.SerializeObject(new BaseResponse(model)));
        }
    }
}
