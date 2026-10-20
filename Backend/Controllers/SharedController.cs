
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
using Microsoft.AspNetCore.Builder.Extensions;
using FirebaseAdmin.Messaging;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using System.IO;



namespace ERP.Controllers
{
    [ApiController]
    [Route("api/Shared")]
    public class SharedController : ControllerBase
    {
        private readonly SQLServer db;

        public SharedController(SQLServer d, JwtService jwt)
        {
            db = d;
        }

        private static bool firebaseInitialized = false;

        private void InitFirebase()
        {
            if (firebaseInitialized)
                return;

            FirebaseApp.Create(new AppOptions()
            {

                Credential = GoogleCredential.FromFile(
    Path.Combine(
        AppContext.BaseDirectory,
        "eslam-197ff-firebase-adminsdk-s5d5j-61b161c435.json"))

            });

            firebaseInitialized = true;
        }


        [HttpGet("PushNotification")]
        public async Task<IActionResult> PushNotification(
           string Token,
           string Title,
           string Body)
        {
            try
            {
                InitFirebase();

                var message = new FirebaseAdmin.Messaging.Message()
                {
                    Token = Token.Trim(),

                    Notification = new FirebaseAdmin.Messaging.Notification()
                    {
                        Title = string.IsNullOrEmpty(Title)
                            ? "AppEslam"
                            : Title,

                        Body = Body
                    }
                };

                string response =
                    await FirebaseMessaging
                    .DefaultInstance
                    .SendAsync(message);

                return Ok(new
                {
                    Success = true,
                    FirebaseResponse = response
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Error = ex.Message
                });
            }
        }

    }
}
