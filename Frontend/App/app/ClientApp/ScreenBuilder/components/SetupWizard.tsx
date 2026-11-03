"use client";

import React, { useState } from "react";
import { useSys } from "../../Shared/SystemUsing";
import { ScreenConfigV4, createEmptyScreen, createEmptyField } from "../types/ScreenConfig";

interface SetupWizardProps {
  screenType: "Grid" | "MasterDetail";
  onComplete: (config: ScreenConfigV4) => void;
  onCancel: () => void;
}

export default function SetupWizard({ screenType, onComplete, onCancel }: SetupWizardProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const [module, setModule] = useState("");
  const [table, setTable] = useState("");
  const [view, setView] = useState("");
  const [keyColumn, setKeyColumn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [quickFields, setQuickFields] = useState("");
  const [processTrans, setProcessTrans] = useState(false);
  const [trType, setTrType] = useState("");

  const isValid = module.trim() && table.trim() && keyColumn.trim();

  const handleCreate = () => {
    const cfg = createEmptyScreen(screenType);
    cfg.module = module.trim();
    cfg.table = table.trim();
    cfg.view = view.trim() || table.trim();
    cfg.keyColumn = keyColumn.trim();
    cfg.titleAr = titleAr.trim() || module.trim();
    cfg.titleEn = titleEn.trim() || module.trim();
    cfg.processTrans = processTrans;
    cfg.trType = trType.trim();

    if (quickFields.trim()) {
      const names = quickFields.split(",").map(s => s.trim()).filter(Boolean);
      cfg.fields = names.map((name, i) => {
        const f = createEmptyField(name);
        f.order = i + 1;
        f.titleAr = name;
        f.titleEn = name;
        if (name.toLowerCase() === keyColumn.trim().toLowerCase()) {
          f.inForm = false;
          f.inputType = "number";
        }
        if (name.toLowerCase().includes("date")) {
          f.inputType = "date";
          f.defaultValue = "GetDateNow()";
        }
        if (name.toLowerCase().includes("amount") || name.toLowerCase().includes("price") || name.toLowerCase().includes("qty") || name.toLowerCase().includes("total")) {
          f.inputType = "number";
        }
        if (name.toLowerCase().includes("active") || name.toLowerCase().includes("is")) {
          f.inputType = "checkbox";
        }
        if (name.toLowerCase().includes("note") || name.toLowerCase().includes("desc")) {
          f.inputType = "textarea";
        }
        return f;
      });
    }

    onComplete(cfg);
  };

  const overlay = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm";
  const modal = `w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`;
  const labelCls = `block text-xs font-semibold mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`;
  const inputCls = `w-full rounded-lg px-3 py-2 text-sm border transition-all ${
    isDark ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500" : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`;
  const hintCls = `text-[10px] mt-0.5 ${isDark ? "text-gray-600" : "text-gray-400"}`;
  const sectionCls = `text-xs font-bold uppercase tracking-wide mb-3 mt-5 ${isDark ? "text-gray-500" : "text-gray-400"}`;

  return (
    <div className={overlay} onClick={onCancel}>
      <div className={modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
              screenType === "Grid" ? "bg-blue-600" : "bg-indigo-600"
            }`}>
              <i className={`fa-solid ${screenType === "Grid" ? "fa-table-list" : "fa-layer-group"}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {screenType === "Grid"
                  ? t("New Grid Screen", "شاشة جريد جديدة")
                  : t("New Master-Detail Screen", "شاشة ماستر ديتيل جديدة")}
              </h2>
              <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {t("Fill in the basics, then customize in the editor", "اكتب الأساسيات، وبعدين عدّل في المحرر")}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">

          {/* Module & Database */}
          <div className={sectionCls}>
            <i className="fa-solid fa-database mr-1" />
            {t("Module & Database", "الموديول وقاعدة البيانات")}
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>{t("Module Name (folder name)", "اسم الموديول (اسم الفولدر)")} <span className="text-red-400">*</span></label>
              <input className={inputCls} value={module} onChange={e => setModule(e.target.value)}
                placeholder={t("e.g. CashTypes, SalesInvoice", "مثلاً CashTypes, SalesInvoice")} />
              <p className={hintCls}>{t("English, no spaces — becomes the folder name and function name", "إنجليزي بدون مسافات — هيبقى اسم الفولدر والدالة")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("Table (saves to)", "الجدول (بيتحفظ فيه)")} <span className="text-red-400">*</span></label>
                <input className={inputCls} value={table} onChange={e => setTable(e.target.value)}
                  placeholder="D_A_CashTypes" />
              </div>
              <div>
                <label className={labelCls}>{t("View (reads from)", "الـ View (بيقرا منه)")}</label>
                <input className={inputCls} value={view} onChange={e => setView(e.target.value)}
                  placeholder={t("Same as table if empty", "لو فاضي = نفس الجدول")} />
                <p className={hintCls}>{t("Leave empty to use the table name", "سيبه فاضي لو نفس الجدول")}</p>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("Key Column (primary key)", "عمود المفتاح")} <span className="text-red-400">*</span></label>
              <input className={inputCls} value={keyColumn} onChange={e => setKeyColumn(e.target.value)}
                placeholder="ID" />
            </div>
          </div>

          {/* Titles */}
          <div className={sectionCls}>
            <i className="fa-solid fa-heading mr-1" />
            {t("Titles", "العناوين")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("Title (English)", "العنوان (إنجليزي)")}</label>
              <input className={inputCls} value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Cash Types" />
            </div>
            <div>
              <label className={labelCls}>{t("Title (Arabic)", "العنوان (عربي)")}</label>
              <input className={inputCls} value={titleAr} onChange={e => setTitleAr(e.target.value)} placeholder="أنواع الماليات" dir="rtl" />
            </div>
          </div>

          {/* Processing */}
          <div className={sectionCls}>
            <i className="fa-solid fa-gears mr-1" />
            {t("Processing", "المعالجة")}
          </div>

          <div className="space-y-3">
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              <input type="checkbox" checked={processTrans} onChange={e => setProcessTrans(e.target.checked)}
                className="w-4 h-4 rounded border-gray-400 text-blue-600" />
              {t("Run G_ProcessTrans after save/delete", "تشغيل G_ProcessTrans بعد الحفظ والحذف")}
            </label>

            {processTrans && (
              <div>
                <label className={labelCls}>{t("TrType value", "قيمة TrType")}</label>
                <input className={inputCls} value={trType} onChange={e => setTrType(e.target.value)} placeholder="CashBox" />
              </div>
            )}
          </div>

          {/* Quick Fields */}
          <div className={sectionCls}>
            <i className="fa-solid fa-list-check mr-1" />
            {t("Quick Fields (optional)", "حقول سريعة (اختياري)")}
          </div>

          <div>
            <label className={labelCls}>{t("Column names, comma separated", "أسماء الأعمدة، مفصولة بفاصلة")}</label>
            <input className={inputCls} value={quickFields} onChange={e => setQuickFields(e.target.value)}
              placeholder={t("e.g. ID, Description, Amount, DocDate, IsActive", "مثلاً ID, Description, Amount, DocDate, IsActive")} />
            <p className={hintCls}>
              {t(
                "Auto-detects type: Date → date input, Amount/Price/Qty → number, Is*/Active → checkbox, Note/Desc → textarea",
                "بيكتشف النوع تلقائي: Date = تاريخ، Amount/Price/Qty = رقم، Is*/Active = صح/غلط، Note/Desc = نص كبير"
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end gap-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <button onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}>
            {t("Cancel", "إلغاء")}
          </button>
          <button onClick={handleCreate} disabled={!isValid}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all text-white shadow-sm ${
              isValid
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90"
                : "bg-gray-400 cursor-not-allowed"
            }`}>
            <i className="fa-solid fa-plus mr-1" />
            {t("Create & Open Editor", "إنشاء وفتح المحرر")}
          </button>
        </div>
      </div>
    </div>
  );
}
