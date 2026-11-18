/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  Kanban — P06 لوحة كانبان
//  - كل عمود بيحمل لوحده (صفحة 20 + تحميل لانهائي جوه العمود) والعدد الكلي من السيرفر
//  - سحب الكارت لعمود تاني (كمبيوتر) أو "نقل إلى" من القايمة (موبايل/لمس)
//  - قواعد: الانتقالات المسموحة + حد WIP لكل عمود
//  - نقل متفائل: الكارت بيتنقل فورًا، ولو onMove رجعت false بيرجع مكانه
//  - موبايل: عمود واحد ظاهر + شريط الأعمدة فوق
// =====================================================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { KanbanColumn, KanbanConfig } from "./ModelKanban";
import { ShowConfirm } from "../../DialogModal";
import { Sys } from "../../../SystemTools";
import {
  BottomSheet, InfiniteSentinel, StatusPill, btnClass, findStatus, fmtValue, softColor, sqlDataProvider,
  useIsMobile, useLangKit, usePagedData,
} from "./patternKit";

type Card = Record<string, any>;
interface Move { card: Card; from: string; to: string }

export interface KanbanProps {
  config: KanbanConfig;
  provider?: DataProvider;
  /** تنفيذ النقل (Update / إجراء) — رجّع false للرفض */
  onMove?: (card: Card, from: string | number, to: string | number) => Promise<boolean | void> | boolean | void;
  onCardClick?: (card: Card) => void;
  /** شرط إضافي (مثلاً من الفلاتر المتتالية) */
  extraCondition?: string;
  where?: Record<string, any>;
  height?: number | string;
}

