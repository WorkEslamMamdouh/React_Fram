
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System;
using Newtonsoft.Json;
using GateWay.App;
using System.Net;
using System.Threading.Tasks;
using ERP.Auth;

namespace ERP.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly JwtService _jwt;
        private readonly SQLServer db;
        private readonly PasswordService _pw;
        private readonly IConfiguration _cfg;

        public AuthController(SQLServer d, JwtService jwt, PasswordService pw, IConfiguration cfg)
        {
            db = d;
            _jwt = jwt;
            _pw = pw;
            _cfg = cfg;
        }

        private string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();

        // W0-1: legacy GET login kept behind Auth:AllowLegacyGetLogin (query strings land in IIS logs).
        [HttpGet("login")]
        public async Task<IActionResult> LoginGet(string Username, string Password)
        {
            if (!_pw.Options.AllowLegacyGetLogin)
                return NotFound();
            return await DoLogin(Username, Password);
        }

        // W0-1: preferred POST login (body). Response model unchanged.
        [HttpPost("login")]
        [EnableRateLimiting("login")]
        public async Task<IActionResult> LoginPost([FromBody] LoginRequest request)
        {
            if (request == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, "Unauthorized")));
            return await DoLogin(request.Username, request.Password);
        }

        private async Task<IActionResult> DoLogin(string username, string password)
        {
            var outcome = await _pw.LoginAsync(username, password, ClientIp);
            if (!outcome.Success || outcome.User == null)
                return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, "Unauthorized")));

            var user = outcome.User;
            var _token = _jwt.GenerateToken_obj(user);

            var updateObj = new { UserID = user["UserID"], Token = _token };
            await db.Update("Sys_Users", "UserID", updateObj);

            var Sys_Company = await db.Select("IQ_Sys_RoleUsersComp", " UserID = " + user["UserID"] + " ").ToListAsync();
            var Sys_Branch = await db.Select("IQ_Sys_RoleUsersBranch", " UserID = " + user["UserID"] + " ").ToListAsync();
            var Sys_ControlYear = await db.Select("IQ_Sys_ControlYear", " UserID = " + user["UserID"] + " ").ToListAsync();

            var Model = new
            {
                Token = _token,
                Sys_Company = Sys_Company,
                Sys_Branch = Sys_Branch,
                Sys_ControlYear = Sys_ControlYear
            };
            return Ok(JsonConvert.SerializeObject(new BaseResponse(Model)));
        }

        // W0-3: sliding refresh for an open tab. Requires a still-valid JWT.
        [HttpPost("refresh")]
        [Authorize]
        public async Task<IActionResult> Refresh()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userCode = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            var token = _jwt.GenerateTokenForClaims(userId, userCode ?? "");
            if (int.TryParse(userId, out var uid))
                await db.Update("Sys_Users", "UserID", new { UserID = uid, Token = token });
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { Token = token })));
        }

        // W0-1: change password (JWT).
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userId, out var uid)) return Unauthorized();
            if (request == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, "Invalid request")));
            var (ok, err) = await _pw.ChangePasswordAsync(uid, request.OldPassword, request.NewPassword, ClientIp);
            if (!ok) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, err ?? "Failed")));
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { ok = true })));
        }
    }
}
