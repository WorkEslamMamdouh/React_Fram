/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  patternKit — أدوات مشتركة لكل مكونات الأنماط
//  - useLangKit: اللغة والاتجاه ودالة الترجمة (t و lt)
//  - sqlDataProvider / createLocalProvider: مصدر بيانات (السيرفر أو بيانات محلية للديمو)
//  - usePagedData: صفحات من السيرفر أو تحميل لانهائي (بيستخدم useInfiniteSentinel)
//  - VirtualList: عرض الصفوف الظاهرة بس (للقوائم الطويلة)
//  - PagerBar / StatusPill / BottomSheet / EmptyState / useNow / useIsMobile
// =====================================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SQL } from "../../../CallDataBase";
import { useSys } from "../../../SystemUsing";
import { useInfiniteSentinel } from "../useInfiniteSentinel";
import type { DataPage, DataProvider, DataQuery, DataSourceConfig, LoadMode, LText, StatusStyle } from "./ModelPatterns";

// ------------------------------------------------------------------ اللغة
export function ltOf(text: LText | undefined | null, lang: string): string {
  if (text === undefined || text === null) return "";
  if (typeof text === "string") return text;
  return lang === "ar" ? text.ar : text.en;
}

export function useLangKit() {
  const lang = useSys((s) => s.lang);
  const isDark = useSys((s) => s.IsDark);
  const isAr = lang === "ar";
  const t = useCallback((en: string, ar: string) => (isAr ? ar : en), [isAr]);
  const lt = useCallback((x: LText | undefined | null) => ltOf(x, lang), [lang]);
  return { lang, isAr, isDark, dir: (isAr ? "rtl" : "ltr") as "rtl" | "ltr", t, lt };
}

