/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================================
//  posCart — حسابات السلة (دوال صافية، من غير React) — نفس الحساب يتعمل على السيرفر عند الحفظ
// =====================================================================================

import type { PosCartLine, PosTotals, ScaleBarcodeRule, TouchPOSConfig } from "./ModelTouchPOS";

export const round2 = (n: number, d = 2) => { const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; };

/** سعر الوحدة بعد الإضافات */
export const lineUnit = (l: PosCartLine) => l.unitPrice + l.modifiers.reduce((s, m) => s + (m.priceDelta || 0), 0);

/** إجمالي السطر بعد خصم السطر */
export const lineGross = (l: PosCartLine) => lineUnit(l) * l.qty;
export const lineNet = (l: PosCartLine) => lineGross(l) * (1 - (l.discountPct || 0) / 100);

export function cartTotals(lines: PosCartLine[], orderDiscountPct: number, cfg: Pick<TouchPOSConfig, "tax" | "serviceChargePercent" | "decimals">): PosTotals {
  const d = cfg.decimals ?? 2;
  const gross = lines.reduce((s, l) => s + lineGross(l), 0);
  const afterLine = lines.reduce((s, l) => s + lineNet(l), 0);
  const lineDiscounts = gross - afterLine;
  const orderDiscount = afterLine * (orderDiscountPct || 0) / 100;
  const base = afterLine - orderDiscount;
  const service = base * (cfg.serviceChargePercent || 0) / 100;
  const rate = (cfg.tax?.rate || 0) / 100;
  let tax: number, total: number;
  if (cfg.tax?.inclusive) {
    total = base + service;
    tax = total - total / (1 + rate);
  } else {
    tax = (base + service) * rate;
    total = base + service + tax;
  }
  return {
    subtotal: round2(gross, d), lineDiscounts: round2(lineDiscounts, d), orderDiscount: round2(orderDiscount, d),
    serviceCharge: round2(service, d), tax: round2(tax, d), total: round2(total, d),
    itemsCount: lines.reduce((s, l) => s + l.qty, 0),
  };
}

/** نفس الصنف بنفس الإضافات = نفس السطر (بيزود الكمية) */
export function sameLine(a: PosCartLine, itemId: any, mods: PosCartLine["modifiers"], note?: string) {
  if (a.itemId !== itemId || (a.note || "") !== (note || "") || a.discountPct) return false;
  const k = (m: PosCartLine["modifiers"]) => m.map((x) => `${x.groupId}:${x.optionId}`).sort().join("|");
  return k(a.modifiers) === k(mods);
}

/** باركود ميزان (بادئة 2x + كود صنف + وزن/سعر + check digit) → { itemCode, qty أو price } */
export function parseScaleBarcode(code: string, rule?: ScaleBarcodeRule): { itemCode: string; qty?: number; price?: number } | null {
  if (!rule || !/^\d+$/.test(code)) return null;
  const pre = rule.prefixes.find((p) => code.startsWith(p));
  if (!pre) return null;
  const itemCode = code.substr(pre.length, rule.itemCodeLength);
  const raw = code.substr(pre.length + rule.itemCodeLength, rule.valueLength);
  if (itemCode.length !== rule.itemCodeLength || raw.length !== rule.valueLength) return null;
  const v = Number(raw) / (rule.divisor || 1);
  return rule.valueType === "weight" ? { itemCode, qty: v } : { itemCode, price: v };
}
