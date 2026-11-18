"use client";

// =====================================================================================
//  ReportDocument.tsx  -  تصميم JSON + بيانات  ←  صفحات HTML جاهزة للعرض والطباعة
//   1) بيبني "بلوكات" بالترتيب: رأس التقرير، رأس مجموعة، صفوف، تذييل مجموعة، إجمالي، تذييل التقرير
//   2) بيقيس ارتفاع كل بلوك فعليًا في المتصفح (خطوط عربي / التفاف نص)
//   3) بيوزّع البلوكات على صفحات بمقاس الورق (رأس/تذييل الصفحة بيتكرروا، رأس الجدول بيتكرر)
//  الطباعة بتاخد نفس الـ HTML (printReport في print.ts) فالمعاينة = الورق.
// =====================================================================================

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  DataRow, DetailBand, GroupFooterBand, GroupHeaderBand, LabelSettings, PageFooterBand, PageHeaderBand,
  ReportBand, ReportData, ReportLayout, Style, TableColumn,
} from "../ReportLayoutTypes";
import { EvalScope, evaluate } from "./expr";
import { ColGroup, ElemCtx, Elements, cellAlign, cellValue, colTitle, styleCss, totalValue } from "./elements";
import { PX_PER_MM, ResolvedPage, resolvePage } from "./paper";

// ---------------------------------------------------------------- data

export interface NormalizedData {
  tables: Record<string, DataRow[]>;
  header: DataRow;
  company: DataRow;
  params: DataRow;
}

export function normalizeData(layout: ReportLayout, data: ReportData): NormalizedData {
  const tables: Record<string, DataRow[]> = { ...(data.tables || {}) };
  for (const [orig, alias] of Object.entries(layout.data?.tables || {})) {
    if (tables[orig] && !tables[alias]) tables[alias] = tables[orig];
  }
  return { tables, header: tables.header?.[0] ?? {}, company: data.company ?? {}, params: data.params ?? {} };
}

export function detailBandOf(layout: ReportLayout): DetailBand | undefined {
  return layout.bands.find((b) => b.type === "detail") as DetailBand | undefined;
}

export function detailRowsOf(layout: ReportLayout, nd: NormalizedData): DataRow[] {
  const band = detailBandOf(layout);
  const name = band?.table ?? (nd.tables.lines ? "lines" : Object.keys(nd.tables).find((k) => k !== "header") ?? "Data");
  let rows = nd.tables[name] ?? [];
  if (band?.sortBy?.length) {
    const keys = band.sortBy;
    rows = [...rows].sort((a, b) => {
      for (const k of keys) {
        const desc = k.startsWith("-"); const f = desc ? k.slice(1) : k;
        const x = a[f], y = b[f];
        if (x === y) continue;
        const r = (typeof x === "number" && typeof y === "number") ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
        return desc ? -r : r;
      }
      return 0;
    });
  }
  return rows;
}

/** أعمدة جدول الـ detail (لو مش متحددة: كل أعمدة أول صف) */
export function detailColumns(band: DetailBand | undefined, rows: DataRow[]): TableColumn[] {
  if (band?.columns?.length) return band.columns;
  const first = rows[0] ?? {};
  return Object.keys(first).map((f) => ({ field: f, title: f }));
}

// ---------------------------------------------------------------- blocks

type Block =
  | { k: "band"; band: ReportBand; scope: EvalScope; keepWithNext?: boolean }
  | { k: "row"; band: DetailBand; scope: EvalScope; idx: number }
  | { k: "totals"; band: DetailBand; scope: EvalScope };

