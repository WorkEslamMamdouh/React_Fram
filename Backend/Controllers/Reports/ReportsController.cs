using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ERP.Reports;
using GateWay.App;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json;

// =====================================================================================
//  ReportsController  -  runtime side only   api/Reports/*
//   - config          : { RowCap }
//   - get-report      : report definition (procedure parameter mapping) - any logged-in user
//   - resolve-layout  : best layout (branch > company > all; JSON layouts first) incl. LayoutFormat / LayoutJson
//   - run             : executes the report procedure - PRINT permission on the report's MODULE_CODE
//  Report definitions and layouts are written by ERP Studio (Sys_Reports* tables).
//  Procedure names are validated against sys.procedures, parameter types come from sys.parameters,
//  values are bound as SqlParameters.
//  Storage: Sys_Reports* tables when they exist, otherwise App_Data/Reports/*.json (read-only).
// =====================================================================================
namespace ERP.Controllers
{
    using Row = Dictionary<string, object>;

    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]   // JWT is checked per action (GetCtx)
    public class ReportsController : ControllerBase
    {
        private const int RowCap = 100000;
        private static readonly Regex CodeRx = new Regex(@"^[A-Za-z0-9_\-]{1,100}$", RegexOptions.Compiled);
        private static readonly Regex IdentRx = new Regex(@"^[A-Za-z_][A-Za-z0-9_]{0,127}$", RegexOptions.Compiled);

        private readonly IWebHostEnvironment _env;
        private static IReportStore _fileStore;
        private static readonly object _initLock = new object();
        private static DateTime _modeCheckedAt = DateTime.MinValue;
        private static bool _dbMode;

        public ReportsController(IWebHostEnvironment env) { _env = env; }

        // ------------------------------------------------------------------ models
        public class CodeRequest { public string ReportCode { get; set; } }
        public class ResolveRequest { public string ReportCode { get; set; } public int CompCode { get; set; } public int BranchCode { get; set; } }
        public class RunRequest
        {
            public string ReportCode { get; set; }
            public int CompCode { get; set; }
            public int BranchCode { get; set; }
            public Dictionary<string, JsonElement> Params { get; set; } = new Dictionary<string, JsonElement>();
        }

        // ------------------------------------------------------------------ helpers
        private IReportStore Store()
        {
            if ((DateTime.UtcNow - _modeCheckedAt).TotalSeconds > 30)
            {
                lock (_initLock)
                {
                    if ((DateTime.UtcNow - _modeCheckedAt).TotalSeconds > 30)
                    {
                        _dbMode = DbReportStore.TablesExist().GetAwaiter().GetResult();
                        _modeCheckedAt = DateTime.UtcNow;
                    }
                }
            }
            if (_dbMode) return new DbReportStore();
            lock (_initLock)
            {
                if (_fileStore == null) _fileStore = new FileReportStore(Path.Combine(_env.ContentRootPath, "App_Data", "Reports"));
            }
            return _fileStore;
        }

        private static SqlConnection Open()
        {
            var c = new SqlConnection(ConnectionString.connectionString);
            c.Open();
            return c;
        }

        private static SqlParameter P(string name, object value) => new SqlParameter(name, value ?? DBNull.Value);

        private static async Task<List<Row>> Rows(SqlConnection c, string sql, params SqlParameter[] ps)
        {
            using var cmd = new SqlCommand(sql, c) { CommandTimeout = 60 };
            if (ps != null && ps.Length > 0) cmd.Parameters.AddRange(ps);
            var list = new List<Row>();
            using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var d = new Row();
                for (int i = 0; i < r.FieldCount; i++) d[r.GetName(i)] = r.IsDBNull(i) ? null : r.GetValue(i);
                list.Add(d);
            }
            return list;
        }

        private static bool B(object v) => v != null && v != DBNull.Value && (v is bool b ? b : Convert.ToInt32(v) != 0);

        private IActionResult Fail(string msg, HttpStatusCode code = HttpStatusCode.BadRequest) =>
            Ok(JsonConvert.SerializeObject(new BaseResponse(code, msg)));
        private IActionResult Good(object data) => Ok(JsonConvert.SerializeObject(new BaseResponse(data)));

        private sealed class Ctx { public int UserId; public string UserName; public bool Authenticated => UserId > 0; }

        private Ctx GetCtx()
        {
            var ctx = new Ctx();
            if (User?.Identity?.IsAuthenticated == true)
            {
                var v = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value ?? User.FindFirst("sub")?.Value;
                if (int.TryParse(v, out var id)) ctx.UserId = id;
                ctx.UserName = User.FindFirst(ClaimTypes.Name)?.Value;
            }
            return ctx;
        }

        private const string NeedLogin = "Login required / سجّل الدخول أولاً";

        /// PRINT permission of a screen for (user, company, branch): user rows first, else roles; highest Prc_Preference wins (same as the front end).
        private static async Task<bool> HasPrint(SqlConnection c, int userId, string module, int comp, int branch)
        {
            if (string.IsNullOrWhiteSpace(module))
            {
                // report without a screen: any logged-in user, but only for a company/branch the user really belongs to
                // (CompCode/BranchCode come from the request body, so they must be checked)
                if (userId <= 0) return false;
                var mem = await Rows(c, "SELECT TOP 1 1 AS X FROM Sys_RoleUsers WHERE UserID=@u AND CompCode=@c AND BranchCode=@b AND ISActive=1",
                    P("@u", userId), P("@c", comp), P("@b", branch));
                return mem.Count > 0;
            }
            var rows = await Rows(c, @"SELECT TOP 1 [PRINT] FROM IQ_Sys_RoleModule
                WHERE MODULE_CODE=@m AND CompCode=@c AND UserID=@u AND User_CompCode=@c AND User_BranchCode=@b ORDER BY Prc_Preference DESC",
                P("@m", module), P("@c", comp), P("@u", userId), P("@b", branch));
            if (rows.Count == 0)
                rows = await Rows(c, @"SELECT TOP 1 [PRINT] FROM IQ_Sys_RoleModule
                    WHERE MODULE_CODE=@m AND CompCode=@c AND UserID=0
                      AND RoleId IN (SELECT RoleId FROM Sys_RoleUsers WHERE UserID=@u AND CompCode=@c AND BranchCode=@b AND ISActive=1)
                    ORDER BY Prc_Preference DESC",
                    P("@m", module), P("@c", comp), P("@u", userId), P("@b", branch));
            return rows.Count > 0 && B(rows[0]["PRINT"]);
        }

        private static string Trim(string s) => (s ?? "").Trim();

        // ------------------------------------------------------------------ config
        /// POST api/Reports/config  -> { RowCap }
        [HttpPost("config")]
        public IActionResult GetConfig()
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            return Good(new { RowCap });
        }

        // ------------------------------------------------------------------ definition
        /// get-report: any logged-in user (needed to know the proc parameter mapping when printing)
        [HttpPost("get-report")]
        public async Task<IActionResult> GetReportDef([FromBody] CodeRequest req)
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            var def = await Store().GetReport(Trim(req?.ReportCode));
            return def == null ? Fail("Report not found / التقرير غير موجود: " + req?.ReportCode, HttpStatusCode.NotFound) : Good(def);
        }

        /// resolve-layout: JSON layouts win over old Stimulsoft (mrt) layouts; then the most specific scope
        /// (branch > company > all); inside a scope the default, else the newest.
        [HttpPost("resolve-layout")]
        public async Task<IActionResult> ResolveLayout([FromBody] ResolveRequest req)
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            var def = await Store().GetReport(Trim(req?.ReportCode));
            if (def == null) return Fail("Report not found / التقرير غير موجود: " + req?.ReportCode, HttpStatusCode.NotFound);
            var all = await Store().ListLayouts(def.ReportCode);
            int Rank(LayoutMeta l) => l.Scope == "branch" ? 3 : l.Scope == "company" ? 2 : 1;
            bool IsJson(LayoutMeta l) => string.Equals(l.LayoutFormat, "json", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(l.LayoutJson);
            var best = all.Where(l => l.Scope == "all"
                                   || (l.Scope == "company" && l.CompCode == req.CompCode)
                                   || (l.Scope == "branch" && l.CompCode == req.CompCode && l.BranchCode == req.BranchCode))
                          .OrderByDescending(IsJson).ThenByDescending(Rank).ThenByDescending(l => l.IsDefault).ThenByDescending(l => l.UpdatedAt).FirstOrDefault();
            return Good(new { Layout = best });
        }

        // ------------------------------------------------------------------ procedure helpers
        private static async Task<string> ResolveProc(SqlConnection c, string name)
        {
            string schema = "dbo", proc = name;
            var parts = name.Split('.');
            if (parts.Length == 2) { schema = parts[0].Trim('[', ']'); proc = parts[1].Trim('[', ']'); }
            else if (parts.Length != 1) return null;
            if (!IdentRx.IsMatch(schema) || !IdentRx.IsMatch(proc)) return null;
            var rows = await Rows(c, "SELECT s.name AS S, p.name AS N FROM sys.procedures p JOIN sys.schemas s ON s.schema_id=p.schema_id WHERE s.name=@s AND p.name=@n AND p.is_ms_shipped=0",
                P("@s", schema), P("@n", proc));
            return rows.Count == 0 ? null : "[" + rows[0]["S"] + "].[" + rows[0]["N"] + "]";
        }

        private class ProcParam { public string Name; public string SqlType; public bool IsOutput; public bool HasDefault; }

        private static async Task<List<ProcParam>> ProcParams(SqlConnection c, string full)
        {
            var rows = await Rows(c, @"SELECT p.name AS Name, t.name AS TypeName, p.is_output AS IsOut, p.has_default_value AS HasDef
                FROM sys.parameters p JOIN sys.types t ON t.user_type_id=p.user_type_id
                WHERE p.object_id=OBJECT_ID(@n) AND p.parameter_id>0 ORDER BY p.parameter_id", P("@n", full));
            return rows.Select(r => new ProcParam
            {
                Name = Convert.ToString(r["Name"]).TrimStart('@'), SqlType = Convert.ToString(r["TypeName"]).ToLowerInvariant(),
                IsOutput = B(r["IsOut"]), HasDefault = B(r["HasDef"])
            }).ToList();
        }

        // ------------------------------------------------------------------ run
        private static object ToSqlValue(ProcParam p, string s)
        {
            if (s == null) return DBNull.Value;
            var t = p.SqlType;
            var ci = CultureInfo.InvariantCulture;
            switch (t)
            {
                case "int": case "bigint": case "smallint": case "tinyint":
                    if (string.IsNullOrWhiteSpace(s)) return DBNull.Value;
                    if (!long.TryParse(s.Trim(), NumberStyles.Integer, ci, out var l)) throw new ArgumentException($"@{p.Name}: '{s}' is not a whole number / ليس رقمًا صحيحًا");
                    return t == "int" ? (object)checked((int)l) : t == "smallint" ? (object)checked((short)l) : t == "tinyint" ? (object)checked((byte)l) : l;
                case "bit":
                    if (string.IsNullOrWhiteSpace(s)) return DBNull.Value;
                    var ls = s.Trim().ToLowerInvariant();
                    if (ls == "1" || ls == "true" || ls == "yes") return true;
                    if (ls == "0" || ls == "false" || ls == "no") return false;
                    throw new ArgumentException($"@{p.Name}: '{s}' is not true/false");
                case "decimal": case "numeric": case "money": case "smallmoney":
                    if (string.IsNullOrWhiteSpace(s)) return DBNull.Value;
                    if (!decimal.TryParse(s.Trim(), NumberStyles.Number | NumberStyles.AllowExponent | NumberStyles.AllowLeadingSign, ci, out var d)) throw new ArgumentException($"@{p.Name}: '{s}' is not a number / ليس رقمًا");
                    return d;
                case "float": case "real":
                    if (string.IsNullOrWhiteSpace(s)) return DBNull.Value;
                    if (!double.TryParse(s.Trim(), NumberStyles.Float, ci, out var f)) throw new ArgumentException($"@{p.Name}: '{s}' is not a number / ليس رقمًا");
                    return f;
                case "date": case "datetime": case "datetime2": case "smalldatetime": case "datetimeoffset":
                    if (string.IsNullOrWhiteSpace(s)) return DBNull.Value;
                    if (!DateTime.TryParse(s.Trim(), ci, DateTimeStyles.None, out var dt)) throw new ArgumentException($"@{p.Name}: '{s}' is not a date / ليس تاريخًا");
                    return dt;
                case "uniqueidentifier":
                    if (string.IsNullOrWhiteSpace(s)) return DBNull.Value;
                    if (!Guid.TryParse(s.Trim(), out var g)) throw new ArgumentException($"@{p.Name}: '{s}' is not a GUID");
                    return g;
                default:
                    return s.Length == 0 ? (object)DBNull.Value : s;     // empty text = "no filter" = NULL
            }
        }

        private static string JsonToString(JsonElement e)
        {
            switch (e.ValueKind)
            {
                case JsonValueKind.Null: case JsonValueKind.Undefined: return null;
                case JsonValueKind.String: return e.GetString();
                case JsonValueKind.True: return "true";
                case JsonValueKind.False: return "false";
                default: return e.GetRawText();
            }
        }

        private static object JsonSafe(object v)
        {
            if (v == null || v is DBNull) return null;
            if (v is DateTime dt) return dt.ToString("yyyy-MM-ddTHH:mm:ss.FFF", CultureInfo.InvariantCulture);
            if (v is DateTimeOffset dto) return dto.ToString("yyyy-MM-ddTHH:mm:ss.FFFzzz", CultureInfo.InvariantCulture);
            if (v is TimeSpan ts) return ts.ToString();
            if (v is byte[] bytes) return Convert.ToBase64String(bytes);
            if (v is Guid g) return g.ToString();
            return v;
        }

        private async Task<Row> CompanyInfo(SqlConnection c, int comp, int branch, string userName)
        {
            var d = new Row();
            var cr = (await Rows(c, "SELECT NameA, NameE, Address, Tel, Fax, Email, WebSite FROM Sys_Company WHERE CompCode=@c", P("@c", comp))).FirstOrDefault();
            var br = (await Rows(c, "SELECT BranchDescA, BranchDescE, Tel, Fax, Email, WebSite, Address_Street, Address_City, GroupVatNo FROM Sys_Branch WHERE CompCode=@c AND BranchCode=@b", P("@c", comp), P("@b", branch))).FirstOrDefault();
            string G(Row r, string k) => r != null && r.TryGetValue(k, out var v) && v != null ? Convert.ToString(v) : "";
            d["CompCode"] = comp; d["BranchCode"] = branch;
            d["CompNameA"] = G(cr, "NameA"); d["CompNameE"] = G(cr, "NameE"); d["CompAddress"] = G(cr, "Address");
            d["CompTel"] = G(cr, "Tel"); d["CompFax"] = G(cr, "Fax"); d["CompEmail"] = G(cr, "Email"); d["CompWebSite"] = G(cr, "WebSite");
            d["BranchNameA"] = G(br, "BranchDescA"); d["BranchNameE"] = G(br, "BranchDescE");
            d["BranchTel"] = G(br, "Tel"); d["BranchFax"] = G(br, "Fax"); d["BranchEmail"] = G(br, "Email"); d["BranchWebSite"] = G(br, "WebSite");
            d["BranchAddress"] = string.Join(", ", new[] { G(br, "Address_Street"), G(br, "Address_City") }.Where(x => x.Length > 0));
            d["VatNo"] = G(br, "GroupVatNo");
            d["PrintedBy"] = userName ?? "";
            d["PrintedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
            // optional logo: App_Data/Reports/logos/comp_{CompCode}.png|jpg  (no logo column exists in Sys_Company)
            string logo = "";
            try
            {
                var dir = Path.Combine(_env.ContentRootPath, "App_Data", "Reports", "logos");
                foreach (var ext in new[] { ".png", ".jpg", ".jpeg" })
                {
                    var f = Path.Combine(dir, "comp_" + comp + ext);
                    if (System.IO.File.Exists(f) && new FileInfo(f).Length < 2 * 1024 * 1024) { logo = Convert.ToBase64String(System.IO.File.ReadAllBytes(f)); break; }
                }
            }
            catch { }
            d["LogoBase64"] = logo;
            return d;
        }

        /// run: executes the report procedure and returns its result sets (+ Company row). PRINT permission required.
        [HttpPost("run")]
        public async Task<IActionResult> RunReport([FromBody] RunRequest req)
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            if (req == null || !CodeRx.IsMatch(Trim(req.ReportCode))) return Fail("Invalid ReportCode");
            var def = await Store().GetReport(req.ReportCode.Trim());
            if (def == null) return Fail("Report not found / التقرير غير موجود: " + req.ReportCode, HttpStatusCode.NotFound);
            if (!def.IsActive) return Fail("Report is disabled / التقرير معطّل");
            if (string.IsNullOrWhiteSpace(def.ProcName)) return Fail("The report has no procedure / التقرير ليس له إجراء");

            using var c = Open();
            if (!await HasPrint(c, ctx.UserId, def.MODULE_CODE, req.CompCode, req.BranchCode))
                return Fail("You do not have PRINT permission on this screen / ليس لديك صلاحية الطباعة على هذه الشاشة", HttpStatusCode.Forbidden);

            var full = await ResolveProc(c, def.ProcName);
            if (full == null) return Fail("Procedure not found / الإجراء غير موجود: " + def.ProcName);
            var pars = await ProcParams(c, full);

            using var cmd = new SqlCommand(full, c) { CommandType = CommandType.StoredProcedure, CommandTimeout = 120 };
            var used = new Dictionary<string, object>();
            req.Params ??= new Dictionary<string, JsonElement>();
            try
            {
                foreach (var p in pars.Where(x => !x.IsOutput))
                {
                    var m = def.Params.FirstOrDefault(x => string.Equals(x.ParamName, p.Name, StringComparison.OrdinalIgnoreCase));
                    string raw = null; bool provided = false;
                    if (m != null)
                    {
                        if (m.Source == "const") { raw = m.SourceValue; provided = true; }
                        else if (m.Source == "session" && m.SourceValue == "CompCode") { raw = req.CompCode.ToString(); provided = true; }
                        else if (m.Source == "session" && m.SourceValue == "BranchCode") { raw = req.BranchCode.ToString(); provided = true; }
                        else if (m.Source == "session" && m.SourceValue == "UserID") { raw = ctx.UserId.ToString(); provided = true; }
                        else if (m.Source == "session" && m.SourceValue == "Today") { raw = DateTime.Today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture); provided = true; }
                        else if (req.Params.TryGetValue(p.Name, out var je)) { raw = JsonToString(je); provided = true; }
                        else if (req.Params.Keys.FirstOrDefault(k => string.Equals(k, p.Name, StringComparison.OrdinalIgnoreCase)) is string k2) { raw = JsonToString(req.Params[k2]); provided = true; }
                    }
                    if (m == null && !p.HasDefault)
                        throw new ArgumentException($"@{p.Name} has no mapping in the report definition and no default / الباراميتر @{p.Name} غير مربوط ولا له قيمة افتراضية");
                    if (m == null) continue;                              // unmapped + has default: SQL Server uses the default
                    if ((!provided || string.IsNullOrEmpty(raw)) && p.HasDefault) continue;   // blank filter: let the default apply
                    var val = ToSqlValue(p, raw);
                    cmd.Parameters.Add(new SqlParameter("@" + p.Name, val));
                    used[p.Name] = val is DBNull ? null : JsonSafe(val);
                }
            }
            catch (ArgumentException ex) { return Fail(ex.Message); }
            catch (OverflowException) { return Fail("A number is out of range / رقم خارج النطاق"); }

            bool truncated = false;
            var tables = new List<object>();
            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                using var r = await cmd.ExecuteReaderAsync();
                int idx = 0;
                do
                {
                    var cols = new List<object>();
                    for (int i = 0; i < r.FieldCount; i++) cols.Add(new { Name = r.GetName(i), Type = r.GetFieldType(i)?.Name ?? "String", SqlType = r.GetDataTypeName(i) });
                    var rows = new List<Row>();
                    while (await r.ReadAsync())
                    {
                        if (rows.Count >= RowCap) { truncated = true; break; }
                        var row = new Row();
                        for (int i = 0; i < r.FieldCount; i++) row[r.GetName(i)] = r.IsDBNull(i) ? null : JsonSafe(r.GetValue(i));
                        rows.Add(row);
                    }
                    if (r.FieldCount > 0) tables.Add(new { Name = idx == 0 ? "Data" : "Data" + (idx + 1), Columns = cols, Rows = rows });
                    idx++;
                    if (truncated) break;
                } while (idx < 5 && await r.NextResultAsync());
            }
            catch (SqlException ex) { return Fail("Report procedure failed / فشل إجراء التقرير: " + ex.Message); }

            var first = tables.Count > 0 ? tables[0] : new { Name = "Data", Columns = new List<object>(), Rows = new List<Row>() };
            return Good(new
            {
                ReportCode = def.ReportCode, Kind = def.Kind, NameA = def.NameA, NameE = def.NameE,
                Tables = tables.Count > 0 ? tables : new List<object> { first },
                Params = used,
                Company = await CompanyInfo(c, req.CompCode, req.BranchCode, ctx.UserName),
                Truncated = truncated, RowCap, ElapsedMs = sw.ElapsedMilliseconds,
                Warning = truncated ? $"Only the first {RowCap:N0} rows were loaded / تم تحميل أول {RowCap:N0} صف فقط - ضيّق الفلتر" : ""
            });
        }
    }
}
