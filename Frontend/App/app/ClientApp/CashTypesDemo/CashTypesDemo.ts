"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig } from "../Shared/Components/Import/AdvancedFilter";
import { ValidationRule } from "../Shared/Validation";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "D_A_CashTypes";
const ViewName = "D_A_CashTypes";
const KeyColumn = "CashTypeID";
const TrType = "";
const RunProcessTrans = false;
// #endregion

// =======================
// CashTypesDemo  (Grid)
// =======================
export function CashTypesDemo() {
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
        field: "CashTypeID",
        title: t("ID", "المسلسل"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
      },
      {
        field: "CompCode",
        title: t("Company", "الشركة"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: CompCode,
        visibleInView: false,
      },
      {
        field: "BranchCode",
        title: t("Branch", "الفرع"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSearchColumn: false,
        DefaultValue: BranchCode,
        visibleInView: false,
      },
      {
        field: "Description",
        title: t("Description", "الوصف"),
        IsRequired: true,
      },
      {
        field: "ChargePrc",
        title: t("Charge %", "نسبة العمولة"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
      },
      {
        field: "CashAccCode",
        title: t("Cash account", "حساب النقدية"),
      },
      {
        field: "IsActive",
        title: t("Active", "فعال"),
        type: "checkbox",
        inputType: "checkbox",
        DefaultValue: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "CashTypeID", label: t("ID", "المسلسل"), type: "number", sortOrder: 1 },
      { field: "Description", label: t("Description", "الوصف"), type: "text", sortOrder: 2 },
      { field: "ChargePrc", label: t("Charge %", "نسبة العمولة"), type: "number", sortOrder: 3 },
      { field: "CashAccCode", label: t("Cash account", "حساب النقدية"), type: "text", sortOrder: 4 },
      { field: "IsActive", label: t("Active", "فعال"), type: "boolean", sortOrder: 5 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );

  const Validations = useMemo<ValidationRule[]>(
    () => [
      {
        type: "required",
        field: "",
        messageAr: "هذا الحقل مطلوب",
        messageEn: "This field is required",
      },
      {
        type: "range",
        field: "",
        min: "0",
        messageAr: "القيمة أقل من المسموح",
        messageEn: "Value is below minimum",
      },
      {
        type: "range",
        field: "",
        max: "999999",
        messageAr: "القيمة أكبر من المسموح",
        messageEn: "Value exceeds maximum",
      },
      {
        type: "unique",
        field: "",
        messageAr: "هذه القيمة موجودة مسبقاً",
        messageEn: "This value already exists",
      },
      {
        type: "noDuplicate",
        field: "",
        messageAr: "يوجد صفوف مكررة",
        messageEn: "Duplicate rows found",
      },
      {
        detail: 1,
        type: "minRows",
        field: "",
        min: "1",
        messageAr: "يجب إدخال صف واحد على الأقل",
        messageEn: "At least one row required",
      },
      {
        type: "exists",
        field: "",
        messageAr: "القيمة غير موجودة",
        messageEn: "Value not found in reference table",
      },
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
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Grid","Module":"CashTypesDemo","Table":"D_A_CashTypes","View":"D_A_CashTypes","KeyColumn":"CashTypeID","TitleAr":"أنواع النقدية","TitleEn":"Cash Types","SubAr":"","SubEn":"","Icon":"fa-table-list","IconColor":"indigo","PageSize":10,"OrderBy":"","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"1","Fields":[{"Field":"CashTypeID","TitleAr":"المسلسل","TitleEn":"ID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":99},{"Field":"CompCode","TitleAr":"الشركة","TitleEn":"Company","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":99},{"Field":"BranchCode","TitleAr":"الفرع","TitleEn":"Branch","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":99},{"Field":"Description","TitleAr":"الوصف","TitleEn":"Description","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":99},{"Field":"ChargePrc","TitleAr":"نسبة العمولة","TitleEn":"Charge %","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"0","Width":150,"Order":99},{"Field":"CashAccCode","TitleAr":"حساب النقدية","TitleEn":"Cash account","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":99},{"Field":"IsActive","TitleAr":"فعال","TitleEn":"Active","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"true","Width":150,"Order":99}],"ListFields":[],"Details":[],"Validations":[{"Detail":0,"Type":"required","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"هذا الحقل مطلوب","MessageEn":"This field is required"},{"Detail":0,"Type":"range","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"0","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"القيمة أقل من المسموح","MessageEn":"Value is below minimum"},{"Detail":0,"Type":"range","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"","Max":"999999","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"القيمة أكبر من المسموح","MessageEn":"Value exceeds maximum"},{"Detail":0,"Type":"unique","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"هذه القيمة موجودة مسبقاً","MessageEn":"This value already exists"},{"Detail":0,"Type":"noDuplicate","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"يوجد صفوف مكررة","MessageEn":"Duplicate rows found"},{"Detail":1,"Type":"minRows","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"1","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"يجب إدخال صف واحد على الأقل","MessageEn":"At least one row required"},{"Detail":0,"Type":"exists","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"القيمة غير موجودة","MessageEn":"Value not found in reference table"}]}
// @ScreenBuilder-Settings: {"version":4,"screenType":"Grid","module":"CashTypesDemo","table":"D_A_CashTypes","view":"D_A_CashTypes","keyColumn":"CashTypeID","titleAr":"أنواع النقدية","titleEn":"Cash Types","subAr":"","subEn":"","icon":"fa-table-list","iconColor":"indigo","pageSize":10,"orderBy":"","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"","roles":"1"},"fields":[{"field":"CashTypeID","titleAr":"المسلسل","titleEn":"ID","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":99},{"field":"CompCode","titleAr":"الشركة","titleEn":"Company","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":99},{"field":"BranchCode","titleAr":"الفرع","titleEn":"Branch","inGrid":false,"inForm":false,"required":false,"search":false,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":99},{"field":"Description","titleAr":"الوصف","titleEn":"Description","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":99},{"field":"ChargePrc","titleAr":"نسبة العمولة","titleEn":"Charge %","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"0","width":150,"order":99},{"field":"CashAccCode","titleAr":"حساب النقدية","titleEn":"Cash account","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":99},{"field":"IsActive","titleAr":"فعال","titleEn":"Active","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"true","width":150,"order":99}],"listFields":[],"details":[],"validations":[{"detail":0,"type":"required","field":"","when":"both","operator":"","compareTo":"","value":"","min":"","max":"","pattern":"","table":"","condition":"","code":"","messageAr":"هذا الحقل مطلوب","messageEn":"This field is required"},{"detail":0,"type":"range","field":"","when":"both","operator":"","compareTo":"","value":"","min":"0","max":"","pattern":"","table":"","condition":"","code":"","messageAr":"القيمة أقل من المسموح","messageEn":"Value is below minimum"},{"detail":0,"type":"range","field":"","when":"both","operator":"","compareTo":"","value":"","min":"","max":"999999","pattern":"","table":"","condition":"","code":"","messageAr":"القيمة أكبر من المسموح","messageEn":"Value exceeds maximum"},{"detail":0,"type":"unique","field":"","when":"both","operator":"","compareTo":"","value":"","min":"","max":"","pattern":"","table":"","condition":"","code":"","messageAr":"هذه القيمة موجودة مسبقاً","messageEn":"This value already exists"},{"detail":0,"type":"noDuplicate","field":"","when":"both","operator":"","compareTo":"","value":"","min":"","max":"","pattern":"","table":"","condition":"","code":"","messageAr":"يوجد صفوف مكررة","messageEn":"Duplicate rows found"},{"detail":1,"type":"minRows","field":"","when":"both","operator":"","compareTo":"","value":"","min":"1","max":"","pattern":"","table":"","condition":"","code":"","messageAr":"يجب إدخال صف واحد على الأقل","messageEn":"At least one row required"},{"detail":0,"type":"exists","field":"","when":"both","operator":"","compareTo":"","value":"","min":"","max":"","pattern":"","table":"","condition":"","code":"","messageAr":"القيمة غير موجودة","messageEn":"Value not found in reference table"}],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"meta":{"lastModified":"2026-11-03T09:19:33.652Z","modifiedBy":"","source":"web"}}
