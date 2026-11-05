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
using System.Threading;
using System.Threading.Tasks;
using ERP.Reports;
using GateWay.App;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;

// =====================================================================================
//  ReportsController  -  Phase 7 (Reports & printing)   api/Reports/*
//  Auth: JWT (normal users)  OR  X-Admin-Token (ScreenBuilder / AdminLogin).
//   - run            : needs PRINT on the report's MODULE_CODE (Sample mode = admin only)
//   - design/admin   : Sys_Role.IsAdmin = 1, or EXECUTE+EDIT on the Sys_ReportsAdmin screen, or admin token
//  Report data = the stored procedure result. Procedure names are validated against
//  sys.procedures, parameter types come from sys.parameters, values are bound as SqlParameters.
//  Storage: App_Data/Reports/*.json|*.mrt  (default)  or  Sys_Reports* tables once they exist.
// =====================================================================================
namespace ERP.Controllers
{
    using Row = Dictionary<string, object>;

    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class ReportsController : ControllerBase
    {
        private const string AdminModule = "Sys_ReportsAdmin";
        private const int RowCap = 100000;
        private const int SampleRowCap = 200;
        private static readonly Regex CodeRx = new Regex(@"^[A-Za-z0-9_\-]{1,100}$", RegexOptions.Compiled);
        private static readonly Regex IdentRx = new Regex(@"^[A-Za-z_][A-Za-z0-9_]{0,127}$", RegexOptions.Compiled);
        private static readonly string[] Papers = { "A4", "A5", "Letter", "Thermal80", "Thermal58", "Custom" };

        private readonly IConfiguration _cfg;
        private readonly IWebHostEnvironment _env;
        private static IReportStore _fileStore;
        private static readonly object _initLock = new object();
        private static DateTime _modeCheckedAt = DateTime.MinValue;
        private static bool _dbMode;

        public ReportsController(IConfiguration cfg, IWebHostEnvironment env) { _cfg = cfg; _env = env; }

        // ------------------------------------------------------------------ models
        public class CodeRequest { public string ReportCode { get; set; } }
        public class LayoutIdRequest { public int LayoutId { get; set; } }
        public class NameRequest { public string Name { get; set; } }
        public class ResolveRequest { public string ReportCode { get; set; } public int CompCode { get; set; } public int BranchCode { get; set; } }
        public class DuplicateRequest { public int LayoutId { get; set; } public string Scope { get; set; } public int? CompCode { get; set; } public int? BranchCode { get; set; } }
        public class RunRequest
        {
            public string ReportCode { get; set; }
            public int CompCode { get; set; }
            public int BranchCode { get; set; }
            public Dictionary<string, JsonElement> Params { get; set; } = new Dictionary<string, JsonElement>();
            public bool Sample { get; set; }
            /// <summary>Admin-token callers only (no ERP session): the user id used for session-sourced UserID params. Ignored for normal users.</summary>
            public int UserId { get; set; }
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

        private static async Task<object> Scalar(SqlConnection c, string sql, params SqlParameter[] ps)
        {
            using var cmd = new SqlCommand(sql, c) { CommandTimeout = 60 };
            if (ps != null && ps.Length > 0) cmd.Parameters.AddRange(ps);
            var v = await cmd.ExecuteScalarAsync();
            return v == DBNull.Value ? null : v;
        }

        private static bool B(object v) => v != null && v != DBNull.Value && (v is bool b ? b : Convert.ToInt32(v) != 0);

        private IActionResult Fail(string msg, HttpStatusCode code = HttpStatusCode.BadRequest) =>
            Ok(JsonConvert.SerializeObject(new BaseResponse(code, msg)));
        private IActionResult Good(object data) => Ok(JsonConvert.SerializeObject(new BaseResponse(data)));

        private sealed class Ctx { public int UserId; public string UserName; public bool AdminToken; public bool Authenticated => AdminToken || UserId > 0; }

        private Ctx GetCtx()
        {
            var ctx = new Ctx();
            if (ERP.Controllers.AdminTokenStore.IsValid(Request.Headers["X-Admin-Token"].ToString())) { ctx.AdminToken = true; ctx.UserName = "admin"; }
            if (User?.Identity?.IsAuthenticated == true)
            {
                var v = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value ?? User.FindFirst("sub")?.Value;
                if (int.TryParse(v, out var id)) ctx.UserId = id;
                ctx.UserName = User.FindFirst(ClaimTypes.Name)?.Value ?? ctx.UserName;
            }
            return ctx;
        }

        private const string Denied = "You do not have permission for this operation / ليس لديك صلاحية لهذه العملية";
        private const string NeedLogin = "Login required / سجّل الدخول أولاً";

        private static async Task<bool> IsAdminUser(SqlConnection c, int userId)
        {
            if (userId <= 0) return false;
            var v = await Scalar(c, @"SELECT TOP 1 1 FROM Sys_RoleUsers ru JOIN Sys_Role r ON r.RoleId=ru.RoleId
                                       WHERE ru.UserID=@u AND ru.ISActive=1 AND ISNULL(r.IsAdmin,0)=1", P("@u", userId));
            if (v != null) return true;
            // or a normal permission on the Sys_ReportsAdmin screen (EXECUTE + EDIT)
            var rows = await Rows(c, "SELECT [EXECUTE],[EDIT] FROM Sys_UserModule WHERE UserID=@u AND MODULE_CODE=@m", P("@u", userId), P("@m", AdminModule));
            if (rows.Count == 0)
                rows = await Rows(c, @"SELECT rm.[EXECUTE], rm.[EDIT] FROM Sys_RoleModule rm WHERE rm.MODULE_CODE=@m
                                       AND rm.RoleId IN (SELECT RoleId FROM Sys_RoleUsers WHERE UserID=@u AND ISActive=1)", P("@u", userId), P("@m", AdminModule));
            return rows.Any(r => B(r["EXECUTE"]) && B(r["EDIT"]));
        }

        /// <summary>null = allowed, otherwise the error response.</summary>
        private async Task<IActionResult> RequireAdmin(Ctx ctx)
        {
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            if (ctx.AdminToken) return null;
            using var c = Open();
            return await IsAdminUser(c, ctx.UserId) ? null : Fail(Denied, HttpStatusCode.Forbidden);
        }

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
        /// POST api/Reports/config  -> license key (optional), storage mode, whether the caller can design
        [HttpPost("config")]
        public async Task<IActionResult> GetConfig()
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            bool canDesign;
            using (var c = Open()) canDesign = ctx.AdminToken || await IsAdminUser(c, ctx.UserId);
            return Good(new
            {
                LicenseKey = _cfg["Stimulsoft:LicenseKey"] ?? "",
                StorageMode = Store().Mode,
                CanDesign = canDesign,
                RowCap
            });
        }

        // ------------------------------------------------------------------ definitions
        [HttpPost("list-reports")]
        public async Task<IActionResult> ListReports()
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            return Good(new { Mode = Store().Mode, Reports = await Store().ListReports() });
        }

        /// get-report: any logged-in user (needed to know the proc parameter mapping when printing)
        [HttpPost("get-report")]
        public async Task<IActionResult> GetReportDef([FromBody] CodeRequest req)
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            var def = await Store().GetReport(Trim(req?.ReportCode));
            return def == null ? Fail("Report not found / التقرير غير موجود: " + req?.ReportCode, HttpStatusCode.NotFound) : Good(def);
        }

        [HttpPost("save-report")]
        public async Task<IActionResult> SaveReportDef([FromBody] ReportDef def)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            if (def == null || !CodeRx.IsMatch(Trim(def.ReportCode))) return Fail("ReportCode must be letters/digits/_/- (max 100) / كود التقرير حروف وأرقام و _ و - فقط");
            def.ReportCode = def.ReportCode.Trim();
            def.Kind = def.Kind == "transaction" ? "transaction" : "list";
            if (string.IsNullOrWhiteSpace(def.NameA) && string.IsNullOrWhiteSpace(def.NameE)) return Fail("Report name is required / اسم التقرير مطلوب");
            if (string.IsNullOrWhiteSpace(def.NameA)) def.NameA = def.NameE;
            if (string.IsNullOrWhiteSpace(def.NameE)) def.NameE = def.NameA;
            def.ProcName = Trim(def.ProcName);
            using (var c = Open())
            {
                if (def.ProcName.Length > 0 && await ResolveProc(c, def.ProcName) == null) return Fail("Procedure not found / الإجراء غير موجود: " + def.ProcName);
                if (!string.IsNullOrWhiteSpace(def.MODULE_CODE) && await Scalar(c, "SELECT 1 FROM Sys_Modules WHERE MODULE_CODE=@m", P("@m", def.MODULE_CODE.Trim())) == null)
                    return Fail("Screen (MODULE_CODE) not found / الشاشة غير موجودة: " + def.MODULE_CODE);
            }
            def.MODULE_CODE = string.IsNullOrWhiteSpace(def.MODULE_CODE) ? null : def.MODULE_CODE.Trim();
            def.Params = (def.Params ?? new List<ReportParamDef>())
                .Where(p => IdentRx.IsMatch(Trim(p.ParamName).TrimStart('@')))
                .Select((p, i) => new ReportParamDef
                {
                    ParamName = Trim(p.ParamName).TrimStart('@'),
                    Source = new[] { "filter", "session", "const", "trid" }.Contains(p.Source) ? p.Source : "const",
                    SourceValue = p.SourceValue,
                    SortOrder = i + 1
                }).GroupBy(p => p.ParamName.ToLowerInvariant()).Select(g => g.First()).ToList();
            await Store().SaveReport(def);
            return Good(await Store().GetReport(def.ReportCode));
        }

