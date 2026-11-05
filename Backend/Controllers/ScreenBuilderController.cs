using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace GateWay.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScreenBuilderController : ControllerBase, Microsoft.AspNetCore.Mvc.Filters.IActionFilter
    {
        private readonly Microsoft.Extensions.Configuration.IConfiguration _cfg;
        private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment _env;

        public ScreenBuilderController(Microsoft.Extensions.Configuration.IConfiguration cfg, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
        {
            _cfg = cfg;
            _env = env;
        }

        // Phase 5: every ScreenBuilder call must carry the admin token issued by api/admin/login (header X-Admin-Token)
        public void OnActionExecuting(Microsoft.AspNetCore.Mvc.Filters.ActionExecutingContext context)
        {
            string tok = Request.Headers["X-Admin-Token"].ToString();
            if (!ERP.Controllers.AdminTokenStore.IsValid(tok))
                context.Result = new UnauthorizedObjectResult(new { success = false, error = "Admin login required (X-Admin-Token missing or expired). Log in again from AdminLogin." });
        }

        public void OnActionExecuted(Microsoft.AspNetCore.Mvc.Filters.ActionExecutedContext context) { }

        public class ConnectRequest
        {
            public string Server { get; set; } = ".";
            public string User { get; set; } = "sa";
            public string Password { get; set; } = "";
            public string Database { get; set; } = "";
        }

        public class TableRequest : ConnectRequest
        {
            public string Table { get; set; } = "";
            public string View { get; set; } = "";
        }

        public class ExecuteSqlRequest : ConnectRequest
        {
            public string Sql { get; set; } = "";
        }

        public class ScanRequest
        {
            public string ProjectPath { get; set; } = "";
        }

        // Empty Server = use the server's own connection (ConnectionStrings:cs) so no password travels from the browser
        string BuildConn(ConnectRequest r, string db = null)
        {
            if (string.IsNullOrWhiteSpace(r.Server))
            {
                var sb = new SqlConnectionStringBuilder(_cfg["ConnectionStrings:cs"] ?? "");
                if (!string.IsNullOrWhiteSpace(db)) sb.InitialCatalog = db;
                else if (!string.IsNullOrWhiteSpace(r.Database)) sb.InitialCatalog = r.Database;
                sb.ConnectTimeout = 10;
                sb.TrustServerCertificate = true;
                return sb.ConnectionString;
            }
            var b = new SqlConnectionStringBuilder
            {
                DataSource = r.Server,
                UserID = r.User,
                Password = r.Password,
                InitialCatalog = db ?? r.Database ?? "master",
                ConnectTimeout = 10,
                TrustServerCertificate = true
            };
            return b.ConnectionString;
        }

        // POST api/screenbuilder/connect — test connection & list databases
        [HttpPost("connect")]
        public IActionResult Connect([FromBody] ConnectRequest req)
        {
            try
            {
                var dbs = new List<string>();
                using var con = new SqlConnection(BuildConn(req, "master"));
                con.Open();
                using var cmd = new SqlCommand("SELECT name FROM sys.databases WHERE name NOT IN ('master','tempdb','model','msdb') ORDER BY name", con);
                using var r = cmd.ExecuteReader();
                while (r.Read()) dbs.Add(r.GetString(0));
                string currentDb = string.IsNullOrWhiteSpace(req.Server) ? new SqlConnectionStringBuilder(_cfg["ConnectionStrings:cs"] ?? "").InitialCatalog : req.Database;
                return Ok(new { success = true, databases = dbs, currentDatabase = currentDb });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        // POST api/screenbuilder/tables — list tables & views
        [HttpPost("tables")]
        public IActionResult Tables([FromBody] ConnectRequest req)
        {
            try
            {
                var tables = new List<object>();
                var views = new List<object>();
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                using var cmd = new SqlCommand(
                    "SELECT name, type FROM sys.objects WHERE type IN ('U','V') AND is_ms_shipped = 0 ORDER BY name", con);
                using var r = cmd.ExecuteReader();
                while (r.Read())
                {
                    var item = new { name = r.GetString(0), type = r.GetString(1).Trim() };
                    if (item.type == "U") tables.Add(item);
                    else views.Add(item);
                }
                return Ok(new { success = true, tables, views });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        // POST api/screenbuilder/columns — get columns with full metadata
        [HttpPost("columns")]
        public IActionResult Columns([FromBody] TableRequest req)
        {
            try
            {
                var columns = new List<object>();
                using var con = new SqlConnection(BuildConn(req));
                con.Open();

                // Main columns
                const string sql = @"
SELECT c.name, t.name AS type_name, c.max_length, c.is_nullable, c.is_identity, c.is_computed,
       CAST(CASE WHEN EXISTS (
            SELECT 1 FROM sys.index_columns ic
            JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            WHERE i.is_primary_key = 1 AND ic.object_id = c.object_id AND ic.column_id = c.column_id)
       THEN 1 ELSE 0 END AS bit) AS is_pk
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID(@t)
ORDER BY c.column_id";

                using (var cmd = new SqlCommand(sql, con))
                {
                    cmd.Parameters.AddWithValue("@t", req.Table);
                    using var r = cmd.ExecuteReader();
                    while (r.Read())
                        columns.Add(new
                        {
                            name = r.GetString(0),
                            sqlType = r.GetString(1).ToLower(),
                            maxLength = Convert.ToInt32(r[2]),
                            isNullable = Convert.ToBoolean(r[3]),
                            isIdentity = Convert.ToBoolean(r[4]),
                            isComputed = Convert.ToBoolean(r[5]),
                            isPK = Convert.ToBoolean(r[6]),
                            notInDb = false
                        });
                }

                // View-only columns (from View that aren't in Table)
                if (!string.IsNullOrWhiteSpace(req.View) && !req.View.Equals(req.Table, StringComparison.OrdinalIgnoreCase))
                {
                    var existingNames = columns.Cast<dynamic>().Select(c => (string)c.name).ToHashSet(StringComparer.OrdinalIgnoreCase);
                    using var cmd2 = new SqlCommand(sql, con);
                    cmd2.Parameters.AddWithValue("@t", req.View);
                    using var r2 = cmd2.ExecuteReader();
                    while (r2.Read())
                    {
                        string name = r2.GetString(0);
                        if (existingNames.Contains(name)) continue;
                        columns.Add(new
                        {
                            name,
                            sqlType = r2.GetString(1).ToLower(),
                            maxLength = Convert.ToInt32(r2[2]),
                            isNullable = Convert.ToBoolean(r2[3]),
                            isIdentity = false,
                            isComputed = false,
                            isPK = false,
                            notInDb = true
                        });
                    }
                }

                return Ok(new { success = true, columns });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        // POST api/screenbuilder/resources — get G_Resources for auto-titles
        [HttpPost("resources")]
        public IActionResult Resources([FromBody] ConnectRequest req)
        {
            try
            {
                var resources = new Dictionary<string, object>();
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                using var cmd = new SqlCommand(
                    "IF OBJECT_ID('dbo.G_Resources') IS NOT NULL SELECT KeyRes, NameResAr, NameResEn FROM dbo.G_Resources", con);
                using var r = cmd.ExecuteReader();
                while (r.Read())
                {
                    string key = Convert.ToString(r[0]);
                    if (!string.IsNullOrWhiteSpace(key) && !resources.ContainsKey(key))
                        resources[key] = new { ar = Convert.ToString(r[1]), en = Convert.ToString(r[2]) };
                }
                return Ok(new { success = true, resources });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        // POST api/screenbuilder/search-functions — list G_SearchFrom functions
        [HttpPost("search-functions")]
        public IActionResult SearchFunctions([FromBody] ScanRequest req)
        {
            try
            {
                var functions = new List<string>();
                string path = Path.Combine(req.ProjectPath, "app", "ClientApp", "Shared", "G_SearchFrom.ts");
                if (System.IO.File.Exists(path))
                {
                    string content = System.IO.File.ReadAllText(path);
                    foreach (Match m in Regex.Matches(content, @"export\s+const\s+(\w+)\s*=\s*\("))
                        functions.Add(m.Groups[1].Value);
                }
                return Ok(new { success = true, functions });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        public class SearchFunctionColumn
        {
            public string field { get; set; } = "";
            public string title { get; set; } = "";
            public int width { get; set; } = 150;
            public bool IsVisible { get; set; } = true;
        }

        public class SearchFunctionDto
        {
            public string Name { get; set; } = "";
            public string Title { get; set; } = "";
            public string TableName { get; set; } = "";
            public string KeyColumn { get; set; } = "";
            public string ReturnField { get; set; } = "";
            public string DisplayField { get; set; } = "";
            public List<SearchFunctionColumn> Columns { get; set; } = new();
            public List<string> SearchColumns { get; set; } = new();
            public int PageSize { get; set; } = 20;
            public string OrderBy { get; set; } = "";
            public string OrderType { get; set; } = "ASC";
        }

        public class SaveSearchFunctionRequest : SearchFunctionDto
        {
            public string ProjectPath { get; set; } = "";
            public string OriginalName { get; set; } = "";   // for rename: current fn name before edit
        }

        public class DeleteSearchFunctionRequest
        {
            public string ProjectPath { get; set; } = "";
            public string Name { get; set; } = "";
        }

        // ---------- helpers for search functions ----------

        private static string SearchFromPath(string projectPath) =>
            Path.Combine(projectPath, "app", "ClientApp", "Shared", "G_SearchFrom.ts");

        private static string EscJs(string s) => (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");

        private static string BuildSearchBlock(string fnName, SearchFunctionDto cfg)
        {
            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"// ===== {fnName} — managed by ScreenBuilder =====");
            sb.AppendLine($"export const {fnName} = (_condition: string = \"\"): SearchModalConfig => {{");
            sb.AppendLine("  return {");
            sb.AppendLine($"    title: \"{EscJs(cfg.Title ?? fnName)}\",");
            sb.AppendLine($"    tableName: \"{EscJs(cfg.TableName)}\",");
            sb.AppendLine($"    keyColumn: \"{EscJs(cfg.KeyColumn)}\",");
            sb.AppendLine("    condition: _condition,");
            sb.AppendLine("    columns: [");
            foreach (var c in cfg.Columns)
            {
                string vis = c.IsVisible ? "" : ", IsVisible: false";
                sb.AppendLine($"      {{ field: \"{EscJs(c.field)}\", title: \"{EscJs(c.title)}\", width: {c.width}{vis} }},");
            }
            sb.AppendLine("    ],");
            sb.Append("    searchColumns: [");
            sb.Append(string.Join(", ", (cfg.SearchColumns ?? new()).Select(s => "\"" + EscJs(s) + "\"")));
            sb.AppendLine("],");
            sb.AppendLine($"    returnField: \"{EscJs(cfg.ReturnField)}\",");
            sb.AppendLine($"    displayField: \"{EscJs(cfg.DisplayField)}\",");
            sb.AppendLine($"    pageSize: {cfg.PageSize},");
            sb.AppendLine($"    orderBy: \"{EscJs(cfg.OrderBy)}\",");
            sb.AppendLine($"    orderType: \"{(cfg.OrderType == "DESC" ? "DESC" : "ASC")}\"");
            sb.AppendLine("  };");
            sb.AppendLine("};");
            return sb.ToString();
        }

        // Finds the full block for a function (comment banner + export const ... };)
        // returns (startIndex, length) or (-1, 0) if not found.
        private static (int start, int length) FindSearchBlock(string content, string fnName)
        {
            var m = Regex.Match(content, @"export\s+const\s+" + Regex.Escape(fnName) + @"\s*=\s*\(", RegexOptions.Multiline);
            if (!m.Success) return (-1, 0);
            int start = m.Index;
            // walk back to include a preceding banner comment line "// ===== fnName ..."
            int lineStart = content.LastIndexOf('\n', Math.Max(0, start - 1));
            if (lineStart >= 0)
            {
                var prevSegment = content.Substring(0, lineStart);
                var bannerMatch = Regex.Match(prevSegment, @"(?m)^[ \t]*//\s*={2,}\s*" + Regex.Escape(fnName) + @"\b.*$", RegexOptions.RightToLeft);
                if (bannerMatch.Success && prevSegment.Length - bannerMatch.Index - bannerMatch.Length < 4)
                    start = bannerMatch.Index;
            }
            // walk forward: find the closing "};" of the arrow function
            int braceDepth = 0;
            int i = m.Index;
            int end = -1;
            bool entered = false;
            while (i < content.Length)
            {
                char c = content[i];
                if (c == '{') { braceDepth++; entered = true; }
                else if (c == '}')
                {
                    braceDepth--;
                    if (entered && braceDepth == 0)
                    {
                        // consume trailing ';' and newline
                        int j = i + 1;
                        while (j < content.Length && (content[j] == ';' || content[j] == '\r' || content[j] == '\n' || content[j] == ' ' || content[j] == '\t'))
                        {
                            j++;
                            if (content[j - 1] == '\n') break;
                        }
                        end = j;
                        break;
                    }
                }
                i++;
            }
            if (end < 0) return (-1, 0);
            return (start, end - start);
        }

        // Extracts a JS-ish string/number value for a known key inside a function block.
        private static string ExtractStringProp(string block, string key)
        {
            var m = Regex.Match(block, @"\b" + Regex.Escape(key) + @"\s*:\s*""((?:[^""\\]|\\.)*)""");
            return m.Success ? Regex.Unescape(m.Groups[1].Value) : "";
        }
        private static int ExtractIntProp(string block, string key, int def = 0)
        {
            var m = Regex.Match(block, @"\b" + Regex.Escape(key) + @"\s*:\s*(\d+)");
            return m.Success ? int.Parse(m.Groups[1].Value) : def;
        }

        private static SearchFunctionDto ParseBlock(string fnName, string block)
        {
            var dto = new SearchFunctionDto
            {
                Name = fnName,
                Title = ExtractStringProp(block, "title"),
                TableName = ExtractStringProp(block, "tableName"),
                KeyColumn = ExtractStringProp(block, "keyColumn"),
                ReturnField = ExtractStringProp(block, "returnField"),
                DisplayField = ExtractStringProp(block, "displayField"),
                PageSize = ExtractIntProp(block, "pageSize", 20),
                OrderBy = ExtractStringProp(block, "orderBy"),
                OrderType = ExtractStringProp(block, "orderType") == "DESC" ? "DESC" : "ASC",
            };
            // columns array
            var colsMatch = Regex.Match(block, @"columns\s*:\s*\[(.*?)\]", RegexOptions.Singleline);
            if (colsMatch.Success)
            {
                foreach (Match c in Regex.Matches(colsMatch.Groups[1].Value, @"\{\s*field\s*:\s*""((?:[^""\\]|\\.)*)""\s*,\s*title\s*:\s*""((?:[^""\\]|\\.)*)""\s*,\s*width\s*:\s*(\d+)\s*(?:,\s*IsVisible\s*:\s*(true|false))?\s*\}"))
                {
                    dto.Columns.Add(new SearchFunctionColumn
                    {
                        field = Regex.Unescape(c.Groups[1].Value),
                        title = Regex.Unescape(c.Groups[2].Value),
                        width = int.Parse(c.Groups[3].Value),
                        IsVisible = c.Groups[4].Value != "false",
                    });
                }
            }
            // searchColumns array
            var scMatch = Regex.Match(block, @"searchColumns\s*:\s*\[([^\]]*)\]");
            if (scMatch.Success)
            {
                foreach (Match s in Regex.Matches(scMatch.Groups[1].Value, @"""((?:[^""\\]|\\.)*)"""))
                    dto.SearchColumns.Add(Regex.Unescape(s.Groups[1].Value));
            }
            return dto;
        }

        // POST api/screenbuilder/list-search-functions — returns all parsed configs
        [HttpPost("list-search-functions")]
        public IActionResult ListSearchFunctions([FromBody] ScanRequest req)
        {
            try
            {
                var list = new List<SearchFunctionDto>();
                string path = SearchFromPath(req.ProjectPath);
                if (System.IO.File.Exists(path))
                {
                    string content = System.IO.File.ReadAllText(path);
                    foreach (Match m in Regex.Matches(content, @"export\s+const\s+(\w+)\s*=\s*\("))
                    {
                        string name = m.Groups[1].Value;
                        var (start, len) = FindSearchBlock(content, name);
                        if (start < 0) continue;
                        list.Add(ParseBlock(name, content.Substring(start, len)));
                    }
                }
                return Ok(new { success = true, functions = list });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        // POST api/screenbuilder/save-search-function — create or update
        [HttpPost("save-search-function")]
        public IActionResult SaveSearchFunction([FromBody] SaveSearchFunctionRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.ProjectPath)) return Ok(new { success = false, error = "projectPath missing" });
                if (string.IsNullOrWhiteSpace(req.Name) || !Regex.IsMatch(req.Name, @"^[A-Za-z_][A-Za-z0-9_]*$"))
                    return Ok(new { success = false, error = "اسم الدالة لازم يبدأ بحرف أو _ (English letters, numbers, _)" });
                if (string.IsNullOrWhiteSpace(req.TableName)) return Ok(new { success = false, error = "الجدول مطلوب" });
                if (req.Columns == null || req.Columns.Count == 0) return Ok(new { success = false, error = "لازم عمود واحد على الأقل" });

                string path = SearchFromPath(req.ProjectPath);
                if (!System.IO.File.Exists(path)) return Ok(new { success = false, error = "G_SearchFrom.ts not found" });

                string content = System.IO.File.ReadAllText(path);
                string fnName = req.Name.StartsWith("Search_") ? req.Name : "Search_" + req.Name;
                string original = string.IsNullOrWhiteSpace(req.OriginalName) ? fnName : req.OriginalName;
                string block = BuildSearchBlock(fnName, req);

                // if renaming or updating existing
                var (start, len) = FindSearchBlock(content, original);
                if (start >= 0)
                {
                    // new name must not clash with a different existing function
                    if (!string.Equals(original, fnName, StringComparison.Ordinal))
                    {
                        var (clashStart, _) = FindSearchBlock(content, fnName);
                        if (clashStart >= 0) return Ok(new { success = false, error = $"الدالة {fnName} موجودة بالفعل" });
                    }
                    content = content.Substring(0, start) + block + content.Substring(start + len);
                    System.IO.File.WriteAllText(path, content);
                    return Ok(new { success = true, name = fnName, updated = true });
                }

                // append (new)
                var (existingStart, _) = FindSearchBlock(content, fnName);
                if (existingStart >= 0) return Ok(new { success = false, error = $"الدالة {fnName} موجودة بالفعل" });
                if (!content.EndsWith("\n")) content += Environment.NewLine;
                System.IO.File.WriteAllText(path, content + Environment.NewLine + block);
                return Ok(new { success = true, name = fnName, updated = false });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        // POST api/screenbuilder/delete-search-function
        [HttpPost("delete-search-function")]
        public IActionResult DeleteSearchFunction([FromBody] DeleteSearchFunctionRequest req)
        {
            try
            {
                string path = SearchFromPath(req.ProjectPath);
                if (!System.IO.File.Exists(path)) return Ok(new { success = false, error = "G_SearchFrom.ts not found" });
                string content = System.IO.File.ReadAllText(path);
                var (start, len) = FindSearchBlock(content, req.Name);
                if (start < 0) return Ok(new { success = false, error = "not found" });
                content = content.Substring(0, start) + content.Substring(start + len);
                System.IO.File.WriteAllText(path, content);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        // POST api/screenbuilder/execute-sql — run permissions SQL
        [HttpPost("execute-sql")]
        public IActionResult ExecuteSql([FromBody] ExecuteSqlRequest req)
        {
            try
            {
                var messages = new List<string>();
                var batches = Regex.Split(req.Sql, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                using var con = new SqlConnection(BuildConn(req));
                con.InfoMessage += (s, e) => messages.Add(e.Message);
                con.Open();
                foreach (var batch in batches)
                {
                    if (string.IsNullOrWhiteSpace(batch)) continue;
                    using var cmd = new SqlCommand(batch, con);
                    cmd.ExecuteNonQuery();
                }
                return Ok(new { success = true, messages });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        public class SaveFilesRequest
        {
            public string ProjectPath { get; set; } = "";   // فولدر Frontend/App
            public string DbScriptsPath { get; set; } = ""; // فولدر Database (اختياري)
            public string Module { get; set; } = "";
            public string TsCode { get; set; } = "";
            public string TsxCode { get; set; } = "";
            public string SqlCode { get; set; } = "";
            public List<ResourceEntry> Resources { get; set; } = new();
        }

        public class ResourceEntry
        {
            public string Key { get; set; } = "";
            public string En { get; set; } = "";
            public string Ar { get; set; } = "";
        }

        static readonly System.Text.UTF8Encoding Utf8NoBom = new(false);

        // POST api/screenbuilder/save-files — كتابة الشاشة في المشروع (زي زرار الحفظ في الأداة الديسك توب)
        [HttpPost("save-files")]
        public IActionResult SaveFiles([FromBody] SaveFilesRequest req)
        {
            var done = new List<string>();
            try
            {
                if (!Regex.IsMatch(req.Module ?? "", @"^[A-Za-z_][A-Za-z0-9_]*$"))
                    return Ok(new { success = false, error = "Invalid module name (letters, numbers and _ only)" });
                string app = Path.GetFullPath(req.ProjectPath ?? "");
                string clientApp = Path.Combine(app, "app", "ClientApp");
                if (!Directory.Exists(clientApp))
                    return Ok(new { success = false, error = "ClientApp folder not found at: " + clientApp });
                if (string.IsNullOrWhiteSpace(req.TsCode) || string.IsNullOrWhiteSpace(req.TsxCode))
                    return Ok(new { success = false, error = "Nothing to save" });

                string pageDir = Path.Combine(clientApp, req.Module);
                bool existed = Directory.Exists(pageDir);
                if (existed)
                {
                    string bak = Path.Combine(app, "_Backup_Screens", req.Module + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss"));
                    Directory.CreateDirectory(bak);
                    foreach (var f in Directory.GetFiles(pageDir)) System.IO.File.Copy(f, Path.Combine(bak, Path.GetFileName(f)), true);
                    done.Add("backup: _Backup_Screens/" + Path.GetFileName(bak));
                }
                Directory.CreateDirectory(pageDir);
                System.IO.File.WriteAllText(Path.Combine(pageDir, req.Module + ".ts"), req.TsCode, Utf8NoBom);
                System.IO.File.WriteAllText(Path.Combine(pageDir, "page.tsx"), req.TsxCode, Utf8NoBom);
                done.Add($"{req.Module}.ts + page.tsx");

                string cssDir = Path.Combine(app, "public", "StyleDesign", "Pages", req.Module);
                Directory.CreateDirectory(cssDir);
                foreach (var (suffix, label) in new[] { ("EN", "English (LTR)"), ("AR", "Arabic (RTL)") })
                {
                    string css = Path.Combine(cssDir, req.Module + suffix + ".css");
                    if (!System.IO.File.Exists(css)) System.IO.File.WriteAllText(css, $"/* {req.Module} - {label} */\r\n", Utf8NoBom);
                }
                done.Add("CSS");

                // Phase 5: Routes.tsx is no longer edited - any unlisted page gets HomeLayout automatically (Phase 4)
                done.Add("Routes.tsx untouched (automatic HomeLayout)");
                done.Add(UpdateResources(Path.Combine(clientApp, "Shared", "Resources.ts"), req.Resources ?? new()));

                if (!string.IsNullOrWhiteSpace(req.SqlCode))
                {
                    string dbDir = string.IsNullOrWhiteSpace(req.DbScriptsPath)
                        ? Path.GetFullPath(Path.Combine(app, "..", "..", "Database"))
                        : Path.GetFullPath(req.DbScriptsPath);
                    if (Directory.Exists(dbDir))
                    {
                        System.IO.File.WriteAllText(Path.Combine(dbDir, $"Add_{req.Module}_Module.sql"), req.SqlCode, Utf8NoBom);
                        done.Add($"Database/Add_{req.Module}_Module.sql");
                    }
                    else done.Add("Database folder not found (SQL not written)");
                }

                return Ok(new { success = true, existed, messages = done });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message, messages = done });
            }
        }

        static string UpdateRoutes(string path, string module)
        {
            if (!System.IO.File.Exists(path)) return "Routes.tsx not found — add manually: " + module + ": HomeLayout,";
            string s = System.IO.File.ReadAllText(path);
            if (Regex.IsMatch(s, @"^[ \t]*" + module + @"[ \t]*:", RegexOptions.Multiline)) return "Routes.tsx (already there)";
            string nl = s.Contains("\r\n") ? "\r\n" : "\n";
            var m = Regex.Match(s, @"^([ \t]*)Home[ \t]*:[ \t]*HomeLayout[ \t]*,[ \t]*\r?\n", RegexOptions.Multiline);
            if (m.Success) s = s.Insert(m.Index + m.Length, m.Groups[1].Value + module + ": HomeLayout," + nl);
            else
            {
                var m2 = Regex.Match(s, @"const[ \t]+routes[^{]*\{[ \t]*\r?\n");
                if (!m2.Success) return "Routes.tsx: place not found — add manually: " + module + ": HomeLayout,";
                s = s.Insert(m2.Index + m2.Length, "    " + module + ": HomeLayout," + nl);
            }
            System.IO.File.WriteAllText(path, s, Utf8NoBom);
            return "Routes.tsx";
        }

        static string JsStr(string v) => (v ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");

        static string UpdateResources(string path, List<ResourceEntry> entries)
        {
            if (entries.Count == 0) return "Resources.ts (nothing to add)";
            if (!System.IO.File.Exists(path)) return "Resources.ts not found";
            string s = System.IO.File.ReadAllText(path);
            string nl = s.Contains("\r\n") ? "\r\n" : "\n";
            var arMatch = Regex.Match(s, @"^[ \t]*ar[ \t]*:[ \t]*\{", RegexOptions.Multiline);
            if (!arMatch.Success || s.LastIndexOf("};", StringComparison.Ordinal) < arMatch.Index)
                return "Resources.ts: unknown layout — copy the entries manually";
            string enPart = s.Substring(0, arMatch.Index);
            string arPart = s.Substring(arMatch.Index);
            arPart = UpsertKeys(arPart, entries, true, nl);
            enPart = UpsertKeys(enPart, entries, false, nl);
            System.IO.File.WriteAllText(path, enPart + arPart, Utf8NoBom);
            return "Resources.ts";
        }

        static string UpsertKeys(string part, List<ResourceEntry> entries, bool isAr, string nl)
        {
            var missing = new List<ResourceEntry>();
            foreach (var e in entries)
            {
                if (!Regex.IsMatch(e.Key ?? "", @"^[A-Za-z_][A-Za-z0-9_]*$")) continue;
                string val = JsStr(isAr ? e.Ar : e.En);
                var rx = new Regex(@"(?m)^([ \t]*" + Regex.Escape(e.Key) + @"[ \t]*:[ \t]*)""(?:[^""\\]|\\.)*""");
                if (rx.IsMatch(part)) part = rx.Replace(part, m => m.Groups[1].Value + "\"" + val + "\"", 1);
                else missing.Add(e);
            }
            if (missing.Count == 0) return part;

            int closeIdx;
            if (isAr)
            {
                int end = part.LastIndexOf("};", StringComparison.Ordinal);
                closeIdx = part.LastIndexOf('}', end - 1);
            }
            else closeIdx = part.LastIndexOf('}');

            var lines = new List<string> { "    // ===== " + (missing[0].Key.Split('_')[0]) + " =====" };
            for (int i = 0; i < missing.Count; i++)
                lines.Add("    " + missing[i].Key + ": \"" + JsStr(isAr ? missing[i].Ar : missing[i].En) + "\"" + (i < missing.Count - 1 ? "," : ""));
            string block = string.Join(nl, lines);

            int p = closeIdx - 1;
            while (p >= 0 && char.IsWhiteSpace(part[p])) p--;
            string head = part.Substring(0, p + 1);
            if (p >= 0 && part[p] != ',' && part[p] != '{') head += ",";
            return head + nl + block + part.Substring(p + 1);
        }

        // =====================================================================
        //  Phase 5 endpoints (all parameterized / validated identifiers)
        // =====================================================================
        static readonly Regex IdentRx = new(@"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$", RegexOptions.Compiled);

        static bool BadCondition(string c) =>
            !string.IsNullOrWhiteSpace(c) && (c.Contains(';') || c.Contains("--") || c.Contains("/*") || Regex.IsMatch(c, @"\b(drop|delete|insert|update|alter|truncate|exec|execute|create|grant|revoke|shutdown|xp_)\b", RegexOptions.IgnoreCase));

        // POST api/screenbuilder/project-info — guess the Frontend/App folder from the backend location
        [HttpPost("project-info")]
        public IActionResult ProjectInfo()
        {
            try
            {
                string root = _env.ContentRootPath;
                var dir = new DirectoryInfo(root);
                for (int i = 0; i < 5 && dir != null; i++, dir = dir.Parent)
                {
                    string cand = Path.Combine(dir.FullName, "Frontend", "App");
                    if (Directory.Exists(Path.Combine(cand, "app", "ClientApp")))
                        return Ok(new { success = true, projectPath = cand, dbScriptsPath = Path.Combine(dir.FullName, "Database") });
                }
                return Ok(new { success = false, error = "Frontend/App not found next to the backend" });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        // POST api/screenbuilder/procs — stored procedures list
        [HttpPost("procs")]
        public IActionResult Procs([FromBody] ConnectRequest req)
        {
            try
            {
                var list = new List<object>();
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                using var cmd = new SqlCommand("SELECT SCHEMA_NAME(schema_id), name FROM sys.procedures WHERE is_ms_shipped = 0 ORDER BY name", con);
                using var r = cmd.ExecuteReader();
                while (r.Read()) list.Add(new { schema = r.GetString(0), name = r.GetString(1) });
                return Ok(new { success = true, procs = list });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        public class NameRequest : ConnectRequest { public string Name { get; set; } = ""; }

        // POST api/screenbuilder/proc-params — parameters (sys.parameters) + first result-set columns
        [HttpPost("proc-params")]
        public IActionResult ProcParams([FromBody] NameRequest req)
        {
            try
            {
                if (!IdentRx.IsMatch(req.Name ?? "")) return Ok(new { success = false, error = "Invalid procedure name" });
                var pars = new List<object>();
                var cols = new List<object>();
                string colsWarning = "";
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                using (var cmd = new SqlCommand(@"SELECT p.name, t.name, p.max_length, p.is_output, p.has_default_value
FROM sys.parameters p JOIN sys.types t ON t.user_type_id = p.user_type_id
WHERE p.object_id = OBJECT_ID(@n) AND p.parameter_id > 0 ORDER BY p.parameter_id", con))
                {
                    cmd.Parameters.AddWithValue("@n", req.Name);
                    using var r = cmd.ExecuteReader();
                    while (r.Read())
                        pars.Add(new { name = r.GetString(0).TrimStart('@'), sqlType = r.GetString(1).ToLower(), maxLength = Convert.ToInt32(r[2]), isOutput = Convert.ToBoolean(r[3]), hasDefault = Convert.ToBoolean(r[4]) });
                }
                try
                {
                    using var cmd2 = new SqlCommand("SELECT name, system_type_name FROM sys.dm_exec_describe_first_result_set_for_object(OBJECT_ID(@n), NULL) WHERE is_hidden = 0 ORDER BY column_ordinal", con);
                    cmd2.Parameters.AddWithValue("@n", req.Name);
                    using var r2 = cmd2.ExecuteReader();
                    while (r2.Read())
                        cols.Add(new { name = r2.IsDBNull(0) ? "" : r2.GetString(0), sqlType = r2.IsDBNull(1) ? "" : r2.GetString(1) });
                }
                catch (Exception ex) { colsWarning = ex.Message; }
                return Ok(new { success = true, parameters = pars, columns = cols, columnsWarning = colsWarning });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        public class DistinctRequest : ConnectRequest
        {
            public string Table { get; set; } = "";
            public string Column { get; set; } = "";
            public string Condition { get; set; } = "";
            public int Top { get; set; } = 50;
        }

        // POST api/screenbuilder/distinct-values — sample of distinct values (for chips / options preview)
        [HttpPost("distinct-values")]
        public IActionResult DistinctValues([FromBody] DistinctRequest req)
        {
            try
            {
                if (!IdentRx.IsMatch(req.Table ?? "") || !IdentRx.IsMatch(req.Column ?? "")) return Ok(new { success = false, error = "Invalid table/column" });
                if (BadCondition(req.Condition)) return Ok(new { success = false, error = "Condition not allowed" });
                int top = Math.Clamp(req.Top, 1, 200);
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                using (var chk = new SqlCommand("SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(@t) AND name = @c", con))
                {
                    chk.Parameters.AddWithValue("@t", req.Table); chk.Parameters.AddWithValue("@c", req.Column);
                    if (Convert.ToInt32(chk.ExecuteScalar()) == 0) return Ok(new { success = false, error = "Column not found" });
                }
                string tbl = string.Join(".", req.Table.Split('.').Select(x => "[" + x + "]"));
                string sql = $"SELECT DISTINCT TOP ({top}) [{req.Column}] FROM {tbl}" + (string.IsNullOrWhiteSpace(req.Condition) ? "" : $" WHERE ({req.Condition})") + $" ORDER BY [{req.Column}]";
                var vals = new List<string>();
                using var cmd = new SqlCommand(sql, con);
                using var r = cmd.ExecuteReader();
                while (r.Read()) vals.Add(r.IsDBNull(0) ? "" : Convert.ToString(r[0]) ?? "");
                return Ok(new { success = true, values = vals });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        public class ConditionRequest : ConnectRequest { public string Table { get; set; } = ""; public string Condition { get; set; } = ""; }

        // POST api/screenbuilder/validate-condition — TOP 1 with the condition (single SELECT, no ; or comments)
        [HttpPost("validate-condition")]
        public IActionResult ValidateCondition([FromBody] ConditionRequest req)
        {
            try
            {
                if (!IdentRx.IsMatch(req.Table ?? "")) return Ok(new { success = false, error = "Invalid table" });
                if (BadCondition(req.Condition)) return Ok(new { success = false, error = "Condition not allowed (; -- /* or write keywords)" });
                // placeholders {row.X} {session.X} {filter.X} are replaced by NULL/0 just to test the syntax
                string cond = Regex.Replace(req.Condition ?? "", @"\{[A-Za-z_.]+\}", "NULL");
                string tbl = string.Join(".", req.Table.Split('.').Select(x => "[" + x + "]"));
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                using var cmd = new SqlCommand($"SELECT TOP 1 1 FROM {tbl}" + (string.IsNullOrWhiteSpace(cond) ? "" : $" WHERE ({cond})"), con);
                cmd.ExecuteScalar();
                return Ok(new { success = true });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        public class RegisterRequest : ConnectRequest
        {
            public string Module { get; set; } = "";
            public string DescA { get; set; } = "";
            public string DescE { get; set; } = "";
            public string Menu { get; set; } = "";
            public string Type { get; set; } = "S";
            public int Sort { get; set; } = 0;
            public string Icon { get; set; } = "";
            public string Color { get; set; } = "indigo";
            public bool AllowCustom { get; set; } = false;
        }

        // POST api/screenbuilder/register-module — dbo.Sys_RegisterModule (menu + admin permissions)
        [HttpPost("register-module")]
        public IActionResult RegisterModule([FromBody] RegisterRequest req)
        {
            try
            {
                if (!Regex.IsMatch(req.Module ?? "", @"^[A-Za-z_][A-Za-z0-9_]*$")) return Ok(new { success = false, error = "Invalid module code" });
                string type = req.Type == "M" ? "M" : "S";
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                using (var chk = new SqlCommand("SELECT OBJECT_ID('dbo.Sys_RegisterModule')", con))
                    if (chk.ExecuteScalar() is DBNull or null) return Ok(new { success = false, error = "dbo.Sys_RegisterModule not found - run Database/Phase4_Permissions.sql first" });
                int sort = req.Sort;
                if (sort <= 0)
                {
                    using var s = new SqlCommand("SELECT ISNULL(MAX(MODULE_SORT),0)+1 FROM dbo.Sys_Modules WHERE ISNULL(MODULE_MENU,N'') = @m", con);
                    s.Parameters.AddWithValue("@m", req.Menu ?? "");
                    sort = Convert.ToInt32(s.ExecuteScalar());
                }
                using var cmd = new SqlCommand("dbo.Sys_RegisterModule", con) { CommandType = CommandType.StoredProcedure };
                cmd.Parameters.AddWithValue("@MODULE_CODE", req.Module);
                cmd.Parameters.AddWithValue("@MODULE_DESCA", req.DescA ?? "");
                cmd.Parameters.AddWithValue("@MODULE_DESCE", req.DescE ?? "");
                cmd.Parameters.AddWithValue("@MODULE_MENU", req.Menu ?? "");
                cmd.Parameters.AddWithValue("@MODULE_TYPE", type);
                cmd.Parameters.AddWithValue("@MODULE_SORT", sort);
                cmd.Parameters.AddWithValue("@Url_Image", req.Icon ?? "");
                cmd.Parameters.AddWithValue("@Icon_Color", req.Color ?? "");
                cmd.Parameters.AddWithValue("@AllowCustom", req.AllowCustom);
                var messages = new List<string>();
                con.InfoMessage += (s2, e) => messages.Add(e.Message);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true, sort, messages });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        public class ConfigRequest : ConnectRequest
        {
            public string Module { get; set; } = "";
            public string Json { get; set; } = "";
            public int Version { get; set; } = 5;
        }

        static bool ConfigTableExists(SqlConnection con)
        {
            using var c = new SqlCommand("SELECT OBJECT_ID('dbo.Sys_ScreenConfig')", con);
            var o = c.ExecuteScalar();
            return o != null && o is not DBNull;
        }

        // POST api/screenbuilder/config-save — upsert v5 JSON into Sys_ScreenConfig (skipped with a warning when the table is missing)
        [HttpPost("config-save")]
        public IActionResult ConfigSave([FromBody] ConfigRequest req)
        {
            try
            {
                if (!Regex.IsMatch(req.Module ?? "", @"^[A-Za-z_][A-Za-z0-9_]*$")) return Ok(new { success = false, error = "Invalid module code" });
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                if (!ConfigTableExists(con)) return Ok(new { success = false, missingTable = true, error = "Sys_ScreenConfig not found - run Database/Phase5_ScreenBuilder.sql" });
                using var cmd = new SqlCommand(@"
IF EXISTS (SELECT 1 FROM dbo.Sys_ScreenConfig WHERE ModuleCode = @m)
    UPDATE dbo.Sys_ScreenConfig SET ConfigJson = @j, Version = @v, UpdatedAt = GETDATE(), UpdatedBy = @u WHERE ModuleCode = @m
ELSE
    INSERT INTO dbo.Sys_ScreenConfig (ModuleCode, ConfigJson, Version, UpdatedAt, UpdatedBy) VALUES (@m, @j, @v, GETDATE(), @u)", con);
                cmd.Parameters.AddWithValue("@m", req.Module);
                cmd.Parameters.AddWithValue("@j", req.Json ?? "");
                cmd.Parameters.AddWithValue("@v", req.Version);
                cmd.Parameters.AddWithValue("@u", "admin");
                cmd.ExecuteNonQuery();
                return Ok(new { success = true });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        // POST api/screenbuilder/config-list — screens stored in Sys_ScreenConfig
        [HttpPost("config-list")]
        public IActionResult ConfigList([FromBody] ConnectRequest req)
        {
            try
            {
                var list = new List<object>();
                using var con = new SqlConnection(BuildConn(req));
                con.Open();
                if (!ConfigTableExists(con)) return Ok(new { success = true, missingTable = true, configs = list });
                using var cmd = new SqlCommand("SELECT ModuleCode, Version, UpdatedAt, ConfigJson FROM dbo.Sys_ScreenConfig ORDER BY ModuleCode", con);
                using var r = cmd.ExecuteReader();
                while (r.Read())
                    list.Add(new { module = r.GetString(0), version = r.IsDBNull(1) ? 0 : Convert.ToInt32(r[1]), updatedAt = r.IsDBNull(2) ? "" : Convert.ToDateTime(r[2]).ToString("s"), json = r.IsDBNull(3) ? "" : r.GetString(3) });
                return Ok(new { success = true, configs = list });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        public class ReadScreenRequest { public string ProjectPath { get; set; } = ""; public string Module { get; set; } = ""; }

        // POST api/screenbuilder/read-screen — raw <Module>.ts (for best-effort import of screens without a settings marker)
        [HttpPost("read-screen")]
        public IActionResult ReadScreen([FromBody] ReadScreenRequest req)
        {
            try
            {
                if (!Regex.IsMatch(req.Module ?? "", @"^[A-Za-z_][A-Za-z0-9_]*$")) return Ok(new { success = false, error = "Invalid module" });
                string f = Path.Combine(Path.GetFullPath(req.ProjectPath ?? ""), "app", "ClientApp", req.Module, req.Module + ".ts");
                if (!System.IO.File.Exists(f)) return Ok(new { success = false, error = "File not found" });
                return Ok(new { success = true, text = System.IO.File.ReadAllText(f) });
            }
            catch (Exception ex) { return Ok(new { success = false, error = ex.Message }); }
        }

        // POST api/screenbuilder/scan-screens — scan project for existing screens
        [HttpPost("scan-screens")]
        public IActionResult ScanScreens([FromBody] ScanRequest req)
        {
            try
            {
                var screens = new List<object>();
                string clientApp = Path.Combine(req.ProjectPath, "app", "ClientApp");
                if (!Directory.Exists(clientApp))
                    return Ok(new { success = false, error = "ClientApp folder not found at: " + clientApp });

                foreach (var dir in Directory.GetDirectories(clientApp).OrderBy(x => x))
                {
                    string name = Path.GetFileName(dir);
                    string tsFile = Path.Combine(dir, name + ".ts");
                    if (!System.IO.File.Exists(tsFile)) continue;

                    string text = System.IO.File.ReadAllText(tsFile);
                    if (!Regex.IsMatch(text, @"const\s+TableName\s*=")) continue;

                    string screenType = "Grid";
                    bool hasSettings = false;
                    string settingsJson = "";

                    // Check for settings marker
                    var cpMarker = "// @CreatePageReact-Settings:";
                    var sbMarker = "// @ScreenBuilder-Settings:";
                    int idx = text.LastIndexOf(sbMarker);
                    if (idx < 0) idx = text.LastIndexOf(cpMarker);

                    if (idx >= 0)
                    {
                        hasSettings = true;
                        string line = text.Substring(idx);
                        int nl = line.IndexOf('\n');
                        if (nl >= 0) line = line.Substring(0, nl);
                        // Extract just the JSON part
                        int colonIdx = line.IndexOf(':');
                        if (colonIdx >= 0) settingsJson = line.Substring(colonIdx + 1).Trim();

                        if (text.Contains("\"screenType\":\"Tree\"")) screenType = "Tree";
                        else if (text.Contains("\"ScreenType\":\"MasterDetail\"") || text.Contains("\"screenType\":\"MasterDetail\"")) screenType = "MasterDetail";
                    }

                    // Extract table name
                    var tableMatch = Regex.Match(text, @"const\s+TableName\s*=\s*""([^""]+)""");
                    string table = tableMatch.Success ? tableMatch.Groups[1].Value : "";

                    screens.Add(new
                    {
                        name,
                        screenType,
                        table,
                        hasSettings,
                        settingsJson
                    });
                }

                return Ok(new { success = true, screens });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }
    }
}
