"use client";

import React from "react";
import { useScreenBuilder } from "../store/useScreenBuilder";
import { useSys } from "../../Shared/SystemUsing";
import { INPUT_TYPES } from "../types/ScreenConfig";

export default function ComponentPanel() {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const { config, addField, addDetail, addValidation, selectElement, selectedElement } = useScreenBuilder();

  const bg = isDark ? "bg-gray-900/80 border-gray-700/50" : "bg-white/90 border-gray-200";
  const sectionTitle = `text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"} mb-2`;
  const itemBtn = (active: boolean) =>
    `w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
      active
        ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
        : isDark
          ? "hover:bg-gray-800 text-gray-300 border border-transparent"
          : "hover:bg-gray-50 text-gray-700 border border-transparent"
    }`;

  const isSelected = (type: string, index: number, detailIndex?: number) =>
    selectedElement?.type === type && selectedElement?.index === index && selectedElement?.detailIndex === detailIndex;

  return (
    <div className={`w-64 border-r overflow-y-auto flex flex-col ${bg}`}>
      {/* Screen Settings */}
      <div className="p-3 border-b border-inherit">
        <div className={sectionTitle}>{t("Screen", "الشاشة")}</div>
        <button className={itemBtn(selectedElement?.type === "screen")}
          onClick={() => selectElement({ type: "screen", index: 0 })}>
          <i className="fa-solid fa-gear mr-2 text-xs" />
          {config.module || t("Screen Settings", "إعدادات الشاشة")}
        </button>
      </div>

      {/* Fields */}
      <div className="p-3 border-b border-inherit">
        <div className="flex items-center justify-between mb-2">
          <span className={sectionTitle + " mb-0"}>{t("Fields", "الحقول")} ({config.fields.length})</span>
          <button onClick={() => addField("fields")}
            className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center hover:bg-blue-500 transition-all">
            <i className="fa-solid fa-plus" />
          </button>
        </div>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {config.fields.map((f, i) => (
            <button key={i} className={itemBtn(isSelected("field", i))}
              onClick={() => selectElement({ type: "field", index: i })}>
              <i className={`fa-solid ${fieldIcon(f.inputType)} mr-2 text-xs opacity-50`} />
              <span className="truncate">{f.field || `Field_${i + 1}`}</span>
              {f.required && <span className="text-red-400 ml-1 text-xs">*</span>}
            </button>
          ))}
        </div>
      </div>

      {/* List Fields (MasterDetail) */}
      {config.screenType === "MasterDetail" && (
        <div className="p-3 border-b border-inherit">
          <div className="flex items-center justify-between mb-2">
            <span className={sectionTitle + " mb-0"}>{t("List Columns", "أعمدة القائمة")} ({config.listFields.length})</span>
            <button onClick={() => addField("listFields")}
              className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center hover:bg-blue-500 transition-all">
              <i className="fa-solid fa-plus" />
            </button>
          </div>
          <div className="space-y-0.5 max-h-36 overflow-y-auto">
            {config.listFields.map((f, i) => (
              <button key={i} className={itemBtn(isSelected("listField", i))}
                onClick={() => selectElement({ type: "listField", index: i })}>
                <i className={`fa-solid ${fieldIcon(f.inputType)} mr-2 text-xs opacity-50`} />
                <span className="truncate">{f.field || `List_${i + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      {config.screenType === "MasterDetail" && (
        <div className="p-3 border-b border-inherit">
          <div className="flex items-center justify-between mb-2">
            <span className={sectionTitle + " mb-0"}>{t("Details", "التفاصيل")} ({config.details.length}/5)</span>
            {config.details.length < 5 && (
              <button onClick={addDetail}
                className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center hover:bg-blue-500 transition-all">
                <i className="fa-solid fa-plus" />
              </button>
            )}
          </div>
          {config.details.map((d, di) => (
            <div key={di} className="mb-2">
              <button className={itemBtn(isSelected("detail", di))}
                onClick={() => selectElement({ type: "detail", index: di })}>
                <i className="fa-solid fa-table mr-2 text-xs opacity-50" />
                {d.titleEn || `Detail ${di + 1}`}
                <span className="text-xs opacity-40 ml-1">({d.fields.length})</span>
              </button>
              <div className="ml-4 space-y-0.5 mt-1">
                {d.fields.map((f, fi) => (
                  <button key={fi}
                    className={itemBtn(isSelected("detailField", fi) && selectedElement?.detailIndex === di)}
                    onClick={() => selectElement({ type: "detailField", index: fi, detailIndex: di })}>
                    <span className="truncate text-xs">{f.field || `DField_${fi + 1}`}</span>
                  </button>
                ))}
                <button
                  className={`w-full text-center py-1 rounded-lg text-xs ${isDark ? "text-gray-500 hover:text-gray-400" : "text-gray-400 hover:text-gray-500"} transition-all`}
                  onClick={() => addField("fields", di)}>
                  + {t("Add Field", "أضف حقل")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validations */}
      <div className="p-3 border-b border-inherit">
        <div className="flex items-center justify-between mb-2">
          <span className={sectionTitle + " mb-0"}>{t("Validations", "التحققات")} ({config.validations.length})</span>
          <button onClick={addValidation}
            className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center hover:bg-blue-500 transition-all">
            <i className="fa-solid fa-plus" />
          </button>
        </div>
        <div className="space-y-0.5 max-h-36 overflow-y-auto">
          {config.validations.map((v, i) => (
            <button key={i} className={itemBtn(isSelected("validation", i))}
              onClick={() => selectElement({ type: "validation", index: i })}>
              <i className="fa-solid fa-shield-check mr-2 text-xs opacity-50" />
              <span className="truncate text-xs">{v.type}: {v.field || "—"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}

function fieldIcon(type: string): string {
  switch (type) {
    case "number": return "fa-hashtag";
    case "date": return "fa-calendar";
    case "checkbox": return "fa-square-check";
    case "select": return "fa-list";
    case "textarea": return "fa-align-left";
    case "search": return "fa-magnifying-glass";
    default: return "fa-font";
  }
}
