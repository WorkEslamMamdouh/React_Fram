"use client";

// إعدادات الإكسل (Phase 6) — بتتحفظ مع الشاشة وبيطلع منها `excel` اللي بيتبعت لـ DynamicGrid / MasterDetail
import React, { useEffect, useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { useScreenBuilder } from "../../store/useScreenBuilder";
import { ExcelConfigV5, FieldConfigV4 } from "../../types/ScreenConfig";
import { DbMeta } from "../../utils/dbMeta";

const inp = "h-8 rounded-md border border-erp-border-strong bg-erp-surface px-2 text-[12px] text-erp-text focus:outline-none focus:border-erp-accent";
type Scope = "master" | "detail";
type Lookup = ExcelConfigV5["keyLookups"][number];

function ColumnPicker({ title, hint, fields, selected, onToggle, scope, ex, setLookup, db }: {
  title: string; hint: string; fields: FieldConfigV4[]; selected: string[]; onToggle: (f: string) => void;
  scope: Scope; ex: ExcelConfigV5; setLookup: (scope: Scope, column: string, patch: Partial<Lookup> | null) => void; db: DbMeta;
}) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [open, setOpen] = useState<string>("");
  const lk = (name: string) => ex.keyLookups.find((l) => l.column === name && (l.scope || "master") === scope);
  const openTable = open ? lk(open)?.table : "";
  useEffect(() => { if (openTable) db.ensureColumns(openTable); }, [openTable]);   // eslint-disable-line react-hooks/exhaustive-deps
  const colsOf = (table: string) => ((table && db.columns(table)) || []).map((c) => c.name);

  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-semibold text-erp-text">{title}</div>
      <div className="text-[11px] text-erp-text-muted">{hint}</div>
      {fields.map((f) => {
        const l = lk(f.field);
        const cols = l ? colsOf(l.table) : [];
        return (
          <div key={f.field} className="rounded-lg border border-erp-border px-2 py-1.5 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 w-56 text-[12px]">
                <input type="checkbox" className="accent-[var(--erp-accent)]" checked={selected.includes(f.field)} onChange={() => onToggle(f.field)} />
                <span className="truncate" title={f.titleAr || f.field}>{f.field}</span>
              </label>
              <label className="flex items-center gap-1 text-[11px] text-erp-text-muted cursor-pointer">
                <input type="checkbox" checked={!!l} onChange={(e) => { setLookup(scope, f.field, e.target.checked ? {} : null); setOpen(e.target.checked ? f.field : ""); }} />
                {t("dropdown from a table", "قائمة من جدول")}
              </label>
              {l && <button className="text-[11px] text-erp-accent hover:underline" onClick={() => setOpen(open === f.field ? "" : f.field)}>{open === f.field ? t("hide", "إخفاء") : t("edit", "تعديل")}</button>}
              {l && l.table && l.valueField && <span className="text-[11px] text-erp-success-text">✓ {l.table}</span>}
            </div>
            {l && open === f.field && (
              <div className="flex flex-wrap items-center gap-2 ps-6">
                <input className={`${inp} w-44`} dir="ltr" list="sb-objs2" placeholder={t("table / view", "الجدول / الفيو")} value={l.table} onChange={(e) => setLookup(scope, f.field, { table: e.target.value })} />
                <input className={`${inp} w-36`} dir="ltr" list={`sb-lkc-${scope}-${f.field}`} placeholder={t("key column (saved)", "عمود المفتاح (اللي بيتخزن)")} value={l.valueField} onChange={(e) => setLookup(scope, f.field, { valueField: e.target.value })} />
                <input className={`${inp} w-36`} dir="ltr" list={`sb-lkc-${scope}-${f.field}`} placeholder={t("code column (opt.)", "عمود الكود (اختياري)")} value={l.codeField || ""} onChange={(e) => setLookup(scope, f.field, { codeField: e.target.value })} />
                <input className={`${inp} w-36`} dir="ltr" list={`sb-lkc-${scope}-${f.field}`} placeholder={t("name column", "عمود الاسم")} value={l.displayField} onChange={(e) => setLookup(scope, f.field, { displayField: e.target.value })} />
                <input className={`${inp} w-64`} dir="ltr" placeholder={t("condition e.g. CompCode = {session.CompCode}", "شرط مثال: CompCode = {session.CompCode}")} value={l.condition || ""} onChange={(e) => setLookup(scope, f.field, { condition: e.target.value })} />
                <datalist id={`sb-lkc-${scope}-${f.field}`}>{cols.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ExcelBox({ db }: { db: DbMeta }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const cfg = useScreenBuilder((s) => s.config);
  const mutate = useScreenBuilder((s) => s.mutate);
  const ex = cfg.excel;
  const isGrid = cfg.screenType === "Grid";
  const upEx = (patch: Partial<ExcelConfigV5>) => mutate((c) => { Object.assign(c.excel, patch); return c; });
  const toggle = (key: "columns" | "detailColumns", name: string) => {
    const cur = ex[key] || [];
    upEx({ [key]: cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name] } as Partial<ExcelConfigV5>);
  };
  const setLookup = (scope: Scope, column: string, patch: Partial<Lookup> | null) => {
    const same = (l: Lookup) => l.column === column && (l.scope || "master") === scope;
    if (patch === null) { upEx({ keyLookups: ex.keyLookups.filter((l) => !same(l)) }); return; }
    const exists = ex.keyLookups.some(same);
    upEx({
      keyLookups: exists
        ? ex.keyLookups.map((l) => (same(l) ? { ...l, ...patch } : l))
        : [...ex.keyLookups, { column, scope, table: "", valueField: "", displayField: "", ...patch }],
    });
  };

  const masterFields = cfg.fields.filter((f) => !f.noSave && !f.auto && !f.formula && f.field !== cfg.keyColumn);
  const di = Math.min(ex.detailIndex ?? 0, Math.max(0, cfg.details.length - 1));
  const detail = cfg.details[di];
  const detailFields = detail ? detail.fields.filter((f) => !f.noSave && !f.auto && !f.formula && f.field !== detail.keyColumn && f.field !== detail.foreignKey) : [];
  const mode = ex.mode || "both";

  return (
    <div className="rounded-xl border border-erp-border bg-erp-surface p-4 space-y-3">
      <label className="flex items-center gap-2 text-[14px] font-semibold text-erp-text cursor-pointer">
        <input type="checkbox" className="accent-[var(--erp-accent)]" checked={ex.enabled} onChange={(e) => upEx({ enabled: e.target.checked })} />
        {t("Excel template download / import", "تحميل نموذج Excel واستيراد البيانات")}
      </label>
      {ex.enabled && (
        <>
          <div className="rounded-lg bg-erp-accent-soft text-erp-accent text-[12px] px-3 py-2 leading-6">
            {isGrid
              ? t("Each Excel row becomes a new record. Buttons appear in the grid toolbar for users with the Create permission.",
                  "كل صف في الإكسل بيبقى سجل جديد. الأزرار بتظهر في شريط الجريد لمن عنده صلاحية الإضافة.")
              : t("Multi-transaction: one file, many documents (GroupNo column). Lines only: many items into the open document. Dropdowns are detected automatically from the field settings (select / search / options); use the lookup option only to override.",
                  "معاملات كتير: ملف واحد وفواتير كتير (عمود GroupNo). أصناف بس: أصناف كتير في الفاتورة المفتوحة. القوائم المنسدلة بتتعرف أوتوماتيك من إعدادات الحقل (اختيار / بحث / اختيارات)، وخيار \"قائمة من جدول\" للتجاوز بس.")}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input className={`${inp} w-64`} placeholder={t("Template name", "اسم التمبلت")} value={ex.templateName} onChange={(e) => upEx({ templateName: e.target.value })} />
            {isGrid ? (
              <label className="flex items-center gap-2 text-[12px] cursor-pointer" title={t("If any row fails, nothing is saved. Not available when the screen runs G_ProcessTrans per row.", "لو أي صف فشل مفيش حاجة تتحفظ. مش متاح لو الشاشة بتشغّل G_ProcessTrans لكل صف.")}>
                <input type="checkbox" className="accent-[var(--erp-accent)]" checked={!!ex.allOrNothing} onChange={(e) => upEx({ allOrNothing: e.target.checked })} />
                {t("All-or-nothing (one transaction)", "الكل أو لا شيء (ترانزاكشن واحدة)")}
              </label>
            ) : (
              <>
                <select className={inp} value={mode} onChange={(e) => upEx({ mode: e.target.value as ExcelConfigV5["mode"] })}>
                  <option value="both">{t("Both", "الاتنين")}</option>
                  <option value="multiTransaction">{t("Multi-transaction file", "معاملات كتير في ملف")}</option>
                  <option value="detailsOnly">{t("Lines into the open document", "أصناف في الفاتورة المفتوحة")}</option>
                </select>
                {cfg.details.length > 1 && (
                  <select className={inp} value={di} onChange={(e) => upEx({ detailIndex: Number(e.target.value), detailColumns: [] })}>
                    {cfg.details.map((d, i) => <option key={i} value={i}>{d.titleAr || d.titleEn || d.table}</option>)}
                  </select>
                )}
              </>
            )}
          </div>

          <ColumnPicker
            title={isGrid ? t("Template columns", "أعمدة التمبلت") : t("Header (master) columns", "أعمدة الرأس (الماستر)")}
            hint={t("Tick the columns to include. Nothing ticked = all savable columns.", "علّم الأعمدة اللي تدخل التمبلت. لو مفيش حاجة معلّمة = كل الأعمدة اللي بتتحفظ.")}
            fields={masterFields} selected={ex.columns} onToggle={(f) => toggle("columns", f)} scope="master" ex={ex} setLookup={setLookup} db={db}
          />
          {!isGrid && detail ? (
            <ColumnPicker
              title={t("Lines columns: ", "أعمدة السطور: ") + (detail.titleAr || detail.titleEn || detail.table)}
              hint={t("Nothing ticked = all columns. Computed columns (formula) and the key/foreign key are always skipped.", "لو مفيش حاجة معلّمة = كل الأعمدة. الأعمدة المحسوبة (formula) والمفتاح والربط بيتشالوا دايمًا.")}
              fields={detailFields} selected={ex.detailColumns || []} onToggle={(f) => toggle("detailColumns", f)} scope="detail" ex={ex} setLookup={setLookup} db={db}
            />
          ) : null}
          <datalist id="sb-objs2">{db.objects.map((o) => <option key={o.name} value={o.name} />)}</datalist>
        </>
      )}
    </div>
  );
}
