"use client";

// =====================================================================================
//  DesignerView.tsx  (Phase 5)  -  المصمم: بالِت (يسار) + كانفس (وسط) + خصائص (يمين)
//  سحب وإفلات HTML5 حقيقي: من البالِت للمكان، تحريك، تغيير العرض بالمقبض، حذف، نسخ.
// =====================================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { useScreenBuilder } from "../../store/useScreenBuilder";
import {
  ScreenConfigV5, CellV5, FilterControlV5, ActionV5, FilterKind, uid, filterKindOfField, DEFAULT_SPAN, createEmptyProcConfig,
} from "../../types/ScreenConfig";
import {
  DropTarget, addControl, placeField, moveCell, removeCell, duplicateCell, setSpan, addSection, removeSection,
  syncOrderFromLayout, unplacedFields,
} from "../../utils/layoutOps";
import { DbMeta } from "../../utils/dbMeta";
import { FORM_CONTROLS, FILTER_CONTROLS, KIND_LABEL, dnd } from "./catalog";
import PropsPanel from "./PropsPanel";

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_W: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };
const DEVICE_KEY: Record<Device, "lg" | "md" | "base"> = { desktop: "lg", tablet: "md", mobile: "base" };

interface Props {
  db: DbMeta;
  onLoadColumns: (table: string, view: string) => void;
  onGoTab: (tab: "details" | "list" | "validations" | "print") => void;
}

const cardCls = "rounded-xl border border-erp-border bg-erp-surface";
const zoneTitle = "text-[12px] font-semibold text-erp-text-muted uppercase tracking-wide";

