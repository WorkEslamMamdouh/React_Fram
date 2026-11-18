/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { PosOrder, TouchPOSConfig } from "../Shared/Components/Import/Patterns/ModelTouchPOS";
import { createLocalProvider, fmtNumber } from "../Shared/Components/Import/Patterns/patternKit";

// =======================
// #region بيانات وهمية — كافيه (300 صنف عشان التحميل اللانهائي)
// =======================
const Cats = [
  { id: 1, label: { en: "Hot drinks", ar: "مشروبات ساخنة" }, color: "#B45309", icon: "☕" },
  { id: 2, label: { en: "Cold drinks", ar: "مشروبات باردة" }, color: "#0EA5E9", icon: "🧊" },
  { id: 3, label: { en: "Sandwiches", ar: "ساندوتشات" }, color: "#16A34A", icon: "🥪" },
  { id: 4, label: { en: "Desserts", ar: "حلويات" }, color: "#DB2777", icon: "🍰" },
  { id: 5, label: { en: "Groceries (scale)", ar: "بقالة (ميزان)" }, color: "#7C3AED", icon: "⚖" },
];
const base = [
  ["Espresso", "إسبريسو", 1, 35], ["Latte", "لاتيه", 1, 55], ["Cappuccino", "كابتشينو", 1, 50], ["Tea", "شاي", 1, 20],
  ["Iced latte", "آيس لاتيه", 2, 60], ["Lemon mint", "ليمون نعناع", 2, 40], ["Mango juice", "عصير مانجا", 2, 45],
  ["Club sandwich", "كلوب ساندوتش", 3, 85], ["Tuna", "تونة", 3, 70], ["Cheesecake", "تشيز كيك", 4, 75], ["Brownie", "براوني", 4, 50],
] as const;
const Items: any[] = [];
for (let i = 0; i < 300; i++) {
  const b = base[i % base.length];
  Items.push({ ItemID: i + 1, NameEn: i < base.length ? b[0] : `${b[0]} #${i + 1}`, NameAr: i < base.length ? b[1] : `${b[1]} ${i + 1}`,
    CatID: b[2], Price: b[3] + (i >= base.length ? (i % 4) * 5 : 0), Barcode: String(6220000000000 + i + 1),
    Available: i % 37 !== 5, ModGroups: b[2] === 1 ? "1,2,3" : b[2] === 2 ? "1,3" : "" });
}
Items.push({ ItemID: 900, NameEn: "Cheese (kg)", NameAr: "جبنة (كيلو)", CatID: 5, Price: 180, Barcode: "12345", Available: true, ModGroups: "" });
const provider = createLocalProvider({ Items }, 60);
// #endregion

// =======================
// Demo_TouchPOS  (P11)
// =======================
export function Demo_TouchPOS() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [LastOrder, setLastOrder] = useState<PosOrder | null>(null);

  const Config = useMemo<TouchPOSConfig>(() => ({
    mode: "restaurant",
    categories: Cats,
    items: {
      source: { tableName: "Items", keyField: "ItemID", orderBy: "ItemID" },
      idField: "ItemID", nameField: "NameAr", nameFieldEn: "NameEn", priceField: "Price", categoryField: "CatID",
      barcodeField: "Barcode", availableField: "Available", modifierGroupsField: "ModGroups",
      loadMode: "infinite", pageSize: 40, searchFields: ["NameAr", "NameEn", "Barcode"],
    },
    modifierGroups: [
      { id: 1, label: { en: "Size", ar: "الحجم" }, min: 1, max: 1, options: [
        { id: "s", label: { en: "Small", ar: "صغير" } }, { id: "m", label: { en: "Medium", ar: "وسط" }, priceDelta: 10 }, { id: "l", label: { en: "Large", ar: "كبير" }, priceDelta: 20 },
      ] },
      { id: 2, label: { en: "Sugar", ar: "السكر" }, max: 1, options: [
        { id: 0, label: { en: "No sugar", ar: "من غير سكر" } }, { id: 1, label: { en: "Medium", ar: "مظبوط" } }, { id: 2, label: { en: "Extra", ar: "زيادة" } },
      ] },
      { id: 3, label: { en: "Extras", ar: "إضافات" }, max: 3, options: [
        { id: "shot", label: { en: "Extra shot", ar: "شوت زيادة" }, priceDelta: 15 }, { id: "cream", label: { en: "Whipped cream", ar: "كريمة" }, priceDelta: 10 },
        { id: "caramel", label: { en: "Caramel", ar: "كراميل" }, priceDelta: 10 }, { id: "oat", label: { en: "Oat milk", ar: "لبن شوفان" }, priceDelta: 20 },
      ] },
    ],
    orderTypes: [
      { id: "dine", label: { en: "Dine-in", ar: "صالة" }, icon: "🍽" },
      { id: "take", label: { en: "Takeaway", ar: "تيك أواي" }, icon: "🥡" },
      { id: "delivery", label: { en: "Delivery", ar: "توصيل" }, icon: "🛵" },
    ],
    paymentMethods: [
      { id: "cash", label: { en: "Cash", ar: "كاش" }, icon: "💵", isCash: true },
      { id: "card", label: { en: "Card", ar: "فيزا" }, icon: "💳" },
      { id: "wallet", label: { en: "Wallet", ar: "محفظة" }, icon: "📱" },
    ],
    discounts: { allowLine: true, allowOrder: true, maxPercent: 15, presets: [5, 10, 15, 25] },
    tax: { rate: 14, inclusive: true, label: { en: "VAT", ar: "ض.ق.م" } },
    serviceChargePercent: 0,
    currency: { en: "EGP", ar: "ج.م" },
    quickCash: [50, 100, 200, 500],
    scanner: true,
    scaleBarcode: { prefixes: ["21", "22"], itemCodeLength: 5, valueLength: 5, valueType: "weight", divisor: 1000 },
  }), []);

  async function OnCheckout(order: PosOrder) {
    // في الحقيقة: SQL.InsertMasterDetail (رأس + سطور + مدفوعات) ثم طباعة الإيصال
    setLastOrder(order);
    Sys.ShowMessage(`Sale saved: ${fmtNumber(order.totals.total)} — change ${fmtNumber(order.change)}`, `تم البيع: ${fmtNumber(order.totals.total)} — الباقي ${fmtNumber(order.change)}`, "success");
    return true;
  }

  async function OnDiscountOverLimit(pct: number) {
    return Sys.Confirm(`Discount ${pct}% needs manager approval. Approve?`, `خصم ${pct}% محتاج موافقة مدير. موافق؟`);
  }

  const state = { IsLangEN, Config, LastOrder, provider };
  const actions = { t, OnCheckout, OnDiscountOverLimit };
  return { ...state, ...actions };
}
