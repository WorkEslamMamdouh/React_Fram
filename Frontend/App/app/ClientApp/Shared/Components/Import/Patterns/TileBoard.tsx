/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  TileBoard — P10 لوحة الحالة الحية + عداد الجلسات
//  - بلاطة لكل جهاز: الحالة (لون)، العداد الشغال، الحساب اللحظي، الوقت المتبقي (مدفوع مقدم)
//  - تنبيه (وميض + onAlert مرة واحدة) قبل انتهاء الوقت المدفوع، و"الوقت خلص"
//  - مجمعة بالمنطقة/النوع، فلتر بالحالة، الموبايل 2 في الصف والإجراءات في شيت تحت
//  - الوقت من ساعة السيرفر (serverTimeOffsetMs)
// =====================================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { SessionCharge, TileBoardConfig } from "./ModelTileBoard";
import { computeSessionCharge } from "./sessionPricing";
import { ShowConfirm } from "../../DialogModal";
import {
  BottomSheet, StatusPill, btnClass, findStatus, fmtDuration, fmtNumber, groupBy, softColor, sqlDataProvider,
  useLangKit, useNow,
} from "./patternKit";

export interface TileBoardProps {
  config: TileBoardConfig;
  rows?: Record<string, any>[];
  provider?: DataProvider;
  onAction?: (actionId: string, row: Record<string, any>, charge: SessionCharge | null) => void;
  /** تنبيه انتهاء الوقت المدفوع (مرة لكل جلسة) */
  onAlert?: (row: Record<string, any>, remainingMinutes: number) => void;
  serverTimeOffsetMs?: number;
  height?: number | string;
}

export function chargeOf(config: TileBoardConfig, row: Record<string, any>, now: number): SessionCharge | null {
  const S = config.session;
  const running = config.runningStatuses.map(String).includes(String(row[config.statusField]));
  const paused = (config.pausedStatuses || []).map(String).includes(String(row[config.statusField]));
  if ((!running && !paused) || !row[S.startField]) return null;
  let segments;
  if (S.segmentsField && row[S.segmentsField]) {
    try { segments = typeof row[S.segmentsField] === "string" ? JSON.parse(row[S.segmentsField]) : row[S.segmentsField]; } catch { segments = undefined; }
  }
  return computeSessionCharge({
    pricing: config.pricing,
    type: config.typeField ? row[config.typeField] : undefined,
    mode: S.modeField ? row[S.modeField] : undefined,
    segments,
    start: row[S.startField],
    now,
    pausedMs: S.pausedMsField ? Number(row[S.pausedMsField]) || 0 : 0,
    pausedAt: paused && S.pausedAtField ? row[S.pausedAtField] : null,
    prepaidMinutes: S.prepaidMinutesField ? Number(row[S.prepaidMinutesField]) || null : null,
    itemsAmount: S.itemsAmountField ? Number(row[S.itemsAmountField]) || 0 : 0,
  });
}

