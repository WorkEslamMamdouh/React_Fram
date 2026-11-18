"use client";

import React from "react";
import { useSys } from "../../Shared/SystemUsing";
import { ScreenConfigV5 } from "../types/ScreenConfig";
import { EXAMPLES } from "../utils/examples";

export default function ExamplesModal({ onClose, onPick }: { onClose: () => void; onPick: (cfg: ScreenConfigV5) => void }) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const ar = lang === "ar";
  const t = (en: string, a: string) => (ar ? a : en);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} dir={ar ? "rtl" : "ltr"}>
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${isDark ? "bg-gray-900 text-gray-100" : "bg-white text-gray-800"}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <i className="fa-solid fa-lightbulb text-amber-500" /> {t("Ready-made examples", "أمثلة جاهزة")}
          </h2>
          <button onClick={onClose} className={`w-8 h-8 rounded-lg ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`} aria-label={t("Close", "إغلاق")}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className={`px-5 pt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {t("Pick an example to load all its settings. Then follow the steps under it.", "اختار مثال وهيتحمّل بكل إعداداته، وبعدين امشي على الخطوات اللي تحته.")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
          {EXAMPLES.map((ex) => (
            <div key={ex.id} className={`rounded-xl border p-4 flex flex-col ${isDark ? "border-gray-700 bg-gray-800/40" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center">
                  <i className={`fa-solid ${ex.icon}`} />
                </div>
                <h3 className="font-bold text-sm">{t(ex.titleEn, ex.titleAr)}</h3>
              </div>
              <p className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t(ex.descEn, ex.descAr)}</p>
              <ol className={`text-xs space-y-1 mb-4 list-decimal ${ar ? "pr-4" : "pl-4"} ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {(ar ? ex.stepsAr : ex.stepsEn).map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <button onClick={() => onPick(ex.build())} className="mt-auto px-4 py-2 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90">
                <i className="fa-solid fa-download mx-1" /> {t("Load example", "حمّل المثال")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
