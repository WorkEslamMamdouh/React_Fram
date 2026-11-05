"use client";

import { useMemo, useState, useCallback } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, FilterOption, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import type { ExcelGridConfig } from "../Shared/Components/Excel/ExcelTypes";
import { FormLayout } from "../Shared/Components/Import/FormLayout";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "TST_Customer";
const ViewName = "TST_Customer";
const KeyColumn = "CustomerID";
const TrType = "";
const RunProcessTrans = false;
const ModuleCode = "TstCustomer";   // MODULE_CODE للصلاحيات (فاضي = من غير صلاحيات)
// #endregion

// =======================
// TstCustomer  (Grid)
// =======================
export function TstCustomer() {
  // =======================
  // #region UsingSystem
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  const Env = Session?.CurrentEnvironment;
  const CompCode = Env?.CompCode || 1;
  const BranchCode = Env?.BranchCode || 1;
  const UserID = Env?.UserID || 0;
  const FinYear = Env?.FinYear || new Date().getFullYear();
  const UserName = Env?.Sys_CompanyAndUser?.USER_NAME || "";
  const Today = new Date().toISOString().substring(0, 10);
  const Now = new Date().toISOString().substring(0, 19);
  void UserID; void FinYear; void UserName; void Today; void Now;
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const [gridKey, setGridKey] = useState(0);
  function RefreshGrid() { setGridKey((k) => k + 1); }

  const Condition = `CompCode = ${CompCode}`;

  // قيم الفلاتر الحالية (بتتحدّث لما اليوزر يغيّر الفلتر) — بتستخدم في الدروب داون المتسلسل والأزرار
  const [filterVals, setFilterVals] = useState<Record<string, any>>({});
  void filterVals;
  const onFilterChange = useCallback((filters: ActiveFilter[]) => {
    const m: Record<string, any> = {};
    for (const f of filters) m[f.field] = f.type === "dateRange" ? { from: f.fromValue, to: f.toValue } : f.value;
    setFilterVals((prev) => (JSON.stringify(prev) === JSON.stringify(m) ? prev : m));
  }, []);

  const filterReady = true;   // الجريد مابيتعرضش قبل ما اختيارات الفلاتر تتحمل

  // ===== Excel: تحميل نموذج / استيراد (Phase 6) — بيتبعت لـ DynamicGrid (excel={...}) =====
  const ExcelCfg = useMemo<ExcelGridConfig>(
    () => ({
      enabled: true,
      templateName: "TstCustomer_Template",
      columns: ["Code","NameA","NameE","Phone","Email","CreditLimit","City","IsActive"],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CompCode, BranchCode]
  );

  const FormLayoutCells: FormLayout = [
    {"kind":"field","field":"Code","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"NameA","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"NameE","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"Phone","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"Email","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"CreditLimit","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"City","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"IsActive","span":4,"spanMd":6,"newRow":false},
  ];

  // =======================
  // #region الأعمدة
  // =======================
  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "CustomerID",
        title: t("Customer", "Customer"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "CompCode",
        title: t("Company Code", "كود الشركة"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: CompCode,
        visibleInView: false,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "Code",
        title: t("Code", "Code"),
        IsRequired: true,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "NameA",
        title: t("Name AR", "الاسم عربي"),
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "NameE",
        title: t("Name EN", "الاسم انجليزي"),
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "Phone",
        title: t("Phone", "Phone"),
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "Email",
        title: t("Email", "Email"),
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "CreditLimit",
        title: t("Credit Limit", "Credit Limit"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "City",
        title: t("City", "City"),
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "IsActive",
        title: t("Active", "فعال"),
        type: "checkbox",
        inputType: "checkbox",
        IsRequired: true,
        SortFieldInEditAndAdd: 10,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "Code", label: t("Code", "Code"), type: "text", operator: "starts", sortOrder: 1 },
      { field: "NameA", label: t("Name AR", "الاسم عربي"), type: "text", operator: "contains", sortOrder: 2 },
      { field: "City", label: t("City", "City"), type: "text", sortOrder: 3 },
      { field: "IsActive", label: t("Active", "فعال"), type: "select", options: [{ value: 1, label: "✓" }, { value: 0, label: "✗" }], sortOrder: 4 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );
  // #endregion

  return {
    IsLangEN,
    IsDark,
    gridKey,
    RefreshGrid,
    filterReady,
    onFilterChange,
    grid: { TableName, ViewName, KeyColumn, TrType, RunProcessTrans, Condition, CompCode, BranchCode, Columns, FilterFields, ModuleCode, FormLayoutCells, Excel: ExcelCfg },
  };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Grid","Module":"TstCustomer","Table":"TST_Customer","View":"","KeyColumn":"CustomerID","TitleAr":"عملاء اختبار","TitleEn":"Test Customers","SubAr":"","SubEn":"","Icon":"fa-table-list","IconColor":"indigo","PageSize":10,"OrderBy":"","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"CustomerID","TitleAr":"Customer","TitleEn":"Customer","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"Code","TitleAr":"Code","TitleEn":"Code","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"NameA","TitleAr":"الاسم عربي","TitleEn":"Name AR","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"NameE","TitleAr":"الاسم انجليزي","TitleEn":"Name EN","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"Phone","TitleAr":"Phone","TitleEn":"Phone","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"Email","TitleAr":"Email","TitleEn":"Email","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"CreditLimit","TitleAr":"Credit Limit","TitleEn":"Credit Limit","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8},{"Field":"City","TitleAr":"City","TitleEn":"City","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"IsActive","TitleAr":"فعال","TitleEn":"Active","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10}],"ListFields":[],"Details":[],"Validations":[]}
// @ScreenBuilder-Settings: {"version":5,"screenType":"Grid","module":"TstCustomer","table":"TST_Customer","view":"","keyColumn":"CustomerID","titleAr":"عملاء اختبار","titleEn":"Test Customers","subAr":"","subEn":"","icon":"fa-table-list","iconColor":"indigo","pageSize":10,"orderBy":"","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"CustomerID","titleAr":"Customer","titleEn":"Customer","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"Code","titleAr":"Code","titleEn":"Code","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3},{"field":"NameA","titleAr":"الاسم عربي","titleEn":"Name AR","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"NameE","titleAr":"الاسم انجليزي","titleEn":"Name EN","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"Phone","titleAr":"Phone","titleEn":"Phone","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"Email","titleAr":"Email","titleEn":"Email","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7},{"field":"CreditLimit","titleAr":"Credit Limit","titleEn":"Credit Limit","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8},{"field":"City","titleAr":"City","titleEn":"City","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9},{"field":"IsActive","titleAr":"فعال","titleEn":"Active","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10}],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":false,"field":"","labelAr":"","labelEn":"","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":false,"field":"","approveTrType":"","unapproveTrType":"","approvePermission":"","unapprovePermission":"","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-05T10:12:35.629Z","modifiedBy":"","source":"web"},"menuSort":0,"layout":{"sections":[{"id":"sec_mw3dzzkt15k","titleAr":"","titleEn":"","rows":[{"id":"row_mw3dzzktxcn","cells":[{"id":"cell_mw3dzzktuhu","kind":"text","field":"Code","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dzzktvp6","kind":"text","field":"NameA","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dzzktwcq","kind":"text","field":"NameE","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3dzzkt113v","cells":[{"id":"cell_mw3dzzktys5","kind":"text","field":"Phone","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dzzktzgy","kind":"text","field":"Email","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dzzkt10q3","kind":"number","field":"CreditLimit","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3dzzkt14g8","cells":[{"id":"cell_mw3dzzkt12j1","kind":"text","field":"City","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dzzkt13wt","kind":"checkbox","field":"IsActive","span":{"base":12,"md":6,"lg":4}}]}]}]},"filterArea":[{"id":"flt_mw3dzzkt17l","field":"Code","kind":"text","labelAr":"Code","labelEn":"Code","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4},"operator":"starts"},{"id":"flt_mw3dzzkt18zf","field":"NameA","kind":"text","labelAr":"الاسم عربي","labelEn":"Name AR","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4},"operator":"contains"},{"id":"flt_mw3dzzkt1dmv","field":"City","kind":"text","labelAr":"City","labelEn":"City","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dzzkt1ew3","field":"IsActive","kind":"select","labelAr":"فعال","labelEn":"Active","required":false,"defaultValue":"","options":"1:✓|0:✗","span":{"base":12,"md":6,"lg":4}}],"actions":[],"print":{"listPrint":{"enabled":false,"proc":"","params":[],"paper":"A4","orientation":"portrait"},"transactionPrint":{"enabled":false,"proc":"","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"TrID","source":"row","value":""}],"paper":"A4","orientation":"portrait"}},"excel":{"enabled":true,"templateName":"TstCustomer_Template","columns":["Code","NameA","NameE","Phone","Email","CreditLimit","City","IsActive"],"keyLookups":[]},"importedBestEffort":false}
