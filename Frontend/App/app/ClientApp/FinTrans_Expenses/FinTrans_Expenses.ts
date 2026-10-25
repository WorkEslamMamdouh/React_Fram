"use client";

// =====================================================================================
//  📄 FinTrans_Expenses.ts   ←  ملف المنطق (البيزنس) — شاشة المصروفات
//  اتعمل أوتوماتيك من برنامج CreatePageReact
// -------------------------------------------------------------------------------------
//  الجدول : I_TR_FinancialTransactions
//  الحفظ  : مع G_ProcessTrans  (@TrType = '1')
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";

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
        title: t("Ref No", "Ref No"),
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
        field: "TrType",
        title: t("Type", "النوع"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "IsCash",
        title: t("Is Cash", "Is Cash"),
        type: "checkbox",
        DefaultValue: true,
        width: 100,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "FinancialTypeID",
        title: t("Financial Type ID", "Financial Type ID"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "CashTypeID",
        title: t("Cash Type ID", "Cash Type ID"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "AccountCode",
        title: t("Account Code", "Account Code"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "BeneficiaryName",
        title: t("Beneficiary Name", "Beneficiary Name"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "Reason",
        title: t("Reason", "Reason"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 11,
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
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "ChargePrc",
        title: t("Charge Prc", "Charge Prc"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "DueAmount",
        title: t("Due Amount", "Due Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 14,
      },
      {
        field: "LoanPayAmount",
        title: t("Loan Pay Amount", "Loan Pay Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "CustodyPayAmount",
        title: t("Custody Pay Amount", "Custody Pay Amount"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 16,
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
        SortFieldInEditAndAdd: 17,
      },
      {
        field: "Remarks",
        title: t("Remarks", "ملاحظات"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 18,
      },
      {
        field: "IDUserCreate",
        title: t("IDUser Create", "IDUser Create"),
        type: "number",
        inputType: "number",
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 19,
      },
      {
        field: "CreatedAt",
        title: t("Created at", "تاريخ الإنشاء"),
        type: "date",
        inputType: "date",
        width: 220,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 20,
      },
      {
        field: "CreatedBy",
        title: t("Created by", "أنشئ بواسطة"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 21,
      },
      {
        field: "UpdatedAt",
        title: t("Updated at", "تاريخ التعديل"),
        type: "date",
        inputType: "date",
        width: 220,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 22,
      },
      {
        field: "UpdatedBy",
        title: t("Updated by", "عدّل بواسطة"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 23,
      },
      {
        field: "IDPeriod",
        title: t("IDPeriod", "IDPeriod"),
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 24,
      },
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "TransactionID", label: t("ID", "الرقم"), type: "number", sortOrder: 1 },
      { field: "TrNo", label: t("Trans No", "رقم الحركة"), type: "number", sortOrder: 2 },
      { field: "RefNo", label: t("Ref No", "Ref No"), type: "text", sortOrder: 3 },
      { field: "TransactionDate", label: t("Transaction Date", "Transaction Date"), type: "dateRange", sortOrder: 4 },
      { field: "IsActive", label: t("Active", "فعال"), type: "select", options: [{ value: "1", label: t("Yes", "نعم") }, { value: "0", label: t("No", "لا") }], sortOrder: 5 },
      { field: "TrType", label: t("Type", "النوع"), type: "number", sortOrder: 6 },
      { field: "IsCash", label: t("Is Cash", "Is Cash"), type: "select", options: [{ value: "1", label: t("Yes", "نعم") }, { value: "0", label: t("No", "لا") }], sortOrder: 7 },
      { field: "FinancialTypeID", label: t("Financial Type ID", "Financial Type ID"), type: "number", sortOrder: 8 },
      { field: "CashTypeID", label: t("Cash Type ID", "Cash Type ID"), type: "number", sortOrder: 9 },
      { field: "AccountCode", label: t("Account Code", "Account Code"), type: "text", sortOrder: 10 },
      { field: "BeneficiaryName", label: t("Beneficiary Name", "Beneficiary Name"), type: "text", sortOrder: 11 },
      { field: "Reason", label: t("Reason", "Reason"), type: "text", sortOrder: 12 },
      { field: "Amount", label: t("Amount", "المبلغ"), type: "number", sortOrder: 13 },
      { field: "ChargePrc", label: t("Charge Prc", "Charge Prc"), type: "number", sortOrder: 14 },
      { field: "DueAmount", label: t("Due Amount", "Due Amount"), type: "number", sortOrder: 15 },
      { field: "LoanPayAmount", label: t("Loan Pay Amount", "Loan Pay Amount"), type: "number", sortOrder: 16 },
      { field: "CustodyPayAmount", label: t("Custody Pay Amount", "Custody Pay Amount"), type: "number", sortOrder: 17 },
      { field: "Status", label: t("Status", "الحالة"), type: "number", sortOrder: 18 },
      { field: "Remarks", label: t("Remarks", "ملاحظات"), type: "text", sortOrder: 19 },
      { field: "IDUserCreate", label: t("IDUser Create", "IDUser Create"), type: "number", sortOrder: 20 },
      { field: "CreatedAt", label: t("Created at", "تاريخ الإنشاء"), type: "dateRange", sortOrder: 21 },
      { field: "CreatedBy", label: t("Created by", "أنشئ بواسطة"), type: "text", sortOrder: 22 },
      { field: "UpdatedAt", label: t("Updated at", "تاريخ التعديل"), type: "dateRange", sortOrder: 23 },
      { field: "UpdatedBy", label: t("Updated by", "عدّل بواسطة"), type: "text", sortOrder: 24 },
      { field: "IDPeriod", label: t("IDPeriod", "IDPeriod"), type: "text", sortOrder: 25 },
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
    PageSize: 7,
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
