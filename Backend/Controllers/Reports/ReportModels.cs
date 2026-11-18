using System;
using System.Collections.Generic;

// =====================================================================================
//  Reports (runtime): data shapes shared by ReportsController and the two read-only stores
//  (tables Sys_Reports / Sys_ReportParams / Sys_ReportLayouts  OR  files under App_Data/Reports).
//  Definitions and layouts are written by ERP Studio.
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
        public string PaperSize { get; set; } = "A4";  // A4 | A5 | Letter | Thermal80 | Thermal58 | ...
        public string Orientation { get; set; } = "portrait";
        public string MarginsJson { get; set; }
        public string LayoutFormat { get; set; } = "mrt";  // json (rf-report/1) | mrt (old Stimulsoft, not rendered any more)
        public string LayoutJson { get; set; }         // rf-report/1 layout (Docs/Studio/05_Report_Layout_Format.md)
        public bool IsDefault { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string UpdatedBy { get; set; }
    }

    public interface IReportStore
    {
        string Mode { get; }
        System.Threading.Tasks.Task<ReportDef> GetReport(string code);
        System.Threading.Tasks.Task<List<LayoutMeta>> ListLayouts(string code);
    }
}
