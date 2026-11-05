"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, FilterOption, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import { SQL } from "../Shared/CallDataBase";
import type { ExcelGridConfig } from "../Shared/Components/Excel/ExcelTypes";
import { FormLayout } from "../Shared/Components/Import/FormLayout";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "TST_Expense";
const ViewName = "IQ_TST_Expense";
const KeyColumn = "ExpenseID";
const TrType = "";
const RunProcessTrans = false;
const ModuleCode = "TstExpense";   // MODULE_CODE للصلاحيات (فاضي = من غير صلاحيات)
// #endregion

// =======================
// TstExpense  (Grid)
// =======================
export function TstExpense() {
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

  const SqlLit = (v: any) => (v === null || v === undefined || v === "" ? "NULL" : typeof v === "number" ? String(v) : "N'" + String(v).replace(/'/g, "''") + "'");
  void SqlLit;

  // دروب داون الفلتر "CategoryID" من TST_Category
  const [opt_1, setOpt_1] = useState<FilterOption[]>([]);
  const [loaded_1, setLoaded_1] = useState(false);
  useEffect(() => {
    let off = false;
    SQL.Select("TST_Category", `CompCode = ${CompCode} AND IsActive = 1`, ["CategoryID","NameA","NameE"], null, null, 0, "NameA", "ASC", 0, "", null, null, 1, 500, false)
      .then((r) => {
        if (off) return;
        const dispField: string = IsLangEN ? "NameE" : "NameA";
        setOpt_1((r.data || []).map((x: any) => ({ value: x["CategoryID"], label: String(x[dispField] ?? "") })));
        setLoaded_1(true);
      })
      .catch(() => { if (!off) setLoaded_1(true); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IsLangEN, CompCode, BranchCode]);

  // دروب داون الفلتر "ItemID" من TST_Item (متسلسل مع: CategoryID)
  const [opt_2, setOpt_2] = useState<FilterOption[]>([]);
  const [loaded_2, setLoaded_2] = useState(false);
  useEffect(() => {
    let off = false;
    SQL.Select("TST_Item", (filterVals["CategoryID"] == null || filterVals["CategoryID"] === "") ? "1 = 0" : `CompCode = ${CompCode} AND CategoryID = ${SqlLit(filterVals["CategoryID"])}`, ["ItemID","NameA","NameE"], null, null, 0, "NameA", "ASC", 0, "", null, null, 1, 500, false)
      .then((r) => {
        if (off) return;
        const dispField: string = IsLangEN ? "NameE" : "NameA";
        setOpt_2((r.data || []).map((x: any) => ({ value: x["ItemID"], label: String(x[dispField] ?? "") })));
        setLoaded_2(true);
      })
      .catch(() => { if (!off) setLoaded_2(true); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IsLangEN, CompCode, BranchCode, filterVals["CategoryID"]]);

  // دروب داون الفلتر "CustomerID" من TST_Customer
  const [opt_3, setOpt_3] = useState<FilterOption[]>([]);
  const [loaded_3, setLoaded_3] = useState(false);
  useEffect(() => {
    let off = false;
    SQL.Select("TST_Customer", `CompCode = ${CompCode} AND IsActive = 1`, ["CustomerID","NameA","NameE"], null, null, 0, "NameA", "ASC", 0, "", null, null, 1, 500, false)
      .then((r) => {
        if (off) return;
        const dispField: string = IsLangEN ? "NameE" : "NameA";
        setOpt_3((r.data || []).map((x: any) => ({ value: x["CustomerID"], label: String(x[dispField] ?? "") })));
        setLoaded_3(true);
      })
      .catch(() => { if (!off) setLoaded_3(true); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IsLangEN, CompCode, BranchCode]);

  const filterReady = loaded_1 && loaded_3;   // الجريد مابيتعرضش قبل ما اختيارات الفلاتر تتحمل

  // ===== Excel: تحميل نموذج / استيراد (Phase 6) — بيتبعت لـ DynamicGrid (excel={...}) =====
  const ExcelCfg = useMemo<ExcelGridConfig>(
    () => ({
      enabled: true,
      templateName: "TstExpense_Template",
      columns: ["ExpenseDate","Amount","CategoryID","ItemID","CustomerID","Notes","Status"],
      lookups: {
      "CategoryID": { table: "TST_Category", keyColumn: "CategoryID", codeColumn: "Code", nameColumn: "NameA", condition: `CompCode = ${CompCode}` },
    },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CompCode, BranchCode]
  );

  const FormLayoutCells: FormLayout = [
    {"kind":"field","field":"ExpenseDate","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"Amount","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"CategoryID","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"ItemID","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"CustomerID","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"Notes","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"Status","span":4,"spanMd":6,"newRow":true},
  ];

  // =======================
  // #region الأعمدة
  // =======================
  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "ExpenseID",
        title: t("ExpenseID", "رقم"),
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
        field: "BranchCode",
        title: t("Branch Code", "كود الفرع"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: BranchCode,
        visibleInView: false,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "ExpenseDate",
        title: t("ExpenseDate", "التاريخ"),
        type: "date",
        inputType: "date",
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "Amount",
        title: t("Amount", "المبلغ"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "CategoryID",
        title: t("CategoryID", "CategoryID"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Category", displayField: IsLangEN ? "NameE" : "NameA", valueField: "CategoryID", condition: `CompCode = ${CompCode} AND IsActive = 1` },
        IsVisibleDisplayInGrid: false,
        IsRequired: true,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "ItemID",
        title: t("ItemID", "ItemID"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Item", displayField: IsLangEN ? "NameE" : "NameA", valueField: "ItemID", condition: `CompCode = ${CompCode} AND CategoryID = {row.CategoryID}` },
        IsVisibleDisplayInGrid: false,
        enabledWhen: (r) => !(r["CategoryID"] === null || r["CategoryID"] === undefined || r["CategoryID"] === ""),
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "CustomerID",
        title: t("CustomerID", "CustomerID"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Customer", displayField: IsLangEN ? "NameE" : "NameA", valueField: "CustomerID", condition: `CompCode = ${CompCode} AND IsActive = 1` },
        IsVisibleDisplayInGrid: false,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "Notes",
        title: t("Notes", "ملاحظات"),
        inputType: "textarea",
        visibleWhen: (r) => Number(r["Amount"]) > 0,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        type: "select",
        inputType: "select",
        selectOptions: [{ value: 0, label: "معلّق" }, { value: 1, label: "معتمد" }, { value: 2, label: "مرفوض" }],
        IsVisibleDisplayInGrid: false,
        IsRequired: true,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "CreatedBy",
        title: t("Created By", "بواسطة"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "CreatedAt",
        title: t("CreatedAt", "CreatedAt"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "CategoryCode",
        title: t("CategoryCode", "CategoryCode"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "CategoryNameA",
        title: t("CategoryNameA", "التصنيف"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 14,
      },
      {
        field: "CategoryNameE",
        title: t("CategoryNameE", "CategoryNameE"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "ItemCode",
        title: t("Item Code", "كود الصنف"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 16,
      },
      {
        field: "ItemNameA",
        title: t("ItemNameA", "الصنف"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 17,
      },
      {
        field: "ItemNameE",
        title: t("ItemNameE", "ItemNameE"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 18,
      },
      {
        field: "CustomerCode",
        title: t("Customer Code", "كود العميل"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 19,
      },
      {
        field: "CustomerNameA",
        title: t("CustomerNameA", "العميل"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 20,
      },
      {
        field: "CustomerNameE",
        title: t("CustomerNameE", "CustomerNameE"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 21,
      },
      {
        field: "StatusTextA",
        title: t("StatusTextA", "الحالة"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 22,
      },
      {
        field: "StatusTextE",
        title: t("StatusTextE", "StatusTextE"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 23,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "ExpenseDate", label: t("Date", "التاريخ"), type: "dateRange", defaultRange: { from: Today.substring(0, 8) + "01", to: Today }, sortOrder: 1 },
      { field: "CategoryID", label: t("Category", "التصنيف"), type: "select", options: opt_1, sortOrder: 2 },
      { field: "ItemID", label: t("Item", "الصنف"), type: "select", options: opt_2, sortOrder: 3 },
      { field: "CustomerID", label: t("Customer", "العميل"), type: "select", options: opt_3, sortOrder: 4 },
      { field: "Notes", label: t("Notes", "ملاحظات"), type: "text", operator: "contains", sortOrder: 5 },
      { field: "Status", label: t("Status", "الحالة"), type: "select", options: [{ value: 0, label: "معلّق" }, { value: 1, label: "معتمد" }, { value: 2, label: "مرفوض" }], sortOrder: 6 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, opt_1, opt_2, opt_3]
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
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Grid","Module":"TstExpense","Table":"TST_Expense","View":"IQ_TST_Expense","KeyColumn":"ExpenseID","TitleAr":"مصروفات اختبار","TitleEn":"Test Expenses","SubAr":"","SubEn":"","Icon":"fa-table-list","IconColor":"indigo","PageSize":10,"OrderBy":"ExpenseDate","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"Menu_TST","Roles":"","Fields":[{"Field":"ExpenseID","TitleAr":"رقم","TitleEn":"ExpenseID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":3},{"Field":"ExpenseDate","TitleAr":"التاريخ","TitleEn":"ExpenseDate","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"Today","Width":150,"Order":4},{"Field":"Amount","TitleAr":"المبلغ","TitleEn":"Amount","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"CategoryID","TitleAr":"CategoryID","TitleEn":"CategoryID","InGrid":false,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"ItemID","TitleAr":"ItemID","TitleEn":"ItemID","InGrid":false,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"CustomerID","TitleAr":"CustomerID","TitleEn":"CustomerID","InGrid":false,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8},{"Field":"Notes","TitleAr":"ملاحظات","TitleEn":"Notes","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"textarea","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"Status","TitleAr":"الحالة","TitleEn":"Status","InGrid":false,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"select","Options":"0:معلّق|1:معتمد|2:مرفوض","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"0","Width":150,"Order":10},{"Field":"CreatedBy","TitleAr":"بواسطة","TitleEn":"Created By","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":11},{"Field":"CreatedAt","TitleAr":"CreatedAt","TitleEn":"CreatedAt","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"today","Width":150,"Order":12},{"Field":"CategoryCode","TitleAr":"CategoryCode","TitleEn":"CategoryCode","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":13},{"Field":"CategoryNameA","TitleAr":"التصنيف","TitleEn":"CategoryNameA","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":14},{"Field":"CategoryNameE","TitleAr":"CategoryNameE","TitleEn":"CategoryNameE","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":15},{"Field":"ItemCode","TitleAr":"كود الصنف","TitleEn":"Item Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":16},{"Field":"ItemNameA","TitleAr":"الصنف","TitleEn":"ItemNameA","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":17},{"Field":"ItemNameE","TitleAr":"ItemNameE","TitleEn":"ItemNameE","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":18},{"Field":"CustomerCode","TitleAr":"كود العميل","TitleEn":"Customer Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":19},{"Field":"CustomerNameA","TitleAr":"العميل","TitleEn":"CustomerNameA","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":20},{"Field":"CustomerNameE","TitleAr":"CustomerNameE","TitleEn":"CustomerNameE","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":21},{"Field":"StatusTextA","TitleAr":"الحالة","TitleEn":"StatusTextA","InGrid":true,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":22},{"Field":"StatusTextE","TitleAr":"StatusTextE","TitleEn":"StatusTextE","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":23}],"ListFields":[],"Details":[],"Validations":[]}
// @ScreenBuilder-Settings: {"version":5,"screenType":"Grid","module":"TstExpense","table":"TST_Expense","view":"IQ_TST_Expense","keyColumn":"ExpenseID","titleAr":"مصروفات اختبار","titleEn":"Test Expenses","subAr":"","subEn":"","icon":"fa-table-list","iconColor":"indigo","pageSize":10,"orderBy":"ExpenseDate","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"Menu_TST","roles":""},"fields":[{"field":"ExpenseID","titleAr":"رقم","titleEn":"ExpenseID","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":3},{"field":"ExpenseDate","titleAr":"التاريخ","titleEn":"ExpenseDate","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"Today","width":150,"order":4},{"field":"Amount","titleAr":"المبلغ","titleEn":"Amount","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"CategoryID","titleAr":"CategoryID","titleEn":"CategoryID","inGrid":false,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6,"selectTable":"TST_Category","selectValue":"CategoryID","selectDisplay":"NameA","selectDisplayEn":"NameE","selectCondition":"CompCode = {session.CompCode} AND IsActive = 1","selectOrderBy":"NameA"},{"field":"ItemID","titleAr":"ItemID","titleEn":"ItemID","inGrid":false,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7,"selectTable":"TST_Item","selectValue":"ItemID","selectDisplay":"NameA","selectDisplayEn":"NameE","selectCondition":"CompCode = {session.CompCode} AND CategoryID = {row.CategoryID}","selectOrderBy":"NameA","enabledWhen":{"field":"CategoryID","op":"notEmpty","value":""}},{"field":"CustomerID","titleAr":"CustomerID","titleEn":"CustomerID","inGrid":false,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8,"selectTable":"TST_Customer","selectValue":"CustomerID","selectDisplay":"NameA","selectDisplayEn":"NameE","selectCondition":"CompCode = {session.CompCode} AND IsActive = 1","selectOrderBy":"NameA"},{"field":"Notes","titleAr":"ملاحظات","titleEn":"Notes","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"textarea","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9,"visibleWhen":{"field":"Amount","op":">","value":"0"}},{"field":"Status","titleAr":"الحالة","titleEn":"Status","inGrid":false,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"select","options":"0:معلّق|1:معتمد|2:مرفوض","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"0","width":150,"order":10},{"field":"CreatedBy","titleAr":"بواسطة","titleEn":"Created By","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":11},{"field":"CreatedAt","titleAr":"CreatedAt","titleEn":"CreatedAt","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"today","width":150,"order":12},{"field":"CategoryCode","titleAr":"CategoryCode","titleEn":"CategoryCode","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":13,"noSave":true},{"field":"CategoryNameA","titleAr":"التصنيف","titleEn":"CategoryNameA","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":14,"noSave":true},{"field":"CategoryNameE","titleAr":"CategoryNameE","titleEn":"CategoryNameE","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":15,"noSave":true},{"field":"ItemCode","titleAr":"كود الصنف","titleEn":"Item Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":16,"noSave":true},{"field":"ItemNameA","titleAr":"الصنف","titleEn":"ItemNameA","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":17,"noSave":true},{"field":"ItemNameE","titleAr":"ItemNameE","titleEn":"ItemNameE","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":18,"noSave":true},{"field":"CustomerCode","titleAr":"كود العميل","titleEn":"Customer Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":19,"noSave":true},{"field":"CustomerNameA","titleAr":"العميل","titleEn":"CustomerNameA","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":20,"noSave":true},{"field":"CustomerNameE","titleAr":"CustomerNameE","titleEn":"CustomerNameE","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":21,"noSave":true},{"field":"StatusTextA","titleAr":"الحالة","titleEn":"StatusTextA","inGrid":true,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":22,"noSave":true},{"field":"StatusTextE","titleAr":"StatusTextE","titleEn":"StatusTextE","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":23,"noSave":true}],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":false,"field":"","labelAr":"","labelEn":"","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":false,"field":"","approveTrType":"","unapproveTrType":"","approvePermission":"","unapprovePermission":"","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-05T09:26:28.820Z","modifiedBy":"","source":"web"},"menuSort":0,"layout":{"sections":[{"id":"sec_mw3cdduhbp5","titleAr":"","titleEn":"","rows":[{"id":"row_mw3cdduh4l9","cells":[{"id":"cell_mw3cdduh1kc","kind":"date","field":"ExpenseDate","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3cdduh2ow","kind":"decimal","field":"Amount","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3cdduh3th","kind":"selectSearch","field":"CategoryID","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3cdduh8dh","cells":[{"id":"cell_mw3cdduh535","kind":"selectSearch","field":"ItemID","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3cdduh6is","kind":"selectSearch","field":"CustomerID","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3cdduh7xf","kind":"textarea","field":"Notes","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3cdduhagd","cells":[{"id":"cell_mw3cdduh9bp","kind":"select","field":"Status","span":{"base":12,"md":6,"lg":4}}]}]}]},"filterArea":[{"id":"flt_mw3cdduhdzr","field":"ExpenseDate","kind":"dateRange","labelAr":"التاريخ","labelEn":"Date","required":false,"defaultValue":"monthStart|today","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3cdduhfib","field":"CategoryID","kind":"select","labelAr":"التصنيف","labelEn":"Category","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4},"source":{"table":"TST_Category","valueField":"CategoryID","displayField":"NameA","displayFieldEn":"NameE","condition":"CompCode = {session.CompCode} AND IsActive = 1","orderBy":"NameA"}},{"id":"flt_mw3cdduhghg","field":"ItemID","kind":"select","labelAr":"الصنف","labelEn":"Item","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4},"source":{"table":"TST_Item","valueField":"ItemID","displayField":"NameA","displayFieldEn":"NameE","condition":"CompCode = {session.CompCode} AND CategoryID = {filter.CategoryID}","orderBy":"NameA"}},{"id":"flt_mw3cdduhhad","field":"CustomerID","kind":"select","labelAr":"العميل","labelEn":"Customer","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4},"source":{"table":"TST_Customer","valueField":"CustomerID","displayField":"NameA","displayFieldEn":"NameE","condition":"CompCode = {session.CompCode} AND IsActive = 1","orderBy":"NameA"}},{"id":"flt_mw3cdduhirs","field":"Notes","kind":"text","labelAr":"ملاحظات","labelEn":"Notes","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4},"operator":"contains"},{"id":"flt_mw3cdduhj3j","field":"Status","kind":"select","labelAr":"الحالة","labelEn":"Status","required":false,"defaultValue":"","options":"0:معلّق|1:معتمد|2:مرفوض","span":{"base":12,"md":6,"lg":4}}],"actions":[],"print":{"listPrint":{"enabled":false,"proc":"","params":[],"paper":"A4","orientation":"portrait"},"transactionPrint":{"enabled":false,"proc":"","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"TrID","source":"row","value":""}],"paper":"A4","orientation":"portrait"}},"excel":{"enabled":true,"templateName":"TstExpense_Template","columns":["ExpenseDate","Amount","CategoryID","ItemID","CustomerID","Notes","Status"],"keyLookups":[{"column":"CategoryID","scope":"master","table":"TST_Category","valueField":"CategoryID","displayField":"NameA","codeField":"Code","condition":"CompCode = {session.CompCode}"}]},"importedBestEffort":false}