export default function DesignerView({ db, onLoadColumns, onGoTab }: Props) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const cfg = useScreenBuilder((s) => s.config);
  const sel = useScreenBuilder((s) => s.selectedElement);
  const mutate = useScreenBuilder((s) => s.mutate);
  const select = useScreenBuilder((s) => s.selectElement);

  const [device, setDevice] = useState<Device>("desktop");
  const [hover, setHover] = useState<string>("");
  const [resizing, setResizing] = useState<{ id: string; n: number } | null>(null);
  const dk = DEVICE_KEY[device];
  const isRtl = !IsLangEN;

  // ---------- مفتاح Delete ----------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
      const s = useScreenBuilder.getState().selectedElement;
      if (!s?.id) return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function deleteSelected() {
    const s = useScreenBuilder.getState().selectedElement;
    if (!s?.id) return;
    const id = s.id;
    if (s.type === "cell") mutate((c) => { removeCell(c, id); return c; }, null);
    else if (s.type === "filterCtl") mutate((c) => { c.filterArea = c.filterArea.filter((x) => x.id !== id); return c; }, null);
    else if (s.type === "action") mutate((c) => { c.actions = c.actions.filter((x) => x.id !== id); return c; }, null);
    else if (s.type === "section") mutate((c) => { removeSection(c, id); return c; }, null);
  }

  // ---------- الإفلات ----------
  function handleDrop(target: DropTarget) {
    const p = dnd.get();
    dnd.end();
    setHover("");
    if (!p) return;
    let newId: string | null = null;
    if (p.t === "new") mutate((c) => { newId = addControl(c, p.kind, target); syncOrderFromLayout(c); return c; });
    else if (p.t === "field") mutate((c) => { newId = placeField(c, p.field, target); syncOrderFromLayout(c); return c; });
    else if (p.t === "cell") { mutate((c) => { moveCell(c, p.id, target); syncOrderFromLayout(c); return c; }); newId = p.id; }
    if (newId) select({ type: "cell", index: 0, id: newId });
  }

  function dropHandlers(key: string, target: () => DropTarget, accept: (p: ReturnType<typeof dnd.get>) => boolean = (p) => !!p && (p.t === "new" || p.t === "field" || p.t === "cell")) {
    return {
      onDragOver: (e: React.DragEvent) => { if (accept(dnd.get())) { e.preventDefault(); e.stopPropagation(); if (hover !== key) setHover(key); } },
      onDragLeave: () => { if (hover === key) setHover(""); },
      onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); handleDrop(target()); },
    };
  }

  // ---------- فلتر ----------
  function addFilterFromField(fieldName: string, atId?: string) {
    mutate((c) => {
      if (c.filterArea.some((x) => x.field === fieldName)) return c;
      const f = c.fields.find((x) => x.field === fieldName);
      if (!f) return c;
      const fc: FilterControlV5 = {
        id: uid("flt"), field: fieldName, kind: filterKindOfField(f), labelAr: f.titleAr || fieldName, labelEn: f.titleEn || fieldName,
        required: false, defaultValue: "", options: f.inputType === "checkbox" ? "1:✓|0:✗" : f.options || "", span: { ...DEFAULT_SPAN },
      };
      if (f.inputType === "selectSearch" && f.selectTable) fc.source = { table: f.selectTable, valueField: f.selectValue || "", displayField: f.selectDisplay || "", displayFieldEn: f.selectDisplayEn || "", condition: f.selectCondition || "", orderBy: "" };
      const i = atId ? c.filterArea.findIndex((x) => x.id === atId) : -1;
      if (i >= 0) c.filterArea.splice(i, 0, fc); else c.filterArea.push(fc);
      return c;
    });
  }
  function onFilterDrop(e: React.DragEvent, atId?: string) {
    e.preventDefault(); e.stopPropagation();
    const p = dnd.get(); dnd.end(); setHover("");
    if (!p) return;
    if (p.t === "field") addFilterFromField(p.field, atId);
    else if (p.t === "fnew") {
      const id = uid("flt");
      mutate((c) => {
        const fc: FilterControlV5 = { id, field: "", kind: p.kind, labelAr: "فلتر", labelEn: "Filter", required: false, defaultValue: "", options: "", span: { ...DEFAULT_SPAN } };
        if (p.kind === "select") fc.source = { table: "", valueField: "", displayField: "", displayFieldEn: "", condition: "", orderBy: "" };
        const i = atId ? c.filterArea.findIndex((x) => x.id === atId) : -1;
        if (i >= 0) c.filterArea.splice(i, 0, fc); else c.filterArea.push(fc);
        return c;
      });
      select({ type: "filterCtl", index: 0, id });
    } else if (p.t === "filter") {
      mutate((c) => {
        const from = c.filterArea.findIndex((x) => x.id === p.id);
        if (from < 0) return c;
        const [it] = c.filterArea.splice(from, 1);
        const i = atId ? c.filterArea.findIndex((x) => x.id === atId) : -1;
        if (i >= 0) c.filterArea.splice(i, 0, it); else c.filterArea.push(it);
        return c;
      });
    }
  }

  // ---------- أعمدة القايمة ----------
  function onListDrop(e: React.DragEvent, atField?: string) {
    e.preventDefault(); e.stopPropagation();
    const p = dnd.get(); dnd.end(); setHover("");
    if (!p) return;
    mutate((c) => {
      const name = p.t === "field" || p.t === "listcol" ? p.field : "";
      if (!name) return c;
      const from = c.fields.findIndex((x) => x.field === name);
      if (from < 0) return c;
      c.fields[from].inGrid = true;
      if (atField && atField !== name) {
        const [it] = c.fields.splice(from, 1);
        const to = c.fields.findIndex((x) => x.field === atField);
        c.fields.splice(to < 0 ? c.fields.length : to, 0, it);
      }
      return c;
    });
  }

  // ---------- تغيير العرض بالمقبض ----------
  function startResize(e: React.PointerEvent, cell: CellV5, rowEl: HTMLElement | null) {
    if (!rowEl) return;
    e.preventDefault(); e.stopPropagation();
    const unit = rowEl.getBoundingClientRect().width / 12;
    const startX = e.clientX;
    const start = cell.span[dk];
    let last = start;
    const move = (ev: PointerEvent) => {
      let dx = ev.clientX - startX;
      if (isRtl) dx = -dx;
      const n = Math.min(12, Math.max(1, Math.round(start + dx / unit)));
      if (n !== last) { last = n; setResizing({ id: cell.id, n }); }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResizing(null);
      if (last !== start) mutate((c) => { setSpan(c, cell.id, { [dk]: last } as any); return c; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const fieldOf = (name?: string) => (name ? cfg.fields.find((f) => f.field === name) : undefined);
  const titleOfField = (name?: string) => { const f = fieldOf(name); return f ? (IsLangEN ? f.titleEn || f.field : f.titleAr || f.field) : ""; };
  const isSel = (type: string, id: string) => sel?.type === type && sel.id === id;
  const unplaced = useMemo(() => unplacedFields(cfg), [cfg]);
  const isMD = cfg.screenType === "MasterDetail";
  const isTree = cfg.screenType === "Tree";

  // ================== Palette ==================
  const palItem = "flex items-center gap-2 px-2.5 h-9 rounded-lg border border-erp-border bg-erp-surface text-[13px] text-erp-text cursor-grab active:cursor-grabbing hover:border-erp-accent hover:bg-erp-surface-2 select-none";

  const palette = (
    <div className="w-60 shrink-0 border-e border-erp-border bg-erp-surface-2/40 overflow-y-auto p-3 space-y-4">
      <div>
        <div className={`${zoneTitle} mb-2`}>{t("Form controls", "عناصر الفورم")}</div>
        <div className="grid grid-cols-1 gap-1.5">
          {FORM_CONTROLS.map((c) => (
            <div key={c.kind} draggable={!c.soon} onDragStart={(e) => dnd.start(e, { t: "new", kind: c.kind })} onDragEnd={() => { dnd.end(); setHover(""); }}
              className={`${palItem} ${c.soon ? "opacity-50 !cursor-not-allowed" : ""}`} title={c.soon ? t("Coming soon", "قريبًا") : t("Drag to the form", "اسحبه على الفورم")}>
              <i className={`fa-solid ${c.icon} w-4 text-erp-accent`} />
              <span className="truncate">{IsLangEN ? c.en : c.ar}</span>
              {c.soon && <span className="ms-auto text-[10px] text-erp-text-subtle">{t("soon", "قريبًا")}</span>}
            </div>
          ))}
        </div>
      </div>

      {!isTree && (
        <div>
          <div className={`${zoneTitle} mb-2`}>{t("Filter controls", "عناصر الفلتر")}</div>
          <div className="grid grid-cols-1 gap-1.5">
            {FILTER_CONTROLS.map((c) => (
              <div key={c.kind} draggable onDragStart={(e) => dnd.start(e, { t: "fnew", kind: c.kind as FilterKind })} onDragEnd={() => { dnd.end(); setHover(""); }} className={palItem}>
                <i className={`fa-solid ${c.icon} w-4 text-erp-warning`} />
                <span className="truncate">{IsLangEN ? c.en : c.ar}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className={`${zoneTitle} mb-2`}>{t("Buttons", "الأزرار")}</div>
        <button
          onClick={() => {
            const id = uid("act");
            mutate((c) => {
              const a: ActionV5 = { id, labelAr: "زر جديد", labelEn: "New button", icon: "fa-bolt", scope: "toolbar", proc: "", params: [], confirm: true, after: "refresh", messageAr: "تم التنفيذ", messageEn: "Done" };
              c.actions.push(a); return c;
            });
            select({ type: "action", index: 0, id });
          }}
          className={`${palItem} w-full !cursor-pointer`}>
          <i className="fa-solid fa-bolt w-4 text-erp-accent" /> {t("Add button (runs a procedure)", "إضافة زر (يشغّل إجراء)")}
        </button>
      </div>

      <div>
        <div className={`${zoneTitle} mb-2`}>{t("Table columns", "أعمدة الجدول")} {cfg.table && <span className="normal-case text-erp-text-subtle">· {cfg.table}</span>}</div>
        {cfg.fields.length === 0 && <p className="text-[12px] text-erp-text-muted">{t("Choose the table in the screen settings (right) and load its columns.", "اختار الجدول من إعدادات الشاشة (يمين) وحمّل أعمدته.")}</p>}
        <div className="grid grid-cols-1 gap-1">
          {cfg.fields.map((f) => {
            const placed = !unplaced.includes(f.field) && !f.auto;
            return (
              <div key={f.field} draggable onDragStart={(e) => dnd.start(e, { t: "field", field: f.field })} onDragEnd={() => { dnd.end(); setHover(""); }}
                className={`flex items-center gap-1.5 px-2 h-8 rounded-md border text-[12px] cursor-grab select-none ${placed ? "border-erp-border bg-erp-surface-2 text-erp-text-subtle" : "border-erp-border bg-erp-surface text-erp-text"} ${f.noSave ? "!border-amber-400/70" : ""}`}
                title={f.noSave ? t("Computed / view-only column: shown but not saved", "عمود محسوب / من الفيو: بيظهر وما بيتحفظش") : t("Drag to the form, filter or list", "اسحبه للفورم أو الفلتر أو القايمة")}>
                <i className={`fa-solid fa-grip-vertical text-[10px] text-erp-text-subtle`} />
                <span className="truncate">{f.field}</span>
                {f.noSave && <i className="fa-solid fa-lock text-[10px] text-amber-500 ms-auto" />}
                {placed && <i className="fa-solid fa-check text-[10px] text-erp-success ms-auto" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ================== Canvas ==================
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function renderCell(cell: CellV5, sectionId: string, row: { id: string; cells: CellV5[] }, ci: number) {
    const selected = isSel("cell", cell.id);
    const f = fieldOf(cell.field);
    const spanN = resizing?.id === cell.id ? resizing.n : cell.span[dk];
    const label = cell.kind === "label" || cell.kind === "heading" ? (IsLangEN ? cell.textEn : cell.textAr) || cell.textAr || "" : titleOfField(cell.field) || t("(not bound)", "(مش مربوط بعمود)");
    const hk = `cell:${cell.id}`;
    const before = hover === hk + ":b", after = hover === hk + ":a";
    const over = (e: React.DragEvent) => {
      const p = dnd.get(); if (!p || !(p.t === "new" || p.t === "field" || p.t === "cell") || (p.t === "cell" && p.id === cell.id)) return;
      e.preventDefault(); e.stopPropagation();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const left = e.clientX < r.left + r.width / 2;
      const isBefore = isRtl ? !left : left;
      const k = hk + (isBefore ? ":b" : ":a");
      if (hover !== k) setHover(k);
    };
    const drop = (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      handleDrop({ sectionId, rowId: row.id, index: ci + (hover.endsWith(":a") ? 1 : 0) });
    };
    return (
      <div key={cell.id} style={{ flex: `0 0 calc(${(spanN / 12) * 100}% - 8px)`, minWidth: 60 }} className="relative group"
        onDragOver={over} onDragLeave={() => { if (hover.startsWith(hk)) setHover(""); }} onDrop={drop}>
        {before && <div className="absolute -start-1.5 top-0 bottom-0 w-1 rounded bg-erp-accent z-10" />}
        {after && <div className="absolute -end-1.5 top-0 bottom-0 w-1 rounded bg-erp-accent z-10" />}
        <div draggable onDragStart={(e) => { dnd.start(e, { t: "cell", id: cell.id }); }} onDragEnd={() => { dnd.end(); setHover(""); }}
          onClick={(e) => { e.stopPropagation(); select({ type: "cell", index: 0, id: cell.id }); }}
          className={`rounded-lg border p-2 cursor-pointer transition ${selected ? "border-erp-accent ring-2 ring-erp-accent/30 bg-erp-accent-soft" : "border-erp-border hover:border-erp-border-strong bg-erp-surface"}`}>
          {cell.kind === "divider" ? <hr className="border-erp-border-strong my-2" /> : cell.kind === "heading" ? (
            <div className="text-[15px] font-semibold text-erp-text border-b border-erp-border pb-1">{label}</div>
          ) : cell.kind === "label" ? (
            <div className="text-[13px] text-erp-text-muted">{label}</div>
          ) : (
            <>
              <div className="flex items-center gap-1 text-[12px] font-medium text-erp-text mb-1 min-w-0">
                <i className={`fa-solid ${KIND_LABEL[cell.kind]?.icon || "fa-font"} text-[10px] text-erp-accent`} />
                <span className="truncate">{label}</span>
                {f?.required && <span className="text-erp-danger">*</span>}
                {f?.noSave && <i className="fa-solid fa-lock text-[10px] text-amber-500" title={t("Not saved", "مش بيتحفظ")} />}
                {(f?.visibleWhen?.field || f?.enabledWhen?.field) && <i className="fa-solid fa-eye text-[10px] text-erp-text-subtle" title={t("Has conditions", "عليه شروط")} />}
              </div>
              <MockControl kind={cell.kind} readOnly={!!f?.readOnly || !!f?.noSave} t={t} />
            </>
          )}
        </div>
        {selected && (
          <div className="absolute -top-3 end-1 flex items-center gap-0.5 bg-erp-surface border border-erp-border rounded-md shadow-erp-2 px-1 z-20 text-[11px]" onClick={(e) => e.stopPropagation()}>
            <button className="px-1 hover:text-erp-accent" title={t("Narrower", "أضيق")} onClick={() => mutate((c) => { setSpan(c, cell.id, { [dk]: cell.span[dk] - 1 } as any); return c; })}>−</button>
            <span className="num px-0.5">{cell.span[dk]}/12</span>
            <button className="px-1 hover:text-erp-accent" title={t("Wider", "أعرض")} onClick={() => mutate((c) => { setSpan(c, cell.id, { [dk]: cell.span[dk] + 1 } as any); return c; })}>+</button>
            <button className="px-1 hover:text-erp-accent" title={t("Duplicate", "نسخ")} onClick={() => { let nid: string | null = null; mutate((c) => { nid = duplicateCell(c, cell.id); return c; }); if (nid) select({ type: "cell", index: 0, id: nid }); }}><i className="fa-regular fa-copy" /></button>
            <button className="px-1 hover:text-erp-danger" title={t("Delete", "حذف")} onClick={deleteSelected}><i className="fa-solid fa-trash" /></button>
          </div>
        )}
        <div onPointerDown={(e) => startResize(e, cell, rowRefs.current[row.id])} title={t("Drag to resize", "اسحب لتغيير العرض")}
          className="absolute top-1 bottom-1 -end-1.5 w-2 cursor-ew-resize rounded bg-transparent hover:bg-erp-accent/40 opacity-0 group-hover:opacity-100 z-10" />
      </div>
    );
  }

  const formZone = (
    <div className={`${cardCls} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={zoneTitle}><i className="fa-solid fa-pen-to-square me-1" />{isMD ? t("Master form", "فورم الماستر") : isTree ? t("Node form", "فورم العقدة") : t("Add / Edit form", "فورم الإضافة والتعديل")}</span>
        <span className="text-[11px] text-erp-text-subtle">{t("Drop controls or columns here", "أفلت العناصر أو الأعمدة هنا")}</span>
        <button className="ms-auto text-[12px] text-erp-accent hover:underline" onClick={() => { let id = ""; mutate((c) => { id = addSection(c); return c; }); select({ type: "section", index: 0, id }); }}>
          <i className="fa-solid fa-plus me-1" />{t("Section", "قسم")}
        </button>
      </div>
      {cfg.layout.sections.length === 0 && (
        <div {...dropHandlers("empty", () => ({ sectionId: "", index: 0 }))}
          className={`rounded-lg border-2 border-dashed p-8 text-center text-[13px] ${hover === "empty" ? "border-erp-accent bg-erp-accent-soft" : "border-erp-border-strong text-erp-text-muted"}`}>
          {t("Empty form — drag a control or a column here", "الفورم فاضي — اسحب عنصر أو عمود هنا")}
        </div>
      )}
      {cfg.layout.sections.map((sec) => (
        <div key={sec.id} className="mb-3">
          {(sec.titleAr || sec.titleEn || cfg.layout.sections.length > 1) && (
            <div onClick={() => select({ type: "section", index: 0, id: sec.id })}
              className={`flex items-center gap-2 mb-1.5 px-2 py-1 rounded-md cursor-pointer text-[13px] font-semibold ${isSel("section", sec.id) ? "bg-erp-accent-soft text-erp-accent" : "text-erp-text"}`}>
              <i className="fa-solid fa-layer-group text-[11px]" /> {(IsLangEN ? sec.titleEn : sec.titleAr) || t("Section", "قسم")}
            </div>
          )}
          {sec.rows.map((row, ri) => (
            <div key={row.id}>
              <div {...dropHandlers(`strip:${sec.id}:${ri}`, () => ({ sectionId: sec.id, index: ri }))}
                className={`h-2 -my-0.5 rounded transition ${hover === `strip:${sec.id}:${ri}` ? "bg-erp-accent/60 h-3" : ""}`} />
              <div ref={(el) => { rowRefs.current[row.id] = el; }} className="flex flex-wrap gap-2 items-stretch">
                {row.cells.map((cell, ci) => renderCell(cell, sec.id, row, ci))}
                <div {...dropHandlers(`rowend:${row.id}`, () => ({ sectionId: sec.id, rowId: row.id, index: row.cells.length }))}
                  className={`flex-1 min-w-[24px] rounded ${hover === `rowend:${row.id}` ? "bg-erp-accent/30" : ""}`} />
              </div>
            </div>
          ))}
          <div {...dropHandlers(`strip:${sec.id}:end`, () => ({ sectionId: sec.id, index: sec.rows.length }))}
            className={`mt-1 rounded-md border border-dashed text-center text-[11px] py-1.5 transition ${hover === `strip:${sec.id}:end` ? "border-erp-accent bg-erp-accent-soft text-erp-accent" : "border-erp-border text-erp-text-subtle"}`}>
            {t("＋ New row here", "＋ صف جديد هنا")}
          </div>
        </div>
      ))}
    </div>
  );

  const filterZone = !isTree && (
    <div className={`${cardCls} p-3`}
      onDragOver={(e) => { const p = dnd.get(); if (p && (p.t === "field" || p.t === "fnew" || p.t === "filter")) { e.preventDefault(); if (hover !== "fz") setHover("fz"); } }}
      onDragLeave={() => { if (hover === "fz") setHover(""); }}
      onDrop={(e) => onFilterDrop(e)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={zoneTitle}><i className="fa-solid fa-filter me-1" />{t("Filter area (always visible above the list)", "منطقة الفلتر (ظاهرة فوق القايمة)")}</span>
      </div>
      <div className={`flex flex-wrap gap-2 min-h-[48px] rounded-lg p-2 border-2 border-dashed ${hover === "fz" ? "border-erp-accent bg-erp-accent-soft" : "border-erp-border"}`}>
        {cfg.filterArea.length === 0 && <span className="text-[12px] text-erp-text-muted m-auto">{t("Drop a column or a filter control here", "أفلت عمود أو عنصر فلتر هنا")}</span>}
        {cfg.filterArea.map((fc) => (
          <div key={fc.id} draggable onDragStart={(e) => dnd.start(e, { t: "filter", id: fc.id })} onDragEnd={() => dnd.end()}
            onDragOver={(e) => { const p = dnd.get(); if (p && (p.t === "filter" || p.t === "field" || p.t === "fnew")) { e.preventDefault(); e.stopPropagation(); } }}
            onDrop={(e) => onFilterDrop(e, fc.id)}
            onClick={(e) => { e.stopPropagation(); select({ type: "filterCtl", index: 0, id: fc.id }); }}
            className={`flex items-center gap-2 px-2.5 h-9 rounded-lg border cursor-pointer text-[12px] ${isSel("filterCtl", fc.id) ? "border-erp-accent bg-erp-accent-soft" : "border-erp-border bg-erp-surface"}`}>
            <i className={`fa-solid ${KIND_LABEL[fc.kind]?.icon || "fa-filter"} text-erp-warning`} />
            <span className="font-medium">{(IsLangEN ? fc.labelEn : fc.labelAr) || fc.field || t("(no column)", "(بدون عمود)")}</span>
            <span className="text-erp-text-subtle">{fc.kind === "select" && fc.source?.table ? `← ${fc.source.table}` : fc.field}</span>
            {fc.required && <span className="text-erp-danger">*</span>}
            <button className="text-erp-text-subtle hover:text-erp-danger" onClick={(e) => { e.stopPropagation(); mutate((c) => { c.filterArea = c.filterArea.filter((x) => x.id !== fc.id); return c; }, null); }}><i className="fa-solid fa-xmark" /></button>
          </div>
        ))}
      </div>
      {isMD && <p className="mt-1 text-[11px] text-erp-text-subtle">{t("Master-detail: filters work on the list; cascading filters and filter→button parameters need a Grid screen.", "ماستر ديتيل: الفلاتر على القايمة؛ الفلتر المتسلسل وربط الفلتر بالأزرار في شاشات الجريد بس.")}</p>}
    </div>
  );

  const listCols = cfg.fields.filter((f) => f.inGrid);
  const listZone = !isTree && (
    <div className={`${cardCls} p-3`}
      onDragOver={(e) => { const p = dnd.get(); if (p && (p.t === "field" || p.t === "listcol")) { e.preventDefault(); if (hover !== "lz") setHover("lz"); } }}
      onDragLeave={() => { if (hover === "lz") setHover(""); }}
      onDrop={(e) => onListDrop(e)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={zoneTitle}><i className="fa-solid fa-table-columns me-1" />{isMD ? t("List columns (search screen)", "أعمدة القايمة") : t("Grid columns", "أعمدة الجدول")}</span>
        {isMD && <button className="ms-auto text-[12px] text-erp-accent hover:underline" onClick={() => onGoTab("list")}>{t("Edit list columns", "تعديل أعمدة القايمة")}</button>}
      </div>
      {!isMD && (
        <div className={`flex flex-wrap gap-1.5 rounded-lg p-2 border-2 border-dashed min-h-[40px] ${hover === "lz" ? "border-erp-accent bg-erp-accent-soft" : "border-erp-border"}`}>
          {listCols.length === 0 && <span className="text-[12px] text-erp-text-muted m-auto">{t("Drop columns here", "أفلت الأعمدة هنا")}</span>}
          {listCols.map((f) => (
            <div key={f.field} draggable onDragStart={(e) => dnd.start(e, { t: "listcol", field: f.field })} onDragEnd={() => dnd.end()}
              onDragOver={(e) => { const p = dnd.get(); if (p && (p.t === "field" || p.t === "listcol")) { e.preventDefault(); e.stopPropagation(); } }}
              onDrop={(e) => onListDrop(e, f.field)}
              className="flex items-center gap-1.5 px-2 h-7 rounded-md border border-erp-border bg-erp-surface text-[12px] cursor-grab">
              {IsLangEN ? f.titleEn || f.field : f.titleAr || f.field}
              <button className="text-erp-text-subtle hover:text-erp-danger" onClick={() => mutate((c) => { const x = c.fields.find((y) => y.field === f.field); if (x) x.inGrid = false; return c; })}><i className="fa-solid fa-xmark text-[10px]" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const detailsZone = (isMD || isTree) && (
    <div className={`${cardCls} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={zoneTitle}><i className="fa-solid fa-layer-group me-1" />{isTree ? t("Node details", "تفاصيل العقدة") : t("Detail grids (up to 5)", "جداول التفاصيل (لحد 5)")}</span>
        <button className="ms-auto text-[12px] text-erp-accent hover:underline" onClick={() => onGoTab("details")}>{t("Edit details", "تعديل التفاصيل")}</button>
      </div>
      {cfg.details.length === 0 && <p className="text-[12px] text-erp-text-muted">{t("No details yet.", "مفيش تفاصيل لسه.")}</p>}
      <div className="flex flex-wrap gap-2">
        {cfg.details.map((d, i) => (
          <div key={i} className="px-3 py-2 rounded-lg border border-erp-border bg-erp-surface text-[12px]">
            <div className="font-semibold text-erp-text">{(IsLangEN ? d.titleEn : d.titleAr) || d.table || `#${i + 1}`}</div>
            <div className="text-erp-text-subtle">{d.table || "—"} · {d.fields.filter((f) => f.inGrid).length} {t("columns", "عمود")}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const actionsZone = !isTree && (cfg.actions.length > 0 || cfg.print.listPrint.enabled || cfg.excel.enabled) && (
    <div className={`${cardCls} p-3`}>
      <div className={`${zoneTitle} mb-2`}><i className="fa-solid fa-bolt me-1" />{t("Buttons", "الأزرار")}</div>
      <div className="flex flex-wrap gap-2">
        {cfg.actions.map((a) => (
          <button key={a.id} onClick={() => select({ type: "action", index: 0, id: a.id })}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] ${isSel("action", a.id) ? "border-erp-accent bg-erp-accent-soft" : "border-erp-border-strong bg-erp-surface"}`}>
            <i className={`fa-solid ${a.icon || "fa-bolt"}`} /> {(IsLangEN ? a.labelEn : a.labelAr) || a.proc}
            {!a.proc && <i className="fa-solid fa-triangle-exclamation text-amber-500 text-[11px]" title={t("Choose a procedure", "اختار إجراء")} />}
            <span className="text-[10px] text-erp-text-subtle">{a.scope === "row" ? t("row", "صف") : t("toolbar", "شريط")}</span>
          </button>
        ))}
        {cfg.print.listPrint.enabled && <span className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-dashed border-erp-border text-[12px] text-erp-text-muted"><i className="fa-solid fa-print" />{t("Print list (Phase 7)", "طباعة القايمة (مرحلة 7)")}</span>}
        {cfg.excel.enabled && <span className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-dashed border-erp-border text-[12px] text-erp-text-muted"><i className="fa-solid fa-file-excel" />{t("Excel (Phase 6)", "إكسل (مرحلة 6)")}</span>}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 bg-erp-bg">
      {palette}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 h-11 border-b border-erp-border bg-erp-surface shrink-0">
          <span className="text-[13px] font-semibold text-erp-text truncate">{(IsLangEN ? cfg.titleEn : cfg.titleAr) || cfg.module || t("New screen", "شاشة جديدة")}</span>
          <span className="text-[11px] text-erp-text-subtle">{cfg.table}</span>
          <div className="ms-auto flex items-center gap-1">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
              <button key={d} onClick={() => setDevice(d)} title={d}
                className={`w-8 h-8 rounded-md text-[13px] ${device === d ? "bg-erp-accent text-white" : "text-erp-text-muted hover:bg-erp-surface-2"}`}>
                <i className={`fa-solid ${d === "desktop" ? "fa-desktop" : d === "tablet" ? "fa-tablet-screen-button" : "fa-mobile-screen"}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4" onClick={() => select(null)}>
          <div className="mx-auto space-y-3 transition-all" style={{ maxWidth: DEVICE_W[device] }} dir={IsLangEN ? "ltr" : "rtl"}>
            {filterZone}
            {formZone}
            {detailsZone}
            {listZone}
            {actionsZone}
          </div>
        </div>
      </div>
      <div className="w-80 shrink-0 border-s border-erp-border bg-erp-surface overflow-y-auto">
        <PropsPanel db={db} onLoadColumns={onLoadColumns} onGoTab={onGoTab} />
      </div>
    </div>
  );
}

function MockControl({ kind, readOnly, t }: { kind: string; readOnly: boolean; t: (en: string, ar: string) => string }) {
  const base = `w-full rounded-md border border-erp-border-strong px-2 text-[12px] text-erp-text-subtle flex items-center ${readOnly ? "bg-erp-surface-2" : "bg-erp-surface"}`;
  if (kind === "textarea") return <div className={`${base} h-14 items-start pt-1`}>…</div>;
  if (kind === "checkbox") return <div className="size-4 rounded border border-erp-border-strong bg-erp-surface" />;
  if (kind === "select" || kind === "selectSearch") return <div className={`${base} h-8 justify-between`}><span>{t("Select…", "اختر…")}</span><i className="fa-solid fa-chevron-down text-[10px]" /></div>;
  if (kind === "search") return <div className={`${base} h-8 justify-between`}><span>{t("Search…", "بحث…")}</span><i className="fa-solid fa-magnifying-glass text-[10px]" /></div>;
  if (kind === "date") return <div className={`${base} h-8 justify-between`}><span>yyyy-mm-dd</span><i className="fa-regular fa-calendar text-[10px]" /></div>;
  if (kind === "number" || kind === "decimal") return <div className={`${base} h-8 num`}>0</div>;
  return <div className={`${base} h-8`}>Abc</div>;
}

// تصدير مساعدات للاستخدام الخارجي
export { createEmptyProcConfig };
export type { ScreenConfigV5 };
