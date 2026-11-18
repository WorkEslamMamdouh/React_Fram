/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  KitchenDisplay — P18 شاشة المطبخ / التذاكر
//  - تذاكر مفتوحة بس (مش done) + آخر N اتعملها bump للاسترجاع
//  - رأس التذكرة لونه حسب الوقت (thresholds) والمؤقت شغال كل ثانية
//  - دوسة على الصنف = خلص (bump item)، زرار "ابدأ" و"جاهز" للتذكرة
//  - كيبورد (bump bar): 1..9 تختار التذكرة، Enter = جاهز، S = ابدأ، R = استرجاع آخر واحدة
//  - محطات: كل محطة بتشوف أصنافها بس، و"expo" بتشوف الكل
//  - صوت لما تذكرة جديدة توصل
// =====================================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { KdsItem, KitchenDisplayConfig } from "./ModelKitchenDisplay";
import { btnClass, fmtDuration, softColor, sqlDataProvider, useLangKit, useNow } from "./patternKit";

export interface KitchenDisplayProps {
  config: KitchenDisplayConfig;
  /** التذاكر (لحظي من الأب) — أو من config.source */
  tickets?: Record<string, any>[];
  provider?: DataProvider;
  station?: string;
  onStationChange?: (id: string) => void;
  onStart?: (ticket: Record<string, any>) => void;
  onBumpItem?: (ticket: Record<string, any>, itemId: string | number, done: boolean) => void;
  onBumpTicket?: (ticket: Record<string, any>) => void;
  onRecall?: (ticket: Record<string, any>) => void;
  serverTimeOffsetMs?: number;
  height?: number | string;
}

const DEFAULT_THRESHOLDS = [
  { fromMinutes: 0, color: "#10B981" },
  { fromMinutes: 8, color: "#F59E0B" },
  { fromMinutes: 15, color: "#F43F5E" },
];

function itemsOf(row: Record<string, any>, field: string): KdsItem[] {
  const v = row[field];
  if (Array.isArray(v)) return v;
  try { return typeof v === "string" ? JSON.parse(v) : []; } catch { return []; }
}

