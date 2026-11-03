"use client";

import { useMemo } from "react";
import { useSys } from "../Shared/SystemUsing";
import { MasterDetailColumn } from "../Shared/Components/Import/ModelMasterDetail";
import { TreeScreenConfig } from "../Shared/Components/Import/ModelTree";

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
// Cost_Center  (Tree)
// =======================
export function Cost_Center() {
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

  const Condition = `CompCode = ${CompCode}`;

  // =======================
  // #region الأعمدة
  // =======================
  const MasterColumns = useMemo<MasterDetailColumn[]>(
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
        title: t("CC_CODE", "كود المركز"),
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
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "CC_TYPE",
        title: t("CC_TYPE", "CC_TYPE"),
        inputType: "selectSearch",
        selectConfig: { tableName: "D_A_CashTypes", displayField: "Description", valueField: "CashTypeID", condition: "IsActive = 1" },
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "CC_LEVEL",
        title: t("CC_LEVEL", "CC_LEVEL"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "CC_ACTIVE",
        title: t("CC_ACTIVE", "CC_ACTIVE"),
        type: "checkbox",
        inputType: "checkbox",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
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
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "CREATED_BY",
        title: t("CREATED_BY", "CREATED_BY"),
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: UserName,
        IsVisibleDisplayInGrid: false,
        visibleInView: false,
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "CREATED_AT",
        title: t("CREATED_AT", "CREATED_AT"),
        type: "date",
        inputType: "date",
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: "Now",
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "UPDATED_BY",
        title: t("UPDATED_BY", "UPDATED_BY"),
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: UserName,
        IsVisibleDisplayInGrid: false,
        visibleInView: false,
        SortFieldInEditAndAdd: 14,
      },
      {
        field: "LAST_UPDATE",
        title: t("LAST_UPDATE", "LAST_UPDATE"),
        type: "date",
        inputType: "date",
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: "Now",
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

  const Detail1Columns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "AccountYearID",
        title: t("AccountYearID", "AccountYearID"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
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
        field: "ACC_CODE",
        title: t("ACC_CODE", "ACC_CODE"),
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "FIN_YEAR",
        title: t("FIN_YEAR", "FIN_YEAR"),
        type: "select",
        inputType: "select",
        selectOptions: [{ value: 2025, label: "2025 " }, { value:  2026, label: "2026" }],
        IsRequired: true,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "ACC_LIMIT",
        title: t("ACC_LIMIT", "ACC_LIMIT"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "REMARKS",
        title: t("REMARKS", "REMARKS"),
        SortFieldInEditAndAdd: 7,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );
  // #endregion

  const Config = useMemo<TreeScreenConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      codeColumn: "CC_CODE",
      parentColumn: "PARENT_ACC",
      titleColumn: "CC_DESCA",
      titleColumnEn: "CC_DESCL",
      levelColumn: "CC_LEVEL",
      leafColumn: "DETAIL",
      activeColumn: "CC_ACTIVE",
      autoCode: true,
      codeDigits: 2,
      codeSeparator: "",
      columns: MasterColumns,
      details: [
        {
          title: t("Test", "Test"),
          tableName: "A_ACCOUNT_YEAR",
          viewName: "A_ACCOUNT_YEAR",
          keyColumn: "CC_CODE",
          foreignKeyColumn: "ACC_CODE",
          columns: Detail1Columns,
          totals: [],
          orderBy: "CC_CODE",
        },
      ],
      condition: Condition,
      orderBy: "CC_CODE",
      pageSize: 50,
      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,
      enableInsert: true,
      enableUpdate: true,
      enableDelete: true,
      treeTitle: t("Cost_Center", "Cost_Center"),
      newRootTitle: t("New root", "جذر جديد"),
      newChildTitle: t("New child", "إضافة ابن"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode, MasterColumns, Detail1Columns]
  );

  return { IsLangEN, IsDark, Config };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Tree","Module":"Cost_Center","Table":"A_Cost_Center","View":"","KeyColumn":"CostCenterID","TitleAr":"","TitleEn":"","SubAr":"","SubEn":"","Icon":"fa-sitemap","IconColor":"indigo","PageSize":10,"OrderBy":"CC_CODE","OrderType":"ASC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"CostCenterID","TitleAr":"CostCenterID","TitleEn":"CostCenterID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"CC_CODE","TitleAr":"كود المركز","TitleEn":"CC_CODE","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"CC_DESCA","TitleAr":"CC_DESCA","TitleEn":"CC_DESCA","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"CC_DESCL","TitleAr":"CC_DESCL","TitleEn":"CC_DESCL","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"CC_GROUP","TitleAr":"CC_GROUP","TitleEn":"CC_GROUP","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"CC_TYPE","TitleAr":"CC_TYPE","TitleEn":"CC_TYPE","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":false,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"CC_LEVEL","TitleAr":"CC_LEVEL","TitleEn":"CC_LEVEL","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8},{"Field":"CC_ACTIVE","TitleAr":"CC_ACTIVE","TitleEn":"CC_ACTIVE","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"PARENT_ACC","TitleAr":"PARENT_ACC","TitleEn":"PARENT_ACC","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10},{"Field":"DETAIL","TitleAr":"DETAIL","TitleEn":"DETAIL","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":11},{"Field":"CREATED_BY","TitleAr":"CREATED_BY","TitleEn":"CREATED_BY","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":12},{"Field":"CREATED_AT","TitleAr":"CREATED_AT","TitleEn":"CREATED_AT","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"Now","Width":150,"Order":13},{"Field":"UPDATED_BY","TitleAr":"UPDATED_BY","TitleEn":"UPDATED_BY","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":14},{"Field":"LAST_UPDATE","TitleAr":"LAST_UPDATE","TitleEn":"LAST_UPDATE","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"Now","Width":150,"Order":15},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":16},{"Field":"REMARKS","TitleAr":"REMARKS","TitleEn":"REMARKS","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":17},{"Field":"IDExcel","TitleAr":"IDExcel","TitleEn":"IDExcel","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":18}],"ListFields":[],"Details":[{"TitleAr":"Test","TitleEn":"Test","Table":"A_ACCOUNT_YEAR","View":"","KeyColumn":"CC_CODE","ForeignKey":"ACC_CODE","Totals":"","OrderBy":"","Fields":[{"Field":"AccountYearID","TitleAr":"AccountYearID","TitleEn":"AccountYearID","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":3},{"Field":"ACC_CODE","TitleAr":"ACC_CODE","TitleEn":"ACC_CODE","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"FIN_YEAR","TitleAr":"FIN_YEAR","TitleEn":"FIN_YEAR","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"select","Options":"2025:2025 | 2026:2026","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"ACC_LIMIT","TitleAr":"ACC_LIMIT","TitleEn":"ACC_LIMIT","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"REMARKS","TitleAr":"REMARKS","TitleEn":"REMARKS","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7}]}],"Validations":[],"Tree":{"codeColumn":"CC_CODE","parentColumn":"PARENT_ACC","titleColumn":"CC_DESCA","titleColumnEn":"CC_DESCL","levelColumn":"CC_LEVEL","leafColumn":"DETAIL","activeColumn":"CC_ACTIVE","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50}}
// @ScreenBuilder-Settings: {"version":4,"screenType":"Tree","module":"Cost_Center","table":"A_Cost_Center","view":"","keyColumn":"CostCenterID","titleAr":"","titleEn":"","subAr":"","subEn":"","icon":"fa-sitemap","iconColor":"indigo","pageSize":10,"orderBy":"CC_CODE","orderType":"ASC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"CostCenterID","titleAr":"CostCenterID","titleEn":"CostCenterID","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"CC_CODE","titleAr":"كود المركز","titleEn":"CC_CODE","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3},{"field":"CC_DESCA","titleAr":"CC_DESCA","titleEn":"CC_DESCA","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"CC_DESCL","titleAr":"CC_DESCL","titleEn":"CC_DESCL","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"CC_GROUP","titleAr":"CC_GROUP","titleEn":"CC_GROUP","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"CC_TYPE","titleAr":"CC_TYPE","titleEn":"CC_TYPE","inGrid":true,"inForm":true,"required":false,"search":false,"inFilter":false,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7,"selectTable":"D_A_CashTypes","selectDisplay":"Description","selectDisplayEn":"Description","selectValue":"CashTypeID","selectCondition":"IsActive = 1"},{"field":"CC_LEVEL","titleAr":"CC_LEVEL","titleEn":"CC_LEVEL","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8},{"field":"CC_ACTIVE","titleAr":"CC_ACTIVE","titleEn":"CC_ACTIVE","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9},{"field":"PARENT_ACC","titleAr":"PARENT_ACC","titleEn":"PARENT_ACC","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10},{"field":"DETAIL","titleAr":"DETAIL","titleEn":"DETAIL","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":11},{"field":"CREATED_BY","titleAr":"CREATED_BY","titleEn":"CREATED_BY","inGrid":true,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":12},{"field":"CREATED_AT","titleAr":"CREATED_AT","titleEn":"CREATED_AT","inGrid":true,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"Now","width":150,"order":13},{"field":"UPDATED_BY","titleAr":"UPDATED_BY","titleEn":"UPDATED_BY","inGrid":true,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":14},{"field":"LAST_UPDATE","titleAr":"LAST_UPDATE","titleEn":"LAST_UPDATE","inGrid":true,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"Now","width":150,"order":15},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":16},{"field":"REMARKS","titleAr":"REMARKS","titleEn":"REMARKS","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":17},{"field":"IDExcel","titleAr":"IDExcel","titleEn":"IDExcel","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":18}],"listFields":[],"details":[{"titleAr":"Test","titleEn":"Test","table":"A_ACCOUNT_YEAR","view":"","keyColumn":"CC_CODE","foreignKey":"ACC_CODE","totals":"","orderBy":"","fields":[{"field":"AccountYearID","titleAr":"AccountYearID","titleEn":"AccountYearID","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":3},{"field":"ACC_CODE","titleAr":"ACC_CODE","titleEn":"ACC_CODE","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"FIN_YEAR","titleAr":"FIN_YEAR","titleEn":"FIN_YEAR","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"select","options":"2025:2025 | 2026:2026","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"ACC_LIMIT","titleAr":"ACC_LIMIT","titleEn":"ACC_LIMIT","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"REMARKS","titleAr":"REMARKS","titleEn":"REMARKS","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7}]}],"validations":[],"gridFilter":null,"tree":{"codeColumn":"CC_CODE","parentColumn":"PARENT_ACC","titleColumn":"CC_DESCA","titleColumnEn":"CC_DESCL","levelColumn":"CC_LEVEL","leafColumn":"DETAIL","activeColumn":"CC_ACTIVE","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":false,"field":"","labelAr":"","labelEn":"","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":false,"field":"","approveTrType":"","unapproveTrType":"","approvePermission":"","unapprovePermission":"","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-03T18:59:02.424Z","modifiedBy":"","source":"web"}}
