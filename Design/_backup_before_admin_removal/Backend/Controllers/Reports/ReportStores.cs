using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using GateWay.App;
using Microsoft.Data.SqlClient;
using Newtonsoft.Json;

namespace ERP.Reports
{
    // =================================================================================
    //  FileReportStore  - works with NO database objects (default tonight).
    //    App_Data/Reports/definitions.json   : [ReportDef...] (params inside)
    //    App_Data/Reports/layouts.json       : [LayoutMeta...] (no MRT text)
    //    App_Data/Reports/layouts/{id}.mrt   : the Stimulsoft layout text
    //  Every write goes to a temp file first and is then swapped in (atomic on the same volume).
    // =================================================================================
    public class FileReportStore : IReportStore
    {
        private readonly string _root;
        private static readonly SemaphoreSlim _gate = new SemaphoreSlim(1, 1);
        public string Mode => "files";

        public FileReportStore(string root)
        {
            _root = root;
            Directory.CreateDirectory(Path.Combine(_root, "layouts"));
        }

        private string DefsPath => Path.Combine(_root, "definitions.json");
        private string LayoutsPath => Path.Combine(_root, "layouts.json");
        private string MrtPath(int id) => Path.Combine(_root, "layouts", id.ToString() + ".mrt");

        private static void AtomicWrite(string path, string text)
        {
            var tmp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            File.WriteAllText(tmp, text, new UTF8Encoding(false));
            if (File.Exists(path)) File.Replace(tmp, path, null);
            else File.Move(tmp, path);
        }

        private List<T> ReadList<T>(string path)
        {
            if (!File.Exists(path)) return new List<T>();
            var txt = File.ReadAllText(path, Encoding.UTF8);
            if (string.IsNullOrWhiteSpace(txt)) return new List<T>();
            return JsonConvert.DeserializeObject<List<T>>(txt) ?? new List<T>();
        }

        private void WriteList<T>(string path, List<T> list) =>
            AtomicWrite(path, JsonConvert.SerializeObject(list, Formatting.Indented));

        private async Task<R> Locked<R>(Func<R> f)
        {
            await _gate.WaitAsync();
            try { return f(); } finally { _gate.Release(); }
        }

        public Task<List<ReportDef>> ListReports() =>
            Locked(() => ReadList<ReportDef>(DefsPath).OrderBy(r => r.ReportCode, StringComparer.OrdinalIgnoreCase).ToList());

        public Task<ReportDef> GetReport(string code) =>
            Locked(() => ReadList<ReportDef>(DefsPath).FirstOrDefault(r => string.Equals(r.ReportCode, code, StringComparison.OrdinalIgnoreCase)));

        public Task SaveReport(ReportDef def) => Locked<bool>(() =>
        {
            var list = ReadList<ReportDef>(DefsPath);
            var i = list.FindIndex(r => string.Equals(r.ReportCode, def.ReportCode, StringComparison.OrdinalIgnoreCase));
            def.UpdatedAt = DateTime.Now;
            if (i >= 0) { def.CreatedAt = list[i].CreatedAt ?? def.UpdatedAt; list[i] = def; }
            else { def.CreatedAt = def.UpdatedAt; list.Add(def); }
            WriteList(DefsPath, list);
            return true;
        });

        public Task DeleteReport(string code) => Locked<bool>(() =>
        {
            var list = ReadList<ReportDef>(DefsPath);
            list.RemoveAll(r => string.Equals(r.ReportCode, code, StringComparison.OrdinalIgnoreCase));
            WriteList(DefsPath, list);
            var ls = ReadList<LayoutMeta>(LayoutsPath);
            foreach (var l in ls.Where(x => string.Equals(x.ReportCode, code, StringComparison.OrdinalIgnoreCase)).ToList())
            {
                try { if (File.Exists(MrtPath(l.LayoutId))) File.Delete(MrtPath(l.LayoutId)); } catch { }
                ls.Remove(l);
            }
            WriteList(LayoutsPath, ls);
            return true;
        });

