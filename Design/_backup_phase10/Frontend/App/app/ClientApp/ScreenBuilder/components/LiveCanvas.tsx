"use client";

import React from "react";
import { useScreenBuilder, PreviewMode } from "../store/useScreenBuilder";
import { useSys } from "../../Shared/SystemUsing";
import { FieldConfigV4 } from "../types/ScreenConfig";

export default function LiveCanvas() {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const { config, previewMode, selectElement, selectedElement } = useScreenBuilder();

  const bg = isDark ? "bg-gray-950/60" : "bg-gray-100/80";
  const card = isDark ? "bg-gray-900/80 border-gray-700/50 text-gray-100" : "bg-white/95 border-gray-200 text-gray-800";

  const isGrid = config.screenType === "Grid";
  const fields = isGrid ? config.fields : config.fields;
  const visibleFields = filterByMode(fields, previewMode);

  return (
    <div className={`flex-1 overflow-auto p-4 ${bg}`}>
      {/* Header Preview */}
      <div className={`rounded-2xl border shadow-lg p-4 mb-4 flex items-center gap-3 ${card}`}>
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow">
          <i className={`fa-solid ${config.icon || "fa-table-list"}`} />
        </div>
        <div>
          <h2 className="font-bold text-sm">{lang === "ar" ? config.titleAr : config.titleEn || t("Screen Title", "عنوان الشاشة")}</h2>
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {lang === "ar" ? config.subAr : config.subEn || config.table || t("Subtitle", "وصف")}
          </p>
        </div>
        <div className="flex-1" />
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
          {previewMode}
        </span>
      </div>

      {/* Grid Preview */}
      {previewMode === "grid" && (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={isDark ? "bg-gray-800/80" : "bg-gray-50"}>
                {fields.filter(f => f.inGrid).map((f, i) => (
                  <th key={i}
                    className={`px-3 py-2 text-left text-xs font-semibold border-b cursor-pointer transition-all ${
                      isFieldSelected(selectedElement, "field", i) ? "bg-blue-600/20 text-blue-400" : ""
                    } ${isDark ? "border-gray-700" : "border-gray-200"}`}
                    style={{ width: f.width || 150 }}
                    onClick={() => selectElement({ type: "field", index: config.fields.indexOf(f) })}>
                    {lang === "ar" ? f.titleAr : f.titleEn || f.field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(row => (
                <tr key={row} className={`${isDark ? "hover:bg-gray-800/40" : "hover:bg-gray-50"} transition-all`}>
                  {fields.filter(f => f.inGrid).map((f, i) => (
                    <td key={i} className={`px-3 py-2 border-b text-xs ${isDark ? "border-gray-800 text-gray-400" : "border-gray-100 text-gray-500"}`}
                      style={{ textAlign: f.align || "left" }}>
                      {sampleValue(f, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Preview */}
      {previewMode !== "grid" && (
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className="grid grid-cols-2 gap-3">
            {visibleFields.map((f, i) => {
              const realIdx = config.fields.indexOf(f);
              const selected = isFieldSelected(selectedElement, "field", realIdx);
              return (
                <div key={i}
                  className={`rounded-xl p-2 cursor-pointer transition-all ${
                    selected ? "ring-2 ring-blue-500 bg-blue-500/5" : "hover:bg-gray-500/5"
                  }`}
                  onClick={() => selectElement({ type: "field", index: realIdx })}>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {lang === "ar" ? f.titleAr : f.titleEn || f.field}
                    {f.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  {renderFormInput(f, isDark, previewMode === "view")}
                </div>
              );
            })}
          </div>

          {/* Detail tabs preview */}
          {config.screenType === "MasterDetail" && config.details.length > 0 && (
            <div className="mt-4">
              <div className={`flex gap-1 border-b ${isDark ? "border-gray-700" : "border-gray-200"} mb-3`}>
                {config.details.map((d, di) => (
                  <button key={di}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-lg ${
                      di === 0
                        ? "bg-blue-600 text-white"
                        : isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                    onClick={() => selectElement({ type: "detail", index: di })}>
                    {lang === "ar" ? d.titleAr : d.titleEn || `Detail ${di + 1}`}
                  </button>
                ))}
              </div>
              {config.details[0] && (
                <div className={`rounded-xl border overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={isDark ? "bg-gray-800/60" : "bg-gray-50"}>
                        {config.details[0].fields.map((df, dfi) => (
                          <th key={dfi} className={`px-2 py-1.5 text-left font-semibold border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                            {lang === "ar" ? df.titleAr : df.titleEn || df.field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {config.details[0].fields.map((df, dfi) => (
                          <td key={dfi} className={`px-2 py-1.5 border-b ${isDark ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                            {sampleValue(df, 1)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function filterByMode(fields: FieldConfigV4[], mode: PreviewMode): FieldConfigV4[] {
  if (mode === "grid") return fields.filter(f => f.inGrid);
  return fields.filter(f => {
    if (!f.inForm) return false;
    if (mode === "create" && f.visibleInCreate === false) return false;
    if (mode === "edit" && f.visibleInEdit === false) return false;
    if (mode === "view" && f.visibleInView === false) return false;
    return true;
  });
}

function isFieldSelected(sel: any, type: string, index: number): boolean {
  return sel?.type === type && sel?.index === index;
}

function renderFormInput(f: FieldConfigV4, isDark: boolean, readOnly: boolean): React.ReactNode {
  const base = `w-full rounded-lg px-2.5 py-1.5 text-xs border transition-all ${
    isDark ? "bg-gray-800/60 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-600"
  } ${readOnly ? "opacity-60" : ""}`;

  switch (f.inputType) {
    case "checkbox":
      return <input type="checkbox" disabled className="w-4 h-4 rounded" />;
    case "textarea":
      return <textarea className={base} rows={2} readOnly placeholder={f.field} />;
    case "select":
      return (
        <select className={base} disabled={readOnly}>
          <option>— {f.field} —</option>
        </select>
      );
    case "date":
      return <input type="date" className={base} readOnly />;
    case "number":
      return <input type="number" className={base} readOnly placeholder="0" />;
    default:
      return <input type="text" className={base} readOnly placeholder={f.field} />;
  }
}

function sampleValue(f: FieldConfigV4, row: number): string {
  switch (f.inputType) {
    case "number": return String(row * 100);
    case "date": return "2026-01-0" + row;
    case "checkbox": return row % 2 === 0 ? "✓" : "✗";
    default: return `${f.field}_${row}`;
  }
}
