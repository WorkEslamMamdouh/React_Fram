'use client';

// =====================================================================================
//  📄 MasterDetail.tsx  —  مكوّن شاشة الماستر ديتيل (فاتورة: رأس + تفاصيل)
// -------------------------------------------------------------------------------------
//  الشاشة ليها وضعين:
//    1) القائمة : جدول DynamicGrid من القالب (View) + زرار "جديد"
//                 دبل كليك أو "تعديل" بيفتح الفورم، و "حذف" بيمسح الماستر وتفاصيله
//    2) الفورم  : حقول الماستر فوق + تاب لكل تفاصيل (جدول صفوف بيتكتب فيه)
//                 + الحسابات (Formula) + المجاميع للماستر (Totals) + الحفظ
//
//  الحفظ:
//    إضافة → SQL.InsertMasterDetail   (الماستر + كل صفوف التفاصيل في عملية واحدة)
//    تعديل → SQL.UpdateMasterDetail   (بيعدّل الماستر، يمسح التفاصيل القديمة، ويحط الجديدة)
//    حذف   → SQL.DeleteMasterDetail
//    وقبل الحفظ: الحقول الإجبارية + IsValid + قواعد Validation.ts
//
//  الاستخدام:  <MasterDetail config={p.config} />   والإعدادات كلها في ملف الـ ts بتاع الشاشة
// =====================================================================================

import React, { useCallback, useMemo, useState } from "react";
import DynamicGrid from "./DynamicGrid";
import SearchModal from "./SearchModal";
import { SQL } from "../../CallDataBase";
import { Sys } from "../../SystemTools";
import { useSys } from "../../SystemUsing";
import { RunValidations, SqlLiteral } from "../../Validation";
import { MasterDetailColumn, MasterDetailConfig } from "./ModelMasterDetail";

type Row = Record<string, any>;

// رقم آمن للحسابات
const n = (v: any): number => {
  const x = Number(v);
  return isNaN(x) ? 0 : x;
};
const round = (v: number) => Math.round(v * 100) / 100;
const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

let uid = 0;
const newUid = () => "r" + ++uid;

// ======================================================================
// #region حسابات
// ======================================================================

// صف فاضي بالقيم الافتراضية
function emptyRow(columns: MasterDetailColumn[]): Row {
  const row: Row = { __uid: newUid() };
  for (const c of columns) {
    if (c.DefaultValue !== undefined && c.DefaultValue !== null) row[c.field] = c.DefaultValue;
    else if (c.type === "checkbox" || c.inputType === "checkbox") row[c.field] = false;
    else row[c.field] = null;
  }
  return row;
}

// الأعمدة المحسوبة في صف واحد
function applyFormulas(row: Row, columns: MasterDetailColumn[]): Row {
  let r = row;
  for (const c of columns) {
    if (c.formula) {
      const v = round(c.formula(r, n));
      if (r[c.field] !== v) r = { ...r, [c.field]: v };
    }
  }
  return r;
}

// بيحسب كل حاجة: صفوف التفاصيل ← المجاميع في الماستر ← حسابات الماستر
function recalc(master: Row, details: Row[][], config: MasterDetailConfig): { master: Row; details: Row[][] } {
  const newDetails = details.map((rows, i) => rows.map((r) => applyFormulas(r, config.details[i]?.columns || [])));
  let m = { ...master };
  config.details.forEach((d, i) => {
    for (const tot of d.totals || []) {
      const rows = newDetails[i] || [];
      m[tot.masterField] = tot.type === "count" ? rows.length : round(rows.reduce((s, r) => s + n(r[tot.detailField || ""]), 0));
    }
  });
  m = applyFormulas(m, config.columns);
  return { master: m, details: newDetails };
}

// صف تفاصيل فاضي = مفيهوش ولا قيمة في الحقول اللي بتتكتب
function isBlankRow(row: Row, columns: MasterDetailColumn[]): boolean {
  return columns
    .filter((c) => c.editable !== false && !c.formula && c.IsSave !== false)
    .every((c) => isEmpty(row[c.field]) || row[c.field] === false || (c.DefaultValue !== undefined && row[c.field] === c.DefaultValue));
}