        public Task<List<LayoutMeta>> ListLayouts(string code, bool withMrt) => Locked(() =>
        {
            var ls = ReadList<LayoutMeta>(LayoutsPath).Where(x => string.Equals(x.ReportCode, code, StringComparison.OrdinalIgnoreCase)).ToList();
            foreach (var l in ls)
                l.LayoutMrt = withMrt && File.Exists(MrtPath(l.LayoutId)) ? File.ReadAllText(MrtPath(l.LayoutId), Encoding.UTF8) : null;
            return ls;
        });

        public Task<LayoutMeta> GetLayout(int layoutId) => Locked(() =>
        {
            var l = ReadList<LayoutMeta>(LayoutsPath).FirstOrDefault(x => x.LayoutId == layoutId);
            if (l != null) l.LayoutMrt = File.Exists(MrtPath(layoutId)) ? File.ReadAllText(MrtPath(layoutId), Encoding.UTF8) : null;
            return l;
        });

        private static bool SameScope(LayoutMeta a, LayoutMeta b) =>
            string.Equals(a.ReportCode, b.ReportCode, StringComparison.OrdinalIgnoreCase) && a.Scope == b.Scope && a.CompCode == b.CompCode && a.BranchCode == b.BranchCode;

        public Task<int> SaveLayout(LayoutMeta layout) => Locked(() =>
        {
            var ls = ReadList<LayoutMeta>(LayoutsPath);
            layout.UpdatedAt = DateTime.Now;
            var existing = layout.LayoutId > 0 ? ls.FirstOrDefault(x => x.LayoutId == layout.LayoutId) : null;
            if (existing == null)
            {
                layout.LayoutId = ls.Count == 0 ? 1 : ls.Max(x => x.LayoutId) + 1;
                if (!ls.Any(x => SameScope(x, layout))) layout.IsDefault = true;   // first layout of a scope is the default
                ls.Add(layout);
            }
            else
            {
                ls[ls.IndexOf(existing)] = layout;
            }
            if (layout.IsDefault) foreach (var o in ls.Where(x => x.LayoutId != layout.LayoutId && SameScope(x, layout))) o.IsDefault = false;
            var mrt = layout.LayoutMrt;
            var copy = JsonConvert.DeserializeObject<List<LayoutMeta>>(JsonConvert.SerializeObject(ls));
            foreach (var c in copy) c.LayoutMrt = null;
            if (mrt != null) AtomicWrite(MrtPath(layout.LayoutId), mrt);
            WriteList(LayoutsPath, copy);
            return layout.LayoutId;
        });

        public Task DeleteLayout(int layoutId) => Locked<bool>(() =>
        {
            var ls = ReadList<LayoutMeta>(LayoutsPath);
            var l = ls.FirstOrDefault(x => x.LayoutId == layoutId);
            if (l == null) return false;
            ls.Remove(l);
            if (l.IsDefault)
            {
                var next = ls.Where(x => SameScope(x, l)).OrderByDescending(x => x.UpdatedAt).FirstOrDefault();
                if (next != null) next.IsDefault = true;
            }
            WriteList(LayoutsPath, ls);
            try { if (File.Exists(MrtPath(layoutId))) File.Delete(MrtPath(layoutId)); } catch { }
            return true;
        });

        public Task SetDefault(int layoutId) => Locked<bool>(() =>
        {
            var ls = ReadList<LayoutMeta>(LayoutsPath);
            var l = ls.FirstOrDefault(x => x.LayoutId == layoutId);
            if (l == null) return false;
            foreach (var o in ls.Where(x => SameScope(x, l))) o.IsDefault = o.LayoutId == layoutId;
            WriteList(LayoutsPath, ls);
            return true;
        });
    }

    // =================================================================================
    //  DbReportStore - used automatically once Database/Phase7_Reports.sql has been run
    // =================================================================================
    public class DbReportStore : IReportStore
    {
        public string Mode => "database";

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

