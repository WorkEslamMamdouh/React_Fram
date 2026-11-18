// =====================================================================================
//  page.ts  -  مقاسات الورق الجاهزة + حساب مقاس الصفحة والهوامش (بالمللي)
// =====================================================================================

import type { LabelSettings, Margins, PagePreset, PageSettings } from "../ReportLayoutTypes";

export interface PresetInfo {
  w: number;
  /** null = طول مفتوح (إيصال حراري) */
  h: number | null;
  margins: Margins;
  labelAr: string;
  labelEn: string;
  /** ملصقات جاهزة للمقاس ده */
  labels?: LabelSettings;
}

const m = (top: number, right: number, bottom: number, left: number): Margins => ({ top, right, bottom, left });

export const PAGE_PRESETS: Record<Exclude<PagePreset, "Custom">, PresetInfo> = {
  A4: { w: 210, h: 297, margins: m(10, 10, 10, 10), labelAr: "A4", labelEn: "A4" },
  A5: { w: 148, h: 210, margins: m(8, 8, 8, 8), labelAr: "A5", labelEn: "A5" },
  Letter: { w: 215.9, h: 279.4, margins: m(10, 10, 10, 10), labelAr: "Letter", labelEn: "Letter" },
  Thermal80: { w: 80, h: null, margins: m(3, 4, 3, 4), labelAr: "إيصال 80 مم", labelEn: "Receipt 80mm" },
  Thermal58: { w: 58, h: null, margins: m(2, 3, 2, 3), labelAr: "إيصال 58 مم", labelEn: "Receipt 58mm" },
  LabelA4_3x8: { w: 210, h: 297, margins: m(0, 0, 0, 0), labelAr: "ملصقات A4 (3×8) 70×37", labelEn: "A4 labels 3×8 (70×37)", labels: { columns: 3, rows: 8, width: 70, height: 37, gapX: 0, gapY: 0 } },
  LabelA4_3x7: { w: 210, h: 297, margins: m(15.15, 0, 15.15, 0), labelAr: "ملصقات A4 (3×7) 70×38.1", labelEn: "A4 labels 3×7 (70×38.1)", labels: { columns: 3, rows: 7, width: 70, height: 38.1, gapX: 0, gapY: 0 } },
  LabelA4_2x7: { w: 210, h: 297, margins: m(15.15, 4.65, 15.15, 4.65), labelAr: "ملصقات A4 (2×7) 99.1×38.1", labelEn: "A4 labels 2×7 (99.1×38.1)", labels: { columns: 2, rows: 7, width: 99.1, height: 38.1, gapX: 2.5, gapY: 0 } },
  Label50x25: { w: 50, h: 25, margins: m(0, 0, 0, 0), labelAr: "ملصق رول 50×25", labelEn: "Roll label 50×25", labels: { columns: 1, rows: 1, width: 50, height: 25 } },
  Label40x30: { w: 40, h: 30, margins: m(0, 0, 0, 0), labelAr: "ملصق رول 40×30", labelEn: "Roll label 40×30", labels: { columns: 1, rows: 1, width: 40, height: 30 } },
  Label100x50: { w: 100, h: 50, margins: m(0, 0, 0, 0), labelAr: "ملصق شحن 100×50", labelEn: "Shipping label 100×50", labels: { columns: 1, rows: 1, width: 100, height: 50 } },
};

export interface ResolvedPage {
  width: number;
  /** null = طول مفتوح */
  height: number | null;
  margins: Margins;
  preset: PagePreset;
  labels?: LabelSettings;
}

export function resolvePage(p: PageSettings | undefined): ResolvedPage {
  const preset: PagePreset = p?.size && (p.size === "Custom" || p.size in PAGE_PRESETS) ? p.size : "A4";
  const info = preset === "Custom" ? null : PAGE_PRESETS[preset];
  let w = p?.width ?? info?.w ?? 210;
  let h: number | null = p?.height !== undefined ? p.height : (info ? info.h : 297);
  if (p?.orientation === "landscape" && h !== null && w < h) { const t = w; w = h; h = t; }
  const margins: Margins = { ...(info?.margins ?? m(10, 10, 10, 10)), ...(p?.margins || {}) } as Margins;
  return { width: w, height: h, margins, preset, labels: info?.labels };
}

/** px لكل مللي في CSS (96dpi) */
export const PX_PER_MM = 96 / 25.4;
