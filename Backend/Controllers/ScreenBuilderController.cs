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
    public class ScreenBuilderController : ControllerBase
    {
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

        static string BuildConn(ConnectRequest r, string db = null)
        {
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
                return Ok(new { success = true, databases = dbs });
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

                done.Add(UpdateRoutes(Path.Combine(clientApp, "Routes.tsx"), req.Module));
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
                        else if (text.Contains("\"ScreenType\":\"MasterDetail\"")) screenType = "MasterDetail";
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