        private static object V(object o) => o ?? DBNull.Value;
        private static string S(SqlDataReader r, string n) { var i = r.GetOrdinal(n); return r.IsDBNull(i) ? null : Convert.ToString(r.GetValue(i)); }
        private static int? I(SqlDataReader r, string n) { var i = r.GetOrdinal(n); return r.IsDBNull(i) ? (int?)null : Convert.ToInt32(r.GetValue(i)); }
        private static DateTime? D(SqlDataReader r, string n) { var i = r.GetOrdinal(n); return r.IsDBNull(i) ? (DateTime?)null : Convert.ToDateTime(r.GetValue(i)); }

        public async Task<List<ReportDef>> ListReports()
        {
            using var c = await Open();
            var list = new List<ReportDef>();
            using (var cmd = new SqlCommand("SELECT ReportCode,NameA,NameE,Kind,MODULE_CODE,ProcName,IsActive,CreatedAt,UpdatedAt FROM dbo.Sys_Reports ORDER BY ReportCode", c))
            using (var r = await cmd.ExecuteReaderAsync())
                while (await r.ReadAsync())
                    list.Add(new ReportDef { ReportCode = S(r, "ReportCode"), NameA = S(r, "NameA"), NameE = S(r, "NameE"), Kind = S(r, "Kind"), MODULE_CODE = S(r, "MODULE_CODE"), ProcName = S(r, "ProcName"), IsActive = Convert.ToInt32(r["IsActive"]) != 0, CreatedAt = D(r, "CreatedAt"), UpdatedAt = D(r, "UpdatedAt") });
            using (var cmd = new SqlCommand("SELECT ReportCode,ParamName,Source,SourceValue,SortOrder FROM dbo.Sys_ReportParams ORDER BY ReportCode,SortOrder", c))
            using (var r = await cmd.ExecuteReaderAsync())
                while (await r.ReadAsync())
                {
                    var d = list.FirstOrDefault(x => x.ReportCode == S(r, "ReportCode"));
                    d?.Params.Add(new ReportParamDef { ParamName = S(r, "ParamName"), Source = S(r, "Source"), SourceValue = S(r, "SourceValue"), SortOrder = I(r, "SortOrder") ?? 0 });
                }
            return list;
        }

        public async Task<ReportDef> GetReport(string code) =>
            (await ListReports()).FirstOrDefault(r => string.Equals(r.ReportCode, code, StringComparison.OrdinalIgnoreCase));