export default function KitchenDisplay({ config, tickets: ticketsProp, provider = sqlDataProvider, station, onStationChange, onStart, onBumpItem, onBumpTicket, onRecall, serverTimeOffsetMs = 0, height = "calc(100vh - 140px)" }: KitchenDisplayProps) {
  const { t, lt, dir } = useLangKit();
  const F = config.fields;
  const S = { new: "new", started: "started", done: "done", ...(config.statusValues || {}) };
  const now = useNow(1000, serverTimeOffsetMs);
  const [loaded, setLoaded] = useState<Record<string, any>[]>([]);
  const [sel, setSel] = useState(0);
  const [showRecall, setShowRecall] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (ticketsProp || !config.source) return;
    let alive = true;
    const load = () => provider({ source: config.source!, page: 0, pageSize: 0 }).then((r) => { if (alive) setLoaded(r.rows); }).catch(() => undefined);
    load();
    const h = setInterval(load, (config.refreshSeconds || 10) * 1000);
    return () => { alive = false; clearInterval(h); };
  }, [ticketsProp, config.source, provider, config.refreshSeconds]);

  const all = ticketsProp || loaded;
  const st = (config.stations || []).find((s) => s.id === station);
  const forStation = (it: KdsItem) => !st || !st.accepts || st.accepts.length === 0 || st.accepts.includes(String(it.station ?? ""));

  const open = useMemo(() => all
    .filter((r) => String(r[F.statusField]) !== S.done)
    .map((r) => ({ row: r, items: itemsOf(r, F.itemsField).filter(forStation) }))
    .filter((x) => x.items.length > 0)
    .sort((a, b) => new Date(a.row[F.createdAtField]).getTime() - new Date(b.row[F.createdAtField]).getTime()),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [all, station, F.statusField, F.itemsField, F.createdAtField, S.done]);

  const recall = useMemo(() => all
    .filter((r) => String(r[F.statusField]) === S.done)
    .sort((a, b) => String(b[F.bumpedAtField || F.createdAtField]).localeCompare(String(a[F.bumpedAtField || F.createdAtField])))
    .slice(0, config.recallCount ?? 10), [all, F.statusField, F.bumpedAtField, F.createdAtField, S.done, config.recallCount]);

  // ---------- صوت لما توصل تذكرة جديدة ----------
  useEffect(() => {
    const ids = new Set(open.map((x) => String(x.row[F.idField])));
    if (seen.current && config.soundOnNew !== false) {
      const fresh = [...ids].some((id) => !seen.current!.has(id));
      if (fresh) {
        try {
          const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
          const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
          o.frequency.value = 880; g.gain.value = 0.06; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.2); o.onended = () => ctx.close();
        } catch { /* */ }
      }
    }
    seen.current = ids;
  }, [open, F.idField, config.soundOnNew]);

  // ---------- ملخص كل اليوم ----------
  const allDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of open) for (const it of x.items) if (!it.done) m.set(it.name, (m.get(it.name) || 0) + it.qty);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [open]);

  const thresholds = [...(config.thresholds || DEFAULT_THRESHOLDS)].sort((a, b) => a.fromMinutes - b.fromMinutes);
  const colorFor = (mins: number) => { let c = thresholds[0]?.color || "#10B981"; for (const th of thresholds) if (mins >= th.fromMinutes) c = th.color; return c; };

  // ---------- bump bar ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (/^[1-9]$/.test(e.key)) { setSel(Number(e.key) - 1); return; }
      const cur = open[sel]?.row;
      if (e.key === "Enter" && cur) onBumpTicket?.(cur);
      else if ((e.key === "s" || e.key === "S") && cur) onStart?.(cur);
      else if ((e.key === "r" || e.key === "R") && recall[0]) onRecall?.(recall[0]);
      else if (e.key === "ArrowRight") setSel((s) => Math.min(open.length - 1, s + (dir === "rtl" ? -1 : 1)));
      else if (e.key === "ArrowLeft") setSel((s) => Math.max(0, s + (dir === "rtl" ? 1 : -1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sel, recall, onBumpTicket, onStart, onRecall, dir]);

  const rail = (config.layout || "rail") === "rail";

  return (
    <div className="flex flex-col rounded-erp-card border border-erp-border bg-erp-canvas text-erp-text overflow-hidden" style={{ height }} dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-erp-border bg-erp-surface">
        <div className="flex gap-1.5 overflow-x-auto">
          {(config.stations || []).map((s) => (
            <button key={s.id} type="button" onClick={() => onStationChange?.(s.id)}
              className={`shrink-0 min-h-[40px] px-3 rounded-lg text-[13px] font-semibold ${s.id === station ? "bg-erp-accent text-white" : "bg-erp-surface-2 text-erp-text-muted"}`}>{lt(s.label)}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-erp-text-muted">{t("Open", "مفتوحة")}: <span className="num font-bold text-erp-text">{open.length}</span></span>
          <button type="button" className={btnClass("gray")} onClick={() => setShowRecall((x) => !x)}>↩ {t("Recall", "استرجاع")} <span className="num">{recall.length}</span></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className={`flex-1 min-w-0 p-2 md:p-3 ${rail ? "flex gap-3 overflow-x-auto items-start" : "grid gap-3 overflow-y-auto content-start"}`}
          style={rail ? undefined : { gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {open.length === 0 && <div className="m-auto text-erp-text-subtle text-lg">✓ {t("All caught up", "مفيش طلبات")}</div>}
          {open.map(({ row, items }, i) => {
            const mins = (now - new Date(row[F.createdAtField]).getTime()) / 60000;
            const color = colorFor(mins);
            const started = String(row[F.statusField]) === S.started;
            const allDone = items.every((it) => it.done);
            const type = F.typeField ? row[F.typeField] : "";
            return (
              <article key={String(row[F.idField])} onClick={() => setSel(i)}
                className={`flex flex-col rounded-xl bg-erp-surface shadow-erp-2 border-2 overflow-hidden ${rail ? "w-[260px] shrink-0 max-h-full" : ""}`}
                style={{ borderColor: i === sel ? "var(--erp-accent)" : "transparent" }}>
                <header className="px-3 py-2 text-white flex items-center justify-between gap-2" style={{ background: color }}>
                  <div className="min-w-0">
                    <div className="font-bold text-[16px] num truncate"><span className="opacity-80 text-[12px] me-1">{i + 1}</span>#{row[F.numberField]}{F.tableField && row[F.tableField] ? ` · ${row[F.tableField]}` : ""}</div>
                    {type && <div className="text-[11px] opacity-90">{lt(config.typeLabels?.[type]) || type}</div>}
                  </div>
                  <div className="num font-bold text-[18px]">{fmtDuration(now - new Date(row[F.createdAtField]).getTime())}</div>
                </header>
                {F.notesField && row[F.notesField] && <div className="px-3 py-1.5 text-[12px] bg-erp-warning-bg text-erp-warning-text">📝 {row[F.notesField]}</div>}
                <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-erp-border">
                  {items.map((it) => (
                    <li key={String(it.id)}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onBumpItem?.(row, it.id, !it.done); }}
                        className={`w-full text-start px-3 py-2 min-h-[44px] ${it.done ? "opacity-40 line-through" : ""}`}>
                        <div className="flex items-start gap-2">
                          <span className="num font-bold text-[15px] min-w-6">{it.qty}×</span>
                          <span className="flex-1 font-semibold text-[14px]">{it.name}{it.course ? <span className="ms-1 text-[10px] px-1 rounded" style={{ background: softColor(color) }}>C{it.course}</span> : null}</span>
                        </div>
                        {it.modifiers && it.modifiers.length > 0 && <div className="ps-8 text-[12px] text-erp-text-muted">{it.modifiers.join(" · ")}</div>}
                        {it.note && <div className="ps-8 text-[12px] text-erp-danger font-semibold">! {it.note}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
                <footer className="grid grid-cols-2 gap-1.5 p-2 border-t border-erp-border">
                  <button type="button" className={btnClass(started ? "gray" : "warning", "lg")} disabled={started} onClick={(e) => { e.stopPropagation(); onStart?.(row); }}>{started ? t("Cooking", "بيتعمل") : t("Start", "ابدأ")}</button>
                  <button type="button" className={btnClass(allDone ? "success" : "primary", "lg")} onClick={(e) => { e.stopPropagation(); onBumpTicket?.(row); }}>✔ {t("Ready", "جاهز")}</button>
                </footer>
              </article>
            );
          })}
        </div>

        {(config.showAllDay || showRecall) && (
          <aside className="hidden md:flex w-60 shrink-0 flex-col border-s border-erp-border bg-erp-surface">
            {showRecall ? (
              <>
                <div className="px-3 py-2 font-semibold text-[13px] border-b border-erp-border">{t("Recall", "استرجاع")}</div>
                <div className="flex-1 overflow-y-auto">
                  {recall.map((r) => (
                    <button key={String(r[F.idField])} type="button" onClick={() => onRecall?.(r)} className="w-full flex justify-between px-3 min-h-[44px] items-center border-b border-erp-border text-[13px] hover:bg-erp-surface-2">
                      <span className="num font-semibold">#{r[F.numberField]}</span><span className="text-erp-accent">↩</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="px-3 py-2 font-semibold text-[13px] border-b border-erp-border">{t("All day", "ملخص المفتوح")}</div>
                <ul className="flex-1 overflow-y-auto text-[13px]">
                  {allDay.map(([n, q]) => <li key={n} className="flex justify-between px-3 py-1.5 border-b border-erp-border"><span className="truncate">{n}</span><span className="num font-bold">{q}</span></li>)}
                </ul>
              </>
            )}
          </aside>
        )}
      </div>
      <div className="hidden md:block px-3 py-1 text-[11px] text-erp-text-subtle border-t border-erp-border bg-erp-surface">
        {t("Keys: 1-9 select · S start · Enter ready · R recall", "الكيبورد: 1-9 اختيار · S ابدأ · Enter جاهز · R استرجاع")}
      </div>
    </div>
  );
}
