"use client";

// =====================================================================================
//  stimulsoft.ts  -  تحميل Stimulsoft Reports.JS (كبير جدًا) عند الحاجة فقط + خط عربي + الترخيص
//  - dynamic import() بس لما تقرير يتفتح أو يتصمم (مفيش SSR: بنفحص window).
//  - الترخيص: NEXT_PUBLIC_STIMULSOFT_KEY أو appsettings "Stimulsoft:LicenseKey" (api/Reports/config).
//    من غير مفتاح الأداة بتشتغل Trial (علامة مائية).
//  - الخط: Cairo (OFL) من /fonts/Cairo/Cairo.ttf عشان الـ PDF/Excel يطلعوا عربي صح.
//  الأنواع any عن قصد (الـ d.ts بتاع المكتبة 3MB).
// =====================================================================================

import { ReportsApi } from "./ReportApi";
import {
  Margins, OrientationKey, PAPER_PRESETS, PaperSizeKey,
} from "./ReportTypes";

export const REPORT_FONT = "Cairo";
const FONT_URL = "/fonts/Cairo/Cairo.ttf";

let loading: Promise<any> | null = null;
let designerLoaded = false;

async function applyLicenseAndFont(S: any) {
  let key = process.env.NEXT_PUBLIC_STIMULSOFT_KEY || "";
  if (!key) {
    try { key = (await ReportsApi.config()).LicenseKey || ""; } catch { /* trial */ }
  }
  if (key) {
    try { S.Base.StiLicense.key = key; } catch (e) { console.warn("Stimulsoft license key rejected", e); }
  }
  await new Promise<void>((resolve) => {
    try {
      S.Base.StiFontCollection.addOpentypeFontFileAsync(() => resolve(), FONT_URL, REPORT_FONT);
    } catch (e) {
      console.warn("Stimulsoft font not loaded", e);
      resolve();
    }
  });
}

/** يرجّع كائن Stimulsoft (الـ Viewer فقط أو معاه الـ Designer). */
export async function loadStimulsoft(withDesigner = false): Promise<any> {
  if (typeof window === "undefined") throw new Error("Stimulsoft runs in the browser only");
  if (!loading) {
    loading = (async () => {
      const mod: any = await import("stimulsoft-reports-js/Scripts/stimulsoft.viewer");
      const S = mod.Stimulsoft ?? mod.default?.Stimulsoft ?? (window as any).Stimulsoft;
      if (!S) throw new Error("Stimulsoft failed to load");
      await applyLicenseAndFont(S);
      try { S.System.Data.DataSet.tryParseDateTime = true; } catch { /* ignore */ }
      return S;
    })().catch((e) => { loading = null; throw e; });
  }
  const S = await loading;
  if (withDesigner && !designerLoaded) {
    const mod: any = await import("stimulsoft-reports-js/Scripts/stimulsoft.designer");
    const D = mod.Stimulsoft ?? mod.default?.Stimulsoft ?? S;
    designerLoaded = true;
    return D;
  }
  return S;
}

// ----------------------------------------------------------------------------- paper
export function paperDims(paper: PaperSizeKey, orientation: OrientationKey, m: Margins): { w: number; h: number } {
  let w: number, h: number;
  if (paper === "Custom") { w = m.customWidth || 21; h = m.customHeight || 29.7; }
  else { w = PAPER_PRESETS[paper].w; h = PAPER_PRESETS[paper].h; }
  if (w > h) { const x = w; w = h; h = x; }          // portrait base
  return orientation === "landscape" ? { w: h, h: w } : { w, h };
}

/** يطبّق المقاس والاتجاه والهوامش على كل صفحات التقرير (بالسنتيمتر). */
export function applyPaper(S: any, report: any, paper: PaperSizeKey, orientation: OrientationKey, m: Margins) {
  const { w, h } = paperDims(paper, orientation, m);
  const count = report.pages.count;
  for (let i = 0; i < count; i++) {
    const page = report.pages.getByIndex(i);
    try { report.reportUnit = S.Report.StiReportUnitType?.Centimeters ?? report.reportUnit; } catch { /* ignore */ }
    try {
      page.orientation = orientation === "landscape" ? S.Report.Components.StiPageOrientation.Landscape : S.Report.Components.StiPageOrientation.Portrait;
    } catch { /* ignore */ }
    page.pageWidth = w;
    page.pageHeight = h;
    // الإيصالات: ارتفاع مفتوح (الصفحة بتطول على قد المحتوى)
    try { page.unlimitedHeight = paper === "Thermal80" || paper === "Thermal58"; } catch { /* ignore */ }
    try {
      page.margins.left = m.left; page.margins.right = m.right; page.margins.top = m.top; page.margins.bottom = m.bottom;
    } catch { /* ignore */ }
  }
}

// ----------------------------------------------------------------------------- data
/** بيسجّل Data / Company / Params كـ DataSet واحد اسمه ReportData. */
export function registerData(S: any, report: any, tables: { name: string; rows: Record<string, any>[]; columns: string[] }[]) {
  const ds = new S.System.Data.DataSet("ReportData");
  const obj: Record<string, any[]> = {};
  const emptyNames: string[] = [];
  for (const t of tables) {
    if (t.rows.length === 0) {
      const row: Record<string, any> = {};
      t.columns.forEach((c) => (row[c] = null));
      obj[t.name] = [row];
      emptyNames.push(t.name);
    } else obj[t.name] = t.rows;
  }
  ds.readJson(obj);
  for (const n of emptyNames) {
    try { ds.tables.getByName(n).rows.clear(); } catch { /* keep the placeholder row */ }
  }
  report.regData("ReportData", "ReportData", ds);
  try { report.dictionary.synchronize(); } catch { /* ignore */ }
  return ds;
}

/** اسم مصدر البيانات الفعلي في القاموس (بيختلف حسب الإصدار: Data أو ReportData.Data). */
export function findDataSourceName(report: any, table: string): string {
  try {
    const list = report.dictionary.dataSources;
    for (let i = 0; i < list.count; i++) {
      const ds = list.getByIndex(i);
      if (ds.name === table || ds.nameInSource === table || String(ds.nameInSource || "").endsWith("." + table)) return ds.name;
    }
  } catch { /* ignore */ }
  return table;
}

// ----------------------------------------------------------------------------- export helpers
export function downloadBytes(data: any, fileName: string, mime: string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data as number[]);
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportReport(S: any, report: any, format: "pdf" | "excel"): Promise<any> {
  return new Promise((resolve, reject) => {
    const fmt = format === "pdf" ? S.Report.StiExportFormat.Pdf : S.Report.StiExportFormat.Excel2007;
    try {
      report.exportDocumentAsync((data: any, err: any) => (err ? reject(err) : resolve(data)), fmt);
    } catch (e) { reject(e); }
  });
}

export function renderReport(report: any): Promise<void> {
  return new Promise((resolve, reject) => {
    try { report.renderAsync((_r: any, err?: any) => (err ? reject(err) : resolve())); }
    catch (e) { reject(e); }
  });
}
