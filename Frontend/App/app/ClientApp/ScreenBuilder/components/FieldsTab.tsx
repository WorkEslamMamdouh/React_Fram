"use client";

import React from "react";
import { useSys } from "../../Shared/SystemUsing";
import { useScreenBuilder } from "../store/useScreenBuilder";
import { INPUT_TYPES, AUTO_VALUES, createEmptyField } from "../types/ScreenConfig";

interface FieldsTabProps {
  target: "fields" | "listFields";
  detailIdx?: number;
  searchFunctions: string[];
  columnMeta?: Map<string, { sqlType: string; isPK: boolean; isComputed: boolean; isIdentity: boolean; notInDb: boolean }>;
}

export default function FieldsTab({ target, detailIdx, searchFunctions, columnMeta }: FieldsTabProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { config, updateField, removeField, reorderField, addField } = useScreenBuilder();

  const fields = detailIdx != null && detailIdx >= 0 && config.details[detailIdx]
    ? config.details[detailIdx].fields
    : target === "listFields" ? config.listFields : config.fields;

  const bg = isDark ? "bg-gray-900" : "bg-white";
  const headerBg = isDark ? "bg-gray-800" : "bg-gray-100";
  const borderCls = isDark ? "border-gray-700" : "border-gray-200";
  const cellInput = isDark
    ? "px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
    : "px-1.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-800 focus:border-blue-500 focus:outline-none";
  const cellSelect = `${cellInput} appearance-none`;
  const checkCls = "w-3.5 h-3.5 accent-blue-600 cursor-pointer";

  const getRowColor = (fieldName: string) => {
    const meta = columnMeta?.get(fieldName);
    if (!meta) return "";
    if (meta.isPK || meta.isIdentity) return isDark ? "bg-green-900/20" : "bg-green-50";
    if (meta.isComputed || meta.notInDb) return isDark ? "bg-yellow-900/20" : "bg-yellow-50";
    const f = fields.find((f) => f.field === fieldName);
    if (f?.auto) return isDark ? "bg-gray-800/50" : "bg-gray-50";
    if (f?.formula) return isDark ? "bg-purple-900/20" : "bg-purple-50";
    return "";
  };

  const handleBulk = (prop: "inGrid" | "inForm" | "search", value: boolean) => {
    fields.forEach((_, i) => updateField(i, { [prop]: value }, target, detailIdx));
  };

  return (
    <div className="p-3 overflow-x-auto">
      {/* Bulk actions */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("Bulk:", "جماعي:")}</span>
        {(["inGrid", "inForm", "search"] as const).map((prop) => (
          <div key={prop} className="flex gap-1">
            <button onClick={() => handleBulk(prop, true)} className={`text-[10px] px-2 py-0.5 rounded ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {prop === "inGrid" ? t("All Grid", "كل الجريد") : prop === "inForm" ? t("All Form", "كل الفورم") : t("All Search", "كل البحث")} ✓
            </button>
            <button onClick={() => handleBulk(prop, false)} className={`text-[10px] px-2 py-0.5 rounded ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              ✗
            </button>
          </div>
        ))}
        <div className="flex-1" />
        <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{fields.length} {t("fields", "حقول")}</span>
      </div>

      <div className={`rounded-xl border overflow-hidden ${borderCls}`}>
        <table className="w-full text-xs">
          <thead>
            <tr className={headerBg}>
              {["#", t("Field","حقل"), t("Type","نوع"), t("Title AR","عنوان ع"), t("Title EN","عنوان E"),
                t("Grid","جريد"), t("Form","فورم"), t("Req","مطلوب"), t("Search","بحث"), t("Filter","فلتر"),
                t("Input","إدخال"), t("Options","خيارات"), t("SearchFn","دالة بحث"), t("FillFrom","ملء من"),
                t("Formula","معادلة"), t("Auto","تلقائي"), t("Default","افتراضي"), t("W","عرض"), t("Ord","ترتيب"), ""].map((h, i) => (
                <th key={i} className={`px-1.5 py-2 text-[10px] font-semibold whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-600"} ${i === 0 ? "w-8" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={`${f.field}-${i}`} className={`border-t ${borderCls} ${getRowColor(f.field)} transition-colors hover:${isDark ? "bg-gray-800/40" : "bg-blue-50/30"}`}>
                <td className="px-1.5 py-1 text-center">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => i > 0 && reorderField(i, i - 1, target, detailIdx)} disabled={i === 0} className="text-[9px] text-gray-500 hover:text-blue-400 disabled:opacity-30">▲</button>
                    <span className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>{i + 1}</span>
                    <button onClick={() => i < fields.length - 1 && reorderField(i, i + 1, target, detailIdx)} disabled={i === fields.length - 1} className="text-[9px] text-gray-500 hover:text-blue-400 disabled:opacity-30">▼</button>
                  </div>
                </td>
                <td className="px-1.5 py-1">
                  <span className={`font-mono text-xs font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>{f.field}</span>
                </td>
                <td className="px-1.5 py-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                    {columnMeta?.get(f.field)?.sqlType || "?"}
                  </span>
                </td>
                <td className="px-1.5 py-1"><input className={`${cellInput} w-24`} value={f.titleAr} onChange={(e) => updateField(i, { titleAr: e.target.value }, target, detailIdx)} dir="rtl" /></td>
                <td className="px-1.5 py-1"><input className={`${cellInput} w-24`} value={f.titleEn} onChange={(e) => updateField(i, { titleEn: e.target.value }, target, detailIdx)} /></td>
                <td className="px-1 py-1 text-center"><input type="checkbox" className={checkCls} checked={f.inGrid} onChange={(e) => updateField(i, { inGrid: e.target.checked }, target, detailIdx)} /></td>
                <td className="px-1 py-1 text-center"><input type="checkbox" className={checkCls} checked={f.inForm} onChange={(e) => updateField(i, { inForm: e.target.checked }, target, detailIdx)} /></td>
                <td className="px-1 py-1 text-center"><input type="checkbox" className={checkCls} checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked }, target, detailIdx)} /></td>
                <td className="px-1 py-1 text-center"><input type="checkbox" className={checkCls} checked={f.search} onChange={(e) => updateField(i, { search: e.target.checked }, target, detailIdx)} /></td>
                <td className="px-1 py-1 text-center"><input type="checkbox" className={checkCls} checked={f.inFilter} onChange={(e) => updateField(i, { inFilter: e.target.checked }, target, detailIdx)} /></td>
                <td className="px-1.5 py-1">
                  <select className={`${cellSelect} w-20`} value={f.inputType} onChange={(e) => updateField(i, { inputType: e.target.value }, target, detailIdx)}>
                    {INPUT_TYPES.map((it) => <option key={it} value={it}>{it}</option>)}
                  </select>
                </td>
                <td className="px-1.5 py-1">
                  {f.inputType === "select" && <input className={`${cellInput} w-28`} value={f.options} onChange={(e) => updateField(i, { options: e.target.value }, target, detailIdx)} placeholder="0:No|1:Yes" />}
                </td>
                <td className="px-1.5 py-1">
                  {f.inputType === "search" && (
                    <select className={`${cellSelect} w-28`} value={f.searchFn} onChange={(e) => updateField(i, { searchFn: e.target.value }, target, detailIdx)}>
                      <option value="">--</option>
                      {searchFunctions.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-1.5 py-1">
                  {f.searchFn && <input className={`${cellInput} w-28`} value={f.fillFrom} onChange={(e) => updateField(i, { fillFrom: e.target.value }, target, detailIdx)} placeholder="Col=RetCol;..." />}
                </td>
                <td className="px-1.5 py-1"><input className={`${cellInput} w-24`} value={f.formula} onChange={(e) => updateField(i, { formula: e.target.value }, target, detailIdx)} placeholder="Qty*Price" /></td>
                <td className="px-1.5 py-1">
                  <select className={`${cellSelect} w-24`} value={f.auto} onChange={(e) => updateField(i, { auto: e.target.value }, target, detailIdx)}>
                    {AUTO_VALUES.map((a) => <option key={a} value={a}>{a || "--"}</option>)}
                  </select>
                </td>
                <td className="px-1.5 py-1"><input className={`${cellInput} w-20`} value={f.defaultValue} onChange={(e) => updateField(i, { defaultValue: e.target.value }, target, detailIdx)} placeholder="today" /></td>
                <td className="px-1.5 py-1"><input className={`${cellInput} w-14`} type="number" value={f.width} onChange={(e) => updateField(i, { width: Number(e.target.value) || 150 }, target, detailIdx)} /></td>
                <td className="px-1.5 py-1"><input className={`${cellInput} w-12`} type="number" value={f.order} onChange={(e) => updateField(i, { order: Number(e.target.value) || 99 }, target, detailIdx)} /></td>
                <td className="px-1 py-1">
                  <button onClick={() => removeField(i, target, detailIdx)} className="text-red-400 hover:text-red-300 text-xs" title={t("Remove","حذف")}>
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => addField(target, detailIdx)}
        className={`mt-3 px-4 py-2 rounded-lg text-xs font-medium transition ${isDark ? "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200"}`}
      >
        <i className="fa-solid fa-plus mr-1" />{t("Add Field", "إضافة حقل")}
      </button>

      {/* Color legend */}
      <div className={`mt-3 flex items-center gap-4 text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        <span><span className="inline-block w-3 h-3 rounded bg-green-500/30 mr-1" />{t("Primary Key","مفتاح أساسي")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-yellow-500/30 mr-1" />{t("Computed/View","محسوب/عرض")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-gray-500/30 mr-1" />{t("Auto Value","قيمة تلقائية")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-purple-500/30 mr-1" />{t("Formula","معادلة")}</span>
      </div>
    </div>
  );
}
