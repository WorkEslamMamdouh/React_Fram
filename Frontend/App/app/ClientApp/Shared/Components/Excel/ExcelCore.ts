// =====================================================================================
//  📄 Shared/Components/Excel/ExcelCore.ts  —  منطق نقي (من غير React / قاعدة بيانات)
// -------------------------------------------------------------------------------------
//  • تطبيع النصوص (عربي/إنجليزي)        • فهرس قوائم الاختيار (كود / اسم / مفتاح)
//  • تحويل نص الخلية لقيمة حسب النوع    • تجهيز صف المعاينة وتجميع المعاملات
// =====================================================================================

import {
  ExcelColumnSpec, ExcelLookupData, ExcelLookupItem, ExcelLookups, ImportRecord, PreviewRow, RawExcelRow, colKey,
} from "./ExcelTypes";

// ------------------------- تطبيع النصوص -------------------------
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

/** تطبيع للمقارنة: حروف صغيرة، من غير تشكيل/تطويل، همزات ألف موحدة، مسافات مختصرة */
export function normText(v: any): string {
  if (v === null || v === undefined) return "";
  return toLatinDigits(String(v))
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const isBlank = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

// ------------------------- فهرس القوائم -------------------------
export class LookupIndex {
  private byLabel = new Map<string, ExcelLookupItem>();
  private byCode = new Map<string, ExcelLookupItem>();
  private byName = new Map<string, ExcelLookupItem[]>();
  private byKey = new Map<string, ExcelLookupItem>();
  readonly items: ExcelLookupItem[];
  readonly truncated: boolean;

  constructor(data: ExcelLookupData | undefined) {
    this.items = data?.items || [];
    this.truncated = !!data?.truncated;
    for (const it of this.items) this.add(it);
  }

  add(it: ExcelLookupItem) {
    this.byLabel.set(normText(it.label), it);
    if (!isBlank(it.code)) this.byCode.set(normText(it.code), it);
    if (!isBlank(it.name)) {
      const k = normText(it.name);
      const arr = this.byName.get(k);
      if (arr) arr.push(it); else this.byName.set(k, [it]);
    }
    this.byKey.set(normText(it.key), it);
  }

  /** بيرجّع العنصر أو null (أو "ambiguous" لو الاسم مكرر) */
  match(text: string): ExcelLookupItem | null | "ambiguous" {
    const k = normText(text);
    if (!k) return null;
    const l = this.byLabel.get(k);
    if (l) return l;
    const c = this.byCode.get(k);
    if (c) return c;
    const n = this.byName.get(k);
    if (n) return n.length === 1 ? n[0] : "ambiguous";
    const key = this.byKey.get(k);
    if (key) return key;
    return null;
  }
}

export function buildIndexes(lookups: ExcelLookups): Record<string, LookupIndex> {
  const out: Record<string, LookupIndex> = {};
  for (const k of Object.keys(lookups)) out[k] = new LookupIndex(lookups[k]);
  return out;
}

export function makeLabel(code: any, name: any, key: any): string {
  const c = isBlank(code) ? "" : String(code).trim();
  const n = isBlank(name) ? "" : String(name).trim();
  if (c && n && c !== n) return `${c} - ${n}`;
  return n || c || String(key);
}

// ------------------------- النص ← قيمة -------------------------
const TRUE_WORDS = new Set(["1", "true", "yes", "y", "نعم", "ايوه", "ايوا", "صح", "صحيح", "فعال", "x", "✓", "√"]);
const FALSE_WORDS = new Set(["0", "false", "no", "n", "لا", "خطا", "خطأ", "غير فعال", "✗"]);

export function parseBool(text: string): boolean | null {
  const k = normText(text);
  if (TRUE_WORDS.has(k)) return true;
  if (FALSE_WORDS.has(k)) return false;
  return null;
}

export function parseNumber(text: string): number | null {
  let s = toLatinDigits(String(text)).replace(/ /g, " ").trim();
  if (s === "") return null;
  s = s.replace(/٫/g, ".").replace(/٬/g, ",").replace(/[\s]/g, "");
  // 1,234.56  |  1.234,56  |  1234,56
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s) || /^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

const pad2 = (n: number) => (n < 10 ? "0" + n : String(n));

export function isoFromParts(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** رقم تسلسلي في الإكسل ← yyyy-mm-dd */
export function isoFromSerial(serial: number): string | null {
  if (!isFinite(serial) || serial < 1 || serial > 120000) return null;
  const ms = Math.round((serial - 25569) * 86400000);
  const d = new Date(ms);
  return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function parseDate(text: string): string | null {
  const s = toLatinDigits(String(text)).trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return isoFromParts(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s].*)?$/.exec(s);
  if (m) {
    // يوم/شهر/سنة (الأشهر عندنا) — لو الشهر > 12 نبدّل
    const a = +m[1], b = +m[2];
    return isoFromParts(+m[3], b > 12 && a <= 12 ? a : b, b > 12 && a <= 12 ? b : a);
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) return isoFromSerial(Number(s));
  return null;
}

export interface ConvertResult { value: any; error?: string; item?: ExcelLookupItem }

/** يحوّل نص الخلية لقيمة حسب نوع العمود. isAr = لغة الرسائل */
export function convertCell(col: ExcelColumnSpec, text: string, index: LookupIndex | undefined, isAr: boolean): ConvertResult {
  const L = (ar: string, en: string) => (isAr ? ar : en);
  if (isBlank(text)) return { value: null };
  const t = String(text).trim();

  // قوائم (اختيارات ثابتة أو من القاعدة)
  if (col.options && col.options.length > 0) {
    const k = normText(t);
    const o = col.options.find((x) => normText(x.label) === k || normText(x.value) === k);
    if (!o) return { value: null, error: L(`"${t}" مش من الاختيارات المسموحة`, `"${t}" is not an allowed option`) };
    return { value: o.value };
  }
  if (col.lookup) {
    if (!index) return { value: t };
    const m = index.match(t);
    if (m === "ambiguous") return { value: null, error: L(`"${t}" مكرر في القائمة — استخدم الكود`, `"${t}" is ambiguous — use the code`) };
    if (!m) return { value: null, error: L(`"${t}" مش موجود في القائمة`, `"${t}" was not found in the list`) };
    const key = typeof m.key === "string" && col.type !== "text" && parseNumber(m.key) !== null ? Number(m.key) : m.key;
    return { value: key, item: m };
  }

  switch (col.type) {
    case "number":
    case "decimal": {
      const n = parseNumber(t);
      if (n === null) return { value: null, error: L(`"${t}" مش رقم`, `"${t}" is not a number`) };
      return { value: n };
    }
    case "date": {
      const d = parseDate(t);
      if (!d) return { value: null, error: L(`"${t}" مش تاريخ صحيح (اكتب yyyy-mm-dd)`, `"${t}" is not a valid date (use yyyy-mm-dd)`) };
      return { value: d };
    }
    case "bool": {
      const b = parseBool(t);
      if (b === null) return { value: null, error: L(`"${t}" لازم تكون نعم أو لا`, `"${t}" must be Yes or No`) };
      return { value: b };
    }
    default:
      return { value: t };
  }
}

// ------------------------- تجهيز صف المعاينة -------------------------

export interface ComputeCtx {
  columns: ExcelColumnSpec[];
  indexes: Record<string, LookupIndex>;
  isAr: boolean;
}

/** يحسب القيم والأخطاء على مستوى الأعمدة من النص الخام (بيتنادى بعد أي تعديل) */
export function computeRow(row: PreviewRow, ctx: ComputeCtx): PreviewRow {
  const L = (ar: string, en: string) => (ctx.isAr ? ar : en);
  const values: Record<string, any> = {};
  const errors: Record<string, string> = {};
  // الصفوف اللي مش أول صف في معاملة: أعمدة الماستر موروثة (مش بتتحسب)
  const cols = ctx.columns.filter((c) => c.scope === "detail" || row.first);

  // 1) تحويل كل خلية
  const items: Record<string, ExcelLookupItem> = {};
  for (const c of cols) {
    const k = colKey(c);
    const r = convertCell(c, row.raw[k] ?? "", ctx.indexes[k], ctx.isAr);
    if (r.error) errors[k] = r.error;
    values[k] = r.value;
    if (r.item) items[k] = r.item;
  }
  // 2) تعبئة أعمدة من الصف المختار (fill) — بس لو الخلية فاضية في الإكسل
  for (const c of cols) {
    const k = colKey(c);
    const it = items[k];
    if (!it || !c.lookup?.fill || !it.extra) continue;
    for (const [target, src] of Object.entries(c.lookup.fill)) {
      const tk = (c.scope === "master" ? "m." : "d.") + target;
      if (isBlank(values[tk]) && !(tk in errors)) values[tk] = it.extra[src];
    }
  }
  // 3) القيمة الافتراضية للأعمدة الفاضية
  for (const c of cols) {
    const k = colKey(c);
    if (isBlank(values[k]) && !isBlank(c.defaultValue)) values[k] = c.defaultValue;
  }
// إجباري + تحقق مخصص
  const byScope = (scope: "master" | "detail") => {
    const o: Record<string, any> = {};
    for (const k of Object.keys(values)) if (k.startsWith(scope === "master" ? "m." : "d.")) o[k.substring(2)] = values[k];
    return o;
  };
  const mRow = byScope("master");
  const dRow = byScope("detail");
  for (const c of cols) {
    const k = colKey(c);
    if (errors[k]) continue;
    const v = values[k];
    if (c.required && isBlank(v)) {
      errors[k] = L("مطلوب", "Required");
      continue;
    }
    if (c.isValid && !isBlank(v)) {
      let ok = true;
      try { ok = c.isValid(v, c.scope === "master" ? mRow : dRow); } catch { ok = true; }
      if (!ok) errors[k] = c.validationMessage || L("قيمة غير صالحة", "Invalid value");
    }
  }
  return { ...row, values, errors };
}

/** تحقق على مستوى المعاملة (multi): تعارض بيانات الماستر بين الصفوف + صف من غير رقم معاملة */
export function groupChecks(rows: PreviewRow[], ctx: ComputeCtx, mode: "grid" | "multi" | "details"): PreviewRow[] {
  if (mode !== "multi") return rows;
  const L = (ar: string, en: string) => (ctx.isAr ? ar : en);
  const masterCols = ctx.columns.filter((c) => c.scope === "master");
  const first = rows[0];
  return rows.map((r, i) => {
    let errors = r.errors;
    if (!(r.group ?? "").trim()) errors = { ...errors, _: L("رقم المعاملة (GroupNo) فاضي", "GroupNo is empty") };
    if (i > 0 && first) {
      for (const c of masterCols) {
        const k = colKey(c);
        const a = normText(first.raw[k] ?? ""), b = normText(r.raw[k] ?? "");
        if (b !== "" && a !== b) {
          errors = { ...errors, [k]: L(`مختلفة عن الصف الأول للمعاملة ${r.group} (${first.raw[k] ?? ""})`, `Differs from the first row of group ${r.group} (${first.raw[k] ?? ""})`) };
        }
      }
    }
    return errors === r.errors ? r : { ...r, errors };
  });
}

/** يعيد حساب كل صفوف المعاملة (بعد تعديل أو حذف) */
export function recomputeRecord(rec: ImportRecord, ctx: ComputeCtx, mode: "grid" | "multi" | "details"): ImportRecord {
  let rows = rec.rows.map((r, i) => computeRow({ ...r, first: i === 0 }, ctx));
  rows = groupChecks(rows, ctx, mode);
  return { ...rec, rows };
}

/** يبني المعاملات من الصفوف الخام (جريد/تفاصيل: كل صف معاملة · multi: بالتجميع على GroupNo) */
export function buildRecords(
  raws: RawExcelRow[],
  mode: "grid" | "multi" | "details",
  ctx: ComputeCtx,
): ImportRecord[] {
  let rid = 0;
  const mk = (r: RawExcelRow, first: boolean): PreviewRow =>
    computeRow({ id: ++rid, excelRow: r.excelRow, group: r.group, first, raw: { ...r.raw }, values: {}, errors: {} }, ctx);

  if (mode !== "multi") {
    return raws.map((r, i) => ({ id: i + 1, rows: [mk(r, true)], issues: [] }));
  }

  const order: string[] = [];
  const groups = new Map<string, RawExcelRow[]>();
  const orphans: RawExcelRow[] = [];
  for (const r of raws) {
    const g = (r.group ?? "").trim();
    if (!g) { orphans.push(r); continue; }
    if (!groups.has(g)) { groups.set(g, []); order.push(g); }
    groups.get(g)!.push(r);
  }
  const out: ImportRecord[] = [];
  let recId = 0;
  for (const g of order) {
    const rows = groupChecks(groups.get(g)!.map((r, i) => mk(r, i === 0)), ctx, mode);
    out.push({ id: ++recId, group: g, rows, issues: [] });
  }
  for (const r of orphans) {
    out.push({ id: ++recId, rows: groupChecks([mk(r, true)], ctx, mode), issues: [] });
  }
  return out;
}
/** اسم عمود الرقم المسلسل للمعاملة */
export const GROUP_HEADERS = ["groupno", "group no", "group", "رقم المعاملة", "رقم العملية", "رقم الفاتورة", "معاملة"];
export const ERROR_HEADERS = ["رسالة الخطا", "رسالة الخطأ", "error", "error message", "errors"];
