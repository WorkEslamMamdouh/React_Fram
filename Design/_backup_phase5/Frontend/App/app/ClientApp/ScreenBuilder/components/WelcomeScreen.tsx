"use client";

import React from "react";
import { useSys } from "../../Shared/SystemUsing";
import { ScreenConfigV4, createEmptyScreen, createEmptyField, createEmptyDetail } from "../types/ScreenConfig";

interface ExistingScreen {
  name: string;
  type: "Grid" | "MasterDetail";
  table: string;
  description: string;
  path: string;
}

const KNOWN_SCREENS: ExistingScreen[] = [
  { name: "CashTypes", type: "Grid", table: "D_A_CashTypes", description: "أنواع الماليات", path: "CashTypes/CashTypes.ts" },
  { name: "FinancialType", type: "Grid", table: "D_A_FinancialType", description: "الأنواع المالية", path: "FinancialType/FinancialType.ts" },
  { name: "TestPage", type: "Grid", table: "TestPage", description: "صفحة تجربة", path: "TestPage/TestPage.ts" },
  { name: "Employees", type: "Grid", table: "G_D_Employees", description: "الموظفين", path: "Employees/Employees.ts" },
  { name: "FinTrans_Expenses", type: "Grid", table: "D_A_FinTrans_Expenses", description: "مصروفات مالية", path: "FinTrans_Expenses/FinTrans_Expenses.ts" },
  { name: "SalesInvoice", type: "MasterDetail", table: "I_TR_Sales", description: "فاتورة المبيعات", path: "SalesInvoice/SalesInvoice.ts" },
];

