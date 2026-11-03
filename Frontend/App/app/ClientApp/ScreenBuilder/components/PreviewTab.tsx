"use client";

import React, { useMemo, useState } from "react";
import { useSys } from "../../Shared/SystemUsing";
import { useScreenBuilder } from "../store/useScreenBuilder";
import { generateHookFile, generatePageFile, generateSqlScript, generateResourcesEntries, generateRoutesEntry } from "../utils/codeGenerator";
import { SqlConnection, executeSql } from "../utils/sqlApi";

interface PreviewTabProps {
  connection: SqlConnection;
  database: string;
}

const SUB_TABS = [
  { key: "ts", labelEn: "Module.ts", labelAr: "Module.ts", icon: "fa-file-code" },
  { key: "tsx", labelEn: "page.tsx", labelAr: "page.tsx", icon: "fa-file-lines" },
  { key: "resources", labelEn: "Resources", labelAr: "الموارد", icon: "fa-language" },
  { key: "routes", labelEn: "Routes", labelAr: "المسارات", icon: "fa-route" },
  { key: "sql", labelEn: "SQL Script", labelAr: "سكريبت SQL", icon: "fa-database" },
];

export default function PreviewTab({ connection, database }: PreviewTabProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { config } = useScreenBuilder();
  const [activeTab, setActiveTab] = useState("ts");
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const tsCode = useMemo(() => generateHookFile(config), [config]);
  const tsxCode = useMemo(() => generatePageFile(config), [config]);
  const sqlCode = useMemo(() => generateSqlScript(config, database || "ESSA_React"), [config, database]);
  const resEntries = useMemo(() => generateResourcesEntries(config), [config]);
  const routesEntry = useMemo(() => generateRoutesEntry(config.module || "NewScreen"), [config.module]);

  const getCode = () => {
    switch (activeTab) {
      case "ts": return tsCode;
      case "tsx": return tsxCode;
      case "resources": return `// English section:\n${resEntries.en}\n\n// Arabic section:\n${resEntries.ar}`;
      case "routes": return `// Add to Routes.tsx:\n${routesEntry}`;
      case "sql": return sqlCode;
      default: return "";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    const name = config.module || "NewScreen";
    handleDownload(`${name}.ts`, tsCode);
    handleDownload("page.tsx", tsxCode);
    handleDownload(`Add_${name}_Module.sql`, sqlCode);
  };

  const handleExecuteSql = async () => {
    if (!confirm(t("Execute SQL permissions script on database?", "تنفيذ سكريبت الصلاحيات على قاعدة البيانات؟"))) return;
    setExecuting(true);
    setExecResult(null);
    const res = await executeSql(connection, sqlCode);
    setExecuting(false);
    setExecResult({
      ok: res.success,
      msg: res.success ? (res.messages?.join("\n") || t("Executed successfully", "تم التنفيذ بنجاح")) : (res.error || t("Execution failed", "فشل التنفيذ")),
    });
  };

  const codeBg = isDark ? "bg-gray-950 text-gray-300" : "bg-gray-50 text-gray-800";
  const tabBg = isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200";

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs + Actions */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : isDark ? "text-gray-400 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={`fa-solid ${tab.icon} mr-1`} />
            {lang === "ar" ? tab.labelAr : tab.labelEn}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={handleCopy} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} mr-1`} />
          {copied ? t("Copied!", "تم النسخ!") : t("Copy", "نسخ")}
        </button>
        <button onClick={handleDownloadAll} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          <i className="fa-solid fa-download mr-1" />{t("Download All", "تحميل الكل")}
        </button>
        {activeTab === "sql" && (
          <button onClick={handleExecuteSql} disabled={executing || !connection.database} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 transition disabled:opacity-50">
            {executing ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-play mr-1" />}
            {t("Execute SQL", "تنفيذ SQL")}
          </button>
        )}
      </div>

      {/* Execution result */}
      {execResult && (
        <div className={`mx-3 mt-2 px-3 py-2 rounded-lg text-xs ${execResult.ok ? "bg-green-900/30 text-green-300 border border-green-800" : "bg-red-900/30 text-red-300 border border-red-800"}`}>
          <i className={`fa-solid ${execResult.ok ? "fa-check-circle" : "fa-exclamation-circle"} mr-1`} />
          {execResult.msg}
        </div>
      )}

      {/* Code preview */}
      <div className="flex-1 overflow-auto p-3">
        <pre className={`p-4 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto ${codeBg} border ${isDark ? "border-gray-800" : "border-gray-200"}`}>
          {getCode()}
        </pre>
      </div>
    </div>
  );
}
