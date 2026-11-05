'use client';

// =====================================================================================
//  🌳 TreeView.tsx — شجرة سريعة للبيانات الكبيرة
// -------------------------------------------------------------------------------------
//  • تحميل كسول: كل مستوى بيتحمل لما تفتحه بس (مش الشجرة كلها مرة واحدة)
//  • Infinite Scroll: لو مستوى فيه آلاف العقد بيتحمل صفحة صفحة وانت بتنزل
//  • Virtualization: بيرسم الصفوف اللي قدامك بس، فالشجرة تفضل خفيفة مهما كبرت
//  • بحث من السيرفر + "إظهار في الشجرة" (بيفتح كل الآباء ويوصلك للعقدة)
//  • كيبورد: ↑ ↓ للتنقل، → فتح، ← قفل، Enter اختيار
//
//  الاستخدام:
//    const ref = useRef<TreeViewHandle>(null);
//    <TreeView ref={ref} config={cfg} selectedKey={sel?.key} onSelect={setSel} />
//    ref.current?.refreshChildren(parentCode)   // بعد إضافة/حذف
//    ref.current?.reveal(code)                   // يفتح الطريق للعقدة ويختارها
// =====================================================================================

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { SQL } from "../../CallDataBase";
import { Sys } from "../../SystemTools";
import { useSys } from "../../SystemUsing";
import { TreeNode, TreeNodeConfig } from "./ModelTree";

export interface TreeViewConfig extends TreeNodeConfig {
  condition?: string;
  orderBy?: string;
  pageSize?: number;
  searchColumns?: string[];
}

export interface TreeViewHandle {
  reload: () => void;
  refreshChildren: (parentCode: string | null) => Promise<void>;
  reveal: (code: string) => Promise<void>;
  getNode: (code: string) => TreeNode | undefined;
}

interface TreeViewProps {
  config: TreeViewConfig;
  selectedKey?: any;
  onSelect?: (node: TreeNode) => void;
  onDoubleClick?: (node: TreeNode) => void;
  renderActions?: (node: TreeNode) => React.ReactNode;
  toolbarExtra?: React.ReactNode;
  height?: string;
}

const ROOT = "\u0000root";
const ROW_H = 34;
const OVERSCAN = 10;

type Bucket = { codes: string[]; total: number; page: number; loading: boolean; loaded: boolean };
type FlatRow =
  | { type: "node"; node: TreeNode; depth: number }
  | { type: "more"; parent: string; depth: number; loading: boolean; remaining: number }
  | { type: "loading"; depth: number };

