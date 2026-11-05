// =====================================================================================
//  FormLayout.tsx  (Phase 5 - ScreenBuilder)  -  تخطيط حر لفورم الإضافة/التعديل
// -------------------------------------------------------------------------------------
//  اختياري بالكامل: لو الشاشة ماداتش formLayout الفورم بيشتغل زي ما كان بالظبط.
//  التخطيط = شبكة 12 عمود. كل خلية: حقل (field) أو عنوان (heading) أو خط فاصل (divider) أو نص (label).
//  span = عدد الأعمدة على الشاشة الكبيرة، spanMd = على التابلت، والموبايل دايمًا 12.
// =====================================================================================

import React from "react";

export interface FormLayoutCell {
  kind?: "field" | "heading" | "divider" | "label";
  field?: string;
  textAr?: string;
  textEn?: string;
  span?: number;      // 1..12 (lg)
  spanMd?: number;    // 1..12 (md)
  newRow?: boolean;   // يبدأ صف جديد
}

export type FormLayout = FormLayoutCell[];

// كلاسات حرفية عشان Tailwind يشوفها
const SPAN_LG: Record<number, string> = {
  1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4", 5: "lg:col-span-5", 6: "lg:col-span-6",
  7: "lg:col-span-7", 8: "lg:col-span-8", 9: "lg:col-span-9", 10: "lg:col-span-10", 11: "lg:col-span-11", 12: "lg:col-span-12",
};
const SPAN_MD: Record<number, string> = {
  1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4", 5: "md:col-span-5", 6: "md:col-span-6",
  7: "md:col-span-7", 8: "md:col-span-8", 9: "md:col-span-9", 10: "md:col-span-10", 11: "md:col-span-11", 12: "md:col-span-12",
};

const clamp = (n: number | undefined, d: number) => Math.min(12, Math.max(1, Math.round(n || d)));

export function formLayoutCellClass(cell: FormLayoutCell): string {
  const lg = clamp(cell.span, 4);
  const md = clamp(cell.spanMd ?? (lg > 6 ? 12 : 6), 6);
  return `col-span-12 ${SPAN_MD[md]} ${SPAN_LG[lg]}`;
}

export function formLayoutCellStyle(cell: FormLayoutCell): React.CSSProperties | undefined {
  return cell.newRow ? { gridColumnStart: 1 } : undefined;
}

/** كلاسات الشبكة نفسها */
export const FORM_LAYOUT_GRID_CLASS = "grid grid-cols-12 gap-4";

/**
 * بيرتّب الأعمدة حسب التخطيط. الأعمدة اللي مش مذكورة في التخطيط بتتحط في الآخر (عشان مفيش حقل يختفي).
 */
export function arrangeByLayout<C extends { field: string }>(
  cols: C[],
  layout: FormLayout,
): Array<{ cell: FormLayoutCell; col?: C }> {
  const byField = new Map(cols.map((c) => [c.field, c]));
  const used = new Set<string>();
  const out: Array<{ cell: FormLayoutCell; col?: C }> = [];
  for (const cell of layout) {
    if (!cell.kind || cell.kind === "field") {
      const col = cell.field ? byField.get(cell.field) : undefined;
      if (!col) continue;      // الحقل مش ظاهر في الوضع ده (مخفي/ممنوع)
      used.add(col.field);
      out.push({ cell, col });
    } else {
      out.push({ cell });
    }
  }
  const layoutFields = new Set(layout.filter((c) => !c.kind || c.kind === "field").map((c) => c.field));
  for (const c of cols) {
    if (!used.has(c.field) && !layoutFields.has(c.field)) out.push({ cell: { kind: "field", field: c.field, span: 4 }, col: c });
  }
  return out;
}

/** عنصر غير حقل (عنوان / فاصل / نص) */
export function FormLayoutStatic({ cell, isEN }: { cell: FormLayoutCell; isEN: boolean }) {
  const text = isEN ? cell.textEn || cell.textAr || "" : cell.textAr || cell.textEn || "";
  if (cell.kind === "divider") return <hr className="border-erp-border my-1" />;
  if (cell.kind === "heading") return <h4 className="text-[15px] font-semibold text-erp-text border-b border-erp-border pb-1">{text}</h4>;
  return <p className="text-[13px] text-erp-text-muted">{text}</p>;
}
