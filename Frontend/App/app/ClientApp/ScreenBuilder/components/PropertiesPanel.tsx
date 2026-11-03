"use client";

import React from "react";
import { useScreenBuilder } from "../store/useScreenBuilder";
import { useSys } from "../../Shared/SystemUsing";
import { INPUT_TYPES, AUTO_VALUES, VALIDATION_TYPES } from "../types/ScreenConfig";

export default function PropertiesPanel() {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const {
    config, selectedElement,
    updateScreen, updatePermissions,
    updateField, removeField,
    updateDetail, removeDetail,
    updateValidation, removeValidation,
  } = useScreenBuilder();

  const bg = isDark ? "bg-gray-900/80 border-gray-700/50" : "bg-white/90 border-gray-200";
  const label = `block text-[10px] font-semibold mb-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const input = `w-full rounded-lg px-2.5 py-1.5 text-xs border transition-all ${
    isDark ? "bg-gray-800/60 border-gray-700 text-gray-200 focus:border-blue-500" : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
  } focus:outline-none focus:ring-1 focus:ring-blue-500/30`;
  const checkbox = "w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500";
  const section = `text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-gray-600" : "text-gray-300"} mt-3 mb-2`;
  const dangerBtn = `w-full mt-3 px-3 py-1.5 rounded-xl text-xs font-medium transition-all bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-500/20`;

  if (!selectedElement) {
    return (
      <div className={`w-72 border-l p-4 flex items-center justify-center ${bg}`}>
        <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          {t("Select an element", "اختار عنصر")}
        </p>
      </div>
    );
  }

  // ============================================================
  // Screen Settings
  // ============================================================
  if (selectedElement.type === "screen") {
    return (
      <div className={`w-72 border-l overflow-y-auto p-3 ${bg}`}>
        <h3 className="text-sm font-bold mb-3">{t("Screen Settings", "إعدادات الشاشة")}</h3>

        <div className={section}>{t("General", "عام")}</div>
        <Field label={t("Module Name", "اسم الموديول")} value={config.module}
          onChange={v => updateScreen({ module: v })} />
        <Field label={t("Table", "الجدول")} value={config.table}
          onChange={v => updateScreen({ table: v })} />
        <Field label={t("View", "الـ View")} value={config.view}
          onChange={v => updateScreen({ view: v })} />
        <Field label={t("Key Column", "عمود المفتاح")} value={config.keyColumn}
          onChange={v => updateScreen({ keyColumn: v })} />

        <div className={section}>{t("Titles", "العناوين")}</div>
        <Field label={t("Title (EN)", "العنوان (EN)")} value={config.titleEn}
          onChange={v => updateScreen({ titleEn: v })} />
        <Field label={t("Title (AR)", "العنوان (AR)")} value={config.titleAr}
          onChange={v => updateScreen({ titleAr: v })} />
        <Field label={t("Subtitle (EN)", "العنوان الفرعي (EN)")} value={config.subEn}
          onChange={v => updateScreen({ subEn: v })} />
        <Field label={t("Subtitle (AR)", "العنوان الفرعي (AR)")} value={config.subAr}
          onChange={v => updateScreen({ subAr: v })} />

        <div className={section}>{t("Display", "العرض")}</div>
        <Field label={t("Icon", "الأيقونة")} value={config.icon}
          onChange={v => updateScreen({ icon: v })} />
        <Field label={t("Icon Color", "لون الأيقونة")} value={config.iconColor}
          onChange={v => updateScreen({ iconColor: v })} />
        <NumField label={t("Page Size", "حجم الصفحة")} value={config.pageSize}
          onChange={v => updateScreen({ pageSize: v })} />
        <Field label={t("Order By", "الترتيب")} value={config.orderBy}
          onChange={v => updateScreen({ orderBy: v })} />
        <SelectField label={t("Order Type", "نوع الترتيب")} value={config.orderType}
          options={["ASC", "DESC"]} onChange={v => updateScreen({ orderType: v as any })} />

        <div className={section}>{t("Processing", "المعالجة")}</div>
        <CheckField label={t("Process Trans", "تشغيل G_ProcessTrans")} checked={config.processTrans}
          onChange={v => updateScreen({ processTrans: v })} />
        {config.processTrans && (
          <Field label={t("TrType", "نوع العملية")} value={config.trType}
            onChange={v => updateScreen({ trType: v })} />
        )}
        <Field label={t("Extra Condition", "شرط إضافي")} value={config.extraCondition}
          onChange={v => updateScreen({ extraCondition: v })} />

        <div className={section}>{t("Permissions", "الصلاحيات")}</div>
        <CheckField label={t("Insert", "إضافة")} checked={config.permissions.insert}
          onChange={v => updatePermissions({ insert: v })} />
        <CheckField label={t("Edit", "تعديل")} checked={config.permissions.edit}
          onChange={v => updatePermissions({ edit: v })} />
        <CheckField label={t("Delete", "حذف")} checked={config.permissions.delete}
          onChange={v => updatePermissions({ delete: v })} />
        <CheckField label={t("Export", "تصدير")} checked={config.permissions.export}
          onChange={v => updatePermissions({ export: v })} />
        <CheckField label={t("Use Permissions", "استخدام الصلاحيات")} checked={config.permissions.usePermissions}
          onChange={v => updatePermissions({ usePermissions: v })} />
      </div>
    );
  }

  // ============================================================
  // Field / ListField / DetailField
  // ============================================================
  if (selectedElement.type === "field" || selectedElement.type === "listField" || selectedElement.type === "detailField") {
    const target = selectedElement.type === "listField" ? "listFields" as const : "fields" as const;
    const detailIdx = selectedElement.type === "detailField" ? selectedElement.detailIndex : undefined;
    const fields = detailIdx != null ? config.details[detailIdx]?.fields : (target === "listFields" ? config.listFields : config.fields);
    const f = fields?.[selectedElement.index];
    if (!f) return null;

    const update = (upd: any) => updateField(selectedElement.index, upd, target, detailIdx);

    return (
      <div className={`w-72 border-l overflow-y-auto p-3 ${bg}`}>
        <h3 className="text-sm font-bold mb-3">{t("Field Properties", "خصائص الحقل")}</h3>

        <div className={section}>{t("Identity", "التعريف")}</div>
        <Field label={t("Field Name", "اسم الحقل")} value={f.field}
          onChange={v => update({ field: v })} />
        <Field label={t("Title EN", "العنوان EN")} value={f.titleEn}
          onChange={v => update({ titleEn: v })} />
        <Field label={t("Title AR", "العنوان AR")} value={f.titleAr}
          onChange={v => update({ titleAr: v })} />
        <SelectField label={t("Input Type", "نوع الإدخال")} value={f.inputType}
          options={[...INPUT_TYPES]} onChange={v => update({ inputType: v })} />
        <NumField label={t("Width", "العرض")} value={f.width}
          onChange={v => update({ width: v })} />
        <NumField label={t("Order", "الترتيب")} value={f.order}
          onChange={v => update({ order: v })} />

        <div className={section}>{t("Visibility", "الظهور")}</div>
        <CheckField label={t("In Grid", "في الجدول")} checked={f.inGrid}
          onChange={v => update({ inGrid: v })} />
        <CheckField label={t("In Form", "في الفورم")} checked={f.inForm}
          onChange={v => update({ inForm: v })} />
        <CheckField label={t("Required", "مطلوب")} checked={f.required}
          onChange={v => update({ required: v })} />
        <CheckField label={t("Searchable", "قابل للبحث")} checked={f.search}
          onChange={v => update({ search: v })} />
        <CheckField label={t("In Filter", "في الفلتر")} checked={f.inFilter}
          onChange={v => update({ inFilter: v })} />

        <div className={section}>{t("Mode Visibility", "الظهور حسب الوضع")}</div>
        <CheckField label={t("Visible in Create", "ظاهر في الإضافة")} checked={f.visibleInCreate !== false}
          onChange={v => update({ visibleInCreate: v })} />
        <CheckField label={t("Visible in Edit", "ظاهر في التعديل")} checked={f.visibleInEdit !== false}
          onChange={v => update({ visibleInEdit: v })} />
        <CheckField label={t("Visible in View", "ظاهر في العرض")} checked={f.visibleInView !== false}
          onChange={v => update({ visibleInView: v })} />

        <div className={section}>{t("Data", "البيانات")}</div>
        <Field label={t("Default Value", "القيمة الافتراضية")} value={f.defaultValue}
          onChange={v => update({ defaultValue: v })} />
        <SelectField label={t("Auto Value", "قيمة تلقائية")} value={f.auto}
          options={[...AUTO_VALUES]} onChange={v => update({ auto: v })} />
        <Field label={t("Formula", "معادلة")} value={f.formula}
          onChange={v => update({ formula: v })} />
        {f.inputType === "select" && (
          <Field label={t("Options (val:label|...)", "الخيارات")} value={f.options}
            onChange={v => update({ options: v })} />
        )}

        <div className={section}>{t("Search Modal", "نافذة البحث")}</div>
        <Field label={t("Search Function", "دالة البحث")} value={f.searchFn}
          onChange={v => update({ searchFn: v })} />
        <Field label={t("Search Condition", "شرط البحث")} value={f.searchCond}
          onChange={v => update({ searchCond: v })} />
        <Field label={t("Fill From", "تعبئة من")} value={f.fillFrom}
          onChange={v => update({ fillFrom: v })} />

        {f.inputType === "date" && (
          <>
            <div className={section}>{t("Date Settings", "إعدادات التاريخ")}</div>
            <Field label={t("Display Format", "شكل العرض")} value={f.dateDisplayFormat || ""}
              onChange={v => update({ dateDisplayFormat: v || undefined })} />
            <SelectField label={t("Date Mode", "وضع التاريخ")} value={f.dateMode || "date"}
              options={["date", "datetime"]} onChange={v => update({ dateMode: v as any })} />
          </>
        )}

        <SelectField label={t("Align", "المحاذاة")} value={f.align || "left"}
          options={["left", "center", "right"]} onChange={v => update({ align: v as any })} />

        <button className={dangerBtn} onClick={() => removeField(selectedElement.index, target, detailIdx)}>
          <i className="fa-solid fa-trash mr-1" />{t("Remove Field", "حذف الحقل")}
        </button>
      </div>
    );
  }

  // ============================================================
  // Detail
  // ============================================================
  if (selectedElement.type === "detail") {
    const d = config.details[selectedElement.index];
    if (!d) return null;
    const update = (upd: any) => updateDetail(selectedElement.index, upd);

    return (
      <div className={`w-72 border-l overflow-y-auto p-3 ${bg}`}>
        <h3 className="text-sm font-bold mb-3">{t("Detail Properties", "خصائص التفاصيل")}</h3>

        <Field label={t("Title EN", "العنوان EN")} value={d.titleEn}
          onChange={v => update({ titleEn: v })} />
        <Field label={t("Title AR", "العنوان AR")} value={d.titleAr}
          onChange={v => update({ titleAr: v })} />
        <Field label={t("Table", "الجدول")} value={d.table}
          onChange={v => update({ table: v })} />
        <Field label={t("View", "الـ View")} value={d.view}
          onChange={v => update({ view: v })} />
        <Field label={t("Key Column", "عمود المفتاح")} value={d.keyColumn}
          onChange={v => update({ keyColumn: v })} />
        <Field label={t("Foreign Key", "المفتاح الأجنبي")} value={d.foreignKey}
          onChange={v => update({ foreignKey: v })} />
        <Field label={t("Totals (master:detail:type|...)", "المجاميع")} value={d.totals}
          onChange={v => update({ totals: v })} />
        <Field label={t("Order By", "الترتيب")} value={d.orderBy}
          onChange={v => update({ orderBy: v })} />

        <button className={dangerBtn} onClick={() => removeDetail(selectedElement.index)}>
          <i className="fa-solid fa-trash mr-1" />{t("Remove Detail", "حذف التفاصيل")}
        </button>
      </div>
    );
  }

  // ============================================================
  // Validation
  // ============================================================
  if (selectedElement.type === "validation") {
    const v = config.validations[selectedElement.index];
    if (!v) return null;
    const update = (upd: any) => updateValidation(selectedElement.index, upd);

    return (
      <div className={`w-72 border-l overflow-y-auto p-3 ${bg}`}>
        <h3 className="text-sm font-bold mb-3">{t("Validation Properties", "خصائص التحقق")}</h3>

        <SelectField label={t("Type", "النوع")} value={v.type}
          options={[...VALIDATION_TYPES]} onChange={val => update({ type: val })} />
        <Field label={t("Field", "الحقل")} value={v.field}
          onChange={val => update({ field: val })} />
        <SelectField label={t("When", "متى")} value={v.when}
          options={["insert", "update", "both"]} onChange={val => update({ when: val })} />
        <NumField label={t("Detail", "رقم التفاصيل")} value={v.detail}
          onChange={val => update({ detail: val })} />

        {(v.type === "compare") && (
          <>
            <Field label={t("Operator", "العملية")} value={v.operator}
              onChange={val => update({ operator: val })} />
            <Field label={t("Compare To", "مقارنة بـ")} value={v.compareTo}
              onChange={val => update({ compareTo: val })} />
            <Field label={t("Value", "القيمة")} value={v.value}
              onChange={val => update({ value: val })} />
          </>
        )}
        {(v.type === "range") && (
          <>
            <Field label={t("Min", "الحد الأدنى")} value={v.min}
              onChange={val => update({ min: val })} />
            <Field label={t("Max", "الحد الأقصى")} value={v.max}
              onChange={val => update({ max: val })} />
          </>
        )}
        {v.type === "regex" && (
          <Field label={t("Pattern", "النمط")} value={v.pattern}
            onChange={val => update({ pattern: val })} />
        )}
        {(v.type === "unique" || v.type === "exists" || v.type === "notExists") && (
          <>
            <Field label={t("Table", "الجدول")} value={v.table}
              onChange={val => update({ table: val })} />
            <Field label={t("Condition", "الشرط")} value={v.condition}
              onChange={val => update({ condition: val })} />
          </>
        )}
        {v.type === "custom" && (
          <Field label={t("Code", "الكود")} value={v.code}
            onChange={val => update({ code: val })} />
        )}

        <div className={section}>{t("Messages", "الرسائل")}</div>
        <Field label={t("Message EN", "الرسالة EN")} value={v.messageEn}
          onChange={val => update({ messageEn: val })} />
        <Field label={t("Message AR", "الرسالة AR")} value={v.messageAr}
          onChange={val => update({ messageAr: val })} />

        <button className={dangerBtn} onClick={() => removeValidation(selectedElement.index)}>
          <i className="fa-solid fa-trash mr-1" />{t("Remove Validation", "حذف التحقق")}
        </button>
      </div>
    );
  }

  return null;
}

