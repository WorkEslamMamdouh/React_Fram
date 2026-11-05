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

import React, { useCallback, useMemo, useState, lazy, Suspense } from "react";
import DynamicGrid from "./DynamicGrid";
import DynamicSelect from "./DynamicSelect";
import { FORM_LAYOUT_GRID_CLASS, arrangeByLayout, formLayoutCellClass, formLayoutCellStyle, FormLayoutStatic } from "./FormLayout";
const SearchModal = lazy(() => import("./SearchModal"));
import { SQL } from "../../CallDataBase";
import { Sys } from "../../SystemTools";
import { useSys } from "../../SystemUsing";
import { RunValidations, SqlLiteral } from "../../Validation";
import { MasterDetailColumn, MasterDetailConfig } from "./ModelMasterDetail";
import { ColumnMode } from "./ModelGrid";
import { useEffectiveModulePermissions } from "../../Permissions";
// Phase 6: إكسل (اختياري) — بيظهر بس لو config.excel.enabled
import { ExcelMasterBar, ExcelDetailsBar } from "../Excel/ExcelMasterDetailBars";
// Phase 7: طباعة التقارير (اختياري) — config.report
import { openReport } from "../../Reports/openReport";

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
export function emptyRow(columns: MasterDetailColumn[]): Row {
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
export function recalc(master: Row, details: Row[][], config: MasterDetailConfig): { master: Row; details: Row[][] } {
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
export function isBlankRow(row: Row, columns: MasterDetailColumn[]): boolean {
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
export function buildSaveRow(row: Row, columns: MasterDetailColumn[], skip: string[]): Row {
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
  row?: Record<string, any>;   // الصف الحالي — عشان {row.X} في شرط selectSearch / search
}

// يبدّل {row.X} أو {X} في النص بقيمة فعلية من row (مع تحويل آمن للنص)
export function resolveRowPlaceholders(input: string, row?: Record<string, any>): string {
  if (!input || !row) return input || "";
  return input.replace(/\{row\.([A-Za-z_][A-Za-z0-9_]*)\}|\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, k1, k2) => {
    const key = k1 || k2;
    const v = row[key];
    if (v === null || v === undefined || v === "") return "NULL";
    if (typeof v === "number") return String(v);
    if (typeof v === "boolean") return v ? "1" : "0";
    return "N'" + String(v).replace(/'/g, "''") + "'";
  });
}

export function FieldInput({ col, value, onChange, onSearch, disabled, error, compact, isDark, t, row }: FieldInputProps) {
  const type = col.inputType || col.type || "text";
  const base = `w-full border rounded-lg ${compact ? "px-2 h-9" : "px-3 h-10 md:h-9"} text-[13px] focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition ${type === "number" ? "num" : ""}`;
  const theme = "bg-erp-surface border-erp-border-strong text-erp-text placeholder:text-erp-text-subtle";
  const err = error ? "!border-erp-danger" : "";
  const dis = disabled ? "opacity-80 cursor-not-allowed !bg-erp-surface-2" : "";
  const cls = `${base} ${theme} ${err} ${dis}`;

  if (col.formula || (disabled && type !== "checkbox")) {
    const shown = isEmpty(value) ? "-" : type === "date" ? String(value).substring(0, 10) : typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
    return <div className={`${cls} font-semibold flex items-center`}>{shown}</div>;
  }

  if (type === "selectSearch" && (col as any).selectConfig) {
    const sc = (col as any).selectConfig as { tableName: string; displayField: string; valueField: string; condition?: string };
    const resolved = { ...sc, condition: resolveRowPlaceholders(sc.condition || "", row) };
    return (
      <DynamicSelect
        config={resolved}
        value={value}
        onChange={(v: any) => onChange(v === "" || v == null ? null : v)}
        disabled={disabled}
        error={!!error}
      />
    );
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
        <button type="button" onClick={onSearch} className="px-2.5 rounded-lg bg-erp-accent hover:bg-erp-accent-hover text-white text-sm">🔍</button>
        {!isEmpty(value) && (
          <button type="button" onClick={() => onChange(null)} className="px-2 rounded-lg bg-erp-surface-3 hover:bg-erp-border-strong text-erp-text text-xs">✕</button>
        )}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <input
        type="checkbox"
        className="size-4 cursor-pointer accent-[var(--erp-accent)]"
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

// دوال بتتبعت لمكونات الإكسل (بدل ما هي تستورد من الملف ده وتعمل استيراد دائري)
const excelHelpers = { emptyRow, recalc, buildSaveRow };

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

  // ✅ صلاحيات اختيارية (config.moduleCode / config.permissions) — مش متحددين = السلوك القديم
  const modulePerm = useEffectiveModulePermissions(config.moduleCode, config.permissions);
  const enableInsert = config.enableInsert !== false && (modulePerm ? modulePerm.create : true);
  const enableUpdate = config.enableUpdate !== false && (modulePerm ? modulePerm.edit : true);
  const enableDelete = config.enableDelete !== false && (modulePerm ? modulePerm.delete : true);
  const enableView = config.enableView !== false && (modulePerm ? modulePerm.view : true);
  const enablePrint = config.enablePrint !== false && (modulePerm ? modulePerm.print : true);

  // ✅ Phase 6: الإكسل (اختياري). محتاج صلاحية الإضافة. معاملات كتير في القايمة · سطور تفاصيل جوه الفورم.
  const excelCfg = config.excel && config.excel.enabled ? config.excel : null;
  const excelMulti = !!excelCfg && enableInsert && (excelCfg.mode === "multiTransaction" || excelCfg.mode === "both");
  const excelDetailsIdx = excelCfg && enableInsert && (excelCfg.mode === "detailsOnly" || excelCfg.mode === "both") && config.details.length > 0
    ? Math.min(Math.max(0, excelCfg.detailIndex ?? 0), config.details.length - 1)
    : -1;

  const card = "bg-erp-surface border-erp-border text-erp-text";
  const muted = "text-erp-text-muted";

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

  // ---------- إضافة سطور للتفاصيل (من الإكسل): الصف الفاضي الأول بيتشال ثم السطور بتتضاف ----------
  const appendDetailRows = (d: number, rows: Row[]) => {
    if (!rows.length) return;
    const nd = details.map((rs, di) => (di !== d ? rs : [...rs.filter((r) => !isBlankRow(r, config.details[d].columns)), ...rows.map((r) => ({ ...r, __uid: newUid() }))]));
    update(master, nd);
    setActiveTab(d);
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
      if (!(await Sys.Confirm(`Delete record ${id} and all its details?`, `حذف السجل رقم ${id} وكل تفاصيله؟`, { danger: true }))) return;
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
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-erp-accent-soft text-erp-accent">
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
      else if (config.report?.transaction) openReport({ reportCode: config.report.transaction.reportCode, title: config.report.transaction.title, moduleCode: config.moduleCode, row, trId: row?.[config.keyColumn] });
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
          <div className="flex flex-wrap justify-end gap-2">
            {excelMulti && excelCfg && (
              <ExcelMasterBar config={config} excel={excelCfg} helpers={excelHelpers} onDone={() => setGridKey((k) => k + 1)} />
            )}
            <button onClick={openNew} className="px-5 h-11 md:h-9 rounded-lg text-white text-[13px] font-semibold bg-erp-accent hover:bg-erp-accent-hover transition-colors">
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
          {...(config.report?.list ? { report: { list: config.report.list }, moduleCode: config.moduleCode, permissions: { print: enablePrint } } : {})}
        />
      </div>
    );
  }

  // ======================================================================
  // الفورم
  // ======================================================================
  const formMode: ColumnMode = viewOnly ? "view" : isInsert ? "create" : "edit";
  const masterVisible = config.columns.filter((c) => c.IsVisibleDisplayInGrid !== false || c.insertable !== false || c.editable !== false);
  const masterFields = masterVisible.filter((c) => {
    if (c.visibleWhen && !c.visibleWhen(master, formMode)) return false;
    if (formMode === "view") return c.visibleInView ?? true;
    if (formMode === "create") return (c.visibleInCreate ?? (c.insertable !== false)) || !!c.formula || c.IsVisibleDisplayInGrid !== false;
    if (formMode === "edit") return (c.visibleInEdit ?? (c.editable !== false)) || !!c.formula || c.IsVisibleDisplayInGrid !== false;
    return true;
  }).sort((a, b) => (a.SortFieldInEditAndAdd || 999) - (b.SortFieldInEditAndAdd || 999));
  const totalFields = new Set(config.details.flatMap((d) => (d.totals || []).map((x) => x.masterField)));

  return (
    <div className="space-y-4 pb-2">
      {/* ===== العنوان ===== */}
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-[22px] md:text-[28px] leading-9 font-bold text-erp-text flex-1 min-w-0 truncate">
          {isInsert ? config.newTitle || t("New", "جديد") : `${config.editTitle || t("Edit", "تعديل")} `}
          {!isInsert && <bdi dir="ltr" className="num">{master[config.keyColumn] ?? ""}</bdi>}
          {viewOnly && <span className="mx-2 px-2 py-0.5 rounded-md text-[11px] font-semibold align-middle bg-erp-surface-2 text-erp-text-muted border border-erp-border">👁️ {t("View only", "عرض بس")}</span>}
        </h2>
      </div>

      {/* ===== الماستر ===== */}
      <div className={`rounded-xl border shadow-erp-1 p-4 md:p-5 ${card}`}>
        <div className={config.formLayout && config.formLayout.length > 0 ? FORM_LAYOUT_GRID_CLASS : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"}>
          {(config.formLayout && config.formLayout.length > 0
            ? arrangeByLayout(masterFields, config.formLayout)
            : masterFields.map((c) => ({ cell: undefined as any, col: c }))
          ).map((item, idx) => {
            if (!item.col) return <div key={`s${idx}`} className={formLayoutCellClass(item.cell)} style={formLayoutCellStyle(item.cell)}><FormLayoutStatic cell={item.cell} isEN={IsLangEN} /></div>;
            const c = item.col;
            const editableNow = (isInsert ? c.insertable !== false : c.editable !== false) && !c.IsDisabledInEdit === !(!isInsert && c.IsDisabledInEdit);
            const disabled = viewOnly || !editableNow || (!isInsert && !!c.IsDisabledInEdit) || (isInsert && !!c.IsDisabledInAdd) || totalFields.has(c.field);
            const errKey = "m." + c.field;
            return (
              <div key={c.field} className={item.cell ? formLayoutCellClass(item.cell) : c.inputType === "textarea" ? "sm:col-span-2" : ""} style={item.cell ? formLayoutCellStyle(item.cell) : undefined}>
                <label className="block text-[13px] font-medium mb-1 text-erp-text">
                  {c.title}
                  {c.IsRequired && !disabled && <span className="text-erp-danger mx-1">*</span>}
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
                  row={master}
                />
                {errors[errKey] && <p className="text-erp-danger text-xs mt-1">{errors[errKey]}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== التفاصيل ===== */}
      <DetailsEditor
        configs={config.details}
        allRows={details}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewOnly={viewOnly}
        errors={errors}
        onChange={setDetailField}
        onSearch={(c, di, ri) => setSearchTarget({ col: c, detail: di, rowIndex: ri })}
        onAddRow={addRow}
        onRemoveRow={removeRow}
        renderToolbar={
          excelDetailsIdx >= 0 && excelCfg && !viewOnly
            ? (di) => (di === excelDetailsIdx ? <ExcelDetailsBar config={config} excel={excelCfg} helpers={excelHelpers} onAppend={(rows) => appendDetailRows(di, rows)} /> : null)
            : undefined
        }
        isDark={isDark}
        t={t}
        card={card}
        muted={muted}
      />

      {/* ===== شريط الأزرار (ثابت تحت) ===== */}
      <div className="sticky bottom-0 z-20 -mx-4 md:-mx-6 xl:-mx-8 -mb-4 md:-mb-6 xl:-mb-8 px-4 md:px-6 xl:px-8 py-3 bg-erp-surface border-t border-erp-border flex flex-wrap items-center gap-2 justify-end">
        <button onClick={() => setMode("list")} className="px-4 h-11 md:h-9 rounded-lg border border-erp-border bg-erp-surface text-erp-text text-[13px] font-medium hover:bg-erp-surface-2 transition-colors me-auto">
          {IsLangEN ? "← " : "→ "}{t("Back", "رجوع")}
        </button>
        {enablePrint && (viewOnly || (!!config.report?.transaction && !!master[config.keyColumn])) && (
          <button onClick={() => printRecord(master)} className="px-4 h-11 md:h-9 rounded-lg border border-erp-border bg-erp-surface text-erp-text text-[13px] font-medium hover:bg-erp-surface-2 transition-colors">
            🖨️ {t("Print", "طباعة")}
          </button>
        )}
        {viewOnly && enableUpdate && (
          <button onClick={() => setViewOnly(false)} className="px-5 h-11 md:h-9 rounded-lg text-white text-[13px] font-semibold bg-erp-accent hover:bg-erp-accent-hover transition-colors">
            ✏️ {t("Edit", "تعديل")}
          </button>
        )}
        {!viewOnly && (
          <button
            onClick={save}
            disabled={saving}
            className="px-6 h-11 md:h-9 rounded-lg text-white text-[13px] font-semibold bg-erp-accent hover:bg-erp-accent-hover transition-colors disabled:opacity-50"
          >
            💾 {saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
          </button>
        )}
      </div>

      {/* ===== نافذة البحث — lazy loaded ===== */}
      {searchTarget && searchTarget.col.searchModal && (() => {
        const baseCfg: any = searchTarget.col.searchModal;
        const contextRow = searchTarget.detail < 0
          ? master
          : (details[searchTarget.detail] || [])[searchTarget.rowIndex] || {};
        const resolvedCfg = {
          ...baseCfg,
          condition: resolveRowPlaceholders(baseCfg.condition || "", contextRow),
        };
        return (
          <Suspense fallback={null}>
            <SearchModal
              isOpen={true}
              onClose={() => setSearchTarget(null)}
              onSelect={onSearchSelect}
              config={resolvedCfg}
              lang={lang}
              isDark={isDark}
            />
          </Suspense>
        );
      })()}
    </div>
  );
}
// #endregion
// ======================================================================
// #region محرر التفاصيل (مشترك بين الماستر ديتيل وشاشة الشجرة)
// ======================================================================
export interface DetailsEditorProps {
  configs: MasterDetailConfig["details"];
  allRows: Row[][];
  activeTab: number;
  setActiveTab: (i: number) => void;
  viewOnly: boolean;
  errors: Record<string, string>;
  onChange: (d: number, i: number, field: string, value: any) => void;
  onSearch: (col: MasterDetailColumn, d: number, i: number) => void;
  onAddRow: (d: number) => void;
  onRemoveRow: (d: number, i: number) => void;
  /** Phase 6 (اختياري): أزرار فوق جدول التفاصيل (مثلاً استيراد من Excel) */
  renderToolbar?: (detailIndex: number) => React.ReactNode;
  isDark: boolean;
  t: (en: string, ar: string) => string;
  card: string;
  muted: string;
}

export function DetailsEditor({ configs, allRows, activeTab, setActiveTab, viewOnly, errors, onChange, onSearch, onAddRow, onRemoveRow, renderToolbar, isDark, t, card, muted }: DetailsEditorProps) {
  if (configs.length === 0) return null;
  return (
    <div className={`rounded-xl border shadow-erp-1 ${card}`}>
      {configs.length > 1 && (
        <div className="flex gap-1 px-3 pt-3 border-b border-erp-border overflow-x-auto">
          {configs.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 h-10 rounded-t-lg text-[13px] font-semibold whitespace-nowrap ${activeTab === i ? "bg-erp-accent text-white" : muted}`}
            >
              {d.title} ({(allRows[i] || []).length})
            </button>
          ))}
        </div>
      )}

      {configs.map((d, di) => {
        if (di !== activeTab) return null;
        const rows = allRows[di] || [];
        const cols = d.columns.filter((c) => c.IsVisibleDisplayInGrid !== false);
        const sumFields = new Set((d.totals || []).filter((x) => (x.type || "sum") === "sum").map((x) => x.detailField));
        return (
          <div key={di} className="p-3">
            {configs.length === 1 && <h3 className="text-[15px] leading-5 font-semibold mb-2 text-erp-text">{d.title}</h3>}
            {renderToolbar && (() => { const tb = renderToolbar(di); return tb ? <div className="flex flex-wrap justify-end gap-2 mb-2">{tb}</div> : null; })()}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-erp-surface-2 border-b border-erp-border-strong text-[11px] uppercase tracking-[.04em] text-erp-text-muted">
                    <th className="p-2 w-10">#</th>
                    {cols.map((c) => (
                      <th key={c.field} className="p-2 text-start font-semibold whitespace-nowrap" style={{ minWidth: c.width || 120 }}>
                        {c.title}
                        {c.IsRequired && c.editable !== false && !c.formula && <span className="text-erp-danger mx-1">*</span>}
                      </th>
                    ))}
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={r.__uid || ri} className="border-b border-erp-border hover:bg-erp-surface-2">
                      <td className={`num p-2 text-center ${muted}`}>{ri + 1}</td>
                      {cols.map((c) => {
                        const errKey = `d${di}.${ri}.${c.field}`;
                        return (
                          <td key={c.field} className="p-1 align-top">
                            <FieldInput
                              col={c}
                              value={r[c.field]}
                              onChange={(v) => onChange(di, ri, c.field, v)}
                              onSearch={() => onSearch(c, di, ri)}
                              disabled={viewOnly || c.editable === false}
                              error={errors[errKey]}
                              compact
                              isDark={isDark}
                              t={t}
                              row={r}
                            />
                          </td>
                        );
                      })}
                      <td className="p-1 text-center">
                        {!viewOnly && <button onClick={() => onRemoveRow(di, ri)} title={t("Delete row", "حذف الصف")} className="px-2 min-h-[36px] rounded-lg text-erp-danger hover:bg-erp-danger-bg">🗑️</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {sumFields.size > 0 && rows.length > 0 && (
                  <tfoot>
                    <tr className="font-bold bg-erp-accent-soft text-erp-text">
                      <td className="p-2 text-center">Σ</td>
                      {cols.map((c) => (
                        <td key={c.field} className="num p-2">
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
              <button onClick={() => onAddRow(di)} className="mt-3 px-4 h-11 md:h-10 rounded-lg border-2 border-dashed border-erp-accent text-erp-accent font-semibold hover:bg-erp-accent-soft w-full transition-colors">
                ➕ {t("Add row", "إضافة صف")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
// #endregion
