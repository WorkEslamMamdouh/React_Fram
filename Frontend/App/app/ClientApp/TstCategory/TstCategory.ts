"use client";

import { useMemo } from "react";
import { useSys } from "../Shared/SystemUsing";
import { MasterDetailColumn } from "../Shared/Components/Import/ModelMasterDetail";
import { TreeScreenConfig } from "../Shared/Components/Import/ModelTree";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "TST_Category";
const ViewName = "TST_Category";
const KeyColumn = "CategoryID";
const TrType = "";
const RunProcessTrans = false;
const ModuleCode = "TstCategory";   // MODULE_CODE للصلاحيات (فاضي = من غير صلاحيات)
// #endregion

// =======================
// TstCategory  (Tree)
// =======================
export function TstCategory() {
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
        field: "CategoryID",
        title: t("Category", "Category"),
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
        field: "ParentID",
        title: t("Parent", "Parent"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "Code",
        title: t("Code", "Code"),
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "NameA",
        title: t("Name AR", "الاسم عربي"),
        IsRequired: true,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "NameE",
        title: t("Name EN", "الاسم انجليزي"),
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "Level",
        title: t("Level", "Level"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "IsActive",
        title: t("Active", "فعال"),
        type: "checkbox",
        inputType: "checkbox",
        IsRequired: true,
        SortFieldInEditAndAdd: 8,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );
  // #endregion

  const Config = useMemo<TreeScreenConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      codeColumn: "CategoryID",
      parentColumn: "ParentID",
      titleColumn: "NameA",
      titleColumnEn: "NameE",
      levelColumn: "Level",
      activeColumn: "IsActive",
      autoCode: false,
      codeDigits: 2,
      codeSeparator: "",
      columns: MasterColumns,
      details: [

      ],
      condition: Condition,
      orderBy: "Code",
      pageSize: 50,
      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,
      enableInsert: true,
      enableUpdate: true,
      enableDelete: true,
      treeTitle: t("Test Categories", "شجرة تصنيفات"),
      newRootTitle: t("New root", "جذر جديد"),
      newChildTitle: t("New child", "إضافة ابن"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode, MasterColumns]
  );

  return { IsLangEN, IsDark, Config };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Tree","Module":"TstCategory","Table":"TST_Category","View":"","KeyColumn":"CategoryID","TitleAr":"شجرة تصنيفات","TitleEn":"Test Categories","SubAr":"","SubEn":"","Icon":"fa-sitemap","IconColor":"indigo","PageSize":10,"OrderBy":"Code","OrderType":"ASC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"CategoryID","TitleAr":"Category","TitleEn":"Category","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"ParentID","TitleAr":"Parent","TitleEn":"Parent","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"Code","TitleAr":"Code","TitleEn":"Code","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"NameA","TitleAr":"الاسم عربي","TitleEn":"Name AR","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"NameE","TitleAr":"الاسم انجليزي","TitleEn":"Name EN","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"Level","TitleAr":"Level","TitleEn":"Level","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"IsActive","TitleAr":"فعال","TitleEn":"Active","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8}],"ListFields":[],"Details":[],"Validations":[],"Tree":{"codeColumn":"CategoryID","parentColumn":"ParentID","titleColumn":"NameA","titleColumnEn":"NameE","levelColumn":"Level","leafColumn":"","activeColumn":"IsActive","autoCode":false,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50}}
// @ScreenBuilder-Settings: {"version":5,"screenType":"Tree","module":"TstCategory","table":"TST_Category","view":"","keyColumn":"CategoryID","titleAr":"شجرة تصنيفات","titleEn":"Test Categories","subAr":"","subEn":"","icon":"fa-sitemap","iconColor":"indigo","pageSize":10,"orderBy":"Code","orderType":"ASC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"CategoryID","titleAr":"Category","titleEn":"Category","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"ParentID","titleAr":"Parent","titleEn":"Parent","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3},{"field":"Code","titleAr":"Code","titleEn":"Code","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"NameA","titleAr":"الاسم عربي","titleEn":"Name AR","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"NameE","titleAr":"الاسم انجليزي","titleEn":"Name EN","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"Level","titleAr":"Level","titleEn":"Level","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7},{"field":"IsActive","titleAr":"فعال","titleEn":"Active","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8}],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"CategoryID","parentColumn":"ParentID","titleColumn":"NameA","titleColumnEn":"NameE","levelColumn":"Level","leafColumn":"","activeColumn":"IsActive","autoCode":false,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":false,"field":"","labelAr":"","labelEn":"","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":false,"field":"","approveTrType":"","unapproveTrType":"","approvePermission":"","unapprovePermission":"","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-05T10:13:38.989Z","modifiedBy":"","source":"web"},"menuSort":0,"layout":{"sections":[{"id":"sec_mw3e1cg41nhd","titleAr":"","titleEn":"","rows":[{"id":"row_mw3e1cg41i6o","cells":[{"id":"cell_mw3e1cg41ftp","kind":"number","field":"ParentID","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3e1cg41ggu","kind":"text","field":"Code","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3e1cg41hur","kind":"text","field":"NameA","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3e1cg41mfi","cells":[{"id":"cell_mw3e1cg41j4g","kind":"text","field":"NameE","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3e1cg41k9r","kind":"number","field":"Level","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3e1cg41l9g","kind":"checkbox","field":"IsActive","span":{"base":12,"md":6,"lg":4}}]}]}]},"filterArea":[],"actions":[],"print":{"listPrint":{"enabled":false,"proc":"","params":[],"paper":"A4","orientation":"portrait"},"transactionPrint":{"enabled":false,"proc":"","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"TrID","source":"row","value":""}],"paper":"A4","orientation":"portrait"}},"excel":{"enabled":false,"templateName":"","columns":[],"keyLookups":[]},"importedBestEffort":false}
