"use client";

import React from "react";
import { useScreenBuilder, PreviewMode } from "../store/useScreenBuilder";
import { useSys } from "../../Shared/SystemUsing";

interface ToolbarProps {
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onNewScreen: (type: "Grid" | "MasterDetail") => void;
  onGoBack: () => void;
}

export default function Toolbar({ onSave, onExport, onImport, onNewScreen, onGoBack }: ToolbarProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const { config, isDirty, undo, redo, canUndo, canRedo, previewMode, setPreviewMode } = useScreenBuilder();

  const bg = isDark ? "bg-gray-900/90 border-gray-700/50" : "bg-white/95 border-gray-200";
  const btn = isDark
    ? "px-3 py-1.5 rounded-xl text-sm font-medium transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
    : "px-3 py-1.5 rounded-xl text-sm font-medium transition-all bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200";
  const btnPrimary = "px-3 py-1.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-sm";
  const btnDisabled = "opacity-40 cursor-not-allowed";

  const modes: { key: PreviewMode; label: string }[] = [
    { key: "grid", label: t("Grid", "جدول") },
    { key: "create", label: t("Create", "إضافة") },
    { key: "edit", label: t("Edit", "تعديل") },
    { key: "view", label: t("View", "عرض") },
  ];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border-b ${bg}`}>
      {/* Back to Welcome */}
      <button className={btn} onClick={onGoBack} title={t("Back to main screen", "رجوع للشاشة الرئيسية")}>
        <i className="fa-solid fa-home mr-1" />{t("Home", "الرئيسية")}
      </button>

      <div className={`w-px h-6 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />

      {/* New Screen */}
      <div className="flex gap-1">
        <button className={btn} onClick={() => onNewScreen("Grid")} title={t("New Grid Screen", "شاشة جريد جديدة")}>
          <i className="fa-solid fa-table-list mr-1" />{t("Grid", "جريد")}
        </button>
        <button className={btn} onClick={() => onNewScreen("MasterDetail")} title={t("New Master-Detail", "شاشة ماستر ديتيل جديدة")}>
          <i className="fa-solid fa-layer-group mr-1" />{t("M/D", "م/ت")}
        </button>
      </div>

      <div className={`w-px h-6 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />

      {/* Undo / Redo */}
      <button className={`${btn} ${!canUndo() ? btnDisabled : ""}`} onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">
        <i className="fa-solid fa-rotate-left" />
      </button>
      <button className={`${btn} ${!canRedo() ? btnDisabled : ""}`} onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y)">
        <i className="fa-solid fa-rotate-right" />
      </button>

      <div className={`w-px h-6 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />

      {/* Preview Mode */}
      <div className={`flex rounded-xl overflow-hidden border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        {modes.map(m => (
          <button key={m.key}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              previewMode === m.key
                ? "bg-blue-600 text-white"
                : isDark ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setPreviewMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Screen info */}
      <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {config.module || t("Untitled", "بدون اسم")} — {config.screenType}
        {isDirty && <span className="text-amber-500 ml-1">*</span>}
      </span>

      <div className={`w-px h-6 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />

      {/* Import / Export / Save */}
      <button className={btn} onClick={onImport} title={t("Import from .ts", "استيراد من ملف .ts")}>
        <i className="fa-solid fa-file-import mr-1" />{t("Import", "استيراد")}
      </button>
      <button className={btn} onClick={onExport} title={t("Export code", "تصدير الكود")}>
        <i className="fa-solid fa-file-export mr-1" />{t("Export", "تصدير")}
      </button>
      <button className={btnPrimary} onClick={onSave} title={t("Save screen", "حفظ الشاشة")}>
        <i className="fa-solid fa-floppy-disk mr-1" />{t("Save", "حفظ")}
      </button>
    </div>
  );
}