// ------------------------------------------------------------------ تنسيق
export function fmtNumber(v: any, digits = 2): string {
  const n = Number(v);
  if (!isFinite(n)) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** تنسيق قيمة حسب نوعها (text / number / money / date / datetime / boolean) */
export function fmtValue(v: any, format: string | undefined, lang: string): string {
  if (v === null || v === undefined || v === "") return "—";
  switch (format) {
    case "money": return fmtNumber(v, 2);
    case "number": return fmtNumber(v, Number.isInteger(Number(v)) ? 0 : 2);
    case "date": return String(v).substring(0, 10);
    case "datetime": return String(v).replace("T", " ").substring(0, 16);
    case "boolean": return v === true || v === 1 || v === "1" || v === "true" ? (lang === "ar" ? "نعم" : "Yes") : (lang === "ar" ? "لا" : "No");
    default: return String(v);
  }
}

/** مدة بالمللي ثانية → HH:MM:SS (أو MM:SS لو أقل من ساعة) */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

/** لون بشفافية (لخلفية فاتحة من لون الحالة) */
export function softColor(color: string, alpha = 0.14): string {
  if (/^#([0-9a-f]{6})$/i.test(color)) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

export function findStatus(list: StatusStyle[] | undefined, value: any): StatusStyle | undefined {
  return (list || []).find((s) => String(s.value) === String(value));
}

// ------------------------------------------------------------------ SQL آمن
export const isValidField = (f: string) => /^[\w.[\]]+$/.test(f);
export const escSql = (v: any) => String(v ?? "").replace(/'/g, "''");

/** قيمة SQL: رقم زي ما هو، Boolean → 1/0، نص بين N'..' */
export function sqlLit(v: any): string {
  if (v === null || v === undefined || v === "") return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number" && isFinite(v)) return String(v);
  return `N'${escSql(v)}'`;
}

/** {Field} → قيمة SQL من السجل */
export function fillSqlPlaceholders(text: string, row: Record<string, any> | undefined): string {
  return (text || "").replace(/\{(\w+)\}/g, (_m, name) => sqlLit(row?.[name]));
}

export function andJoin(...parts: Array<string | undefined | null | false>): string {
  const p = parts.filter((x): x is string => !!x && !!x.trim());
  if (p.length === 0) return "";
  if (p.length === 1) return p[0];
  return p.map((x) => `(${x})`).join(" AND ");
}

export function whereToSql(where?: Record<string, any>): string {
  if (!where) return "";
  const parts: string[] = [];
  for (const [col, val] of Object.entries(where)) {
    if (!isValidField(col) || val === undefined) continue;
    if (Array.isArray(val)) {
      if (val.length) parts.push(`${col} IN (${val.map(sqlLit).join(", ")})`);
    } else if (val === null) parts.push(`${col} IS NULL`);
    else parts.push(`${col} = ${sqlLit(val)}`);
  }
  return parts.join(" AND ");
}

// ------------------------------------------------------------------ مصادر البيانات
/** أقصى عدد صفوف لطلب من غير صفحات (وضع "all") لما يكون فيه ترتيب */
export const ALL_MODE_CAP = 10000;

/** المصدر الافتراضي: ManageDataSQL/Query عن طريق SQL.Select (ترقيم وعدد إجمالي من السيرفر) */
export const sqlDataProvider: DataProvider = async (q: DataQuery): Promise<DataPage> => {
  const s = q.source;
  let search = "";
  if (q.search && q.search.text) {
    const safe = escSql(q.search.text);
    const parts = q.search.fields.filter(isValidField).map((f) => `${f} LIKE N'%${safe}%'`);
    if (parts.length) search = parts.join(" OR ");
  }
  const range = q.range && isValidField(q.range.field)
    ? `${q.range.field} >= '${escSql(q.range.from)}' AND ${q.range.field} < '${escSql(q.range.to)}'` : "";
  const cond = andJoin(s.condition, whereToSql(q.where), q.extraCondition, search, range);
  const ob = s.orderBy || s.keyField || "";
  const order = ob && s.keyField && ob !== s.keyField && isValidField(ob) && isValidField(s.keyField)
    ? `${ob} ${s.orderType || "ASC"}, ${s.keyField}` : ob;
  // من غير صفحات الباك إند بيتجاهل ORDER BY (SELECT من غير ترتيب) — فلما فيه ترتيب نطلب TOP كبير عشان يترتب
  // (كان "أعلى الأصناف" في لوحة المؤشرات بيطلع بترتيب عشوائي). "all" مخصص للقوايم الصغيرة أصلاً.
  const top = q.page > 0 || !order ? 0 : ALL_MODE_CAP;
  const res = await SQL.Select(
    s.tableName, cond, s.selectedColumns && s.selectedColumns.length ? s.selectedColumns : null, null, null, 0,
    order, s.orderType || "ASC", top, "", null, null,
    q.page > 0 ? q.page : 0, q.page > 0 ? q.pageSize : 0, q.page > 0
  );
  return { rows: res.data || [], total: res.totalCount || 0 };
};

/**
 * مصدر محلي (للديمو والاختبار): tables = { TableName: rows[] }.
 * بيدعم where (تساوي / IN) + بحث + ترتيب + صفحات. extraCondition بيتجاهل (SQL مش بيتنفذ محلي).
 */
export function createLocalProvider(tables: Record<string, any[]>, latencyMs = 120): DataProvider {
  return async (q: DataQuery) => {
    let rows = [...(tables[q.source.tableName] || [])];
    if (q.where) {
      for (const [col, val] of Object.entries(q.where)) {
        if (val === undefined) continue;
        rows = rows.filter((r) => Array.isArray(val) ? val.map(String).includes(String(r[col])) : val === null ? r[col] == null : String(r[col]) === String(val));
      }
    }
    if (q.range) {
      const { field, from, to } = q.range;
      rows = rows.filter((r) => String(r[field] ?? "") >= from && String(r[field] ?? "") < to);
    }
    if (q.search && q.search.text) {
      const s = q.search.text.toLowerCase();
      rows = rows.filter((r) => q.search!.fields.some((f) => String(r[f] ?? "").toLowerCase().includes(s)));
    }
    const ob = q.source.orderBy;
    if (ob) {
      const dir = q.source.orderType === "DESC" ? -1 : 1;
      rows.sort((a, b) => (a[ob] > b[ob] ? dir : a[ob] < b[ob] ? -dir : 0));
    }
    const total = rows.length;
    if (q.page > 0) rows = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    if (latencyMs > 0) await new Promise((r) => setTimeout(r, latencyMs));
    return { rows, total };
  };
}

// ------------------------------------------------------------------ usePagedData
export interface PagedDataOptions {
  provider?: DataProvider;
  source: DataSourceConfig | null;
  where?: Record<string, any>;
  extraCondition?: string;
  search?: { text: string; fields: string[] };
  range?: { field: string; from: string; to: string };
  mode?: LoadMode;
  pageSize?: number;
  /** false = ماتحمّلش لسه (تحميل كسول للتابات) */
  enabled?: boolean;
}

export function usePagedData<T = any>(opts: PagedDataOptions) {
  const { provider = sqlDataProvider, source, where, extraCondition, search, range, mode = "infinite", enabled = true } = opts;
  const pageSize = opts.pageSize || 25;
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const seq = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);

  // توقيع الطلب: أي تغيير فيه = تحميل من الأول
  const sig = JSON.stringify([source, where, extraCondition, search, range, mode, pageSize, reloadKey]);
  const providerRef = useRef(provider);
  providerRef.current = provider;

  const fetchPage = useCallback(async (pg: number, append: boolean) => {
    if (!source) return;
    const my = ++seq.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const res = await providerRef.current({
        source, where, extraCondition, search, range,
        page: mode === "all" ? 0 : pg, pageSize,
      });
      if (my !== seq.current) return;
      const key = source.keyField;
      if (append) {
        if (res.rows.length === 0) setExhausted(true);
        setRows((prev) => {
          if (!key) return prev.concat(res.rows as T[]);
          const seen = new Set(prev.map((r: any) => r?.[key]));
          return prev.concat((res.rows as T[]).filter((r: any) => !seen.has(r?.[key])));
        });
      } else {
        setRows(res.rows as T[]);
        setExhausted(false);
      }
      setTotal(mode === "all" ? res.rows.length : res.total);
      setPage(pg);
    } catch (e: any) {
      if (my !== seq.current) return;
      setError(String(e?.message || e || "error"));
      if (append) setExhausted(true);
    } finally {
      if (my === seq.current) { setLoading(false); setLoadingMore(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // ملحوظة: الاعتماد على hasSource مش على source نفسه — لو الأب باعت كائن source جديد كل render
  // كان ده بيعمل تحميل لا نهائي. أي تغيير حقيقي في المصدر بيغيّر sig وبالتالي fetchPage.
  const hasSource = !!source;
  useEffect(() => {
    if (!enabled || !hasSource) return;
    fetchPage(1, false);
  }, [enabled, fetchPage, hasSource]);

  const hasMore = mode === "infinite" && !exhausted && rows.length < total;
  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    fetchPage(page + 1, true);
  }, [hasMore, loading, loadingMore, fetchPage, page]);

  const goToPage = useCallback((pg: number) => { fetchPage(Math.max(1, pg), false); }, [fetchPage]);
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  return { rows, setRows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), loading, loadingMore, error, hasMore, loadMore, goToPage, refresh, mode };
}

/** علامة آخر القايمة للتحميل اللانهائي */
export function InfiniteSentinel({ data, rootRef }: { data: ReturnType<typeof usePagedData>; rootRef?: React.RefObject<Element | null> }) {
  const { t } = useLangKit();
  const ref = useInfiniteSentinel({
    enabled: data.hasMore && !data.loading && !data.loadingMore,
    onLoadMore: data.loadMore,
    rootRef,
    watch: data.rows.length,
  });
  if (data.mode !== "infinite") return null;
  return (
    <>
      {data.hasMore && <div ref={ref} aria-hidden="true" className="h-px" />}
      {data.loadingMore && <div className="py-2 text-center text-xs text-erp-text-muted">{t("Loading more…", "جاري تحميل المزيد…")}</div>}
    </>
  );
}

/** شريط ترقيم الصفحات (لوضع pages) */
export function PagerBar({ data }: { data: ReturnType<typeof usePagedData> }) {
  const { t } = useLangKit();
  if (data.mode !== "pages") {
    return data.total > 0 ? (
      <div className="px-3 py-1.5 text-[11px] text-erp-text-subtle text-center"><span className="num">{data.rows.length}</span> / <span className="num">{data.total}</span></div>
    ) : null;
  }
  const btn = "min-w-9 h-9 px-2 rounded-lg border border-erp-border bg-erp-surface text-erp-text text-[13px] disabled:opacity-40";
  return (
    <div className="flex items-center justify-center gap-1.5 py-2 text-[13px]">
      <button type="button" className={btn} disabled={data.page <= 1 || data.loading} onClick={() => data.goToPage(data.page - 1)} aria-label={t("Previous", "السابق")}>‹</button>
      <span className="px-2 text-erp-text-muted"><span className="num">{data.page}</span> / <span className="num">{data.pageCount}</span> · <span className="num">{data.total}</span></span>
      <button type="button" className={btn} disabled={data.page >= data.pageCount || data.loading} onClick={() => data.goToPage(data.page + 1)} aria-label={t("Next", "التالي")}>›</button>
    </div>
  );
}

// ------------------------------------------------------------------ VirtualList
export interface VirtualListProps<T> {
  items: T[];
  /** ارتفاع الصف بالبكسل (ثابت) */
  itemHeight: number;
  height: number | string;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** بيتنده لما توصل قرب الآخر (للتحميل اللانهائي) */
  onEndReached?: () => void;
  className?: string;
  footer?: React.ReactNode;
}

/** قايمة افتراضية: بترسم الصفوف الظاهرة بس — آلاف الصفوف من غير تقل */
export function VirtualList<T>({ items, itemHeight, height, overscan = 6, renderItem, onEndReached, className = "", footer }: VirtualListProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => setViewH(el.clientHeight)) : null;
    ro?.observe(el);
    setViewH(el.clientHeight);
    return () => ro?.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  // +1: scrollTop متقرّب لأول صف، فممكن صف زيادة يبان تحت
  const end = Math.min(items.length, Math.ceil((scrollTop + viewH) / itemHeight) + 1 + overscan);
  const endRef = useRef(onEndReached);
  useEffect(() => { endRef.current = onEndReached; }, [onEndReached]);

  useEffect(() => {
    if (end >= items.length - overscan && items.length > 0) endRef.current?.();
  }, [end, items.length, overscan]);

  return (
    <div ref={ref} className={`overflow-y-auto ${className}`} style={{ height }} onScroll={(e) => {
      // بنقرّب لأول صف: الـ render بيحصل لما صف جديد يظهر بس (مش مع كل بكسل)؛ الـ overscan بيغطي الفرق
      const st = (e.target as HTMLDivElement).scrollTop;
      setScrollTop(Math.floor(st / itemHeight) * itemHeight);
    }}>
      <div style={{ height: items.length * itemHeight, position: "relative" }}>
        {items.slice(start, end).map((it, i) => (
          <div key={start + i} style={{ position: "absolute", top: (start + i) * itemHeight, left: 0, right: 0, height: itemHeight }}>
            {renderItem(it, start + i)}
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}

// ------------------------------------------------------------------ hooks صغيرة
/** الوقت الحالي بيتحدث كل intervalMs (للمؤقتات) — offsetMs = فرق ساعة السيرفر */
export function useNow(intervalMs = 1000, offsetMs = 0): number {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now() + offsetMs), intervalMs);
    return () => clearInterval(h);
  }, [intervalMs, offsetMs]);
  return now;
}

export function useIsMobile(breakpoint = 768): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return m;
}

// ------------------------------------------------------------------ عناصر شكل صغيرة
export function StatusPill({ status, fallback }: { status?: StatusStyle; fallback?: string }) {
  const { lt } = useLangKit();
  if (!status) return fallback ? <span className="text-[11px] text-erp-text-muted">{fallback}</span> : null;
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap ${status.blink ? "animate-pulse" : ""}`}
      style={{ color: status.color, background: status.bg || softColor(status.color) }}>
      {status.icon && <span aria-hidden="true">{status.icon}</span>}
      {lt(status.label)}
    </span>
  );
}

export function EmptyState({ text, icon = "∅" }: { text: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-erp-text-subtle text-sm">
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      {text}
    </div>
  );
}

export const btnClass = (variant: "primary" | "success" | "danger" | "warning" | "gray" = "gray", size: "md" | "lg" = "md") => {
  const base = `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${size === "lg" ? "min-h-[48px] px-4 text-[15px]" : "min-h-[40px] md:min-h-[36px] px-3 text-[13px]"}`;
  switch (variant) {
    case "primary": return `${base} bg-erp-accent text-white hover:bg-erp-accent-hover`;
    case "success": return `${base} bg-erp-success text-white hover:opacity-90`;
    case "danger": return `${base} bg-erp-danger text-white hover:opacity-90`;
    case "warning": return `${base} bg-erp-warning text-white hover:opacity-90`;
    default: return `${base} border border-erp-border bg-erp-surface text-erp-text hover:bg-erp-surface-2`;
  }
};

export const cardClass = "rounded-erp-card border border-erp-border bg-erp-surface shadow-erp-1";

/** شيت من تحت (موبايل) أو نافذة في النص (كمبيوتر) */
export function BottomSheet({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  const { dir, t } = useLangKit();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[99980] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" dir={dir}>
      <div className="absolute inset-0 bg-erp-overlay" onClick={onClose} />
      <div className={`relative w-full ${wide ? "md:max-w-3xl" : "md:max-w-lg"} max-h-[90vh] flex flex-col bg-erp-surface text-erp-text rounded-t-2xl md:rounded-2xl shadow-erp-4 border border-erp-border`}>
        <div className="flex items-center justify-between gap-2 px-4 h-14 shrink-0 border-b border-erp-border">
          <div className="font-semibold truncate">{title}</div>
          <button type="button" onClick={onClose} aria-label={t("Close", "إغلاق")} className="size-11 inline-flex items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-2">✕</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>
        {footer && <div className="shrink-0 flex flex-wrap items-center gap-2 p-3 border-t border-erp-border">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/** تجميع صفوف حسب عمود (للمجموعات/المناطق) */
export function groupBy<T>(rows: T[], key: (r: T) => string): Array<[string, T[]]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return Array.from(m.entries());
}

/** useMemo ثابت لكائن config (عشان لو الأب بيبعت كائن جديد كل render) */
export function useStableConfig<T>(config: T): T {
  const sig = JSON.stringify(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => config, [sig]);
}