function KanbanCard({ card, config, onClick, onDragStart, onMoveMenu }: { card: Card; config: KanbanConfig; onClick: () => void; onDragStart: () => void; onMoveMenu: () => void }) {
  const { t, lt, lang } = useLangKit();
  const who = config.assigneeField ? String(card[config.assigneeField] ?? "") : "";
  return (
    <div draggable onDragStart={onDragStart}
      className="group rounded-lg border border-erp-border bg-erp-surface p-2.5 shadow-erp-1 hover:shadow-erp-2 cursor-grab active:cursor-grabbing">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onClick} className="flex-1 min-w-0 text-start">
          <div className="text-[13px] font-semibold leading-snug line-clamp-2">{String(card[config.titleField] ?? "")}</div>
          {config.subtitleField && <div className="text-[12px] text-erp-text-muted truncate">{String(card[config.subtitleField] ?? "")}</div>}
        </button>
        <button type="button" onClick={onMoveMenu} aria-label={t("Move", "نقل")} className="shrink-0 size-9 -m-1 rounded-lg text-erp-text-subtle hover:bg-erp-surface-2">⋮</button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {(config.badges || []).map((b) => {
          const v = card[b.field];
          if (v === null || v === undefined || v === "") return null;
          const st = findStatus(b.statuses, v);
          return st ? <StatusPill key={b.field} status={st} /> : <span key={b.field} className="h-6 px-2 inline-flex items-center rounded-md bg-erp-surface-2 text-[11px] text-erp-text-muted">{lt(b.prefix)} {String(v)}</span>;
        })}
      </div>
      {(config.amountField || config.dateField || who) && (
        <div className="flex items-center justify-between mt-2 text-[11px] text-erp-text-muted">
          <span className="num">{config.dateField ? fmtValue(card[config.dateField], "date", lang) : ""}</span>
          <span className="flex items-center gap-1.5">
            {config.amountField && <span className="num font-semibold text-erp-text">{fmtValue(card[config.amountField], "money", lang)}</span>}
            {who && <span className="size-6 rounded-full bg-erp-accent-soft text-erp-accent inline-flex items-center justify-center text-[10px] font-bold" title={who}>{who.slice(0, 2)}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function Column({ col, config, provider, moves, onDropCard, onDragStart, onCardClick, onMoveMenu, onCount, extraCondition, where, full }: {
  col: KanbanColumn; config: KanbanConfig; provider: DataProvider; moves: Move[]; onCount: (key: string, n: number) => void;
  onDropCard: (to: KanbanColumn, count: number) => void; onDragStart: (card: Card, from: string) => void;
  onCardClick?: (c: Card) => void; onMoveMenu: (c: Card, from: string) => void;
  extraCondition?: string; where?: Record<string, any>; full?: boolean;
}) {
  const { t, lt } = useLangKit();
  const key = String(col.value);
  const scrollRef = useRef<HTMLDivElement>(null);
  const data = usePagedData({
    provider, source: config.source, where: { ...(where || {}), [config.statusField]: col.value },
    extraCondition, mode: "infinite", pageSize: config.pageSize || 20,
  });
  const [over, setOver] = useState(false);
  const movedOut = new Set(moves.filter((m) => m.from === key && m.to !== key).map((m) => String(m.card[config.idField])));
  const movedIn = moves.filter((m) => m.to === key && m.from !== key).map((m) => m.card);
  const movedInIds = new Set(movedIn.map((c) => String(c[config.idField])));
  const fromData = data.rows.filter((r: any) => !movedOut.has(String(r[config.idField])) && !movedInIds.has(String(r[config.idField])));
  const cards = [...movedIn, ...fromData];
  const count = data.total - (data.rows.length - fromData.length) + movedIn.length;
  const wipOver = !!col.wipLimit && count > col.wipLimit;
  useEffect(() => { onCount(key, count); }, [key, count, onCount]);

  return (
    <div className={`flex flex-col min-h-0 rounded-xl bg-erp-surface-2/70 border ${over ? "border-erp-accent" : "border-transparent"} ${full ? "w-full" : "w-[280px] shrink-0"}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDropCard(col, count); }}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="flex items-center gap-2 font-semibold text-[13px]"><span className="size-2.5 rounded-full" style={{ background: col.color }} />{lt(col.label)}</span>
        <span className={`num text-[11px] h-6 px-2 inline-flex items-center rounded-full ${wipOver ? "bg-erp-danger-bg text-erp-danger" : "bg-erp-surface text-erp-text-muted"}`}>
          {count}{col.wipLimit ? ` / ${col.wipLimit}` : ""}
        </span>
      </div>
      <div className="h-1 mx-3 rounded-full" style={{ background: softColor(col.color, 0.5) }} />
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {cards.map((c) => (
          <KanbanCard key={String(c[config.idField])} card={c} config={config}
            onClick={() => onCardClick?.(c)} onDragStart={() => onDragStart(c, key)} onMoveMenu={() => onMoveMenu(c, key)} />
        ))}
        {data.loading && <div className="py-3 text-center text-xs text-erp-text-muted">{t("Loading...", "جاري التحميل...")}</div>}
        {!data.loading && cards.length === 0 && <div className="py-6 text-center text-xs text-erp-text-subtle">{t("Drop cards here", "اسحب الكروت هنا")}</div>}
        <InfiniteSentinel data={data} rootRef={scrollRef} />
      </div>
    </div>
  );
}

export default function Kanban({ config, provider = sqlDataProvider, onMove, onCardClick, extraCondition, where, height = "calc(100vh - 170px)" }: KanbanProps) {
  const { t, lt, dir } = useLangKit();
  const isMobile = useIsMobile();
  const [moves, setMoves] = useState<Move[]>([]);
  const drag = useRef<{ card: Card; from: string } | null>(null);
  const [menu, setMenu] = useState<{ card: Card; from: string } | null>(null);
  const [activeCol, setActiveCol] = useState(String(config.columns[0]?.value ?? ""));

  const allowed = (from: string, to: string) => {
    if (from === to) return false;
    const tr = config.transitions?.[from];
    return !tr || tr.map(String).includes(to);
  };

  const doMove = useCallback(async (card: Card, from: string, to: KanbanColumn, toCount: number) => {
    const toKey = String(to.value);
    if (!allowed(from, toKey)) { if (from !== toKey) Sys.ShowMessage("This move is not allowed", "النقل ده مش مسموح", "warning"); return; }
    if (to.wipLimit && toCount >= to.wipLimit) {
      if ((config.wipRule || "warn") === "block") { Sys.ShowMessage(`WIP limit reached (${to.wipLimit})`, `العمود وصل للحد (${to.wipLimit})`, "warning"); return; }
      if (!(await ShowConfirm(`Column is at its WIP limit (${to.wipLimit}). Move anyway?`, `العمود وصل للحد (${to.wipLimit}). تنقل برضه؟`))) return;
    }
    const id = String(card[config.idField]);
    // لو الكارت اتنقل قبل كده: الأصل بتاعه هو from الأصلي
    const prev = moves.find((m) => String(m.card[config.idField]) === id);
    const origin = prev ? prev.from : from;
    const moved = { ...card, [config.statusField]: to.value };
    setMoves((ms) => [...ms.filter((m) => String(m.card[config.idField]) !== id), { card: moved, from: origin, to: toKey }]);
    try {
      const ok = onMove ? await onMove(card, from, to.value) : true;
      if (ok === false) throw new Error("rejected");
    } catch {
      setMoves((ms) => (prev ? ms.map((m) => (String(m.card[config.idField]) === id ? prev : m)) : ms.filter((m) => String(m.card[config.idField]) !== id)));
      Sys.ShowMessage("Move failed", "فشل النقل", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, moves, onMove]);

  const countsRef = useRef<Record<string, number>>({});
  const onCount = useCallback((k: string, n: number) => { countsRef.current[k] = n; }, []);
  const cols = isMobile ? config.columns.filter((c) => String(c.value) === activeCol) : config.columns;

  return (
    <div className="flex flex-col rounded-erp-card border border-erp-border bg-erp-surface text-erp-text overflow-hidden" style={{ height }} dir={dir}>
      {isMobile && (
        <div className="flex gap-1.5 overflow-x-auto px-2 py-2 border-b border-erp-border">
          {config.columns.map((c) => (
            <button key={String(c.value)} type="button" onClick={() => setActiveCol(String(c.value))}
              className="shrink-0 min-h-[40px] px-3 rounded-full text-[12px] font-semibold border"
              style={activeCol === String(c.value) ? { background: c.color, color: "#fff", borderColor: c.color } : { borderColor: softColor(c.color, 0.5), color: c.color }}>
              {lt(c.label)}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto p-2 md:p-3">
        {cols.map((c) => (
          <Column key={String(c.value)} col={c} config={config} provider={provider} moves={moves} full={isMobile}
            extraCondition={extraCondition} where={where}
            onDragStart={(card, from) => { drag.current = { card, from }; }}
            onCount={onCount}
            onDropCard={(to, count) => { const d = drag.current; drag.current = null; if (d) doMove(d.card, d.from, to, count); }}
            onCardClick={onCardClick}
            onMoveMenu={(card, from) => setMenu({ card, from })} />
        ))}
      </div>

      <BottomSheet open={!!menu} onClose={() => setMenu(null)} title={menu ? String(menu.card[config.titleField] ?? "") : ""}>
        {menu && (
          <div className="space-y-2">
            <div className="text-[12px] text-erp-text-muted">{t("Move to", "نقل إلى")}</div>
            <div className="grid grid-cols-2 gap-2">
              {config.columns.filter((c) => allowed(menu.from, String(c.value))).map((c) => (
                <button key={String(c.value)} type="button" className={btnClass("gray", "lg")} style={{ borderInlineStart: `4px solid ${c.color}` }}
                  onClick={() => { const m = menu; setMenu(null); doMove(m.card, m.from, c, countsRef.current[String(c.value)] ?? 0); }}>
                  {lt(c.label)}
                </button>
              ))}
            </div>
            {onCardClick && <button type="button" className={`${btnClass("primary", "lg")} w-full`} onClick={() => { const m = menu; setMenu(null); onCardClick(m.card); }}>{t("Open", "فتح")}</button>}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