function buildBlocks(layout: ReportLayout, nd: NormalizedData, rows: DataRow[], base: EvalScope): Block[] {
  const bands = layout.bands;
  const detail = detailBandOf(layout);
  const gh = bands.filter((b) => b.type === "groupHeader") as GroupHeaderBand[];
  const gf = bands.filter((b) => b.type === "groupFooter") as GroupFooterBand[];
  const levels = Array.from(new Set([...gh.map((b) => b.groupBy), ...gf.map((b) => b.groupBy)]));
  const out: Block[] = [];
  const all: EvalScope = { ...base, row: nd.header, aggRows: rows };
  const visible = (b: ReportBand, s: EvalScope) => !b.visibleIf || !!evaluate(b.visibleIf, s);

  for (const b of bands) if (b.type === "reportHeader" && visible(b, all)) out.push({ k: "band", band: b, scope: all });

  let n = 0;
  const walk = (seg: DataRow[], level: number) => {
    if (level >= levels.length) {
      for (const r of seg) {
        n++;
        const s: EvalScope = { ...base, row: r, aggRows: rows, rowNumber: n };
        if (!detail || detail.layout === "table" || detail.layout === undefined) { if (detail) out.push({ k: "row", band: detail, scope: s, idx: n }); }
        else if (visible(detail, s)) out.push({ k: "band", band: detail, scope: s });
      }
      return;
    }
    const key = levels[level];
    let i = 0;
    while (i < seg.length) {
      const v = seg[i][key];
      let j = i;
      while (j < seg.length && seg[j][key] === v) j++;
      const part = seg.slice(i, j);
      const hs: EvalScope = { ...base, row: part[0], aggRows: part };
      for (const b of gh) if (b.groupBy === key && visible(b, hs)) out.push({ k: "band", band: b, scope: hs, keepWithNext: b.keepWithNext !== false });
      walk(part, level + 1);
      const fs: EvalScope = { ...base, row: part[part.length - 1], aggRows: part };
      for (const b of gf) if (b.groupBy === key && visible(b, fs)) out.push({ k: "band", band: b, scope: fs });
      i = j;
    }
  };
  walk(rows, 0);

  if (detail && (detail.layout ?? "table") === "table" && detail.showTotals && rows.length) out.push({ k: "totals", band: detail, scope: all });
  for (const b of bands) if (b.type === "reportFooter" && visible(b, all)) out.push({ k: "band", band: b, scope: all });
  return out;
}

// ---------------------------------------------------------------- band / table rendering

interface RCtx { lang: "ar" | "en"; styles: Record<string, Style> }

function BandView({ band, scope, rc, extra }: { band: ReportBand; scope: EvalScope; rc: RCtx; extra?: string }) {
  const ctx: ElemCtx = { scope, lang: rc.lang, styles: rc.styles, absolute: band.layout === "absolute", band: band.type };
  return (
    <div className={`rf-band rf-${band.type} ${extra ?? ""}`} style={{ ...styleCss(band.style), minHeight: band.height && band.layout !== "absolute" ? `${band.height}mm` : undefined }}>
      <Elements elements={band.elements} ctx={ctx} height={band.height} />
    </div>
  );
}

function THead({ band, rc, columns }: { band: DetailBand; rc: RCtx; columns: TableColumn[] }) {
  const th = { ...styleCss(rc.styles.th), ...styleCss(band.headerStyle) };
  return <thead><tr>{columns.map((c, i) => <th key={i} style={{ ...th, ...cellAlign(c) }}>{colTitle(c, rc.lang)}</th>)}</tr></thead>;
}

function RowTr({ b, rc, columns }: { b: Extract<Block, { k: "row" }>; rc: RCtx; columns: TableColumn[] }) {
  const td = styleCss(rc.styles.td);
  return (
    <tr className={b.band.zebra && b.idx % 2 === 0 ? "rf-zebra" : undefined}>
      {columns.map((c, i) => <td key={i} style={{ ...td, ...cellAlign(c) }}>{cellValue(c, b.scope, rc.lang)}</td>)}
    </tr>
  );
}

