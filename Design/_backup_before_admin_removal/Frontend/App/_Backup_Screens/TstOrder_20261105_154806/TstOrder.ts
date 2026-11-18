"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { MasterDetailColumn, MasterDetailConfig } from "../Shared/Components/Import/ModelMasterDetail";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, FilterOption, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import { RunProc } from "../Shared/RunProc";
import { Sys } from "../Shared/SystemTools";
import { openReport } from "../Shared/Reports/openReport";
import { usePermissions } from "../Shared/Permissions";
import type { ExcelMasterDetailConfig } from "../Shared/Components/Excel/ExcelTypes";
import type { ActionButtonConfig } from "../Shared/Components/Import/DynamicGrid";
import { FormLayout } from "../Shared/Components/Import/FormLayout";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "TST_Order";
const ViewName = "IQ_TST_Order";
const KeyColumn = "OrderID";
const TrType = "";
const RunProcessTrans = false;
const ModuleCode = "TstOrder";   // MODULE_CODE للصلاحيات (فاضي = من غير صلاحيات)
// #endregion

// =======================
// TstOrder  (MasterDetail)
// =======================
export function TstOrder() {
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

  const filterVals: Record<string, any> = {};   // الفلاتر المتسلسلة / بارامترات الفلتر متاحة في شاشات الجريد بس
  void filterVals;

  const filterReady = true;   // الجريد مابيتعرضش قبل ما اختيارات الفلاتر تتحمل

  async function RunAction_0(row?: any) {
    void row;
    if (!(await Sys.Confirm("Run: Post?", "تنفيذ: ترحيل؟"))) return;
    const res = await RunProc("TST_Proc_PostOrder", { "OrderID": (row?.["OrderID"] ?? null), "UserID": UserID });
    if (!res.ok) { Sys.ShowMessage(res.error || "Failed", res.error || "فشل التنفيذ", "error"); return; }
    RefreshGrid();
  }

  async function RunAction_1(row?: any) {
    void row;
    if (!(await Sys.Confirm("Run: Cancel?", "تنفيذ: إلغاء؟"))) return;
    const res = await RunProc("TST_Proc_CancelOrder", { "OrderID": (row?.["OrderID"] ?? null), "UserID": UserID, "Reason": "إلغاء من الشاشة" });
    if (!res.ok) { Sys.ShowMessage(res.error || "Failed", res.error || "فشل التنفيذ", "error"); return; }
    RefreshGrid();
  }

  async function RunAction_2(row?: any) {
    void row;
    if (!(await Sys.Confirm("Run: Recalc?", "تنفيذ: إعادة حساب؟"))) return;
    const res = await RunProc("TST_Proc_RecalcOrder", { "OrderID": (row?.["OrderID"] ?? null), "UserID": UserID });
    if (!res.ok) { Sys.ShowMessage(res.error || "Failed", res.error || "فشل التنفيذ", "error"); return; }
    RefreshGrid();
  }

  // ===== الطباعة (Phase 7) — تقارير Stimulsoft: عرض داخل النظام / PDF / Excel. الباراميترات متربطة في تعريف التقرير =====

  const PrintPerm = usePermissions(ModuleCode);   // زر "طباعة القائمة" بيظهر بصلاحية PRINT بس

  function onPrintList() { openReport({ reportCode: "TST_OrderList", filters: filterVals, moduleCode: ModuleCode }); }   // قيم الفلاتر الحالية

  function onPrintTransaction(row?: Record<string, any>) { openReport({ reportCode: "TST_OrderPrint", row, trId: row?.[KeyColumn], moduleCode: ModuleCode }); }   // CompCode, BranchCode, TrID

  // ===== Excel: معاملات كتير / أصناف في الفاتورة (Phase 6) — بيتحط في Config.excel =====
  const ExcelCfg = useMemo<ExcelMasterDetailConfig>(
    () => ({
      enabled: true,
      templateName: "TstOrder_Template",
      mode: "both",
      masterColumns: ["TrDate","CustomerID","WarehouseID","PaymentType","Discount"],
      detailColumns: ["ItemID","Qty","UnitPrice","DiscountPrc"],
      lookups: {
      "CustomerID": { table: "TST_Customer", keyColumn: "CustomerID", codeColumn: "Code", nameColumn: "NameA", condition: `CompCode = ${CompCode}` },
    },
      detailLookups: {
      "ItemID": { table: "TST_Item", keyColumn: "ItemID", codeColumn: "Code", nameColumn: "NameA", condition: `CompCode = ${CompCode}` },
    },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CompCode, BranchCode]
  );

  const ToolbarButtons: { key: string; label: string; icon?: string; onClick: () => void }[] = [
    { key: "printList", label: t("Print list", "طباعة القائمة"), icon: "fa-print", onClick: () => onPrintList() },
  ].filter((b) => b.key !== "printList" || PrintPerm.can.print);

  const RowActions: ActionButtonConfig[] = [
    { key: "act_0", label: t("Post", "ترحيل"), icon: "fa-bolt", onClick: (row: any) => { void RunAction_0(row); } },
    { key: "act_1", label: t("Cancel", "إلغاء"), icon: "fa-ban", onClick: (row: any) => { void RunAction_1(row); } },
    { key: "act_2", label: t("Recalc", "إعادة حساب"), icon: "fa-calculator", onClick: (row: any) => { void RunAction_2(row); } },
  ];

  const FormLayoutCells: FormLayout = [
    {"kind":"field","field":"TrNo","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"TrDate","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"CustomerID","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"WarehouseID","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"Status","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"PaymentType","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"Notes","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"Total","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"Discount","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"Net","span":4,"spanMd":6,"newRow":true},
  ];

  // =======================
  // #region الأعمدة
  // =======================
  const MasterColumns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "OrderID",
        title: t("Order", "Order"),
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
        field: "TrNo",
        title: t("Tr No", "Tr No"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "TrDate",
        title: t("Tr Date", "Tr Date"),
        type: "date",
        inputType: "date",
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "CustomerID",
        title: t("Customer", "Customer"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Customer", displayField: IsLangEN ? "NameE" : "NameA", valueField: "CustomerID", condition: `CompCode = ${CompCode} AND IsActive = 1` },
        IsRequired: true,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "WarehouseID",
        title: t("Warehouse", "Warehouse"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Warehouse", displayField: IsLangEN ? "NameE" : "NameA", valueField: "WarehouseID", condition: `CompCode = ${CompCode} AND BranchCode = ${BranchCode}` },
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        type: "select",
        inputType: "select",
        selectOptions: [{ value: 0, label: "مسودة" }, { value: 1, label: "مرحّل" }, { value: 2, label: "ملغي" }],
        editable: false,
        insertable: false,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "PaymentType",
        title: t("Payment Type", "Payment Type"),
        type: "select",
        inputType: "select",
        selectOptions: [{ value: 0, label: "نقدي" }, { value: 1, label: "آجل" }, { value: 2, label: "بطاقة" }],
        IsRequired: true,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "Notes",
        title: t("Notes", "ملاحظات"),
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "Total",
        title: t("Total", "Total"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "Discount",
        title: t("Discount", "الخصم"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "Net",
        title: t("Net", "Net"),
        type: "number",
        inputType: "number",
        formula: (r, n) => n(r.Total) - n(r.Discount),
        editable: false,
        insertable: false,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "CreatedBy",
        title: t("Created By", "بواسطة"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 14,
      },
      {
        field: "CreatedAt",
        title: t("Created At", "Created At"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "UpdatedBy",
        title: t("Updated By", "Updated By"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 16,
      },
      {
        field: "UpdatedAt",
        title: t("Updated At", "Updated At"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 17,
      },
      {
        field: "CustomerCode",
        title: t("Customer Code", "كود العميل"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 18,
      },
      {
        field: "CustomerNameA",
        title: t("Customer Name A", "Customer Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 19,
      },
      {
        field: "CustomerNameE",
        title: t("Customer Name E", "Customer Name E"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 20,
      },
      {
        field: "CustomerPhone",
        title: t("Customer Phone", "Customer Phone"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 21,
      },
      {
        field: "CustomerCity",
        title: t("Customer City", "Customer City"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 22,
      },
      {
        field: "WarehouseCode",
        title: t("Warehouse Code", "كود المخزن"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 23,
      },
      {
        field: "WarehouseNameA",
        title: t("Warehouse Name A", "Warehouse Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 24,
      },
      {
        field: "WarehouseNameE",
        title: t("Warehouse Name E", "Warehouse Name E"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 25,
      },
      {
        field: "StatusTextA",
        title: t("Status Text A", "Status Text A"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 26,
      },
      {
        field: "StatusTextE",
        title: t("Status Text E", "Status Text E"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 27,
      },
      {
        field: "PaymentTypeTextA",
        title: t("Payment Type Text A", "Payment Type Text A"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 28,
      },
      {
        field: "PaymentTypeTextE",
        title: t("Payment Type Text E", "Payment Type Text E"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 29,
      },
      {
        field: "PaidAmount",
        title: t("Paid Amount", "Paid Amount"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 30,
      },
      {
        field: "RemainAmount",
        title: t("Remain Amount", "Remain Amount"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 31,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const ListColumns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "OrderID",
        title: t("Order", "Order"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "TrNo",
        title: t("Tr No", "Tr No"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "TrDate",
        title: t("Tr Date", "Tr Date"),
        type: "date",
        inputType: "date",
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "CustomerID",
        title: t("Customer", "Customer"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Customer", displayField: IsLangEN ? "NameE" : "NameA", valueField: "CustomerID", condition: `CompCode = ${CompCode} AND IsActive = 1` },
        IsRequired: true,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "WarehouseID",
        title: t("Warehouse", "Warehouse"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Warehouse", displayField: IsLangEN ? "NameE" : "NameA", valueField: "WarehouseID", condition: `CompCode = ${CompCode} AND BranchCode = ${BranchCode}` },
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "Status",
        title: t("Status", "الحالة"),
        type: "select",
        inputType: "select",
        selectOptions: [{ value: 0, label: "مسودة" }, { value: 1, label: "مرحّل" }, { value: 2, label: "ملغي" }],
        editable: false,
        insertable: false,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "PaymentType",
        title: t("Payment Type", "Payment Type"),
        type: "select",
        inputType: "select",
        selectOptions: [{ value: 0, label: "نقدي" }, { value: 1, label: "آجل" }, { value: 2, label: "بطاقة" }],
        IsRequired: true,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "Notes",
        title: t("Notes", "ملاحظات"),
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "Total",
        title: t("Total", "Total"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "Discount",
        title: t("Discount", "الخصم"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        DefaultValue: 0,
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "Net",
        title: t("Net", "Net"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        DefaultValue: 0,
        IsSave: false,
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "CustomerCode",
        title: t("Customer Code", "كود العميل"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 18,
      },
      {
        field: "CustomerNameA",
        title: t("Customer Name A", "Customer Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 19,
      },
      {
        field: "CustomerNameE",
        title: t("Customer Name E", "Customer Name E"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 20,
      },
      {
        field: "CustomerPhone",
        title: t("Customer Phone", "Customer Phone"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 21,
      },
      {
        field: "CustomerCity",
        title: t("Customer City", "Customer City"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 22,
      },
      {
        field: "WarehouseCode",
        title: t("Warehouse Code", "كود المخزن"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 23,
      },
      {
        field: "WarehouseNameA",
        title: t("Warehouse Name A", "Warehouse Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 24,
      },
      {
        field: "WarehouseNameE",
        title: t("Warehouse Name E", "Warehouse Name E"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 25,
      },
      {
        field: "StatusTextA",
        title: t("Status Text A", "Status Text A"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 26,
      },
      {
        field: "StatusTextE",
        title: t("Status Text E", "Status Text E"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 27,
      },
      {
        field: "PaymentTypeTextA",
        title: t("Payment Type Text A", "Payment Type Text A"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 28,
      },
      {
        field: "PaymentTypeTextE",
        title: t("Payment Type Text E", "Payment Type Text E"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 29,
      },
      {
        field: "PaidAmount",
        title: t("Paid Amount", "Paid Amount"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 30,
      },
      {
        field: "RemainAmount",
        title: t("Remain Amount", "Remain Amount"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 31,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const Detail1Columns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "LineID",
        title: t("Line", "Line"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "OrderID",
        title: t("Order", "Order"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "ItemID",
        title: t("Item", "Item"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Item", displayField: IsLangEN ? "NameE" : "NameA", valueField: "ItemID", condition: `CompCode = ${CompCode} AND IsActive = 1` },
        fillFrom: { UnitPrice: "Price" },
        IsRequired: true,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "Qty",
        title: t("Quantity", "الكمية"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "UnitPrice",
        title: t("Unit Price", "سعر الوحدة"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "DiscountPrc",
        title: t("Discount Prc", "Discount Prc"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "LineTotal",
        title: t("Line Total", "Line Total"),
        type: "number",
        inputType: "number",
        formula: (r, n) => n(r.Qty) * n(r.UnitPrice) * (1 - n(r.DiscountPrc) / 100),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "Notes",
        title: t("Notes", "ملاحظات"),
        SortFieldInEditAndAdd: 8,
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
        IsSave: false,
        SortFieldInEditAndAdd: 9,
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
        IsSave: false,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "TrNo",
        title: t("Tr No", "Tr No"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "TrDate",
        title: t("Tr Date", "Tr Date"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: Today,
        IsSave: false,
        SortFieldInEditAndAdd: 12,
      },
      {
        field: "ItemCode",
        title: t("Item Code", "كود الصنف"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 13,
      },
      {
        field: "ItemNameA",
        title: t("Item Name A", "Item Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 14,
      },
      {
        field: "ItemNameE",
        title: t("Item Name E", "Item Name E"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 15,
      },
      {
        field: "Barcode",
        title: t("Barcode", "Barcode"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 16,
      },
      {
        field: "CategoryID",
        title: t("Category", "Category"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 17,
      },
      {
        field: "UnitID",
        title: t("Unit", "Unit"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 18,
      },
      {
        field: "UnitNameA",
        title: t("Unit Name A", "Unit Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 19,
      },
      {
        field: "UnitNameE",
        title: t("Unit Name E", "Unit Name E"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 20,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const Detail2Columns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "PaymentID",
        title: t("Payment", "Payment"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "OrderID",
        title: t("Order", "Order"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "PayDate",
        title: t("Pay Date", "Pay Date"),
        type: "date",
        inputType: "date",
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "Method",
        title: t("Method", "Method"),
        type: "select",
        inputType: "select",
        selectOptions: [{ value: 0, label: "نقدي" }, { value: 1, label: "بطاقة" }, { value: 2, label: "تحويل" }, { value: 3, label: "شيك" }],
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "Amount",
        title: t("Amount", "المبلغ"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "Notes",
        title: t("Notes", "ملاحظات"),
        SortFieldInEditAndAdd: 6,
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
        IsSave: false,
        SortFieldInEditAndAdd: 7,
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
        IsSave: false,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "TrNo",
        title: t("Tr No", "Tr No"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "MethodTextA",
        title: t("Method Text A", "Method Text A"),
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "MethodTextE",
        title: t("Method Text E", "Method Text E"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        IsSave: false,
        SortFieldInEditAndAdd: 11,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "OrderID", label: t("Order", "Order"), type: "number", sortOrder: 1 },
      { field: "TrNo", label: t("Tr No", "Tr No"), type: "number", sortOrder: 2 },
      { field: "TrDate", label: t("Tr Date", "Tr Date"), type: "date", sortOrder: 3 },
      { field: "CustomerID", label: t("Customer", "Customer"), type: "number", sortOrder: 4 },
      { field: "WarehouseID", label: t("Warehouse", "Warehouse"), type: "number", sortOrder: 5 },
      { field: "Status", label: t("Status", "الحالة"), type: "number", sortOrder: 6 },
      { field: "PaymentType", label: t("Payment Type", "Payment Type"), type: "number", sortOrder: 7 },
      { field: "Notes", label: t("Notes", "ملاحظات"), type: "text", sortOrder: 8 },
      { field: "Total", label: t("Total", "Total"), type: "number", sortOrder: 9 },
      { field: "Discount", label: t("Discount", "الخصم"), type: "number", sortOrder: 10 },
      { field: "Net", label: t("Net", "Net"), type: "number", sortOrder: 11 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );
  // #endregion

  const Config = useMemo<MasterDetailConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      columns: MasterColumns,
      listColumns: ListColumns,
      details: [
        {
          title: t("Lines", "السطور"),
          tableName: "TST_OrderLine",
          viewName: "IQ_TST_OrderLine",
          keyColumn: "LineID",
          foreignKeyColumn: "OrderID",
          columns: Detail1Columns,
          totals: [{ masterField: "Total", detailField: "LineTotal", type: "sum" }],
          orderBy: "LineID",
        },
        {
          title: t("Payments", "الدفعات"),
          tableName: "TST_OrderPayment",
          viewName: "IQ_TST_OrderPayment",
          keyColumn: "PaymentID",
          foreignKeyColumn: "OrderID",
          columns: Detail2Columns,
          totals: [],
          orderBy: "PaymentID",
        },
      ],
      condition: Condition,
      orderBy: "OrderID",
      orderType: "DESC",
      pageSize: 10,
      filterFields: FilterFields,
      formLayout: FormLayoutCells,
      moduleCode: ModuleCode,
      onPrint: onPrintTransaction,
      excel: ExcelCfg,
      rowActions: RowActions,
      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,
      enableInsert: true,
      enableUpdate: true,
      enableDelete: true,
      newTitle: t("New Test Orders", "إضافة طلبات اختبار"),
      editTitle: t("Test Orders", "طلبات اختبار"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode, MasterColumns, ListColumns, Detail1Columns, Detail2Columns, FilterFields, ExcelCfg]
  );

  return { IsLangEN, IsDark, Config, filterReady, gridKey, ToolbarButtons };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"MasterDetail","Module":"TstOrder","Table":"TST_Order","View":"IQ_TST_Order","KeyColumn":"OrderID","TitleAr":"طلبات اختبار","TitleEn":"Test Orders","SubAr":"","SubEn":"","Icon":"fa-table-list","IconColor":"indigo","PageSize":10,"OrderBy":"","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"OrderID","TitleAr":"Order","TitleEn":"Order","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":3},{"Field":"TrNo","TitleAr":"Tr No","TitleEn":"Tr No","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"TrDate","TitleAr":"Tr Date","TitleEn":"Tr Date","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"Today","Width":150,"Order":5},{"Field":"CustomerID","TitleAr":"Customer","TitleEn":"Customer","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"WarehouseID","TitleAr":"Warehouse","TitleEn":"Warehouse","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"Status","TitleAr":"الحالة","TitleEn":"Status","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"select","Options":"0:مسودة|1:مرحّل|2:ملغي","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"0","Width":150,"Order":8},{"Field":"PaymentType","TitleAr":"Payment Type","TitleEn":"Payment Type","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"select","Options":"0:نقدي|1:آجل|2:بطاقة","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"Notes","TitleAr":"ملاحظات","TitleEn":"Notes","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10},{"Field":"Total","TitleAr":"Total","TitleEn":"Total","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"0","Width":150,"Order":11},{"Field":"Discount","TitleAr":"الخصم","TitleEn":"Discount","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"0","Width":150,"Order":12},{"Field":"Net","TitleAr":"Net","TitleEn":"Net","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"Total - Discount","Auto":"","DefaultValue":"0","Width":150,"Order":13},{"Field":"CreatedBy","TitleAr":"بواسطة","TitleEn":"Created By","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":14},{"Field":"CreatedAt","TitleAr":"Created At","TitleEn":"Created At","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"today","Width":150,"Order":15},{"Field":"UpdatedBy","TitleAr":"Updated By","TitleEn":"Updated By","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":16},{"Field":"UpdatedAt","TitleAr":"Updated At","TitleEn":"Updated At","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"","Width":150,"Order":17},{"Field":"CustomerCode","TitleAr":"كود العميل","TitleEn":"Customer Code","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":18},{"Field":"CustomerNameA","TitleAr":"Customer Name A","TitleEn":"Customer Name A","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":19},{"Field":"CustomerNameE","TitleAr":"Customer Name E","TitleEn":"Customer Name E","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":20},{"Field":"CustomerPhone","TitleAr":"Customer Phone","TitleEn":"Customer Phone","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":21},{"Field":"CustomerCity","TitleAr":"Customer City","TitleEn":"Customer City","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":22},{"Field":"WarehouseCode","TitleAr":"كود المخزن","TitleEn":"Warehouse Code","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":23},{"Field":"WarehouseNameA","TitleAr":"Warehouse Name A","TitleEn":"Warehouse Name A","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":24},{"Field":"WarehouseNameE","TitleAr":"Warehouse Name E","TitleEn":"Warehouse Name E","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":25},{"Field":"StatusTextA","TitleAr":"Status Text A","TitleEn":"Status Text A","InGrid":true,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":26},{"Field":"StatusTextE","TitleAr":"Status Text E","TitleEn":"Status Text E","InGrid":true,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":27},{"Field":"PaymentTypeTextA","TitleAr":"Payment Type Text A","TitleEn":"Payment Type Text A","InGrid":true,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":28},{"Field":"PaymentTypeTextE","TitleAr":"Payment Type Text E","TitleEn":"Payment Type Text E","InGrid":true,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":29},{"Field":"PaidAmount","TitleAr":"Paid Amount","TitleEn":"Paid Amount","InGrid":true,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":30},{"Field":"RemainAmount","TitleAr":"Remain Amount","TitleEn":"Remain Amount","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":31}],"ListFields":[],"Details":[{"TitleAr":"السطور","TitleEn":"Lines","Table":"TST_OrderLine","View":"IQ_TST_OrderLine","KeyColumn":"LineID","ForeignKey":"OrderID","Totals":"Total=LineTotal","OrderBy":"","Fields":[{"Field":"LineID","TitleAr":"Line","TitleEn":"Line","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"OrderID","TitleAr":"Order","TitleEn":"Order","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":2},{"Field":"ItemID","TitleAr":"Item","TitleEn":"Item","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"UnitPrice=Price","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"Qty","TitleAr":"الكمية","TitleEn":"Quantity","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"UnitPrice","TitleAr":"سعر الوحدة","TitleEn":"Unit Price","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"DiscountPrc","TitleAr":"Discount Prc","TitleEn":"Discount Prc","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"LineTotal","TitleAr":"Line Total","TitleEn":"Line Total","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"Qty * UnitPrice * (1 - DiscountPrc / 100)","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"Notes","TitleAr":"ملاحظات","TitleEn":"Notes","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":8},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":9},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":10},{"Field":"TrNo","TitleAr":"Tr No","TitleEn":"Tr No","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":11},{"Field":"TrDate","TitleAr":"Tr Date","TitleEn":"Tr Date","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"today","Width":150,"Order":12},{"Field":"ItemCode","TitleAr":"كود الصنف","TitleEn":"Item Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":13},{"Field":"ItemNameA","TitleAr":"Item Name A","TitleEn":"Item Name A","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":14},{"Field":"ItemNameE","TitleAr":"Item Name E","TitleEn":"Item Name E","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":15},{"Field":"Barcode","TitleAr":"Barcode","TitleEn":"Barcode","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":16},{"Field":"CategoryID","TitleAr":"Category","TitleEn":"Category","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":17},{"Field":"UnitID","TitleAr":"Unit","TitleEn":"Unit","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":18},{"Field":"UnitNameA","TitleAr":"Unit Name A","TitleEn":"Unit Name A","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":19},{"Field":"UnitNameE","TitleAr":"Unit Name E","TitleEn":"Unit Name E","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":20}]},{"TitleAr":"الدفعات","TitleEn":"Payments","Table":"TST_OrderPayment","View":"IQ_TST_OrderPayment","KeyColumn":"PaymentID","ForeignKey":"OrderID","Totals":"","OrderBy":"","Fields":[{"Field":"PaymentID","TitleAr":"Payment","TitleEn":"Payment","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"OrderID","TitleAr":"Order","TitleEn":"Order","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":2},{"Field":"PayDate","TitleAr":"Pay Date","TitleEn":"Pay Date","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"today","Width":150,"Order":3},{"Field":"Method","TitleAr":"Method","TitleEn":"Method","InGrid":false,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"select","Options":"0:نقدي|1:بطاقة|2:تحويل|3:شيك","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"Amount","TitleAr":"المبلغ","TitleEn":"Amount","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"Notes","TitleAr":"ملاحظات","TitleEn":"Notes","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":7},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":8},{"Field":"TrNo","TitleAr":"Tr No","TitleEn":"Tr No","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"MethodTextA","TitleAr":"Method Text A","TitleEn":"Method Text A","InGrid":true,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10},{"Field":"MethodTextE","TitleAr":"Method Text E","TitleEn":"Method Text E","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":11}]}],"Validations":[]}
// @ScreenBuilder-Settings: {"version":5,"screenType":"MasterDetail","module":"TstOrder","table":"TST_Order","view":"IQ_TST_Order","keyColumn":"OrderID","titleAr":"طلبات اختبار","titleEn":"Test Orders","subAr":"","subEn":"","icon":"fa-table-list","iconColor":"indigo","pageSize":10,"orderBy":"","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"OrderID","titleAr":"Order","titleEn":"Order","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":3},{"field":"TrNo","titleAr":"Tr No","titleEn":"Tr No","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4,"readOnly":true},{"field":"TrDate","titleAr":"Tr Date","titleEn":"Tr Date","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"Today","width":150,"order":5},{"field":"CustomerID","titleAr":"Customer","titleEn":"Customer","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6,"selectTable":"TST_Customer","selectValue":"CustomerID","selectDisplay":"NameA","selectDisplayEn":"NameE","selectCondition":"CompCode = {session.CompCode} AND IsActive = 1","selectOrderBy":"NameA"},{"field":"WarehouseID","titleAr":"Warehouse","titleEn":"Warehouse","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7,"selectTable":"TST_Warehouse","selectValue":"WarehouseID","selectDisplay":"NameA","selectDisplayEn":"NameE","selectCondition":"CompCode = {session.CompCode} AND BranchCode = {session.BranchCode}","selectOrderBy":"NameA"},{"field":"Status","titleAr":"الحالة","titleEn":"Status","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"select","options":"0:مسودة|1:مرحّل|2:ملغي","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"0","width":150,"order":8,"readOnly":true},{"field":"PaymentType","titleAr":"Payment Type","titleEn":"Payment Type","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"select","options":"0:نقدي|1:آجل|2:بطاقة","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9},{"field":"Notes","titleAr":"ملاحظات","titleEn":"Notes","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10},{"field":"Total","titleAr":"Total","titleEn":"Total","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"0","width":150,"order":11,"readOnly":true},{"field":"Discount","titleAr":"الخصم","titleEn":"Discount","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"0","width":150,"order":12},{"field":"Net","titleAr":"Net","titleEn":"Net","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"Total - Discount","auto":"","defaultValue":"0","width":150,"order":13,"readOnly":true},{"field":"CreatedBy","titleAr":"بواسطة","titleEn":"Created By","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":14},{"field":"CreatedAt","titleAr":"Created At","titleEn":"Created At","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"today","width":150,"order":15},{"field":"UpdatedBy","titleAr":"Updated By","titleEn":"Updated By","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":16},{"field":"UpdatedAt","titleAr":"Updated At","titleEn":"Updated At","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"","width":150,"order":17},{"field":"CustomerCode","titleAr":"كود العميل","titleEn":"Customer Code","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":18,"noSave":true},{"field":"CustomerNameA","titleAr":"Customer Name A","titleEn":"Customer Name A","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":19,"noSave":true},{"field":"CustomerNameE","titleAr":"Customer Name E","titleEn":"Customer Name E","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":20,"noSave":true},{"field":"CustomerPhone","titleAr":"Customer Phone","titleEn":"Customer Phone","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":21,"noSave":true},{"field":"CustomerCity","titleAr":"Customer City","titleEn":"Customer City","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":22,"noSave":true},{"field":"WarehouseCode","titleAr":"كود المخزن","titleEn":"Warehouse Code","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":23,"noSave":true},{"field":"WarehouseNameA","titleAr":"Warehouse Name A","titleEn":"Warehouse Name A","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":24,"noSave":true},{"field":"WarehouseNameE","titleAr":"Warehouse Name E","titleEn":"Warehouse Name E","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":25,"noSave":true},{"field":"StatusTextA","titleAr":"Status Text A","titleEn":"Status Text A","inGrid":true,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":26,"noSave":true},{"field":"StatusTextE","titleAr":"Status Text E","titleEn":"Status Text E","inGrid":true,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":27,"noSave":true},{"field":"PaymentTypeTextA","titleAr":"Payment Type Text A","titleEn":"Payment Type Text A","inGrid":true,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":28,"noSave":true},{"field":"PaymentTypeTextE","titleAr":"Payment Type Text E","titleEn":"Payment Type Text E","inGrid":true,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":29,"noSave":true},{"field":"PaidAmount","titleAr":"Paid Amount","titleEn":"Paid Amount","inGrid":true,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":30,"noSave":true},{"field":"RemainAmount","titleAr":"Remain Amount","titleEn":"Remain Amount","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":31,"noSave":true}],"listFields":[],"details":[{"titleAr":"السطور","titleEn":"Lines","table":"TST_OrderLine","view":"IQ_TST_OrderLine","keyColumn":"LineID","foreignKey":"OrderID","totals":"Total=LineTotal","orderBy":"","fields":[{"field":"LineID","titleAr":"Line","titleEn":"Line","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"OrderID","titleAr":"Order","titleEn":"Order","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":2},{"field":"ItemID","titleAr":"Item","titleEn":"Item","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"UnitPrice=Price","formula":"","auto":"","defaultValue":"","width":150,"order":3,"selectTable":"TST_Item","selectDisplay":"NameA","selectDisplayEn":"NameE","selectValue":"ItemID","selectCondition":"CompCode = {session.CompCode} AND IsActive = 1"},{"field":"Qty","titleAr":"الكمية","titleEn":"Quantity","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"UnitPrice","titleAr":"سعر الوحدة","titleEn":"Unit Price","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"DiscountPrc","titleAr":"Discount Prc","titleEn":"Discount Prc","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"LineTotal","titleAr":"Line Total","titleEn":"Line Total","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"Qty * UnitPrice * (1 - DiscountPrc / 100)","auto":"","defaultValue":"","width":150,"order":7,"noSave":true},{"field":"Notes","titleAr":"ملاحظات","titleEn":"Notes","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":8},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":9,"noSave":true},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":10,"noSave":true},{"field":"TrNo","titleAr":"Tr No","titleEn":"Tr No","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":11,"noSave":true},{"field":"TrDate","titleAr":"Tr Date","titleEn":"Tr Date","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"today","width":150,"order":12,"noSave":true},{"field":"ItemCode","titleAr":"كود الصنف","titleEn":"Item Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":13,"noSave":true},{"field":"ItemNameA","titleAr":"Item Name A","titleEn":"Item Name A","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":14,"noSave":true},{"field":"ItemNameE","titleAr":"Item Name E","titleEn":"Item Name E","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":15,"noSave":true},{"field":"Barcode","titleAr":"Barcode","titleEn":"Barcode","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":16,"noSave":true},{"field":"CategoryID","titleAr":"Category","titleEn":"Category","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":17,"noSave":true},{"field":"UnitID","titleAr":"Unit","titleEn":"Unit","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":18,"noSave":true},{"field":"UnitNameA","titleAr":"Unit Name A","titleEn":"Unit Name A","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":19,"noSave":true},{"field":"UnitNameE","titleAr":"Unit Name E","titleEn":"Unit Name E","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":20,"noSave":true}]},{"titleAr":"الدفعات","titleEn":"Payments","table":"TST_OrderPayment","view":"IQ_TST_OrderPayment","keyColumn":"PaymentID","foreignKey":"OrderID","totals":"","orderBy":"","fields":[{"field":"PaymentID","titleAr":"Payment","titleEn":"Payment","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"OrderID","titleAr":"Order","titleEn":"Order","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":2},{"field":"PayDate","titleAr":"Pay Date","titleEn":"Pay Date","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"today","width":150,"order":3},{"field":"Method","titleAr":"Method","titleEn":"Method","inGrid":false,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"select","options":"0:نقدي|1:بطاقة|2:تحويل|3:شيك","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"Amount","titleAr":"المبلغ","titleEn":"Amount","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"Notes","titleAr":"ملاحظات","titleEn":"Notes","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":7,"noSave":true},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":8,"noSave":true},{"field":"TrNo","titleAr":"Tr No","titleEn":"Tr No","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9,"noSave":true},{"field":"MethodTextA","titleAr":"Method Text A","titleEn":"Method Text A","inGrid":true,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10,"noSave":true},{"field":"MethodTextE","titleAr":"Method Text E","titleEn":"Method Text E","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":11,"noSave":true}]}],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":false,"field":"","labelAr":"","labelEn":"","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":false,"field":"","approveTrType":"","unapproveTrType":"","approvePermission":"","unapprovePermission":"","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-05T10:04:49.007Z","modifiedBy":"","source":"web"},"menuSort":0,"layout":{"sections":[{"id":"sec_mw3dqfvpfyh","titleAr":"","titleEn":"","rows":[{"id":"row_mw3dqfvo4lf","cells":[{"id":"cell_mw3dqfvo1zl","kind":"number","field":"TrNo","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dqfvo2wg","kind":"date","field":"TrDate","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dqfvo3ku","kind":"selectSearch","field":"CustomerID","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3dqfvo8k2","cells":[{"id":"cell_mw3dqfvo5fb","kind":"selectSearch","field":"WarehouseID","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dqfvo6j","kind":"select","field":"Status","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dqfvo74r","kind":"select","field":"PaymentType","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3dqfvocmt","cells":[{"id":"cell_mw3dqfvo9sw","kind":"text","field":"Notes","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dqfvoa4f","kind":"number","field":"Total","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3dqfvob5j","kind":"number","field":"Discount","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3dqfvpe4","cells":[{"id":"cell_mw3dqfvpdk4","kind":"number","field":"Net","span":{"base":12,"md":6,"lg":4}}]}]}]},"filterArea":[{"id":"flt_mw3dqfvpgxt","field":"OrderID","kind":"number","labelAr":"Order","labelEn":"Order","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvph8s","field":"TrNo","kind":"number","labelAr":"Tr No","labelEn":"Tr No","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvpi3g","field":"TrDate","kind":"date","labelAr":"Tr Date","labelEn":"Tr Date","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvpjm","field":"CustomerID","kind":"number","labelAr":"Customer","labelEn":"Customer","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvpkkz","field":"WarehouseID","kind":"number","labelAr":"Warehouse","labelEn":"Warehouse","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvplfr","field":"Status","kind":"number","labelAr":"الحالة","labelEn":"Status","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvpmrq","field":"PaymentType","kind":"number","labelAr":"Payment Type","labelEn":"Payment Type","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvpne9","field":"Notes","kind":"text","labelAr":"ملاحظات","labelEn":"Notes","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvpoks","field":"Total","kind":"number","labelAr":"Total","labelEn":"Total","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvppa6","field":"Discount","kind":"number","labelAr":"الخصم","labelEn":"Discount","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3dqfvpqm7","field":"Net","kind":"number","labelAr":"Net","labelEn":"Net","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}}],"actions":[{"id":"act_mw3dvervrnu","labelAr":"ترحيل","labelEn":"Post","icon":"fa-bolt","scope":"row","proc":"TST_Proc_PostOrder","params":[{"name":"OrderID","source":"row","value":"OrderID"},{"name":"UserID","source":"session","value":"UserID"}],"confirm":true,"after":"refresh","messageAr":"تم التنفيذ","messageEn":"Done"},{"id":"act_mw3dvwubspe","labelAr":"إلغاء","labelEn":"Cancel","icon":"fa-ban","scope":"row","proc":"TST_Proc_CancelOrder","params":[{"name":"OrderID","source":"row","value":"OrderID"},{"name":"UserID","source":"session","value":"UserID"},{"name":"Reason","source":"const","value":"إلغاء من الشاشة"}],"confirm":true,"after":"refresh","messageAr":"تم التنفيذ","messageEn":"Done"},{"id":"act_mw3dw5cht81","labelAr":"إعادة حساب","labelEn":"Recalc","icon":"fa-calculator","scope":"row","proc":"TST_Proc_RecalcOrder","params":[{"name":"OrderID","source":"row","value":"OrderID"},{"name":"UserID","source":"session","value":"UserID"}],"confirm":true,"after":"refresh","messageAr":"تم التنفيذ","messageEn":"Done"}],"print":{"listPrint":{"enabled":true,"proc":"TST_Rpt_OrderList","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"FromDate","source":"filter","value":"TrDate"},{"name":"ToDate","source":"filter","value":"TrDate"},{"name":"CustomerID","source":"filter","value":"CustomerID"},{"name":"Status","source":"filter","value":"Status"}],"paper":"A4","orientation":"portrait","reportCode":"TST_OrderList"},"transactionPrint":{"enabled":true,"proc":"TST_Rpt_OrderPrint","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"TrID","source":"row","value":"OrderID"}],"paper":"A4","orientation":"portrait","reportCode":"TST_OrderPrint"}},"excel":{"enabled":true,"templateName":"TstOrder_Template","columns":["TrDate","CustomerID","WarehouseID","PaymentType","Discount"],"keyLookups":[{"column":"CustomerID","scope":"master","table":"TST_Customer","valueField":"CustomerID","displayField":"NameA","codeField":"Code","condition":"CompCode = {session.CompCode}"},{"column":"ItemID","scope":"detail","table":"TST_Item","valueField":"ItemID","displayField":"NameA","codeField":"Code","condition":"CompCode = {session.CompCode}"}],"mode":"both","detailColumns":["ItemID","Qty","UnitPrice","DiscountPrc"],"detailIndex":0},"importedBestEffort":false}
