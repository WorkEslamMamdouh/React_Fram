// =====================================================================================
//  excel.ts  -  تصدير جدول التقرير (باند الـ detail) لملف Excel
//  بيستخدم exceljs (موجودة في الفريم ورك) و downloadBytes من Shared/Components/Excel
// =====================================================================================

import type { ReportData, ReportLayout } from "../ReportLayoutTypes";
import { downloadBytes } from "../../Components/Excel/ExcelDownload";
import { evaluate } from "./expr";
import { colTitle } from "./elements";
import { detailBandOf, detailColumns, detailRowsOf, normalizeData } from "./ReportDocument";
import { toDate } from "./format";

export async function exportReportExcel(layout: ReportLayout, data: ReportData, lang: "ar" | "en", fileName: string): Promise<void> {
  const mod: any = await import("exceljs");
  const ExcelJS = mod.default ?? mod;
  const nd = normalizeData(layout, data);
  const rows = detailRowsOf(layout, nd);
  const band = detailBandOf(layout);
  const cols = detailColumns(band?.layout === "labels" ? undefined : band, rows);
  const base = { header: nd.header, company: nd.company, params: nd.params, tables: nd.tables, lang };

  const wb = new ExcelJS.Workbook();
  const title = (lang === "en" ? layout.nameEn : layout.nameAr) || layout.nameAr || layout.nameEn || "Report";
  const ws = wb.addWorksheet(title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Report", { views: [{ rightToLeft: lang === "ar" }] });
  ws.addRow(cols.map((c) => colTitle(c, lang)));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2F7" } };
  rows.forEach((r, i) => {
    const s = { ...base, row: r, aggRows: rows, rowNumber: i + 1 };
    ws.addRow(cols.map((c) => {
      const v = c.expr ? evaluate(c.expr, s) : c.field ? evaluate(c.field.includes(" ") ? `[${c.field}]` : c.field, s) : "";
      if (typeof v === "number" || typeof v === "boolean" || v == null) return v ?? null;
      if (c.format === "date" || c.format === "dateTime") return toDate(v) ?? v;
      return v;
    }));
  });
  if (cols.some((c) => c.aggregate) && rows.length) {
    const tr = ws.addRow(cols.map((c) => {
      if (!c.aggregate) return null;
      const target = c.expr ?? c.field ?? "";
      return evaluate(c.aggregate === "count" ? "count()" : `${c.aggregate}(${target})`, { ...base, aggRows: rows });
    }));
    tr.font = { bold: true };
  }
  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.min(45, Math.max(10, colTitle(c, lang).length + 4));
    if (c.format && /^(n2|c)$/.test(c.format)) col.numFmt = "#,##0.00";
    else if (c.format === "n0") col.numFmt = "#,##0";
    else if (c.format === "date") col.numFmt = "yyyy-mm-dd";
  });
  const buf = await wb.xlsx.writeBuffer();
  downloadBytes(buf, (fileName || title).replace(/[\\/:*?"<>|]+/g, "_") + ".xlsx");
}