// ============================================================
// Reusable field components
// ============================================================

function Field({ label: lbl, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isDark = useSys((s) => s.IsDark);
  const cls = `block text-[10px] font-semibold mb-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const inp = `w-full rounded-lg px-2.5 py-1.5 text-xs border transition-all mb-2 ${
    isDark ? "bg-gray-800/60 border-gray-700 text-gray-200 focus:border-blue-500" : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
  } focus:outline-none focus:ring-1 focus:ring-blue-500/30`;
  return (
    <div>
      <label className={cls}>{lbl}</label>
      <input className={inp} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function NumField({ label: lbl, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const isDark = useSys((s) => s.IsDark);
  const cls = `block text-[10px] font-semibold mb-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const inp = `w-full rounded-lg px-2.5 py-1.5 text-xs border transition-all mb-2 ${
    isDark ? "bg-gray-800/60 border-gray-700 text-gray-200 focus:border-blue-500" : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
  } focus:outline-none focus:ring-1 focus:ring-blue-500/30`;
  return (
    <div>
      <label className={cls}>{lbl}</label>
      <input type="number" className={inp} value={value} onChange={e => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function SelectField({ label: lbl, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const isDark = useSys((s) => s.IsDark);
  const cls = `block text-[10px] font-semibold mb-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const inp = `w-full rounded-lg px-2.5 py-1.5 text-xs border transition-all mb-2 ${
    isDark ? "bg-gray-800/60 border-gray-700 text-gray-200 focus:border-blue-500" : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
  } focus:outline-none focus:ring-1 focus:ring-blue-500/30`;
  return (
    <div>
      <label className={cls}>{lbl}</label>
      <select className={inp} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || "—"}</option>)}
      </select>
    </div>
  );
}

function CheckField({ label: lbl, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const isDark = useSys((s) => s.IsDark);
  return (
    <label className={`flex items-center gap-2 mb-2 text-xs cursor-pointer ${isDark ? "text-gray-300" : "text-gray-700"}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-gray-400 text-blue-600" />
      {lbl}
    </label>
  );
}
