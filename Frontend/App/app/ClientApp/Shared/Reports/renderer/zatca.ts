// =====================================================================================
//  zatca.ts  -  QR فاتورة هيئة الزكاة والضريبة (المرحلة الأولى): TLV ← Base64
//    1 اسم البائع · 2 الرقم الضريبي · 3 وقت الفاتورة ISO · 4 الإجمالي شامل الضريبة · 5 الضريبة
// =====================================================================================

import { toDate } from "./format";

function utf8(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

function tlv(tag: number, value: string): number[] {
  const bytes = utf8(value);
  if (bytes.length > 255) throw new Error("ZATCA TLV value too long");
  return [tag, bytes.length, ...bytes];
}

function isoTime(v: any): string {
  const d = toDate(v) ?? (v instanceof Date ? v : new Date());
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function zatcaTlvBase64(seller: string, vatNo: string, timestamp: any, total: number, vat: number): string {
  const bytes = [
    ...tlv(1, seller || "-"),
    ...tlv(2, vatNo || "-"),
    ...tlv(3, isoTime(timestamp)),
    ...tlv(4, (total || 0).toFixed(2)),
    ...tlv(5, (vat || 0).toFixed(2)),
  ];
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
}
