"use client";

// =====================================================================================
//  📄 Employees.ts   ←  ملف المنطق (البيزنس) — شاشة Employees
//  اتعمل أوتوماتيك من برنامج CreatePageReact — تقدر تفتحه في البرنامج وتعدّله
// -------------------------------------------------------------------------------------
//  الجدول : G_D_Employees
//  الحفظ  : عادي من غير G_ProcessTrans
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import { TEst } from "../Shared/G_SearchFrom";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "G_D_Employees";
const KeyColumn = "EmpID";
const TrType = "";             // بيروح لـ @TrType في G_ProcessTrans
const RunProcessTrans = false;       // true = شغّل G_ProcessTrans بعد كل حفظ أو حذف

const DefaultFilters: ActiveFilter[] = [];
// #endregion

// =======================
// Employees
// =======================
export function Employees() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    InitalizeComponent();
  }, []);

  // =======================
  // #region UsingSystem Glopal
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  // قيم الجلسة (الشركة / الفرع / المستخدم / السنة)
  const CompCode = Session?.CurrentEnvironment?.CompCode || 1;
  const BranchCode = Session?.CurrentEnvironment?.BranchCode || 1;
  const UserID = Session?.CurrentEnvironment?.UserID || 0;
  const FinYear = Session?.CurrentEnvironment?.FinYear || new Date().getFullYear();
  // #endregion

  // =======================
  // #region State
  // =======================
  const [gridKey, setGridKey] = useState(0);   // لما يزيد الجدول بيتحمل من جديد
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  function InitalizeComponent() {
    // الجدول بيحمّل بياناته لوحده
  }

  // =======================
  // #region Events Elements Html
  // =======================
  function RefreshGrid() {
    setGridKey((k) => k + 1);
  }
  // #endregion

  // =======================
  // #region إعدادات الجدول DynamicGrid
  // =======================
  //  ⚠️ الأعمدة والفلاتر جوه useMemo عشان الجدول ميعيدش التحميل على طول

  // الشرط اللي بيتعرض بيه الجدول
  const Condition = `CompCode = ${CompCode}`;

  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "EmpID",
        title: t("ID", "الرقم"),
        type: "number",
        inputType: "number",
        width: 90,
        editable: false,
        insertable: false,          // ترقيم تلقائي
        IsSave: true,
      },
      {
        field: "User_Login",
        title: t("User Login", "User Login"),
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
      },
      {
        field: "Password_Login",
        title: t("Password Login", "Password Login"),
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
      },
      {
        field: "EmpCode",
        title: t("Emp Code", "Emp Code"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "CompCode",
        title: t("Comp Code", "Comp Code"),
        type: "number",
        inputType: "number",
        DefaultValue: CompCode,          // تلقائي من الجلسة
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "BranchCode",
        title: t("Branch Code", "Branch Code"),
        type: "number",
        inputType: "number",
        DefaultValue: BranchCode,          // تلقائي من الجلسة
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "Emp_Name",
        title: t("Emp Name", "Emp Name"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "EmpType",
        title: t("Emp Type", "Emp Type"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "EmpRole",
        title: t("Emp Role", "Emp Role"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "IsUser",
        title: t("Is User", "Is User"),
        type: "checkbox",
        DefaultValue: true,
        width: 100,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "Address",
        title: t("Address", "Address"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "Mobile",
        title: t("Mobile", "Mobile"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "Mobile2",
        title: t("Mobile2", "Mobile2"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "Email",
        title: t("Email", "Email"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "ManagedBy",
        title: t("Managed By", "Managed By"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "LoginUrl",
        title: t("Login Url", "Login Url"),
        type: "checkbox",
        DefaultValue: true,
        width: 100,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "Remarks",
        title: t("Remarks", "ملاحظات"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "ManagerID",
        title: t("Manager ID", "Manager ID"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 14,
      },
      {
        field: "SupervisorID",
        title: t("Supervisor ID", "Supervisor ID"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "FamilyZoneID",
        title: t("Family Zone ID", "Family Zone ID"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 16,
      },
      {
        field: "ZoneID",
        title: t("Zone ID", "Zone ID"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 17,
      },
      {
        field: "Job_Title",
        title: t("Job Title", "Job Title"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 18,
      },
      {
        field: "CreatedAt",
        title: t("Created at", "تاريخ الإنشاء"),
        type: "date",
        inputType: "date",
        width: 220,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 19,
      },
      {
        field: "CreatedBy",
        title: t("Created by", "أنشئ بواسطة"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 20,
      },
      {
        field: "UpdatedAt",
        title: t("Updated at", "تاريخ التعديل"),
        type: "date",
        inputType: "date",
        width: 220,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 21,
      },
      {
        field: "UpdatedBy",
        title: t("Updated by", "عدّل بواسطة"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 22,
      },
      {
        field: "Profile_Img",
        title: t("Profile Img", "Profile Img"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 23,
      },
      {
        field: "FrontID_Img",
        title: t("Front ID Img", "Front ID Img"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 24,
      },
      {
        field: "BackID_Img",
        title: t("Back ID Img", "Back ID Img"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 25,
      },
      {
        field: "Gender",
        title: t("Gender", "Gender"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 26,
      },
      {
        field: "IDNO",
        title: t("IDNO", "IDNO"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 27,
      },
      {
        field: "FrontDrivLicense_Img",
        title: t("Front Driv License Img", "Front Driv License Img"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 28,
      },
      {
        field: "BackDrivLicense_Img",
        title: t("Back Driv License Img", "Back Driv License Img"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 29,
      },
      {
        field: "FrontVicLicense_Img",
        title: t("Front Vic License Img", "Front Vic License Img"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 30,
      },
      {
        field: "BackVicLicense_Img",
        title: t("Back Vic License Img", "Back Vic License Img"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 31,
      },
      {
        field: "AccTransferNo",
        title: t("Acc Transfer No", "Acc Transfer No"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 32,
      },
      {
        field: "AccNameTransfer",
        title: t("Acc Name Transfer", "Acc Name Transfer"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 33,
      },
      {
        field: "ACC_CODE",
        title: t("ACC CODE", "ACC CODE"),
        inputType: "search",
        searchModal: TEst(),
        placeholder: t("Press 🔍 to pick", "دوس 🔍 للاختيار"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 34,
      },
      {
        field: "Custody_Code",
        title: t("Custody Code", "Custody Code"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 35,
      },
      {
        field: "Loan_Code",
        title: t("Loan Code", "Loan Code"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 36,
      },
      {
        field: "PayLoan_Cust_Code",
        title: t("Pay Loan Cust Code", "Pay Loan Cust Code"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 37,
      },
      {
        field: "CustodyAmount",
        title: t("Custody Amount", "Custody Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 38,
      },
      {
        field: "LoanAmount",
        title: t("Loan Amount", "Loan Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 39,
      },
      {
        field: "SalaryAmount",
        title: t("Salary Amount", "Salary Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 40,
      },
      {
        field: "IDExcel",
        title: t("IDExcel", "IDExcel"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 41,
      },
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "EmpID", label: t("ID", "الرقم"), type: "number", sortOrder: 1 },
      { field: "User_Login", label: t("User Login", "User Login"), type: "text", sortOrder: 2 },
      { field: "Password_Login", label: t("Password Login", "Password Login"), type: "text", sortOrder: 3 },
      { field: "EmpCode", label: t("Emp Code", "Emp Code"), type: "text", sortOrder: 4 },
      { field: "Emp_Name", label: t("Emp Name", "Emp Name"), type: "text", sortOrder: 5 },
      { field: "EmpType", label: t("Emp Type", "Emp Type"), type: "number", sortOrder: 6 },
      { field: "EmpRole", label: t("Emp Role", "Emp Role"), type: "number", sortOrder: 7 },
      { field: "IsUser", label: t("Is User", "Is User"), type: "select", options: [{ value: "1", label: t("Yes", "نعم") }, { value: "0", label: t("No", "لا") }], sortOrder: 8 },
      { field: "Status", label: t("Status", "الحالة"), type: "number", sortOrder: 9 },
      { field: "Address", label: t("Address", "Address"), type: "text", sortOrder: 10 },
      { field: "Mobile", label: t("Mobile", "Mobile"), type: "text", sortOrder: 11 },
      { field: "Mobile2", label: t("Mobile2", "Mobile2"), type: "text", sortOrder: 12 },
      { field: "Email", label: t("Email", "Email"), type: "text", sortOrder: 13 },
      { field: "ManagedBy", label: t("Managed By", "Managed By"), type: "text", sortOrder: 14 },
      { field: "LoginUrl", label: t("Login Url", "Login Url"), type: "select", options: [{ value: "1", label: t("Yes", "نعم") }, { value: "0", label: t("No", "لا") }], sortOrder: 15 },
      { field: "Remarks", label: t("Remarks", "ملاحظات"), type: "text", sortOrder: 16 },
      { field: "ManagerID", label: t("Manager ID", "Manager ID"), type: "number", sortOrder: 17 },
      { field: "SupervisorID", label: t("Supervisor ID", "Supervisor ID"), type: "number", sortOrder: 18 },
      { field: "FamilyZoneID", label: t("Family Zone ID", "Family Zone ID"), type: "number", sortOrder: 19 },
      { field: "ZoneID", label: t("Zone ID", "Zone ID"), type: "number", sortOrder: 20 },
      { field: "Job_Title", label: t("Job Title", "Job Title"), type: "text", sortOrder: 21 },
      { field: "CreatedAt", label: t("Created at", "تاريخ الإنشاء"), type: "dateRange", sortOrder: 22 },
      { field: "CreatedBy", label: t("Created by", "أنشئ بواسطة"), type: "text", sortOrder: 23 },
      { field: "UpdatedAt", label: t("Updated at", "تاريخ التعديل"), type: "dateRange", sortOrder: 24 },
      { field: "UpdatedBy", label: t("Updated by", "عدّل بواسطة"), type: "text", sortOrder: 25 },
      { field: "Profile_Img", label: t("Profile Img", "Profile Img"), type: "text", sortOrder: 26 },
      { field: "FrontID_Img", label: t("Front ID Img", "Front ID Img"), type: "text", sortOrder: 27 },
      { field: "BackID_Img", label: t("Back ID Img", "Back ID Img"), type: "text", sortOrder: 28 },
      { field: "Gender", label: t("Gender", "Gender"), type: "number", sortOrder: 29 },
      { field: "IDNO", label: t("IDNO", "IDNO"), type: "text", sortOrder: 30 },
      { field: "FrontDrivLicense_Img", label: t("Front Driv License Img", "Front Driv License Img"), type: "text", sortOrder: 31 },
      { field: "BackDrivLicense_Img", label: t("Back Driv License Img", "Back Driv License Img"), type: "text", sortOrder: 32 },
      { field: "FrontVicLicense_Img", label: t("Front Vic License Img", "Front Vic License Img"), type: "text", sortOrder: 33 },
      { field: "BackVicLicense_Img", label: t("Back Vic License Img", "Back Vic License Img"), type: "text", sortOrder: 34 },
      { field: "AccTransferNo", label: t("Acc Transfer No", "Acc Transfer No"), type: "text", sortOrder: 35 },
      { field: "AccNameTransfer", label: t("Acc Name Transfer", "Acc Name Transfer"), type: "text", sortOrder: 36 },
      { field: "ACC_CODE", label: t("ACC CODE", "ACC CODE"), type: "search", searchModal: TEst(), sortOrder: 37 },
      { field: "Custody_Code", label: t("Custody Code", "Custody Code"), type: "text", sortOrder: 38 },
      { field: "Loan_Code", label: t("Loan Code", "Loan Code"), type: "text", sortOrder: 39 },
      { field: "PayLoan_Cust_Code", label: t("Pay Loan Cust Code", "Pay Loan Cust Code"), type: "text", sortOrder: 40 },
      { field: "CustodyAmount", label: t("Custody Amount", "Custody Amount"), type: "number", sortOrder: 41 },
      { field: "LoanAmount", label: t("Loan Amount", "Loan Amount"), type: "number", sortOrder: 42 },
      { field: "SalaryAmount", label: t("Salary Amount", "Salary Amount"), type: "number", sortOrder: 43 },
      { field: "IDExcel", label: t("IDExcel", "IDExcel"), type: "number", sortOrder: 44 },
    ],
    [IsLangEN]
  );
  // #endregion

  // =======================
  // UI
  // =======================
  const state = {
    IsLangEN,
    IsDark,
    gridKey,
  };

  const actions = {
    RefreshGrid,
  };

  const grid = {
    TableName,
    KeyColumn,
    TrType,
    RunProcessTrans,
    Condition,
    CompCode,
    BranchCode,
    Columns,
    FilterFields,
    DefaultFilters,
    OrderBy: "EmpID",
    OrderType: "DESC" as "ASC" | "DESC",
    PageSize: 10,
    EnableInsert: true,
    EnableUpdate: true,
    EnableDelete: true,
    EnableExport: true,
  };

  return {
    ...state,
    ...actions,
    grid,
  };
}

// ⚠️ السطر اللي تحت ده بيقراه برنامج CreatePageReact عشان يفتح الشاشة ويعدّلها — متمسحوش
// @CreatePageReact-Settings: {"Version":2,"Module":"Employees","Table":"G_D_Employees","KeyColumn":"EmpID","TitleAr":"Employees","TitleEn":"Employees","SubAr":"Employees","SubEn":"Employees","Icon":"fa-table-list","PageSize":10,"ProcessTrans":false,"TrType":"","FilterComp":true,"FilterBranch":false,"ExtraCondition":"","OrderBy":"EmpID","OrderType":"DESC","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","IconColor":"indigo","Roles":"","Fields":[{"Field":"EmpID","TitleAr":"الرقم","TitleEn":"ID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":90,"Order":1},{"Field":"User_Login","TitleAr":"User Login","TitleEn":"User Login","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":2},{"Field":"Password_Login","TitleAr":"Password Login","TitleEn":"Password Login","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":3},{"Field":"EmpCode","TitleAr":"Emp Code","TitleEn":"Emp Code","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":4},{"Field":"CompCode","TitleAr":"Comp Code","TitleEn":"Comp Code","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"CompCode","DefaultValue":"","Width":120,"Order":5},{"Field":"BranchCode","TitleAr":"Branch Code","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"BranchCode","DefaultValue":"","Width":120,"Order":6},{"Field":"Emp_Name","TitleAr":"Emp Name","TitleEn":"Emp Name","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":7},{"Field":"EmpType","TitleAr":"Emp Type","TitleEn":"Emp Type","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":8},{"Field":"EmpRole","TitleAr":"Emp Role","TitleEn":"Emp Role","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":9},{"Field":"IsUser","TitleAr":"Is User","TitleEn":"Is User","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":100,"Order":10},{"Field":"Status","TitleAr":"الحالة","TitleEn":"Status","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":11},{"Field":"Address","TitleAr":"Address","TitleEn":"Address","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":12},{"Field":"Mobile","TitleAr":"Mobile","TitleEn":"Mobile","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":13},{"Field":"Mobile2","TitleAr":"Mobile2","TitleEn":"Mobile2","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":14},{"Field":"Email","TitleAr":"Email","TitleEn":"Email","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":15},{"Field":"ManagedBy","TitleAr":"Managed By","TitleEn":"Managed By","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":16},{"Field":"LoginUrl","TitleAr":"Login Url","TitleEn":"Login Url","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":100,"Order":17},{"Field":"Remarks","TitleAr":"ملاحظات","TitleEn":"Remarks","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":18},{"Field":"ManagerID","TitleAr":"Manager ID","TitleEn":"Manager ID","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":19},{"Field":"SupervisorID","TitleAr":"Supervisor ID","TitleEn":"Supervisor ID","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":20},{"Field":"FamilyZoneID","TitleAr":"Family Zone ID","TitleEn":"Family Zone ID","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":21},{"Field":"ZoneID","TitleAr":"Zone ID","TitleEn":"Zone ID","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":22},{"Field":"Job_Title","TitleAr":"Job Title","TitleEn":"Job Title","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":23},{"Field":"CreatedAt","TitleAr":"تاريخ الإنشاء","TitleEn":"Created at","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":24},{"Field":"CreatedBy","TitleAr":"أنشئ بواسطة","TitleEn":"Created by","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":25},{"Field":"UpdatedAt","TitleAr":"تاريخ التعديل","TitleEn":"Updated at","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":26},{"Field":"UpdatedBy","TitleAr":"عدّل بواسطة","TitleEn":"Updated by","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":27},{"Field":"Profile_Img","TitleAr":"Profile Img","TitleEn":"Profile Img","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":28},{"Field":"FrontID_Img","TitleAr":"Front ID Img","TitleEn":"Front ID Img","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":29},{"Field":"BackID_Img","TitleAr":"Back ID Img","TitleEn":"Back ID Img","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":30},{"Field":"Gender","TitleAr":"Gender","TitleEn":"Gender","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":31},{"Field":"IDNO","TitleAr":"IDNO","TitleEn":"IDNO","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":32},{"Field":"FrontDrivLicense_Img","TitleAr":"Front Driv License Img","TitleEn":"Front Driv License Img","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":33},{"Field":"BackDrivLicense_Img","TitleAr":"Back Driv License Img","TitleEn":"Back Driv License Img","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":34},{"Field":"FrontVicLicense_Img","TitleAr":"Front Vic License Img","TitleEn":"Front Vic License Img","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":35},{"Field":"BackVicLicense_Img","TitleAr":"Back Vic License Img","TitleEn":"Back Vic License Img","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":36},{"Field":"AccTransferNo","TitleAr":"Acc Transfer No","TitleEn":"Acc Transfer No","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":37},{"Field":"AccNameTransfer","TitleAr":"Acc Name Transfer","TitleEn":"Acc Name Transfer","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":38},{"Field":"ACC_CODE","TitleAr":"ACC CODE","TitleEn":"ACC CODE","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"search","Options":"","SearchFn":"TEst","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":39},{"Field":"Custody_Code","TitleAr":"Custody Code","TitleEn":"Custody Code","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":40},{"Field":"Loan_Code","TitleAr":"Loan Code","TitleEn":"Loan Code","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":41},{"Field":"PayLoan_Cust_Code","TitleAr":"Pay Loan Cust Code","TitleEn":"Pay Loan Cust Code","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":42},{"Field":"CustodyAmount","TitleAr":"Custody Amount","TitleEn":"Custody Amount","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":43},{"Field":"LoanAmount","TitleAr":"Loan Amount","TitleEn":"Loan Amount","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":44},{"Field":"SalaryAmount","TitleAr":"Salary Amount","TitleEn":"Salary Amount","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":45},{"Field":"IDExcel","TitleAr":"IDExcel","TitleEn":"IDExcel","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":120,"Order":46}]}
