"use client";

// =====================================================================================
//  📄 TestPage.ts   ←  ملف المنطق (البيزنس) بس — مفيش فيه ولا سطر HTML
// -------------------------------------------------------------------------------------
//  الشاشة متقسمة لملفين زي شاشة Login بالظبط:
//     1) TestPage.ts  (الملف ده)  : البيانات + الدوال + الكلام مع قاعدة البيانات
//     2) page.tsx                  : الشكل بس (HTML)، وبياخد كل حاجة من هنا
//
//  الشاشة بتشتغل على جدول  D_B_RE_UnitFloor  (الأدوار)، وبتوريك 4 حاجات:
//     ① كروت إحصائيات بتتحمل بـ  SQL.Select  من  CallDataBase
//     ② زرار "اختار مستخدم" بيفتح نافذة بحث جاهزة من  G_SearchFrom
//     ③ جدول كامل  DynamicGrid  (إضافة / تعديل / حذف / بحث / فلتر / تصدير)
//     ④ دبل كليك على صف بيعرض بياناته في كارت
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Sys } from "../Shared/SystemTools";
import { useSys } from "../Shared/SystemUsing";
import { SQL } from "../Shared/CallDataBase";
import { Search_Users } from "../Shared/G_SearchFrom";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { ActionButtonConfig } from "../Shared/Components/Import/DynamicGrid";
import { FilterFieldConfig, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";

// =======================
// #region ثوابت الشاشة (بتتكتب مرة واحدة)
// =======================

// اسم الجدول والمفتاح بتاعه — لو عايز تعمل شاشة جديدة غيّر دول بس
const TableName = "D_B_RE_UnitFloor";
const KeyColumn = "FloorID";

// شروط الفلتر السريع (الكروت اللي فوق)
// الشرط ده بيروح للجدول في  condition  والجدول بيعيد تحميل نفسه لوحده لما يتغير
export type StatusFilter = "all" | "active" | "stopped";
const StatusConditions: Record<StatusFilter, string> = {
  all: "",
  active: "Status = 1",
  stopped: "ISNULL(Status, 0) <> 1",
};

// فلاتر بتتطبق أول ما الشاشة تفتح (فاضية دلوقتي)
// لازم تكون برا الدالة عشان متتعملش من جديد كل مرة
const DefaultFilters: ActiveFilter[] = [];

// #endregion

// =======================
// TestPage
// =======================
export function TestPage() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return; // عشان InitalizeComponent تشتغل مرة واحدة بس
    didRun.current = true;
    InitalizeComponent();
  }, []);

  // =======================
  // #region UsingSystem Glopal  (حاجات جاية من useSys)
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
  const lang = useSys((s) => s.lang);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  // الشركة والفرع اللي المستخدم اختارهم في شاشة LoginCompany
  const CompCode = Session?.CurrentEnvironment?.CompCode || 1;
  const BranchCode = Session?.CurrentEnvironment?.BranchCode || 1;
  // #endregion

  // =======================
  // #region State  (القيم اللي الشاشة بتعرضها)
  // =======================
  const [stats, setStats] = useState({ total: 0, active: 0, stopped: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [gridKey, setGridKey] = useState(0);              // لما يزيد، الجدول بيعيد تحميل نفسه
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(true);
  // #endregion

  // دالة صغيرة للترجمة جوه الملف ده (للعناوين والرسايل)
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  function InitalizeComponent() {
    LoadStatistics();
  }

  // =======================
  // #region ① CallDataBase — تحميل الإحصائيات
  // =======================
  //  SQL.Select( اسم_الجدول , الشرط , الأعمدة_المطلوبة )
  //  بيرجع  { data: [...الصفوف] , totalCount: عددهم }
  //  هنا بنجيب عمودين بس (FloorID و Status) عشان الطلب يبقى خفيف
  async function LoadStatistics() {
    setStatsLoading(true);
    try {
      const res = await SQL.Select(TableName, "", [KeyColumn, "Status"]);
      const rows = res.data;

      setStats({
        total: rows.length,
        active: rows.filter((r) => r.Status == 1).length,
        stopped: rows.filter((r) => r.Status != 1).length,
      });
    } catch (err) {
      console.error(err);
      Sys.ShowMessage("Failed to load statistics", "فشل تحميل الإحصائيات", "error");
    } finally {
      setStatsLoading(false);
    }
  }
  // #endregion

  // =======================
  // #region Events Elements Html  (الأحداث اللي الأزرار بتنادي عليها)
  // =======================

  // دوس على كارت → الجدول يعرض الصفوف بتاعته بس
  function ChangeStatusFilter(filter: StatusFilter) {
    setStatusFilter(filter);
  }

  // زرار تحديث → يحمّل الجدول والإحصائيات من جديد
  function RefreshAll() {
    setGridKey((k) => k + 1);
    LoadStatistics();
  }

  function ToggleHelp() {
    setShowHelp((v) => !v);
  }

  // ---------- ② G_SearchFrom : نافذة بحث المستخدمين ----------
  function OpenUserSearch() {
    setIsUserSearchOpen(true);
  }

  function CloseUserSearch() {
    setIsUserSearchOpen(false);
  }

  //  value = قيمة  returnField  من إعدادات البحث (هنا USER_NAME)
  //  row   = الصف كله بكل أعمدته
  function OnSelectUser(value: any, row: any) {
    setSelectedUser(row);
    setIsUserSearchOpen(false);
    Sys.ShowMessage("User selected: " + value, "تم اختيار المستخدم: " + value, "success");
  }

  function ClearSelectedUser() {
    setSelectedUser(null);
  }

  // ---------- ④ الصف المختار ----------
  function ShowRowDetails(row: any) {
    setSelectedRow(row);
  }

  function ClearSelectedRow() {
    setSelectedRow(null);
  }

  // ---------- أزرار الإجراءات اللي جنب كل صف ----------
  function OnPrint(row: any, id: any) {
    Sys.ShowMessage("Print record " + id, "طباعة السجل رقم " + id, "info");
  }

  function OnCopy(row: any, id: any) {
    navigator.clipboard.writeText(JSON.stringify(row));
    Sys.ShowMessage("Record " + id + " copied", "تم نسخ السجل رقم " + id, "success");
  }
  // #endregion

  // =======================
  // #region ③ إعدادات الجدول DynamicGrid
  // =======================
  //  ⚠️ مهم: الأعمدة والفلاتر لازم تكون جوه  useMemo
  //  لأن الجدول بيعيد تحميل البيانات كل ما الأعمدة تتغير،
  //  ولو اتعملت من جديد في كل مرة هيفضل يحمّل على طول.

  // نفس نافذة البحث، بنستخدمها في الزرار وفي الفورم
  //  Search_Users( الشرط )  جاية من  G_SearchFrom.ts
  const UserSearchConfig = useMemo(() => Search_Users("USER_Status = 1"), []);

  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "FloorID",                 // اسم العمود في قاعدة البيانات
        title: t("ID", "الرقم"),          // العنوان اللي بيظهر
        type: "number",
        width: 90,
        editable: false,                  // مش بيظهر في فورم التعديل
        insertable: false,                // مش بيظهر في فورم الإضافة (ترقيم تلقائي)
        IsSave: true,                     // بيتبعت مع الحفظ (لازم للمفتاح)
        IsSearchColumn: true,             // البحث السريع بيدوّر فيه
        SortFieldInEditAndAdd: 1,         // ترتيبه في الفورم
      },
      {
        field: "DescAr",
        title: t("Description (Arabic)", "الوصف عربي"),
        inputType: "textarea",
        rows: 3,
        placeholder: "الوصف باللغة العربية",
        width: 250,
        IsRequired: true,                 // إجباري
        IsSave: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "DescEn",
        title: t("Description (English)", "الوصف إنجليزي"),
        inputType: "textarea",
        rows: 3,
        placeholder: "Description in English",
        width: 250,
        IsSave: true,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        inputType: "select",              // في الفورم بيظهر قايمة اختيار
        selectOptions: [
          { value: 1, label: t("Active", "نشط") },
          { value: 0, label: t("Stopped", "موقوف") },
        ],
        DefaultValue: 1,                  // القيمة الافتراضية في الإضافة
        width: 110,
        IsRequired: true,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 4,
        // 👈 شكل الحالة جوه الجدول (الشارة الملونة) متعرّف في page.tsx لأنه HTML
      },
      {
        // ② نفس نافذة بحث المستخدمين بس جوه فورم الإضافة والتعديل
        field: "Test_UserName",
        title: t("User (test)", "مستخدم (تجربة)"),
        inputType: "search",              // بيظهر حقل وجنبه زرار 🔍
        searchModal: UserSearchConfig,
        placeholder: t("Press 🔍 to pick", "دوس 🔍 للاختيار"),
        IsSave: false,                    // ⚠️ مش بيتحفظ لأنه مش عمود في الجدول
        IsVisibleDisplayInGrid: false,    // مش بيظهر في الجدول، في الفورم بس
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 5,
      },
    ],
    [IsLangEN, UserSearchConfig]
  );

  // حقول الفلتر المتقدم (زرار الفلتر جوه الجدول)
  //  field لازم يكون اسم عمود حقيقي في الجدول
  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "FloorID", label: t("ID", "الرقم"), type: "number", sortOrder: 1 },
      { field: "DescAr", label: t("Description (Arabic)", "الوصف عربي"), type: "text", sortOrder: 2 },
      { field: "DescEn", label: t("Description (English)", "الوصف إنجليزي"), type: "text", sortOrder: 3 },
      {
        field: "Status",
        label: t("Status", "الحالة"),
        type: "select",
        options: [
          { value: "1", label: t("Active", "نشط") },
          { value: "0", label: t("Stopped", "موقوف") },
        ],
        sortOrder: 4,
      },
      //  ② وكمان ينفع تحط نافذة البحث في الفلتر، بس لازم يكون في عمود حقيقي يتفلتر بيه:
      //  { field: "CreatedBy", label: "المستخدم", type: "search", searchModal: UserSearchConfig, sortOrder: 5 },
    ],
    [IsLangEN]
  );

  // أزرار إضافية جنب كل صف (icon هنا نص عادي عشان الملف ده مفيهوش HTML)
  const ExtraActions = useMemo<ActionButtonConfig[]>(
    () => [
      {
        key: "details",
        label: t("Details", "تفاصيل"),
        icon: "📋",
        onClick: (row: any) => ShowRowDetails(row),
        isVisible: true,
      },
    ],
    [IsLangEN]
  );
  // #endregion

  // =======================
  // UI  (كل اللي page.tsx محتاجه)
  // =======================
  const state = {
    IsLangEN,
    lang,
    IsDark,
    stats,
    statsLoading,
    statusFilter,
    gridKey,
    isUserSearchOpen,
    selectedUser,
    selectedRow,
    showHelp,
  };

  const actions = {
    ChangeStatusFilter,
    RefreshAll,
    ToggleHelp,
    OpenUserSearch,
    CloseUserSearch,
    OnSelectUser,
    ClearSelectedUser,
    ShowRowDetails,
    ClearSelectedRow,
    OnPrint,
    OnCopy,
  };

  // كل إعدادات الجدول في مكان واحد
  const grid = {
    TableName,
    KeyColumn,
    Condition: StatusConditions[statusFilter],
    CompCode,
    BranchCode,
    Columns,
    FilterFields,
    DefaultFilters,
    ExtraActions,
    UserSearchConfig,
  };

  return {
    ...state,
    ...actions,
    grid,
  };
}
