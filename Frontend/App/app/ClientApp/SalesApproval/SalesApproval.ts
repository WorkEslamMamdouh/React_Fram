"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig } from "../Shared/Components/Import/AdvancedFilter";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "I_TR_Sales";
const ViewName = "I_TR_Sales";
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
        title: t("SaleID", "SaleID"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "TrNo",
        title: t("TrNo", "TrNo"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "TrType",
        title: t("TrType", "TrType"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "InvType",
        title: t("InvType", "InvType"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "GlobalNo",
        title: t("GlobalNo", "GlobalNo"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "DoNo",
        title: t("DoNo", "DoNo"),
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "RefID",
        title: t("RefID", "RefID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "ReNo",
        title: t("ReNo", "ReNo"),
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "IsCash",
        title: t("IsCash", "IsCash"),
        type: "checkbox",
        inputType: "checkbox",
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "CashType",
        title: t("CashType", "CashType"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "SaleDate",
        title: t("SaleDate", "SaleDate"),
        type: "date",
        inputType: "date",
        SortFieldInEditAndAdd: 11,
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
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "TrTime",
        title: t("TrTime", "TrTime"),
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        type: "checkbox",
        inputType: "number",
        SortFieldInEditAndAdd: 14,
        inlineToggle: { approveTrType: "ApproveSale", unapproveTrType: "UnapproveSale", approvePermission: "SalesApproval.Approve", unapprovePermission: "SalesApproval.Unapprove", confirmBeforeChange: true },
      },
      {
        field: "CustomerName",
        title: t("Customer Name", "اسم العميل"),
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "Mobile",
        title: t("Mobile", "Mobile"),
        SortFieldInEditAndAdd: 16,
      },
      {
        field: "SalesManID",
        title: t("SalesManID", "SalesManID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 17,
      },
      {
        field: "SalesManName",
        title: t("SalesManName", "SalesManName"),
        SortFieldInEditAndAdd: 18,
      },
      {
        field: "SalesManMobile",
        title: t("SalesManMobile", "SalesManMobile"),
        SortFieldInEditAndAdd: 19,
      },
      {
        field: "AttatchName",
        title: t("AttatchName", "AttatchName"),
        SortFieldInEditAndAdd: 20,
      },
      {
        field: "ItemsTotal",
        title: t("ItemsTotal", "ItemsTotal"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 21,
      },
      {
        field: "Discount",
        title: t("Discount", "الخصم"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 22,
      },
      {
        field: "TotalAmount",
        title: t("Total Amount", "الإجمالي"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 23,
      },
      {
        field: "VatTypeID",
        title: t("VatTypeID", "VatTypeID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 24,
      },
      {
        field: "VatAmount",
        title: t("VatAmount", "VatAmount"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 25,
      },
      {
        field: "ChargePrc",
        title: t("ChargePrc", "ChargePrc"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 26,
      },
      {
        field: "ExternalAmount",
        title: t("ExternalAmount", "ExternalAmount"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 27,
      },
      {
        field: "NetAmount",
        title: t("Net Amount", "الصافي"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 28,
      },
      {
        field: "DueAmount",
        title: t("DueAmount", "DueAmount"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 29,
      },
      {
        field: "RemainAmount",
        title: t("RemainAmount", "RemainAmount"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 30,
      },
      {
        field: "PaymentAmount",
        title: t("PaymentAmount", "PaymentAmount"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 31,
      },
      {
        field: "CurrenyID",
        title: t("CurrenyID", "CurrenyID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 32,
      },
      {
        field: "TaxID",
        title: t("TaxID", "TaxID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 33,
      },
      {
        field: "TaxPrc",
        title: t("TaxPrc", "TaxPrc"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 34,
      },
      {
        field: "DedTaxAmount",
        title: t("DedTaxAmount", "DedTaxAmount"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 35,
      },
      {
        field: "Rate_Currency",
        title: t("Rate_Currency", "Rate_Currency"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 36,
      },
      {
        field: "IsService",
        title: t("IsService", "IsService"),
        type: "checkbox",
        inputType: "checkbox",
        SortFieldInEditAndAdd: 37,
      },
      {
        field: "CustomerID",
        title: t("CustomerID", "CustomerID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 38,
      },
      {
        field: "Remarks",
        title: t("Remarks", "Remarks"),
        SortFieldInEditAndAdd: 39,
      },
      {
        field: "VoucherNo",
        title: t("VoucherNo", "VoucherNo"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 40,
      },
      {
        field: "IsPosted",
        title: t("IsPosted", "IsPosted"),
        type: "checkbox",
        inputType: "checkbox",
        SortFieldInEditAndAdd: 41,
      },
      {
        field: "QRCode",
        title: t("QRCode", "QRCode"),
        SortFieldInEditAndAdd: 42,
      },
      {
        field: "IDUserCreate",
        title: t("IDUserCreate", "IDUserCreate"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 43,
      },
      {
        field: "CreatedAt",
        title: t("CreatedAt", "CreatedAt"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 44,
      },
      {
        field: "CreatedBy",
        title: t("Created By", "بواسطة"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 45,
      },
      {
        field: "UpdatedAt",
        title: t("UpdatedAt", "UpdatedAt"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 46,
      },
      {
        field: "UpdatedBy",
        title: t("UpdatedBy", "UpdatedBy"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 47,
      },
      {
        field: "InvoiceTransCode",
        title: t("InvoiceTransCode", "InvoiceTransCode"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 48,
      },
      {
        field: "TaxStatus",
        title: t("TaxStatus", "TaxStatus"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 49,
      },
      {
        field: "DocUUID",
        title: t("DocUUID", "DocUUID"),
        SortFieldInEditAndAdd: 50,
      },
      {
        field: "PrevInvoiceHash",
        title: t("PrevInvoiceHash", "PrevInvoiceHash"),
        SortFieldInEditAndAdd: 51,
      },
      {
        field: "IDPeriod",
        title: t("IDPeriod", "IDPeriod"),
        SortFieldInEditAndAdd: 52,
      },
      {
        field: "PaymentTerms",
        title: t("PaymentTerms", "PaymentTerms"),
        SortFieldInEditAndAdd: 53,
      },
      {
        field: "PaymentType",
        title: t("PaymentType", "PaymentType"),
        SortFieldInEditAndAdd: 54,
      },
      {
        field: "ExpiryTime",
        title: t("ExpiryTime", "ExpiryTime"),
        SortFieldInEditAndAdd: 55,
      },
      {
        field: "DeliveryTime",
        title: t("DeliveryTime", "DeliveryTime"),
        SortFieldInEditAndAdd: 56,
      },
      {
        field: "TaxErrorCode",
        title: t("TaxErrorCode", "TaxErrorCode"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 57,
      },
      {
        field: "ShowPriceID",
        title: t("ShowPriceID", "ShowPriceID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 58,
      },
      {
        field: "ShowPriceNo",
        title: t("ShowPriceNo", "ShowPriceNo"),
        SortFieldInEditAndAdd: 59,
      },
      {
        field: "JobOrderID",
        title: t("JobOrderID", "JobOrderID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 60,
      },
      {
        field: "JobOrderNo",
        title: t("JobOrderNo", "JobOrderNo"),
        SortFieldInEditAndAdd: 61,
      },
      {
        field: "Warrantyperiod",
        title: t("Warrantyperiod", "Warrantyperiod"),
        SortFieldInEditAndAdd: 62,
      },
      {
        field: "CarBrand",
        title: t("CarBrand", "CarBrand"),
        SortFieldInEditAndAdd: 63,
      },
      {
        field: "CarNo",
        title: t("CarNo", "CarNo"),
        SortFieldInEditAndAdd: 64,
      },
      {
        field: "ChassisNo",
        title: t("ChassisNo", "ChassisNo"),
        SortFieldInEditAndAdd: 65,
      },
      {
        field: "DestructionKm",
        title: t("DestructionKm", "DestructionKm"),
        SortFieldInEditAndAdd: 66,
      },
      {
        field: "EngineerName",
        title: t("EngineerName", "EngineerName"),
        SortFieldInEditAndAdd: 67,
      },
      {
        field: "IDExcel",
        title: t("IDExcel", "IDExcel"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 68,
      },
      {
        field: "purchaseorderDesc",
        title: t("purchaseorderDesc", "purchaseorderDesc"),
        SortFieldInEditAndAdd: 69,
      },
      {
        field: "purchaseorderCode",
        title: t("purchaseorderCode", "purchaseorderCode"),
        SortFieldInEditAndAdd: 70,
      },
      {
        field: "DeliveryOrderID",
        title: t("DeliveryOrderID", "DeliveryOrderID"),
        type: "number",
        inputType: "number",
        SortFieldInEditAndAdd: 71,
      },
      {
        field: "DeliveryOrderNo",
        title: t("DeliveryOrderNo", "DeliveryOrderNo"),
        SortFieldInEditAndAdd: 72,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "SaleID", label: t("SaleID", "SaleID"), type: "number", sortOrder: 1 },
      { field: "TrNo", label: t("TrNo", "TrNo"), type: "number", sortOrder: 2 },
      { field: "TrType", label: t("TrType", "TrType"), type: "number", sortOrder: 3 },
      { field: "InvType", label: t("InvType", "InvType"), type: "number", sortOrder: 4 },
      { field: "GlobalNo", label: t("GlobalNo", "GlobalNo"), type: "number", sortOrder: 5 },
      { field: "DoNo", label: t("DoNo", "DoNo"), type: "text", sortOrder: 6 },
      { field: "RefID", label: t("RefID", "RefID"), type: "number", sortOrder: 7 },
      { field: "ReNo", label: t("ReNo", "ReNo"), type: "text", sortOrder: 8 },
      { field: "IsCash", label: t("IsCash", "IsCash"), type: "boolean", sortOrder: 9 },
      { field: "CashType", label: t("CashType", "CashType"), type: "number", sortOrder: 10 },
      { field: "SaleDate", label: t("SaleDate", "SaleDate"), type: "date", sortOrder: 11 },
      { field: "TrTime", label: t("TrTime", "TrTime"), type: "text", sortOrder: 12 },
      { field: "Status", label: t("Status", "الحالة"), type: "number", sortOrder: 13 },
      { field: "CustomerName", label: t("Customer Name", "اسم العميل"), type: "text", sortOrder: 14 },
      { field: "Mobile", label: t("Mobile", "Mobile"), type: "text", sortOrder: 15 },
      { field: "SalesManID", label: t("SalesManID", "SalesManID"), type: "number", sortOrder: 16 },
      { field: "SalesManName", label: t("SalesManName", "SalesManName"), type: "text", sortOrder: 17 },
      { field: "SalesManMobile", label: t("SalesManMobile", "SalesManMobile"), type: "text", sortOrder: 18 },
      { field: "AttatchName", label: t("AttatchName", "AttatchName"), type: "text", sortOrder: 19 },
      { field: "ItemsTotal", label: t("ItemsTotal", "ItemsTotal"), type: "number", sortOrder: 20 },
      { field: "Discount", label: t("Discount", "الخصم"), type: "number", sortOrder: 21 },
      { field: "TotalAmount", label: t("Total Amount", "الإجمالي"), type: "number", sortOrder: 22 },
      { field: "VatTypeID", label: t("VatTypeID", "VatTypeID"), type: "number", sortOrder: 23 },
      { field: "VatAmount", label: t("VatAmount", "VatAmount"), type: "number", sortOrder: 24 },
      { field: "ChargePrc", label: t("ChargePrc", "ChargePrc"), type: "number", sortOrder: 25 },
      { field: "ExternalAmount", label: t("ExternalAmount", "ExternalAmount"), type: "number", sortOrder: 26 },
      { field: "NetAmount", label: t("Net Amount", "الصافي"), type: "number", sortOrder: 27 },
      { field: "DueAmount", label: t("DueAmount", "DueAmount"), type: "number", sortOrder: 28 },
      { field: "RemainAmount", label: t("RemainAmount", "RemainAmount"), type: "number", sortOrder: 29 },
      { field: "PaymentAmount", label: t("PaymentAmount", "PaymentAmount"), type: "number", sortOrder: 30 },
      { field: "CurrenyID", label: t("CurrenyID", "CurrenyID"), type: "number", sortOrder: 31 },
      { field: "TaxID", label: t("TaxID", "TaxID"), type: "number", sortOrder: 32 },
      { field: "TaxPrc", label: t("TaxPrc", "TaxPrc"), type: "number", sortOrder: 33 },
      { field: "DedTaxAmount", label: t("DedTaxAmount", "DedTaxAmount"), type: "number", sortOrder: 34 },
      { field: "Rate_Currency", label: t("Rate_Currency", "Rate_Currency"), type: "number", sortOrder: 35 },
      { field: "IsService", label: t("IsService", "IsService"), type: "boolean", sortOrder: 36 },
      { field: "CustomerID", label: t("CustomerID", "CustomerID"), type: "number", sortOrder: 37 },
      { field: "Remarks", label: t("Remarks", "Remarks"), type: "text", sortOrder: 38 },
      { field: "VoucherNo", label: t("VoucherNo", "VoucherNo"), type: "number", sortOrder: 39 },
      { field: "IsPosted", label: t("IsPosted", "IsPosted"), type: "boolean", sortOrder: 40 },
      { field: "QRCode", label: t("QRCode", "QRCode"), type: "text", sortOrder: 41 },
      { field: "IDUserCreate", label: t("IDUserCreate", "IDUserCreate"), type: "number", sortOrder: 42 },
      { field: "InvoiceTransCode", label: t("InvoiceTransCode", "InvoiceTransCode"), type: "number", sortOrder: 43 },
      { field: "TaxStatus", label: t("TaxStatus", "TaxStatus"), type: "number", sortOrder: 44 },
      { field: "DocUUID", label: t("DocUUID", "DocUUID"), type: "text", sortOrder: 45 },
      { field: "PrevInvoiceHash", label: t("PrevInvoiceHash", "PrevInvoiceHash"), type: "text", sortOrder: 46 },
      { field: "IDPeriod", label: t("IDPeriod", "IDPeriod"), type: "text", sortOrder: 47 },
      { field: "PaymentTerms", label: t("PaymentTerms", "PaymentTerms"), type: "text", sortOrder: 48 },
      { field: "PaymentType", label: t("PaymentType", "PaymentType"), type: "text", sortOrder: 49 },
      { field: "ExpiryTime", label: t("ExpiryTime", "ExpiryTime"), type: "text", sortOrder: 50 },
      { field: "DeliveryTime", label: t("DeliveryTime", "DeliveryTime"), type: "text", sortOrder: 51 },
      { field: "TaxErrorCode", label: t("TaxErrorCode", "TaxErrorCode"), type: "number", sortOrder: 52 },
      { field: "ShowPriceID", label: t("ShowPriceID", "ShowPriceID"), type: "number", sortOrder: 53 },
      { field: "ShowPriceNo", label: t("ShowPriceNo", "ShowPriceNo"), type: "text", sortOrder: 54 },
      { field: "JobOrderID", label: t("JobOrderID", "JobOrderID"), type: "number", sortOrder: 55 },
      { field: "JobOrderNo", label: t("JobOrderNo", "JobOrderNo"), type: "text", sortOrder: 56 },
      { field: "Warrantyperiod", label: t("Warrantyperiod", "Warrantyperiod"), type: "text", sortOrder: 57 },
      { field: "CarBrand", label: t("CarBrand", "CarBrand"), type: "text", sortOrder: 58 },
      { field: "CarNo", label: t("CarNo", "CarNo"), type: "text", sortOrder: 59 },
      { field: "ChassisNo", label: t("ChassisNo", "ChassisNo"), type: "text", sortOrder: 60 },
      { field: "DestructionKm", label: t("DestructionKm", "DestructionKm"), type: "text", sortOrder: 61 },
      { field: "EngineerName", label: t("EngineerName", "EngineerName"), type: "text", sortOrder: 62 },
      { field: "IDExcel", label: t("IDExcel", "IDExcel"), type: "number", sortOrder: 63 },
      { field: "purchaseorderDesc", label: t("purchaseorderDesc", "purchaseorderDesc"), type: "text", sortOrder: 64 },
      { field: "purchaseorderCode", label: t("purchaseorderCode", "purchaseorderCode"), type: "text", sortOrder: 65 },
      { field: "DeliveryOrderID", label: t("DeliveryOrderID", "DeliveryOrderID"), type: "number", sortOrder: 66 },
      { field: "DeliveryOrderNo", label: t("DeliveryOrderNo", "DeliveryOrderNo"), type: "text", sortOrder: 67 },
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
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"Grid","Module":"SalesApproval","Table":"I_TR_Sales","View":"","KeyColumn":"SaleID","TitleAr":"اعتماد المبيعات","TitleEn":"Sales Approval","SubAr":"فواتير المبيعات واعتمادها","SubEn":"Sales invoices and approvals","Icon":"fa-check-double","IconColor":"emerald","PageSize":15,"OrderBy":"SaleID","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":false,"Edit":false,"Delete":false,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"SaleID","TitleAr":"SaleID","TitleEn":"SaleID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"TrNo","TitleAr":"TrNo","TitleEn":"TrNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":2},{"Field":"TrType","TitleAr":"TrType","TitleEn":"TrType","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"InvType","TitleAr":"InvType","TitleEn":"InvType","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"GlobalNo","TitleAr":"GlobalNo","TitleEn":"GlobalNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"DoNo","TitleAr":"DoNo","TitleEn":"DoNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"RefID","TitleAr":"RefID","TitleEn":"RefID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"ReNo","TitleAr":"ReNo","TitleEn":"ReNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8},{"Field":"IsCash","TitleAr":"IsCash","TitleEn":"IsCash","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"CashType","TitleAr":"CashType","TitleEn":"CashType","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10},{"Field":"SaleDate","TitleAr":"SaleDate","TitleEn":"SaleDate","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":11},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":12},{"Field":"TrTime","TitleAr":"TrTime","TitleEn":"TrTime","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":13},{"Field":"Status","TitleAr":"الحالة","TitleEn":"Status","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":14},{"Field":"CustomerName","TitleAr":"اسم العميل","TitleEn":"Customer Name","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":15},{"Field":"Mobile","TitleAr":"Mobile","TitleEn":"Mobile","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":16},{"Field":"SalesManID","TitleAr":"SalesManID","TitleEn":"SalesManID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":17},{"Field":"SalesManName","TitleAr":"SalesManName","TitleEn":"SalesManName","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":18},{"Field":"SalesManMobile","TitleAr":"SalesManMobile","TitleEn":"SalesManMobile","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":19},{"Field":"AttatchName","TitleAr":"AttatchName","TitleEn":"AttatchName","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":20},{"Field":"ItemsTotal","TitleAr":"ItemsTotal","TitleEn":"ItemsTotal","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":21},{"Field":"Discount","TitleAr":"الخصم","TitleEn":"Discount","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":22},{"Field":"TotalAmount","TitleAr":"الإجمالي","TitleEn":"Total Amount","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":23},{"Field":"VatTypeID","TitleAr":"VatTypeID","TitleEn":"VatTypeID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":24},{"Field":"VatAmount","TitleAr":"VatAmount","TitleEn":"VatAmount","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":25},{"Field":"ChargePrc","TitleAr":"ChargePrc","TitleEn":"ChargePrc","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":26},{"Field":"ExternalAmount","TitleAr":"ExternalAmount","TitleEn":"ExternalAmount","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":27},{"Field":"NetAmount","TitleAr":"الصافي","TitleEn":"Net Amount","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":28},{"Field":"DueAmount","TitleAr":"DueAmount","TitleEn":"DueAmount","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":29},{"Field":"RemainAmount","TitleAr":"RemainAmount","TitleEn":"RemainAmount","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":30},{"Field":"PaymentAmount","TitleAr":"PaymentAmount","TitleEn":"PaymentAmount","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":31},{"Field":"CurrenyID","TitleAr":"CurrenyID","TitleEn":"CurrenyID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":32},{"Field":"TaxID","TitleAr":"TaxID","TitleEn":"TaxID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":33},{"Field":"TaxPrc","TitleAr":"TaxPrc","TitleEn":"TaxPrc","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":34},{"Field":"DedTaxAmount","TitleAr":"DedTaxAmount","TitleEn":"DedTaxAmount","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":35},{"Field":"Rate_Currency","TitleAr":"Rate_Currency","TitleEn":"Rate_Currency","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":36},{"Field":"IsService","TitleAr":"IsService","TitleEn":"IsService","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":37},{"Field":"CustomerID","TitleAr":"CustomerID","TitleEn":"CustomerID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":38},{"Field":"Remarks","TitleAr":"Remarks","TitleEn":"Remarks","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":39},{"Field":"VoucherNo","TitleAr":"VoucherNo","TitleEn":"VoucherNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":40},{"Field":"IsPosted","TitleAr":"IsPosted","TitleEn":"IsPosted","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"checkbox","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":41},{"Field":"QRCode","TitleAr":"QRCode","TitleEn":"QRCode","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":42},{"Field":"IDUserCreate","TitleAr":"IDUserCreate","TitleEn":"IDUserCreate","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":43},{"Field":"CreatedAt","TitleAr":"CreatedAt","TitleEn":"CreatedAt","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"","Width":150,"Order":44},{"Field":"CreatedBy","TitleAr":"بواسطة","TitleEn":"Created By","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":45},{"Field":"UpdatedAt","TitleAr":"UpdatedAt","TitleEn":"UpdatedAt","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"","Width":150,"Order":46},{"Field":"UpdatedBy","TitleAr":"UpdatedBy","TitleEn":"UpdatedBy","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":47},{"Field":"InvoiceTransCode","TitleAr":"InvoiceTransCode","TitleEn":"InvoiceTransCode","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":48},{"Field":"TaxStatus","TitleAr":"TaxStatus","TitleEn":"TaxStatus","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":49},{"Field":"DocUUID","TitleAr":"DocUUID","TitleEn":"DocUUID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":50},{"Field":"PrevInvoiceHash","TitleAr":"PrevInvoiceHash","TitleEn":"PrevInvoiceHash","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":51},{"Field":"IDPeriod","TitleAr":"IDPeriod","TitleEn":"IDPeriod","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":52},{"Field":"PaymentTerms","TitleAr":"PaymentTerms","TitleEn":"PaymentTerms","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":53},{"Field":"PaymentType","TitleAr":"PaymentType","TitleEn":"PaymentType","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":54},{"Field":"ExpiryTime","TitleAr":"ExpiryTime","TitleEn":"ExpiryTime","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":55},{"Field":"DeliveryTime","TitleAr":"DeliveryTime","TitleEn":"DeliveryTime","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":56},{"Field":"TaxErrorCode","TitleAr":"TaxErrorCode","TitleEn":"TaxErrorCode","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":57},{"Field":"ShowPriceID","TitleAr":"ShowPriceID","TitleEn":"ShowPriceID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":58},{"Field":"ShowPriceNo","TitleAr":"ShowPriceNo","TitleEn":"ShowPriceNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":59},{"Field":"JobOrderID","TitleAr":"JobOrderID","TitleEn":"JobOrderID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":60},{"Field":"JobOrderNo","TitleAr":"JobOrderNo","TitleEn":"JobOrderNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":61},{"Field":"Warrantyperiod","TitleAr":"Warrantyperiod","TitleEn":"Warrantyperiod","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":62},{"Field":"CarBrand","TitleAr":"CarBrand","TitleEn":"CarBrand","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":63},{"Field":"CarNo","TitleAr":"CarNo","TitleEn":"CarNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":64},{"Field":"ChassisNo","TitleAr":"ChassisNo","TitleEn":"ChassisNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":65},{"Field":"DestructionKm","TitleAr":"DestructionKm","TitleEn":"DestructionKm","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":66},{"Field":"EngineerName","TitleAr":"EngineerName","TitleEn":"EngineerName","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":67},{"Field":"IDExcel","TitleAr":"IDExcel","TitleEn":"IDExcel","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":68},{"Field":"purchaseorderDesc","TitleAr":"purchaseorderDesc","TitleEn":"purchaseorderDesc","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":69},{"Field":"purchaseorderCode","TitleAr":"purchaseorderCode","TitleEn":"purchaseorderCode","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":70},{"Field":"DeliveryOrderID","TitleAr":"DeliveryOrderID","TitleEn":"DeliveryOrderID","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":71},{"Field":"DeliveryOrderNo","TitleAr":"DeliveryOrderNo","TitleEn":"DeliveryOrderNo","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":72}],"ListFields":[],"Details":[],"Validations":[]}
// @ScreenBuilder-Settings: {"version":4,"screenType":"Grid","module":"SalesApproval","table":"I_TR_Sales","view":"","keyColumn":"SaleID","titleAr":"اعتماد المبيعات","titleEn":"Sales Approval","subAr":"فواتير المبيعات واعتمادها","subEn":"Sales invoices and approvals","icon":"fa-check-double","iconColor":"emerald","pageSize":15,"orderBy":"SaleID","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":false,"edit":false,"delete":false,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"SaleID","titleAr":"SaleID","titleEn":"SaleID","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"TrNo","titleAr":"TrNo","titleEn":"TrNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":2},{"field":"TrType","titleAr":"TrType","titleEn":"TrType","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3},{"field":"InvType","titleAr":"InvType","titleEn":"InvType","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"GlobalNo","titleAr":"GlobalNo","titleEn":"GlobalNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"DoNo","titleAr":"DoNo","titleEn":"DoNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"RefID","titleAr":"RefID","titleEn":"RefID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7},{"field":"ReNo","titleAr":"ReNo","titleEn":"ReNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8},{"field":"IsCash","titleAr":"IsCash","titleEn":"IsCash","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9},{"field":"CashType","titleAr":"CashType","titleEn":"CashType","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10},{"field":"SaleDate","titleAr":"SaleDate","titleEn":"SaleDate","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":11},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":12},{"field":"TrTime","titleAr":"TrTime","titleEn":"TrTime","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":13},{"field":"Status","titleAr":"الحالة","titleEn":"Status","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":14},{"field":"CustomerName","titleAr":"اسم العميل","titleEn":"Customer Name","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":15},{"field":"Mobile","titleAr":"Mobile","titleEn":"Mobile","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":16},{"field":"SalesManID","titleAr":"SalesManID","titleEn":"SalesManID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":17},{"field":"SalesManName","titleAr":"SalesManName","titleEn":"SalesManName","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":18},{"field":"SalesManMobile","titleAr":"SalesManMobile","titleEn":"SalesManMobile","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":19},{"field":"AttatchName","titleAr":"AttatchName","titleEn":"AttatchName","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":20},{"field":"ItemsTotal","titleAr":"ItemsTotal","titleEn":"ItemsTotal","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":21},{"field":"Discount","titleAr":"الخصم","titleEn":"Discount","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":22},{"field":"TotalAmount","titleAr":"الإجمالي","titleEn":"Total Amount","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":23},{"field":"VatTypeID","titleAr":"VatTypeID","titleEn":"VatTypeID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":24},{"field":"VatAmount","titleAr":"VatAmount","titleEn":"VatAmount","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":25},{"field":"ChargePrc","titleAr":"ChargePrc","titleEn":"ChargePrc","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":26},{"field":"ExternalAmount","titleAr":"ExternalAmount","titleEn":"ExternalAmount","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":27},{"field":"NetAmount","titleAr":"الصافي","titleEn":"Net Amount","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":28,"noSave":true},{"field":"DueAmount","titleAr":"DueAmount","titleEn":"DueAmount","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":29,"noSave":true},{"field":"RemainAmount","titleAr":"RemainAmount","titleEn":"RemainAmount","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":30,"noSave":true},{"field":"PaymentAmount","titleAr":"PaymentAmount","titleEn":"PaymentAmount","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":31},{"field":"CurrenyID","titleAr":"CurrenyID","titleEn":"CurrenyID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":32},{"field":"TaxID","titleAr":"TaxID","titleEn":"TaxID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":33},{"field":"TaxPrc","titleAr":"TaxPrc","titleEn":"TaxPrc","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":34},{"field":"DedTaxAmount","titleAr":"DedTaxAmount","titleEn":"DedTaxAmount","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":35},{"field":"Rate_Currency","titleAr":"Rate_Currency","titleEn":"Rate_Currency","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":36},{"field":"IsService","titleAr":"IsService","titleEn":"IsService","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":37},{"field":"CustomerID","titleAr":"CustomerID","titleEn":"CustomerID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":38},{"field":"Remarks","titleAr":"Remarks","titleEn":"Remarks","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":39},{"field":"VoucherNo","titleAr":"VoucherNo","titleEn":"VoucherNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":40},{"field":"IsPosted","titleAr":"IsPosted","titleEn":"IsPosted","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"checkbox","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":41},{"field":"QRCode","titleAr":"QRCode","titleEn":"QRCode","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":42},{"field":"IDUserCreate","titleAr":"IDUserCreate","titleEn":"IDUserCreate","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":43},{"field":"CreatedAt","titleAr":"CreatedAt","titleEn":"CreatedAt","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"","width":150,"order":44},{"field":"CreatedBy","titleAr":"بواسطة","titleEn":"Created By","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":45},{"field":"UpdatedAt","titleAr":"UpdatedAt","titleEn":"UpdatedAt","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"","width":150,"order":46},{"field":"UpdatedBy","titleAr":"UpdatedBy","titleEn":"UpdatedBy","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":47},{"field":"InvoiceTransCode","titleAr":"InvoiceTransCode","titleEn":"InvoiceTransCode","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":48},{"field":"TaxStatus","titleAr":"TaxStatus","titleEn":"TaxStatus","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":49},{"field":"DocUUID","titleAr":"DocUUID","titleEn":"DocUUID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":50},{"field":"PrevInvoiceHash","titleAr":"PrevInvoiceHash","titleEn":"PrevInvoiceHash","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":51},{"field":"IDPeriod","titleAr":"IDPeriod","titleEn":"IDPeriod","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":52},{"field":"PaymentTerms","titleAr":"PaymentTerms","titleEn":"PaymentTerms","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":53},{"field":"PaymentType","titleAr":"PaymentType","titleEn":"PaymentType","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":54},{"field":"ExpiryTime","titleAr":"ExpiryTime","titleEn":"ExpiryTime","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":55},{"field":"DeliveryTime","titleAr":"DeliveryTime","titleEn":"DeliveryTime","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":56},{"field":"TaxErrorCode","titleAr":"TaxErrorCode","titleEn":"TaxErrorCode","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":57},{"field":"ShowPriceID","titleAr":"ShowPriceID","titleEn":"ShowPriceID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":58},{"field":"ShowPriceNo","titleAr":"ShowPriceNo","titleEn":"ShowPriceNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":59},{"field":"JobOrderID","titleAr":"JobOrderID","titleEn":"JobOrderID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":60},{"field":"JobOrderNo","titleAr":"JobOrderNo","titleEn":"JobOrderNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":61},{"field":"Warrantyperiod","titleAr":"Warrantyperiod","titleEn":"Warrantyperiod","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":62},{"field":"CarBrand","titleAr":"CarBrand","titleEn":"CarBrand","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":63},{"field":"CarNo","titleAr":"CarNo","titleEn":"CarNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":64},{"field":"ChassisNo","titleAr":"ChassisNo","titleEn":"ChassisNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":65},{"field":"DestructionKm","titleAr":"DestructionKm","titleEn":"DestructionKm","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":66},{"field":"EngineerName","titleAr":"EngineerName","titleEn":"EngineerName","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":67},{"field":"IDExcel","titleAr":"IDExcel","titleEn":"IDExcel","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":68},{"field":"purchaseorderDesc","titleAr":"purchaseorderDesc","titleEn":"purchaseorderDesc","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":69},{"field":"purchaseorderCode","titleAr":"purchaseorderCode","titleEn":"purchaseorderCode","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":70},{"field":"DeliveryOrderID","titleAr":"DeliveryOrderID","titleEn":"DeliveryOrderID","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":71},{"field":"DeliveryOrderNo","titleAr":"DeliveryOrderNo","titleEn":"DeliveryOrderNo","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":72}],"listFields":[],"details":[],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":true,"field":"SaleDate","labelAr":"تاريخ","labelEn":"Date","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":true,"field":"Status","approveTrType":"ApproveSale","unapproveTrType":"UnapproveSale","approvePermission":"SalesApproval.Approve","unapprovePermission":"SalesApproval.Unapprove","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-03T00:00:00.000Z","modifiedBy":"","source":"web"}}
