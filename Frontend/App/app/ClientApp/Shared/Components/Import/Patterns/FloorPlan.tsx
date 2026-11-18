/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  FloorPlan — P09 مخطط الصالة
//  - لوحة بتتظبط على عرض الشاشة (scale) + زرار تكبير/تصغير
//  - كل عنصر لونه من حالته + رقم + عدد الأفراد + المدة من وقت الفتح + المبلغ
//  - دوسة: لو فيه clickAction للحالة دي بينفذه علطول، غير كده بيفتح قايمة الإجراءات
//  - وضع التصميم (editable): سحب العناصر لتغيير مكانها (onMove)
//  - الموبايل: بلاطات مجمعة بالمنطقة (أو اللوحة لو phoneLayout = canvas)
//  - البيانات: rows من الأب (لحظي) أو source + refreshSeconds
// =====================================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { FloorPlanConfig } from "./ModelFloorPlan";
import { ShowConfirm } from "../../DialogModal";
import {
  BottomSheet, StatusPill, btnClass, findStatus, fmtDuration, fmtNumber, softColor, sqlDataProvider,
  useIsMobile, useLangKit, useNow,
} from "./patternKit";

export interface FloorPlanProps {
  config: FloorPlanConfig;
  rows?: Record<string, any>[];
  provider?: DataProvider;
  onAction?: (actionId: string, obj: Record<string, any>) => void;
  /** وضع التصميم: سحب العناصر */
  editable?: boolean;
  onMove?: (obj: Record<string, any>, x: number, y: number) => void;
  serverTimeOffsetMs?: number;
  height?: number | string;
}

