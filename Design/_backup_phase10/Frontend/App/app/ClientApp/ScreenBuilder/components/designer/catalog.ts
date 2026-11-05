// كتالوج الكنترولز (البالِت) — Phase 5
import { ControlKind, FilterKind } from "../../types/ScreenConfig";

export interface CatalogItem { kind: ControlKind; icon: string; ar: string; en: string; soon?: boolean }

export const FORM_CONTROLS: CatalogItem[] = [
  { kind: "text", icon: "fa-font", ar: "نص", en: "Text" },
  { kind: "number", icon: "fa-hashtag", ar: "رقم", en: "Number" },
  { kind: "decimal", icon: "fa-percent", ar: "رقم عشري", en: "Decimal" },
  { kind: "date", icon: "fa-calendar-day", ar: "تاريخ", en: "Date" },
  { kind: "select", icon: "fa-list", ar: "قائمة ثابتة", en: "Fixed list" },
  { kind: "selectSearch", icon: "fa-table-list", ar: "دروب داون من جدول", en: "Dropdown (table)" },
  { kind: "search", icon: "fa-magnifying-glass", ar: "نافذة بحث", en: "Search popup" },
  { kind: "checkbox", icon: "fa-square-check", ar: "اختيار", en: "Checkbox" },
  { kind: "textarea", icon: "fa-align-left", ar: "نص طويل", en: "Text area" },
  { kind: "file", icon: "fa-paperclip", ar: "ملف", en: "File", soon: true },
  { kind: "image", icon: "fa-image", ar: "صورة", en: "Image", soon: true },
  { kind: "label", icon: "fa-tag", ar: "نص ثابت", en: "Label" },
  { kind: "heading", icon: "fa-heading", ar: "عنوان", en: "Heading" },
  { kind: "divider", icon: "fa-minus", ar: "فاصل", en: "Divider" },
];

export const FILTER_CONTROLS: { kind: FilterKind; icon: string; ar: string; en: string }[] = [
  { kind: "text", icon: "fa-font", ar: "نص", en: "Text" },
  { kind: "number", icon: "fa-hashtag", ar: "رقم", en: "Number" },
  { kind: "date", icon: "fa-calendar-day", ar: "تاريخ", en: "Date" },
  { kind: "dateRange", icon: "fa-calendar-week", ar: "من تاريخ - إلى تاريخ", en: "Date range" },
  { kind: "select", icon: "fa-list", ar: "دروب داون", en: "Dropdown" },
  { kind: "multiselect", icon: "fa-list-check", ar: "اختيار متعدد", en: "Multi select" },
  { kind: "boolean", icon: "fa-toggle-on", ar: "نعم / لا", en: "Yes / No" },
  { kind: "search", icon: "fa-magnifying-glass", ar: "بحث", en: "Search" },
];

export const KIND_LABEL: Record<string, { ar: string; en: string; icon: string }> = Object.fromEntries(
  [...FORM_CONTROLS, ...FILTER_CONTROLS].map((c) => [c.kind, { ar: c.ar, en: c.en, icon: c.icon }])
);

/** بيحوّل نوع الكنترول لـ inputType المخزن في الحقل */
export function kindToInputType(k: ControlKind): string {
  switch (k) {
    case "number": case "decimal": return "number";
    case "date": return "date";
    case "select": return "select";
    case "selectSearch": return "selectSearch";
    case "search": return "search";
    case "checkbox": return "checkbox";
    case "textarea": return "textarea";
    default: return "text";
  }
}

// ===== سحب وإفلات (payload مشترك) =====
export type DragPayload =
  | { t: "new"; kind: ControlKind }
  | { t: "field"; field: string }
  | { t: "cell"; id: string }
  | { t: "fnew"; kind: FilterKind }
  | { t: "ffield"; field: string }
  | { t: "filter"; id: string }
  | { t: "listcol"; field: string };

let current: DragPayload | null = null;
export const dnd = {
  start(e: React.DragEvent, p: DragPayload) {
    current = p;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", "sb"); } catch { /* ignore */ }
  },
  get() { return current; },
  end() { current = null; },
};
