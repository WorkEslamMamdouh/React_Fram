// =====================================================================================
//  scanParse — تحليل الباركود (دوال صافية): GS1-128 + باركود الميزان + العادي
//  GS1 بيدعم الشكلين: "(01)06221234567890(10)AB12(17)271231" أو الخام بفاصل GS (\x1d)
// =====================================================================================

import type { ScanParsed } from "./ModelScanTask";
import type { ScaleBarcodeRule } from "./ModelTouchPOS";
import { parseScaleBarcode } from "./posCart";

const GS = "\x1d";
/** الطول الثابت لكل AI (المتغير = undefined) */
const FIXED: Record<string, number> = { "01": 14, "02": 14, "11": 6, "13": 6, "15": 6, "17": 6, "20": 2 };
const KNOWN = ["01", "02", "10", "11", "13", "15", "17", "20", "21", "30", "37"];

function yymmdd(s: string): string {
  const yy = Number(s.substring(0, 2));
  const year = yy >= 50 ? 1900 + yy : 2000 + yy;
  let dd = s.substring(4, 6);
  const mm = s.substring(2, 4);
  if (dd === "00") dd = String(new Date(year, Number(mm), 0).getDate()); // 00 = آخر الشهر
  return `${year}-${mm}-${dd}`;
}

export function parseGS1(raw: string): Record<string, string> | null {
  let s = raw.trim().replace(/^\]C1/, "");
  const out: Record<string, string> = {};
  if (s.startsWith("(")) {
    const re = /\((\d{2,4})\)([^(]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) out[m[1]] = m[2];
    return Object.keys(out).length ? out : null;
  }
  if (!/^(01|02|10|17|21)/.test(s)) return null;
  while (s.length >= 2) {
    const ai = s.substring(0, 2);
    if (!KNOWN.includes(ai)) break;
    s = s.substring(2);
    const fixed = FIXED[ai];
    let val: string;
    if (fixed) { val = s.substring(0, fixed); s = s.substring(fixed); if (s.startsWith(GS)) s = s.substring(1); }
    else { const i = s.indexOf(GS); val = i < 0 ? s : s.substring(0, i); s = i < 0 ? "" : s.substring(i + 1); }
    out[ai] = val;
  }
  return Object.keys(out).length ? out : null;
}

export function parseScan(raw: string, opts: { gs1?: boolean; scale?: ScaleBarcodeRule } = {}): ScanParsed {
  const code = raw.trim();
  if (opts.gs1) {
    const g = parseGS1(code);
    if (g && (g["01"] || g["02"])) {
      const gtin = g["01"] || g["02"];
      return {
        raw: code, gtin, batch: g["10"], serial: g["21"], expiry: g["17"] ? yymmdd(g["17"]) : undefined,
        qty: g["30"] || g["37"] ? Number(g["30"] || g["37"]) : undefined,
        // GTIN-14 → EAN-13 لو أوله 0
        lookup: gtin.startsWith("0") ? gtin.substring(1) : gtin,
      };
    }
  }
  const sc = parseScaleBarcode(code, opts.scale);
  if (sc) return { raw: code, lookup: sc.itemCode, qty: sc.qty, price: sc.price };
  return { raw: code, lookup: code };
}
