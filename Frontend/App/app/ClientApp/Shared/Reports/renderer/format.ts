// =====================================================================================
//  format.ts  -  تنسيق القيم في التقرير: n0 n1 n2 n3 c percent date dateTime time bool text
//  الأرقام دايمًا بأرقام لاتيني (0-9) عشان الطباعة والفواتير الضريبية.
// =====================================================================================

import type { FormatKey } from "../ReportLayoutTypes";

const pad = (n: number) => String(n).padStart(2, "0");
const ISO_RX = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?/;

export function toDate(v: any): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "string" && ISO_RX.test(v)) {
    const d = new Date(v.length === 10 ? v + "T00:00:00" : v);
    return isNaN(d.getTime()) ? null : d;
  }
  // /Date(1700000000000)/
  if (typeof v === "string") { const m = /\/Date\((\d+)\)\//.exec(v); if (m) return new Date(+m[1]); }
  return null;
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return isFinite(n) ? n : null;
}

function fixed(n: number, d: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function formatValue(v: any, fmt: FormatKey | "auto" | string = "auto", lang: "ar" | "en" = "ar"): string {
  if (v === null || v === undefined) return "";
  switch (fmt) {
    case "text": return String(v);
    case "n0": { const n = toNumber(v); return n === null ? String(v) : fixed(n, 0); }
    case "n1": { const n = toNumber(v); return n === null ? String(v) : fixed(n, 1); }
    case "n2": case "c": { const n = toNumber(v); return n === null ? String(v) : fixed(n, 2); }
    case "n3": { const n = toNumber(v); return n === null ? String(v) : fixed(n, 3); }
    case "percent": { const n = toNumber(v); return n === null ? String(v) : fixed(n, 2) + "%"; }
    case "date": { const d = toDate(v); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : String(v); }
    case "dateTime": { const d = toDate(v); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : String(v); }
    case "time": { const d = toDate(v); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : String(v); }
    case "bool": { const b = v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true"; return lang === "en" ? (b ? "Yes" : "No") : (b ? "نعم" : "لا"); }
    default: {
      // auto
      if (v instanceof Date) return formatValue(v, v.getHours() || v.getMinutes() ? "dateTime" : "date", lang);
      if (typeof v === "boolean") return formatValue(v, "bool", lang);
      if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
      if (typeof v === "string" && ISO_RX.test(v) && v.length >= 10 && v.length <= 30) {
        const d = toDate(v);
        if (d) return formatValue(d, d.getHours() || d.getMinutes() ? "dateTime" : "date", lang);
      }
      return String(v);
    }
  }
}

/** هل النوع رقمي (من نوع عمود الإجراء) */
export const isNumericType = (t?: string) => /^(Int|UInt|Byte|SByte|Decimal|Double|Single|Float|Money|int|bigint|smallint|tinyint|decimal|numeric|money|float|real)/.test(t || "");
export const isDateType = (t?: string) => /^(DateTime|date|datetime|smalldatetime|datetime2)/i.test(t || "");
