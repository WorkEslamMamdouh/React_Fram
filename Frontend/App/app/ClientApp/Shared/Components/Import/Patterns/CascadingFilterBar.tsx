/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  CascadingFilterBar — شكل الفلاتر المتتالية (المنطق كله في useCascadingFilters)
//  - كمبيوتر/تابلت: شريط أعمدة. موبايل: زرار "الفلاتر (n)" بيفتح شيت من تحت
//  - select صغير = قايمة عادية (مريحة على اللمس). وضع server = بحث + تحميل لانهائي
//  - الفلتر اللي أبوه المطلوب فاضي بيتقفل ومكتوب عليه "اختار X الأول"
// =====================================================================================

import React, { useEffect, useRef, useState } from "react";
import type { CascadeFieldState, CascadeOption } from "./ModelCascadingFilter";
import type { CascadingFiltersState } from "./cascadingFilter";
import { BottomSheet, btnClass, useIsMobile, useLangKit } from "./patternKit";
import { useInfiniteSentinel } from "../useInfiniteSentinel";

const inputCls =
  "w-full h-11 md:h-9 border border-erp-border-strong rounded-lg px-3 text-[13px] bg-erp-surface text-erp-text placeholder:text-erp-text-subtle focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed transition";

// ------------------------------------------------------------------ بحث من السيرفر
function ServerCombo({ fs, value, onChange, state }: {
  fs: CascadeFieldState; value: any; onChange: (v: any) => void; state: CascadingFiltersState;
}) {
  const { t, lt } = useLangKit();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CascadeOption[]>(fs.options);
  const [total, setTotal] = useState(fs.total);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const my = ++seq.current;
    const h = setTimeout(() => {
      setBusy(true);
      state.searchOptions(fs.def.field, q.trim(), 1)
        .then((r) => { if (my === seq.current) { setItems(r.rows); setTotal(r.total); setPage(1); } })
        .finally(() => { if (my === seq.current) setBusy(false); });
    }, q ? 300 : 0);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q]);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);

  const more = () => {
    if (busy || items.length >= total) return;
    const my = ++seq.current;
    setBusy(true);
    state.searchOptions(fs.def.field, q.trim(), page + 1)
      .then((r) => { if (my === seq.current) { setItems((p) => p.concat(r.rows)); setPage(page + 1); if (r.rows.length === 0) setTotal(items.length); } })
      .finally(() => { if (my === seq.current) setBusy(false); });
  };
  const sentinel = useInfiniteSentinel({ enabled: open && !busy && items.length < total, onLoadMore: more, rootRef: listRef, rootMargin: "60px", watch: items.length });

  const selected = [...items, ...fs.options].find((o) => String(o.value) === String(value ?? ""));
  return (
    <div className="relative" ref={boxRef}>
      <input
        id={`cf-${fs.def.field}`}
        className={inputCls}
        disabled={fs.disabled}
        value={open ? q : selected?.label ?? (value ?? "")}
        placeholder={open ? t("Type to search...", "اكتب للبحث...") : lt(fs.def.placeholder) || t("All", "الكل")}
        onFocus={() => { setOpen(true); setQ(""); }}
        onChange={(e) => setQ(e.target.value)}
        role="combobox"
        aria-expanded={open}
        aria-controls={`cascade-list-${fs.def.field}`}
      />
      {open && (
        <div ref={listRef} role="listbox" id={`cascade-list-${fs.def.field}`} className="absolute z-50 mt-1 inset-x-0 max-h-64 overflow-y-auto rounded-lg border border-erp-border bg-erp-surface shadow-erp-4 py-1">
          <button type="button" className="w-full text-start px-3 py-2.5 text-[13px] text-erp-text-muted hover:bg-erp-surface-2" onClick={() => { onChange(null); setOpen(false); }}>
            {t("All", "الكل")}
          </button>
          {items.map((o, i) => (
            <button key={`${o.value}-${i}`} type="button" role="option" aria-selected={String(o.value) === String(value)}
              className={`w-full text-start px-3 py-2.5 text-[13px] truncate hover:bg-erp-surface-2 ${String(o.value) === String(value) ? "bg-erp-accent-soft text-erp-accent" : "text-erp-text"}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label}
            </button>
          ))}
          {items.length < total && <div ref={sentinel} className="h-px" />}
          {busy && <div className="px-3 py-2 text-xs text-center text-erp-text-muted">{t("Loading...", "جاري التحميل...")}</div>}
          {!busy && items.length === 0 && <div className="px-3 py-2 text-xs text-center text-erp-text-muted">{t("No results", "لا توجد نتائج")}</div>}
          {total > 0 && <div className="px-3 py-1 text-[11px] text-center text-erp-text-subtle border-t border-erp-border"><span className="num">{items.length}</span> / <span className="num">{total}</span></div>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ حقل واحد
function CascadeInput({ fs, state }: { fs: CascadeFieldState; state: CascadingFiltersState }) {
  const { t, lt } = useLangKit();
  const d = fs.def;
  const v = state.values[d.field] || {};
  const set = (patch: { value?: any; from?: any; to?: any }) => state.setValue(d.field, { ...v, ...patch });
  const type = d.type || "select";

  const id = `cf-${d.field}`;
  if (type === "text") return <input id={id} className={inputCls} value={v.value ?? ""} placeholder={lt(d.placeholder) || t("Search...", "بحث...")} onChange={(e) => set({ value: e.target.value })} />;
  if (type === "number") return <input id={id} type="number" className={`${inputCls} num`} value={v.value ?? ""} onChange={(e) => set({ value: e.target.value === "" ? null : Number(e.target.value) })} />;
  if (type === "date") return <input id={id} type="date" className={inputCls} value={v.value ?? ""} onChange={(e) => set({ value: e.target.value || null })} />;
  if (type === "dateRange") return (
    <div className="flex gap-2">
      <input id={id} type="date" aria-label={t("From", "من")} className={inputCls} value={v.from ?? ""} onChange={(e) => set({ from: e.target.value || null })} />
      <input type="date" aria-label={t("To", "إلى")} className={inputCls} value={v.to ?? ""} onChange={(e) => set({ to: e.target.value || null })} />
    </div>
  );
  if (type === "boolean") return (
    <select id={id} className={inputCls} value={v.value === undefined || v.value === null ? "" : String(v.value)} onChange={(e) => set({ value: e.target.value === "" ? null : e.target.value === "true" })}>
      <option value="">{t("All", "الكل")}</option>
      <option value="true">{t("Yes", "نعم")}</option>
      <option value="false">{t("No", "لا")}</option>
    </select>
  );

  if (d.loadMode === "server" && fs.total > fs.options.length) {
    return <ServerCombo fs={fs} value={v.value} onChange={(val) => set({ value: val })} state={state} />;
  }

  const parentNames = (d.dependsOn || [])
    .filter((dep) => (dep.whenParentEmpty || "none") === "none")
    .map((dep) => lt(state.defs.find((x) => x.field === dep.parent)?.label));
  return (
    <select
      id={id}
      className={inputCls}
      disabled={fs.disabled}
      value={v.value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        const opt = fs.options.find((o) => String(o.value) === raw);
        set({ value: raw === "" ? null : opt ? opt.value : raw });
      }}
    >
      <option value="">
        {fs.disabled ? t(`Select ${parentNames.join(", ")} first`, `اختار ${parentNames.join("، ")} الأول`) : fs.loading ? t("Loading...", "جاري التحميل...") : lt(d.placeholder) || t("All", "الكل")}
      </option>
      {fs.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
    </select>
  );
}

// ------------------------------------------------------------------ الشريط
export interface CascadingFilterBarProps {
  state: CascadingFiltersState;
  /** عدد النتايج (اختياري) */
  resultCount?: number;
  className?: string;
  /** إجبار شكل معين */
  forceLayout?: "bar" | "stacked" | "sheet";
}

export default function CascadingFilterBar({ state, resultCount, className = "", forceLayout }: CascadingFilterBarProps) {
  const { t, lt, dir } = useLangKit();
  const isMobile = useIsMobile();
  const [sheet, setSheet] = useState(false);
  const shown = state.fields.filter((f) => !f.def.hidden);
  const layout = forceLayout || (isMobile ? "sheet" : state.config.layout || "bar");

  const body = (stacked: boolean) => (
    <div
      className={stacked ? "grid gap-3 grid-cols-1" : "grid gap-x-3 gap-y-2.5"}
      style={stacked ? undefined : { gridTemplateColumns: state.config.columns ? `repeat(${state.config.columns}, minmax(0, 1fr))` : "repeat(auto-fill, minmax(190px, 1fr))" }}
    >
      {shown.map((fs) => (
        <div key={fs.def.field} style={!stacked && fs.def.span ? { gridColumn: `span ${fs.def.span} / span ${fs.def.span}` } : undefined}>
          <label htmlFor={`cf-${fs.def.field}`} className="block text-[12px] font-medium mb-1 text-erp-text-muted">
            {lt(fs.def.label)}
            {fs.def.required && <span className="text-erp-danger mx-0.5">*</span>}
            {(fs.def.dependsOn || []).length > 0 && <span className="mx-1 text-erp-text-subtle" aria-hidden="true">↳</span>}
          </label>
          <CascadeInput fs={fs} state={state} />
        </div>
      ))}
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button type="button" className={btnClass("gray")} disabled={state.activeCount === 0} onClick={state.clearAll}>✕ {t("Clear", "مسح")}</button>
        {!state.instant && <button type="button" className={btnClass("primary")} onClick={state.apply}>{t("Apply", "تطبيق")}</button>}
        {state.activeCount > 0 && <span className="inline-flex items-center h-6 px-2 rounded-md bg-erp-accent-soft text-erp-accent text-[11px] font-semibold"><span className="num">{state.activeCount}</span>&nbsp;{t("active", "نشط")}</span>}
      </div>
      {resultCount !== undefined && <span className="text-xs text-erp-text-muted"><span className="num font-semibold text-erp-text">{resultCount}</span> {t("results", "نتيجة")}</span>}
    </div>
  );

  if (state.errors.length > 0) {
    return <div className="p-3 text-xs text-erp-danger-text bg-erp-danger-bg border border-erp-danger-border rounded-lg">{state.errors.join(" · ")}</div>;
  }

  if (layout === "sheet") {
    return (
      <div className={className} dir={dir}>
        <button type="button" onClick={() => setSheet(true)} className={`${btnClass("gray", "lg")} w-full`}>
          ⚲ {t("Filters", "الفلاتر")}
          {state.activeCount > 0 && <span className="num inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-erp-accent text-white text-[11px] font-bold">{state.activeCount}</span>}
        </button>
        <BottomSheet open={sheet} onClose={() => setSheet(false)} title={t("Filters", "الفلاتر")} footer={<div className="w-full">{footer}</div>}>
          {body(true)}
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className={`border-b border-erp-border bg-erp-surface px-3 md:px-4 py-3 space-y-3 ${className}`} dir={dir}>
      {body(layout === "stacked")}
      {footer}
    </div>
  );
}