function TotalsTr({ b, rc, columns, rows }: { b: Extract<Block, { k: "totals" }>; rc: RCtx; columns: TableColumn[]; rows: DataRow[] }) {
  const st = styleCss(rc.styles.total);
  const firstAgg = columns.findIndex((c) => !!c.aggregate);
  return (
    <tr className="rf-totals">
      {columns.map((c, i) => (
        <td key={i} style={{ ...st, ...cellAlign(c) }}>
          {c.aggregate ? totalValue(c, rows, b.scope, rc.lang) : i === 0 && firstAgg !== 0 ? (rc.lang === "en" ? "Total" : "الإجمالي") : ""}
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------- pages

interface PageModel { blocks: Block[]; rows: DataRow[] }

interface Measured { ph: number; pf: number; thead: number; blocks: number[] }

const mmStr = (v: number) => `${v}mm`;

export interface ReportDocumentProps {
  layout: ReportLayout;
  data: ReportData;
  lang: "ar" | "en";
  /** بيتنده لما عدد الصفحات يتحسب */
  onReady?: (info: { pages: number; page: ResolvedPage; heightMm: number | null }) => void;
}

export default function ReportDocument({ layout, data, lang, onReady }: ReportDocumentProps) {
  const page = useMemo(() => resolvePage(layout.page), [layout.page]);
  const nd = useMemo(() => normalizeData(layout, data), [layout, data]);
  const rows = useMemo(() => detailRowsOf(layout, nd), [layout, nd]);
  const detail = detailBandOf(layout);
  const columns = useMemo(() => detailColumns(detail, rows), [detail, rows]);
  const rc: RCtx = useMemo(() => ({ lang, styles: layout.styles ?? {} }), [lang, layout.styles]);
  const base: EvalScope = useMemo(() => ({ header: nd.header, company: nd.company, params: nd.params, tables: nd.tables, lang }), [nd, lang]);
  const blocks = useMemo(() => buildBlocks(layout, nd, rows, base), [layout, nd, rows, base]);
  const ph = layout.bands.find((b) => b.type === "pageHeader") as PageHeaderBand | undefined;
  const pf = layout.bands.find((b) => b.type === "pageFooter") as PageFooterBand | undefined;
  const dir = layout.page.dir && layout.page.dir !== "auto" ? layout.page.dir : lang === "ar" ? "rtl" : "ltr";
  const contentW = page.width - page.margins.left - page.margins.right;
  const isLabels = detail?.layout === "labels" || layout.kind === "labels";
  const baseStyle = styleCss(rc.styles.base);

  const measureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [fontsTick, setFontsTick] = useState(0);

  useLayoutEffect(() => {
    if (typeof document === "undefined" || !(document as any).fonts?.ready) return;
    let off = false;
    (document as any).fonts.ready.then(() => { if (!off) setFontsTick((t) => t + 1); });
    return () => { off = true; };
  }, []);

  useLayoutEffect(() => {
    if (isLabels) return;
    const el = measureRef.current;
    if (!el) return;
    const h = (sel: string) => { const n = el.querySelector(sel) as HTMLElement | null; return n ? n.getBoundingClientRect().height : 0; };
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-mb]"));
    setMeasured({ ph: h("[data-m='ph']"), pf: h("[data-m='pf']"), thead: h("[data-m='thead'] thead"), blocks: items.map((n) => Math.ceil(n.getBoundingClientRect().height) + 1) });
  }, [blocks, columns, rc, fontsTick, isLabels, contentW]);

  // ---------- تقسيم الصفحات
  const pages: PageModel[] = useMemo(() => {
    if (isLabels || !measured) return [];
    const one = (): PageModel => ({ blocks: [], rows: [] });
    if (page.height === null) {
      const p = one();
      for (const b of blocks) { p.blocks.push(b); if (b.k === "row") p.rows.push(b.scope.row!); }
      return [p];
    }
    const content = (page.height - page.margins.top - page.margins.bottom) * PX_PER_MM;
    const out: PageModel[] = [];
    let cur = one(), used = 0, hasTable = false;
    const avail = (idx: number) => content - (ph && !(ph.skipFirstPage && idx === 0) ? measured.ph : 0) - (pf ? measured.pf : 0) - 6;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const isTbl = b.k !== "band";
      let need = measured.blocks[i] + (isTbl && !hasTable ? measured.thead : 0);
      if (b.k === "band" && b.keepWithNext && i + 1 < blocks.length) need += measured.blocks[i + 1] + (blocks[i + 1].k !== "band" && !hasTable ? measured.thead : 0);
      if (cur.blocks.length && used + need > avail(out.length)) {
        out.push(cur); cur = one(); used = 0; hasTable = false;
      }
      cur.blocks.push(b);
      used += measured.blocks[i] + (isTbl && !hasTable ? measured.thead : 0);
      if (isTbl) hasTable = true;
      if (b.k === "row") cur.rows.push(b.scope.row!);
    }
    out.push(cur);
    return out;
  }, [blocks, measured, page, ph, pf, isLabels]);

  // ---------- ملصقات
  const labelPages = useMemo(() => {
    if (!isLabels) return [];
    const ls: LabelSettings = detail?.labels ?? page.labels ?? { columns: 1, rows: 1, width: contentW, height: (page.height ?? 30) - page.margins.top - page.margins.bottom };
    const expanded: DataRow[] = [];
    for (const r of rows) {
      const c = typeof ls.copies === "string" ? parseInt(String(r[ls.copies] ?? 1), 10) : ls.copies ?? 1;
      for (let i = 0; i < Math.max(1, Math.min(500, isFinite(c) ? c : 1)); i++) expanded.push(r);
    }
    const per = Math.max(1, ls.columns * ls.rows);
    const out: { ls: LabelSettings; rows: DataRow[] }[] = [];
    for (let i = 0; i < expanded.length; i += per) out.push({ ls, rows: expanded.slice(i, i + per) });
    if (!out.length) out.push({ ls, rows: [] });
    return out;
  }, [isLabels, detail, page, rows, contentW]);

  const totalPages = isLabels ? labelPages.length : pages.length;
  const autoHeightMm = page.height === null && measured
    ? Math.ceil((measured.ph + measured.pf + measured.blocks.reduce((a, b) => a + b, 0) + (blocks.some((b) => b.k !== "band") ? measured.thead : 0)) / PX_PER_MM + page.margins.top + page.margins.bottom + 2)
    : null;

  useLayoutEffect(() => {
    if (totalPages > 0) onReady?.({ pages: totalPages, page, heightMm: page.height ?? autoHeightMm });
  }, [totalPages, page, autoHeightMm, onReady]);

  const pageStyle = (heightMm: number | null): React.CSSProperties => ({
    width: mmStr(page.width),
    height: heightMm ? mmStr(heightMm) : undefined,
    padding: `${page.margins.top}mm ${page.margins.right}mm ${page.margins.bottom}mm ${page.margins.left}mm`,
    ...baseStyle,
  });

  const renderBody = (pm: PageModel) => {
    const nodes: React.ReactNode[] = [];
    let seg: Block[] = [];
    let theadShown = false;
    const flush = (key: string) => {
      if (!seg.length || !detail) return;
      nodes.push(
        <table key={key} className="rf-table">
          <ColGroup columns={columns} />
          {!theadShown && <THead band={detail} rc={rc} columns={columns} />}
          <tbody>
            {seg.map((b, i) => b.k === "row"
              ? <RowTr key={i} b={b} rc={rc} columns={columns} />
              : b.k === "totals" ? <TotalsTr key={i} b={b} rc={rc} columns={columns} rows={rows} /> : null)}
          </tbody>
        </table>
      );
      theadShown = true;
      seg = [];
    };
    pm.blocks.forEach((b, i) => {
      if (b.k === "band") { flush("t" + i); nodes.push(<BandView key={"b" + i} band={b.band} scope={b.scope} rc={rc} />); }
      else seg.push(b);
    });
    flush("tend");
    return nodes;
  };

  const pageScope = (idx: number, pm?: PageModel): EvalScope => ({ ...base, row: nd.header, aggRows: pm?.rows ?? rows, page: idx + 1, pages: totalPages });

  return (
    <div className="rf-doc" dir={dir} lang={lang}>
      {/* ---- طبقة القياس (مخفية) ---- */}
      {!isLabels && (
        <div ref={measureRef} className="rf-measure" aria-hidden="true" style={{ width: mmStr(contentW), ...baseStyle }}>
          {ph && <div data-m="ph"><BandView band={ph} scope={pageScope(0)} rc={rc} /></div>}
          {pf && <div data-m="pf"><BandView band={pf} scope={pageScope(0)} rc={rc} /></div>}
          {detail && <table data-m="thead" className="rf-table"><ColGroup columns={columns} /><THead band={detail} rc={rc} columns={columns} /></table>}
          {blocks.map((b, i) => (
            <div key={i} data-mb={i}>
              {b.k === "band" ? <BandView band={b.band} scope={b.scope} rc={rc} />
                : <table className="rf-table"><ColGroup columns={columns} /><tbody>
                  {b.k === "row" ? <RowTr b={b} rc={rc} columns={columns} /> : <TotalsTr b={b} rc={rc} columns={columns} rows={rows} />}
                </tbody></table>}
            </div>
          ))}
        </div>
      )}

      {/* ---- الصفحات ---- */}
      {!isLabels && pages.map((pm, idx) => (
        <section key={idx} className="rf-page" data-page={idx + 1} style={pageStyle(page.height ?? autoHeightMm)}>
          <div className="rf-page-inner">
            {ph && !(ph.skipFirstPage && idx === 0) && <BandView band={ph} scope={pageScope(idx, pm)} rc={rc} extra="rf-ph" />}
            <div className="rf-body">{renderBody(pm)}</div>
            {pf && !(pf.skipLastPage && idx === pages.length - 1) && <div className="rf-pf-wrap"><BandView band={pf} scope={pageScope(idx, pm)} rc={rc} /></div>}
          </div>
        </section>
      ))}

      {isLabels && labelPages.map((lp, idx) => {
        const ls = lp.ls;
        return (
          <section key={idx} className="rf-page" data-page={idx + 1} style={pageStyle(page.height ?? (ls.height * ls.rows + page.margins.top + page.margins.bottom))}>
            <div className="rf-labels" style={{ gridTemplateColumns: `repeat(${ls.columns}, ${ls.width}mm)`, gridAutoRows: `${ls.height}mm`, columnGap: mmStr(ls.gapX ?? 0), rowGap: mmStr(ls.gapY ?? 0) }}>
              {lp.rows.map((r, i) => (
                <div key={i} className={`rf-label-cell${ls.outline ? " rf-outline" : ""}`} style={{ ...styleCss(detail?.style) }}>
                  <Elements elements={detail?.elements} height={ls.height}
                    ctx={{ scope: { ...base, row: r, aggRows: rows, rowNumber: idx * ls.columns * ls.rows + i + 1, page: idx + 1, pages: totalPages }, lang, styles: rc.styles, absolute: ls.elementLayout === "absolute", band: "detail" }} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