// تجهيز قيمة للحفظ حسب نوع العمود
function toDbValue(c: MasterDetailColumn, v: any): any {
  const t = c.inputType || c.type;
  if (t === "checkbox") return v === true || v === 1 || v === "1" || v === "true";
  if (t === "number") return isEmpty(v) ? null : Number(v);
  if (isEmpty(v)) return null;
  if (t === "date") return String(v).substring(0, 10);
  return v;
}

// الصف اللي بيتبعت للخادم: الأعمدة اللي IsSave بس
function buildSaveRow(row: Row, columns: MasterDetailColumn[], skip: string[]): Row {
  const out: Row = {};
  for (const c of columns) {
    if (c.IsSave === false || skip.includes(c.field)) continue;
    out[c.NameDataBase || c.field] = toDbValue(c, row[c.field]);
  }
  return out;
}
// #endregion

// ======================================================================
// #region خانة الإدخال
// ======================================================================
interface FieldInputProps {
  col: MasterDetailColumn;
  value: any;
  onChange: (v: any) => void;
  onSearch: () => void;
  disabled: boolean;
  error?: string;
  compact?: boolean;
  isDark: boolean;
  t: (en: string, ar: string) => string;
}

function FieldInput({ col, value, onChange, onSearch, disabled, error, compact, isDark, t }: FieldInputProps) {
  const type = col.inputType || col.type || "text";
  const base = `w-full border rounded-lg ${compact ? "px-2 py-1.5" : "px-3 py-2.5"} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition`;
  const theme = isDark ? "bg-gray-800/70 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900";
  const err = error ? "border-red-500 ring-1 ring-red-400" : "";
  const dis = disabled ? "opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800/40" : "";
  const cls = `${base} ${theme} ${err} ${dis}`;

  if (col.formula || (disabled && type !== "checkbox")) {
    const shown = isEmpty(value) ? "-" : type === "date" ? String(value).substring(0, 10) : typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
    return <div className={`${cls} font-semibold`}>{shown}</div>;
  }

  if (type === "select") {
    const options = col.selectOptions || col.options || [];
    return (
      <select
        className={cls}
        value={value ?? ""}
        onChange={(e) => {
          const opt = options.find((o) => String(o.value) === e.target.value);
          onChange(opt ? opt.value : null);
        }}
      >
        <option value="">{t("Select...", "اختر...")}</option>
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  if (type === "search") {
    return (
      <div className="flex gap-1">
        <input className={`${cls} flex-1`} value={value ?? ""} readOnly placeholder={col.placeholder || t("Search...", "بحث...")} onDoubleClick={onSearch} />
        <button type="button" onClick={onSearch} className="px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">🔍</button>
        {!isEmpty(value) && (
          <button type="button" onClick={() => onChange(null)} className="px-2 rounded-lg bg-gray-400 hover:bg-gray-500 text-white text-xs">✕</button>
        )}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <input
        type="checkbox"
        className="w-5 h-5 cursor-pointer"
        checked={value === true || value === 1 || value === "1"}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (type === "number") {
    return (
      <input
        type="number"
        className={cls}
        value={value ?? ""}
        step={col.step}
        min={col.min}
        max={col.max}
        placeholder={col.placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    );
  }

  if (type === "date") {
    return <input type="date" className={cls} value={value ? String(value).substring(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} />;
  }

  if (type === "textarea") {
    return <textarea className={cls} rows={col.rows || 2} value={value ?? ""} placeholder={col.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }

  return <input type="text" className={cls} value={value ?? ""} placeholder={col.placeholder} onChange={(e) => onChange(e.target.value)} />;
}
// #endregion

// ======================================================================
// #region المكوّن
// ======================================================================
type SearchTarget = { col: MasterDetailColumn; detail: number; rowIndex: number }; // detail = -1 للماستر

export default function MasterDetail({ config, height = "calc(100vh - 140px)" }: { config: MasterDetailConfig; height?: string }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const lang = useSys((s) => s.lang);
  const isDark = useSys((s) => s.IsDark);
  const ShowLoader = useSys((s) => s.ShowLoader);
  const CloseLoader = useSys((s) => s.CloseLoader);
  const t = useCallback((en: string, ar: string) => (IsLangEN ? en : ar), [IsLangEN]);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [isInsert, setIsInsert] = useState(true);
  const [viewOnly, setViewOnly] = useState(false);     // true = فتح الفاتورة للعرض بس
  const [master, setMaster] = useState<Row>({});
  const [details, setDetails] = useState<Row[][]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);
  const [gridKey, setGridKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const enableInsert = config.enableInsert !== false;
  const enableUpdate = config.enableUpdate !== false;
  const enableDelete = config.enableDelete !== false;
  const enableView = config.enableView !== false;
  const enablePrint = config.enablePrint !== false;

  const card = isDark ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = isDark ? "text-gray-400" : "text-gray-500";

  // ---------- تحديث القيم + إعادة الحساب ----------
  const update = (m: Row, d: Row[][]) => {
    const r = recalc(m, d, config);
    setMaster(r.master);
    setDetails(r.details);
  };

  const setMasterField = (field: string, value: any, extra?: Row) => {
    update({ ...master, [field]: value, ...(extra || {}) }, details);
    if (errors["m." + field]) setErrors({ ...errors, ["m." + field]: "" });
  };

  const setDetailField = (d: number, i: number, field: string, value: any, extra?: Row) => {
    const nd = details.map((rows, di) => (di !== d ? rows : rows.map((r, ri) => (ri !== i ? r : { ...r, [field]: value, ...(extra || {}) }))));
    update(master, nd);
    const k = `d${d}.${i}.${field}`;
    if (errors[k]) setErrors({ ...errors, [k]: "" });
  };

  const addRow = (d: number) => {
    const nd = details.map((rows, di) => (di !== d ? rows : [...rows, emptyRow(config.details[d].columns)]));
    update(master, nd);
  };

  const removeRow = (d: number, i: number) => {
    const nd = details.map((rows, di) => (di !== d ? rows : rows.filter((_, ri) => ri !== i)));
    update(master, nd);
  };

  // ---------- فتح فورم جديد ----------
  const openNew = () => {
    setIsInsert(true);
    setViewOnly(false);
    setErrors({});
    setActiveTab(0);
    update(emptyRow(config.columns), config.details.map((d) => [emptyRow(d.columns)]));
    setMode("form");
  };

  // ---------- فتح فورم تعديل (أو عرض بس لو readOnly) ----------
  const openEdit = useCallback(
    async (row: Row, readOnly: boolean = false) => {
      const id = row?.[config.keyColumn];
      if (isEmpty(id)) return;
      try {
        ShowLoader();
        const keyCond = `${config.keyColumn} = ${SqlLiteral(id)}`;
        // الماستر من الجدول نفسه (القيم اللي بتتحفظ) + قيم القالب للعرض
        const m = await SQL.Select(config.tableName, keyCond);
        const masterRow: Row = { ...row, ...(m.data[0] || {}), __uid: newUid() };
        // كل تفاصيل من القالب بتاعها (أو الجدول)
        const loaded: Row[][] = [];
        for (const d of config.details) {
          const res = await SQL.Select(d.viewName || d.tableName, `${d.foreignKeyColumn} = ${SqlLiteral(id)}`, null, null, null, 0, d.orderBy || d.keyColumn, "ASC");
          loaded.push((res.data || []).map((r: Row) => ({ ...r, __uid: newUid() })));
        }
        setIsInsert(false);
        setViewOnly(readOnly);
        setErrors({});
        setActiveTab(0);
        update(masterRow, loaded);
        setMode("form");
      } catch (e) {
        Sys.ShowMessage("❌ Failed to load record: " + Sys.GetErrorMessage(e), "❌ فشل تحميل السجل: " + Sys.GetErrorMessage(e), "error");
      } finally {
        CloseLoader();
      }
    },
    [config]
  );

  // ---------- حذف ----------
  const deleteRecord = useCallback(
    async (row: Row) => {
      const id = row?.[config.keyColumn];
      if (isEmpty(id)) return;
      if (!confirm(t(`Delete record ${id} and all its details?`, `حذف السجل رقم ${id} وكل تفاصيله؟`))) return;
      const request: any = {
        compCode: config.compCode,
        branchCode: config.branchCode,
        keyTrType: config.keyTrType || "",
        masterKeyColumn: config.keyColumn,
        runProcessTrans: !!config.runProcessTrans,
        master: { tableName: config.tableName, keyColumn: config.keyColumn, id: Number(id) },
      };
      config.details.forEach((d, i) => {
        request["detail_" + (i + 1)] = {
          detailForeignKeyColumn: d.foreignKeyColumn,
          delete_Details: { tableName: d.tableName, keyColumn: d.foreignKeyColumn, deleteAllRelated: true },
        };
      });
      try {
        const res = await SQL.DeleteMasterDetail(request, ShowLoader, CloseLoader);
        if (res?.IsSuccess) {
          Sys.ShowMessage("✅ Deleted", "✅ تم الحذف", "success");
          setGridKey((k) => k + 1);
        } else {
          Sys.ShowMessage("❌ " + (res?.ErrorMessage || "Error"), "❌ " + (res?.ErrorMessage || "خطأ"), "error");
        }
      } catch (e) {
        const msg = Sys.GetErrorMessage(e);
        Sys.ShowMessage("❌ Failed to delete: " + msg, "❌ فشل الحذف: " + msg, "error");
      }
    },
    [config, t]
  );

  // ---------- التحقق قبل الحفظ ----------
  const validateBuiltIn = (cleanDetails: Row[][]): { key: string; message: string; tab?: number } | null => {
    const fieldOk = (c: MasterDetailColumn, row: Row, editableNow: boolean) => {
      if (!editableNow || c.formula) return null;
      const v = row[c.field];
      if (c.IsRequired && isEmpty(v)) return c.validationMessage || t(`${c.title} is required`, `${c.title} مطلوب`);
      if (c.IsValid && !isEmpty(v) && !c.IsValid(v, row)) return c.validationMessage || t(`Invalid value for ${c.title}`, `قيمة غير صحيحة في ${c.title}`);
      return null;
    };
    for (const c of config.columns) {
      const editableNow = isInsert ? c.insertable !== false : c.editable !== false;
      const err = fieldOk(c, master, editableNow);
      if (err) return { key: "m." + c.field, message: err };
    }
    for (let d = 0; d < config.details.length; d++) {
      const rows = cleanDetails[d] || [];
      for (let i = 0; i < rows.length; i++) {
        for (const c of config.details[d].columns) {
          const err = fieldOk(c, rows[i], c.editable !== false);
          if (err) return { key: `d${d}.${i}.${c.field}`, message: t(`Row ${i + 1}: `, `صف ${i + 1}: `) + err, tab: d };
        }
      }
    }
    return null;
  };

  // ---------- الحفظ ----------
  const save = async () => {
    if (saving) return;
    // الصفوف الفاضية في التفاصيل بتتشال
    const clean = details.map((rows, d) => rows.filter((r) => !isBlankRow(r, config.details[d].columns)));
    const final = recalc(master, clean, config);

    const builtIn = validateBuiltIn(final.details);
    if (builtIn) {
      setErrors({ [builtIn.key]: builtIn.message });
      if (builtIn.tab !== undefined) setActiveTab(builtIn.tab);
      Sys.ShowMessage("❌ " + builtIn.message, "❌ " + builtIn.message, "error");
      return;
    }

    setSaving(true);
    try {
      ShowLoader();
      const vErr = await RunValidations(config.validations, final.master, final.details, {
        isInsert,
        isLangEN: IsLangEN,
        tableName: config.tableName,
        keyColumn: config.keyColumn,
        details: config.details.map((d) => ({ tableName: d.tableName, keyColumn: d.keyColumn })),
      });
      if (vErr) {
        if (vErr.detail) {
          setActiveTab(vErr.detail - 1);
          setErrors(vErr.field && vErr.rowIndex !== undefined ? { [`d${vErr.detail - 1}.${vErr.rowIndex}.${vErr.field}`]: vErr.message } : {});
        } else if (vErr.field) {
          setErrors({ ["m." + vErr.field]: vErr.message });
        }
        Sys.ShowMessage("❌ " + vErr.message, "❌ " + vErr.message, "error");
        return;
      }

      // الماستر
      const masterData = buildSaveRow(final.master, config.columns, isInsert ? [config.keyColumn] : []);
      if (!isInsert) masterData[config.keyColumn] = final.master[config.keyColumn];

      const request: any = {
        compCode: config.compCode,
        branchCode: config.branchCode,
        keyTrType: config.keyTrType || "",
        masterKeyColumn: config.keyColumn,
        runProcessTrans: !!config.runProcessTrans,
        master: isInsert
          ? { tableName: config.tableName, data: masterData }
          : { tableName: config.tableName, keyColumn: config.keyColumn, data: masterData },
      };

      // التفاصيل: في التعديل بنمسح القديمة كلها ونحط الجديدة
      config.details.forEach((d, i) => {
        const dataList = final.details[i].map((r) => buildSaveRow(r, d.columns, [d.keyColumn, d.foreignKeyColumn]));
        const wrapper: any = { detailForeignKeyColumn: d.foreignKeyColumn };
        if (dataList.length > 0) wrapper.bulkInsertRequest = { tableName: d.tableName, dataList };
        if (!isInsert) wrapper.delete_Details = { tableName: d.tableName, keyColumn: d.foreignKeyColumn, deleteAllRelated: true };
        request["detail_" + (i + 1)] = wrapper;
      });

      const res = isInsert ? await SQL.InsertMasterDetail(request, null, null) : await SQL.UpdateMasterDetail(request, null, null);

      if (res?.IsSuccess) {
        const id = res.Response?.Master?.Id ?? final.master[config.keyColumn];
        Sys.ShowMessage(isInsert ? `✅ Saved (No. ${id})` : "✅ Updated", isInsert ? `✅ تم الحفظ (رقم ${id})` : "✅ تم التعديل", "success");
        setMode("list");
        setGridKey((k) => k + 1);
      } else {
        Sys.ShowMessage("❌ " + (res?.ErrorMessage || "Error"), "❌ " + (res?.ErrorMessage || "خطأ"), "error");
      }
    } catch (e) {
      const msg = Sys.GetErrorMessage(e);
      Sys.ShowMessage("❌ Failed to save: " + msg, "❌ فشل الحفظ: " + msg, "error");
    } finally {
      setSaving(false);
      CloseLoader();
    }
  };

  // ---------- اختيار من نافذة البحث ----------
  const onSearchSelect = (value: any, row: Row) => {
    if (!searchTarget) return;
    const { col, detail, rowIndex } = searchTarget;
    const extra: Row = {};
    for (const [target, source] of Object.entries(col.fillFrom || {})) extra[target] = row?.[source];
    if (detail < 0) setMasterField(col.field, value, extra);
    else setDetailField(detail, rowIndex, col.field, value, extra);
    setSearchTarget(null);
  };

  // ---------- أعمدة القائمة: أي عمود فيه اختيارات بيظهر باسم الاختيار مش رقمه ----------
  const listColumns = useMemo(
    () =>
      config.listColumns.map((c) => {
        const options = c.selectOptions || c.options;
        if (!options || options.length === 0 || c.itemTemplate) return c;
        return {
          ...c,
          itemTemplate: (value: any) => {
            const o = options.find((x) => String(x.value) === String(value));
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                {o ? o.label : isEmpty(value) ? "-" : String(value)}
              </span>
            );
          },
        };
      }),
    [config.listColumns]
  );

  // ---------- الطباعة ----------
  //  لسه مش متبرمجة: لو الشاشة مدية config.onPrint بتتنفذ، غير كده بتظهر رسالة
  const printRecord = useCallback(
    (row: Row) => {
      if (config.onPrint) config.onPrint(row);
      else Sys.ShowMessage("🖨️ Printing is coming soon", "🖨️ الطباعة هتبقى متاحة قريب", "info");
    },
    [config]
  );

  // ---------- أزرار القائمة (الإجراءات) ----------
  const extraActions = useMemo(() => {
    const list: any[] = [];
    if (enableView) list.push({ key: "md_view", label: t("View", "عرض"), icon: "👁️", onClick: (row: Row) => openEdit(row, true), isVisible: true });
    if (enableUpdate) list.push({ key: "md_edit", label: t("Edit", "تعديل"), icon: "✏️", onClick: (row: Row) => openEdit(row), isVisible: true });
    if (enablePrint) list.push({ key: "md_print", label: t("Print", "طباعة"), icon: "🖨️", onClick: (row: Row) => printRecord(row), isVisible: true });
    if (enableDelete) list.push({ key: "md_delete", label: t("Delete", "حذف"), icon: "🗑️", onClick: (row: Row) => deleteRecord(row), isVisible: true });
    return list;
  }, [enableView, enableUpdate, enablePrint, enableDelete, t, openEdit, printRecord, deleteRecord]);

  // ======================================================================
  // القائمة
  // ======================================================================
  if (mode === "list") {
    return (
      <div className="space-y-3">
        {enableInsert && (
          <div className="flex justify-end">
            <button onClick={openNew} className="px-5 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-md">
              ➕ {config.newTitle || t("New", "جديد")}
            </button>
          </div>
        )}
        <DynamicGrid
          key={gridKey}
          tableName={config.viewName || config.tableName}
          keyColumn={config.keyColumn}
          columns={listColumns}
          condition={config.condition}
          orderBy={config.orderBy || config.keyColumn}
          orderType={config.orderType || "DESC"}
          pageSize={config.pageSize || 10}
          enableInsert={false}
          enableUpdate={false}
          enableDelete={false}
          enableSearch={true}
          enableExport={true}
          enableSort={true}
          enableAdvancedFilter={(config.filterFields || []).length > 0}
          filterFields={config.filterFields}
          defaultFilters={config.defaultFilters}
          extraActions={extraActions}
          onRowDoubleClick={enableUpdate ? (row: Row) => openEdit(row) : enableView ? (row: Row) => openEdit(row, true) : undefined}
          height={height}
        />
      </div>
    );
  }

  // ======================================================================
  // الفورم
  // ======================================================================
  const masterVisible = config.columns.filter((c) => c.IsVisibleDisplayInGrid !== false || c.insertable !== false || c.editable !== false);
  const masterFields = masterVisible.filter((c) => {
    const editableNow = isInsert ? c.insertable !== false : c.editable !== false;
    return editableNow || c.formula || c.IsVisibleDisplayInGrid !== false;
  }).sort((a, b) => (a.SortFieldInEditAndAdd || 999) - (b.SortFieldInEditAndAdd || 999));
  const totalFields = new Set(config.details.flatMap((d) => (d.totals || []).map((x) => x.masterField)));

  return (
    <div className="space-y-4">
      {/* ===== شريط الأزرار ===== */}
      <div className={`rounded-2xl border shadow-lg p-3 flex flex-wrap items-center gap-2 ${card}`}>
        <button onClick={() => setMode("list")} className={`px-4 py-2 rounded-xl border-2 font-medium ${isDark ? "border-gray-600 hover:border-blue-500" : "border-gray-300 hover:border-blue-600"}`}>
          {IsLangEN ? "← " : "→ "}{t("Back", "رجوع")}
        </button>
        <h2 className="text-lg font-bold flex-1 min-w-0 truncate">
          {isInsert ? config.newTitle || t("New", "جديد") : `${config.editTitle || t("Edit", "تعديل")} ${master[config.keyColumn] ?? ""}`}
          {viewOnly && <span className={`mx-2 px-2 py-0.5 rounded-full text-xs font-semibold align-middle ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-700"}`}>👁️ {t("View only", "عرض بس")}</span>}
        </h2>
        {viewOnly && enablePrint && (
          <button onClick={() => printRecord(master)} className={`px-4 py-2 rounded-xl border-2 font-medium ${isDark ? "border-gray-600 hover:border-blue-500" : "border-gray-300 hover:border-blue-600"}`}>
            🖨️ {t("Print", "طباعة")}
          </button>
        )}
        {viewOnly && enableUpdate && (
          <button onClick={() => setViewOnly(false)} className="px-5 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 shadow-md">
            ✏️ {t("Edit", "تعديل")}
          </button>
        )}
        {!viewOnly && (
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 shadow-md disabled:opacity-50"
          >
            💾 {saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
          </button>
        )}
      </div>

      {/* ===== الماستر ===== */}
      <div className={`rounded-2xl border shadow-lg p-4 ${card}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {masterFields.map((c) => {
            const editableNow = (isInsert ? c.insertable !== false : c.editable !== false) && !c.IsDisabledInEdit === !(!isInsert && c.IsDisabledInEdit);
            const disabled = viewOnly || !editableNow || (!isInsert && !!c.IsDisabledInEdit) || (isInsert && !!c.IsDisabledInAdd) || totalFields.has(c.field);
            const errKey = "m." + c.field;
            return (
              <div key={c.field} className={c.inputType === "textarea" ? "sm:col-span-2" : ""}>
                <label className={`block text-sm font-semibold mb-1 ${muted}`}>
                  {c.title}
                  {c.IsRequired && !disabled && <span className="text-red-500 mx-1">*</span>}
                </label>
                <FieldInput
                  col={c}
                  value={master[c.field]}
                  onChange={(v) => setMasterField(c.field, v)}
                  onSearch={() => setSearchTarget({ col: c, detail: -1, rowIndex: -1 })}
                  disabled={disabled}
                  error={errors[errKey]}
                  isDark={isDark}
                  t={t}
                />
                {errors[errKey] && <p className="text-red-500 text-xs mt-1">{errors[errKey]}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== التفاصيل ===== */}
      {config.details.length > 0 && (
        <div className={`rounded-2xl border shadow-lg ${card}`}>
          {config.details.length > 1 && (
            <div className={`flex gap-1 px-3 pt-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              {config.details.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 rounded-t-xl text-sm font-semibold ${activeTab === i ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : muted}`}
                >
                  {d.title} ({(details[i] || []).length})
                </button>
              ))}
            </div>
          )}

          {config.details.map((d, di) => {
            if (di !== activeTab) return null;
            const rows = details[di] || [];
            const cols = d.columns.filter((c) => c.IsVisibleDisplayInGrid !== false);
            const sumFields = new Set((d.totals || []).filter((x) => (x.type || "sum") === "sum").map((x) => x.detailField));
            return (
              <div key={di} className="p-3">
                {config.details.length === 1 && <h3 className="font-bold mb-2">{d.title}</h3>}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? "bg-gray-800" : "bg-gray-100"}>
                        <th className="p-2 w-10">#</th>
                        {cols.map((c) => (
                          <th key={c.field} className="p-2 text-start font-semibold whitespace-nowrap" style={{ minWidth: c.width || 120 }}>
                            {c.title}
                            {c.IsRequired && c.editable !== false && !c.formula && <span className="text-red-500 mx-1">*</span>}
                          </th>
                        ))}
                        <th className="p-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, ri) => (
                        <tr key={r.__uid || ri} className={`border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                          <td className={`p-2 text-center ${muted}`}>{ri + 1}</td>
                          {cols.map((c) => {
                            const errKey = `d${di}.${ri}.${c.field}`;
                            return (
                              <td key={c.field} className="p-1 align-top">
                                <FieldInput
                                  col={c}
                                  value={r[c.field]}
                                  onChange={(v) => setDetailField(di, ri, c.field, v)}
                                  onSearch={() => setSearchTarget({ col: c, detail: di, rowIndex: ri })}
                                  disabled={viewOnly || c.editable === false}
                                  error={errors[errKey]}
                                  compact
                                  isDark={isDark}
                                  t={t}
                                />
                              </td>
                            );
                          })}
                          <td className="p-1 text-center">
                            {!viewOnly && <button onClick={() => removeRow(di, ri)} title={t("Delete row", "حذف الصف")} className="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50">🗑️</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {sumFields.size > 0 && rows.length > 0 && (
                      <tfoot>
                        <tr className={`font-bold ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                          <td className="p-2 text-center">Σ</td>
                          {cols.map((c) => (
                            <td key={c.field} className="p-2">
                              {sumFields.has(c.field) ? round(rows.reduce((s, x) => s + n(x[c.field]), 0)).toLocaleString() : ""}
                            </td>
                          ))}
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                {!viewOnly && (
                  <button onClick={() => addRow(di)} className="mt-3 px-4 py-2 rounded-xl border-2 border-dashed border-blue-400 text-blue-600 font-semibold hover:bg-blue-50 w-full">
                    ➕ {t("Add row", "إضافة صف")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== نافذة البحث ===== */}
      {searchTarget && searchTarget.col.searchModal && (
        <SearchModal
          isOpen={true}
          onClose={() => setSearchTarget(null)}
          onSelect={onSearchSelect}
          config={searchTarget.col.searchModal}
          lang={lang}
          isDark={isDark}
        />
      )}
    </div>
  );
}
// #endregion
