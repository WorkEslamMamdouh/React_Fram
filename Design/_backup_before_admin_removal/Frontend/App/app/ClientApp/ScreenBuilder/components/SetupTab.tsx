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

const SCREEN_TYPES = [
  { key: "Grid" as const, icon: "fa-table-list", en: "Grid", ar: "جريد", hintEn: "One table, add/edit in a popup", hintAr: "جدول واحد، إضافة وتعديل في نافذة" },
  { key: "MasterDetail" as const, icon: "fa-layer-group", en: "Master Detail", ar: "ماستر ديتيل", hintEn: "Header + rows (like an invoice)", hintAr: "رأس + صفوف (زي الفاتورة)" },
  { key: "Tree" as const, icon: "fa-sitemap", en: "Tree", ar: "شجرة", hintEn: "Parent / child (chart of accounts)", hintAr: "أب وأبناء (زي شجرة الحسابات)" },
];

const TREE_COLS = [
  { key: "codeColumn", en: "Code column", ar: "عمود الكود", hintEn: "unique node code, e.g. CC_CODE", hintAr: "كود العقدة (ميتكررش) مثلاً CC_CODE", required: true },
  { key: "parentColumn", en: "Parent column", ar: "عمود الأب", hintEn: "holds the parent code, e.g. PARENT_ACC", hintAr: "فيه كود الأب مثلاً PARENT_ACC", required: true },
  { key: "titleColumn", en: "Name (Arabic)", ar: "الاسم عربي", hintEn: "shown in the tree, e.g. CC_DESCA", hintAr: "اللي بيظهر في الشجرة مثلاً CC_DESCA", required: true },
  { key: "titleColumnEn", en: "Name (English)", ar: "الاسم انجليزي", hintEn: "optional, e.g. CC_DESCL", hintAr: "اختياري مثلاً CC_DESCL", required: false },
  { key: "levelColumn", en: "Level column", ar: "عمود المستوى", hintEn: "filled automatically = parent level + 1", hintAr: "بيتملي لوحده = مستوى الأب + 1", required: false },
  { key: "leafColumn", en: "Detail / leaf column", ar: "عمود نهائي (تفصيلي)", hintEn: "bit: 1 = final node with no children", hintAr: "bit: 1 = عقدة نهائية مالهاش أبناء", required: false },
  { key: "activeColumn", en: "Active column", ar: "عمود فعال", hintEn: "inactive nodes appear faded", hintAr: "العقد الموقوفة بتظهر باهتة", required: false },
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SCREEN_TYPES.map((st) => (
            <button
              key={st.key}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition border-2 text-start ${
                config.screenType === st.key
                  ? "border-blue-500 bg-blue-600/10 text-blue-500"
                  : isDark ? "border-gray-700 text-gray-400 hover:border-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              onClick={() => updateScreen({ screenType: st.key, ...(st.key === "Tree" && config.icon === "fa-table-list" ? { icon: "fa-sitemap", orderType: "ASC" as const } : {}) })}
            >
              <div className="flex items-center gap-2 font-semibold">
                <i className={`fa-solid ${st.icon}`} />
                {t(st.en, st.ar)}
              </div>
              <div className={`text-[11px] mt-1 font-normal ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t(st.hintEn, st.hintAr)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tree Settings */}
      {config.screenType === "Tree" && (
        <div className={sectionCls}>
          <div className={headingCls}>
            <i className="fa-solid fa-sitemap text-emerald-400" />
            {t("Tree Settings", "إعدادات الشجرة")}
            <span className={`text-[11px] font-normal ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {t("— auto-filled when you load columns, change if needed", "— بتتملي لوحدها لما تحمّل الأعمدة، غيّرها لو محتاج")}
            </span>
          </div>
          {fields.length === 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs bg-amber-500/10 text-amber-600 border border-amber-500/30">
              <i className="fa-solid fa-circle-info mx-1" />
              {t("Pick a table from the sidebar and press Load Columns first.", "اختار الجدول من القايمة الجانبية ودوس تحميل الأعمدة الأول.")}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TREE_COLS.map((c) => (
              <div key={c.key}>
                <label className={labelCls}>
                  {t(c.en, c.ar)} {c.required && <span className="text-red-500">*</span>}
                  <span className={`block text-[10px] font-normal ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t(c.hintEn, c.hintAr)}</span>
                </label>
                <select
                  className={`${inputCls} ${c.required && !(config.tree as any)[c.key] ? "border-red-400" : ""}`}
                  value={(config.tree as any)[c.key] || ""}
                  onChange={(e) => updateScreen({ tree: { ...config.tree, [c.key]: e.target.value } })}
                >
                  <option value="">{c.required ? t("-- choose --", "-- اختار --") : t("-- none --", "-- مفيش --")}</option>
                  {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-4">
              <input type="checkbox" className={checkCls} checked={config.tree.autoCode} onChange={(e) => updateScreen({ tree: { ...config.tree, autoCode: e.target.checked } })} />
              <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                {t("Auto code: child code = parent code + serial", "كود تلقائي: كود الابن = كود الأب + مسلسل")}
              </span>
            </label>
            <div>
              <label className={labelCls}>{t("Serial digits", "خانات المسلسل")}</label>
              <input className={inputCls} type="number" min={1} max={8} value={config.tree.codeDigits} onChange={(e) => updateScreen({ tree: { ...config.tree, codeDigits: Number(e.target.value) || 2 } })} />
            </div>
            <div>
              <label className={labelCls}>{t("Separator", "فاصل")}</label>
              <input className={inputCls} value={config.tree.codeSeparator} maxLength={3} placeholder={t("none", "مفيش")} onChange={(e) => updateScreen({ tree: { ...config.tree, codeSeparator: e.target.value } })} />
            </div>
            <div>
              <label className={labelCls}>{t("Nodes per load", "عقد في كل تحميل")}</label>
              <input className={inputCls} type="number" min={10} max={500} value={config.tree.treePageSize} onChange={(e) => updateScreen({ tree: { ...config.tree, treePageSize: Number(e.target.value) || 50 } })} />
            </div>
            <div>
              <label className={labelCls}>{t("Example", "مثال")}</label>
              <div className={`${inputCls} font-mono text-xs`}>
                01 → 01{config.tree.codeSeparator}{"1".padStart(config.tree.codeDigits || 2, "0")}
              </div>
            </div>
            <div className="sm:col-span-4">
              <label className={labelCls}>{t("Search columns (comma-separated, empty = code + name)", "أعمدة البحث (مفصولة بفاصلة، فاضي = الكود والاسم)")}</label>
              <input className={inputCls} value={config.tree.searchColumns} placeholder={[config.tree.codeColumn, config.tree.titleColumn, config.tree.titleColumnEn].filter(Boolean).join(", ")} onChange={(e) => updateScreen({ tree: { ...config.tree, searchColumns: e.target.value } })} />
            </div>
          </div>
        </div>
      )}
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

      {/* Header Filter */}
      <div className={sectionCls}>
        <div className={headingCls}><i className="fa-solid fa-calendar-days text-cyan-400" />{t("Header Filter (date range)", "فلتر الهيدر (مدى تاريخ)")}</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
          <input type="checkbox" className={checkCls} checked={config.headerFilter.enabled} onChange={(e) => updateScreen({ headerFilter: { ...config.headerFilter, enabled: e.target.checked } })} />
          <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Enable required date-range filter in the header", "تفعيل فلتر تاريخ إجباري في الهيدر")}</span>
        </label>
        {config.headerFilter.enabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>{t("Field", "الحقل")}</label>
              <select className={inputCls} value={config.headerFilter.field} onChange={(e) => updateScreen({ headerFilter: { ...config.headerFilter, field: e.target.value } })}>
                <option value="">--</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("Label Arabic", "اسم عربي")}</label>
              <input className={inputCls} dir="rtl" value={config.headerFilter.labelAr} onChange={(e) => updateScreen({ headerFilter: { ...config.headerFilter, labelAr: e.target.value } })} />
            </div>
            <div>
              <label className={labelCls}>{t("Label English", "اسم انجليزي")}</label>
              <input className={inputCls} value={config.headerFilter.labelEn} onChange={(e) => updateScreen({ headerFilter: { ...config.headerFilter, labelEn: e.target.value } })} />
            </div>
            <div>
              <label className={labelCls}>{t("From default", "قيمة من الافتراضية")}</label>
              <select className={inputCls} value={config.headerFilter.fromDefault} onChange={(e) => updateScreen({ headerFilter: { ...config.headerFilter, fromDefault: e.target.value as any } })}>
                <option value="monthStart">{t("Start of month", "أول الشهر")}</option>
                <option value="yearStart">{t("Start of fiscal year", "أول السنة المالية")}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("To default", "قيمة إلى الافتراضية")}</label>
              <select className={inputCls} value={config.headerFilter.toDefault} onChange={(e) => updateScreen({ headerFilter: { ...config.headerFilter, toDefault: e.target.value as any } })}>
                <option value="today">{t("Today", "النهارده")}</option>
                <option value="yearEnd">{t("End of fiscal year", "آخر السنة المالية")}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Inline Status */}
      <div className={sectionCls}>
        <div className={headingCls}><i className="fa-solid fa-square-check text-emerald-400" />{t("Inline Status Checkbox", "مربع حالة داخل الجريد")}</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
          <input type="checkbox" className={checkCls} checked={config.inlineStatus.enabled} onChange={(e) => updateScreen({ inlineStatus: { ...config.inlineStatus, enabled: e.target.checked } })} />
          <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Render a checkbox in each row and call ProcessTrans when toggled", "اعرض مربع اعتماد في كل صف وبعت ProcessTrans لما يتغير")}</span>
        </label>
        {config.inlineStatus.enabled && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{t("Column", "العمود")}</label>
              <select className={inputCls} value={config.inlineStatus.field} onChange={(e) => updateScreen({ inlineStatus: { ...config.inlineStatus, field: e.target.value } })}>
                <option value="">--</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("Approve TrType", "TrType للاعتماد")}</label>
              <input className={inputCls} value={config.inlineStatus.approveTrType} onChange={(e) => updateScreen({ inlineStatus: { ...config.inlineStatus, approveTrType: e.target.value } })} placeholder="Approve" />
            </div>
            <div>
              <label className={labelCls}>{t("Unapprove TrType", "TrType لإلغاء الاعتماد")}</label>
              <input className={inputCls} value={config.inlineStatus.unapproveTrType} onChange={(e) => updateScreen({ inlineStatus: { ...config.inlineStatus, unapproveTrType: e.target.value } })} placeholder="Unapprove" />
            </div>
            <div>
              <label className={labelCls}>{t("Approve permission", "صلاحية الاعتماد")}</label>
              <input className={inputCls} value={config.inlineStatus.approvePermission} onChange={(e) => updateScreen({ inlineStatus: { ...config.inlineStatus, approvePermission: e.target.value } })} />
            </div>
            <div>
              <label className={labelCls}>{t("Unapprove permission", "صلاحية إلغاء الاعتماد")}</label>
              <input className={inputCls} value={config.inlineStatus.unapprovePermission} onChange={(e) => updateScreen({ inlineStatus: { ...config.inlineStatus, unapprovePermission: e.target.value } })} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer md:col-span-3">
              <input type="checkbox" className={checkCls} checked={config.inlineStatus.confirmBeforeChange} onChange={(e) => updateScreen({ inlineStatus: { ...config.inlineStatus, confirmBeforeChange: e.target.checked } })} />
              <span className={isDark ? "text-gray-300" : "text-gray-700"}>{t("Confirm before toggle", "تأكيد قبل التغيير")}</span>
            </label>
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
