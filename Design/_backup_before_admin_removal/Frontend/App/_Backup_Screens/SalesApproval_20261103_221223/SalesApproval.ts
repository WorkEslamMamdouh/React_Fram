"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig } from "../Shared/Components/Import/AdvancedFilter";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "I_TR_Sales";
const ViewName = "IQ_TR_Sales";
const KeyColumn = "SaleID";
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
        field: "SaleID",
        title: t("ID", "الرقم"),
        type: "number",
        inputType: "number",
        width: 90,
        editable: false,
        insertable: false,
      },
      {
        field: "TrNo",
        title: t("Invoice No", "رقم الفاتورة"),
        type: "number",
        inputType: "number",
        width: 120,
      },
      {
        field: "TrDate",
        title: t("Transaction Date", "تاريخ المعاملة"),
        type: "date",
        inputType: "date",
        width: 130,
        IsRequired: true,
      },
      {
        field: "PaymentType",
        title: t("Payment Type", "نوع الدفع"),
        inputType: "selectSearch",
        selectConfig: { tableName: "D_A_CashTypes", displayField: "Description", valueField: "CashTypeID", condition: "IsActive = 1" },
        width: 160,
      },
      {
        field: "NetAmount",
        title: t("Net Amount", "الصافي"),
        type: "number",
        inputType: "number",
        width: 140,
        align: "right",
      },
      {
        field: "CreatedBy",
        title: t("Created By", "بواسطة"),
        DefaultValue: UserName,
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        visibleInView: false,
      },
      {
        field: "CreatedAt",
        title: t("Created At", "تاريخ الإنشاء"),
        type: "date",
        inputType: "date",
        DefaultValue: Now,
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        visibleInView: false,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        type: "checkbox",
        inputType: "checkbox",
        width: 110,
        inlineToggle: {
          approveTrType: "ApproveSale",
          unapproveTrType: "UnapproveSale",
          approvePermission: "SalesApproval.Approve",
          unapprovePermission: "SalesApproval.Unapprove",
          confirmBeforeChange: true,
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "TrNo", label: t("Invoice No", "رقم الفاتورة"), type: "number", sortOrder: 1 },
      { field: "TrDate", label: t("Transaction Date", "تاريخ المعاملة"), type: "date", sortOrder: 2 },
      { field: "NetAmount", label: t("Net Amount", "الصافي"), type: "number", sortOrder: 3 },
      { field: "Status", label: t("Status", "الحالة"), type: "boolean", sortOrder: 4 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );

  return {
    IsLangEN,
    IsDark,
    gridKey,
    RefreshGrid,
    grid: { TableName, ViewName, KeyColumn, TrType, RunProcessTrans, Condition, CompCode, BranchCode, Columns, FilterFields },
  };
}
// @ScreenBuilder-Settings: {"version":4,"screenType":"Grid","module":"SalesApproval","table":"I_TR_Sales","view":"IQ_TR_Sales","keyColumn":"SaleID","titleAr":"اعتماد المبيعات","titleEn":"Sales Approval","subAr":"فواتير المبيعات واعتمادها","subEn":"Sales invoices and approvals","icon":"fa-check-double","iconColor":"emerald","pageSize":15,"orderBy":"TrDate","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":false,"edit":false,"delete":false,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":true,"field":"TrDate","labelAr":"تاريخ","labelEn":"Date","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":true,"field":"Status","approveTrType":"ApproveSale","unapproveTrType":"UnapproveSale","approvePermission":"SalesApproval.Approve","unapprovePermission":"SalesApproval.Unapprove","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-03T00:00:00.000Z","modifiedBy":"","source":"web"}}
