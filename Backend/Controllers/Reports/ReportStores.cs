using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GateWay.App;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json;

namespace ERP.Reports
{
    // =================================================================================
    //  FileReportStore  - read-only fallback when the Sys_Reports* tables do not exist.
    //    App_Data/Reports/definitions.json      : [ReportDef...] (params inside)
    //    App_Data/Reports/layouts.json          : [LayoutMeta...]
    //    App_Data/Reports/layouts/{id}.json     : rf-report/1 layout (LayoutFormat = json)
    //    App_Data/Reports/layouts/{id}.mrt      : old Stimulsoft layout (LayoutFormat = mrt, not returned)
    // =================================================================================
    public class FileReportStore : IReportStore
    {
        private readonly string _root;
        public string Mode => "files";

        public FileReportStore(string root) { _root = root; }

        private string DefsPath => Path.Combine(_root, "definitions.json");
        private string LayoutsPath => Path.Combine(_root, "layouts.json");

        private List<T> ReadList<T>(string path)
        {
            if (!File.Exists(path)) return new List<T>();
            var txt = File.ReadAllText(path, Encoding.UTF8);
            if (string.IsNullOrWhiteSpace(txt)) return new List<T>();
            return JsonConvert.DeserializeObject<List<T>>(txt) ?? new List<T>();
        }

        public Task<ReportDef> GetReport(string code) =>
            Task.FromResult(ReadList<ReportDef>(DefsPath).FirstOrDefault(r => string.Equals(r.ReportCode, code, StringComparison.OrdinalIgnoreCase)));

        public Task<List<LayoutMeta>> ListLayouts(string code)
        {
            var ls = ReadList<LayoutMeta>(LayoutsPath).Where(x => string.Equals(x.ReportCode, code, StringComparison.OrdinalIgnoreCase)).ToList();
            foreach (var l in ls)
            {
                var jsonFile = Path.Combine(_root, "layouts", l.LayoutId + ".json");
                if (string.IsNullOrWhiteSpace(l.LayoutJson) && File.Exists(jsonFile)) l.LayoutJson = File.ReadAllText(jsonFile, Encoding.UTF8);
                l.LayoutFormat = string.IsNullOrWhiteSpace(l.LayoutJson) ? "mrt" : "json";
            }
            return Task.FromResult(ls);
        }
    }

    // =================================================================================
    //  DbReportStore - used automatically once Database/Phase7_Reports.sql has been run.
    //  LayoutFormat / LayoutJson come from Database/Phase10_Reports_Json.sql (read only if the columns exist).
    // =================================================================================
    public class DbReportStore : IReportStore
    {
        public string Mode => "database";

        private static DateTime _colsCheckedAt = DateTime.MinValue;
        private static bool _hasJsonCols;

        private static async Task<SqlConnection> Open()
        {
            var c = new SqlConnection(ConnectionString.connectionString);
            await c.OpenAsync();
            return c;
        }

        public static async Task<bool> TablesExist()
        {
            try
            {
                using var c = await Open();
                using var cmd = new SqlCommand("SELECT CASE WHEN OBJECT_ID('dbo.Sys_Reports','U') IS NOT NULL AND OBJECT_ID('dbo.Sys_ReportParams','U') IS NOT NULL AND OBJECT_ID('dbo.Sys_ReportLayouts','U') IS NOT NULL THEN 1 ELSE 0 END", c);
                return Convert.ToInt32(await cmd.ExecuteScalarAsync()) == 1;
            }
            catch { return false; }
        }

        private static async Task<bool> HasJsonColumns(SqlConnection c)
        {
            if ((DateTime.UtcNow - _colsCheckedAt).TotalSeconds < 60) return _hasJsonCols;
            using var cmd = new SqlCommand("SELECT CASE WHEN COL_LENGTH('dbo.Sys_ReportLayouts','LayoutFormat') IS NOT NULL AND COL_LENGTH('dbo.Sys_ReportLayouts','LayoutJson') IS NOT NULL THEN 1 ELSE 0 END", c);
            _hasJsonCols = Convert.ToInt32(await cmd.ExecuteScalarAsync()) == 1;
            _colsCheckedAt = DateTime.UtcNow;
            return _hasJsonCols;
        }

