// =====================================================================================
//  GridScreenSettings.cs  —  إعدادات الشاشة اللي بتتحفظ جوه ملف الـ ts
//  (السطر // @CreatePageReact-Settings: {...} في آخر الملف)
//  البرنامج بيقراها عشان يفتح الشاشة تاني ويعدّلها بالظبط
// =====================================================================================

using System.Collections.Generic;

namespace UpdateNewModel
{
    public class GridScreenSettings
    {
        public int Version = 3;
        public string ScreenType = "Grid";     // Grid = جدول بسيط  |  MasterDetail = ماستر ديتيل

        public string Module = "";
        public string Table = "";              // الجدول اللي بيتحفظ فيه
        public string View = "";               // ماستر ديتيل: القالب اللي بيتعرض منه
        public string KeyColumn = "";
        public string TitleAr = "";
        public string TitleEn = "";
        public string SubAr = "";
        public string SubEn = "";
        public string Icon = "fa-table-list";
        public int PageSize = 10;

        public bool ProcessTrans;
        public string TrType = "";
        public bool FilterComp = true;
        public bool FilterBranch;
        public string ExtraCondition = "";
        public string OrderBy = "";
        public string OrderType = "DESC";
        public bool Insert = true;
        public bool Edit = true;
        public bool Delete = true;
        public bool Export = true;

        public bool Permissions = true;
        public string ParentMenu = "";
        public string IconColor = "indigo";
        public string Roles = "";

        public List<GridFieldSettings> Fields = new List<GridFieldSettings>();          // جدول بسيط: الأعمدة  |  ماستر ديتيل: حقول الماستر
        public List<GridFieldSettings> ListFields = new List<GridFieldSettings>();      // ماستر ديتيل: أعمدة القائمة
        public List<MdDetailSettings> Details = new List<MdDetailSettings>();           // ماستر ديتيل: التفاصيل
        public List<ValidationSettings> Validations = new List<ValidationSettings>();   // التحقق قبل الحفظ
    }

    public class GridFieldSettings
    {
        public string Field = "";
        public string TitleAr = "";
        public string TitleEn = "";
        public bool InGrid = true;
        public bool InForm = true;
        public bool Required;
        public bool Search;
        public bool InFilter = true;
        public string InputType = "text";
        public string Options = "";        // 0=قبض=Receipt;1=صرف=Payment
        public string SearchFn = "";       // Search_Users
        public string SearchCond = "";     // USER_Status = 1
        public string FillFrom = "";       // ItemName=NameA;UnitPrice=SalePrice   (ماستر ديتيل)
        public string Formula = "";        // Qty * UnitPrice                        (ماستر ديتيل)
        public string Auto = "";           // CompCode / BranchCode / UserID / FinYear
        public string DefaultValue = "";   // قيمة ثابتة أو today
        public int Width = 150;
        public int Order = 99;
    }

    public class MdDetailSettings
    {
        public string TitleAr = "";
        public string TitleEn = "";
        public string Table = "";          // بيتحفظ فيه
        public string View = "";           // بيتعرض منه
        public string KeyColumn = "";
        public string ForeignKey = "";     // العمود اللي بيربط بالماستر
        public string Totals = "";         // TotalAmount=Total;ItemsCount=count
        public string OrderBy = "";
        public List<GridFieldSettings> Fields = new List<GridFieldSettings>();
    }

    public class ValidationSettings
    {
        public int Detail;                 // 0 = الماستر ، 1..5 = التفاصيل
        public string Type = "required";
        public string Field = "";
        public string When = "both";       // both / insert / update
        public string Operator = "";
        public string CompareTo = "";
        public string Value = "";
        public string Min = "";
        public string Max = "";
        public string Pattern = "";
        public string Table = "";
        public string Condition = "";
        public string Code = "";           // custom: كود JavaScript بيرجّع رسالة أو null
        public string MessageAr = "";
        public string MessageEn = "";
    }
}