const esc = (v: any) => String(v ?? "").replace(/'/g, "''");
const lit = (v: any) => `N'${esc(v)}'`;
const isBlank = (v: any) => v === null || v === undefined || String(v).trim() === "";

const TreeView = forwardRef<TreeViewHandle, TreeViewProps>(function TreeView(
  { config, selectedKey, onSelect, onDoubleClick, renderActions, toolbarExtra, height = "calc(100vh - 220px)" },
  ref
) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const isDark = useSys((s) => s.IsDark);
  const t = useCallback((en: string, ar: string) => (IsLangEN ? en : ar), [IsLangEN]);

  const source = config.viewName || config.tableName;
  const pageSize = config.pageSize || 50;
  const orderBy = config.orderBy || config.codeColumn;
  const searchCols = config.searchColumns?.length
    ? config.searchColumns
    : [config.codeColumn, config.titleColumn, config.titleColumnEn].filter(Boolean) as string[];

  // ---------- الحالة (في refs عشان السرعة + عداد لإعادة الرسم) ----------
  const nodes = useRef(new Map<string, TreeNode>());
  const buckets = useRef(new Map<string, Bucket>());
  const expanded = useRef(new Set<string>());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ q: string; rows: TreeNode[]; total: number; page: number; loading: boolean } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(600);
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // ---------- شروط SQL ----------
  const withBase = useCallback(
    (c: string) => (config.condition ? `(${config.condition}) AND (${c})` : c),
    [config.condition]
  );
  const parentCond = useCallback(
    (parent: string) => {
      if (parent === ROOT) {
        const rv = config.rootValue;
        return isBlank(rv) ? `(${config.parentColumn} IS NULL OR ${config.parentColumn} = N'')` : `${config.parentColumn} = ${lit(rv)}`;
      }
      return `${config.parentColumn} = ${lit(parent)}`;
    },
    [config.parentColumn, config.rootValue]
  );

  const toNode = useCallback(
    (row: Record<string, any>, depth: number): TreeNode => {
      const leafVal = config.leafColumn ? row[config.leafColumn] : null;
      const actVal = config.activeColumn ? row[config.activeColumn] : null;
      const titleAr = row[config.titleColumn];
      const titleEn = config.titleColumnEn ? row[config.titleColumnEn] : null;
      return {
        key: row[config.keyColumn],
        code: String(row[config.codeColumn] ?? ""),
        parent: isBlank(row[config.parentColumn]) ? "" : String(row[config.parentColumn]),
        title: String((IsLangEN ? titleEn || titleAr : titleAr || titleEn) ?? ""),
        level: depth,
        isLeaf: leafVal === true || leafVal === 1 ? true : null,
        inactive: config.activeColumn ? !(actVal === true || actVal === 1) : false,
        row,
      };
    },
    [config, IsLangEN]
  );

  // يعرف مين من العقد ليه أبناء (استعلام واحد لكل صفحة)
  const detectChildren = useCallback(
    async (list: TreeNode[]) => {
      const unknown = list.filter((n) => n.isLeaf !== true && n.code);
      if (unknown.length === 0) return;
      const inList = unknown.map((n) => lit(n.code)).join(",");
      try {
        const res = await SQL.Select(source, withBase(`${config.parentColumn} IN (${inList})`), [config.parentColumn]);
        const parents = new Set((res.data || []).map((r: any) => String(r[config.parentColumn])));
        for (const n of unknown) n.isLeaf = !parents.has(n.code);
      } catch {
        for (const n of unknown) n.isLeaf = false;
      }
    },
    [source, withBase, config.parentColumn]
  );

  const depthOf = (parent: string) => (parent === ROOT ? 0 : (nodes.current.get(parent)?.level ?? -1) + 1);

  // ---------- تحميل صفحة أبناء ----------
  const loadPage = useCallback(
    async (parent: string, reset = false) => {
      let b = buckets.current.get(parent);
      if (!b || reset) {
        b = { codes: reset && b ? [] : [], total: 0, page: 0, loading: false, loaded: false };
        buckets.current.set(parent, b);
      }
      if (b.loading) return;
      if (b.loaded && b.codes.length >= b.total) return;
      b.loading = true;
      bump();
      try {
        const res = await SQL.Select(source, withBase(parentCond(parent)), null, null, null, 0, orderBy, "ASC", 0, "", null, null, b.page + 1, pageSize, true);
        const depth = depthOf(parent);
        const list = (res.data || []).map((r: any) => toNode(r, depth));
        await detectChildren(list);
        const existing = new Set(b.codes);
        for (const n of list) {
          nodes.current.set(n.code, n);
          if (!existing.has(n.code)) b.codes.push(n.code);
        }
        b.page += 1;
        b.total = Math.max(res.totalCount || 0, b.codes.length);
        if (list.length < pageSize) b.total = b.codes.length;
        b.loaded = true;
      } catch (e) {
        Sys.ShowMessage("❌ Failed to load tree: " + Sys.GetErrorMessage(e), "❌ فشل تحميل الشجرة: " + Sys.GetErrorMessage(e), "error");
        b.loaded = true;
        b.total = b.codes.length;
      } finally {
        b.loading = false;
        bump();
      }
    },
    [source, withBase, parentCond, orderBy, pageSize, toNode, detectChildren, bump]
  );

  const reload = useCallback(() => {
    nodes.current.clear();
    buckets.current.clear();
    expanded.current.clear();
    setSearch(null);
    setQuery("");
    loadPage(ROOT);
  }, [loadPage]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, config.condition, IsLangEN]);

  const toggle = useCallback(
    (n: TreeNode) => {
      if (n.isLeaf) return;
      if (expanded.current.has(n.code)) expanded.current.delete(n.code);
      else {
        expanded.current.add(n.code);
        if (!buckets.current.get(n.code)?.loaded) loadPage(n.code);
      }
      bump();
    },
    [loadPage, bump]
  );

  // ---------- القائمة المسطحة (اللي بتترسم) ----------
  const flat = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    const walk = (parent: string, depth: number) => {
      const b = buckets.current.get(parent);
      if (!b) return;
      if (!b.loaded && b.loading) {
        out.push({ type: "loading", depth });
        return;
      }
      for (const code of b.codes) {
        const node = nodes.current.get(code);
        if (!node) continue;
        out.push({ type: "node", node, depth });
        if (expanded.current.has(code) && !node.isLeaf) {
          if (buckets.current.get(code)) walk(code, depth + 1);
          else out.push({ type: "loading", depth: depth + 1 });
        }
      }
      if (b.codes.length < b.total) out.push({ type: "more", parent, depth, loading: b.loading, remaining: b.total - b.codes.length });
    };
    walk(ROOT, 0);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // ---------- البحث ----------
  const runSearch = useCallback(
    async (q: string, page: number, prev: TreeNode[]) => {
      const like = `N'%${esc(q).replace(/[%_[]/g, "[$&]")}%'`;
      const cond = withBase("(" + searchCols.map((c) => `${c} LIKE ${like}`).join(" OR ") + ")");
      setSearch({ q, rows: prev, total: prev.length, page: page - 1, loading: true });
      try {
        const res = await SQL.Select(source, cond, null, null, null, 0, orderBy, "ASC", 0, "", null, null, page, pageSize, true);
        const list = (res.data || []).map((r: any) => toNode(r, 0));
        const rows = [...prev, ...list];
        setSearch((s) => (s && s.q !== q ? s : { q, rows, total: list.length < pageSize ? rows.length : Math.max(res.totalCount || 0, rows.length), page, loading: false }));
      } catch (e) {
        setSearch({ q, rows: prev, total: prev.length, page, loading: false });
        Sys.ShowMessage("❌ Search failed: " + Sys.GetErrorMessage(e), "❌ فشل البحث: " + Sys.GetErrorMessage(e), "error");
      }
    },
    [withBase, searchCols, source, orderBy, pageSize, toNode]
  );

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearch(null);
      return;
    }
    const h = setTimeout(() => runSearch(q, 1, []), 350);
    return () => clearTimeout(h);
  }, [query, runSearch]);

  // ---------- إظهار عقدة في الشجرة ----------
  const reveal = useCallback(
    async (code: string) => {
      try {
        // نطلع لفوق: سلسلة الآباء من العقدة للجذر
        const chain: Record<string, any>[] = [];
        let cur: string | null = code;
        const seen = new Set<string>();
        while (cur && !seen.has(cur) && chain.length < 50) {
          seen.add(cur);
          const known = nodes.current.get(cur);
          let row = known?.row;
          if (!row) {
            const r = await SQL.Select(source, withBase(`${config.codeColumn} = ${lit(cur)}`), null, null, null, 0, config.codeColumn, "ASC", 1);
            row = r.data?.[0];
          }
          if (!row) break;
          chain.unshift(row);
          cur = isBlank(row[config.parentColumn]) ? null : String(row[config.parentColumn]);
        }
        if (chain.length === 0) return;
        // ننزل لتحت: نتأكد إن كل مستوى محمّل وفيه العقدة اللي بعدها
        let parent = ROOT;
        for (let i = 0; i < chain.length; i++) {
          if (!buckets.current.get(parent)?.loaded) await loadPage(parent);
          const b = buckets.current.get(parent)!;
          const row = chain[i];
          const c = String(row[config.codeColumn]);
          if (!nodes.current.has(c)) {
            const n = toNode(row, i);
            await detectChildren([n]);
            nodes.current.set(c, n);
          }
          if (!b.codes.includes(c)) {
            b.codes.push(c);
            b.total = Math.max(b.total, b.codes.length);
          }
          if (i < chain.length - 1) expanded.current.add(c);
          parent = c;
        }
        setQuery("");
        setSearch(null);
        setFocusCode(code);
        bump();
        const node = nodes.current.get(code);
        if (node) onSelect?.(node);
      } catch (e) {
        Sys.ShowMessage("❌ " + Sys.GetErrorMessage(e), "❌ " + Sys.GetErrorMessage(e), "error");
      }
    },
    [source, withBase, config.codeColumn, config.parentColumn, loadPage, toNode, detectChildren, bump, onSelect]
  );

  // بعد إظهار عقدة: نعمل سكرول لحد عندها
  useEffect(() => {
    if (!focusCode || !scroller.current) return;
    const idx = flat.findIndex((r) => r.type === "node" && r.node.code === focusCode);
    if (idx >= 0) {
      const top = idx * ROW_H;
      const el = scroller.current;
      if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - ROW_H) el.scrollTop = Math.max(0, top - el.clientHeight / 2);
    }
  }, [focusCode, flat]);

  // ---------- تحديث أبناء عقدة (بعد إضافة / تعديل / حذف) ----------
  const refreshChildren = useCallback(
    async (parentCode: string | null) => {
      const p = isBlank(parentCode) ? ROOT : String(parentCode);
      const old = buckets.current.get(p);
      const keepPages = Math.max(1, old?.page || 1);
      buckets.current.set(p, { codes: [], total: 0, page: 0, loading: false, loaded: false });
      for (let i = 0; i < keepPages; i++) {
        await loadPage(p);
        const b = buckets.current.get(p)!;
        if (b.codes.length >= b.total) break;
      }
      if (p !== ROOT) {
        const n = nodes.current.get(p);
        if (n) {
          n.isLeaf = (buckets.current.get(p)?.codes.length || 0) === 0;
          expanded.current.add(p);
        }
      }
      bump();
    },
    [loadPage, bump]
  );

  useImperativeHandle(ref, () => ({ reload, refreshChildren, reveal, getNode: (c) => nodes.current.get(c) }), [reload, refreshChildren, reveal]);

  // ---------- Virtualization ----------
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, [search === null]);

  const rows = search ? search.rows : null;
  const count = rows ? rows.length + (search!.rows.length < search!.total || search!.loading ? 1 : 0) : flat.length;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(count, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);

  // Infinite scroll: أي صف "تحميل المزيد" ظاهر → حمّل الصفحة اللي بعدها
  useEffect(() => {
    if (search) {
      if (!search.loading && search.rows.length < search.total && end >= search.rows.length) runSearch(search.q, search.page + 1, search.rows);
      return;
    }
    for (let i = start; i < end; i++) {
      const r = flat[i];
      if (r && r.type === "more" && !r.loading) loadPage(r.parent);
    }
  }, [start, end, flat, search, loadPage, runSearch]);

  // ---------- الكيبورد ----------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (search) return;
    const nodeRows = flat.filter((r) => r.type === "node") as Extract<FlatRow, { type: "node" }>[];
    const i = nodeRows.findIndex((r) => r.node.key === selectedKey);
    const cur = nodeRows[i]?.node;
    const go = (n?: TreeNode) => {
      if (!n) return;
      e.preventDefault();
      onSelect?.(n);
      setFocusCode(n.code);
    };
    const rtl = !IsLangEN;
    if (e.key === "ArrowDown") go(nodeRows[Math.min(nodeRows.length - 1, i + 1)]?.node);
    else if (e.key === "ArrowUp") go(nodeRows[Math.max(0, i - 1)]?.node);
    else if (cur && (e.key === (rtl ? "ArrowLeft" : "ArrowRight"))) {
      e.preventDefault();
      if (!expanded.current.has(cur.code)) toggle(cur);
    } else if (cur && (e.key === (rtl ? "ArrowRight" : "ArrowLeft"))) {
      e.preventDefault();
      if (expanded.current.has(cur.code)) toggle(cur);
      else if (cur.parent) go(nodes.current.get(cur.parent));
    } else if (cur && e.key === "Enter") {
      e.preventDefault();
      onDoubleClick?.(cur);
    }
  };

  // ---------- الرسم ----------
  const muted = isDark ? "text-gray-400" : "text-gray-500";
  const hover = isDark ? "hover:bg-gray-800/70" : "hover:bg-blue-50/70";
  const selBg = isDark ? "bg-blue-900/40 ring-1 ring-blue-500/50" : "bg-blue-100 ring-1 ring-blue-300";
  const rootBucket = buckets.current.get(ROOT);
  const loadedCount = nodes.current.size;

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="bg-yellow-300/70 text-inherit rounded px-0.5">{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </>
    );
  };

  const renderNode = (node: TreeNode, depth: number, inSearch: boolean) => {
    const isOpen = expanded.current.has(node.code);
    const selected = node.key === selectedKey && selectedKey !== undefined && selectedKey !== null;
    const icon = node.isLeaf ? "fa-file-lines text-gray-400" : isOpen ? "fa-folder-open text-amber-500" : "fa-folder text-amber-500";
    return (
      <div
        className={`group flex items-center gap-1.5 rounded-lg cursor-pointer select-none transition-colors ${selected ? selBg : hover} ${node.inactive ? "opacity-50" : ""}`}
        style={{ height: ROW_H - 2, paddingInlineStart: 6 + depth * 20, paddingInlineEnd: 6 }}
        onClick={() => (inSearch ? reveal(node.code) : onSelect?.(node))}
        onDoubleClick={() => (inSearch ? undefined : node.isLeaf ? onDoubleClick?.(node) : toggle(node))}
        title={inSearch ? t("Show in tree", "إظهار في الشجرة") : undefined}
      >
        {!inSearch && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle(node);
            }}
            className={`w-5 h-5 flex items-center justify-center rounded ${node.isLeaf ? "invisible" : isDark ? "hover:bg-gray-700" : "hover:bg-gray-200"}`}
            aria-label={isOpen ? t("Collapse", "قفل") : t("Expand", "فتح")}
          >
            {node.isLeaf === null ? (
              <i className="fa-solid fa-circle text-[5px] text-gray-400" />
            ) : (
              <i className={`fa-solid fa-chevron-${isOpen ? "down" : IsLangEN ? "right" : "left"} text-[10px] ${muted}`} />
            )}
          </button>
        )}
        <i className={`fa-solid ${inSearch ? "fa-magnifying-glass-location text-blue-500" : icon} text-sm w-4 text-center`} />
        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isDark ? "bg-gray-800 text-blue-300" : "bg-gray-100 text-blue-700"}`}>
          {inSearch ? highlight(node.code, search?.q || "") : node.code}
        </span>
        <span className="truncate text-sm flex-1 min-w-0">{inSearch ? highlight(node.title, search?.q || "") : node.title}</span>
        {inSearch && node.parent && <span className={`text-[11px] ${muted} truncate max-w-[30%]`}>↖ {node.parent}</span>}
        {!inSearch && renderActions && <span className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0 transition-opacity">{renderActions(node)}</span>}
      </div>
    );
  };

  const items: React.ReactNode[] = [];
  for (let i = start; i < end; i++) {
    let content: React.ReactNode = null;
    if (rows) {
      const n = rows[i];
      content = n ? (
        renderNode(n, 0, true)
      ) : (
        <div className={`flex items-center gap-2 px-3 text-xs ${muted}`} style={{ height: ROW_H - 2 }}>
          <i className="fa-solid fa-spinner fa-spin" /> {t("Loading...", "جاري التحميل...")}
        </div>
      );
    } else {
      const r = flat[i];
      if (!r) continue;
      if (r.type === "node") content = renderNode(r.node, r.depth, false);
      else
        content = (
          <div className={`flex items-center gap-2 text-xs ${muted}`} style={{ height: ROW_H - 2, paddingInlineStart: 30 + r.depth * 20 }}>
            <i className="fa-solid fa-spinner fa-spin" />
            {r.type === "more" ? t(`Loading more... (${r.remaining} left)`, `جاري تحميل المزيد... (فاضل ${r.remaining})`) : t("Loading...", "جاري التحميل...")}
          </div>
        );
    }
    items.push(
      <div key={i} style={{ position: "absolute", top: i * ROW_H, insetInlineStart: 0, insetInlineEnd: 0, height: ROW_H }} className="px-1">
        {content}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-h-0" style={{ height }}>
      {/* ===== شريط البحث ===== */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <i className={`fa-solid fa-magnifying-glass absolute top-1/2 -translate-y-1/2 ${muted} text-sm`} style={{ insetInlineStart: 12 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by code or name...", "بحث بالكود أو الاسم...")}
            className={`w-full rounded-xl border py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? "bg-gray-800/70 border-gray-700 text-white" : "bg-white border-gray-300"}`}
            style={{ paddingInlineStart: 36, paddingInlineEnd: 32 }}
          />
          {query && (
            <button onClick={() => setQuery("")} className={`absolute top-1/2 -translate-y-1/2 ${muted} hover:text-red-500`} style={{ insetInlineEnd: 10 }} aria-label={t("Clear", "مسح")}>
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            expanded.current.clear();
            bump();
          }}
          title={t("Collapse all", "قفل الكل")}
          className={`w-9 h-9 rounded-xl border ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}
        >
          <i className="fa-solid fa-compress" />
        </button>
        <button onClick={reload} title={t("Reload", "تحديث")} className={`w-9 h-9 rounded-xl border ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}>
          <i className="fa-solid fa-rotate" />
        </button>
        {toolbarExtra}
      </div>

      {/* ===== معلومة صغيرة ===== */}
      <div className={`flex items-center justify-between text-[11px] px-1 ${muted}`}>
        {search ? (
          <span>
            <i className="fa-solid fa-filter mx-1" />
            {search.loading && search.rows.length === 0 ? t("Searching...", "جاري البحث...") : t(`${search.total} result(s) — click one to show it in the tree`, `${search.total} نتيجة — دوس على أي واحدة عشان تظهر في الشجرة`)}
          </span>
        ) : (
          <span>
            <i className="fa-solid fa-sitemap mx-1" />
            {t(`${rootBucket?.total ?? 0} root(s) · ${loadedCount} loaded`, `${rootBucket?.total ?? 0} جذر · ${loadedCount} محمّل`)}
          </span>
        )}
        <span className="hidden sm:inline">{t("↑↓ move · →← open/close · Enter edit", "↑↓ تنقل · →← فتح/قفل · Enter تعديل")}</span>
      </div>

      {/* ===== الشجرة ===== */}
      <div
        ref={scroller}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        className={`relative flex-1 min-h-0 overflow-y-auto rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${isDark ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-white"}`}
      >
        {count === 0 && !(rootBucket?.loading || search?.loading) ? (
          <div className={`flex flex-col items-center justify-center h-full gap-2 p-6 text-center ${muted}`}>
            <i className={`fa-solid ${search ? "fa-magnifying-glass" : "fa-seedling"} text-4xl opacity-40`} />
            <p className="text-sm">{search ? t("No results", "مفيش نتايج") : t("The tree is empty — add the first root", "الشجرة فاضية — ضيف أول جذر")}</p>
          </div>
        ) : (
          <div style={{ height: Math.max(count, 1) * ROW_H, position: "relative" }}>{items}</div>
        )}
      </div>
    </div>
  );
});

export default TreeView;
