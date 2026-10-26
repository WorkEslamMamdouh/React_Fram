"use client";

// =====================================================================================
//  📄 SalesInvoice.ts   ←  ملف المنطق (البيزنس) — شاشة فواتير المبيعات (ماستر ديتيل)
//  اتعمل بنفس شكل برنامج CreatePageReact — تقدر تفتحه في البرنامج وتعدّله (نوع: ماستر ديتيل)
// -------------------------------------------------------------------------------------
//  الماستر   : بيتحفظ في I_TR_Sales        وبيتعرض في القائمة من IQ_TR_Sales
//  التفاصيل 1: بيتحفظ في I_TR_SaleDetails  وبيتعرض من IQ_TR_SaleDetails
//  الربط      : SaleID
//  الحفظ      : عادي من غير G_ProcessTrans
//
//  الملف ده فيه "إعدادات" بس — الشغل كله في المكوّن MasterDetail:
//    MasterColumns  = حقول رأس الفاتورة
//    ListColumns    = أعمدة قائمة الفواتير
//    Detail1Columns = أعمدة جدول الأصناف
//    Validations    = قواعد التحقق قبل الحفظ (Shared/Validation.ts)
//    Config         = كل ده مع بعض ← بيروح لـ <MasterDetail config={...} />
// =====================================================================================

import { useMemo } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig } from "../Shared/Components/Import/AdvancedFilter";
import { MasterDetailColumn, MasterDetailConfig } from "../Shared/Components/Import/ModelMasterDetail";
import { ValidationRule } from "../Shared/Validation";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "I_TR_Sales";          // بيتحفظ فيه
const ViewName = "IQ_TR_Sales";          // بيتعرض منه في القائمة
const KeyColumn = "SaleID";
const TrType = "";                       // بيروح لـ @TrType في G_ProcessTrans
const RunProcessTrans = false;           // true = شغّل G_ProcessTrans بعد كل حفظ أو حذف
// #endregion

