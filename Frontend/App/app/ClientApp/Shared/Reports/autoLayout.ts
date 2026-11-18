// =====================================================================================
//  autoLayout.ts  -  تصميم تلقائي (JSON) لو التقرير ملوش تصميم JSON
//   (تقرير جديد، أو تصميم Stimulsoft قديم .mrt مابقاش بيتقري)
//   رأس: لوجو + اسم الشركة/الفرع + عنوان التقرير + الباراميترات + تاريخ الطباعة
//   جدول بكل الأعمدة (الأرقام العشرية ليها إجمالي) — تذييل: رقم الصفحة.
// =====================================================================================

import type { PagePreset, ReportBand, ReportLayout, TableColumn } from "./ReportLayoutTypes";
import { isDateType, isNumericType } from "./renderer/format";

export interface AutoColumn { Name: string; Type?: string; Title?: string }

export interface AutoLayoutOptions {
  title: string;
  columns: AutoColumn[];
  isEN: boolean;
  paper?: PagePreset;
  orientation?: "portrait" | "landscape";
  paramsText?: string;
  /** اسم الجدول (الافتراضي Data) */
  table?: string;
}

const DECIMAL = /^(Decimal|Double|Single|Float|Money|decimal|numeric|money|float|real)/;
const ID_LIKE = /(ID|Id|Code|No|Year|Ser)$/;

export function buildAutoLayout(o: AutoLayoutOptions): ReportLayout {
  const cols = o.columns.length ? o.columns : [{ Name: "Value", Type: "String" }];
  const paper: PagePreset = o.paper ?? "A4";
  const thermal = paper === "Thermal80" || paper === "Thermal58";
  const orientation = o.orientation ?? (!thermal && cols.length > 8 ? "landscape" : "portrait");
  const fontSize = thermal ? 7.5 : cols.length > 12 ? 7 : cols.length > 8 ? 8 : 9;

  const columns: TableColumn[] = cols.map((c) => {
    const numeric = isNumericType(c.Type);
    const sum = numeric && DECIMAL.test(c.Type || "") && !ID_LIKE.test(c.Name);
    return {
      field: c.Name,
      title: c.Title ?? c.Name,
      format: numeric ? (DECIMAL.test(c.Type || "") ? "n2" : "n0") : isDateType(c.Type) ? "date" : undefined,
      align: numeric ? "end" : undefined,
      aggregate: sum ? "sum" : undefined,
    };
  });
  const hasTotals = columns.some((c) => c.aggregate);

  const nameExpr = o.isEN ? "{{Company.CompNameE}}" : "{{Company.CompNameA}}";
  const branchExpr = o.isEN ? "{{Company.BranchNameE}}  {{Company.BranchAddress}}" : "{{Company.BranchNameA}}  {{Company.BranchAddress}}";
  const header: ReportBand = {
    type: "reportHeader",
    elements: [
      {
        type: "row", gap: 3, items: [
          ...(thermal ? [] : [{ type: "image" as const, src: "Company.LogoBase64", width: 22, height: 16 }]),
          { type: "text", width: thermal ? "100%" : "78%", text: nameExpr, style: { size: thermal ? 10 : 13, bold: true, align: thermal ? "center" : "start" } },
        ],
      },
      { type: "text", text: branchExpr, style: { size: 8, color: "#475569", align: thermal ? "center" : "start" } },
      { type: "line", thickness: 0.3 },
      { type: "text", text: o.title, style: { size: thermal ? 10 : 13, bold: true, align: "center" } },
      ...(o.paramsText ? [{ type: "text" as const, text: o.paramsText, style: { size: 8, color: "#475569", align: "center" as const } }] : []),
      { type: "text", text: `${o.isEN ? "Printed" : "طُبع"}: {{Company.PrintedAt}}   ${o.isEN ? "By" : "بواسطة"}: {{Company.PrintedBy}}`, style: { size: 7.5, color: "#64748b" } },
      { type: "spacer", height: 2 },
    ],
  };

  const bands: ReportBand[] = [
    header,
    { type: "detail", table: o.table ?? "Data", layout: "table", columns, zebra: true, showTotals: hasTotals },
  ];
  const pageNo: ReportBand = {
    type: thermal ? "reportFooter" : "pageFooter",
    elements: [{ type: "pageNumber", style: { size: 7.5, color: "#64748b", align: "center" } }],
  } as ReportBand;
  if (!thermal) bands.push(pageNo);

  return {
    schema: "rf-report/1",
    nameAr: o.title, nameEn: o.title,
    kind: "list",
    page: { size: paper, orientation, dir: o.isEN ? "ltr" : "rtl" },
    styles: { base: { size: fontSize }, th: { size: fontSize, bold: true }, td: { size: fontSize } },
    bands,
  };
}