export default function FloorPlan({ config, rows: rowsProp, provider = sqlDataProvider, onAction, editable, onMove, serverTimeOffsetMs = 0, height = "calc(100vh - 170px)" }: FloorPlanProps) {
  const { t, lt, dir } = useLangKit();
  const isMobile = useIsMobile();
  const F = config.objects;
  const [area, setArea] = useState(config.areas[0]?.id);
  const [loaded, setLoaded] = useState<Record<string, any>[]>([]);
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [zoom, setZoom] = useState(1);
  const [boxW, setBoxW] = useState(800);
  const boxRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: any; dx: number; dy: number; x: number; y: number } | null>(null);
  const now = useNow(15000, serverTimeOffsetMs);

  // ---------- تحميل (لو مفيش rows) ----------
  useEffect(() => {
    if (rowsProp || !F.source) return;
    let alive = true;
    const load = () => provider({ source: F.source!, page: 0, pageSize: 0 }).then((r) => { if (alive) setLoaded(r.rows); }).catch(() => undefined);
    load();
    const sec = config.refreshSeconds || 0;
    const h = sec > 0 ? setInterval(load, sec * 1000) : null;
    return () => { alive = false; if (h) clearInterval(h); };
  }, [rowsProp, F.source, provider, config.refreshSeconds]);

  const all = rowsProp || loaded;
  const objects = useMemo(() => all.filter((o) => String(o[F.areaField]) === String(area)), [all, F.areaField, area]);
  const areaDef = config.areas.find((a) => String(a.id) === String(area));
  const cw = areaDef?.width || config.canvas?.width || 1000;
  const ch = areaDef?.height || config.canvas?.height || 640;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [isMobile, config.phoneLayout]);

  const fit = Math.min(1.5, Math.max(0.3, (boxW - 16) / cw));
  const scale = fit * zoom;

  // ---------- عداد الحالات (الأسطورة) ----------
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of all) m[String(o[F.statusField])] = (m[String(o[F.statusField])] || 0) + 1;
    return m;
  }, [all, F.statusField]);

  const elapsed = (o: Record<string, any>) => {
    if (!F.openedAtField || !o[F.openedAtField]) return "";
    if (config.timedStatuses && !config.timedStatuses.map(String).includes(String(o[F.statusField]))) return "";
    return fmtDuration(now - new Date(o[F.openedAtField]).getTime());
  };

  const click = (o: Record<string, any>) => {
    if (editable) return;
    const direct = config.clickAction?.[String(o[F.statusField])];
    if (direct) { onAction?.(direct, o); return; }
    setSelected(o);
  };

  const runAction = async (actionId: string) => {
    const a = (config.actions || []).find((x) => x.id === actionId);
    if (!selected || !a) return;
    if (a.confirm && !(await ShowConfirm(lt(a.confirm), lt(a.confirm)))) return;
    onAction?.(actionId, selected);
    setSelected(null);
  };

  // ---------- سحب (وضع التصميم) ----------
  const onPointerDown = (e: React.PointerEvent, o: Record<string, any>) => {
    if (!editable) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ id: o[F.idField], dx: e.clientX, dy: e.clientY, x: Number(o[F.xField]) || 0, y: Number(o[F.yField]) || 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const g = config.canvas?.grid || 10;
    const nx = Math.round((drag.x + (e.clientX - drag.dx) / scale * (dir === "rtl" ? -1 : 1)) / g) * g;
    const ny = Math.round((drag.y + (e.clientY - drag.dy) / scale) / g) * g;
    const el = document.querySelector(`[data-fp="${drag.id}"]`) as HTMLElement | null;
    if (el) { el.style.insetInlineStart = `${nx * scale}px`; el.style.top = `${ny * scale}px`; el.dataset.nx = String(nx); el.dataset.ny = String(ny); }
  };
  const onPointerUp = () => {
    if (!drag) return;
    const el = document.querySelector(`[data-fp="${drag.id}"]`) as HTMLElement | null;
    const o = all.find((x) => x[F.idField] === drag.id);
    if (el && o && el.dataset.nx) onMove?.(o, Number(el.dataset.nx), Number(el.dataset.ny));
    setDrag(null);
  };

  const tileInfo = (o: Record<string, any>) => (
    <>
      <div className="font-bold text-[15px] leading-none">{String(o[F.labelField] ?? "")}</div>
      {F.guestsField && o[F.guestsField] ? <div className="text-[11px] num">👥 {o[F.guestsField]}{F.seatsField ? `/${o[F.seatsField]}` : ""}</div> : F.seatsField ? <div className="text-[10px] opacity-70 num">{o[F.seatsField]} {t("seats", "كرسي")}</div> : null}
      {elapsed(o) && <div className="text-[11px] num">⏱ {elapsed(o)}</div>}
      {F.amountField && Number(o[F.amountField]) > 0 && <div className="text-[11px] font-semibold num">{fmtNumber(o[F.amountField], 0)}</div>}
    </>
  );

  const legend = (
    <div className="flex flex-wrap gap-1.5">
      {config.statuses.map((s) => (
        <span key={String(s.value)} className="inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-medium" style={{ background: softColor(s.color), color: s.color }}>
          <span className="size-2 rounded-full" style={{ background: s.color }} />{lt(s.label)} <span className="num">{counts[String(s.value)] || 0}</span>
        </span>
      ))}
    </div>
  );

  const tilesMode = isMobile && (config.phoneLayout || "tiles") === "tiles";

  return (
    <div className="flex flex-col rounded-erp-card border border-erp-border bg-erp-surface text-erp-text overflow-hidden" style={{ height }} dir={dir}>
      {/* شريط المناطق + الأسطورة */}
      <div className="px-3 py-2 border-b border-erp-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {config.areas.map((a) => (
              <button key={String(a.id)} type="button" role="tab" aria-selected={String(a.id) === String(area)} onClick={() => setArea(a.id)}
                className={`shrink-0 min-h-[40px] px-3 rounded-lg text-[13px] font-medium ${String(a.id) === String(area) ? "bg-erp-accent text-white" : "bg-erp-surface-2 text-erp-text-muted"}`}>
                {lt(a.label)}
              </button>
            ))}
          </div>
          {!tilesMode && (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" className={btnClass("gray")} onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} aria-label={t("Zoom out", "تصغير")}>−</button>
              <button type="button" className={btnClass("gray")} onClick={() => setZoom(1)} aria-label={t("Fit", "ملائمة")}><span className="num">{Math.round(zoom * 100)}%</span></button>
              <button type="button" className={btnClass("gray")} onClick={() => setZoom((z) => Math.min(3, z + 0.15))} aria-label={t("Zoom in", "تكبير")}>+</button>
            </div>
          )}
        </div>
        {legend}
      </div>

      {tilesMode ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 grid grid-cols-3 sm:grid-cols-4 gap-2 content-start">
          {objects.map((o) => {
            const st = findStatus(config.statuses, o[F.statusField]);
            return (
              <button key={String(o[F.idField])} type="button" onClick={() => click(o)}
                className={`min-h-[84px] rounded-xl border-2 p-2 flex flex-col items-center justify-center gap-0.5 ${st?.blink ? "animate-pulse" : ""}`}
                style={{ borderColor: st?.color || "var(--erp-border)", background: st?.bg || softColor(st?.color || "#94A3B8", 0.14), color: "var(--erp-text)" }}>
                {tileInfo(o)}
              </button>
            );
          })}
        </div>
      ) : (
        <div ref={boxRef} className="flex-1 min-h-0 overflow-auto p-2 touch-pan-x touch-pan-y" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="relative rounded-xl border border-dashed border-erp-border-strong bg-erp-canvas"
            style={{ width: cw * scale, height: ch * scale, backgroundImage: areaDef?.background ? `url(${areaDef.background})` : editable ? "radial-gradient(var(--erp-border-strong) 1px, transparent 1px)" : undefined, backgroundSize: areaDef?.background ? "cover" : `${(config.canvas?.grid || 10) * 2 * scale}px ${(config.canvas?.grid || 10) * 2 * scale}px` }}>
            {objects.map((o) => {
              const st = findStatus(config.statuses, o[F.statusField]);
              const round = F.shapeField && String(o[F.shapeField]) === "round";
              const w = (Number(o[F.wField]) || 80) * scale, h = (Number(o[F.hField]) || 80) * scale;
              return (
                <button key={String(o[F.idField])} type="button" data-fp={String(o[F.idField])}
                  onClick={() => click(o)} onPointerDown={(e) => onPointerDown(e, o)}
                  aria-label={`${o[F.labelField]} ${st ? lt(st.label) : ""}`}
                  className={`absolute flex flex-col items-center justify-center gap-0.5 border-2 shadow-erp-2 transition-shadow hover:shadow-erp-3 ${round ? "rounded-full" : "rounded-xl"} ${st?.blink ? "animate-pulse" : ""} ${editable ? "cursor-move" : ""}`}
                  style={{
                    insetInlineStart: (Number(o[F.xField]) || 0) * scale, top: (Number(o[F.yField]) || 0) * scale, width: w, height: h,
                    transform: F.rotationField && o[F.rotationField] ? `rotate(${o[F.rotationField]}deg)` : undefined,
                    borderColor: st?.color || "var(--erp-border-strong)", background: st?.bg || softColor(st?.color || "#94A3B8", 0.18), color: "var(--erp-text)",
                    fontSize: Math.max(9, Math.min(14, 12 * scale)),
                  }}>
                  {tileInfo(o)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* قايمة الإجراءات */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)}
        title={selected ? <span className="flex items-center gap-2">{String(selected[F.labelField])} <StatusPill status={findStatus(config.statuses, selected[F.statusField])} /></span> : ""}>
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              {F.guestsField && <div><span className="text-erp-text-muted">{t("Guests", "الأفراد")}: </span><span className="num">{selected[F.guestsField] ?? "—"}</span></div>}
              {F.waiterField && <div><span className="text-erp-text-muted">{t("Waiter", "الويتر")}: </span>{selected[F.waiterField] ?? "—"}</div>}
              {elapsed(selected) && <div><span className="text-erp-text-muted">{t("Time", "الوقت")}: </span><span className="num">{elapsed(selected)}</span></div>}
              {F.amountField && <div><span className="text-erp-text-muted">{t("Amount", "المبلغ")}: </span><span className="num">{fmtNumber(selected[F.amountField] || 0)}</span></div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(config.actions || []).filter((a) => !a.showForStatus || a.showForStatus.map(String).includes(String(selected[F.statusField]))).map((a) => (
                <button key={a.id} type="button" className={btnClass(a.variant || "gray", "lg")} onClick={() => runAction(a.id)}>{a.icon} {lt(a.label)}</button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
