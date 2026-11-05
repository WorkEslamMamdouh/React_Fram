"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, FilterOption, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import { SQL } from "../Shared/CallDataBase";
import { RunProc } from "../Shared/RunProc";
import { Sys } from "../Shared/SystemTools";
import { FormLayout } from "../Shared/Components/Import/FormLayout";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "D_A_CashTypes";
const ViewName = "D_A_CashTypes";
const KeyColumn = "CashTypeID";
const TrType = "";
const RunProcessTrans = false;
const ModuleCode = "DemoCash";   // MODULE_CODE للصلاحيات (فاضي = من غير صلاحيات)
// #endregion

// =======================
// DemoCash  (Grid)
// =======================
export function DemoCash() {
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

  // دروب داون الفلتر "BranchCode" من Sys_Branch
  const [opt_6, setOpt_6] = useState<FilterOption[]>([]);
  const [loaded_6, setLoaded_6] = useState(false);
  useEffect(() => {
    let off = false;
    SQL.Select("Sys_Branch", `CompCode = ${CompCode}`, ["BranchCode","BranchDescA","BranchDescE"], null, null, 0, "BranchCode", "ASC", 0, "", null, null, 1, 500, false)
      .then((r) => {
        if (off) return;
        const dispField: string = IsLangEN ? "BranchDescE" : "BranchDescA";
        setOpt_6((r.data || []).map((x: any) => ({ value: x["BranchCode"], label: String(x[dispField] ?? "") })));
        setLoaded_6(true);
      })
      .catch(() => { if (!off) setLoaded_6(true); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IsLangEN, CompCode, BranchCode]);

  const filterReady = loaded_6;   // الجريد مابيتعرضش قبل ما اختيارات الفلاتر تتحمل

  async function RunAction_0(row?: any) {
    void row;
    if (!(await Sys.Confirm("Run: Trial Balance?", "تنفيذ: ميزان المراجعة؟"))) return;
    const res = await RunProc("IProc_Z_A_TrialBalance", { "comp": CompCode, "FromDate": "2026-01-01", "ToDate": "2026-12-31", "Level": 1 });
    if (!res.ok) { Sys.ShowMessage(res.error || "Failed", res.error || "فشل التنفيذ", "error"); return; }
    RefreshGrid();
  }

  // ===== Hooks للطباعة والإكسل (التشغيل الفعلي في المرحلة 6 و7) — الإعدادات اتخزنت من الـ ScreenBuilder =====
  const PrintConfig = {"listPrint":{"enabled":true,"proc":"","params":[],"paper":"A4","orientation":"portrait"},"transactionPrint":{"enabled":false,"proc":"","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"TrID","source":"row","value":""}],"paper":"A4","orientation":"portrait"}};
  const ExcelConfig = {"enabled":false,"templateName":"","columns":[],"keyLookups":[]};
  void PrintConfig; void ExcelConfig;
  const ComingSoon = () => Sys.ShowMessage("This feature will be available soon", "الميزة دي هتبقى متاحة قريب", "info");

  function onPrintList() { ComingSoon(); }   // Phase 7: PrintConfig.listPrint (proc + params من الفلاتر)

  const ToolbarButtons: { key: string; label: string; icon?: string; onClick: () => void }[] = [
    { key: "act_0", label: t("Trial Balance", "ميزان المراجعة"), icon: "fa-bolt", onClick: () => { void RunAction_0(); } },
    { key: "printList", label: t("Print list", "طباعة القائمة"), icon: "fa-print", onClick: () => onPrintList() },
  ];

  const FormLayoutCells: FormLayout = [
    {"kind":"field","field":"Ser","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"Description","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"ChargePrc","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"CashAccCode","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"IsActive","span":4,"spanMd":6,"newRow":false},
  ];

  // =======================
  // #region الأعمدة
  // =======================
  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "CashTypeID",
        title: t("CashTypeID", "CashTypeID"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "Ser",
        title: t("Ser", "Ser"),
        type: "number",
        inputType: "number",
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
        DefaultValue: CompCode,
        visibleInView: false,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "BranchCode",
        title: t("Branch Code", "كود الفرع"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        visibleWhen: (r) => String(r["IsActive"] ?? "") === "1",
        IsRequired: true,
        DefaultValue: BranchCode,
        visibleInView: false,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "Description",
        title: t("Description", "الوصف"),
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "ChargePrc",
        title: t("ChargePrc", "ChargePrc"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "CashAccCode",
        title: t("CashAccCode", "CashAccCode"),
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "IsActive",
        title: t("Active", "فعال"),
        type: "checkbox",
        inputType: "checkbox",
        SortFieldInEditAndAdd: 5,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "CashTypeID", label: t("CashTypeID", "CashTypeID"), type: "number", sortOrder: 1 },
      { field: "Ser", label: t("Ser", "Ser"), type: "number", sortOrder: 2 },
      { field: "Description", label: t("Description", "الوصف"), type: "text", sortOrder: 3 },
      { field: "ChargePrc", label: t("ChargePrc", "ChargePrc"), type: "number", sortOrder: 4 },
      { field: "CashAccCode", label: t("CashAccCode", "CashAccCode"), type: "text", sortOrder: 5 },
      { field: "IsActive", label: t("Active", "فعال"), type: "select", options: [{ value: 1, label: "✓" }, { value: 0, label: "✗" }], sortOrder: 6 },
      { field: "BranchCode", label: t("Branch", "الفرع"), type: "select", operator: "=", options: opt_6, sortOrder: 7 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, opt_6]
  );
  // #endregion

  return {
    IsLangEN,
    IsDark,
    gridKey,
    RefreshGrid,
    filterReady,
    onFilterChange,
    ToolbarButtons,
    grid: { TableName, ViewName, KeyColumn, TrType, RunProcessTrans, Condition, CompCode, BranchCode, Columns, FilterFields, ModuleCode, FormLayoutCells },
  };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Grid","Module":"DemoCash","Table":"D_A_CashTypes","View":"D_A_CashTypes","KeyColumn":"CashTypeID","TitleAr":"كاش تجريبي","TitleEn":"Demo Cash","SubAr":"","SubEn":"","Icon":"fa-table-list","IconColor":"indigo","PageSize":10,"OrderBy":"","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"Menu_Admin","Roles":"","Fields":[{"Field":"CashTypeID","TitleAr":"CashTypeID","TitleEn":"CashTypeID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"Ser","TitleAr":"Ser","TitleEn":"Ser","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":3},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":6},{"Field":"Description","TitleAr":"الوصف","TitleEn":"Description","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":2},{"Field":"ChargePrc","TitleAr":"ChargePrc","TitleEn":"ChargePrc","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"CashAccCode","TitleAr":"CashAccCode","TitleEn":"CashAccCode","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"IsActive","TitleAr":"فعال","TitleEn":"Active","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5}],"ListFields":[],"Details":[],"Validations":[]}
// @ScreenBuilder-Settings: {"version":5,"screenType":"Grid","module":"DemoCash","table":"D_A_CashTypes","view":"D_A_CashTypes","keyColumn":"CashTypeID","titleAr":"كاش تجريبي","titleEn":"Demo Cash","subAr":"","subEn":"","icon":"fa-table-list","iconColor":"indigo","pageSize":10,"orderBy":"","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"Menu_Admin","roles":""},"fields":[{"field":"CashTypeID","titleAr":"CashTypeID","titleEn":"CashTypeID","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"Ser","titleAr":"Ser","titleEn":"Ser","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":3},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":6,"visibleWhen":{"field":"IsActive","op":"=","value":"1"}},{"field":"Description","titleAr":"الوصف","titleEn":"Description","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":2},{"field":"ChargePrc","titleAr":"ChargePrc","titleEn":"ChargePrc","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3},{"field":"CashAccCode","titleAr":"CashAccCode","titleEn":"CashAccCode","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"IsActive","titleAr":"فعال","titleEn":"Active","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5}],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":false,"field":"","labelAr":"","labelEn":"","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":false,"field":"","approveTrType":"","unapproveTrType":"","approvePermission":"","unapprovePermission":"","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-05T01:20:45.870Z","modifiedBy":"","source":"web"},"menuSort":0,"layout":{"sections":[{"id":"sec_mw2v1tj68l8","titleAr":"","titleEn":"","rows":[{"id":"row_mw2v1tj6415","cells":[{"id":"cell_mw2v1tj61qa","kind":"number","field":"Ser","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw2v1tj62i","kind":"text","field":"Description","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw2v1tj63r","kind":"number","field":"ChargePrc","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw2v1tj67bu","cells":[{"id":"cell_mw2v1tj651n","kind":"text","field":"CashAccCode","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw2v1tj6645","kind":"checkbox","field":"IsActive","span":{"base":12,"md":6,"lg":4}}]}]}]},"filterArea":[{"id":"flt_mw2v1tj69ym","field":"CashTypeID","kind":"number","labelAr":"CashTypeID","labelEn":"CashTypeID","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw2v1tj6a8l","field":"Ser","kind":"number","labelAr":"Ser","labelEn":"Ser","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw2v1tj6bxs","field":"Description","kind":"text","labelAr":"الوصف","labelEn":"Description","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw2v1tj6cml","field":"ChargePrc","kind":"number","labelAr":"ChargePrc","labelEn":"ChargePrc","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw2v1tj6drl","field":"CashAccCode","kind":"text","labelAr":"CashAccCode","labelEn":"CashAccCode","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw2v3ah8fvl","field":"IsActive","kind":"select","labelAr":"فعال","labelEn":"Active","required":false,"defaultValue":"","options":"1:✓|0:✗","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw2v3g55gg2","field":"BranchCode","kind":"select","labelAr":"الفرع","labelEn":"Branch","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4},"source":{"table":"Sys_Branch","valueField":"BranchCode","displayField":"BranchDescA","displayFieldEn":"BranchDescE","condition":"CompCode = {session.CompCode}","orderBy":"BranchCode"},"operator":"="}],"actions":[{"id":"act_mw2v6b3wjb5","labelAr":"ميزان المراجعة","labelEn":"Trial Balance","icon":"fa-bolt","scope":"toolbar","proc":"IProc_Z_A_TrialBalance","params":[{"name":"comp","source":"session","value":"CompCode"},{"name":"FromDate","source":"const","value":"2026-01-01"},{"name":"ToDate","source":"const","value":"2026-12-31"},{"name":"Level","source":"const","value":"1"}],"confirm":true,"after":"refresh","messageAr":"تم التنفيذ","messageEn":"Done"}],"print":{"listPrint":{"enabled":true,"proc":"","params":[],"paper":"A4","orientation":"portrait"},"transactionPrint":{"enabled":false,"proc":"","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"TrID","source":"row","value":""}],"paper":"A4","orientation":"portrait"}},"excel":{"enabled":false,"templateName":"","columns":[],"keyLookups":[]},"importedBestEffort":false}
