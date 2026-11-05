"use client";

// =====================================================================================
//  defaultLayout.ts  -  تصميم تلقائي لو مفيش تصميم محفوظ للتقرير (عشان الطباعة تشتغل فورًا)
//  رأس: لوجو + اسم الشركة/الفرع + عنوان التقرير + تاريخ الطباعة + الباراميترات
//  جدول بكل أعمدة الإجراء — تذييل: رقم الصفحة. دعم RTL عربي.
//  بيتبني بكود (Stimulsoft classic API). أي خطوة شكلية فشلت (try/catch) ماتوقفش التقرير.
// =====================================================================================

import { REPORT_FONT, applyPaper, findDataSourceName } from "./stimulsoft";
import { Margins, OrientationKey, PaperSizeKey, RunColumn } from "./ReportTypes";

export interface DefaultLayoutOptions {
  title: string;
  columns: RunColumn[];
  isEN: boolean;
  paper: PaperSizeKey;
  orientation: OrientationKey;
  margins: Margins;
  paramsText?: string;
  /** يسجّل الداتا (registerData) على التقرير الجديد */
  register: (report: any) => void;
}

const NUMERIC = /^(Int|UInt|Byte|SByte|Decimal|Double|Single|Float|Money)/i;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

const safe = (f: () => void) => { try { f(); } catch { /* cosmetic only */ } };
const field = (ds: string, col: string) => (IDENT.test(col) ? `{${ds}.${col}}` : `{${ds}.[${col}]}`);

export function buildDefaultReport(S: any, o: DefaultLayoutOptions): any {
  const C = S.Report.Components;
  const D = S.System.Drawing;
  const BD = S.Base.Drawing;
  const rtl = !o.isEN;

  const report = new S.Report.StiReport();
  o.register(report);                       // الداتا لازم تتسجل قبل البناء عشان نعرف أسماء المصادر
  const page = report.pages.getByIndex(0);
  applyPaper(S, report, o.paper, o.orientation, o.margins);

  const usable = Math.max(2, page.pageWidth - o.margins.left - o.margins.right);
  const narrow = usable < 8;
  const cols = o.columns.length ? o.columns : [{ Name: "Value", Type: "String" }];
  const fontSize = narrow ? 8 : cols.length > 10 ? 7 : cols.length > 7 ? 8 : 9;
  const dsName = findDataSourceName(report, "Data");
  const coName = findDataSourceName(report, "Company");

  const start = rtl ? BD.StiTextHorAlignment.Right : BD.StiTextHorAlignment.Left;
  const end = rtl ? BD.StiTextHorAlignment.Left : BD.StiTextHorAlignment.Right;
  let seq = 0;

  const text = (parent: any, x: number, y: number, w: number, h: number, value: string, opts: { size?: number; bold?: boolean; align?: any; fill?: string; border?: boolean } = {}) => {
    const t = new C.StiText(new D.Rectangle(x, y, w, h));
    t.name = "T" + ++seq;
    t.text = value;
    safe(() => (t.horAlignment = opts.align ?? start));
    safe(() => (t.vertAlignment = BD.StiVertAlignment.Center));
    safe(() => (t.font = new D.Font(REPORT_FONT, opts.size ?? fontSize, opts.bold ? D.FontStyle.Bold : D.FontStyle.Regular)));
    safe(() => (t.textOptions = new BD.StiTextOptions(rtl, false, true)));
    safe(() => { t.canGrow = true; t.wordWrap = true; });
    if (opts.border) safe(() => (t.border.side = BD.StiBorderSides.All));
    if (opts.fill) safe(() => (t.brush = new BD.StiSolidBrush(D.Color.fromArgb ? D.Color.fromArgb(255, ...hex(opts.fill!)) : D.Color.lightGray)));
    parent.components.add(t);
    return t;
  };

  // ---------------- عنوان التقرير (رأس أول صفحة)
  const title = new C.StiReportTitleBand();
  title.name = "ReportTitle";
  title.height = narrow ? 2.4 : 2.7;
  page.components.add(title);

  const logoW = narrow ? 0 : 1.7;
  if (logoW) {
    const img = new C.StiImage(new D.Rectangle(rtl ? usable - logoW : 0, 0.05, logoW, 1.5));
    img.name = "Logo";
    safe(() => (img.dataColumn = `${coName}.LogoBase64`));
    safe(() => (img.stretch = true));
    safe(() => (img.aspectRatio = true));
    title.components.add(img);
  }
  const textX = rtl ? 0 : logoW;
  const textW = usable - logoW;
  text(title, textX, 0, textW, 0.7, `{${coName}.${o.isEN ? "CompNameE" : "CompNameA"}}`, { size: 13, bold: true });
  text(title, textX, 0.7, textW, 0.5, `{${coName}.${o.isEN ? "BranchNameE" : "BranchNameA"}}   {${coName}.BranchAddress}`, { size: 8 });
  text(title, 0, 1.45, usable, 0.7, o.title, { size: narrow ? 11 : 13, bold: true, align: BD.StiTextHorAlignment.Center });
  text(title, 0, 2.1, usable, 0.5, `${o.paramsText ? o.paramsText + "   " : ""}${o.isEN ? "Printed" : "طُبع"}: {${coName}.PrintedAt}`, { size: 8 });

  // ---------------- رؤوس الأعمدة
  const header = new C.StiHeaderBand();
  header.name = "ColumnsHeader";
  header.height = 0.7;
  safe(() => (header.printOnAllPages = true));
  page.components.add(header);

  // ---------------- الصفوف
  const data = new C.StiDataBand();
  data.name = "DataRows";
  data.dataSourceName = dsName;
  data.height = 0.6;
  page.components.add(data);

  const cw = usable / cols.length;
  cols.forEach((col, i) => {
    const x = rtl ? usable - cw * (i + 1) : cw * i;
    const numeric = NUMERIC.test(col.Type || "");
    text(header, x, 0, cw, 0.7, col.Name, { bold: true, align: numeric ? end : start, border: true, fill: "#e5e7eb" });
    text(data, x, 0, cw, 0.6, field(dsName, col.Name), { align: numeric ? end : start, border: true });
  });

  // ---------------- تذييل الصفحة
  const footer = new C.StiPageFooterBand();
  footer.name = "PageFooter";
  footer.height = 0.6;
  page.components.add(footer);
  text(footer, 0, 0, usable / 2, 0.6, `${o.isEN ? "By" : "بواسطة"}: {${coName}.PrintedBy}`, { size: 8 });
  text(footer, usable / 2, 0, usable / 2, 0.6, o.isEN ? "Page {PageNumber} of {TotalPageCount}" : "صفحة {PageNumber} من {TotalPageCount}", { size: 8, align: end });

  return report;
}

function hex(h: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h) || [];
  return [parseInt(m[1] || "ee", 16), parseInt(m[2] || "ee", 16), parseInt(m[3] || "ee", 16)];
}
