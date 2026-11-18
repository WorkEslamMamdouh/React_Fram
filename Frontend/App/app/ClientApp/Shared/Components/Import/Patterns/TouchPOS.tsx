/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  TouchPOS — P11 نقطة بيع باللمس
//  - تابلت/كمبيوتر: (فئات + بحث + أصناف) | السلة. موبايل: تابين "الأصناف" و"السلة (n)" + شريط إجمالي ثابت
//  - الأصناف من المصدر بالفئة + بحث، تحميل لانهائي (أو صفحات)
//  - إضافات (min/max/إجباري) قبل الإضافة للسلة، تعديل سطر (كمية/خصم/ملاحظة/حذف)
//  - خصم على الفاتورة (مع حد أقصى)، ضريبة شاملة/مضافة، خدمة %
//  - لوحة الدفع: أكتر من طريقة (دفع مقسّم)، كاش سريع، الباقي
//  - تعليق/استرجاع طلب، قراءة باركود من الكيبورد + باركود الميزان
// =====================================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataProvider } from "./ModelPatterns";
import type { PosCartLine, PosCartModifier, PosModifierGroup, PosOrder, PosPayment, TouchPOSConfig } from "./ModelTouchPOS";
import { cartTotals, lineNet, lineUnit, parseScaleBarcode, round2, sameLine } from "./posCart";
import { Sys } from "../../../SystemTools";
import {
  BottomSheet, EmptyState, InfiniteSentinel, PagerBar, btnClass, fmtNumber, softColor, sqlDataProvider,
  useIsMobile, useLangKit, usePagedData,
} from "./patternKit";

export interface TouchPOSProps {
  config: TouchPOSConfig;
  provider?: DataProvider;
  /** حفظ الطلب — رجّع false لو فشل (السلة مابتتمسحش) */
  onCheckout: (order: PosOrder) => Promise<boolean | void> | boolean | void;
  /** خصم أكبر من الحد — رجّع true لو المدير وافق */
  onDiscountOverLimit?: (pct: number) => Promise<boolean> | boolean;
  /** محتوى إضافي فوق السلة (اختيار عميل / ترابيزة) */
  cartHeader?: React.ReactNode;
  height?: number | string;
}