// =======================
// SalesInvoice
// =======================
export function SalesInvoice() {
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
  const Today = new Date().toISOString().substring(0, 10);
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  // =======================
  // #region ① حقول الماستر (رأس الفاتورة)
  // =======================
  //  formula = حقل محسوب   •   الحقول اللي عليها مجموع من التفاصيل (totals) بتبقى قراءة بس
  const MasterColumns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "SaleID",
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
        title: t("Invoice No", "رقم الفاتورة"),
        type: "number",
        inputType: "number",
        width: 120,
        editable: false,
        insertable: false,
        IsSave: false,              // للعرض بس (بيتملى من G_ProcessTrans)
      },
      {
        field: "TrDate",
        title: t("Date", "التاريخ"),
        type: "date",
        inputType: "date",
        DefaultValue: Today,
        width: 130,
        IsRequired: true,
        IsSave: true,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "CustomerName",
        title: t("Customer", "العميل"),
        width: 220,
        IsRequired: true,
        IsSave: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "PaymentType",
        title: t("Payment", "طريقة الدفع"),
        inputType: "select",
        selectOptions: [{ value: 0, label: t("Cash", "نقدي") }, { value: 1, label: t("Credit", "آجل") }],
        DefaultValue: 0,
        width: 120,
        IsRequired: true,
        IsSave: true,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "Remarks",
        title: t("Remarks", "ملاحظات"),
        inputType: "textarea",
        rows: 3,
        width: 220,
        IsSave: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "TotalAmount",
        title: t("Total", "الإجمالي"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,               // بيتملى من مجموع التفاصيل
      },
      {
        field: "DiscountAmount",
        title: t("Discount", "الخصم"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 120,
        IsSave: true,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "VatAmount",
        title: t("VAT 14%", "الضريبة 14%"),
        type: "number",
        inputType: "number",
        step: 0.01,
        formula: (r, n) => (n(r.TotalAmount) - n(r.DiscountAmount)) * 0.14,
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,
      },
      {
        field: "NetAmount",
        title: t("Net", "الصافي"),
        type: "number",
        inputType: "number",
        step: 0.01,
        formula: (r, n) => n(r.TotalAmount) - n(r.DiscountAmount) + n(r.VatAmount),
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,
      },
      {
        field: "CompCode",
        title: t("Company", "الشركة"),
        type: "number",
        inputType: "number",
        DefaultValue: CompCode,          // تلقائي من الجلسة
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,
        IsVisibleDisplayInGrid: false,
      },
      {
        field: "BranchCode",
        title: t("Branch", "الفرع"),
        type: "number",
        inputType: "number",
        DefaultValue: BranchCode,          // تلقائي من الجلسة
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,
        IsVisibleDisplayInGrid: false,
      },
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear, Today]
  );
  // #endregion

  // =======================
  // #region ② أعمدة القائمة (من القالب IQ_TR_Sales)
  // =======================
  const ListColumns = useMemo<DynamicGridColumn[]>(
    () => [
      { field: "SaleID", title: t("ID", "الرقم"), type: "number", width: 90 },
      { field: "TrNo", title: t("Invoice No", "رقم الفاتورة"), type: "number", width: 120 },
      { field: "TrDate", title: t("Date", "التاريخ"), type: "date", width: 130, IsSearchColumn: false },
      { field: "CustomerName", title: t("Customer", "العميل"), width: 220 },
      { field: "PaymentType", title: t("Payment", "طريقة الدفع"), inputType: "select", selectOptions: [{ value: 0, label: t("Cash", "نقدي") }, { value: 1, label: t("Credit", "آجل") }], width: 120, IsSearchColumn: false },
      { field: "ItemsCount", title: t("Items", "عدد الأصناف"), type: "number", width: 100, IsSearchColumn: false },
      { field: "NetAmount", title: t("Net", "الصافي"), type: "number", width: 130, IsDigits: true, IsSearchColumn: false },
    ],
    [IsLangEN]
  );
  // #endregion

  // =======================
  // #region ③ التفاصيل 1: الأصناف (I_TR_SaleDetails)
  // =======================
  const Detail1Columns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "SaleDetailID",
        title: t("ID", "الرقم"),
        type: "number",
        inputType: "number",
        width: 80,
        editable: false,
        insertable: false,          // ترقيم تلقائي
        IsSave: false,
        IsVisibleDisplayInGrid: false,
      },
      {
        field: "SaleID",
        title: t("Invoice", "الفاتورة"),
        type: "number",
        inputType: "number",
        width: 80,
        editable: false,
        insertable: false,
        IsSave: false,              // بيتملى لوحده من الماستر
        IsVisibleDisplayInGrid: false,
      },
      {
        field: "ItemName",
        title: t("Item", "الصنف"),
        width: 240,
        IsRequired: true,
        IsSave: true,
      },
      {
        field: "Qty",
        title: t("Qty", "الكمية"),
        type: "number",
        inputType: "number",
        step: 0.001,
        DefaultValue: 1,
        width: 100,
        IsRequired: true,
        IsSave: true,
      },
      {
        field: "UnitPrice",
        title: t("Price", "السعر"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 110,
        IsSave: true,
      },
      {
        field: "DiscountPrc",
        title: t("Disc %", "خصم %"),
        type: "number",
        inputType: "number",
        step: 0.01,
        DefaultValue: 0,
        width: 90,
        IsSave: true,
      },
      {
        field: "Total",
        title: t("Total", "الإجمالي"),
        type: "number",
        inputType: "number",
        step: 0.01,
        formula: (r, n) => n(r.Qty) * n(r.UnitPrice) * (1 - n(r.DiscountPrc) / 100),
        width: 120,
        editable: false,
        insertable: false,
        IsSave: true,
      },
      {
        field: "Remarks",
        title: t("Remarks", "ملاحظات"),
        width: 200,
        IsSave: true,
      },
    ],
    [IsLangEN, CompCode, BranchCode, UserID, FinYear, Today]
  );
  // #endregion

  // =======================
  // #region ④ الفلتر المتقدم للقائمة
  // =======================
  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "TrDate", label: t("Date", "التاريخ"), type: "dateRange", sortOrder: 1 },
      { field: "CustomerName", label: t("Customer", "العميل"), type: "text", sortOrder: 2 },
      { field: "PaymentType", label: t("Payment", "طريقة الدفع"), type: "select", options: [{ value: "0", label: t("Cash", "نقدي") }, { value: "1", label: t("Credit", "آجل") }], sortOrder: 3 },
      { field: "NetAmount", label: t("Net", "الصافي"), type: "number", sortOrder: 4 },
    ],
    [IsLangEN]
  );
  // #endregion

  // =======================
  // #region ⑤ التحقق قبل الحفظ (Validations)
  // =======================
  //  detail: 1 = القاعدة على صفوف التفاصيل الأولى   •   من غير detail = على الماستر
  //  الشرط فيه {Field} بتتبدل بقيمة الحقل   (شوف الشرح في Shared/Validation.ts)
  const Validations = useMemo<ValidationRule[]>(
    () => [
      {
        type: "minRows", detail: 1, min: 1,
        messageEn: "Add at least one item", messageAr: "لازم تضيف صنف واحد على الأقل",
      },
      {
        type: "noDuplicate", detail: 1, field: "ItemName",
        messageEn: "Item {ItemName} is repeated", messageAr: "الصنف {ItemName} متكرر",
      },
      {
        type: "range", detail: 1, field: "Qty", min: 0.001, max: 1000000,
        messageEn: "Qty must be more than 0", messageAr: "الكمية لازم تكون أكبر من 0",
      },
      {
        type: "range", detail: 1, field: "DiscountPrc", min: 0, max: 100,
        messageEn: "Discount % must be between 0 and 100", messageAr: "نسبة الخصم لازم تكون من 0 لـ 100",
      },
      {
        type: "compare", field: "DiscountAmount", operator: "<=", compareTo: "TotalAmount",
        messageEn: "Discount can't be more than the total", messageAr: "الخصم مينفعش يكون أكبر من الإجمالي",
      },
      {
        type: "custom",
        check: (ctx) => (ctx.row.TrDate > Today ? t("Invoice date can't be in the future", "تاريخ الفاتورة مينفعش يكون في المستقبل") : null),
        messageEn: "", messageAr: "",
      },
      // مثال على التحقق من جدول تاني (فعّله لما يبقى عندك جدول عملاء):
      // {
      //   type: "exists", field: "CustomerID", table: "D_Customer",
      //   condition: "CustomerID = {CustomerID} AND ISNULL(Address, '') <> ''",
      //   messageEn: "Customer has no address", messageAr: "العميل ملوش عنوان — كمّل بياناته الأول",
      // },
    ],
    [IsLangEN, Today]
  );
  // #endregion

  // =======================
  // #region الإعدادات كلها ← <MasterDetail config={...} />
  // =======================
  const Config = useMemo<MasterDetailConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      columns: MasterColumns,
      listColumns: ListColumns,
      details: [
        {
          title: t("Items", "الأصناف"),
          tableName: "I_TR_SaleDetails",
          viewName: "IQ_TR_SaleDetails",
          keyColumn: "SaleDetailID",
          foreignKeyColumn: "SaleID",
          columns: Detail1Columns,
          totals: [{ masterField: "TotalAmount", detailField: "Total", type: "sum" }],
          orderBy: "SaleDetailID",
        },
      ],
      condition: `CompCode = ${CompCode} AND BranchCode = ${BranchCode}`,
      orderBy: "SaleID",
      orderType: "DESC",
      pageSize: 10,
      filterFields: FilterFields,
      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,
      validations: Validations,
      enableInsert: true,
      enableUpdate: true,
      enableDelete: true,
      newTitle: t("New invoice", "فاتورة جديدة"),
      editTitle: t("Invoice", "فاتورة رقم"),
    }),
    [IsLangEN, CompCode, BranchCode, MasterColumns, ListColumns, Detail1Columns, FilterFields, Validations]
  );
  // #endregion

  return {
    IsLangEN,
    IsDark,
    Config,
  };
}

