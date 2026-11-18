// =====================================================================================
//  tafqeet.ts  -  تحويل المبلغ لحروف عربي (تفقيط)
//    tafqeet(1250.5, "EGP") => "ألف ومائتان وخمسون جنيهًا مصريًا وخمسون قرشًا"  (تقريبًا)
//  القواعد مبسطة (من غير إعراب كامل) وكافية للفواتير والشيكات.
// =====================================================================================

const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

/** [مفرد, مثنى, جمع (3-10), مفرد منصوب (11+)] */
type Forms = [string, string, string, string];
const GROUPS: Forms[] = [
  ["", "", "", ""],
  ["ألف", "ألفان", "آلاف", "ألفًا"],
  ["مليون", "مليونان", "ملايين", "مليونًا"],
  ["مليار", "ملياران", "مليارات", "مليارًا"],
  ["تريليون", "تريليونان", "تريليونات", "تريليونًا"],
];

interface Currency { main: Forms; sub: Forms; subUnits: number }
const CURRENCIES: Record<string, Currency> = {
  EGP: { main: ["جنيه مصري", "جنيهان مصريان", "جنيهات مصرية", "جنيهًا مصريًا"], sub: ["قرش", "قرشان", "قروش", "قرشًا"], subUnits: 100 },
  SAR: { main: ["ريال سعودي", "ريالان سعوديان", "ريالات سعودية", "ريالًا سعوديًا"], sub: ["هللة", "هللتان", "هللات", "هللة"], subUnits: 100 },
  AED: { main: ["درهم إماراتي", "درهمان إماراتيان", "دراهم إماراتية", "درهمًا إماراتيًا"], sub: ["فلس", "فلسان", "فلوس", "فلسًا"], subUnits: 100 },
  KWD: { main: ["دينار كويتي", "ديناران كويتيان", "دنانير كويتية", "دينارًا كويتيًا"], sub: ["فلس", "فلسان", "فلوس", "فلسًا"], subUnits: 1000 },
  BHD: { main: ["دينار بحريني", "ديناران بحرينيان", "دنانير بحرينية", "دينارًا بحرينيًا"], sub: ["فلس", "فلسان", "فلوس", "فلسًا"], subUnits: 1000 },
  OMR: { main: ["ريال عماني", "ريالان عمانيان", "ريالات عمانية", "ريالًا عمانيًا"], sub: ["بيسة", "بيستان", "بيسات", "بيسة"], subUnits: 1000 },
  QAR: { main: ["ريال قطري", "ريالان قطريان", "ريالات قطرية", "ريالًا قطريًا"], sub: ["درهم", "درهمان", "دراهم", "درهمًا"], subUnits: 100 },
  JOD: { main: ["دينار أردني", "ديناران أردنيان", "دنانير أردنية", "دينارًا أردنيًا"], sub: ["فلس", "فلسان", "فلوس", "فلسًا"], subUnits: 1000 },
  USD: { main: ["دولار أمريكي", "دولاران أمريكيان", "دولارات أمريكية", "دولارًا أمريكيًا"], sub: ["سنت", "سنتان", "سنتات", "سنتًا"], subUnits: 100 },
  EUR: { main: ["يورو", "يورو", "يورو", "يورو"], sub: ["سنت", "سنتان", "سنتات", "سنتًا"], subUnits: 100 },
};

/** 1..999 بالحروف */
function below1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (r) {
    if (r < 10) parts.push(ONES[r]);
    else if (r < 20) parts.push(TEENS[r - 10]);
    else { const o = r % 10, t = Math.floor(r / 10); parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t]); }
  }
  return parts.join(" و");
}

function formFor(n: number, f: Forms): string {
  const r = n % 100;
  if (n === 1) return f[0];
  if (n === 2) return f[1];
  if (r >= 3 && r <= 10) return f[2];
  if (r >= 11) return f[3] || f[0];          // 11..99 ← تمييز منصوب (خمسة عشر جنيهًا)، 100/1000 ← مفرد مجرور (مائة جنيه)
  return f[0];
}

/** عدد صحيح بالحروف */
export function numberToArabicWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "صفر";
  const groups: number[] = [];
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    if (i === 0) { parts.push(below1000(g)); continue; }
    const forms = GROUPS[i] || GROUPS[GROUPS.length - 1];
    if (g === 1) parts.push(forms[0]);
    else if (g === 2) parts.push(forms[1]);
    else if (g % 100 >= 3 && g % 100 <= 10 && g < 100) parts.push(`${below1000(g)} ${forms[2]}`);
    else parts.push(`${below1000(g)} ${formFor(g, forms)}`);
  }
  return parts.join(" و");
}

function withUnit(n: number, f: Forms): string {
  if (n === 1) return f[0];
  if (n === 2) return f[1];
  return `${numberToArabicWords(n)} ${formFor(n, f)}`;
}

/** المبلغ بالحروف + العملة. العملة غير المعروفة بتتكتب زي ما هي. */
export function tafqeet(amount: number, currency = "EGP"): string {
  if (!isFinite(amount)) return "";
  const cur = CURRENCIES[(currency || "").toUpperCase()];
  const neg = amount < 0;
  amount = Math.abs(amount);
  const subUnits = cur?.subUnits ?? 100;
  const digits = subUnits === 1000 ? 3 : 2;
  let whole = Math.floor(amount);
  let frac = Math.round((amount - whole) * Math.pow(10, digits));
  if (frac >= subUnits) { whole += 1; frac -= subUnits; }
  let text: string;
  if (cur) {
    text = whole ? withUnit(whole, cur.main) : `صفر ${cur.main[0]}`;
    if (frac) text += ` و${withUnit(frac, cur.sub)}`;
  } else {
    text = numberToArabicWords(whole) + (currency ? ` ${currency}` : "");
    if (frac) text += ` و${numberToArabicWords(frac)} من ${subUnits}`;
  }
  return (neg ? "سالب " : "") + text;
}
