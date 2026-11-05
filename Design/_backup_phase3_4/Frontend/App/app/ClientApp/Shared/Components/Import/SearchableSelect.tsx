"use client";

// =====================================================================================
//  SearchableSelect — دروب داون للجداول الكبيرة (بيستخدمه DynamicSelect تلقائيًا لما العدد يعدّي صفحة)
//  - مابيحمّلش الجدول كله: صفحة صغيرة (30) + بحث من السيرفر وانت بتكتب (debounce 300ms)
//  - تمرير لانهائي جوه القايمة (الصفحة اللي بعدها لما توصل للآخر)
//  - القيمة المختارة بيظهر اسمها حتى لو مش في الصفحة المحمّلة (بتتجاب بالمفتاح)
//  - طلبات قديمة بتتجاهل (رقم الطلب) لما تكتب بسرعة
// =====================================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { DynamicSelectConfig } from "./ModelGrid";
import { SQL } from "../../CallDataBase";
import { useSys } from "../../SystemUsing";
import { useInfiniteSentinel } from "./useInfiniteSentinel";

export const SELECT_PAGE_SIZE = 30;

const isValidField = (f: string) => /^[\w.[\]]+$/.test(f);
const escSql = (v: any) => String(v ?? "").replace(/'/g, "''");
const keyLiteral = (v: any) => (typeof v === "number" ? String(v) : `N'${escSql(v)}'`);

/** ترتيب ثابت (العمود ثم المفتاح) عشان الصفحات ماتكررش — السيرفر بيضيف اتجاه الترتيب بعد النص ده */
export function buildSelectOrder(config: DynamicSelectConfig): string {
  const ob = config.orderBy || config.valueField;
  const dir = config.orderType || "ASC";
  return ob !== config.valueField && isValidField(ob) && isValidField(config.valueField)
    ? `${ob} ${dir}, ${config.valueField}`
    : ob;
}

export interface SearchableSelectProps {
  config: DynamicSelectConfig;
  value?: any;
  onChange?: (value: any, attributes: Record<string, any>) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  selectedColumns: string[];
  validAttributes: string[];
  initialOptions: any[];
  initialTotal: number;
}

export default function SearchableSelect({
  config, value, onChange, disabled = false, error = false, className = "",
  selectedColumns, validAttributes, initialOptions, initialTotal,
}: SearchableSelectProps) {
  const lang = useSys((s) => s.lang);
  const t = useCallback((en: string, ar: string) => (lang === "ar" ? ar : en), [lang]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<any[]>(initialOptions);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [hi, setHi] = useState(-1);
  const [selLabel, setSelLabel] = useState("");
  const [rect, setRect] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  const labelSeqRef = useRef(0);
  const labelCache = useRef<Map<string, string>>(new Map());

  const orderExpr = useMemo(() => buildSelectOrder(config), [config.orderBy, config.orderType, config.valueField]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- جلب صفحة (مع بحث اختياري) ----------
  const fetchPage = useCallback(async (q: string, pg: number) => {
    let cond = config.condition || "";
    if (q) {
      const safe = escSql(q);
      const fields = config.searchFields && config.searchFields.length ? config.searchFields : [config.displayField];
      const parts = fields.filter(isValidField).map((f) => `${f} LIKE N'%${safe}%'`);
      if (/^\d+$/.test(q) && isValidField(config.valueField) && q.length < 10) parts.push(`${config.valueField} = ${Number(q)}`);
      if (parts.length) {
        const clause = `(${parts.join(" OR ")})`;
        cond = cond ? `(${cond}) AND ${clause}` : clause;
      }
    }
    return SQL.Select(
      config.tableName, cond, selectedColumns, null, null, 0,
      orderExpr, config.orderType || "ASC", 0, "", null, null,
      pg, SELECT_PAGE_SIZE, true
    );
  }, [config, selectedColumns, orderExpr]);

  // ---------- debounce للكتابة ----------
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(h);
  }, [query]);

  // ---------- أول صفحة لما القايمة تتفتح أو البحث يتغير ----------
  useEffect(() => {
    if (!open) return;
    if (debouncedQ === "") {
      // من غير بحث: الصفحة الأولى اللي اتحمّلت مع أول تحميل
      seqRef.current++;
      setLoadingMore(false);
      setItems(initialOptions);
      setTotal(initialTotal);
      setPage(1);
      setExhausted(false);
      setLoading(false);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadingMore(false);
    setExhausted(false);
    fetchPage(debouncedQ, 1)
      .then((res) => {
        if (seq !== seqRef.current) return;
        setItems(res.data || []);
        setTotal(res.totalCount || 0);
        setPage(1);
        setHi(res.data?.length ? 0 : -1);
      })
      .catch(() => { if (seq === seqRef.current) { setItems([]); setTotal(0); } })
      .finally(() => { if (seq === seqRef.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedQ]);

  // ---------- الصفحة اللي بعدها (تمرير جوه القايمة) ----------
  const hasMore = open && !exhausted && items.length < total;
  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    const seq = ++seqRef.current;
    setLoadingMore(true);
    fetchPage(debouncedQ, page + 1)
      .then((res) => {
        if (seq !== seqRef.current) return;
        const rows = res.data || [];
        if (rows.length === 0) setExhausted(true);
        setItems((prev) => {
          const seen = new Set(prev.map((r) => r?.[config.valueField]));
          return prev.concat(rows.filter((r: any) => !seen.has(r?.[config.valueField])));
        });
        setPage(page + 1);
      })
      .catch(() => { if (seq === seqRef.current) setExhausted(true); })
      .finally(() => { if (seq === seqRef.current) setLoadingMore(false); });
  }, [hasMore, loading, loadingMore, fetchPage, debouncedQ, page, config.valueField]);

  const sentinelRef = useInfiniteSentinel({
    enabled: hasMore && !loading && !loadingMore,
    onLoadMore: loadMore,
    rootRef: listRef,
    rootMargin: "80px",
    watch: items.length,
  });

  // ---------- اسم القيمة المختارة (حتى لو مش في الصفحة) ----------
  useEffect(() => {
    if (value === null || value === undefined || value === "") { setSelLabel(""); return; }
    const key = String(value);
    const known = [...items, ...initialOptions].find((r) => String(r?.[config.valueField]) === key);
    if (known) {
      const lbl = String(known[config.displayField] ?? "");
      labelCache.current.set(key, lbl);
      setSelLabel(lbl);
      return;
    }
    const cached = labelCache.current.get(key);
    if (cached !== undefined) { setSelLabel(cached); return; }
    const seq = ++labelSeqRef.current;
    SQL.Select(config.tableName, `${config.valueField} = ${keyLiteral(value)}`, [config.valueField, config.displayField], null, null, 0, "", "ASC", 1)
      .then((res) => {
        if (seq !== labelSeqRef.current) return;
        const lbl = String(res.data?.[0]?.[config.displayField] ?? key);
        labelCache.current.set(key, lbl);
        setSelLabel(lbl);
      })
      .catch(() => { if (seq === labelSeqRef.current) setSelLabel(key); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialOptions, config.tableName, config.valueField, config.displayField]);

  // ---------- فتح/قفل ----------
  const openList = () => {
    if (disabled || open) return;
    const r = inputRef.current?.getBoundingClientRect();
    if (r) {
      const spaceBelow = window.innerHeight - r.bottom;
      setRect(spaceBelow < 280 && r.top > spaceBelow
        ? { left: r.left, width: Math.max(r.width, 220), bottom: window.innerHeight - r.top + 4 }
        : { left: r.left, width: Math.max(r.width, 220), top: r.bottom + 4 });
    }
    setQuery("");
    setDebouncedQ("");
    setHi(-1);
    setOpen(true);
  };
  const closeList = useCallback(() => { setOpen(false); setQuery(""); }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (inputRef.current?.contains(n) || listRef.current?.contains(n)) return;
      closeList();
    };
    const onScrollOrResize = (e: Event) => {
      if (e.target instanceof Node && listRef.current?.contains(e.target)) return;
      closeList();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, closeList]);

  const choose = (row: any | null) => {
    if (!row) {
      onChange?.("", {});
    } else {
      const attrs: Record<string, any> = {};
      for (const a of validAttributes) attrs[a] = row[a] ?? null;
      labelCache.current.set(String(row[config.valueField]), String(row[config.displayField] ?? ""));
      onChange?.(row[config.valueField], attrs);
    }
    closeList();
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); closeList(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(items.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hi >= 0 && items[hi]) choose(items[hi]); }
  };

  // مرّر العنصر المحدد بالكيبورد لمجال الرؤية
  useEffect(() => {
    if (!open || hi < 0) return;
    (listRef.current?.querySelector(`[data-idx="${hi}"]`) as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const placeholderText = config.placeholder ? t(config.placeholder.en, config.placeholder.ar) : t("Select...", "اختر...");
  const inputCls =
    `w-full h-10 md:h-9 ps-3 pe-8 rounded-lg border text-[13px] bg-erp-surface text-erp-text placeholder:text-erp-text-subtle focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition ` +
    (error ? "border-erp-danger" : "border-erp-border-strong") + (disabled ? " opacity-60 cursor-not-allowed" : "") + " " + className;

  return (
    <div className="relative" dir={lang === "ar" ? "rtl" : "ltr"}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={inputCls}
        value={open ? query : selLabel}
        placeholder={open ? (selLabel || t("Type to search...", "اكتب للبحث...")) : placeholderText}
        disabled={disabled}
        onFocus={openList}
        onClick={openList}
        onChange={(e) => { if (!open) openList(); setQuery(e.target.value); }}
        onKeyDown={onKeyDown}
      />
      <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-erp-text-subtle" aria-hidden="true">
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </span>

      {open && rect && typeof document !== "undefined" && createPortal(
        <div
          ref={listRef}
          role="listbox"
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="fixed z-[100000] max-h-64 overflow-y-auto rounded-lg border border-erp-border bg-erp-surface shadow-erp-4 py-1"
          style={{ left: rect.left, width: rect.width, top: rect.top, bottom: rect.bottom }}
        >
          <button
            type="button"
            className="w-full text-start px-3 py-2 text-[13px] text-erp-text-muted hover:bg-erp-surface-2"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(null)}
          >
            {placeholderText}
          </button>
          {items.map((row, idx) => {
            const selected = String(row[config.valueField]) === String(value ?? "");
            return (
              <button
                key={`${row[config.valueField]}-${idx}`}
                type="button"
                role="option"
                aria-selected={selected}
                data-idx={idx}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHi(idx)}
                onClick={() => choose(row)}
                className={`w-full text-start px-3 py-2 text-[13px] truncate ${
                  idx === hi ? "bg-erp-accent-soft text-erp-accent" : selected ? "bg-erp-surface-2 text-erp-text font-medium" : "text-erp-text hover:bg-erp-surface-2"
                }`}
              >
                {String(row[config.displayField] ?? "")}
              </button>
            );
          })}
          {loading && <div className="px-3 py-3 text-xs text-erp-text-muted text-center">{t("Loading...", "جاري التحميل...")}</div>}
          {!loading && items.length === 0 && <div className="px-3 py-3 text-xs text-erp-text-muted text-center">{t("No results", "لا توجد نتائج")}</div>}
          {!loading && items.length > 0 && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}
          {loadingMore && <div className="px-3 py-2 text-xs text-erp-text-muted text-center">{t("Loading more…", "جاري تحميل المزيد…")}</div>}
          {!loading && total > 0 && (
            <div className="px-3 py-1 text-[11px] text-erp-text-subtle text-center border-t border-erp-border mt-1">
              {items.length} / {total}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