        [HttpPost("delete-report")]
        public async Task<IActionResult> RemoveReportDef([FromBody] CodeRequest req)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            if (!CodeRx.IsMatch(Trim(req?.ReportCode))) return Fail("Invalid ReportCode");
            await Store().DeleteReport(req.ReportCode.Trim());
            return Good(true);
        }

        // ------------------------------------------------------------------ layouts
        [HttpPost("list-layouts")]
        public async Task<IActionResult> ListLayouts([FromBody] CodeRequest req)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            return Good(await Store().ListLayouts(Trim(req?.ReportCode), false));
        }

        [HttpPost("get-layout")]
        public async Task<IActionResult> GetLayoutById([FromBody] LayoutIdRequest req)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            var l = await Store().GetLayout(req?.LayoutId ?? 0);
            return l == null ? Fail("Layout not found / التصميم غير موجود", HttpStatusCode.NotFound) : Good(l);
        }

        private string Validate(LayoutMeta l)
        {
            if (l == null || !CodeRx.IsMatch(Trim(l.ReportCode))) return "Invalid ReportCode";
            l.ReportCode = l.ReportCode.Trim();
            l.Scope = (l.Scope ?? "all").ToLowerInvariant();
            if (l.Scope != "all" && l.Scope != "company" && l.Scope != "branch") return "Scope must be all / company / branch";
            if (l.Scope == "all") { l.CompCode = null; l.BranchCode = null; }
            if (l.Scope == "company") { if (l.CompCode == null) return "CompCode is required for a company layout / اختر الشركة"; l.BranchCode = null; }
            if (l.Scope == "branch" && (l.CompCode == null || l.BranchCode == null)) return "CompCode and BranchCode are required for a branch layout / اختر الشركة والفرع";
            if (!Papers.Contains(l.PaperSize ?? "A4")) return "Unknown paper size";
            l.PaperSize = l.PaperSize ?? "A4";
            l.Orientation = l.Orientation == "landscape" ? "landscape" : "portrait";
            if (l.LayoutMrt != null && l.LayoutMrt.Length > 12 * 1024 * 1024) return "Layout is too large (max 12MB) / التصميم كبير جدًا";
            if (!string.IsNullOrWhiteSpace(l.LayoutMrt))
            {
                // a corrupt/foreign file would break printing for every company that falls back to it
                try
                {
                    var jo = Newtonsoft.Json.Linq.JObject.Parse(l.LayoutMrt);
                    if (jo["Pages"] == null) return "Layout is not a valid Stimulsoft report (no Pages) / ملف التصميم غير صالح";
                }
                catch { return "Layout is not valid JSON / ملف التصميم غير صالح"; }
            }
            if (!string.IsNullOrWhiteSpace(l.MarginsJson))
            {
                try { JsonConvert.DeserializeObject<Dictionary<string, double>>(l.MarginsJson); } catch { return "MarginsJson is not valid"; }
            }
            return null;
        }

        [HttpPost("save-layout")]
        public async Task<IActionResult> SaveLayoutDef([FromBody] LayoutMeta l)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            var err = Validate(l); if (err != null) return Fail(err);
            if (await Store().GetReport(l.ReportCode) == null) return Fail("Report not found / التقرير غير موجود");
            if (l.LayoutId == 0 && string.IsNullOrWhiteSpace(l.LayoutMrt)) return Fail("Layout content is empty / التصميم فاضي");
            l.UpdatedBy = ctx.UserName ?? ("user" + ctx.UserId);
            var id = await Store().SaveLayout(l);
            return Good(new { LayoutId = id });
        }

        [HttpPost("delete-layout")]
        public async Task<IActionResult> RemoveLayout([FromBody] LayoutIdRequest req)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            await Store().DeleteLayout(req?.LayoutId ?? 0);
            return Good(true);
        }

        [HttpPost("set-default-layout")]
        public async Task<IActionResult> SetDefaultLayout([FromBody] LayoutIdRequest req)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            await Store().SetDefault(req?.LayoutId ?? 0);
            return Good(true);
        }

        [HttpPost("duplicate-layout")]
        public async Task<IActionResult> DuplicateLayout([FromBody] DuplicateRequest req)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            var src = await Store().GetLayout(req?.LayoutId ?? 0);
            if (src == null) return Fail("Layout not found / التصميم غير موجود", HttpStatusCode.NotFound);
            var copy = new LayoutMeta
            {
                LayoutId = 0, ReportCode = src.ReportCode, Scope = req.Scope ?? src.Scope, CompCode = req.Scope == null ? src.CompCode : req.CompCode,
                BranchCode = req.Scope == null ? src.BranchCode : req.BranchCode, PaperSize = src.PaperSize, Orientation = src.Orientation,
                MarginsJson = src.MarginsJson, LayoutMrt = src.LayoutMrt, IsDefault = false, UpdatedBy = ctx.UserName
            };
            var err = Validate(copy); if (err != null) return Fail(err);
            return Good(new { LayoutId = await Store().SaveLayout(copy) });
        }

        /// resolve-layout: most specific wins (branch > company > all); inside a scope the default, else the newest.
        [HttpPost("resolve-layout")]
        public async Task<IActionResult> ResolveLayout([FromBody] ResolveRequest req)
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            var def = await Store().GetReport(Trim(req?.ReportCode));
            if (def == null) return Fail("Report not found / التقرير غير موجود: " + req?.ReportCode, HttpStatusCode.NotFound);
            var all = await Store().ListLayouts(def.ReportCode, true);
            int Rank(LayoutMeta l) => l.Scope == "branch" ? 3 : l.Scope == "company" ? 2 : 1;
            var best = all.Where(l => l.Scope == "all"
                                   || (l.Scope == "company" && l.CompCode == req.CompCode)
                                   || (l.Scope == "branch" && l.CompCode == req.CompCode && l.BranchCode == req.BranchCode))
                          .OrderByDescending(Rank).ThenByDescending(l => l.IsDefault).ThenByDescending(l => l.UpdatedAt).FirstOrDefault();
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

        private class ProcParam { public string Name; public string SqlType; public int MaxLength; public bool IsOutput; public bool HasDefault; public int Precision; public int Scale; }

        private static async Task<List<ProcParam>> ProcParams(SqlConnection c, string full)
        {
            var rows = await Rows(c, @"SELECT p.name AS Name, t.name AS TypeName, p.max_length AS MaxLen, p.is_output AS IsOut, p.has_default_value AS HasDef, p.precision AS Prec, p.scale AS Sc
                FROM sys.parameters p JOIN sys.types t ON t.user_type_id=p.user_type_id
                WHERE p.object_id=OBJECT_ID(@n) AND p.parameter_id>0 ORDER BY p.parameter_id", P("@n", full));
            return rows.Select(r => new ProcParam
            {
                Name = Convert.ToString(r["Name"]).TrimStart('@'), SqlType = Convert.ToString(r["TypeName"]).ToLowerInvariant(), MaxLength = Convert.ToInt32(r["MaxLen"]),
                IsOutput = B(r["IsOut"]), HasDefault = B(r["HasDef"]), Precision = Convert.ToInt32(r["Prec"]), Scale = Convert.ToInt32(r["Sc"])
            }).ToList();
        }

        [HttpPost("procs")]
        public async Task<IActionResult> ListProcs()
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            using var c = Open();
            var rows = await Rows(c, "SELECT s.name AS S, p.name AS N FROM sys.procedures p JOIN sys.schemas s ON s.schema_id=p.schema_id WHERE p.is_ms_shipped=0 ORDER BY p.name");
            return Good(rows.Select(r => Convert.ToString(r["S"]) == "dbo" ? Convert.ToString(r["N"]) : r["S"] + "." + r["N"]).ToList());
        }

        /// proc-params: parameters + first result-set columns (empty + warning when SQL Server cannot describe it - never runs the proc)
        [HttpPost("proc-params")]
        public async Task<IActionResult> GetProcParams([FromBody] NameRequest req)
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            using var c = Open();
            var full = await ResolveProc(c, Trim(req?.Name));
            if (full == null) return Fail("Procedure not found / الإجراء غير موجود: " + req?.Name);
            var pars = await ProcParams(c, full);
            var columns = DescribeColumns(c, full, out var warn);
            return Good(new { Parameters = pars.Select(p => new { p.Name, p.SqlType, p.MaxLength, p.IsOutput, p.HasDefault }), Columns = columns, Warning = warn });
        }

        private static List<object> DescribeColumns(SqlConnection c, string full, out string warning)
        {
            var cols = new List<object>();
            warning = "";
            try
            {
                using var cmd = new SqlCommand("SELECT name, system_type_name FROM sys.dm_exec_describe_first_result_set_for_object(OBJECT_ID(@n), NULL) WHERE is_hidden=0 ORDER BY column_ordinal", c) { CommandTimeout = 30 };
                cmd.Parameters.AddWithValue("@n", full);
                using var r = cmd.ExecuteReader();
                while (r.Read()) cols.Add(new { Name = r.IsDBNull(0) ? "" : r.GetString(0), SqlType = r.IsDBNull(1) ? "" : r.GetString(1) });
                if (cols.Count == 0) warning = "SQL Server cannot describe the result columns of this procedure (temp tables / dynamic SQL). Use \"Run sample\" in the designer with explicit parameter values.";
            }
            catch (Exception ex) { warning = ex.Message; }
            return cols;
        }

        [HttpPost("lookups")]
        public async Task<IActionResult> Lookups()
        {
            var ctx = GetCtx();
            var deny = await RequireAdmin(ctx); if (deny != null) return deny;
            using var c = Open();
            return Good(new
            {
                Modules = await Rows(c, "SELECT MODULE_CODE, MODULE_DESCA AS DescA, MODULE_DESCE AS DescE FROM Sys_Modules WHERE ISNULL(AVAILABLE,1)=1 ORDER BY MODULE_CODE"),
                Companies = await Rows(c, "SELECT CompCode, NameA, NameE FROM Sys_Company WHERE ISNULL(IsActive,1)=1 ORDER BY CompCode"),
                Branches = await Rows(c, "SELECT CompCode, BranchCode, BranchDescA, BranchDescE FROM Sys_Branch WHERE ISNULL(IsActive,1)=1 ORDER BY CompCode, BranchCode")
            });
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
                case "nvarchar": case "varchar": case "nchar": case "char": case "ntext": case "text": case "xml":
                    return s.Length == 0 ? (object)DBNull.Value : s;     // empty text = "no filter" = NULL
                default:
                    return s.Length == 0 ? (object)DBNull.Value : s;
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
                case JsonValueKind.Number: return e.GetRawText();
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

        /// run: executes the report procedure and returns its rows (+ Company row). PRINT permission required (Sample = admin only).
        [HttpPost("run")]
        public async Task<IActionResult> RunReport([FromBody] RunRequest req)
        {
            var ctx = GetCtx();
            if (!ctx.Authenticated) return Fail(NeedLogin, HttpStatusCode.Unauthorized);
            if (req == null || !CodeRx.IsMatch(Trim(req.ReportCode))) return Fail("Invalid ReportCode");
            var def = await Store().GetReport(req.ReportCode.Trim());
            if (def == null) return Fail("Report not found / التقرير غير موجود: " + req.ReportCode, HttpStatusCode.NotFound);
            if (!def.IsActive && !ctx.AdminToken) return Fail("Report is disabled / التقرير معطّل");
            if (string.IsNullOrWhiteSpace(def.ProcName)) return Fail("The report has no procedure / التقرير ليس له إجراء");

            using var c = Open();
            if (req.Sample)
            {
                if (!(ctx.AdminToken || await IsAdminUser(c, ctx.UserId))) return Fail(Denied, HttpStatusCode.Forbidden);
            }
            else if (!ctx.AdminToken && !await HasPrint(c, ctx.UserId, def.MODULE_CODE, req.CompCode, req.BranchCode))
                return Fail("You do not have PRINT permission on this screen / ليس لديك صلاحية الطباعة على هذه الشاشة", HttpStatusCode.Forbidden);

            var full = await ResolveProc(c, def.ProcName);
            if (full == null) return Fail("Procedure not found / الإجراء غير موجود: " + def.ProcName);
            var pars = await ProcParams(c, full);

            using var cmd = new SqlCommand(full, c) { CommandType = CommandType.StoredProcedure, CommandTimeout = 120 };
            var used = new Dictionary<string, object>();
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
                        else if (m.Source == "session" && m.SourceValue == "UserID") { raw = (ctx.AdminToken && req.UserId > 0 ? req.UserId : ctx.UserId).ToString(); provided = true; }
                        else if (m.Source == "session" && m.SourceValue == "Today") { raw = DateTime.Today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture); provided = true; }
                        else if (req.Params.TryGetValue(p.Name, out var je)) { raw = JsonToString(je); provided = true; }
                        else if (req.Params.Keys.FirstOrDefault(k => string.Equals(k, p.Name, StringComparison.OrdinalIgnoreCase)) is string k2) { raw = JsonToString(req.Params[k2]); provided = true; }
                    }
                    if (m == null && !p.HasDefault)
                        throw new ArgumentException($"@{p.Name} has no mapping in the report definition and no default / الباراميتر @{p.Name} غير مربوط ولا له قيمة افتراضية");
                    if (m == null) continue;                              // unmapped + has default: SQL Server uses the default
                    if ((!provided || string.IsNullOrEmpty(raw)) && p.HasDefault) continue;   // blank filter: let the default apply
                    var val = ToSqlValue(p, raw);
                    var sp = new SqlParameter("@" + p.Name, val);
                    cmd.Parameters.Add(sp);
                    used[p.Name] = val is DBNull ? null : JsonSafe(val);
                }
            }
            catch (ArgumentException ex) { return Fail(ex.Message); }
            catch (OverflowException) { return Fail("A number is out of range / رقم خارج النطاق"); }

            int cap = req.Sample ? SampleRowCap : RowCap;
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
                        if (rows.Count >= cap) { truncated = true; break; }
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
                Truncated = truncated, RowCap = cap, ElapsedMs = sw.ElapsedMilliseconds,
                Warning = truncated ? $"Only the first {cap:N0} rows were loaded / تم تحميل أول {cap:N0} صف فقط - ضيّق الفلتر" : ""
            });
        }
    }
}
