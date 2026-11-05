// ============================================================
// Layout operations (pure helpers on a ScreenConfigV5 that was already cloned by store.mutate)
// ============================================================

import {
  ScreenConfigV5, CellV5, RowV5, SectionV5, ControlKind, SpanV5, DEFAULT_SPAN, uid,
  inputKindOfField, layoutFieldNames,
} from "../types/ScreenConfig";

/** مكان الإفلات: داخل صف موجود (rowId) في الخانة index، أو صف جديد (rowId فاضي) في ترتيب index داخل القسم */
export interface DropTarget { sectionId: string; rowId?: string; index: number }

export interface FoundCell { section: SectionV5; row: RowV5; cell: CellV5; si: number; ri: number; ci: number }

export function findCell(cfg: ScreenConfigV5, id: string): FoundCell | null {
  for (let si = 0; si < cfg.layout.sections.length; si++) {
    const section = cfg.layout.sections[si];
    for (let ri = 0; ri < section.rows.length; ri++) {
      const row = section.rows[ri];
      for (let ci = 0; ci < row.cells.length; ci++) if (row.cells[ci].id === id) return { section, row, cell: row.cells[ci], si, ri, ci };
    }
  }
  return null;
}

export function defaultSpanFor(kind: ControlKind): SpanV5 {
  if (kind === "textarea" || kind === "heading" || kind === "divider") return { base: 12, md: 12, lg: 12 };
  if (kind === "checkbox") return { base: 12, md: 6, lg: 3 };
  if (kind === "button") return { base: 12, md: 6, lg: 2 };
  return { ...DEFAULT_SPAN };
}

export function newCell(kind: ControlKind, field?: string): CellV5 {
  const c: CellV5 = { id: uid("cell"), kind, span: defaultSpanFor(kind) };
  if (field) c.field = field;
  if (kind === "heading") { c.textAr = "عنوان"; c.textEn = "Heading"; }
  if (kind === "label") { c.textAr = "نص"; c.textEn = "Text"; }
  return c;
}

export function ensureSection(cfg: ScreenConfigV5): SectionV5 {
  if (cfg.layout.sections.length === 0) cfg.layout.sections.push({ id: uid("sec"), titleAr: "", titleEn: "", rows: [] });
  return cfg.layout.sections[0];
}

function pruneEmptyRows(cfg: ScreenConfigV5) {
  for (const s of cfg.layout.sections) s.rows = s.rows.filter((r) => r.cells.length > 0);
}

/** يضيف خلية في المكان المحدد ويرجع id بتاعها */
export function insertCell(cfg: ScreenConfigV5, target: DropTarget, cell: CellV5): string {
  let section = cfg.layout.sections.find((s) => s.id === target.sectionId) || ensureSection(cfg);
  if (target.rowId) {
    const row = section.rows.find((r) => r.id === target.rowId);
    if (row) {
      const i = Math.max(0, Math.min(target.index, row.cells.length));
      row.cells.splice(i, 0, cell);
      return cell.id;
    }
  }
  const ri = Math.max(0, Math.min(target.index, section.rows.length));
  section.rows.splice(ri, 0, { id: uid("row"), cells: [cell] });
  return cell.id;
}

/** يربط الحقل بالفورم (inForm) */
function markInForm(cfg: ScreenConfigV5, field: string | undefined, on: boolean) {
  if (!field) return;
  const f = cfg.fields.find((x) => x.field === field);
  if (!f) return;
  if (on) f.inForm = true;
  else if (!layoutFieldNames(cfg.layout).includes(field)) f.inForm = false;
}

/** حقل من الجدول اتسحب على الفورم */
export function placeField(cfg: ScreenConfigV5, fieldName: string, target: DropTarget): string | null {
  const f = cfg.fields.find((x) => x.field === fieldName);
  if (!f) return null;
  if (layoutFieldNames(cfg.layout).includes(fieldName)) return null;   // موجود بالفعل
  const id = insertCell(cfg, target, newCell(inputKindOfField(f), fieldName));
  markInForm(cfg, fieldName, true);
  return id;
}

export function addControl(cfg: ScreenConfigV5, kind: ControlKind, target: DropTarget): string {
  return insertCell(cfg, target, newCell(kind));
}

export function moveCell(cfg: ScreenConfigV5, cellId: string, target: DropTarget): void {
  const found = findCell(cfg, cellId);
  if (!found) return;
  const orig = found.cell;
  insertCell(cfg, target, { ...orig, span: { ...orig.span } });
  // شيل الأصلي (بالمرجع مش بالـ id)
  for (const s of cfg.layout.sections) for (const r of s.rows) {
    const i = r.cells.indexOf(orig);
    if (i >= 0) r.cells.splice(i, 1);
  }
  pruneEmptyRows(cfg);
}

export function removeCell(cfg: ScreenConfigV5, cellId: string): void {
  const found = findCell(cfg, cellId);
  if (!found) return;
  found.row.cells.splice(found.ci, 1);
  pruneEmptyRows(cfg);
  markInForm(cfg, found.cell.field, false);
}

/** نسخ: الكنترول المربوط بعمود بيتنسخ كنترول فاضي من نفس النوع (العمود مينفعش يظهر مرتين) */
export function duplicateCell(cfg: ScreenConfigV5, cellId: string): string | null {
  const found = findCell(cfg, cellId);
  if (!found) return null;
  const copy: CellV5 = { ...found.cell, id: uid("cell"), span: { ...found.cell.span } };
  delete copy.field;
  found.row.cells.splice(found.ci + 1, 0, copy);
  return copy.id;
}

export function setSpan(cfg: ScreenConfigV5, cellId: string, patch: Partial<SpanV5>): void {
  const found = findCell(cfg, cellId);
  if (!found) return;
  const next = { ...found.cell.span, ...patch };
  const clamp = (n: number) => Math.min(12, Math.max(1, Math.round(n)));
  next.base = clamp(next.base); next.md = clamp(next.md); next.lg = clamp(next.lg);
  if (patch.lg !== undefined && patch.md === undefined) next.md = next.lg >= 7 ? 12 : 6;
  found.cell.span = next;
}

export function addSection(cfg: ScreenConfigV5): string {
  const s: SectionV5 = { id: uid("sec"), titleAr: "قسم جديد", titleEn: "New section", rows: [] };
  cfg.layout.sections.push(s);
  return s.id;
}

export function removeSection(cfg: ScreenConfigV5, sectionId: string): void {
  const s = cfg.layout.sections.find((x) => x.id === sectionId);
  if (!s) return;
  const fields = s.rows.flatMap((r) => r.cells.map((c) => c.field).filter(Boolean)) as string[];
  cfg.layout.sections = cfg.layout.sections.filter((x) => x.id !== sectionId);
  fields.forEach((f) => markInForm(cfg, f, false));
}

/** الحقول اللي مش موجودة على الفورم (متاحة للسحب) */
export function unplacedFields(cfg: ScreenConfigV5): string[] {
  const placed = new Set(layoutFieldNames(cfg.layout));
  return cfg.fields.filter((f) => !placed.has(f.field) && !f.auto).map((f) => f.field);
}

/** يزامن fields.order مع ترتيب الخلايا (عشان الأعمدة تتولد بنفس الترتيب) */
export function syncOrderFromLayout(cfg: ScreenConfigV5): void {
  let n = 1;
  for (const s of cfg.layout.sections) for (const r of s.rows) for (const c of r.cells) {
    const f = c.field ? cfg.fields.find((x) => x.field === c.field) : undefined;
    if (f) f.order = n++;
  }
}
