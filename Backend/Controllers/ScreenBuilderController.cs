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

                        if (text.Contains("\"ScreenType\":\"MasterDetail\""))
                            screenType = "MasterDetail";
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
