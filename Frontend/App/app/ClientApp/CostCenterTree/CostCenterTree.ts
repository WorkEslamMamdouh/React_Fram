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
// CostCenterTree  (Tree)
// =======================
export function CostCenterTree() {
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
        title: t("ID", "المسلسل"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
      },
      {
        field: "CompCode",
        title: t("Company", "كود الشركة"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: CompCode,
        visibleInView: false,
      },
      {
        field: "BranchCode",
        title: t("Branch", "كود الفرع"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: BranchCode,
        visibleInView: false,
      },
      {
        field: "CC_CODE",
        title: t("Code", "الكود"),
        IsRequired: true,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "CC_DESCA",
        title: t("Arabic name", "الاسم عربي"),
        IsRequired: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "CC_DESCL",
        title: t("English name", "الاسم انجليزي"),
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "PARENT_ACC",
        title: t("Parent", "الأب"),
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "CC_LEVEL",
        title: t("Level", "المستوى"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "DETAIL",
        title: t("Detail", "نهائي"),
        type: "checkbox",
        inputType: "checkbox",
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "CC_ACTIVE",
        title: t("Active", "فعال"),
        type: "checkbox",
        inputType: "checkbox",
        DefaultValue: true,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "REMARKS",
        title: t("Remarks", "ملاحظات"),
        inputType: "textarea",
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "CREATED_BY",
        title: t("Created by", "بواسطة"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: UserName,
      },
      {
        field: "CREATED_AT",
        title: t("Created at", "تاريخ الإنشاء"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: Today,
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
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "UPDATED_BY",
        title: t("UPDATED_BY", "UPDATED_BY"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
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
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "IDExcel",
        title: t("IDExcel", "IDExcel"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 18,
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
      treeTitle: t("Cost Centers", "مراكز التكلفة"),
      newRootTitle: t("New root", "جذر جديد"),
      newChildTitle: t("New child", "إضافة ابن"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode, MasterColumns]
  );

  return { IsLangEN, IsDark, Config };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Tree","Module":"CostCenterTree","Table":"A_Cost_Center","View":"","KeyColumn":"CostCenterID","TitleAr":"مراكز التكلفة","TitleEn":"Cost Centers","SubAr":"شجرة مراكز التكلفة","SubEn":"Cost centers tree","Icon":"fa-sitemap","IconColor":"indigo","PageSize":10,"OrderBy":"CC_CODE","OrderType":"ASC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"CostCenterID","TitleAr":"المسلسل","TitleEn":"ID","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":99},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":99},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":99},{"Field":"CC_CODE","TitleAr":"الكود","TitleEn":"Code","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CC_DESCA","TitleAr":"الاسم عربي","TitleEn":"Arabic name","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":2},{"Field":"CC_DESCL","TitleAr":"الاسم انجليزي","TitleEn":"English name","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"PARENT_ACC","TitleAr":"الأب","TitleEn":"Parent","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"CC_LEVEL","TitleAr":"المستوى","TitleEn":"Level","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"DETAIL","TitleAr":"نهائي","TitleEn":"Detail","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"CC_ACTIVE","TitleAr":"فعال","TitleEn":"Active","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"true","Width":150,"Order":7},{"Field":"REMARKS","TitleAr":"ملاحظات","TitleEn":"Remarks","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"textarea","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8},{"Field":"CREATED_BY","TitleAr":"بواسطة","TitleEn":"Created by","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"UserName","Width":150,"Order":99},{"Field":"CREATED_AT","TitleAr":"تاريخ الإنشاء","TitleEn":"Created at","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"GetDateNow()","Width":150,"Order":99},{"Field":"CC_GROUP","TitleAr":"CC_GROUP","TitleEn":"CC_GROUP","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"CC_TYPE","TitleAr":"CC_TYPE","TitleEn":"CC_TYPE","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"UPDATED_BY","TitleAr":"UPDATED_BY","TitleEn":"UPDATED_BY","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":14},{"Field":"LAST_UPDATE","TitleAr":"LAST_UPDATE","TitleEn":"LAST_UPDATE","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":15},{"Field":"IDExcel","TitleAr":"IDExcel","TitleEn":"IDExcel","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":18}],"ListFields":[],"Details":[],"Validations":[],"Tree":{"codeColumn":"CC_CODE","parentColumn":"PARENT_ACC","titleColumn":"CC_DESCA","titleColumnEn":"CC_DESCL","levelColumn":"CC_LEVEL","leafColumn":"DETAIL","activeColumn":"CC_ACTIVE","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50}}
// @ScreenBuilder-Settings: {"version":4,"screenType":"Tree","module":"CostCenterTree","table":"A_Cost_Center","view":"","keyColumn":"CostCenterID","titleAr":"مراكز التكلفة","titleEn":"Cost Centers","subAr":"شجرة مراكز التكلفة","subEn":"Cost centers tree","icon":"fa-sitemap","iconColor":"indigo","pageSize":10,"orderBy":"CC_CODE","orderType":"ASC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"CostCenterID","titleAr":"المسلسل","titleEn":"ID","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":99,"noSave":false},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":99,"noSave":false},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":99,"noSave":false},{"field":"CC_CODE","titleAr":"الكود","titleEn":"Code","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1,"noSave":false},{"field":"CC_DESCA","titleAr":"الاسم عربي","titleEn":"Arabic name","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":2,"noSave":false},{"field":"CC_DESCL","titleAr":"الاسم انجليزي","titleEn":"English name","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3,"noSave":false},{"field":"PARENT_ACC","titleAr":"الأب","titleEn":"Parent","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4,"noSave":false},{"field":"CC_LEVEL","titleAr":"المستوى","titleEn":"Level","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5,"noSave":false},{"field":"DETAIL","titleAr":"نهائي","titleEn":"Detail","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6,"noSave":false},{"field":"CC_ACTIVE","titleAr":"فعال","titleEn":"Active","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"true","width":150,"order":7,"noSave":false},{"field":"REMARKS","titleAr":"ملاحظات","titleEn":"Remarks","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"textarea","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8,"noSave":false},{"field":"CREATED_BY","titleAr":"بواسطة","titleEn":"Created by","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"UserName","width":150,"order":99,"noSave":false},{"field":"CREATED_AT","titleAr":"تاريخ الإنشاء","titleEn":"Created at","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"GetDateNow()","width":150,"order":99,"noSave":false},{"field":"CC_GROUP","titleAr":"CC_GROUP","titleEn":"CC_GROUP","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"CC_TYPE","titleAr":"CC_TYPE","titleEn":"CC_TYPE","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7},{"field":"UPDATED_BY","titleAr":"UPDATED_BY","titleEn":"UPDATED_BY","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":14},{"field":"LAST_UPDATE","titleAr":"LAST_UPDATE","titleEn":"LAST_UPDATE","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":15},{"field":"IDExcel","titleAr":"IDExcel","titleEn":"IDExcel","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":18}],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"CC_CODE","parentColumn":"PARENT_ACC","titleColumn":"CC_DESCA","titleColumnEn":"CC_DESCL","levelColumn":"CC_LEVEL","leafColumn":"DETAIL","activeColumn":"CC_ACTIVE","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"meta":{"lastModified":"2026-11-03T09:07:14.255Z","modifiedBy":"","source":"web"}}