        private static string S(SqlDataReader r, string n) { var i = r.GetOrdinal(n); return r.IsDBNull(i) ? null : Convert.ToString(r.GetValue(i)); }
        private static int? I(SqlDataReader r, string n) { var i = r.GetOrdinal(n); return r.IsDBNull(i) ? (int?)null : Convert.ToInt32(r.GetValue(i)); }
        private static DateTime? D(SqlDataReader r, string n) { var i = r.GetOrdinal(n); return r.IsDBNull(i) ? (DateTime?)null : Convert.ToDateTime(r.GetValue(i)); }

        public async Task<ReportDef> GetReport(string code)
        {
            using var c = await Open();
            ReportDef def = null;
            using (var cmd = new SqlCommand("SELECT ReportCode,NameA,NameE,Kind,MODULE_CODE,ProcName,IsActive,CreatedAt,UpdatedAt FROM dbo.Sys_Reports WHERE ReportCode=@c", c))
            {
                cmd.Parameters.AddWithValue("@c", code ?? "");
                using var r = await cmd.ExecuteReaderAsync();
                if (await r.ReadAsync())
                    def = new ReportDef { ReportCode = S(r, "ReportCode"), NameA = S(r, "NameA"), NameE = S(r, "NameE"), Kind = S(r, "Kind"), MODULE_CODE = S(r, "MODULE_CODE"), ProcName = S(r, "ProcName"), IsActive = Convert.ToInt32(r["IsActive"]) != 0, CreatedAt = D(r, "CreatedAt"), UpdatedAt = D(r, "UpdatedAt") };
            }
            if (def == null) return null;
            using (var cmd = new SqlCommand("SELECT ParamName,Source,SourceValue,SortOrder FROM dbo.Sys_ReportParams WHERE ReportCode=@c ORDER BY SortOrder", c))
            {
                cmd.Parameters.AddWithValue("@c", def.ReportCode);
                using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    def.Params.Add(new ReportParamDef { ParamName = S(r, "ParamName"), Source = S(r, "Source"), SourceValue = S(r, "SourceValue"), SortOrder = I(r, "SortOrder") ?? 0 });
            }
            return def;
        }

        public async Task<List<LayoutMeta>> ListLayouts(string code)
        {
            using var c = await Open();
            var json = await HasJsonColumns(c);
            using var cmd = new SqlCommand("SELECT LayoutId,ReportCode,Scope,CompCode,BranchCode,PaperSize,Orientation,MarginsJson,IsDefault,UpdatedAt,UpdatedBy"
                + (json ? ",LayoutFormat,LayoutJson" : "") + " FROM dbo.Sys_ReportLayouts WHERE ReportCode=@c ORDER BY LayoutId", c);
            cmd.Parameters.AddWithValue("@c", code ?? "");
            var list = new List<LayoutMeta>();
            using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                list.Add(new LayoutMeta
                {
                    LayoutId = Convert.ToInt32(r["LayoutId"]), ReportCode = S(r, "ReportCode"), Scope = S(r, "Scope"), CompCode = I(r, "CompCode"), BranchCode = I(r, "BranchCode"),
                    PaperSize = S(r, "PaperSize"), Orientation = S(r, "Orientation"), MarginsJson = S(r, "MarginsJson"), IsDefault = Convert.ToInt32(r["IsDefault"]) != 0,
                    UpdatedAt = D(r, "UpdatedAt"), UpdatedBy = S(r, "UpdatedBy"),
                    LayoutFormat = json ? (S(r, "LayoutFormat") ?? "mrt") : "mrt",
                    LayoutJson = json ? S(r, "LayoutJson") : null
                });
            }
            return list;
        }
    }
}