        public async Task SaveReport(ReportDef d)
        {
            using var c = await Open();
            using var tx = c.BeginTransaction();
            using (var cmd = new SqlCommand(@"
IF EXISTS (SELECT 1 FROM dbo.Sys_Reports WHERE ReportCode=@c)
  UPDATE dbo.Sys_Reports SET NameA=@a,NameE=@e,Kind=@k,MODULE_CODE=@m,ProcName=@p,IsActive=@act,UpdatedAt=GETDATE() WHERE ReportCode=@c
ELSE
  INSERT dbo.Sys_Reports(ReportCode,NameA,NameE,Kind,MODULE_CODE,ProcName,IsActive,CreatedAt,UpdatedAt) VALUES(@c,@a,@e,@k,@m,@p,@act,GETDATE(),GETDATE());
DELETE dbo.Sys_ReportParams WHERE ReportCode=@c;", c, tx))
            {
                cmd.Parameters.AddWithValue("@c", d.ReportCode);
                cmd.Parameters.AddWithValue("@a", V(d.NameA));
                cmd.Parameters.AddWithValue("@e", V(d.NameE));
                cmd.Parameters.AddWithValue("@k", d.Kind ?? "list");
                cmd.Parameters.AddWithValue("@m", V(d.MODULE_CODE));
                cmd.Parameters.AddWithValue("@p", V(d.ProcName));
                cmd.Parameters.AddWithValue("@act", d.IsActive ? 1 : 0);
                await cmd.ExecuteNonQueryAsync();
            }
            int n = 0;
            foreach (var p in d.Params ?? new List<ReportParamDef>())
            {
                using var cmd = new SqlCommand("INSERT dbo.Sys_ReportParams(ReportCode,ParamName,Source,SourceValue,SortOrder) VALUES(@c,@n,@s,@v,@o)", c, tx);
                cmd.Parameters.AddWithValue("@c", d.ReportCode);
                cmd.Parameters.AddWithValue("@n", p.ParamName);
                cmd.Parameters.AddWithValue("@s", p.Source ?? "const");
                cmd.Parameters.AddWithValue("@v", V(p.SourceValue));
                cmd.Parameters.AddWithValue("@o", p.SortOrder == 0 ? ++n : p.SortOrder);
                await cmd.ExecuteNonQueryAsync();
            }
            tx.Commit();
        }

        public async Task DeleteReport(string code)
        {
            using var c = await Open();
            using var tx = c.BeginTransaction();
            foreach (var t in new[] { "Sys_ReportLayouts", "Sys_ReportParams", "Sys_Reports" })
            {
                using var cmd = new SqlCommand("DELETE dbo." + t + " WHERE ReportCode=@c", c, tx);
                cmd.Parameters.AddWithValue("@c", code);
                await cmd.ExecuteNonQueryAsync();
            }
            tx.Commit();
        }

        private static LayoutMeta Read(SqlDataReader r, bool withMrt) => new LayoutMeta
        {
            LayoutId = Convert.ToInt32(r["LayoutId"]), ReportCode = S(r, "ReportCode"), Scope = S(r, "Scope"), CompCode = I(r, "CompCode"), BranchCode = I(r, "BranchCode"),
            PaperSize = S(r, "PaperSize"), Orientation = S(r, "Orientation"), MarginsJson = S(r, "MarginsJson"), IsDefault = Convert.ToInt32(r["IsDefault"]) != 0,
            UpdatedAt = D(r, "UpdatedAt"), UpdatedBy = S(r, "UpdatedBy"), LayoutMrt = withMrt ? S(r, "LayoutMrt") : null
        };

        public async Task<List<LayoutMeta>> ListLayouts(string code, bool withMrt)
        {
            using var c = await Open();
            using var cmd = new SqlCommand("SELECT LayoutId,ReportCode,Scope,CompCode,BranchCode,PaperSize,Orientation,MarginsJson,IsDefault,UpdatedAt,UpdatedBy" + (withMrt ? ",LayoutMrt" : "") + " FROM dbo.Sys_ReportLayouts WHERE ReportCode=@c ORDER BY LayoutId", c);
            cmd.Parameters.AddWithValue("@c", code);
            var list = new List<LayoutMeta>();
            using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync()) list.Add(Read(r, withMrt));
            return list;
        }

        public async Task<LayoutMeta> GetLayout(int layoutId)
        {
            using var c = await Open();
            using var cmd = new SqlCommand("SELECT LayoutId,ReportCode,Scope,CompCode,BranchCode,PaperSize,Orientation,MarginsJson,IsDefault,UpdatedAt,UpdatedBy,LayoutMrt FROM dbo.Sys_ReportLayouts WHERE LayoutId=@i", c);
            cmd.Parameters.AddWithValue("@i", layoutId);
            using var r = await cmd.ExecuteReaderAsync();
            return await r.ReadAsync() ? Read(r, true) : null;
        }

        public async Task<int> SaveLayout(LayoutMeta l)
        {
            using var c = await Open();
            using var tx = c.BeginTransaction();
            bool exists = false;
            if (l.LayoutId > 0)
            {
                using var chk = new SqlCommand("SELECT COUNT(*) FROM dbo.Sys_ReportLayouts WHERE LayoutId=@i", c, tx);
                chk.Parameters.AddWithValue("@i", l.LayoutId);
                exists = Convert.ToInt32(await chk.ExecuteScalarAsync()) > 0;
            }
            bool scopeHasAny;
            using (var chk = new SqlCommand("SELECT COUNT(*) FROM dbo.Sys_ReportLayouts WHERE ReportCode=@c AND Scope=@s AND ISNULL(CompCode,-1)=ISNULL(@cc,-1) AND ISNULL(BranchCode,-1)=ISNULL(@bc,-1)", c, tx))
            {
                chk.Parameters.AddWithValue("@c", l.ReportCode); chk.Parameters.AddWithValue("@s", l.Scope);
                chk.Parameters.AddWithValue("@cc", V(l.CompCode)); chk.Parameters.AddWithValue("@bc", V(l.BranchCode));
                scopeHasAny = Convert.ToInt32(await chk.ExecuteScalarAsync()) > 0;
            }
            if (!exists && !scopeHasAny) l.IsDefault = true;
            if (exists)
            {
                using var cmd = new SqlCommand("UPDATE dbo.Sys_ReportLayouts SET Scope=@s,CompCode=@cc,BranchCode=@bc,PaperSize=@p,Orientation=@o,MarginsJson=@m,LayoutMrt=ISNULL(@mrt,LayoutMrt),IsDefault=@d,UpdatedAt=GETDATE(),UpdatedBy=@u WHERE LayoutId=@i", c, tx);
                Fill(cmd, l); cmd.Parameters.AddWithValue("@i", l.LayoutId);
                await cmd.ExecuteNonQueryAsync();
            }
            else
            {
                using var cmd = new SqlCommand("INSERT dbo.Sys_ReportLayouts(ReportCode,Scope,CompCode,BranchCode,PaperSize,Orientation,MarginsJson,LayoutMrt,IsDefault,UpdatedAt,UpdatedBy) OUTPUT INSERTED.LayoutId VALUES(@c,@s,@cc,@bc,@p,@o,@m,@mrt,@d,GETDATE(),@u)", c, tx);
                Fill(cmd, l); cmd.Parameters.AddWithValue("@c", l.ReportCode);
                l.LayoutId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            }
            if (l.IsDefault)
            {
                using var cmd = new SqlCommand("UPDATE dbo.Sys_ReportLayouts SET IsDefault=0 WHERE ReportCode=@c AND Scope=@s AND ISNULL(CompCode,-1)=ISNULL(@cc,-1) AND ISNULL(BranchCode,-1)=ISNULL(@bc,-1) AND LayoutId<>@i", c, tx);
                cmd.Parameters.AddWithValue("@c", l.ReportCode); cmd.Parameters.AddWithValue("@s", l.Scope);
                cmd.Parameters.AddWithValue("@cc", V(l.CompCode)); cmd.Parameters.AddWithValue("@bc", V(l.BranchCode)); cmd.Parameters.AddWithValue("@i", l.LayoutId);
                await cmd.ExecuteNonQueryAsync();
            }
            tx.Commit();
            return l.LayoutId;
        }

        private static void Fill(SqlCommand cmd, LayoutMeta l)
        {
            cmd.Parameters.AddWithValue("@s", l.Scope);
            cmd.Parameters.AddWithValue("@cc", V(l.CompCode));
            cmd.Parameters.AddWithValue("@bc", V(l.BranchCode));
            cmd.Parameters.AddWithValue("@p", l.PaperSize ?? "A4");
            cmd.Parameters.AddWithValue("@o", l.Orientation ?? "portrait");
            cmd.Parameters.AddWithValue("@m", V(l.MarginsJson));
            cmd.Parameters.AddWithValue("@mrt", V(l.LayoutMrt));
            cmd.Parameters.AddWithValue("@d", l.IsDefault ? 1 : 0);
            cmd.Parameters.AddWithValue("@u", V(l.UpdatedBy));
        }

        public async Task DeleteLayout(int layoutId)
        {
            using var c = await Open();
            using var cmd = new SqlCommand("DELETE dbo.Sys_ReportLayouts WHERE LayoutId=@i", c);
            cmd.Parameters.AddWithValue("@i", layoutId);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task SetDefault(int layoutId)
        {
            using var c = await Open();
            using var cmd = new SqlCommand(@"UPDATE x SET IsDefault = CASE WHEN x.LayoutId=@i THEN 1 ELSE 0 END
FROM dbo.Sys_ReportLayouts x JOIN dbo.Sys_ReportLayouts y ON y.LayoutId=@i AND x.ReportCode=y.ReportCode AND x.Scope=y.Scope AND ISNULL(x.CompCode,-1)=ISNULL(y.CompCode,-1) AND ISNULL(x.BranchCode,-1)=ISNULL(y.BranchCode,-1)", c);
            cmd.Parameters.AddWithValue("@i", layoutId);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}
