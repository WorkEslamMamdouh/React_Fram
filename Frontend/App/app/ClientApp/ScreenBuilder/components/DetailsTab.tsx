"use client";

import React, { useState } from "react";
import { useSys } from "../../Shared/SystemUsing";
import { useScreenBuilder } from "../store/useScreenBuilder";
import { SqlConnection, SqlColumn, loadColumns } from "../utils/sqlApi";
import FieldsTab from "./FieldsTab";

interface DetailsTabProps {
  connection: SqlConnection;
  tables: { name: string; type: string }[];
  searchFunctions: string[];
  columnMeta: Map<string, { sqlType: string; isPK: boolean; isComputed: boolean; isIdentity: boolean; notInDb: boolean }>;
  onDetailColumnsLoaded: (detailIdx: number, columns: SqlColumn[]) => void;
}

export default function DetailsTab({ connection, tables, searchFunctions, columnMeta, onDetailColumnsLoaded }: DetailsTabProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { config, addDetail, updateDetail, removeDetail } = useScreenBuilder();
  const [activeDetail, setActiveDetail] = useState(0);
  const [loading, setLoading] = useState(false);

  const detail = config.details[activeDetail];

  const inputCls = isDark
    ? "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 text-sm focus:border-blue-500 focus:outline-none"
    : "w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-800 text-sm focus:border-blue-500 focus:outline-none";
  const labelCls = `text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`;
  const btnPrimary = "px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition disabled:opacity-50";

  const handleLoadDetailColumns = async () => {
    if (!detail?.table) return;
    setLoading(true);
    const res = await loadColumns(connection, detail.table, detail.view || undefined);
    setLoading(false);
    if (res.success && res.columns) {
      onDetailColumnsLoaded(activeDetail, res.columns);
    }
  };

  if (config.screenType === "Grid") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`text-center ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          <i className="fa-solid fa-layer-group text-4xl mb-3 block opacity-30" />
          <p className="text-sm">{t("Switch to MasterDetail to configure details", "حول لماستر ديتيل عشان تعدل التفاصيل")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: Detail list */}
      <div className={`w-56 border-r flex flex-col ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <div className={`p-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {t("Details", "التفاصيل")} ({config.details.length}/5)
            </span>
            <button
              onClick={addDetail}
              disabled={config.details.length >= 5}
              className={`text-xs px-2 py-1 rounded ${isDark ? "bg-gray-800 text-blue-400 hover:bg-gray-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"} disabled:opacity-40`}
            >
              <i className="fa-solid fa-plus mr-1" />{t("Add", "إضافة")}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {config.details.map((d, i) => (
            <div
              key={i}
              className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 border-b transition ${
                activeDetail === i
                  ? isDark ? "bg-blue-900/30 border-blue-800" : "bg-blue-50 border-blue-200"
                  : isDark ? "border-gray-800 hover:bg-gray-800" : "border-gray-100 hover:bg-gray-50"
              }`}
              onClick={() => setActiveDetail(i)}
            >
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                activeDetail === i ? "bg-blue-600 text-white" : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  {d.titleEn || d.titleAr || t(`Detail ${i + 1}`, `تفصيل ${i + 1}`)}
                </div>
                <div className={`text-[10px] truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {d.table || t("No table", "بدون جدول")}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeDetail(i); if (activeDetail >= config.details.length - 1) setActiveDetail(Math.max(0, config.details.length - 2)); }}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          ))}
          {config.details.length === 0 && (
            <div className={`p-4 text-center text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              {t("No details yet", "مفيش تفاصيل لسه")}
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail settings */}
      <div className="flex-1 overflow-y-auto">
        {detail ? (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("Title Arabic", "العنوان عربي")}</label>
                <input className={inputCls} value={detail.titleAr} onChange={(e) => updateDetail(activeDetail, { titleAr: e.target.value })} dir="rtl" />
              </div>
              <div>
                <label className={labelCls}>{t("Title English", "العنوان انجليزي")}</label>
                <input className={inputCls} value={detail.titleEn} onChange={(e) => updateDetail(activeDetail, { titleEn: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><i className="fa-solid fa-table mr-1" />{t("Table", "الجدول")}</label>
                <select className={inputCls} value={detail.table} onChange={(e) => updateDetail(activeDetail, { table: e.target.value })}>
                  <option value="">--</option>
                  {tables.filter((t) => t.type === "U").map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}><i className="fa-solid fa-eye mr-1" />{t("View", "العرض")}</label>
                <select className={inputCls} value={detail.view} onChange={(e) => updateDetail(activeDetail, { view: e.target.value })}>
                  <option value="">{t("-- Same --", "-- نفسه --")}</option>
                  {tables.filter((t) => t.type === "V").map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("Key Column", "عمود المفتاح")}</label>
                <input className={inputCls} value={detail.keyColumn} onChange={(e) => updateDetail(activeDetail, { keyColumn: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t("Foreign Key", "المفتاح الأجنبي")}</label>
                <input className={inputCls} value={detail.foreignKey} onChange={(e) => updateDetail(activeDetail, { foreignKey: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("Totals", "المجاميع")} <span className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>MasterCol=DetailCol;...</span></label>
                <input className={inputCls} value={detail.totals} onChange={(e) => updateDetail(activeDetail, { totals: e.target.value })} placeholder="TotalAmount=NetAmount;ItemCount=count" />
              </div>
              <div>
                <label className={labelCls}>{t("Order By", "ترتيب")}</label>
                <input className={inputCls} value={detail.orderBy} onChange={(e) => updateDetail(activeDetail, { orderBy: e.target.value })} />
              </div>
            </div>

            <button className={btnPrimary} onClick={handleLoadDetailColumns} disabled={!detail.table || loading}>
              {loading ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-columns mr-1" />}
              {t("Load Detail Columns", "تحميل أعمدة التفصيل")}
            </button>

            {detail.fields.length > 0 && (
              <div className={`border-t pt-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <h4 className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  {t("Detail Fields", "حقول التفصيل")} ({detail.fields.length})
                </h4>
                <FieldsTab target="fields" detailIdx={activeDetail} searchFunctions={searchFunctions} columnMeta={columnMeta} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className={`text-center ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              <i className="fa-solid fa-arrow-left text-2xl mb-2 block opacity-30" />
              <p className="text-sm">{t("Select or add a detail", "اختار أو ضيف تفصيل")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
