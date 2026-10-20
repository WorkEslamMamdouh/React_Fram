
using Microsoft.AspNetCore.Mvc; 
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Linq;
using System;
using Newtonsoft.Json;
using GateWay.App;
using System.Net;
using System.Threading.Tasks;
using static GateWay.App.SQLServer;
using Newtonsoft.Json.Linq;



namespace ERP.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly JwtService _jwt;
        private readonly SQLServer db;

        public AuthController(SQLServer d, JwtService jwt)
        {
            db = d;
            _jwt = jwt;
        }

        [HttpGet("login")]
        public async Task<IActionResult> Login(string Username  , string Password)
        {


            var user = await db.Select("Sys_Users", " USER_CODE = N'" + Username + "' and USER_PASSWORD = N'" + Password + "'").FirstOrDefaultAsync() ;
          
            if (user == null)   return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.BadRequest, "Unauthorized"))); 
               
            var _token = _jwt.GenerateToken_obj(user);

            var updateObj = new
            {
                UserID = user["UserID"],
                Token = _token
            };

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

            //var Res = await db.Insert("Sys_Log_User", InsertObj);

            return Ok(JsonConvert.SerializeObject(new BaseResponse(Model)));
             
        }
         
    }
}
