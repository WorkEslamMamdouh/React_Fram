#nullable enable
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using GateWay.App;

namespace ERP.CustomFields
{
    [ApiController]
    [Route("api/meta")]
    [Authorize]
    public class CustomFieldsController : ControllerBase
    {
        private readonly CustomFieldService _svc;
        public CustomFieldsController(CustomFieldService svc) { _svc = svc; }

        [HttpGet("CustomFields")]
        public async Task<IActionResult> CustomFields(string entity, int? compCode = null)
        {
            var defs = await _svc.GetDefsAsync(entity, compCode);
            if (defs == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.NotFound, "unknown entity")));
            return Ok(JsonConvert.SerializeObject(new BaseResponse(defs)));
        }
    }
}
