/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  Dashboard — P14 لوحة المؤشرات
//  - شبكة 12 عمود على الكمبيوتر، عمودين للـ KPI على الموبايل، والباقي عمود واحد
//  - الفلاتر العامة (useCascadingFilters) بتتبعت لكل ويدجت كـ where + condition
//  - رسوم SVG خفيفة (من غير مكتبة): bar / line / area / donut + tooltip عند المرور + جدول بديل
//  - ألوان السلاسل بترتيب ثابت (مش بتتلف)، والنص دايمًا بلون النص مش لون السلسلة
// =====================================================================================

import React, { useEffect, useMemo, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { AlertsWidget, ChartWidget, DashboardConfig, DashboardWidget, KpiWidget, ListWidget } from "./ModelDashboard";
import { useCascadingFilters } from "./cascadingFilter";
import CascadingFilterBar from "./CascadingFilterBar";
import { EmptyState, cardClass, findStatus, fmtNumber, fmtValue, sqlDataProvider, useIsMobile, useLangKit } from "./patternKit";

/** ترتيب ثابت للألوان (باليتة متحققة لعمى الألوان) */
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

export interface DashboardProps {
  config: DashboardConfig;
  provider?: DataProvider;
  onDrill?: (widgetId: string, target: string, row?: Record<string, any>) => void;
}

function useWidgetData(w: DashboardWidget, provider: DataProvider, where: Record<string, any>, condition: string, tick: number) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const src = "source" in w ? w.source : null;
  const sig = JSON.stringify([src, where, condition, tick]);
  useEffect(() => {
    if (!src) return;
    let alive = true;
    setLoading(true);
    provider({ source: src, where, extraCondition: condition || undefined, page: 0, pageSize: 0 })
      .then((r) => { if (alive) setRows(r.rows); })
      .catch(() => { if (alive) setRows([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, provider]);
  return { rows, loading };
}

// ------------------------------------------------------------------ KPI
function Kpi({ w, rows, loading }: { w: KpiWidget; rows: any[]; loading: boolean }) {
  const { lt, lang } = useLangKit();
  const r = rows[0] || {};
  const v = r[w.valueField];
  const prev = w.compareField ? Number(r[w.compareField]) : NaN;
  const delta = isFinite(prev) && prev !== 0 ? ((Number(v) - prev) / Math.abs(prev)) * 100 : null;
  const good = delta === null ? null : (delta >= 0) === (w.higherIsBetter !== false);
  return (
    <div className="flex items-start justify-between gap-2 h-full">
      <div className="min-w-0">
        <div className="text-[12px] text-erp-text-muted truncate">{lt(w.title)}</div>
        <div className={`text-2xl md:text-3xl font-bold num mt-1 ${loading ? "opacity-40" : ""}`}>{v === undefined ? "—" : fmtValue(v, w.format || "number", lang)}<span className="text-sm font-medium text-erp-text-muted ms-1">{lt(w.suffix)}</span></div>
        {delta !== null && (
          <div className={`text-[12px] font-semibold num mt-1 ${good ? "text-erp-success" : "text-erp-danger"}`}>
            {delta >= 0 ? "▲" : "▼"} {fmtNumber(Math.abs(delta), 1)}%
          </div>
        )}
      </div>
      {w.icon && <span className="text-2xl shrink-0" aria-hidden="true">{w.icon}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ الرسوم
function Chart({ w, rows }: { w: ChartWidget; rows: any[] }) {
  const { t, lt, lang } = useLangKit();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const H = w.height || 220;
  const W = 600;
  const pad = { l: 44, r: 12, t: 12, b: 28 };
  const colors = w.series.map((s, i) => s.color || SERIES_COLORS[i % SERIES_COLORS.length]);
  const labels = rows.map((r) => String(r[w.labelField] ?? ""));
  const fmt = (n: number) => fmtValue(n, w.format || "number", lang);

  if (!rows.length) return <EmptyState text={t("No data", "لا توجد بيانات")} />;

  const legend = w.series.length >= 2 || w.chartType === "donut" ? (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-erp-text-muted">
      {(w.chartType === "donut" ? labels : w.series.map((s) => lt(s.label))).map((l, i) => (
        <span key={i} className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: w.chartType === "donut" ? SERIES_COLORS[i % SERIES_COLORS.length] : colors[i] }} />{l}</span>
      ))}
    </div>
  ) : null;

  const toggle = (
    <button type="button" onClick={() => setAsTable((x) => !x)} className="text-[11px] text-erp-accent min-h-[28px]">{asTable ? t("Chart", "رسم") : t("Table", "جدول")}</button>
  );

  if (asTable) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">{toggle}</div>
        <div className="overflow-auto max-h-72">
          <table className="w-full text-[12px]">
            <thead className="text-erp-text-muted"><tr><th className="text-start p-1"></th>{w.series.map((s) => <th key={s.field} className="text-end p-1">{lt(s.label)}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-erp-border"><td className="p-1">{labels[i]}</td>{w.series.map((s) => <td key={s.field} className="p-1 text-end num">{fmt(Number(r[s.field]) || 0)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  if (w.chartType === "donut") {
    const s = w.series[0];
    const vals = rows.map((r) => Math.max(0, Number(r[s.field]) || 0));
    const sum = vals.reduce((a, b) => a + b, 0) || 1;
    const starts = vals.map((_, i) => vals.slice(0, i).reduce((a, b) => a + b, 0));
    const R = 80, r0 = 52, cx = 100, cy = 100;
    const arc = (a0: number, a1: number) => {
      const p = (a: number, rad: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r0), [x3, y3] = p(a0, r0);
      return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
    };
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">{legend}{toggle}</div>
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-48 h-48" role="img" aria-label={lt(w.title)}>
            {vals.map((v, i) => {
              const a0 = (starts[i] / sum) * Math.PI * 2;
              const a1 = Math.min(((starts[i] + v) / sum) * Math.PI * 2, Math.PI * 2 - 0.0001);
              return <path key={i} d={arc(a0, a1)} fill={SERIES_COLORS[i % SERIES_COLORS.length]} stroke="var(--erp-surface)" strokeWidth={2}
                opacity={hover === null || hover === i ? 1 : 0.45} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}><title>{`${labels[i]}: ${fmt(v)}`}</title></path>;
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-[var(--erp-text)] text-[16px] font-bold">{hover !== null ? fmt(vals[hover]) : fmt(sum)}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-[var(--erp-text-muted)] text-[10px]">{hover !== null ? labels[hover] : t("Total", "الإجمالي")}</text>
          </svg>
        </div>
      </div>
    );
  }

  const all = rows.flatMap((r) => w.series.map((s) => Number(r[s.field]) || 0));
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min)) * ih;
  const bandW = iw / rows.length;
  const x = (i: number) => pad.l + bandW * i + bandW / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  const labelEvery = Math.ceil(rows.length / 8);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-2">{legend || <span />}{toggle}</div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={lt(w.title)}
          onMouseLeave={() => setHover(null)}>
          {ticks.map((tv, i) => (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y(tv)} y2={y(tv)} stroke="var(--erp-border)" strokeWidth={1} />
              <text x={pad.l - 6} y={y(tv) + 3} textAnchor="end" className="fill-[var(--erp-text-subtle)] text-[10px]">{fmtNumber(tv, 0)}</text>
            </g>
          ))}
          {labels.map((l, i) => i % labelEvery === 0 && (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-[var(--erp-text-muted)] text-[10px]">{l}</text>
          ))}
          {w.chartType === "bar" && rows.map((r, i) => {
            const n = w.series.length;
            const bw = Math.min(28, (bandW * 0.7) / n);
            return w.series.map((s, si) => {
              const v = Number(r[s.field]) || 0;
              const bx = x(i) - (bw * n + 2 * (n - 1)) / 2 + si * (bw + 2);
              const top = y(Math.max(v, 0)), h = Math.abs(y(v) - y(0));
              return <rect key={`${i}-${si}`} x={bx} y={top} width={bw} height={Math.max(1, h)} rx={4} fill={colors[si]} opacity={hover === null || hover === i ? 1 : 0.5} />;
            });
          })}
          {(w.chartType === "line" || w.chartType === "area") && w.series.map((s, si) => {
            const pts = rows.map((r, i) => `${x(i)},${y(Number(r[s.field]) || 0)}`).join(" ");
            return (
              <g key={s.field}>
                {w.chartType === "area" && <polygon points={`${x(0)},${y(0)} ${pts} ${x(rows.length - 1)},${y(0)}`} fill={colors[si]} opacity={0.14} />}
                <polyline points={pts} fill="none" stroke={colors[si]} strokeWidth={2} strokeLinejoin="round" />
                {hover !== null && <circle cx={x(hover)} cy={y(Number(rows[hover][s.field]) || 0)} r={4} fill={colors[si]} stroke="var(--erp-surface)" strokeWidth={2} />}
              </g>
            );
          })}
          {hover !== null && w.chartType !== "bar" && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--erp-border-strong)" strokeDasharray="3 3" />}
          {/* مناطق المرور (أكبر من العلامة) */}
          {rows.map((_, i) => <rect key={i} x={pad.l + bandW * i} y={pad.t} width={bandW} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />)}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-1 z-10 rounded-lg border border-erp-border bg-erp-surface shadow-erp-3 px-2.5 py-1.5 text-[12px]"
            style={{ left: `${Math.min(70, Math.max(2, (x(hover) / W) * 100 - 10))}%` }}>
            <div className="font-semibold mb-0.5">{labels[hover]}</div>
            {w.series.map((s, si) => (
              <div key={s.field} className="flex items-center gap-2"><span className="size-2 rounded-sm" style={{ background: colors[si] }} /><span className="text-erp-text-muted">{lt(s.label)}</span><span className="num font-semibold ms-auto">{fmt(Number(rows[hover][s.field]) || 0)}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListW({ w, rows, onRow }: { w: ListWidget; rows: any[]; onRow?: (r: any) => void }) {
  const { t, lt, lang } = useLangKit();
  const list = rows.slice(0, w.limit || 10);
  if (!list.length) return <EmptyState text={t("No data", "لا توجد بيانات")} />;
  return (
    <table className="w-full text-[13px]">
      <thead className="text-erp-text-muted text-[11px]"><tr>{w.columns.map((c, i) => <th key={c.field} className={`p-1.5 font-medium ${i ? "text-end" : "text-start"}`}>{lt(c.label)}</th>)}</tr></thead>
      <tbody>
        {list.map((r, i) => (
          <tr key={i} className="border-t border-erp-border hover:bg-erp-surface-2 cursor-pointer" onClick={() => onRow?.(r)}>
            {w.columns.map((c, ci) => <td key={c.field} className={`p-1.5 ${ci ? "text-end num" : ""}`}>{fmtValue(r[c.field], c.format, lang)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AlertsW({ w, rows }: { w: AlertsWidget; rows: any[] }) {
  const { t, lt } = useLangKit();
  const list = rows.slice(0, w.limit || 8);
  if (!list.length) return <EmptyState text={t("No alerts", "لا توجد تنبيهات")} icon="✓" />;
  return (
    <ul className="space-y-1.5">
      {list.map((r, i) => {
        const st = w.levelField ? findStatus(w.levels, r[w.levelField]) : undefined;
        return (
          <li key={i} className="flex items-start gap-2 rounded-lg px-2 py-1.5 bg-erp-surface-2 text-[13px]" style={st ? { borderInlineStart: `3px solid ${st.color}` } : undefined}>
            <span aria-hidden="true">{st?.icon || "•"}</span>
            <span className="flex-1">{String(r[w.textField] ?? "")}</span>
            {st && <span className="text-[11px] font-semibold text-erp-text-muted">{lt(st.label)}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function Widget({ w, provider, where, condition, tick, onDrill }: { w: DashboardWidget; provider: DataProvider; where: Record<string, any>; condition: string; tick: number; onDrill?: DashboardProps["onDrill"] }) {
  const { lt } = useLangKit();
  const isMobile = useIsMobile();
  const { rows, loading } = useWidgetData(w, provider, where, condition, tick);
  const span = w.span || (w.kind === "kpi" ? 3 : 6);
  const style = isMobile ? { gridColumn: w.kind === "kpi" ? "span 6 / span 6" : "span 12 / span 12" } : { gridColumn: `span ${span} / span ${span}` };
  return (
    <section className={`${cardClass} p-3 md:p-4 min-w-0 ${w.drillTo ? "cursor-pointer" : ""}`} style={style}
      onClick={w.kind === "kpi" && w.drillTo ? () => onDrill?.(w.id, w.drillTo!) : undefined}>
      {w.kind !== "kpi" && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[14px] font-semibold">{lt(w.title)}</h3>
          {loading && <span className="size-2 rounded-full bg-erp-warning animate-pulse" />}
        </div>
      )}
      {w.kind === "kpi" && <Kpi w={w} rows={rows} loading={loading} />}
      {w.kind === "chart" && <Chart w={w} rows={rows} />}
      {w.kind === "list" && <ListW w={w} rows={rows} onRow={w.drillTo ? (r) => onDrill?.(w.id, w.drillTo!, r) : undefined} />}
      {w.kind === "alerts" && <AlertsW w={w} rows={rows} />}
      {w.kind === "shortcuts" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {w.items.map((it, i) => (
            <a key={i} href={it.href} className="min-h-[64px] rounded-lg bg-erp-surface-2 hover:bg-erp-accent-soft flex flex-col items-center justify-center gap-1 text-[12px] font-medium text-center p-2">
              <span className="text-xl" aria-hidden="true">{it.icon}</span>{lt(it.label)}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Dashboard({ config, provider = sqlDataProvider, onDrill }: DashboardProps) {
  const { lt, dir } = useLangKit();
  const emptyFilters = useMemo(() => ({ filters: [] }), []);
  const filters = useCascadingFilters(config.filters || emptyFilters, { provider });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const s = config.refreshSeconds || 0;
    if (!s) return;
    const h = setInterval(() => setTick((x) => x + 1), s * 1000);
    return () => clearInterval(h);
  }, [config.refreshSeconds]);

  // كل ويدجت بياخد بس الفلاتر اللي تخصه
  const scoped = (w: DashboardWidget) => {
    if (!w.filterFields) return { where: filters.where, condition: filters.condition };
    const where: Record<string, any> = {};
    for (const f of w.filterFields) if (filters.where[f] !== undefined) where[f] = filters.where[f];
    return { where, condition: "" };
  };

  return (
    <div className="space-y-3 text-erp-text" dir={dir}>
      {config.title && <h1 className="text-xl font-bold px-1">{lt(config.title)}</h1>}
      {config.filters && <div className={`${cardClass} overflow-hidden`}><CascadingFilterBar state={filters} /></div>}
      <div className="grid grid-cols-12 gap-3">
        {config.widgets.map((w) => {
          const s = scoped(w);
          return <Widget key={w.id} w={w} provider={provider} where={s.where} condition={s.condition} tick={tick} onDrill={onDrill} />;
        })}
      </div>
    </div>
  );
}