// ⚠️ السطر اللي تحت ده بيقراه برنامج CreatePageReact عشان يفتح الشاشة ويعدّلها — متمسحوش
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"MasterDetail","Module":"SalesInvoice","Table":"I_TR_Sales","View":"IQ_TR_Sales","KeyColumn":"SaleID","TitleAr":"فواتير المبيعات","TitleEn":"Sales Invoices","SubAr":"فواتير البيع والأصناف بتاعتها","SubEn":"Sales invoices and their items","Icon":"fa-file-invoice-dollar","PageSize":10,"ProcessTrans":false,"TrType":"","FilterComp":true,"FilterBranch":true,"ExtraCondition":"","OrderBy":"SaleID","OrderType":"DESC","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","IconColor":"indigo","Roles":"","Fields":[{"Field":"SaleID","TitleAr":"الرقم","TitleEn":"ID","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":90,"Order":1},{"Field":"TrNo","TitleAr":"رقم الفاتورة","TitleEn":"Invoice No","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":2},{"Field":"TrDate","TitleAr":"التاريخ","TitleEn":"Date","InGrid":true,"InForm":true,"Required":true,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"today","Width":130,"Order":3},{"Field":"CustomerName","TitleAr":"العميل","TitleEn":"Customer","InGrid":true,"InForm":true,"Required":true,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":220,"Order":4},{"Field":"PaymentType","TitleAr":"طريقة الدفع","TitleEn":"Payment","InGrid":true,"InForm":true,"Required":true,"Search":false,"InFilter":false,"InputType":"select","Options":"0=نقدي=Cash;1=آجل=Credit","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":5},{"Field":"Remarks","TitleAr":"ملاحظات","TitleEn":"Remarks","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":false,"InputType":"textarea","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":220,"Order":6},{"Field":"TotalAmount","TitleAr":"الإجمالي","TitleEn":"Total","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":7},{"Field":"DiscountAmount","TitleAr":"الخصم","TitleEn":"Discount","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":8},{"Field":"VatAmount","TitleAr":"الضريبة 14%","TitleEn":"VAT 14%","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"(TotalAmount - DiscountAmount) * 0.14","Auto":"","DefaultValue":"","Width":120,"Order":9},{"Field":"NetAmount","TitleAr":"الصافي","TitleEn":"Net","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"TotalAmount - DiscountAmount + VatAmount","Auto":"","DefaultValue":"","Width":120,"Order":10},{"Field":"CompCode","TitleAr":"الشركة","TitleEn":"Company","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":120,"Order":11},{"Field":"BranchCode","TitleAr":"الفرع","TitleEn":"Branch","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":120,"Order":12},{"Field":"CreatedAt","TitleAr":"تاريخ الإنشاء","TitleEn":"Created at","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":13},{"Field":"ItemsCount","TitleAr":"عدد الأصناف","TitleEn":"Items","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":100,"Order":14}],"ListFields":[{"Field":"SaleID","TitleAr":"الرقم","TitleEn":"ID","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":90,"Order":1},{"Field":"TrNo","TitleAr":"رقم الفاتورة","TitleEn":"Invoice No","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":2},{"Field":"TrDate","TitleAr":"التاريخ","TitleEn":"Date","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":130,"Order":3},{"Field":"CustomerName","TitleAr":"العميل","TitleEn":"Customer","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":220,"Order":4},{"Field":"PaymentType","TitleAr":"طريقة الدفع","TitleEn":"Payment","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":true,"InputType":"select","Options":"0=نقدي=Cash;1=آجل=Credit","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":5},{"Field":"ItemsCount","TitleAr":"عدد الأصناف","TitleEn":"Items","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":100,"Order":6},{"Field":"NetAmount","TitleAr":"الصافي","TitleEn":"Net","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":130,"Order":7},{"Field":"CompCode","TitleAr":"الشركة","TitleEn":"Company","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":120,"Order":8},{"Field":"BranchCode","TitleAr":"الفرع","TitleEn":"Branch","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":120,"Order":9},{"Field":"Remarks","TitleAr":"ملاحظات","TitleEn":"Remarks","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":220,"Order":10},{"Field":"TotalAmount","TitleAr":"الإجمالي","TitleEn":"Total","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":11},{"Field":"DiscountAmount","TitleAr":"الخصم","TitleEn":"Discount","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":12},{"Field":"VatAmount","TitleAr":"الضريبة","TitleEn":"VAT","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":13},{"Field":"CreatedAt","TitleAr":"تاريخ الإنشاء","TitleEn":"Created at","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":14}],"Details":[{"TitleAr":"الأصناف","TitleEn":"Items","Table":"I_TR_SaleDetails","View":"IQ_TR_SaleDetails","KeyColumn":"SaleDetailID","ForeignKey":"SaleID","Totals":"TotalAmount=Total","OrderBy":"SaleDetailID","Fields":[{"Field":"SaleDetailID","TitleAr":"الرقم","TitleEn":"ID","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":80,"Order":1},{"Field":"SaleID","TitleAr":"الفاتورة","TitleEn":"Invoice","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":80,"Order":2},{"Field":"ItemName","TitleAr":"الصنف","TitleEn":"Item","InGrid":true,"InForm":true,"Required":true,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":240,"Order":3},{"Field":"Qty","TitleAr":"الكمية","TitleEn":"Qty","InGrid":true,"InForm":true,"Required":true,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"1","Width":100,"Order":4},{"Field":"UnitPrice","TitleAr":"السعر","TitleEn":"Price","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":110,"Order":5},{"Field":"DiscountPrc","TitleAr":"خصم %","TitleEn":"Disc %","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":90,"Order":6},{"Field":"Total","TitleAr":"الإجمالي","TitleEn":"Total","InGrid":true,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"Qty * UnitPrice * (1 - DiscountPrc / 100)","Auto":"","DefaultValue":"","Width":120,"Order":7},{"Field":"Remarks","TitleAr":"ملاحظات","TitleEn":"Remarks","InGrid":true,"InForm":true,"Required":false,"Search":false,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":200,"Order":8},{"Field":"CompCode","TitleAr":"الشركة","TitleEn":"Company","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":9},{"Field":"BranchCode","TitleAr":"الفرع","TitleEn":"Branch","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":120,"Order":10},{"Field":"TrDate","TitleAr":"التاريخ","TitleEn":"Date","InGrid":false,"InForm":false,"Required":false,"Search":false,"InFilter":false,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":130,"Order":11}]}],"Validations":[{"Detail":1,"Type":"minRows","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"1","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"لازم تضيف صنف واحد على الأقل","MessageEn":"Add at least one item"},{"Detail":1,"Type":"noDuplicate","Field":"ItemName","When":"both","Operator":"","CompareTo":"","Value":"","Min":"","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"الصنف {ItemName} متكرر","MessageEn":"Item {ItemName} is repeated"},{"Detail":1,"Type":"range","Field":"Qty","When":"both","Operator":"","CompareTo":"","Value":"","Min":"0.001","Max":"1000000","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"الكمية لازم تكون أكبر من 0","MessageEn":"Qty must be more than 0"},{"Detail":1,"Type":"range","Field":"DiscountPrc","When":"both","Operator":"","CompareTo":"","Value":"","Min":"0","Max":"100","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"نسبة الخصم لازم تكون من 0 لـ 100","MessageEn":"Discount % must be between 0 and 100"},{"Detail":0,"Type":"compare","Field":"DiscountAmount","When":"both","Operator":"<=","CompareTo":"TotalAmount","Value":"","Min":"","Max":"","Pattern":"","Table":"","Condition":"","Code":"","MessageAr":"الخصم مينفعش يكون أكبر من الإجمالي","MessageEn":"Discount can't be more than the total"},{"Detail":0,"Type":"custom","Field":"","When":"both","Operator":"","CompareTo":"","Value":"","Min":"","Max":"","Pattern":"","Table":"","Condition":"","Code":"return ctx.row.TrDate > Today ? t(\"Invoice date can't be in the future\", \"تاريخ الفاتورة مينفعش يكون في المستقبل\") : null;","MessageAr":"","MessageEn":""}]}
