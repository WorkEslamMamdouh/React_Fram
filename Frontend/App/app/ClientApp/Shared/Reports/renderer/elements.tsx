// =====================================================================================
//  elements.tsx  -  رسم عناصر التقرير (نص / حقل / صورة / خط / باركود / QR / رسم بياني / جدول ...)
//  كل الرسم متزامن (sync) عشان قياس الارتفاع وتقسيم الصفحات يبقى مضبوط.
// =====================================================================================

import React from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import type {
  Align, BandType, ChartElement, I18nText, ReportElement, Style, TableColumn, TableElement,
} from "../ReportLayoutTypes";
import { EvalScope, evaluate, interpolate } from "./expr";
import { formatValue } from "./format";
import { tafqeet } from "./tafqeet";

export interface ElemCtx {
  scope: EvalScope;
  lang: "ar" | "en";
  styles: Record<string, Style>;
  /** absolute = العناصر بمواضع x/y بالمللي */
  absolute?: boolean;
  band?: BandType;
}

export const i18n = (t: I18nText | undefined, lang: "ar" | "en"): string =>
  t == null ? "" : typeof t === "string" ? t : (lang === "en" ? t.en ?? t.ar : t.ar ?? t.en) ?? "";

const mm = (v: number | undefined) => (v === undefined ? undefined : `${v}mm`);
const sizeOf = (w: string | number | undefined) => (w === undefined ? undefined : typeof w === "number" ? `${w}mm` : w);
const alignCss = (a?: Align): React.CSSProperties["textAlign"] => (a === "start" ? "start" : a === "end" ? "end" : a);

export function styleCss(s?: Style): React.CSSProperties {
  if (!s) return {};
  const c: React.CSSProperties = {};
  if (s.font) c.fontFamily = `${s.font}, "RF Cairo", Tahoma, sans-serif`;
  if (s.size) c.fontSize = `${s.size}pt`;
  if (s.bold !== undefined) c.fontWeight = s.bold ? 700 : 400;
  if (s.italic) c.fontStyle = "italic";
  if (s.underline) c.textDecoration = "underline";
  if (s.color) c.color = s.color;
  if (s.background) c.background = s.background;
  if (s.align) c.textAlign = alignCss(s.align);
  if (s.padding !== undefined) c.padding = mm(s.padding);
  if (s.radius !== undefined) c.borderRadius = mm(s.radius);
  if (s.lineHeight) c.lineHeight = s.lineHeight;
  if (s.nowrap) { c.whiteSpace = "nowrap"; c.overflow = "hidden"; c.textOverflow = "ellipsis"; }
  if (s.border) {
    const line = `${s.borderWidth ?? 0.2}mm solid ${s.borderColor ?? "#9aa4b2"}`;
    if (s.border === true) c.border = line;
    else {
      if (s.border.top) c.borderTop = line;
      if (s.border.bottom) c.borderBottom = line;
      if (s.border.left) c.borderInlineStart = line;
      if (s.border.right) c.borderInlineEnd = line;
    }
  }
  return c;
}

/** الستايل النهائي للعنصر (base + المسمى + الخاص) */
const merge = (...ss: (Style | undefined)[]): Style => Object.assign({}, ...ss.filter(Boolean));

// ---------------------------------------------------------------- barcode / qr

export function barcodeSvg(value: string, format: string, showText: boolean, barHeightMm: number): string | null {
  if (typeof document === "undefined" || !value) return null;
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, { format: format || "CODE128", displayValue: showText, height: Math.max(10, barHeightMm * 4), margin: 0, width: 2, fontSize: 18, textMargin: 1, font: "Arial" });
    const w = svg.getAttribute("width"), h = svg.getAttribute("height");
    if (w && h && !svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    return svg.outerHTML;
  } catch {
    return null;
  }
}

