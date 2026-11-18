/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  Scheduler — P07 التقويم والمواعيد
//  - عروض: يوم / أسبوع / شهر / أجندة / موارد. الموبايل بيبدأ بالأجندة (لستة بالأيام)
//  - تحميل الفترة الظاهرة بس (range) — كل تنقل = طلب جديد للفترة الجديدة
//  - دوسة على خانة فاضية = onSlotClick، دوسة على موعد = onEventClick
//  - سحب الموعد لخانة تانية (كمبيوتر) مع قاعدة التعارض (block / warn / allow + capacity)
// =====================================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { SchedulerConfig, SchedulerEvent, SchedulerResource, SchedulerView } from "./ModelScheduler";
import { ShowConfirm } from "../../DialogModal";
import { Sys } from "../../../SystemTools";
import { btnClass, findStatus, softColor, sqlDataProvider, useIsMobile, useLangKit } from "./patternKit";

// ------------------------------------------------------------------ تواريخ
const pad = (n: number) => String(n).padStart(2, "0");
export const toLocalStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayKey = (d: Date) => toLocalStr(d).substring(0, 10);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
const addMin = (d: Date, n: number) => new Date(d.getTime() + n * 60000);
const hm = (s: string | undefined, def: number) => { if (!s) return def; const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };
const startOfWeek = (d: Date, ws: number) => { const s = startOfDay(d); return addDays(s, -((s.getDay() - ws + 7) % 7)); };
const parseLocal = (v: any): Date => {
  if (v instanceof Date) return v;
  const s = String(v ?? "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : new Date(s);
};

function rangeFor(view: SchedulerView, date: Date, ws: number): [Date, Date] {
  if (view === "day" || view === "resource") { const s = startOfDay(date); return [s, addDays(s, 1)]; }
  if (view === "month") {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const s = startOfWeek(first, ws);
    return [s, addDays(s, 42)];
  }
  const s = startOfWeek(date, ws);
  return [s, addDays(s, 7)];
}

/** توزيع المواعيد المتداخلة على "حارات" جوه العمود */
function layoutLanes(evs: SchedulerEvent[]): Array<{ ev: SchedulerEvent; lane: number; lanes: number }> {
  const sorted = [...evs].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Array<{ ev: SchedulerEvent; lane: number; lanes: number }> = [];
  let cluster: typeof out = [];
  let clusterEnd = 0;
  const laneEnds: number[] = [];
  const flush = () => { const n = Math.max(1, ...cluster.map((c) => c.lane + 1)); cluster.forEach((c) => (c.lanes = n)); out.push(...cluster); cluster = []; laneEnds.length = 0; };
  for (const ev of sorted) {
    if (cluster.length && ev.start.getTime() >= clusterEnd) flush();
    let lane = laneEnds.findIndex((e) => e <= ev.start.getTime());
    if (lane < 0) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = ev.end.getTime();
    cluster.push({ ev, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, ev.end.getTime());
  }
  if (cluster.length) flush();
  return out;
}

export interface SchedulerProps {
  config: SchedulerConfig;
  provider?: DataProvider;
  /** التاريخ المبدئي */
  initialDate?: string;
  onSlotClick?: (start: string, end: string, resourceId?: any) => void;
  onEventClick?: (ev: SchedulerEvent) => void;
  /** تغيير ميعاد بالسحب — رجّع false عشان ترفض */
  onEventMove?: (ev: SchedulerEvent, newStart: string, newEnd: string, newResource?: any) => Promise<boolean | void> | boolean | void;
  /** غيّره عشان تعيد التحميل (بعد حفظ موعد) */
  reloadKey?: number;
  height?: number | string;
}

export default function Scheduler({ config, provider = sqlDataProvider, initialDate, onSlotClick, onEventClick, onEventMove, reloadKey = 0, height = "calc(100vh - 170px)" }: SchedulerProps) {
  const { t, lt, dir, isAr } = useLangKit();
  const isMobile = useIsMobile();
  const views = config.views && config.views.length ? config.views : (["day", "week", "month", "agenda"] as SchedulerView[]);
  const [view, setView] = useState<SchedulerView>(config.defaultView || views[0]);
  const [date, setDate] = useState<Date>(() => (initialDate ? parseLocal(initialDate) : new Date()));
  const [events, setEvents] = useState<SchedulerEvent[]>([]);
  const [resources, setResources] = useState<SchedulerResource[]>(config.resources || []);
  const [loading, setLoading] = useState(false);
  const [dragId, setDragId] = useState<any>(null);
  const [localReload, setLocalReload] = useState(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (isMobile) setView(config.mobileView || (views.includes("agenda") ? "agenda" : "day")); }, [isMobile]);

  const ws = config.weekStartsOn ?? 6;
  const slot = config.slotMinutes || 30;
  const dayStart = hm(config.dayStart, 8 * 60);
  const dayEnd = hm(config.dayEnd, 20 * 60);
  const slotH = 40;
  const [from, to] = useMemo(() => rangeFor(view, date, ws), [view, date, ws]);
  const E = config.events;

  // ---------- الموارد من جدول ----------
  useEffect(() => {
    const rs = config.resourcesSource;
    if (!rs) return;
    provider({ source: rs, page: 0, pageSize: 0 }).then((r) => setResources(r.rows.map((x) => ({
      id: x[rs.idField], label: { ar: String(x[rs.labelField] ?? ""), en: String(x[rs.labelFieldEn || rs.labelField] ?? "") }, color: rs.colorField ? x[rs.colorField] : undefined,
    })))).catch(() => setResources([]));
  }, [config.resourcesSource, provider]);

  // ---------- المواعيد للفترة الظاهرة ----------
  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // ":00" = ثواني: SQL Server مابيحوّلش 'yyyy-MM-ddTHH:mm' لـ datetime (Conversion failed) فكان التقويم بيطلع فاضي
    provider({ source: E.source, range: { field: E.startField, from: toLocalStr(from) + ":00", to: toLocalStr(to) + ":00" }, page: 0, pageSize: 0 })
      .then((r) => {
        if (!alive) return;
        setEvents(r.rows.map((row) => {
          const start = parseLocal(row[E.startField]);
          const end = E.endField && row[E.endField] ? parseLocal(row[E.endField]) : addMin(start, Number(E.durationField ? row[E.durationField] : config.defaultDuration || slot) || slot);
          return { id: row[E.idField], start, end, title: String(row[E.titleField] ?? ""), subtitle: E.subtitleField ? String(row[E.subtitleField] ?? "") : undefined, resource: E.resourceField ? row[E.resourceField] : undefined, status: E.statusField ? row[E.statusField] : undefined, row };
        }));
      })
      .catch(() => { if (alive) setEvents([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [provider, E, from, to, reloadKey, localReload, slot, config.defaultDuration]);

  const colorOf = useCallback((ev: SchedulerEvent) => {
    const st = findStatus(config.statuses, ev.status);
    if (st) return st.color;
    const r = resources.find((x) => String(x.id) === String(ev.resource));
    return r?.color || "#0D9488";
  }, [config.statuses, resources]);

  // ---------- التنقل ----------
  const step = (dirn: number) => {
    if (view === "month") setDate(new Date(date.getFullYear(), date.getMonth() + dirn, 1));
    else if (view === "week" || view === "agenda") setDate(addDays(date, 7 * dirn));
    else setDate(addDays(date, dirn));
  };
  const fmtTitle = () => {
    const loc = isAr ? "ar-EG" : "en-US";
    if (view === "month") return date.toLocaleDateString(loc, { month: "long", year: "numeric" });
    if (view === "day" || view === "resource") return date.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
    return `${from.toLocaleDateString(loc, { day: "numeric", month: "short" })} – ${addDays(to, -1).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" })}`;
  };

  // ---------- التعارض ----------
  const conflicts = (ev: SchedulerEvent | null, s: Date, e: Date, res: any) =>
    events.filter((x) => (!ev || x.id !== ev.id) && (E.resourceField ? String(x.resource) === String(res) : true) && x.start < e && x.end > s).length;

  const checkOverlap = async (ev: SchedulerEvent | null, s: Date, e: Date, res: any): Promise<boolean> => {
    const rule = config.overlap || "warn";
    const cap = config.capacity || 1;
    if (rule === "allow" || conflicts(ev, s, e, res) < cap) return true;
    if (rule === "block") { Sys.ShowMessage("This time slot is already taken", "الميعاد ده محجوز", "warning"); return false; }
    return ShowConfirm("This time overlaps another appointment. Continue?", "الميعاد ده متعارض مع موعد تاني. تكمل؟");
  };

  const clickSlot = async (s: Date, res?: any) => {
    const e = addMin(s, config.defaultDuration || slot);
    if (!(await checkOverlap(null, s, e, res))) return;
    onSlotClick?.(toLocalStr(s), toLocalStr(e), res);
  };

  const dropOn = async (s: Date, res?: any) => {
    const ev = events.find((x) => x.id === dragId);
    setDragId(null);
    if (!ev || !onEventMove) return;
    const dur = ev.end.getTime() - ev.start.getTime();
    const e = new Date(s.getTime() + dur);
    const newRes = res === undefined ? ev.resource : res;
    if (!(await checkOverlap(ev, s, e, newRes))) return;
    const ok = await onEventMove(ev, toLocalStr(s), toLocalStr(e), newRes);
    if (ok === false) return;
    setEvents((list) => list.map((x) => (x.id === ev.id ? { ...x, start: s, end: e, resource: newRes } : x)));
    setLocalReload((k) => k + 1);
  };

  // ---------- شبكة الوقت (يوم/أسبوع/موارد) ----------
  const renderTimeGrid = (cols: Array<{ key: string; label: string; day: Date; res?: any; color?: string }>) => {
    const slots: number[] = [];
    for (let m = dayStart; m < dayEnd; m += slot) slots.push(m);
    const now = new Date();
    return (
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid min-w-full" style={{ gridTemplateColumns: `56px repeat(${cols.length}, minmax(${cols.length > 3 ? 110 : 160}px, 1fr))` }}>
          {/* رأس الأعمدة */}
          <div className="sticky top-0 z-20 bg-erp-surface border-b border-erp-border" />
          {cols.map((c) => (
            <div key={c.key} className={`sticky top-0 z-20 bg-erp-surface border-b border-s border-erp-border px-2 py-2 text-center text-[12px] font-semibold ${dayKey(c.day) === dayKey(now) && c.res === undefined ? "text-erp-accent" : ""}`}>
              {c.color && <span className="inline-block size-2 rounded-full me-1" style={{ background: c.color }} />}{c.label}
            </div>
          ))}
          {/* عمود الساعات */}
          <div className="relative">
            {slots.map((m) => (
              <div key={m} className="text-[10px] text-erp-text-subtle text-end pe-1 num border-b border-erp-border/50" style={{ height: slotH }}>
                {m % 60 === 0 ? `${pad(Math.floor(m / 60))}:00` : ""}
              </div>
            ))}
          </div>
          {cols.map((c) => {
            const colEvents = events.filter((ev) => dayKey(ev.start) === dayKey(c.day) && (c.res === undefined || String(ev.resource) === String(c.res)));
            const res = resources.find((r) => String(r.id) === String(c.res));
            const wS = hm(res?.workStart, dayStart), wE = hm(res?.workEnd, dayEnd);
            return (
              <div key={c.key} className="relative border-s border-erp-border">
                {slots.map((m) => {
                  const s = new Date(c.day.getFullYear(), c.day.getMonth(), c.day.getDate(), Math.floor(m / 60), m % 60);
                  const off = m < wS || m >= wE;
                  return (
                    <button key={m} type="button" aria-label={`${c.label} ${pad(Math.floor(m / 60))}:${pad(m % 60)}`}
                      className={`block w-full border-b border-erp-border/50 hover:bg-erp-accent-soft ${off ? "bg-erp-surface-2/70" : ""}`}
                      style={{ height: slotH }}
                      onClick={() => !off && clickSlot(s, c.res)}
                      onDragOver={(e) => { if (dragId !== null) e.preventDefault(); }}
                      onDrop={() => dropOn(s, c.res)} />
                  );
                })}
                {layoutLanes(colEvents).map(({ ev, lane, lanes }) => {
                  const sm = ev.start.getHours() * 60 + ev.start.getMinutes();
                  const em = Math.max(sm + slot / 2, ev.end.getHours() * 60 + ev.end.getMinutes() + (dayKey(ev.end) !== dayKey(ev.start) ? 24 * 60 : 0));
                  const top = ((Math.max(sm, dayStart) - dayStart) / slot) * slotH;
                  const h = Math.max(slotH / 2, ((Math.min(em, dayEnd) - Math.max(sm, dayStart)) / slot) * slotH - 2);
                  const col = colorOf(ev);
                  const st = findStatus(config.statuses, ev.status);
                  return (
                    <button key={String(ev.id)} type="button"
                      draggable={!!config.allowDrag && !!onEventMove}
                      onDragStart={() => setDragId(ev.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onEventClick?.(ev)}
                      className="absolute rounded-md px-1.5 py-1 text-start overflow-hidden text-[11px] leading-tight shadow-erp-1 hover:z-10 focus:z-10"
                      style={{ top, height: h, insetInlineStart: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`, background: softColor(col, 0.18), borderInlineStart: `3px solid ${col}`, color: "var(--erp-text)" }}>
                      <div className="font-semibold truncate">{ev.title}</div>
                      <div className="num text-erp-text-muted truncate">{toLocalStr(ev.start).substring(11)}–{toLocalStr(ev.end).substring(11)}{st ? ` · ${lt(st.label)}` : ""}</div>
                      {ev.subtitle && h > 40 && <div className="truncate text-erp-text-muted">{ev.subtitle}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const loc = isAr ? "ar-EG" : "en-US";
  const dayLabel = (d: Date) => d.toLocaleDateString(loc, { weekday: "short", day: "numeric" });

  let body: React.ReactNode;
  if (view === "day") body = renderTimeGrid([{ key: "d", label: dayLabel(date), day: startOfDay(date) }]);
  else if (view === "resource") body = renderTimeGrid(resources.map((r) => ({ key: String(r.id), label: lt(r.label), day: startOfDay(date), res: r.id, color: r.color })));
  else if (view === "week") body = renderTimeGrid(Array.from({ length: 7 }, (_, i) => { const d = addDays(from, i); return { key: dayKey(d), label: dayLabel(d), day: d }; }));
  else if (view === "month") {
    const today = dayKey(new Date());
    body = (
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-7 text-[11px] text-erp-text-muted text-center border-b border-erp-border">
          {Array.from({ length: 7 }, (_, i) => <div key={i} className="py-1.5">{addDays(from, i).toLocaleDateString(loc, { weekday: "short" })}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }, (_, i) => {
            const d = addDays(from, i);
            const evs = events.filter((e) => dayKey(e.start) === dayKey(d)).sort((a, b) => a.start.getTime() - b.start.getTime());
            const out = d.getMonth() !== date.getMonth();
            return (
              <div key={i} className={`min-h-[84px] md:min-h-[104px] border-b border-s border-erp-border p-1 ${out ? "bg-erp-surface-2/60 text-erp-text-subtle" : ""}`}>
                <button type="button" onClick={() => { setDate(d); setView(views.includes("day") ? "day" : view); }}
                  className={`num text-[12px] size-7 rounded-full ${dayKey(d) === today ? "bg-erp-accent text-white" : "hover:bg-erp-surface-2"}`}>{d.getDate()}</button>
                {evs.slice(0, 3).map((ev) => (
                  <button key={String(ev.id)} type="button" onClick={() => onEventClick?.(ev)}
                    className="block w-full truncate text-start text-[10px] md:text-[11px] rounded px-1 mt-0.5"
                    style={{ background: softColor(colorOf(ev), 0.18) }}>
                    <span className="num">{toLocalStr(ev.start).substring(11)}</span> {ev.title}
                  </button>
                ))}
                {evs.length > 3 && <div className="text-[10px] text-erp-text-muted px-1">+{evs.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else {
    // أجندة: الأيام اللي فيها مواعيد بس
    const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
    body = (
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
        {days.map((d) => {
          const evs = events.filter((e) => dayKey(e.start) === dayKey(d)).sort((a, b) => a.start.getTime() - b.start.getTime());
          return (
            <div key={dayKey(d)}>
              <div className="flex items-center justify-between px-1 pb-1">
                <span className={`text-[13px] font-semibold ${dayKey(d) === dayKey(new Date()) ? "text-erp-accent" : ""}`}>{d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "short" })}</span>
                <button type="button" className="text-[12px] text-erp-accent min-h-[36px] px-2" onClick={() => clickSlot(new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(dayStart / 60), dayStart % 60))}>+ {t("New", "جديد")}</button>
              </div>
              {evs.length === 0 && <div className="text-[12px] text-erp-text-subtle px-1">{t("No appointments", "لا توجد مواعيد")}</div>}
              {evs.map((ev) => {
                const st = findStatus(config.statuses, ev.status);
                const r = resources.find((x) => String(x.id) === String(ev.resource));
                return (
                  <button key={String(ev.id)} type="button" onClick={() => onEventClick?.(ev)}
                    className="w-full flex items-center gap-3 text-start rounded-lg border border-erp-border bg-erp-surface px-3 py-2 mb-1.5 min-h-[52px]"
                    style={{ borderInlineStartWidth: 4, borderInlineStartColor: colorOf(ev) }}>
                    <div className="num text-[12px] text-erp-text-muted w-12 shrink-0">{toLocalStr(ev.start).substring(11)}<br />{toLocalStr(ev.end).substring(11)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px] truncate">{ev.title}</div>
                      <div className="text-[12px] text-erp-text-muted truncate">{[r ? lt(r.label) : "", ev.subtitle].filter(Boolean).join(" · ")}</div>
                    </div>
                    {st && <span className="text-[11px] font-semibold shrink-0" style={{ color: st.color }}>{lt(st.label)}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const viewNames: Record<SchedulerView, string> = {
    day: t("Day", "يوم"), week: t("Week", "أسبوع"), month: t("Month", "شهر"), agenda: t("Agenda", "أجندة"), resource: t("Resources", "الموارد"),
  };

  return (
    <div className="flex flex-col rounded-erp-card border border-erp-border bg-erp-surface text-erp-text overflow-hidden" style={{ height }} dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-erp-border">
        <div className="flex items-center gap-1.5">
          <button type="button" className={btnClass("gray")} onClick={() => step(isAr ? 1 : -1)} aria-label={t("Previous", "السابق")}>{isAr ? "›" : "‹"}</button>
          <button type="button" className={btnClass("gray")} onClick={() => setDate(new Date())}>{t("Today", "النهارده")}</button>
          <button type="button" className={btnClass("gray")} onClick={() => step(isAr ? -1 : 1)} aria-label={t("Next", "التالي")}>{isAr ? "‹" : "›"}</button>
          <span className="ms-2 font-semibold text-[14px]">{fmtTitle()}</span>
          {loading && <span className="size-2 rounded-full bg-erp-warning animate-pulse" aria-label={t("Loading", "تحميل")} />}
        </div>
        {/* max-w-full + overflow-x-auto: على الموبايل زرار "Agenda" كان بيتقص (overflow-hidden) */}
        <div className="inline-flex max-w-full rounded-lg border border-erp-border overflow-x-auto text-[12px]" role="group">
          {views.map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={v === view}
              className={`shrink-0 px-3 min-h-[36px] ${v === view ? "bg-erp-accent text-white" : "bg-erp-surface text-erp-text-muted hover:bg-erp-surface-2"}`}>{viewNames[v]}</button>
          ))}
        </div>
      </div>
      {body}
    </div>
  );
}
