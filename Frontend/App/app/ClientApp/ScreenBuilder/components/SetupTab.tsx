"use client";

import React from "react";
import { useSys } from "../../Shared/SystemUsing";
import { useScreenBuilder } from "../store/useScreenBuilder";

const ICON_COLORS = [
  { value: "indigo", label: "Indigo", cls: "bg-indigo-500" },
  { value: "blue", label: "Blue", cls: "bg-blue-500" },
  { value: "green", label: "Green", cls: "bg-green-500" },
  { value: "red", label: "Red", cls: "bg-red-500" },
  { value: "orange", label: "Orange", cls: "bg-orange-500" },
  { value: "purple", label: "Purple", cls: "bg-purple-500" },
  { value: "pink", label: "Pink", cls: "bg-pink-500" },
  { value: "teal", label: "Teal", cls: "bg-teal-500" },
];

interface SetupTabProps {
  fields: string[];
}

export default function SetupTab({ fields }: SetupTabProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { config, updateScreen, updatePermissions } = useScreenBuilder();

  const inputCls = isDark
    ? "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 text-sm focus:border-blue-500 focus:outline-none"
    : "w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-800 text-sm focus:border-blue-500 focus:outline-none";
  const labelCls = `text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`;
  const sectionCls = isDark
    ? "rounded-xl border border-gray-700 bg-gray-800/50 p-4"
    : "rounded-xl border border-gray-200 bg-gray-50/50 p-4";
  const headingCls = `text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-gray-200" : "text-gray-800"}`;
  const checkCls = "w-4 h-4 rounded accent-blue-600";

  return (
    <div className="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-180px)]">
      {/* Screen Type */}
      <div className={sectionCls}>
        <div className={headingCls}><i className="fa-solid fa-display text-blue-400" />{t("Screen Type", "نوع الشاشة")}</div>
        <div className="flex gap-2">
          {(["Grid", "MasterDetail"] as const).map((st) => (
            <button
              key={st}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition border-2 ${
                config.screenType === st
                  ? "border-blue-500 bg-blue-600/10 text-blue-400"
                  : isDark ? "border-gray-700 text-gray-400 hover:border-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              onClick={() => updateScreen({ screenType: st })}
            >
              <i className={`fa-solid ${st === "Grid" ? "fa-table-list" : "fa-layer-group"} mr-2`} />
              {st === "Grid" ? t("Grid", "جريد") : t("Master Detail", "ماستر ديتيل")}
            </button>
          ))}
        </div>
      </div>

      {/* Screen Info */}
      <div className={sectionCls}>
        <div className={headingCls}><i className="fa-solid fa-info-circle text-indigo-400" />{t("Screen Info", "معلومات الشاشة")}</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("Module Code", "كود الشاشة")}</label>
            <input className={inputCls} value={config.module} onChange={(e) => updateScreen({ module: e.target.value })} placeholder="CashTypes" />
          </div>
          <div>
            <label className={labelCls}>{t("Icon", "الأيقونة")}</label>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} value={config.icon} onChange={(e) => updateScreen({ icon: e.target.value })} placeholder="fa-table-list" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
                <i className={`fa-solid ${config.icon || "fa-table-list"}`} />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("Icon Color", "لون الأيقونة")}</label>
            <div className="flex gap-1.5 flex-wrap">
              {ICON_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`w-6 h-6 rounded-full ${c.cls} transition ring-2 ${config.iconColor === c.value ? "ring-white scale-110" : "ring-transparent hover:ring-gray-400"}`}
                  onClick={() => updateScreen({ iconColor: c.value })}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("Page Size", "حجم الصفحة")}</label>
            <input className={inputCls} type="number" min={5} max={100} value={config.pageSize} onChange={(e) => updateScreen({ pageSize: Number(e.target.value) || 10 })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={labelCls}>{t("Title Arabic", "العنوان عربي")}</label>
            <input className={inputCls} value={config.titleAr} onChange={(e) => updateScreen({ titleAr: e.target.value })} dir="rtl" />
          </div>
          <div>
            <label className={labelCls}>{t("Title English", "العنوان انجليزي")}</label>
            <input className={inputCls} value={config.titleEn} onChange={(e) => updateScreen({ titleEn: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>{t("Subtitle Arabic", "العنوان الفرعي عربي")}</label>
            <input className={inputCls} value={config.subAr} onChange={(e) => updateScreen({ subAr: e.target.value })} dir="rtl" />
          </div>
          <div>
            <label className={labelCls}>{t("Subtitle English", "العنوان الفرعي انجليزي")}</label>
            <input className={inputCls} value={config.subEn} onChange={(e) => updateScreen({ subEn: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Display & Filtering */}
      <div className={sectionCls}>
        <div className={headingCls}><i className="fa-solid fa-filter text-green-400" />{t("Display & Filtering", "العرض والتصفية")}</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className={checkCls} checked={config.permissions.insert} onChange={(e) => updatePermissions({ insert: e.target.checked })} />
            <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Insert", "إضافة")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className={checkCls} checked={config.permissions.edit} onChange={(e) => updatePermissions({ edit: e.target.checked })} />
            <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Edit", "تعديل")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className={checkCls} checked={config.permissions.delete} onChange={(e) => updatePermissions({ delete: e.target.checked })} />
            <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Delete", "حذف")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className={checkCls} checked={config.permissions.export} onChange={(e) => updatePermissions({ export: e.target.checked })} />
            <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Export", "تصدير")}</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={labelCls}>{t("Order By", "ترتيب حسب")}</label>
            <select className={inputCls} value={config.orderBy} onChange={(e) => updateScreen({ orderBy: e.target.value })}>
              <option value="">{t("-- Default --", "-- افتراضي --")}</option>
              {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t("Order Type", "نوع الترتيب")}</label>
            <select className={inputCls} value={config.orderType} onChange={(e) => updateScreen({ orderType: e.target.value as any })}>
              <option value="DESC">{t("Descending", "تنازلي")}</option>
              <option value="ASC">{t("Ascending", "تصاعدي")}</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className={labelCls}>{t("Extra Condition (WHERE)", "شرط إضافي (WHERE)")}</label>
          <textarea className={`${inputCls} h-16 resize-none`} value={config.extraCondition} onChange={(e) => updateScreen({ extraCondition: e.target.value })} placeholder="Status = 1" />
        </div>
      </div>

      {/* Process Trans */}
      <div className={sectionCls}>
        <div className={headingCls}><i className="fa-solid fa-gears text-orange-400" />{t("Process Transaction", "معالجة العملية")}</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className={checkCls} checked={config.processTrans} onChange={(e) => updateScreen({ processTrans: e.target.checked })} />
          <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Run G_ProcessTrans after save/delete", "تشغيل G_ProcessTrans بعد الحفظ/الحذف")}</span>
        </label>
        {config.processTrans && (
          <div className="mt-2">
            <label className={labelCls}>{t("TrType", "نوع العملية")}</label>
            <input className={inputCls} value={config.trType} onChange={(e) => updateScreen({ trType: e.target.value })} placeholder="SalesInvoice" />
          </div>
        )}
      </div>

      {/* Permissions */}
      <div className={sectionCls}>
        <div className={headingCls}><i className="fa-solid fa-shield-halved text-red-400" />{t("Permissions", "الصلاحيات")}</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
          <input type="checkbox" className={checkCls} checked={config.permissions.usePermissions} onChange={(e) => updatePermissions({ usePermissions: e.target.checked })} />
          <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Generate SQL permissions script", "توليد سكريبت الصلاحيات")}</span>
        </label>
        {config.permissions.usePermissions && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("Parent Menu", "القائمة الأب")}</label>
              <input className={inputCls} value={config.permissions.parentMenu} onChange={(e) => updatePermissions({ parentMenu: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{t("Roles (comma-separated)", "الأدوار (مفصولة بفاصلة)")}</label>
              <input className={inputCls} value={config.permissions.roles} onChange={(e) => updatePermissions({ roles: e.target.value })} placeholder={t("All roles", "كل الأدوار")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