export function qrSvg(value: string, level: "L" | "M" | "Q" | "H" = "M"): string | null {
  if (!value) return null;
  try {
    const q = QRCode.create(value, { errorCorrectionLevel: level });
    const size = q.modules.size, quiet = 2;
    let d = "";
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (q.modules.get(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    const n = size + quiet * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="100%" height="100%" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- chart (SVG خفيف)

const PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

function Chart({ el, ctx }: { el: ChartElement; ctx: ElemCtx }) {
  const rows = (el.table ? ctx.scope.tables?.[el.table] : ctx.scope.aggRows) ?? [];
  const map = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const k = formatValue(evaluate(el.category, { ...ctx.scope, row: r }), "auto", ctx.lang);
    const v = parseFloat(String(evaluate(el.value, { ...ctx.scope, row: r }) ?? 0)) || 0;
    const cur = map.get(k) ?? { sum: 0, n: 0 };
    cur.sum += v; cur.n += 1; map.set(k, cur);
  }
  const agg = el.aggregate ?? "sum";
  const data = Array.from(map.entries()).slice(0, 24).map(([k, x]) => ({ k, v: agg === "count" ? x.n : agg === "avg" ? x.sum / (x.n || 1) : x.sum }));
  const colors = el.colors?.length ? el.colors : PALETTE;
  const W = 400, H = 220;
  const title = i18n(el.title, ctx.lang);
  if (!data.length) return <div className="rf-chart-empty">{ctx.lang === "en" ? "No data" : "لا توجد بيانات"}</div>;

  if (el.chart === "pie" || el.chart === "donut") {
    const total = data.reduce((a, b) => a + Math.max(0, b.v), 0) || 1;
    let a0 = -Math.PI / 2;
    const cx = 110, cy = 110, R = 100, r0 = el.chart === "donut" ? 55 : 0;
    const arcs = data.map((d, i) => {
      const a1 = a0 + (Math.max(0, d.v) / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, rr: number) => `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`;
      const path = r0
        ? `M${p(a0, R)} A${R} ${R} 0 ${large} 1 ${p(a1, R)} L${p(a1, r0)} A${r0} ${r0} 0 ${large} 0 ${p(a0, r0)}Z`
        : `M${cx} ${cy} L${p(a0, R)} A${R} ${R} 0 ${large} 1 ${p(a1, R)}Z`;
      a0 = a1;
      return <path key={i} d={path} fill={colors[i % colors.length]} stroke="#fff" strokeWidth={1} />;
    });
    return (
      <div className="rf-chart">
        {title && <div className="rf-chart-title">{title}</div>}
        <svg viewBox={`0 0 ${W} ${H + 10}`} width="100%" preserveAspectRatio="xMidYMid meet">
          {arcs}
          {data.map((d, i) => (
            <g key={i} transform={`translate(240 ${16 + i * 18})`}>
              <rect width={10} height={10} fill={colors[i % colors.length]} />
              <text x={16} y={9} fontSize={11}>{`${d.k} (${formatValue(d.v, "n2")})`}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.v), 0) || 1;
  const pad = { l: 40, r: 10, t: 10, b: 40 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = iw / data.length;
  const y = (v: number) => pad.t + ih - (Math.max(0, v) / max) * ih;
  return (
    <div className="rf-chart">
      {title && <div className="rf-chart-title">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" direction="ltr">
        <line x1={pad.l} y1={pad.t + ih} x2={W - pad.r} y2={pad.t + ih} stroke="#94a3b8" />
        {[0, 0.5, 1].map((f) => <text key={f} x={pad.l - 4} y={y(max * f) + 4} fontSize={10} textAnchor="end">{formatValue(max * f, "n0")}</text>)}
        {el.chart === "line"
          ? <polyline fill="none" stroke={colors[0]} strokeWidth={2} points={data.map((d, i) => `${pad.l + bw * i + bw / 2},${y(d.v)}`).join(" ")} />
          : data.map((d, i) => <rect key={i} x={pad.l + bw * i + bw * 0.15} y={y(d.v)} width={bw * 0.7} height={pad.t + ih - y(d.v)} fill={colors[i % colors.length]} />)}
        {data.map((d, i) => <text key={i} x={pad.l + bw * i + bw / 2} y={H - pad.b + 14} fontSize={10} textAnchor="middle">{d.k.length > 12 ? d.k.slice(0, 11) + "…" : d.k}</text>)}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- table (جدول فرعي / رأس الجدول)

export function colTitle(c: TableColumn, lang: "ar" | "en") {
  return i18n(c.title, lang) || c.field || "";
}

export function cellValue(c: TableColumn, scope: EvalScope, lang: "ar" | "en"): string {
  const v = c.expr ? evaluate(c.expr, scope) : c.field ? evaluate(c.field.includes(" ") ? `[${c.field}]` : c.field, scope) : "";
  return formatValue(v, c.format ?? "auto", lang);
}

export function totalValue(c: TableColumn, rows: Record<string, any>[], scope: EvalScope, lang: "ar" | "en"): string {
  if (!c.aggregate) return "";
  const target = c.expr ?? (c.field ? (c.field.includes(" ") ? `[${c.field}]` : c.field) : "");
  const v = evaluate(c.aggregate === "count" ? "count()" : `${c.aggregate}(${target})`, { ...scope, aggRows: rows });
  return formatValue(v, c.aggregate === "count" ? "n0" : c.format ?? "n2", lang);
}

export function ColGroup({ columns }: { columns: TableColumn[] }) {
  return <colgroup>{columns.map((c, i) => <col key={i} style={{ width: sizeOf(c.width) }} />)}</colgroup>;
}

export function cellAlign(c: TableColumn): React.CSSProperties {
  const a = c.align ?? (c.format && /^(n\d|c|percent)$/.test(c.format) ? "end" : undefined);
  return a ? { textAlign: alignCss(a) } : {};
}

function SubTable({ el, ctx }: { el: TableElement; ctx: ElemCtx }) {
  const rows = ctx.scope.tables?.[el.table] ?? [];
  const th = merge(ctx.styles.th, el.headerStyle);
  return (
    <table className="rf-table">
      <ColGroup columns={el.columns} />
      <thead><tr>{el.columns.map((c, i) => <th key={i} style={{ ...styleCss(th), ...cellAlign(c) }}>{colTitle(c, ctx.lang)}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className={el.zebra && ri % 2 ? "rf-zebra" : undefined}>
            {el.columns.map((c, i) => <td key={i} style={{ ...styleCss(ctx.styles.td), ...cellAlign(c) }}>{cellValue(c, { ...ctx.scope, row: r, rowNumber: ri + 1 }, ctx.lang)}</td>)}
          </tr>
        ))}
      </tbody>
      {el.showTotals && (
        <tfoot><tr>{el.columns.map((c, i) => <td key={i} style={{ ...styleCss(ctx.styles.total), ...cellAlign(c) }}>{totalValue(c, rows, ctx.scope, ctx.lang)}</td>)}</tr></tfoot>
      )}
    </table>
  );
}

// ---------------------------------------------------------------- element

function imageSrc(v: any): string | null {
  if (v == null || v === "" || v === "#ERR") return null;
  const s = String(v);
  if (/^(data:|https?:|\/|blob:)/i.test(s)) return s;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(s) && s.length > 32) return `data:image/${s.startsWith("/9j/") ? "jpeg" : "png"};base64,${s}`;
  return null;
}

function Element({ el, ctx }: { el: ReportElement; ctx: ElemCtx }) {
  const L = ctx.lang;
  if (el.visibleIf && !evaluate(el.visibleIf, ctx.scope)) return null;
  const st = styleCss(el.style);
  const box: React.CSSProperties = ctx.absolute
    ? { position: "absolute", insetInlineStart: mm(el.x ?? 0), top: mm(el.y ?? 0), width: sizeOf(el.width), height: mm(el.height) }
    : { flex: el.width !== undefined ? `0 1 ${sizeOf(el.width)}` : "0 1 100%", minWidth: 0, maxWidth: el.width !== undefined ? sizeOf(el.width) : "100%", height: mm(el.height) };
  const wrap = (children: React.ReactNode, cls = "") => <div className={`rf-el ${cls}`} style={{ ...box, ...st }}>{children}</div>;

  switch (el.type) {
    case "text": return wrap(interpolate(i18n(el.text, L), ctx.scope), "rf-text");
    case "field": {
      const label = i18n(el.label, L);
      const v = formatValue(evaluate(el.field.includes(" ") ? `[${el.field}]` : el.field, ctx.scope), el.format ?? "auto", L);
      return wrap(label ? <><span className="rf-label">{label}</span> <span>{v}</span></> : v, "rf-text");
    }
    case "expression": {
      const label = i18n(el.label, L);
      const v = formatValue(evaluate(el.expr, ctx.scope), el.format ?? "auto", L);
      return wrap(label ? <><span className="rf-label">{label}</span> <span>{v}</span></> : v, "rf-text");
    }
    case "amountWords": {
      const n = parseFloat(String(evaluate(el.value, ctx.scope) ?? 0)) || 0;
      const pre = interpolate(i18n(el.prefix, L), ctx.scope), suf = interpolate(i18n(el.suffix, L), ctx.scope);
      return wrap([pre, tafqeet(n, el.currency || "EGP"), suf].filter(Boolean).join(" "), "rf-text");
    }
    case "image": {
      const src = imageSrc(el.src.includes("{{") ? interpolate(el.src, ctx.scope) : evaluate(el.src, ctx.scope));
      // eslint-disable-next-line @next/next/no-img-element
      return wrap(src ? <img src={src} alt="" style={{ width: "100%", height: el.height ? "100%" : "auto", objectFit: el.fit ?? "contain" }} /> : null, "rf-image");
    }
    case "line": {
      const t = el.thickness ?? 0.3, color = el.color ?? "#334155", ls = el.dashed ? "dashed" : "solid";
      return el.orientation === "vertical"
        ? <div className="rf-el" style={{ ...box, ...st, borderInlineStart: `${t}mm ${ls} ${color}`, height: mm(el.height ?? 10) }} />
        : <div className="rf-el" style={{ ...box, ...st, borderTop: `${t}mm ${ls} ${color}`, height: 0, margin: ctx.absolute ? undefined : "1mm 0" }} />;
    }
    case "rect": return wrap(el.text ? interpolate(i18n(el.text, L), ctx.scope) : null, "rf-rect");
    case "spacer": return <div className="rf-el" style={{ ...box, height: mm(el.height ?? 4) }} />;
    case "pageNumber": {
      const tpl = i18n(el.template, L) || (L === "en" ? "Page {{page}} of {{pages}}" : "صفحة {{page}} من {{pages}}");
      return wrap(interpolate(tpl, ctx.scope), "rf-text");
    }
    case "signature": return wrap(<><div className="rf-sign-line" /><div>{interpolate(i18n(el.label, L), ctx.scope)}</div></>, "rf-sign");
    case "barcode": {
      const v = String(evaluate(el.value, ctx.scope) ?? "");
      const svg = barcodeSvg(v, el.format ?? "CODE128", el.showText !== false, el.barHeight ?? 12);
      return wrap(svg ? <div className="rf-svg" style={{ height: mm(el.height ?? (el.barHeight ?? 12) + (el.showText !== false ? 4 : 0)) }} dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="rf-bad">{v ? `⚠ ${v}` : ""}</span>, "rf-barcode");
    }
    case "qr": {
      const v = String(evaluate(el.value, ctx.scope) ?? "");
      const svg = qrSvg(v, el.level);
      const size = el.size ?? 25;
      const mi = el.style?.align === "center" ? "auto" : el.style?.align === "end" ? "auto 0" : undefined;
      return wrap(svg ? <div className="rf-svg" style={{ width: mm(size), height: mm(size), marginInline: mi }} dangerouslySetInnerHTML={{ __html: svg }} /> : null, "rf-qr");
    }
    case "chart": return wrap(<Chart el={el} ctx={ctx} />, "rf-chart-wrap");
    case "table": return wrap(<SubTable el={el} ctx={ctx} />, "rf-subtable");
    case "row":
      return (
        <div className={`rf-el ${el.direction === "column" ? "rf-col" : "rf-row"}`} style={{ ...box, ...st, gap: mm(el.gap ?? 2) }}>
          {el.items.map((it, i) => <Element key={i} el={it} ctx={{ ...ctx, absolute: false }} />)}
        </div>
      );
    default: return null;
  }
}

export function Elements({ elements, ctx, height }: { elements?: ReportElement[]; ctx: ElemCtx; height?: number }) {
  if (!elements?.length) return null;
  if (ctx.absolute) {
    return <div className="rf-abs" style={{ height: mm(height ?? 20) }}>{elements.map((e, i) => <Element key={e.id ?? i} el={e} ctx={ctx} />)}</div>;
  }
  return <div className="rf-flow">{elements.map((e, i) => <Element key={e.id ?? i} el={e} ctx={ctx} />)}</div>;
}
