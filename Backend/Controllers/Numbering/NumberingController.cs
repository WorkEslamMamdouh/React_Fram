#nullable enable
using System;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using GateWay.App;
using ERP.Common;

namespace ERP.Numbering
{
    [ApiController]
    [Route("api/numbering")]
    [Authorize]
    public class NumberingController : ControllerBase
    {
        private readonly NumberingService _svc;
        public NumberingController(NumberingService svc) { _svc = svc; }

        public class NextRequest { public string docKey { get; set; } = ""; public int compCode { get; set; } public int? branchCode { get; set; } public int? terminalDeviceId { get; set; } public DateTime? docDate { get; set; } public int? finYear { get; set; } }

        [HttpPost("Next")]
        public async Task<IActionResult> Next([FromBody] NextRequest req)
        {
            if (await _svc.IsGaplessAsync(req.docKey, req.compCode))
                return StatusCode((int)HttpStatusCode.Conflict, JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.Conflict, "gapless_series")));
            using var con = await RuntimeDb.OpenAsync();
            var (docNo, seriesId, seqNo) = await _svc.NextDocNoAsync(con, null, req.docKey, req.compCode, req.branchCode, req.terminalDeviceId, req.docDate, req.finYear);
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { docNo, seqNo, seriesId })));
        }

        [HttpGet("Preview")]
        public async Task<IActionResult> Preview(string docKey, int compCode, int branchCode)
        {
            // format LastNo+Step without consuming
            var row = await RuntimeDb.FirstAsync(
                "SELECT TOP 1 s.SeriesId, s.Pattern, s.Step, s.StartNo FROM dbo.Sys_DocSeries s WHERE s.IsActive=1 AND s.DocKey=@d AND s.CompCode=@c " +
                "AND (s.BranchCode IS NULL OR s.BranchCode=@b) ORDER BY (CASE WHEN s.BranchCode IS NOT NULL THEN 2 ELSE 0 END) DESC, s.Priority DESC, s.SeriesId DESC",
                ("@d", docKey), ("@c", compCode), ("@b", branchCode));
            if (row == null) return Ok(JsonConvert.SerializeObject(new BaseResponse(HttpStatusCode.NotFound, "no series")));
            int seriesId = RuntimeDb.I(row["SeriesId"]);
            int step = RuntimeDb.I(row["Step"]);
            long start = Convert.ToInt64(row["StartNo"]);
            var last = await RuntimeDb.ScalarAsync("SELECT TOP 1 LastNo FROM dbo.Sys_DocSeriesCounter WHERE SeriesId=@s ORDER BY PeriodKey DESC", ("@s", seriesId));
            long next = last == null ? start : Convert.ToInt64(last) + step;
            var pattern = RuntimeDb.S(row["Pattern"])!;
            var formatted = await RuntimeDb.ScalarAsync("SELECT dbo.Sys_FormatDocNo(@p,@n,@c,@b,CAST(GETDATE() AS DATE),NULL,NULL)",
                ("@p", pattern), ("@n", next), ("@c", compCode), ("@b", branchCode));
            return Ok(JsonConvert.SerializeObject(new BaseResponse(new { nextDocNo = formatted?.ToString() })));
        }
    }
}