const TEMPLATES: { name: string; nameAr: string; type: "Grid" | "MasterDetail"; icon: string; description: string; descAr: string; config: () => ScreenConfigV4 }[] = [
  {
    name: "Simple Grid",
    nameAr: "جدول بسيط",
    type: "Grid",
    icon: "fa-table-list",
    description: "Like CashTypes — table with CRUD + ProcessTrans",
    descAr: "زي CashTypes — جدول مع إضافة وتعديل وحذف",
    config: () => {
      const cfg = createEmptyScreen("Grid");
      cfg.module = "MyScreen";
      cfg.table = "MyTable";
      cfg.view = "MyTable";
      cfg.keyColumn = "ID";
      cfg.titleAr = "شاشتي";
      cfg.titleEn = "My Screen";
      cfg.processTrans = true;
      cfg.trType = "MyType";
      cfg.fields = [
        { ...createEmptyField("ID"), titleAr: "الرقم", titleEn: "ID", inputType: "number", inForm: false, auto: "", width: 80, order: 1, required: false, search: true, inFilter: false, inGrid: true, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", defaultValue: "" },
        { ...createEmptyField("Description"), titleAr: "الوصف", titleEn: "Description", inputType: "text", width: 200, order: 2, required: true, inGrid: true, inForm: true, search: true, inFilter: true, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("IsActive"), titleAr: "فعال", titleEn: "Active", inputType: "checkbox", width: 80, order: 3, required: false, inGrid: true, inForm: true, search: false, inFilter: true, defaultValue: "true", options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "" },
      ];
      return cfg;
    },
  },
  {
    name: "Grid with Dates & Auto",
    nameAr: "جدول مع تواريخ وقيم تلقائية",
    type: "Grid",
    icon: "fa-calendar-check",
    description: "Grid with GetDateNow(), UserName, CompCode auto values",
    descAr: "جدول فيه تاريخ تلقائي واسم المستخدم وكود الشركة",
    config: () => {
      const cfg = createEmptyScreen("Grid");
      cfg.module = "MyDatedScreen";
      cfg.table = "MyTable";
      cfg.view = "IQ_MyTable";
      cfg.keyColumn = "ID";
      cfg.titleAr = "شاشة بتواريخ";
      cfg.titleEn = "Screen with Dates";
      cfg.fields = [
        { ...createEmptyField("ID"), titleAr: "الرقم", titleEn: "ID", inputType: "number", inForm: false, width: 80, order: 1, required: false, inGrid: true, search: true, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("DocDate"), titleAr: "التاريخ", titleEn: "Date", inputType: "date", width: 120, order: 2, required: true, defaultValue: "GetDateNow()", inGrid: true, inForm: true, search: false, inFilter: true, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "" },
        { ...createEmptyField("Notes"), titleAr: "ملاحظات", titleEn: "Notes", inputType: "textarea", width: 250, order: 3, required: false, inGrid: true, inForm: true, search: true, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("CreatedBy"), titleAr: "أنشئ بواسطة", titleEn: "Created By", inputType: "text", width: 120, order: 4, defaultValue: "UserName", visibleInCreate: false, visibleInEdit: false, inGrid: true, inForm: true, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "" },
        { ...createEmptyField("CompCode"), titleAr: "الشركة", titleEn: "Company", inputType: "number", width: 80, order: 5, auto: "CompCode", inGrid: false, inForm: false, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", defaultValue: "" },
        { ...createEmptyField("BranchCode"), titleAr: "الفرع", titleEn: "Branch", inputType: "number", width: 80, order: 6, auto: "BranchCode", inGrid: false, inForm: false, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", defaultValue: "" },
      ];
      return cfg;
    },
  },
  {
    name: "Master-Detail Invoice",
    nameAr: "فاتورة ماستر ديتيل",
    type: "MasterDetail",
    icon: "fa-file-invoice",
    description: "Like SalesInvoice — master header + detail lines",
    descAr: "زي فاتورة المبيعات — رأس + تفاصيل",
    config: () => {
      const cfg = createEmptyScreen("MasterDetail");
      cfg.module = "MyInvoice";
      cfg.table = "I_TR_MyInvoice";
      cfg.view = "IQ_TR_MyInvoice";
      cfg.keyColumn = "ID";
      cfg.titleAr = "فاتورة";
      cfg.titleEn = "Invoice";
      cfg.processTrans = true;
      cfg.trType = "MyInvoice";
      cfg.fields = [
        { ...createEmptyField("ID"), titleAr: "الرقم", titleEn: "ID", inputType: "number", inForm: false, width: 80, order: 1, required: false, inGrid: true, search: true, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("DocDate"), titleAr: "التاريخ", titleEn: "Date", inputType: "date", width: 120, order: 2, required: true, defaultValue: "GetDateNow()", inGrid: true, inForm: true, search: false, inFilter: true, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "" },
        { ...createEmptyField("CustomerName"), titleAr: "العميل", titleEn: "Customer", inputType: "search", width: 200, order: 3, required: true, searchFn: "SearchCustomer", inGrid: true, inForm: true, search: true, inFilter: true, options: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("TotalAmount"), titleAr: "الإجمالي", titleEn: "Total", inputType: "number", width: 120, order: 4, inGrid: true, inForm: true, visibleInCreate: false, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "0" },
      ];
      cfg.listFields = [
        { ...createEmptyField("ID"), titleAr: "رقم", titleEn: "ID", inputType: "number", width: 80, order: 1, inGrid: true, inForm: false, required: false, search: true, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("DocDate"), titleAr: "التاريخ", titleEn: "Date", inputType: "date", width: 120, order: 2, inGrid: true, inForm: false, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("CustomerName"), titleAr: "العميل", titleEn: "Customer", inputType: "text", width: 200, order: 3, inGrid: true, inForm: false, required: false, search: true, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("TotalAmount"), titleAr: "الإجمالي", titleEn: "Total", inputType: "number", width: 120, order: 4, inGrid: true, inForm: false, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
      ];
      const detail = createEmptyDetail();
      detail.titleAr = "بنود الفاتورة";
      detail.titleEn = "Invoice Lines";
      detail.table = "I_TR_MyInvoiceDetails";
      detail.view = "IQ_TR_MyInvoiceDetails";
      detail.keyColumn = "DetailID";
      detail.foreignKey = "InvoiceID";
      detail.totals = "TotalAmount:Amount:sum";
      detail.fields = [
        { ...createEmptyField("DetailID"), titleAr: "م", titleEn: "#", inputType: "number", inForm: false, width: 50, order: 1, inGrid: true, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("ItemName"), titleAr: "الصنف", titleEn: "Item", inputType: "search", width: 200, order: 2, required: true, searchFn: "SearchItem", inGrid: true, inForm: true, search: true, inFilter: false, options: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "" },
        { ...createEmptyField("Qty"), titleAr: "الكمية", titleEn: "Qty", inputType: "number", width: 80, order: 3, required: true, defaultValue: "1", inGrid: true, inForm: true, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "" },
        { ...createEmptyField("Price"), titleAr: "السعر", titleEn: "Price", inputType: "number", width: 100, order: 4, required: true, inGrid: true, inForm: true, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", formula: "", auto: "", defaultValue: "0" },
        { ...createEmptyField("Amount"), titleAr: "المبلغ", titleEn: "Amount", inputType: "number", width: 100, order: 5, formula: "Qty * Price", inGrid: true, inForm: true, required: false, search: false, inFilter: false, options: "", searchFn: "", searchCond: "", fillFrom: "", auto: "", defaultValue: "0" },
      ];
      cfg.details = [detail];
      return cfg;
    },
  },
];

interface WelcomeScreenProps {
  onNewScreen: (type: "Grid" | "MasterDetail") => void;
  onLoadTemplate: (config: ScreenConfigV4) => void;
  onImportFile: () => void;
}

export default function WelcomeScreen({ onNewScreen, onLoadTemplate, onImportFile }: WelcomeScreenProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const cardBase = `rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg`;
  const cardNew = (color: string) =>
    `${cardBase} ${isDark ? `border-${color}-700/50 hover:border-${color}-500 bg-${color}-950/20` : `border-${color}-200 hover:border-${color}-400 bg-${color}-50/50`}`;

  return (
    <div className={`flex-1 overflow-auto ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto py-12 px-6">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <i className="fa-solid fa-wand-magic-sparkles text-white text-2xl" />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("Screen Builder", "مُنشئ الشاشات")}
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            {t(
              "Create new screens or edit existing ones — pick a template or start fresh",
              "أنشئ شاشات جديدة أو عدّل الموجودة — اختار قالب أو ابدأ من الصفر"
            )}
          </p>
        </div>

        {/* New Screen Cards */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className={`${cardBase} ${isDark ? "border-blue-700/50 hover:border-blue-500 bg-blue-950/20" : "border-blue-200 hover:border-blue-400 bg-blue-50/50"}`}
            onClick={() => onNewScreen("Grid")}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <i className="fa-solid fa-table-list" />
              </div>
              <div>
                <h3 className={`font-bold ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                  {t("New Grid Screen", "شاشة جريد جديدة")}
                </h3>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {t("Simple table — like CashTypes", "جدول بسيط — زي أنواع الماليات")}
                </p>
              </div>
            </div>
            <div className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              {t("Add, edit, delete rows in a data table", "إضافة وتعديل وحذف صفوف في جدول")}
            </div>
          </div>

          <div className={`${cardBase} ${isDark ? "border-indigo-700/50 hover:border-indigo-500 bg-indigo-950/20" : "border-indigo-200 hover:border-indigo-400 bg-indigo-50/50"}`}
            onClick={() => onNewScreen("MasterDetail")}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <i className="fa-solid fa-layer-group" />
              </div>
              <div>
                <h3 className={`font-bold ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>
                  {t("New Master-Detail", "ماستر ديتيل جديد")}
                </h3>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {t("Header + detail lines — like Invoice", "رأس + تفاصيل — زي الفاتورة")}
                </p>
              </div>
            </div>
            <div className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              {t("Master record with up to 5 detail tables", "سجل رئيسي مع لحد 5 جداول تفاصيل")}
            </div>
          </div>
        </div>

        {/* Import */}
        <div className="flex justify-center mb-10">
          <button onClick={onImportFile}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700" : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
            }`}>
            <i className="fa-solid fa-file-import" />
            {t("Import existing screen from .ts file", "استيراد شاشة موجودة من ملف .ts")}
          </button>
        </div>

        {/* Templates */}
        <div className="mb-10">
          <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            <i className="fa-solid fa-shapes mr-2 text-sm opacity-50" />
            {t("Templates & Examples", "قوالب وأمثلة")}
          </h2>
          <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {t(
              "Start from a template — all values are editable after creation",
              "ابدأ من قالب — كل القيم بتتعدل بعد الإنشاء"
            )}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((tmpl, i) => (
              <div key={i}
                className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                  isDark ? "bg-gray-900/80 border-gray-700/50 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => onLoadTemplate(tmpl.config())}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fa-solid ${tmpl.icon} ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  <span className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    {lang === "ar" ? tmpl.nameAr : tmpl.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    tmpl.type === "Grid"
                      ? isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                      : isDark ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                  }`}>
                    {tmpl.type}
                  </span>
                </div>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {lang === "ar" ? tmpl.descAr : tmpl.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Screens */}
        <div>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            <i className="fa-solid fa-folder-open mr-2 text-sm opacity-50" />
            {t("Existing Screens in Project", "الشاشات الموجودة في المشروع")}
          </h2>
          <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {t(
              "Click 'Import' above to load and edit any screen's .ts file",
              "اضغط 'استيراد' فوق عشان تحمل وتعدل ملف .ts لأي شاشة"
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {KNOWN_SCREENS.map((screen, i) => (
              <div key={i}
                className={`rounded-lg border p-3 flex items-center gap-3 ${
                  isDark ? "bg-gray-900/60 border-gray-800" : "bg-white border-gray-100"
                }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  screen.type === "Grid"
                    ? isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                    : isDark ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                }`}>
                  <i className={`fa-solid ${screen.type === "Grid" ? "fa-table-list" : "fa-layer-group"} text-xs`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>{screen.name}</div>
                  <div className={`text-[10px] truncate ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                    {screen.table} — {screen.description}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                  {screen.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
