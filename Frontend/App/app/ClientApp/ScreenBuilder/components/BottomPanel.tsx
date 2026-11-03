"use client";

import React, { useState } from "react";
import { useScreenBuilder } from "../store/useScreenBuilder";
import { useSys } from "../../Shared/SystemUsing";
import { generateHookFile, generatePageFile } from "../utils/codeGenerator";

type Tab = "code" | "json" | "log";

export default function BottomPanel() {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const { config } = useScreenBuilder();
  const [tab, setTab] = useState<Tab>("code");
  const [codeFile, setCodeFile] = useState<"ts" | "page">("ts");

  const bg = isDark ? "bg-gray-900/90 border-gray-700/50" : "bg-white/95 border-gray-200";
  const tabBtn = (active: boolean) =>
    `px-3 py-1 text-xs font-medium transition-all rounded-t-lg ${
      active
        ? isDark ? "bg-gray-800 text-white border-b-2 border-blue-500" : "bg-white text-gray-900 border-b-2 border-blue-600"
        : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
    }`;

  let content = "";
  if (tab === "code") {
    content = codeFile === "ts" ? generateHookFile(config) : generatePageFile(config);
  } else if (tab === "json") {
    content = JSON.stringify(config, null, 2);
  }

  return (
    <div className={`border-t flex flex-col ${bg}`} style={{ height: 220 }}>
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-1 border-b border-inherit">
        <button className={tabBtn(tab === "code")} onClick={() => setTab("code")}>
          <i className="fa-solid fa-code mr-1" />{t("Code", "كود")}
        </button>
        <button className={tabBtn(tab === "json")} onClick={() => setTab("json")}>
          <i className="fa-solid fa-brackets-curly mr-1" />{t("JSON", "بيانات")}
        </button>

        {tab === "code" && (
          <>
            <div className={`w-px h-4 mx-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
            <button className={`text-xs px-2 py-0.5 rounded ${codeFile === "ts" ? "bg-blue-600 text-white" : isDark ? "text-gray-400" : "text-gray-500"}`}
              onClick={() => setCodeFile("ts")}>.ts</button>
            <button className={`text-xs px-2 py-0.5 rounded ${codeFile === "page" ? "bg-blue-600 text-white" : isDark ? "text-gray-400" : "text-gray-500"}`}
              onClick={() => setCodeFile("page")}>page.tsx</button>
          </>
        )}

        <div className="flex-1" />
        <button className={`text-xs px-2 py-1 rounded ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
          onClick={() => {
            navigator.clipboard.writeText(content);
          }}
          title={t("Copy to clipboard", "نسخ")}>
          <i className="fa-solid fa-copy" />
        </button>
      </div>

      {/* Content */}
      <pre className={`flex-1 overflow-auto p-3 text-xs font-mono leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
        {content}
      </pre>
    </div>
  );
}
