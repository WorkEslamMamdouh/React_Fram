"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig } from "../Shared/Components/Import/AdvancedFilter";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "A_Cost_Center";
const ViewName = "A_Cost_Center";
const KeyColumn = "CostCenterID";
const TrType = "";
const RunProcessTrans = false;
// #endregion

// =======================
// SalesApproval  (Grid)
// =======================
export function SalesApproval() {
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

  // =======================
  // #region الأعمدة
  // =======================
  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "CostCenterID",
        title: t("CostCenterID", "CostCenterID"),
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
        field: "CC_CODE",
        title: t("CC_CODE", "CC_CODE"),
        IsRequired: true,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "CC_DESCA",
        title: t("CC_DESCA", "CC_DESCA"),
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "CC_DESCL",
        title: t("CC_DESCL", "CC_DESCL"),
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "CC_GROUP",
        title: t("CC_GROUP", "CC_GROUP"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "CC_TYPE",
        title: t("CC_TYPE", "CC_TYPE"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "CC_LEVEL",
        title: t("CC_LEVEL", "CC_LEVEL"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "CC_ACTIVE",
        title: t("CC_ACTIVE", "CC_ACTIVE"),
        type: "checkbox",
        inputType: "checkbox",
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "PARENT_ACC",
        title: t("PARENT_ACC", "PARENT_ACC"),
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "DETAIL",
        title: t("DETAIL", "DETAIL"),
        type: "checkbox",
        inputType: "checkbox",
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "CREATED_BY",
        title: t("CREATED_BY", "CREATED_BY"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "CREATED_AT",
        title: t("CREATED_AT", "CREATED_AT"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "UPDATED_BY",
        title: t("UPDATED_BY", "UPDATED_BY"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 14,
      },
      {
        field: "LAST_UPDATE",
        title: t("LAST_UPDATE", "LAST_UPDATE"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "BranchCode",
        title: t("Branch Code", "كود الفرع"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: BranchCode,
        visibleInView: false,
        SortFieldInEditAndAdd: 16,
      },
      {
        field: "REMARKS",
        title: t("REMARKS", "REMARKS"),
        SortFieldInEditAndAdd: 17,
      },
      {
        field: "IDExcel",
        title: t("IDExcel", "IDExcel"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 18,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "CostCenterID", label: t("CostCenterID", "CostCenterID"), type: "number", sortOrder: 1 },
      { field: "CC_CODE", label: t("CC_CODE", "CC_CODE"), type: "text", sortOrder: 2 },
      { field: "CC_DESCA", label: t("CC_DESCA", "CC_DESCA"), type: "text", sortOrder: 3 },
      { field: "CC_DESCL", label: t("CC_DESCL", "CC_DESCL"), type: "text", sortOrder: 4 },
      { field: "CC_GROUP", label: t("CC_GROUP", "CC_GROUP"), type: "number", sortOrder: 5 },
      { field: "CC_TYPE", label: t("CC_TYPE", "CC_TYPE"), type: "number", sortOrder: 6 },
      { field: "CC_LEVEL", label: t("CC_LEVEL", "CC_LEVEL"), type: "number", sortOrder: 7 },
      { field: "CC_ACTIVE", label: t("CC_ACTIVE", "CC_ACTIVE"), type: "boolean", sortOrder: 8 },
      { field: "PARENT_ACC", label: t("PARENT_ACC", "PARENT_ACC"), type: "text", sortOrder: 9 },
      { field: "DETAIL", label: t("DETAIL", "DETAIL"), type: "boolean", sortOrder: 10 },
      { field: "REMARKS", label: t("REMARKS", "REMARKS"), type: "text", sortOrder: 11 },
      { field: "IDExcel", label: t("IDExcel", "IDExcel"), type: "number", sortOrder: 12 },
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
    grid: { TableName, ViewName, KeyColumn, TrType, RunProcessTrans, Condition, CompCode, BranchCode, Columns, FilterFields },
  };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Grid","Module":"SalesApproval","Table":"A_Cost_Center","View":"","KeyColumn":"CostCenterID","TitleAr":"اعتماد المبيعات","TitleEn":"Sales Approval","SubAr":"فواتير المبيعات واعتمادها","SubEn":"Sales invoices and approvals","Icon":"fa-check-double","IconColor":"emerald","PageSize":15,"OrderBy":"TrDate","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":false,"Edit":false,"Delete":false,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"CostCenterID","TitleAr":"CostCenterID","TitleEn":"CostCenterID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"CC_CODE","TitleAr":"CC_CODE","TitleEn":"CC_CODE","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"CC_DESCA","TitleAr":"CC_DESCA","TitleEn":"CC_DESCA","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"CC_DESCL","TitleAr":"CC_DESCL","TitleEn":"CC_DESCL","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"CC_GROUP","TitleAr":"CC_GROUP","TitleEn":"CC_GROUP","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"CC_TYPE","TitleAr":"CC_TYPE","TitleEn":"CC_TYPE","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"CC_LEVEL","TitleAr":"CC_LEVEL","TitleEn":"CC_LEVEL","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8},{"Field":"CC_ACTIVE","TitleAr":"CC_ACTIVE","TitleEn":"CC_ACTIVE","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"PARENT_ACC","TitleAr":"PARENT_ACC","TitleEn":"PARENT_ACC","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10},{"Field":"DETAIL","TitleAr":"DETAIL","TitleEn":"DETAIL","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":11},{"Field":"CREATED_BY","TitleAr":"CREATED_BY","TitleEn":"CREATED_BY","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":12},{"Field":"CREATED_AT","TitleAr":"CREATED_AT","TitleEn":"CREATED_AT","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"","Width":150,"Order":13},{"Field":"UPDATED_BY","TitleAr":"UPDATED_BY","TitleEn":"UPDATED_BY","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":14},{"Field":"LAST_UPDATE","TitleAr":"LAST_UPDATE","TitleEn":"LAST_UPDATE","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"","Width":150,"Order":15},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":16},{"Field":"REMARKS","TitleAr":"REMARKS","TitleEn":"REMARKS","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":17},{"Field":"IDExcel","TitleAr":"IDExcel","TitleEn":"IDExcel","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":18}],"ListFields":[],"Details":[],"Validations":[]}
// @ScreenBuilder-Settings: {"version":4,"screenType":"Grid","module":"SalesApproval","table":"A_Cost_Center","view":"","keyColumn":"CostCenterID","titleAr":"اعتماد المبيعات","titleEn":"Sales Approval","subAr":"فواتير المبيعات واعتمادها","subEn":"Sales invoices and approvals","icon":"fa-check-double","iconColor":"emerald","pageSize":15,"orderBy":"TrDate","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":false,"edit":false,"delete":false,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"CostCenterID","titleAr":"CostCenterID","titleEn":"CostCenterID","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"CC_CODE","titleAr":"CC_CODE","titleEn":"CC_CODE","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3},{"field":"CC_DESCA","titleAr":"CC_DESCA","titleEn":"CC_DESCA","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"CC_DESCL","titleAr":"CC_DESCL","titleEn":"CC_DESCL","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"CC_GROUP","titleAr":"CC_GROUP","titleEn":"CC_GROUP","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"CC_TYPE","titleAr":"CC_TYPE","titleEn":"CC_TYPE","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7},{"field":"CC_LEVEL","titleAr":"CC_LEVEL","titleEn":"CC_LEVEL","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8},{"field":"CC_ACTIVE","titleAr":"CC_ACTIVE","titleEn":"CC_ACTIVE","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9},{"field":"PARENT_ACC","titleAr":"PARENT_ACC","titleEn":"PARENT_ACC","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10},{"field":"DETAIL","titleAr":"DETAIL","titleEn":"DETAIL","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":11},{"field":"CREATED_BY","titleAr":"CREATED_BY","titleEn":"CREATED_BY","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":12},{"field":"CREATED_AT","titleAr":"CREATED_AT","titleEn":"CREATED_AT","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"","width":150,"order":13},{"field":"UPDATED_BY","titleAr":"UPDATED_BY","titleEn":"UPDATED_BY","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":14},{"field":"LAST_UPDATE","titleAr":"LAST_UPDATE","titleEn":"LAST_UPDATE","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"","width":150,"order":15},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":16},{"field":"REMARKS","titleAr":"REMARKS","titleEn":"REMARKS","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":17},{"field":"IDExcel","titleAr":"IDExcel","titleEn":"IDExcel","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":18}],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":true,"field":"TrDate","labelAr":"تاريخ","labelEn":"Date","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":true,"field":"Status","approveTrType":"ApproveSale","unapproveTrType":"UnapproveSale","approvePermission":"SalesApproval.Approve","unapprovePermission":"SalesApproval.Unapprove","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-03T00:00:00.000Z","modifiedBy":"","source":"web"}}
