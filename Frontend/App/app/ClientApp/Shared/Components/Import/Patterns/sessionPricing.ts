// =====================================================================================
//  sessionPricing — حساب جلسة بالوقت (دوال صافية، من غير React)
//  - سعر حسب نوع الجهاز + الوضع (single/multi) + شرايح الوقت (ليلي/ويك إند)
//  - بالدقيقة أو بالبلوك مع تقريب، أقل حساب، دقايق سماح
//  - الإيقاف المؤقت بيتخصم، وتغيير الوضع بيتحسب جزء جزء
//  الوقت دايمًا من ساعة السيرفر (now = Date.now() + offset) مش ساعة الجهاز لوحدها.
// =====================================================================================

import type { PricingConfig, RateRule, SessionCharge, SessionSegment } from "./ModelTileBoard";

const hmToMin = (s: string) => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
// rateAt بيتنده مرة لكل دقيقة في الجلسة × كل تايل كل ثانية — فبنحفظ تحليل "HH:MM" بدل split كل مرة
const bandCache = new WeakMap<object, [number, number]>();
const bandMinutes = (b: { from: string; to: string }): [number, number] => {
  let v = bandCache.get(b);
  if (!v) { v = [hmToMin(b.from), hmToMin(b.to)]; bandCache.set(b, v); }
  return v;
};

export function findRate(pricing: PricingConfig, type: string | undefined, mode: string | undefined): RateRule | undefined {
  const r = pricing.rates;
  return r.find((x) => x.type === type && x.mode === mode)
    || r.find((x) => x.type === type && !x.mode)
    || r.find((x) => !x.type && x.mode === mode)
    || r.find((x) => !x.type && !x.mode)
    || r[0];
}

/** سعر الساعة في لحظة معينة (حسب الشرايح) */
export function rateAt(rule: RateRule | undefined, at: Date): number {
  if (!rule) return 0;
  if (!rule.bands || rule.bands.length === 0) return rule.perHour;
  const mins = at.getHours() * 60 + at.getMinutes();
  for (const b of rule.bands) {
    if (b.days && b.days.length && !b.days.includes(at.getDay())) continue;
    const [f, t] = bandMinutes(b);
    const inBand = f <= t ? mins >= f && mins < t : mins >= f || mins < t; // بيعدّي نص الليل
    if (inBand) return b.perHour;
  }
  return rule.perHour;
}

export interface ChargeInput {
  pricing: PricingConfig;
  type?: string;
  mode?: string;
  segments?: SessionSegment[];
  start: string | Date;
  now: number;
  pausedMs?: number;
  /** لو موقوف دلوقتي */
  pausedAt?: string | Date | null;
  prepaidMinutes?: number | null;
  itemsAmount?: number;
}

/**
 * حساب الجلسة. الوقت بيتقسم دقايق، وكل دقيقة بتاخد سعر لحظتها ووضعها.
 * (الحد الأقصى 48 ساعة عشان الحساب يفضل خفيف)
 */
export function computeSessionCharge(inp: ChargeInput): SessionCharge {
  const { pricing } = inp;
  const startMs = new Date(inp.start).getTime();
  const endMs = inp.pausedAt ? new Date(inp.pausedAt).getTime() : inp.now;
  const elapsedMs = Math.max(0, endMs - startMs - (inp.pausedMs || 0));
  const minutes = elapsedMs / 60000;

  const grace = pricing.graceMinutes || 0;
  let billable = Math.max(0, minutes - grace);
  if ((pricing.unit || "minute") === "block") {
    const bm = Math.max(1, pricing.blockMinutes || 15);
    const blocks = billable / bm;
    const n = pricing.rounding === "down" ? Math.floor(blocks) : pricing.rounding === "nearest" ? Math.round(blocks) : Math.ceil(blocks - 1e-9);
    billable = n * bm;
  } else {
    billable = Math.ceil(billable - 1e-9);
  }

  // وزّع الدقايق المحسوبة على الأجزاء (الأوضاع) والشرايح — من بداية الجلسة (بعد السماح)
  const segs = (inp.segments && inp.segments.length ? inp.segments : [{ mode: inp.mode || "", start: new Date(startMs).toISOString() }])
    .map((s) => ({ mode: s.mode, at: new Date(s.start).getTime() }))
    .sort((a, b) => a.at - b.at);
  // نسبة الإيقاف: بنفترض إن الإيقاف موزع بالتساوي (تقريب كويس للعرض؛ الحساب النهائي على السيرفر)
  const wall = Math.max(1, endMs - startMs);
  const stretch = wall / Math.max(1, elapsedMs);

  let amount = 0;
  const total = Math.min(billable, 48 * 60);
  // findRate ثابت لكل وضع → نحسبه مرة واحدة لكل وضع بدل كل دقيقة (نفس النتيجة)
  const ruleByMode = new Map<string, RateRule | undefined>();
  const ruleFor = (mode: string) => {
    if (!ruleByMode.has(mode)) ruleByMode.set(mode, findRate(pricing, inp.type, mode));
    return ruleByMode.get(mode);
  };
  for (let i = 0; i < total; i++) {
    const t = startMs + (grace + i) * 60000 * stretch;
    let mode = segs[0].mode;
    for (const s of segs) if (s.at <= t) mode = s.mode;
    amount += rateAt(ruleFor(mode), new Date(t)) / 60;
  }
  amount = Math.round(amount * 100) / 100;
  if (pricing.minimumCharge && minutes > 0) amount = Math.max(amount, pricing.minimumCharge);

  const curMode = segs[segs.length - 1].mode;
  const items = inp.itemsAmount || 0;
  return {
    minutes,
    billedMinutes: billable,
    timeAmount: amount,
    itemsAmount: items,
    total: Math.round((amount + items) * 100) / 100,
    currentRate: rateAt(findRate(pricing, inp.type, curMode), new Date(endMs)),
    remainingMinutes: inp.prepaidMinutes ? inp.prepaidMinutes - minutes : null,
    elapsedMs,
  };
}