export default function TileBoard({ config, rows: rowsProp, provider = sqlDataProvider, onAction, onAlert, serverTimeOffsetMs = 0, height = "calc(100vh - 170px)" }: TileBoardProps) {
  const { t, lt, dir } = useLangKit();
  const now = useNow(1000, serverTimeOffsetMs);
  const [loaded, setLoaded] = useState<Record<string, any>[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<any>(null);
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (rowsProp || !config.source) return;
    let alive = true;
    const load = () => provider({ source: config.source!, page: 0, pageSize: 0 }).then((r) => { if (alive) setLoaded(r.rows); }).catch(() => undefined);
    load();
    const sec = config.refreshSeconds || 0;
    const h = sec > 0 ? setInterval(load, sec * 1000) : null;
    return () => { alive = false; if (h) clearInterval(h); };
  }, [rowsProp, config.source, provider, config.refreshSeconds]);

  const all = rowsProp || loaded;
  const shown = filter ? all.filter((r) => String(r[config.statusField]) === filter) : all;
  const groups = useMemo(() => (config.groupField ? groupBy(shown, (r) => String(r[config.groupField!] ?? "")) : [["", shown] as [string, Record<string, any>[]]]), [shown, config.groupField]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of all) m[String(r[config.statusField])] = (m[String(r[config.statusField])] || 0) + 1;
    return m;
  }, [all, config.statusField]);

  // ---------- تنبيه الوقت المدفوع ----------
  const alertMin = config.alertBeforeEndMinutes ?? 5;
  useEffect(() => {
    for (const r of all) {
      const c = chargeOf(config, r, now);
      if (!c || c.remainingMinutes === null) continue;
      const key = `${r[config.idField]}|${r[config.session.startField]}`;
      if (c.remainingMinutes <= alertMin && !alerted.current.has(key)) {
        alerted.current.add(key);
        onAlert?.(r, c.remainingMinutes);
      }
    }
  }, [now, all, config, alertMin, onAlert]);

  const selected = all.find((r) => r[config.idField] === selectedId) || null;
  const selCharge = selected ? chargeOf(config, selected, now) : null;
  const cur = lt(config.pricing.currency);
  const size = config.tileSize || "md";
  const minW = size === "sm" ? 140 : size === "lg" ? 240 : 180;

  const run = async (id: string) => {
    const a = (config.actions || []).find((x) => x.id === id);
    if (!selected || !a) return;
    if (a.confirm && !(await ShowConfirm(lt(a.confirm), lt(a.confirm)))) return;
    onAction?.(id, selected, selCharge);
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col rounded-erp-card border border-erp-border bg-erp-surface text-erp-text overflow-hidden" style={{ height }} dir={dir}>
      {/* فلتر الحالة */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-erp-border">
        <button type="button" onClick={() => setFilter("")} className={`shrink-0 h-9 px-3 rounded-full text-[12px] font-medium border ${!filter ? "bg-erp-accent text-white border-erp-accent" : "border-erp-border text-erp-text-muted"}`}>
          {t("All", "الكل")} <span className="num">{all.length}</span>
        </button>
        {config.statuses.map((s) => (
          <button key={String(s.value)} type="button" onClick={() => setFilter(String(s.value))}
            className="shrink-0 h-9 px-3 rounded-full text-[12px] font-medium border"
            style={filter === String(s.value) ? { background: s.color, color: "#fff", borderColor: s.color } : { color: s.color, borderColor: softColor(s.color, 0.4) }}>
            {s.icon} {lt(s.label)} <span className="num">{counts[String(s.value)] || 0}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-3 space-y-4">
        {groups.map(([g, list]) => (
          <section key={g}>
            {g && <h3 className="text-[13px] font-semibold text-erp-text-muted mb-2 px-1">{g} <span className="num text-erp-text-subtle">({list.length})</span></h3>}
            <div className="grid gap-2 md:gap-3 grid-cols-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${minW}px, 46%), 1fr))` }}>
              {list.map((r) => {
                const st = findStatus(config.statuses, r[config.statusField]);
                const c = chargeOf(config, r, now);
                const low = c && c.remainingMinutes !== null && c.remainingMinutes <= alertMin;
                const over = c && c.remainingMinutes !== null && c.remainingMinutes <= 0;
                const mode = config.session.modeField ? r[config.session.modeField] : undefined;
                return (
                  <button key={String(r[config.idField])} type="button" onClick={() => setSelectedId(r[config.idField])}
                    className={`relative text-start rounded-xl border-2 p-3 min-h-[120px] flex flex-col gap-1 transition-shadow hover:shadow-erp-2 ${low || st?.blink ? "animate-pulse" : ""}`}
                    style={{ borderColor: over ? "#F43F5E" : st?.color || "var(--erp-border)", background: st?.bg || softColor(st?.color || "#94A3B8", 0.1) }}>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-[16px] truncate">{String(r[config.labelField] ?? "")}</span>
                      <StatusPill status={st} fallback={String(r[config.statusField] ?? "")} />
                    </div>
                    <div className="text-[11px] text-erp-text-muted truncate">
                      {[config.typeField ? r[config.typeField] : "", mode ? lt(config.modeLabels?.[mode]) || mode : "", config.session.customerField ? r[config.session.customerField] : ""].filter(Boolean).join(" · ")}
                    </div>
                    {c ? (
                      <>
                        <div className="text-2xl font-bold num tracking-tight" style={{ color: st?.color }}>{fmtDuration(c.elapsedMs)}</div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="num font-semibold">{fmtNumber(c.total)} {cur}</span>
                          <span className="num text-erp-text-subtle">{fmtNumber(c.currentRate, 0)}/{t("h", "س")}</span>
                        </div>
                        {c.remainingMinutes !== null && (
                          <div className={`text-[12px] font-semibold num ${over ? "text-erp-danger" : low ? "text-erp-warning" : "text-erp-text-muted"}`}>
                            {over ? t("Time is up!", "الوقت خلص!") : `${t("Left", "باقي")} ${fmtDuration(c.remainingMinutes * 60000)}`}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-erp-text-subtle text-[12px]">{st?.icon || "—"}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelectedId(null)}
        title={selected ? <span className="flex items-center gap-2">{String(selected[config.labelField])}<StatusPill status={findStatus(config.statuses, selected[config.statusField])} /></span> : ""}>
        {selected && (
          <div className="space-y-3">
            {selCharge && (
              <div className="grid grid-cols-2 gap-2 text-[13px]">
                <div className="rounded-lg bg-erp-surface-2 p-2"><div className="text-erp-text-muted text-[11px]">{t("Time", "الوقت")}</div><div className="num font-bold text-lg">{fmtDuration(selCharge.elapsedMs)}</div></div>
                <div className="rounded-lg bg-erp-surface-2 p-2"><div className="text-erp-text-muted text-[11px]">{t("Billed minutes", "الدقايق المحسوبة")}</div><div className="num font-bold text-lg">{Math.round(selCharge.billedMinutes)}</div></div>
                <div className="rounded-lg bg-erp-surface-2 p-2"><div className="text-erp-text-muted text-[11px]">{t("Time charge", "حساب الوقت")}</div><div className="num font-bold">{fmtNumber(selCharge.timeAmount)} {cur}</div></div>
                <div className="rounded-lg bg-erp-surface-2 p-2"><div className="text-erp-text-muted text-[11px]">{t("Items", "المشتريات")}</div><div className="num font-bold">{fmtNumber(selCharge.itemsAmount)} {cur}</div></div>
                <div className="col-span-2 rounded-lg bg-erp-accent-soft p-2 flex items-center justify-between"><span className="font-semibold">{t("Total", "الإجمالي")}</span><span className="num font-bold text-xl text-erp-accent">{fmtNumber(selCharge.total)} {cur}</span></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {(config.actions || []).filter((a) => !a.showForStatus || a.showForStatus.map(String).includes(String(selected[config.statusField]))).map((a) => (
                <button key={a.id} type="button" className={btnClass(a.variant || "gray", "lg")} onClick={() => run(a.id)}>{a.icon} {lt(a.label)}</button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
