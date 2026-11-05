using System;
using System.Collections.Generic;

// =====================================================================================
//  Phase 7 - Reports: data shapes shared by ReportsController and the two stores
//  (files under App_Data/Reports  OR  tables Sys_Reports / Sys_ReportParams / Sys_ReportLayouts).
// =====================================================================================
namespace ERP.Reports
{
    public class ReportParamDef
    {
        public string ParamName { get; set; }          // procedure parameter name (without @)
        public string Source { get; set; } = "const";  // filter | session | const | trid
        public string SourceValue { get; set; }        // filter field / session name / constant / key column
        public int SortOrder { get; set; }
    }

    public class ReportDef
    {
        public string ReportCode { get; set; }
        public string NameA { get; set; }
        public string NameE { get; set; }
        public string Kind { get; set; } = "list";     // list | transaction
        public string MODULE_CODE { get; set; }        // screen whose PRINT permission is required
        public string ProcName { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<ReportParamDef> Params { get; set; } = new List<ReportParamDef>();
    }

    public class LayoutMeta
    {
        public int LayoutId { get; set; }
        public string ReportCode { get; set; }
        public string Scope { get; set; } = "all";     // all | company | branch
        public int? CompCode { get; set; }
        public int? BranchCode { get; set; }
        public string PaperSize { get; set; } = "A4";  // A4 | A5 | Letter | Thermal80 | Thermal58 | Custom
        public string Orientation { get; set; } = "portrait";
        public string MarginsJson { get; set; }        // {"left":1,"right":1,"top":1,"bottom":1,"customWidth":..,"customHeight":..} (cm)
        public string LayoutMrt { get; set; }          // Stimulsoft .mrt (JSON text) - null in list responses
        public bool IsDefault { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string UpdatedBy { get; set; }
    }

    public interface IReportStore
    {
        string Mode { get; }
        System.Threading.Tasks.Task<List<ReportDef>> ListReports();
        System.Threading.Tasks.Task<ReportDef> GetReport(string code);
        System.Threading.Tasks.Task SaveReport(ReportDef def);
        System.Threading.Tasks.Task DeleteReport(string code);
        System.Threading.Tasks.Task<List<LayoutMeta>> ListLayouts(string code, bool withMrt);
        System.Threading.Tasks.Task<LayoutMeta> GetLayout(int layoutId);
        System.Threading.Tasks.Task<int> SaveLayout(LayoutMeta layout);
        System.Threading.Tasks.Task DeleteLayout(int layoutId);
        System.Threading.Tasks.Task SetDefault(int layoutId);
    }
}
