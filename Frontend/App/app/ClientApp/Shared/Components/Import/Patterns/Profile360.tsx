/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  Profile360 — P05 ملف السجل الشامل
//  - كارت رأس: صورة/حروف أولى، العنوان، شارات حالة، أرقام سريعة، إجراءات سريعة
//  - تابات: fields / list / timeline / notes / kpis — كل تاب بيتحمل أول مرة يتفتح بس (كسول)
//  - القوائم: صفحات من السيرفر أو تحميل لانهائي (حسب loadMode)
//  - موبايل: الرأس بيصغر، التابات chips بتتمرر أفقي (أو أقسام تحت بعض)
// =====================================================================================

import React, { useEffect, useMemo, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type {
  Profile360Config, ProfileKpisTab, ProfileListTab, ProfileNotesTab, ProfileTab, ProfileTimelineTab,
} from "./ModelProfile360";
import {
  EmptyState, InfiniteSentinel, PagerBar, StatusPill, btnClass, cardClass, findStatus, fmtValue,
  sqlDataProvider, useIsMobile, useLangKit, usePagedData,
} from "./patternKit";

export interface Profile360Props {
  config: Profile360Config;
  /** قيمة مفتاح السجل */
  recordKey: any;
  provider?: DataProvider;
  /** السجل جاهز (لو موجود مش هيتحمل من المصدر) */
  record?: Record<string, any>;
  onAction?: (actionId: string, record: Record<string, any>) => void;
  onRowClick?: (tabId: string, row: Record<string, any>) => void;
  /** إضافة ملاحظة — بعد ما ترجع التاب بيتحدث */
  onAddNote?: (tabId: string, text: string, record: Record<string, any>) => Promise<void> | void;
}

// ------------------------------------------------------------------ تاب: قايمة
function ListTab({ tab, recordKey, provider, onRowClick }: { tab: ProfileListTab; recordKey: any; provider: DataProvider; onRowClick?: (row: any) => void }) {
  const { t, lt, lang } = useLangKit();
  const isMobile = useIsMobile();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const h = setTimeout(() => setDq(q.trim()), 350); return () => clearTimeout(h); }, [q]);
  const data = usePagedData({
    provider, source: tab.source, where: { [tab.foreignKey]: recordKey },
    search: dq && tab.searchFields?.length ? { text: dq, fields: tab.searchFields } : undefined,
    mode: tab.loadMode || "infinite", pageSize: tab.pageSize || 20,
  });
  const mobileCols = tab.columns.filter((c) => c.mobile).length ? tab.columns.filter((c) => c.mobile) : tab.columns.slice(0, 3);

  return (
    <div className="space-y-2">
      {tab.searchFields?.length ? (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search...", "بحث...")}
          className="w-full md:w-72 h-11 md:h-9 border border-erp-border-strong rounded-lg px-3 text-[13px] bg-erp-surface text-erp-text focus:outline-none focus:border-erp-accent" />
      ) : null}
      {data.loading && data.rows.length === 0 ? <div className="py-6 text-center text-xs text-erp-text-muted">{t("Loading...", "جاري التحميل...")}</div> : null}
      {!data.loading && data.rows.length === 0 ? <EmptyState text={t("No records", "لا توجد سجلات")} /> : null}

      {isMobile ? (
        <div className="space-y-2">
          {data.rows.map((r: any, i) => (
            <button key={i} type="button" onClick={() => onRowClick?.(r)} className={`${cardClass} w-full text-start p-3 space-y-1`}>
              {mobileCols.map((c, ci) => (
                <div key={c.field} className={`flex justify-between gap-2 text-[13px] ${ci === 0 ? "font-semibold" : ""}`}>
                  <span className="text-erp-text-muted">{lt(c.label)}</span>
                  <span className="num truncate">{fmtValue(r[c.field], c.format, lang)}</span>
                </div>
              ))}
              {tab.statusField && <StatusPill status={findStatus(tab.statuses, r[tab.statusField])} fallback={String(r[tab.statusField] ?? "")} />}
            </button>
          ))}
        </div>
      ) : data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-erp-border">
          <table className="w-full text-[13px]">
            <thead className="bg-erp-surface-2 text-erp-text-muted">
              <tr>
                {tab.columns.map((c) => <th key={c.field} className="text-start font-medium px-3 py-2 whitespace-nowrap" style={{ width: c.width }}>{lt(c.label)}</th>)}
                {tab.statusField && <th className="text-start font-medium px-3 py-2">{t("Status", "الحالة")}</th>}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r: any, i) => (
                <tr key={i} className="border-t border-erp-border hover:bg-erp-surface-2 cursor-pointer" onClick={() => onRowClick?.(r)}>
                  {tab.columns.map((c) => <td key={c.field} className={`px-3 py-2 whitespace-nowrap ${c.format === "money" || c.format === "number" ? "num" : ""}`}>{fmtValue(r[c.field], c.format, lang)}</td>)}
                  {tab.statusField && <td className="px-3 py-2"><StatusPill status={findStatus(tab.statuses, r[tab.statusField])} fallback={String(r[tab.statusField] ?? "")} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <InfiniteSentinel data={data} />
      <PagerBar data={data} />
    </div>
  );
}

// ------------------------------------------------------------------ تاب: خط زمني
function TimelineTab({ tab, recordKey, provider }: { tab: ProfileTimelineTab; recordKey: any; provider: DataProvider }) {
  const { t, lang } = useLangKit();
  const data = usePagedData({
    provider, source: { ...tab.source, orderBy: tab.source.orderBy || tab.timeField, orderType: tab.source.orderType || "DESC" },
    where: { [tab.foreignKey]: recordKey }, mode: "infinite", pageSize: tab.pageSize || 20,
  });
  if (!data.loading && data.rows.length === 0) return <EmptyState text={t("No events", "لا توجد أحداث")} />;
  return (
    <ol className="relative border-s-2 border-erp-border ms-3 space-y-4 py-1">
      {data.rows.map((r: any, i) => {
        const st = tab.statusField ? findStatus(tab.statuses, r[tab.statusField]) : undefined;
        return (
          <li key={i} className="ms-4">
            <span className="absolute -start-[9px] mt-1 size-4 rounded-full border-2 border-erp-surface" style={{ background: st?.color || "var(--erp-accent)" }} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[14px]">{String(r[tab.titleField] ?? "")}</span>
              {st && <StatusPill status={st} />}
            </div>
            <div className="text-[12px] text-erp-text-muted num">{fmtValue(r[tab.timeField], "datetime", lang)}{tab.userField && r[tab.userField] ? ` · ${r[tab.userField]}` : ""}</div>
            {tab.noteField && r[tab.noteField] && <p className="text-[13px] mt-1">{String(r[tab.noteField])}</p>}
          </li>
        );
      })}
      <InfiniteSentinel data={data} />
    </ol>
  );
}

// ------------------------------------------------------------------ تاب: ملاحظات
function NotesTab({ tab, recordKey, provider, onAdd }: { tab: ProfileNotesTab; recordKey: any; provider: DataProvider; onAdd?: (text: string) => Promise<void> | void }) {
  const { t, lang } = useLangKit();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const data = usePagedData({
    provider, source: { ...tab.source, orderBy: tab.source.orderBy || tab.timeField, orderType: tab.source.orderType || "DESC" },
    where: { [tab.foreignKey]: recordKey }, mode: "infinite", pageSize: 20,
  });
  const add = async () => {
    if (!text.trim() || !onAdd) return;
    setBusy(true);
    try { await onAdd(text.trim()); setText(""); data.refresh(); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      {tab.allowAdd && onAdd && (
        <div className="flex gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t("Write a note...", "اكتب ملاحظة...")}
            className="flex-1 border border-erp-border-strong rounded-lg px-3 py-2 text-[13px] bg-erp-surface text-erp-text focus:outline-none focus:border-erp-accent" />
          <button type="button" className={btnClass("primary")} disabled={busy || !text.trim()} onClick={add}>{t("Add", "إضافة")}</button>
        </div>
      )}
      {!data.loading && data.rows.length === 0 && <EmptyState text={t("No notes", "لا توجد ملاحظات")} />}
      {data.rows.map((r: any, i) => (
        <div key={i} className="rounded-xl bg-erp-surface-2 px-3 py-2">
          <p className="text-[13px] whitespace-pre-wrap">{String(r[tab.textField] ?? "")}</p>
          <div className="text-[11px] text-erp-text-subtle mt-1 num">{tab.userField ? r[tab.userField] : ""}{tab.timeField ? ` · ${fmtValue(r[tab.timeField], "datetime", lang)}` : ""}</div>
        </div>
      ))}
      <InfiniteSentinel data={data} />
    </div>
  );
}

function KpisTab({ tab, record }: { tab: ProfileKpisTab; record: Record<string, any> }) {
  const { lt, lang } = useLangKit();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tab.items.map((k) => (
        <div key={k.field} className={`${cardClass} p-3`}>
          <div className="text-[12px] text-erp-text-muted">{lt(k.label)}</div>
          <div className="text-xl font-bold num mt-1" style={{ color: k.color }}>{fmtValue(record[k.field], k.format, lang)}</div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ المكون
export default function Profile360({ config, recordKey, provider = sqlDataProvider, record: recordProp, onAction, onRowClick, onAddNote }: Profile360Props) {
  const { t, lt, lang, dir } = useLangKit();
  const isMobile = useIsMobile();
  const [loadedRecord, setRecord] = useState<Record<string, any> | null>(null);
  const [loadingState, setLoading] = useState(!recordProp);
  const record = recordProp || loadedRecord;
  const loading = !recordProp && loadingState;
  const [active, setActive] = useState(config.tabs[0]?.id || "");
  const [opened, setOpened] = useState<Set<string>>(() => new Set([config.tabs[0]?.id || ""]));

  useEffect(() => {
    if (recordProp) return;
    let alive = true;
    provider({ source: config.entity, where: { [config.entity.keyField]: recordKey }, page: 1, pageSize: 1 })
      .then((r) => { if (alive) setRecord(r.rows[0] || null); })
      .catch(() => { if (alive) setRecord(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [recordKey, recordProp, provider, config.entity]);

  const openTab = (id: string) => { setActive(id); setOpened((s) => new Set(s).add(id)); };
  const h = config.header;
  const title = record ? String((lang === "en" && h.titleFieldEn ? record[h.titleFieldEn] : record[h.titleField]) ?? "") : "";
  const initials = useMemo(() => title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join(""), [title]);

  if (loading) return <div className="p-6 text-center text-erp-text-muted text-sm" dir={dir}>{t("Loading...", "جاري التحميل...")}</div>;
  if (!record) return <div dir={dir}><EmptyState text={t("Record not found", "السجل غير موجود")} /></div>;

  const renderTab = (tab: ProfileTab) => {
    switch (tab.kind) {
      case "fields":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tab.fields.map((f) => (
              <div key={f.field} style={f.span && !isMobile ? { gridColumn: `span ${f.span} / span ${f.span}` } : undefined}>
                <div className="text-[12px] text-erp-text-muted">{lt(f.label)}</div>
                <div className={`text-[14px] font-medium ${f.format === "money" || f.format === "number" ? "num" : ""}`}>{fmtValue(record[f.field], f.format, lang)}</div>
              </div>
            ))}
          </div>
        );
      case "list": return <ListTab tab={tab} recordKey={recordKey} provider={provider} onRowClick={(r) => onRowClick?.(tab.id, r)} />;
      case "timeline": return <TimelineTab tab={tab} recordKey={recordKey} provider={provider} />;
      case "notes": return <NotesTab tab={tab} recordKey={recordKey} provider={provider} onAdd={onAddNote ? (txt) => onAddNote(tab.id, txt, record) : undefined} />;
      case "kpis": return <KpisTab tab={tab} record={record} />;
    }
  };

  const stacked = isMobile && config.mobileTabs === "stacked";

  return (
    <div className="space-y-3 text-erp-text" dir={dir}>
      {/* ---------- كارت الرأس ---------- */}
      <div className={`${cardClass} p-3 md:p-4`}>
        <div className="flex items-start gap-3 md:gap-4">
          {h.photoField && record[h.photoField] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(record[h.photoField])} alt="" className="size-14 md:size-20 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="size-14 md:size-20 rounded-2xl bg-erp-accent-soft text-erp-accent flex items-center justify-center text-xl md:text-2xl font-bold shrink-0">{initials || "?"}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold truncate">{title}</h2>
              {(h.badges || []).map((b) => {
                const v = record[b.field];
                if (v === null || v === undefined || v === "") return null;
                const st = findStatus(b.statuses, v);
                return st ? <StatusPill key={b.field} status={st} /> : (
                  <span key={b.field} className="inline-flex h-6 px-2 items-center rounded-md bg-erp-surface-2 text-[11px] text-erp-text-muted">{lt(b.prefix)} {String(v)}</span>
                );
              })}
            </div>
            {h.subtitleField && <div className="text-[13px] text-erp-text-muted truncate">{String(record[h.subtitleField] ?? "")}</div>}
            {h.infoFields && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[12px] text-erp-text-muted">
                {h.infoFields.map((f) => <span key={f.field}>{lt(f.label)}: <span className="num text-erp-text">{fmtValue(record[f.field], f.format, lang)}</span></span>)}
              </div>
            )}
          </div>
          {!isMobile && config.quickActions && (
            <div className="flex flex-wrap gap-2 justify-end">
              {config.quickActions.map((a) => (
                <button key={a.id} type="button" className={btnClass(a.variant || "gray")} onClick={() => onAction?.(a.id, record)}>{a.icon} {lt(a.label)}</button>
              ))}
            </div>
          )}
        </div>
        {h.stats && h.stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {h.stats.map((s) => (
              <div key={s.field} className="rounded-lg bg-erp-surface-2 px-3 py-2">
                <div className="text-[11px] text-erp-text-muted">{lt(s.label)}</div>
                <div className="text-[16px] font-bold num" style={{ color: s.color }}>{fmtValue(record[s.field], s.format, lang)}</div>
              </div>
            ))}
          </div>
        )}
        {isMobile && config.quickActions && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {config.quickActions.map((a) => (
              <button key={a.id} type="button" className={`${btnClass(a.variant || "gray")} shrink-0`} onClick={() => onAction?.(a.id, record)}>{a.icon} {lt(a.label)}</button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- التابات ---------- */}
      {stacked ? (
        config.tabs.map((tab) => (
          <details key={tab.id} className={`${cardClass} p-3`} open={tab.id === config.tabs[0]?.id} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) openTab(tab.id); }}>
            <summary className="font-semibold cursor-pointer min-h-[44px] flex items-center gap-2">{tab.icon} {lt(tab.label)}</summary>
            <div className="pt-2">{opened.has(tab.id) && renderTab(tab)}</div>
          </details>
        ))
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex gap-1 overflow-x-auto border-b border-erp-border px-2" role="tablist">
            {config.tabs.map((tab) => {
              const cnt = tab.countField ? record[tab.countField] : undefined;
              const on = tab.id === active;
              return (
                <button key={tab.id} type="button" role="tab" aria-selected={on} onClick={() => openTab(tab.id)}
                  className={`shrink-0 min-h-[44px] px-3 text-[13px] font-medium border-b-2 transition-colors ${on ? "border-erp-accent text-erp-accent" : "border-transparent text-erp-text-muted hover:text-erp-text"}`}>
                  {tab.icon && <span className="me-1" aria-hidden="true">{tab.icon}</span>}{lt(tab.label)}
                  {cnt !== undefined && cnt !== null && <span className="num ms-1.5 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-erp-surface-2 text-[11px]">{cnt}</span>}
                </button>
              );
            })}
          </div>
          <div className="p-3 md:p-4">
            {/* التاب بيفضل متركّب بعد أول فتح (مايتحملش تاني لما ترجعله) */}
            {config.tabs.map((tab) => opened.has(tab.id) && (
              <div key={tab.id} hidden={tab.id !== active} role="tabpanel">{renderTab(tab)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