let keySeq = 0;
const newKey = () => `l${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export default function TouchPOS({ config, provider = sqlDataProvider, onCheckout, onDiscountOverLimit, cartHeader, height = "calc(100vh - 120px)" }: TouchPOSProps) {
  const { t, lt, lang, dir } = useLangKit();
  const isMobile = useIsMobile(900);
  const I = config.items;
  const dec = config.decimals ?? 2;
  const cur = lt(config.currency);
  const money = (n: number) => fmtNumber(n, dec);

  // ---------- الفئات ----------
  const [cats, setCats] = useState(config.categories || []);
  useEffect(() => {
    const cs = config.categoriesSource;
    if (!cs) return;
    provider({ source: cs, page: 0, pageSize: 0 }).then((r) => setCats(r.rows.map((x) => ({
      id: x[cs.idField], label: { ar: String(x[cs.labelField] ?? ""), en: String(x[cs.labelFieldEn || cs.labelField] ?? "") }, color: cs.colorField ? x[cs.colorField] : undefined,
    })))).catch(() => undefined);
  }, [config.categoriesSource, provider]);
  const [cat, setCat] = useState<any>(null);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const h = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(h); }, [q]);

  const items = usePagedData({
    provider, source: I.source,
    where: cat !== null && !dq ? { [I.categoryField]: cat } : undefined,
    search: dq ? { text: dq, fields: I.searchFields && I.searchFields.length ? I.searchFields : [I.nameField, ...(I.nameFieldEn ? [I.nameFieldEn] : []), ...(I.barcodeField ? [I.barcodeField] : [])] } : undefined,
    mode: I.loadMode || "infinite", pageSize: I.pageSize || 40,
  });
  const gridRef = useRef<HTMLDivElement>(null);

  // ---------- السلة ----------
  const [orderType, setOrderType] = useState(config.orderTypes?.[0]?.id);
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [orderDisc, setOrderDisc] = useState(0);
  const [held, setHeld] = useState<Array<{ id: number; lines: PosCartLine[]; orderDisc: number; at: string }>>([]);
  const totals = useMemo(() => cartTotals(lines, orderDisc, config), [lines, orderDisc, config]);
  const [mobileTab, setMobileTab] = useState<"items" | "cart">("items");

  const nameOf = useCallback((row: any) => String((lang === "en" && I.nameFieldEn ? row[I.nameFieldEn] : row[I.nameField]) ?? ""), [lang, I.nameField, I.nameFieldEn]);

  const groupsFor = useCallback((row: any): PosModifierGroup[] => {
    const all = config.modifierGroups || [];
    const ids = I.modifierGroupsField && row[I.modifierGroupsField] ? String(row[I.modifierGroupsField]).split(",").map((s) => s.trim()) : [];
    return all.filter((g) => ids.includes(String(g.id))
      || (g.itemIds || []).map(String).includes(String(row[I.idField]))
      || (g.categoryIds || []).map(String).includes(String(row[I.categoryField])));
  }, [config.modifierGroups, I.modifierGroupsField, I.idField, I.categoryField]);

  const addLine = useCallback((row: any, qty = 1, mods: PosCartModifier[] = [], priceOverride?: number) => {
    const unit = priceOverride !== undefined ? priceOverride : Number(row[I.priceField]) || 0;
    setLines((ls) => {
      const idx = priceOverride === undefined ? ls.findIndex((l) => sameLine(l, row[I.idField], mods)) : -1;
      if (idx >= 0) return ls.map((l, i) => (i === idx ? { ...l, qty: round2(l.qty + qty, 3) } : l));
      return [...ls, { key: newKey(), itemId: row[I.idField], name: nameOf(row), unitPrice: unit, qty, modifiers: mods, discountPct: 0 }];
    });
  }, [I.priceField, I.idField, nameOf]);

  // ---------- الإضافات ----------
  const [modFor, setModFor] = useState<{ row: any; groups: PosModifierGroup[] } | null>(null);
  const [modSel, setModSel] = useState<Record<string, Array<string | number>>>({});
  const [modQty, setModQty] = useState(1);

  const tapItem = (row: any) => {
    if (I.availableField && row[I.availableField] === false) { Sys.ShowMessage("Item not available", "الصنف مش متاح", "warning"); return; }
    const gs = groupsFor(row);
    if (gs.length) { setModFor({ row, groups: gs }); setModSel({}); setModQty(1); return; }
    addLine(row);
  };

  const confirmMods = () => {
    if (!modFor) return;
    for (const g of modFor.groups) {
      const n = (modSel[String(g.id)] || []).length;
      if (n < (g.min || 0)) { Sys.ShowMessage(`Choose at least ${g.min} from ${lt(g.label)}`, `اختار على الأقل ${g.min} من ${lt(g.label)}`, "warning"); return; }
    }
    const mods: PosCartModifier[] = [];
    for (const g of modFor.groups) for (const oid of modSel[String(g.id)] || []) {
      const o = g.options.find((x) => String(x.id) === String(oid));
      if (o) mods.push({ groupId: g.id, optionId: o.id, label: lt(o.label), priceDelta: o.priceDelta || 0 });
    }
    addLine(modFor.row, modQty, mods);
    setModFor(null);
  };

  const toggleOpt = (g: PosModifierGroup, oid: string | number) => {
    setModSel((s) => {
      const cur = s[String(g.id)] || [];
      const has = cur.map(String).includes(String(oid));
      let next = has ? cur.filter((x) => String(x) !== String(oid)) : [...cur, oid];
      if (!has && g.max && next.length > g.max) next = g.max === 1 ? [oid] : next.slice(next.length - g.max);
      return { ...s, [String(g.id)]: next };
    });
  };

  // ---------- تعديل سطر ----------
  const [editKey, setEditKey] = useState<string | null>(null);
  const editLine = lines.find((l) => l.key === editKey) || null;
  const patchLine = (key: string, p: Partial<PosCartLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const removeLine = (key: string) => { setLines((ls) => ls.filter((l) => l.key !== key)); setEditKey(null); };

  const checkDiscount = async (pct: number) => {
    const max = config.discounts?.maxPercent;
    if (max !== undefined && pct > max) {
      const ok = onDiscountOverLimit ? await onDiscountOverLimit(pct) : false;
      if (!ok) { Sys.ShowMessage(`Max discount is ${max}%`, `أقصى خصم ${max}%`, "warning"); return false; }
    }
    return true;
  };

  // ---------- الباركود (scanner wedge) ----------
  const scanBuf = useRef({ s: "", at: 0 });
  const lookupBarcode = useCallback(async (code: string) => {
    if (!I.barcodeField) return;
    const scale = parseScaleBarcode(code, config.scaleBarcode);
    const res = await provider({ source: I.source, where: { [I.barcodeField]: scale ? scale.itemCode : code }, page: 1, pageSize: 1 });
    const row = res.rows[0];
    if (!row) { Sys.ShowMessage(`Barcode not found: ${code}`, `الباركود مش موجود: ${code}`, "error"); return; }
    if (scale?.qty !== undefined) addLine(row, scale.qty);
    else if (scale?.price !== undefined) addLine(row, 1, [], scale.price);
    else tapItem(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [I.barcodeField, I.source, config.scaleBarcode, provider, addLine]);

  useEffect(() => {
    if (!config.scanner) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = Date.now();
      const b = scanBuf.current;
      if (now - b.at > 80) b.s = "";
      b.at = now;
      // preventDefault: الـ Enter بتاع الماسح مايضغطش الزرار اللي عليه الفوكس (كان بيضيف الصنف مرتين)
      if (e.key === "Enter") { if (b.s.length >= 4) { e.preventDefault(); lookupBarcode(b.s); } b.s = ""; return; }
      if (e.key.length === 1) b.s += e.key;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config.scanner, lookupBarcode]);

  const onSearchEnter = async () => {
    if (/^\d{6,}$/.test(q.trim()) && I.barcodeField) { await lookupBarcode(q.trim()); setQ(""); }
    else if (items.rows.length === 1) { tapItem(items.rows[0]); setQ(""); }
  };

  // ---------- الدفع ----------
  const [payOpen, setPayOpen] = useState(false);
  const [payments, setPayments] = useState<PosPayment[]>([]);
  const [method, setMethod] = useState(config.paymentMethods[0]?.id || "");
  const [amountStr, setAmountStr] = useState("");
  const paid = round2(payments.reduce((s, p) => s + p.amount, 0), dec);
  const remaining = round2(Math.max(0, totals.total - paid), dec);
  const hasCash = payments.some((p) => config.paymentMethods.find((m) => m.id === p.methodId)?.isCash);
  const change = hasCash ? round2(Math.max(0, paid - totals.total), dec) : 0;
  const [saving, setSaving] = useState(false);

  const openPay = () => { if (!lines.length) return; setPayments([]); setAmountStr(""); setMethod(config.paymentMethods[0]?.id || ""); setPayOpen(true); };
  const addPayment = (amt?: number) => {
    const a = round2(amt !== undefined ? amt : Number(amountStr || remaining), dec);
    if (!(a > 0)) return;
    const m = config.paymentMethods.find((x) => x.id === method);
    if (!m?.isCash && a > remaining + 1e-9) { Sys.ShowMessage("Amount exceeds remaining", "المبلغ أكبر من المتبقي", "warning"); return; }
    setPayments((p) => [...p, { methodId: method, amount: a }]);
    setAmountStr("");
  };
  const finish = async () => {
    if (paid + 1e-9 < totals.total) return;
    setSaving(true);
    try {
      const order: PosOrder = { orderType, lines, orderDiscountPct: orderDisc, totals, payments, paid, change };
      const ok = await onCheckout(order);
      if (ok === false) return;
      setLines([]); setOrderDisc(0); setPayOpen(false); setMobileTab("items");
    } finally { setSaving(false); }
  };

  const hold = () => {
    if (!lines.length) return;
    setHeld((h) => [...h, { id: Date.now(), lines, orderDisc, at: new Date().toLocaleTimeString() }]);
    setLines([]); setOrderDisc(0);
  };
  const [recallOpen, setRecallOpen] = useState(false);

  // ============================== أجزاء الشكل ==============================
  const catBar = (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      <button type="button" onClick={() => setCat(null)} className={`shrink-0 min-h-[44px] px-4 rounded-xl text-[13px] font-semibold ${cat === null ? "bg-erp-accent text-white" : "bg-erp-surface-2 text-erp-text"}`}>{t("All", "الكل")}</button>
      {cats.map((c) => {
        const on = String(c.id) === String(cat);
        return (
          <button key={String(c.id)} type="button" onClick={() => setCat(c.id)}
            className="shrink-0 min-h-[44px] px-4 rounded-xl text-[13px] font-semibold border-2"
            style={on ? { background: c.color || "var(--erp-accent)", color: "#fff", borderColor: c.color || "var(--erp-accent)" } : { borderColor: c.color ? softColor(c.color, 0.5) : "var(--erp-border)", background: c.color ? softColor(c.color, 0.1) : undefined }}>
            {c.icon} {lt(c.label)}
          </button>
        );
      })}
    </div>
  );

  const itemsGrid = (
    <div ref={gridRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))" }}>
        {items.rows.map((r: any) => {
          const na = I.availableField && r[I.availableField] === false;
          const color = I.colorField ? r[I.colorField] : undefined;
          return (
            <button key={String(r[I.idField])} type="button" onClick={() => tapItem(r)} disabled={!!na}
              className="relative min-h-[96px] rounded-xl border border-erp-border bg-erp-surface p-2 flex flex-col justify-between text-start shadow-erp-1 active:scale-[0.98] transition-transform disabled:opacity-40"
              style={color ? { borderTop: `4px solid ${color}` } : undefined}>
              {I.imageField && r[I.imageField] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r[I.imageField]} alt="" className="w-full h-16 object-cover rounded-lg mb-1" loading="lazy" />
              ) : null}
              <span className="text-[13px] font-semibold leading-tight line-clamp-2">{nameOf(r)}</span>
              <span className="num text-[13px] text-erp-accent font-bold">{money(Number(r[I.priceField]) || 0)}</span>
              {groupsFor(r).length > 0 && <span className="absolute top-1 end-1 text-[10px] text-erp-text-subtle">＋</span>}
            </button>
          );
        })}
      </div>
      {items.loading && <div className="py-4 text-center text-xs text-erp-text-muted">{t("Loading...", "جاري التحميل...")}</div>}
      {!items.loading && items.rows.length === 0 && <EmptyState text={t("No items", "لا توجد أصناف")} />}
      <InfiniteSentinel data={items} rootRef={gridRef} />
      <PagerBar data={items} />
    </div>
  );

  const itemsPane = (
    <div className="flex flex-col gap-2 min-h-0 h-full p-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSearchEnter(); }}
        placeholder={t("Search or scan barcode...", "بحث أو امسح الباركود...")}
        className="w-full h-12 border border-erp-border-strong rounded-xl px-4 text-[15px] bg-erp-surface text-erp-text focus:outline-none focus:border-erp-accent" />
      {catBar}
      {itemsGrid}
    </div>
  );

  const totalsBox = (
    <div className="space-y-1 text-[13px]">
      <div className="flex justify-between"><span className="text-erp-text-muted">{t("Subtotal", "الإجمالي")}</span><span className="num">{money(totals.subtotal)}</span></div>
      {totals.lineDiscounts + totals.orderDiscount > 0 && <div className="flex justify-between text-erp-danger"><span>{t("Discount", "الخصم")}</span><span className="num">−{money(totals.lineDiscounts + totals.orderDiscount)}</span></div>}
      {totals.serviceCharge > 0 && <div className="flex justify-between"><span className="text-erp-text-muted">{t("Service", "الخدمة")}</span><span className="num">{money(totals.serviceCharge)}</span></div>}
      {config.tax?.rate ? <div className="flex justify-between"><span className="text-erp-text-muted">{lt(config.tax.label) || t("Tax", "الضريبة")} {config.tax.rate}%{config.tax.inclusive ? ` (${t("incl.", "شامل")})` : ""}</span><span className="num">{money(totals.tax)}</span></div> : null}
      <div className="flex justify-between items-end pt-1 border-t border-erp-border"><span className="font-semibold">{t("Total", "المطلوب")}</span><span className="num text-2xl font-bold text-erp-accent">{money(totals.total)} <span className="text-xs">{cur}</span></span></div>
    </div>
  );

  const cartPane = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-2 space-y-2 border-b border-erp-border">
        {cartHeader}
        {config.orderTypes && config.orderTypes.length > 0 && (
          <div className="flex gap-1 overflow-x-auto">
            {config.orderTypes.map((o) => (
              <button key={o.id} type="button" onClick={() => setOrderType(o.id)}
                className={`shrink-0 flex-1 min-h-[40px] px-3 rounded-lg text-[12px] font-semibold ${orderType === o.id ? "bg-erp-primary text-erp-on-primary" : "bg-erp-surface-2 text-erp-text-muted"}`}>{o.icon} {lt(o.label)}</button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-erp-border">
        {lines.length === 0 && <EmptyState text={t("Cart is empty", "السلة فاضية")} icon="🛒" />}
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-2 px-2 py-2">
            <button type="button" onClick={() => setEditKey(l.key)} className="flex-1 min-w-0 text-start">
              <div className="text-[13px] font-semibold truncate">{l.name}</div>
              {l.modifiers.length > 0 && <div className="text-[11px] text-erp-text-muted truncate">{l.modifiers.map((m) => m.label + (m.priceDelta ? ` +${m.priceDelta}` : "")).join(" · ")}</div>}
              {l.note && <div className="text-[11px] text-erp-warning truncate">📝 {l.note}</div>}
              <div className="text-[11px] text-erp-text-subtle num">{money(lineUnit(l))}{l.discountPct ? ` · −${l.discountPct}%` : ""}</div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" aria-label={t("Decrease", "تقليل")} className="size-10 rounded-lg bg-erp-surface-2 text-lg font-bold" onClick={() => (l.qty <= 1 ? removeLine(l.key) : patchLine(l.key, { qty: round2(l.qty - 1, 3) }))}>−</button>
              <span className="num w-9 text-center font-semibold">{l.qty}</span>
              <button type="button" aria-label={t("Increase", "زيادة")} className="size-10 rounded-lg bg-erp-surface-2 text-lg font-bold" onClick={() => patchLine(l.key, { qty: round2(l.qty + 1, 3) })}>+</button>
            </div>
            <div className="num w-20 text-end font-semibold text-[13px]">{money(lineNet(l))}</div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-erp-border space-y-2 bg-erp-surface">
        {config.discounts?.allowOrder && (
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-[12px] text-erp-text-muted shrink-0">{t("Discount", "خصم")}</span>
            {[0, ...(config.discounts.presets || [5, 10, 15])].map((p) => (
              <button key={p} type="button" onClick={async () => { if (await checkDiscount(p)) setOrderDisc(p); }}
                className={`shrink-0 min-h-[36px] px-3 rounded-lg text-[12px] num ${orderDisc === p ? "bg-erp-accent text-white" : "bg-erp-surface-2"}`}>{p}%</button>
            ))}
          </div>
        )}
        {totalsBox}
        <div className="grid grid-cols-4 gap-2">
          <button type="button" className={btnClass("gray", "lg")} onClick={hold} disabled={!lines.length} title={t("Hold", "تعليق")}>⏸</button>
          <button type="button" className={btnClass("gray", "lg")} onClick={() => setRecallOpen(true)} disabled={!held.length} title={t("Recall", "استرجاع")}>↩<span className="num text-[11px]">{held.length || ""}</span></button>
          <button type="button" className={`${btnClass("success", "lg")} col-span-2`} onClick={openPay} disabled={!lines.length}>💳 {t("Pay", "دفع")}</button>
        </div>
        <button type="button" className="w-full text-[12px] text-erp-danger min-h-[32px]" disabled={!lines.length} onClick={() => { setLines([]); setOrderDisc(0); }}>{t("Clear cart", "مسح السلة")}</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col rounded-erp-card border border-erp-border bg-erp-canvas text-erp-text overflow-hidden" style={{ height }} dir={dir}>
      {isMobile ? (
        <>
          <div className="flex shrink-0 border-b border-erp-border bg-erp-surface" role="tablist">
            {(["items", "cart"] as const).map((tb) => (
              <button key={tb} type="button" role="tab" aria-selected={mobileTab === tb} onClick={() => setMobileTab(tb)}
                className={`flex-1 min-h-[48px] text-[14px] font-semibold border-b-2 ${mobileTab === tb ? "border-erp-accent text-erp-accent" : "border-transparent text-erp-text-muted"}`}>
                {tb === "items" ? t("Items", "الأصناف") : <>{t("Cart", "السلة")} <span className="num">({totals.itemsCount})</span></>}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">{mobileTab === "items" ? itemsPane : <div className="h-full bg-erp-surface">{cartPane}</div>}</div>
          {mobileTab === "items" && lines.length > 0 && (
            <button type="button" onClick={() => setMobileTab("cart")} className="shrink-0 m-2 min-h-[52px] rounded-xl bg-erp-accent text-white font-semibold flex items-center justify-between px-4">
              <span>🛒 <span className="num">{totals.itemsCount}</span></span><span className="num">{money(totals.total)} {cur}</span>
            </button>
          )}
        </>
      ) : (
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 380px)" }}>
          <div className="min-h-0">{itemsPane}</div>
          <div className="min-h-0 border-s border-erp-border bg-erp-surface">{cartPane}</div>
        </div>
      )}

      {/* ---------- الإضافات ---------- */}
      <BottomSheet open={!!modFor} onClose={() => setModFor(null)} title={modFor ? nameOf(modFor.row) : ""}
        footer={<>
          <div className="flex items-center gap-1">
            <button type="button" className="size-11 rounded-lg bg-erp-surface-2 text-lg" onClick={() => setModQty((x) => Math.max(1, x - 1))}>−</button>
            <span className="num w-8 text-center font-semibold">{modQty}</span>
            <button type="button" className="size-11 rounded-lg bg-erp-surface-2 text-lg" onClick={() => setModQty((x) => x + 1)}>+</button>
          </div>
          <button type="button" className={`${btnClass("primary", "lg")} flex-1`} onClick={confirmMods}>{t("Add to cart", "إضافة للسلة")}</button>
        </>}>
        {modFor && modFor.groups.map((g) => (
          <div key={String(g.id)} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[14px]">{lt(g.label)}</span>
              <span className="text-[11px] text-erp-text-muted">{(g.min || 0) > 0 ? t("Required", "إجباري") : t("Optional", "اختياري")}{g.max ? ` · ${t("max", "حد أقصى")} ${g.max}` : ""}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {g.options.map((o) => {
                const on = (modSel[String(g.id)] || []).map(String).includes(String(o.id));
                return (
                  <button key={String(o.id)} type="button" onClick={() => toggleOpt(g, o.id)} aria-pressed={on}
                    className={`min-h-[48px] rounded-lg border-2 px-2 text-[13px] ${on ? "border-erp-accent bg-erp-accent-soft text-erp-accent font-semibold" : "border-erp-border"}`}>
                    {lt(o.label)}{o.priceDelta ? <span className="num text-[11px] block">+{money(o.priceDelta)}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </BottomSheet>

      {/* ---------- تعديل سطر ---------- */}
      <BottomSheet open={!!editLine} onClose={() => setEditKey(null)} title={editLine?.name}
        footer={editLine ? <>
          <button type="button" className={btnClass("danger", "lg")} onClick={() => removeLine(editLine.key)}>🗑 {t("Remove", "حذف")}</button>
          <button type="button" className={`${btnClass("primary", "lg")} flex-1`} onClick={() => setEditKey(null)}>{t("Done", "تم")}</button>
        </> : null}>
        {editLine && (
          <div className="space-y-3">
            <label className="block text-[12px] text-erp-text-muted">{t("Quantity", "الكمية")}
              <input type="number" inputMode="decimal" min={0} step="any" value={editLine.qty} onChange={(e) => patchLine(editLine.key, { qty: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-1 w-full h-12 border border-erp-border-strong rounded-lg px-3 text-[16px] num bg-erp-surface text-erp-text" />
            </label>
            {config.discounts?.allowLine && (
              <div>
                <div className="text-[12px] text-erp-text-muted mb-1">{t("Line discount %", "خصم السطر %")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {[0, ...(config.discounts.presets || [5, 10, 15])].map((p) => (
                    <button key={p} type="button" onClick={async () => { if (await checkDiscount(p)) patchLine(editLine.key, { discountPct: p }); }}
                      className={`min-h-[40px] px-3 rounded-lg num ${editLine.discountPct === p ? "bg-erp-accent text-white" : "bg-erp-surface-2"}`}>{p}%</button>
                  ))}
                </div>
              </div>
            )}
            <label className="block text-[12px] text-erp-text-muted">{t("Note (kitchen)", "ملاحظة (للمطبخ)")}
              <input value={editLine.note || ""} onChange={(e) => patchLine(editLine.key, { note: e.target.value })}
                className="mt-1 w-full h-11 border border-erp-border-strong rounded-lg px-3 text-[14px] bg-erp-surface text-erp-text" />
            </label>
          </div>
        )}
      </BottomSheet>

      {/* ---------- استرجاع ---------- */}
      <BottomSheet open={recallOpen} onClose={() => setRecallOpen(false)} title={t("Held orders", "الطلبات المعلقة")}>
        {held.length === 0 && <EmptyState text={t("No held orders", "مفيش طلبات معلقة")} />}
        {held.map((h) => (
          <button key={h.id} type="button" className="w-full flex justify-between items-center min-h-[52px] px-3 mb-2 rounded-lg border border-erp-border"
            onClick={() => { if (lines.length) hold(); setLines(h.lines); setOrderDisc(h.orderDisc); setHeld((x) => x.filter((y) => y.id !== h.id)); setRecallOpen(false); }}>
            <span className="num">{h.at}</span>
            <span className="num font-semibold">{h.lines.length} {t("lines", "سطر")} · {money(cartTotals(h.lines, h.orderDisc, config).total)}</span>
          </button>
        ))}
      </BottomSheet>

      {/* ---------- الدفع ---------- */}
      <BottomSheet open={payOpen} onClose={() => setPayOpen(false)} wide title={<span>{t("Payment", "الدفع")} — <span className="num">{money(totals.total)} {cur}</span></span>}
        footer={<button type="button" className={`${btnClass("success", "lg")} w-full`} disabled={paid + 1e-9 < totals.total || saving} onClick={finish}>
          ✔ {saving ? t("Saving...", "جاري الحفظ...") : t("Complete sale", "إتمام البيع")}
        </button>}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {config.paymentMethods.map((m) => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
                  className={`min-h-[52px] rounded-xl border-2 font-semibold text-[14px] ${method === m.id ? "border-erp-accent bg-erp-accent-soft text-erp-accent" : "border-erp-border"}`}>{m.icon} {lt(m.label)}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" value={amountStr} placeholder={money(remaining)} onChange={(e) => setAmountStr(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPayment(); }}
                className="flex-1 h-12 border border-erp-border-strong rounded-lg px-3 text-[18px] num bg-erp-surface text-erp-text" />
              <button type="button" className={btnClass("primary", "lg")} onClick={() => addPayment()} disabled={remaining <= 0 && !config.paymentMethods.find((x) => x.id === method)?.isCash}>{t("Add", "إضافة")}</button>
            </div>
            {config.paymentMethods.find((x) => x.id === method)?.isCash && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnClass("gray")} onClick={() => addPayment(remaining)}>{t("Exact", "المبلغ بالظبط")}</button>
                {(config.quickCash || [50, 100, 200, 500]).map((v) => <button key={v} type="button" className={`${btnClass("gray")} num`} onClick={() => addPayment(v)}>{v}</button>)}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {payments.length === 0 && <div className="text-[13px] text-erp-text-muted">{t("No payments yet", "لسه مفيش مدفوعات")}</div>}
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-erp-surface-2 px-3 min-h-[44px]">
                <span>{lt(config.paymentMethods.find((m) => m.id === p.methodId)?.label)}</span>
                <span className="flex items-center gap-2"><span className="num font-semibold">{money(p.amount)}</span>
                  <button type="button" aria-label={t("Remove", "حذف")} className="size-9 rounded-lg text-erp-danger" onClick={() => setPayments((x) => x.filter((_, j) => j !== i))}>✕</button></span>
              </div>
            ))}
            <div className="border-t border-erp-border pt-2 space-y-1 text-[14px]">
              <div className="flex justify-between"><span>{t("Paid", "المدفوع")}</span><span className="num font-semibold">{money(paid)}</span></div>
              <div className="flex justify-between"><span>{t("Remaining", "المتبقي")}</span><span className="num font-semibold text-erp-danger">{money(remaining)}</span></div>
              {change > 0 && <div className="flex justify-between text-lg"><span>{t("Change", "الباقي للعميل")}</span><span className="num font-bold text-erp-success">{money(change)}</span></div>}
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
