"use client";

// =====================================================================================
//  📄 FinTrans_Expenses.ts   ←  ملف المنطق (البيزنس) — شاشة المصروفات
//  اتعمل أوتوماتيك من برنامج CreatePageReact — تقدر تفتحه في البرنامج وتعدّله
// -------------------------------------------------------------------------------------
//  الجدول : I_TR_FinancialTransactions
//  الحفظ  : مع G_ProcessTrans  (@TrType = 'Fin_Expenses')
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import { ACCOUNT, CashTypes, FinancialType } from "../Shared/G_SearchFrom";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "I_TR_FinancialTransactions";
const KeyColumn = "TransactionID";
const TrType = "Fin_Expenses";             // بيروح لـ @TrType في G_ProcessTrans
const RunProcessTrans = true;       // true = شغّل G_ProcessTrans بعد كل حفظ أو حذف

const DefaultFilters: ActiveFilter[] = [];
// #endregion

// =======================
// FinTrans_Expenses
// =======================
export function FinTrans_Expenses() {
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
  const Condition = `CompCode = ${CompCode} AND BranchCode = ${BranchCode}`;

  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "TransactionID",
        title: t("ID", "الرقم"),
        type: "number",
        inputType: "number",
        width: 90,
        editable: false,
        insertable: false,          // ترقيم تلقائي
        IsSave: true,
      },
      {
        field: "TrNo",
        title: t("Trans No", "رقم الحركة"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "RefNo",
        title: t("Ref No", "رقم المرجع"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "TransactionDate",
        title: t("Transaction Date", "Transaction Date"),
        type: "date",
        inputType: "date",
        width: 220,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 3,
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
        field: "IsActive",
        title: t("Active", "فعال"),
        type: "checkbox",
        DefaultValue: true,
        width: 100,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "IsCash",
        title: t("Is Cash", "Is Cash"),
        type: "checkbox",
        DefaultValue: true,
        width: 100,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "FinancialTypeID",
        title: t("Financial Type ID", "Financial Type"),
        inputType: "search",
        searchModal: FinancialType(),
        placeholder: t("Press 🔍 to pick", "دوس 🔍 للاختيار"),
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "BeneficiaryName",
        title: t("Beneficiary Name", "المستفيد"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "CashTypeID",
        title: t("Cash Type", "Cash Type"),
        inputType: "search",
        searchModal: CashTypes(),
        placeholder: t("Press 🔍 to pick", "دوس 🔍 للاختيار"),
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "Reason",
        title: t("Reason", "السبب"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "Amount",
        title: t("Amount", "المبلغ"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "AccountCode",
        title: t("Account Code", "Account Code"),
        inputType: "search",
        searchModal: ACCOUNT(),
        placeholder: t("Press 🔍 to pick", "دوس 🔍 للاختيار"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "TrType",
        title: t("Type", "النوع"),
        type: "checkbox",
        DefaultValue: true,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "ChargePrc",
        title: t("Charge Prc", "Charge Prc"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "DueAmount",
        title: t("Due Amount", "Due Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "LoanPayAmount",
        title: t("Loan Pay Amount", "Loan Pay Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "CustodyPayAmount",
        title: t("Custody Pay Amount", "Custody Pay Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        type: "number",
        inputType: "number",
        DefaultValue: 1,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "Remarks",
        title: t("Remarks", "ملاحظات"),
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "IDUserCreate",
        title: t("IDUser Create", "IDUser Create"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "CreatedAt",
        title: t("Created at", "تاريخ الإنشاء"),
        type: "date",
        inputType: "date",
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "CreatedBy",
        title: t("Created by", "أنشئ بواسطة"),
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "UpdatedAt",
        title: t("Updated at", "تاريخ التعديل"),
        type: "date",
        inputType: "date",
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "UpdatedBy",
        title: t("Updated by", "عدّل بواسطة"),
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
      {
        field: "IDPeriod",
        title: t("IDPeriod", "IDPeriod"),
        width: 220,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس
        IsVisibleDisplayInGrid: false,
        IsSearchColumn: false,
      },
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "TransactionID", label: t("ID", "الرقم"), type: "number", sortOrder: 1 },
      { field: "TrNo", label: t("Trans No", "رقم الحركة"), type: "number", sortOrder: 2 },
      { field: "RefNo", label: t("Ref No", "رقم المرجع"), type: "text", sortOrder: 3 },
      { field: "TransactionDate", label: t("Transaction Date", "Transaction Date"), type: "dateRange", sortOrder: 4 },
      { field: "IsActive", label: t("Active", "فعال"), type: "select", options: [{ value: "1", label: t("Yes", "نعم") }, { value: "0", label: t("No", "لا") }], sortOrder: 5 },
      { field: "IsCash", label: t("Is Cash", "Is Cash"), type: "select", options: [{ value: "1", label: t("Yes", "نعم") }, { value: "0", label: t("No", "لا") }], sortOrder: 6 },
      { field: "FinancialTypeID", label: t("Financial Type ID", "Financial Type"), type: "search", searchModal: FinancialType(), sortOrder: 7 },
      { field: "BeneficiaryName", label: t("Beneficiary Name", "المستفيد"), type: "text", sortOrder: 8 },
      { field: "CashTypeID", label: t("Cash Type", "Cash Type"), type: "search", searchModal: CashTypes(), sortOrder: 9 },
      { field: "Reason", label: t("Reason", "السبب"), type: "text", sortOrder: 10 },
      { field: "Amount", label: t("Amount", "المبلغ"), type: "number", sortOrder: 11 },
      { field: "AccountCode", label: t("Account Code", "Account Code"), type: "search", searchModal: ACCOUNT(), sortOrder: 12 },
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
    OrderBy: "TransactionID",
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
// @CreatePageReact-Settings: {"Version":2,"Module":"FinTrans_Expenses","Table":"I_TR_FinancialTransactions","KeyColumn":"TransactionID","TitleAr":"المصروفات","TitleEn":"Expenses","SubAr":"المصروفات","SubEn":"Expenses","Icon":"fa-table-list","PageSize":10,"ProcessTrans":true,"TrType":"Fin_Expenses","FilterComp":true,"FilterBranch":true,"ExtraCondition":"","OrderBy":"TransactionID","OrderType":"DESC","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","IconColor":"indigo","Roles":"","Fields":[{"Field":"TransactionID","TitleAr":"الرقم","TitleEn":"ID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":90,"Order":1},{"Field":"TrNo","TitleAr":"رقم الحركة","TitleEn":"Trans No","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":2},{"Field":"RefNo","TitleAr":"رقم المرجع","TitleEn":"Ref No","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":3},{"Field":"TransactionDate","TitleAr":"Transaction Date","TitleEn":"Transaction Date","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":4},{"Field":"CompCode","TitleAr":"Comp Code","TitleEn":"Comp Code","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"CompCode","DefaultValue":"","Width":120,"Order":5},{"Field":"BranchCode","TitleAr":"Branch Code","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"BranchCode","DefaultValue":"","Width":120,"Order":6},{"Field":"IsActive","TitleAr":"فعال","TitleEn":"Active","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"true","Width":100,"Order":7},{"Field":"IsCash","TitleAr":"Is Cash","TitleEn":"Is Cash","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"true","Width":100,"Order":8},{"Field":"FinancialTypeID","TitleAr":"Financial Type","TitleEn":"Financial Type ID","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"search","Options":"","SearchFn":"FinancialType","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":9},{"Field":"BeneficiaryName","TitleAr":"المستفيد","TitleEn":"Beneficiary Name","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":10},{"Field":"CashTypeID","TitleAr":"Cash Type","TitleEn":"Cash Type","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"search","Options":"","SearchFn":"CashTypes","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":11},{"Field":"Reason","TitleAr":"السبب","TitleEn":"Reason","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":12},{"Field":"Amount","TitleAr":"المبلغ","TitleEn":"Amount","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":13},{"Field":"AccountCode","TitleAr":"Account Code","TitleEn":"Account Code","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"search","Options":"","SearchFn":"ACCOUNT","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":14},{"Field":"TrType","TitleAr":"النوع","TitleEn":"Type","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"1","Auto":"","DefaultValue":"1","Width":120,"Order":15},{"Field":"ChargePrc","TitleAr":"Charge Prc","TitleEn":"Charge Prc","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":16},{"Field":"DueAmount","TitleAr":"Due Amount","TitleEn":"Due Amount","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":17},{"Field":"LoanPayAmount","TitleAr":"Loan Pay Amount","TitleEn":"Loan Pay Amount","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":18},{"Field":"CustodyPayAmount","TitleAr":"Custody Pay Amount","TitleEn":"Custody Pay Amount","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":19},{"Field":"Status","TitleAr":"الحالة","TitleEn":"Status","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"1","Width":120,"Order":20},{"Field":"Remarks","TitleAr":"ملاحظات","TitleEn":"Remarks","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":21},{"Field":"IDUserCreate","TitleAr":"IDUser Create","TitleEn":"IDUser Create","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"0","Width":120,"Order":22},{"Field":"CreatedAt","TitleAr":"تاريخ الإنشاء","TitleEn":"Created at","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":23},{"Field":"CreatedBy","TitleAr":"أنشئ بواسطة","TitleEn":"Created by","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":24},{"Field":"UpdatedAt","TitleAr":"تاريخ التعديل","TitleEn":"Updated at","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":25},{"Field":"UpdatedBy","TitleAr":"عدّل بواسطة","TitleEn":"Updated by","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":26},{"Field":"IDPeriod","TitleAr":"IDPeriod","TitleEn":"IDPeriod","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","Auto":"","DefaultValue":"","Width":220,"Order":27}]}
