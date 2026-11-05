"use client";

import React from "react";
import { useSys } from "../../Shared/SystemUsing";
import { useScreenBuilder } from "../store/useScreenBuilder";
import { VALIDATION_TYPES, createEmptyValidation } from "../types/ScreenConfig";

const VAL_OPERATORS = ["", "=", "!=", ">", ">=", "<", "<="];
const VAL_WHEN = ["both", "insert", "update"];

const EXAMPLE_VALIDATIONS = [
  { labelEn: "Required field", labelAr: "حقل مطلوب", val: { type: "required", messageAr: "هذا الحقل مطلوب", messageEn: "This field is required" } },
  { labelEn: "Min value", labelAr: "حد أدنى", val: { type: "range", min: "0", messageAr: "القيمة أقل من المسموح", messageEn: "Value is below minimum" } },
  { labelEn: "Max value", labelAr: "حد أقصى", val: { type: "range", max: "999999", messageAr: "القيمة أكبر من المسموح", messageEn: "Value exceeds maximum" } },
  { labelEn: "Unique value", labelAr: "قيمة فريدة", val: { type: "unique", messageAr: "هذه القيمة موجودة مسبقاً", messageEn: "This value already exists" } },
  { labelEn: "No duplicate rows", labelAr: "بدون تكرار", val: { type: "noDuplicate", messageAr: "يوجد صفوف مكررة", messageEn: "Duplicate rows found" } },
  { labelEn: "Min detail rows", labelAr: "حد أدنى للصفوف", val: { type: "minRows", min: "1", detail: 1, messageAr: "يجب إدخال صف واحد على الأقل", messageEn: "At least one row required" } },
  { labelEn: "Exists in table", labelAr: "موجود في جدول", val: { type: "exists", messageAr: "القيمة غير موجودة", messageEn: "Value not found in reference table" } },
];

interface ValidationsTabProps {
  allFields: { name: string; detail: number }[];
}

export default function ValidationsTab({ allFields }: ValidationsTabProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { config, addValidation, updateValidation, removeValidation } = useScreenBuilder();
  const validations = config.validations;

  const borderCls = isDark ? "border-gray-700" : "border-gray-200";
  const headerBg = isDark ? "bg-gray-800" : "bg-gray-100";
  const cellInput = isDark
    ? "px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
    : "px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-800 focus:border-blue-500 focus:outline-none";
  const cellSelect = `${cellInput} appearance-none`;

  const handleAddExample = (exIdx: number) => {
    const ex = EXAMPLE_VALIDATIONS[exIdx];
    if (!ex) return;
    addValidation();
    const newIdx = validations.length;
    setTimeout(() => updateValidation(newIdx, ex.val as any), 0);
  };

  const needsOperator = (type: string) => type === "compare";
  const needsRange = (type: string) => type === "range" || type === "minRows";
  const needsPattern = (type: string) => type === "regex";
  const needsTable = (type: string) => type === "exists" || type === "notExists";
  const needsCode = (type: string) => type === "custom";

  return (
    <div className="p-4">
      {/* Add from examples */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          <i className="fa-solid fa-lightbulb mr-1 text-yellow-400" />{t("Quick Add:", "إضافة سريعة:")}
        </span>
        {EXAMPLE_VALIDATIONS.map((ex, i) => (
          <button
            key={i}
            onClick={() => handleAddExample(i)}
            className={`text-[10px] px-2 py-1 rounded-lg transition ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}
          >
            {lang === "ar" ? ex.labelAr : ex.labelEn}
          </button>
        ))}
      </div>

      <div className={`rounded-xl border overflow-x-auto ${borderCls}`}>
        <table className="w-full text-xs">
          <thead>
            <tr className={headerBg}>
              {[t("Level","مستوى"), t("Type","نوع"), t("Field","حقل"), t("When","متى"),
                t("Operator","عامل"), t("Compare To","مقارنة بـ"), t("Value","قيمة"),
                t("Min","أدنى"), t("Max","أقصى"), t("Pattern","نمط"),
                t("Table","جدول"), t("Condition","شرط"), t("Code","كود"),
                t("Message AR","رسالة ع"), t("Message EN","رسالة E"), ""].map((h, i) => (
                <th key={i} className={`px-2 py-2 text-[10px] font-semibold whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-600"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validations.map((v, i) => (
              <tr key={i} className={`border-t ${borderCls} transition-colors hover:${isDark ? "bg-gray-800/40" : "bg-blue-50/30"}`}>
                <td className="px-2 py-1">
                  <select className={`${cellSelect} w-16`} value={v.detail} onChange={(e) => updateValidation(i, { detail: Number(e.target.value) })}>
                    <option value={0}>{t("Master","ماستر")}</option>
                    {config.details.map((_, di) => <option key={di} value={di + 1}>{t(`Detail ${di + 1}`, `تفصيل ${di + 1}`)}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select className={`${cellSelect} w-24`} value={v.type} onChange={(e) => updateValidation(i, { type: e.target.value })}>
                    {VALIDATION_TYPES.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select className={`${cellSelect} w-28`} value={v.field} onChange={(e) => updateValidation(i, { field: e.target.value })}>
                    <option value="">--</option>
                    {allFields.filter((f) => f.detail === v.detail).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select className={`${cellSelect} w-16`} value={v.when} onChange={(e) => updateValidation(i, { when: e.target.value as any })}>
                    {VAL_WHEN.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  {needsOperator(v.type) && (
                    <select className={`${cellSelect} w-14`} value={v.operator} onChange={(e) => updateValidation(i, { operator: e.target.value })}>
                      {VAL_OPERATORS.map((o) => <option key={o} value={o}>{o || "--"}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-2 py-1">
                  {needsOperator(v.type) && <input className={`${cellInput} w-24`} value={v.compareTo} onChange={(e) => updateValidation(i, { compareTo: e.target.value })} />}
                </td>
                <td className="px-2 py-1">
                  {needsOperator(v.type) && <input className={`${cellInput} w-20`} value={v.value} onChange={(e) => updateValidation(i, { value: e.target.value })} />}
                </td>
                <td className="px-2 py-1">
                  {needsRange(v.type) && <input className={`${cellInput} w-16`} value={v.min} onChange={(e) => updateValidation(i, { min: e.target.value })} />}
                </td>
                <td className="px-2 py-1">
                  {needsRange(v.type) && <input className={`${cellInput} w-16`} value={v.max} onChange={(e) => updateValidation(i, { max: e.target.value })} />}
                </td>
                <td className="px-2 py-1">
                  {needsPattern(v.type) && <input className={`${cellInput} w-24`} value={v.pattern} onChange={(e) => updateValidation(i, { pattern: e.target.value })} />}
                </td>
                <td className="px-2 py-1">
                  {needsTable(v.type) && <input className={`${cellInput} w-24`} value={v.table} onChange={(e) => updateValidation(i, { table: e.target.value })} />}
                </td>
                <td className="px-2 py-1">
                  {needsTable(v.type) && <input className={`${cellInput} w-28`} value={v.condition} onChange={(e) => updateValidation(i, { condition: e.target.value })} placeholder="{Field} = value" />}
                </td>
                <td className="px-2 py-1">
                  {needsCode(v.type) && <input className={`${cellInput} w-28`} value={v.code} onChange={(e) => updateValidation(i, { code: e.target.value })} />}
                </td>
                <td className="px-2 py-1"><input className={`${cellInput} w-32`} value={v.messageAr} onChange={(e) => updateValidation(i, { messageAr: e.target.value })} dir="rtl" /></td>
                <td className="px-2 py-1"><input className={`${cellInput} w-32`} value={v.messageEn} onChange={(e) => updateValidation(i, { messageEn: e.target.value })} /></td>
                <td className="px-2 py-1">
                  <button onClick={() => removeValidation(i)} className="text-red-400 hover:text-red-300"><i className="fa-solid fa-trash-can" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {validations.length === 0 && (
          <div className={`p-6 text-center text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
            <i className="fa-solid fa-check-double text-2xl mb-2 block opacity-30" />
            {t("No validation rules yet. Use quick-add above or add manually.", "مفيش قواعد تحقق لسه. استخدم الإضافة السريعة أو ضيف يدوي.")}
          </div>
        )}
      </div>

      <button
        onClick={addValidation}
        className={`mt-3 px-4 py-2 rounded-lg text-xs font-medium transition ${isDark ? "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200"}`}
      >
        <i className="fa-solid fa-plus mr-1" />{t("Add Rule", "إضافة قاعدة")}
      </button>
    </div>
  );
}
