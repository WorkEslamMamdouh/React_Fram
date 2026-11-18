// =====================================================================================
//  expr.ts  -  لغة تعبيرات صغيرة وآمنة للتقارير (من غير eval)
//    Qty * UnitPrice            header.NetAmount           Company.CompNameA
//    sum(ItemTotal)             count()                    if(IsCash = 1, 'نقدي', 'آجل')
//    tafqeet(header.NetAmount, 'SAR')                      format(TrDate, 'date')
//  النص فيه {{ تعبير }} بيتحسب بـ interpolate().
// =====================================================================================

import { formatValue } from "./format";
import { tafqeet } from "./tafqeet";
import { zatcaTlvBase64 } from "./zatca";

type Tok = { t: "num" | "str" | "id" | "op" | "end"; v: any };

const OPS = ["<=", ">=", "<>", "!=", "==", "&&", "||", "+", "-", "*", "/", "%", "(", ")", ",", "<", ">", "=", "!", "?", ":", "."];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: "num", v: parseFloat(src.slice(i, j)) }); i = j; continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== ch) { if (src[j] === "\\" && j + 1 < src.length) { s += src[j + 1]; j += 2; } else s += src[j++]; }
      out.push({ t: "str", v: s }); i = j + 1; continue;
    }
    if (/[A-Za-z_؀-ۿ\[]/.test(ch)) {
      if (ch === "[") { const j = src.indexOf("]", i); const name = src.slice(i + 1, j < 0 ? src.length : j); out.push({ t: "id", v: name }); i = j < 0 ? src.length : j + 1; continue; }
      let j = i; while (j < src.length && /[A-Za-z0-9_؀-ۿ]/.test(src[j])) j++;
      out.push({ t: "id", v: src.slice(i, j) }); i = j; continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new Error(`Unexpected '${ch}' in expression`);
    out.push({ t: "op", v: op }); i += op.length;
  }
  out.push({ t: "end", v: null });
  return out;
}

export type Node =
  | { k: "lit"; v: any }
  | { k: "path"; p: string[] }
  | { k: "call"; f: string; a: Node[] }
  | { k: "un"; op: string; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "tern"; c: Node; a: Node; b: Node };

const PREC: Record<string, number> = { "||": 1, "&&": 2, "=": 3, "==": 3, "!=": 3, "<>": 3, "<": 4, ">": 4, "<=": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };

function parse(src: string): Node {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expect = (v: string) => { const t = next(); if (t.t !== "op" || t.v !== v) throw new Error(`Expected '${v}'`); };

  function primary(): Node {
    const t = next();
    if (t.t === "num" || t.t === "str") return { k: "lit", v: t.v };
    if (t.t === "op" && t.v === "(") { const e = expr(0); expect(")"); return e; }
    if (t.t === "op" && (t.v === "-" || t.v === "!")) return { k: "un", op: t.v, a: primary() };
    if (t.t === "id") {
      const low = String(t.v).toLowerCase();
      if (low === "true") return { k: "lit", v: true };
      if (low === "false") return { k: "lit", v: false };
      if (low === "null") return { k: "lit", v: null };
      if (peek().t === "op" && peek().v === "(") {
        next();
        const args: Node[] = [];
        if (!(peek().t === "op" && peek().v === ")")) {
          for (;;) { args.push(expr(0)); if (peek().t === "op" && peek().v === ",") { next(); continue; } break; }
        }
        expect(")");
        return { k: "call", f: low, a: args };
      }
      const path = [String(t.v)];
      while (peek().t === "op" && peek().v === ".") { next(); const n = next(); if (n.t !== "id" && n.t !== "num") throw new Error("Bad path"); path.push(String(n.v)); }
      return { k: "path", p: path };
    }
    throw new Error("Unexpected end of expression");
  }

  function expr(min: number): Node {
    let left = primary();
    for (;;) {
      const t = peek();
      if (t.t !== "op") break;
      if (t.v === "?" && min === 0) {
        next(); const a = expr(0); expect(":"); const b = expr(0);
        left = { k: "tern", c: left, a, b }; continue;
      }
      const pr = PREC[t.v];
      if (pr === undefined || pr <= min - 1 || pr < min) break;
      next();
      const right = expr(pr + 1);
      left = { k: "bin", op: t.v, a: left, b: right };
    }
    return left;
  }

  const n = expr(0);
  if (peek().t !== "end") throw new Error("Unexpected token in expression");
  return n;
}

const cache = new Map<string, Node>();
export function compile(src: string): Node {
  let n = cache.get(src);
  if (!n) { n = parse(src); if (cache.size > 2000) cache.clear(); cache.set(src, n); }
  return n;
}

// ---------------------------------------------------------------- evaluation

export interface EvalScope {
  /** الصف الحالي */
  row?: Record<string, any>;
  /** أول صف من جدول header */
  header?: Record<string, any>;
  company?: Record<string, any>;
  params?: Record<string, any>;
  tables?: Record<string, Record<string, any>[]>;
  /** الصفوف اللي بتتجمع عليها sum/count/... (مجموعة / صفحة / التقرير) */
  aggRows?: Record<string, any>[];
  page?: number;
  pages?: number;
  lang?: "ar" | "en";
  /** رقم الصف داخل الجدول (من 1) */
  rowNumber?: number;
}

function getCI(o: any, key: string): any {
  if (o == null || typeof o !== "object") return undefined;
  if (key in o) return o[key];
  const k = Object.keys(o).find((x) => x.toLowerCase() === key.toLowerCase());
  return k ? o[k] : undefined;
}

const num = (v: any) => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, "")); return isFinite(n) ? n : 0; };
const isEmpty = (v: any) => v === null || v === undefined || v === "";

function resolvePath(p: string[], s: EvalScope): any {
  const head = p[0];
  const low = head.toLowerCase();
  let base: any;
  let rest = p.slice(1);
  if (low === "header" && p.length > 1) base = s.header;
  else if (low === "company" && p.length > 1) base = s.company;
  else if (low === "params" && p.length > 1) base = s.params;
  else if (low === "row" && p.length > 1) base = s.row;
  else if (low === "tables" && p.length > 1) base = s.tables;
  else if (low === "page" && p.length === 1) return s.page ?? 1;
  else if (low === "pages" && p.length === 1) return s.pages ?? 1;
  else if (low === "rownumber" && p.length === 1) return s.rowNumber ?? 0;
  else if (low === "today" && p.length === 1) return new Date();
  else if (low === "now" && p.length === 1) return new Date();
  else if (low === "lang" && p.length === 1) return s.lang ?? "ar";
  else {
    // الحقل من الصف الحالي، وإلا من header، وإلا من الشركة
    rest = p.slice(1);
    base = undefined;
    const fromRow = getCI(s.row, head);
    if (fromRow !== undefined) base = fromRow;
    else if (getCI(s.header, head) !== undefined) base = getCI(s.header, head);
    else base = getCI(s.company, head);
    for (const k of rest) base = getCI(base, k);
    return base;
  }
  for (const k of rest) base = getCI(base, k);
  return base;
}

function aggregate(fn: string, args: Node[], s: EvalScope): any {
  // sum(Field) | sum(Field, 'tableAlias') | count() | count('tableAlias')
  let rows = s.aggRows ?? [];
  const fieldNode: Node | undefined = args[0];
  if (fn === "count") {
    if (args[0] && args[0].k === "lit" && typeof args[0].v === "string" && s.tables?.[args[0].v]) rows = s.tables[args[0].v];
    return rows.length;
  }
  if (args[1] && args[1].k === "lit" && typeof args[1].v === "string") rows = s.tables?.[args[1].v] ?? [];
  if (!fieldNode) return 0;
  const vals = rows.map((r) => evalNode(fieldNode!, { ...s, row: r })).filter((v) => !isEmpty(v)).map(num);
  if (fn === "sum") return vals.reduce((a, b) => a + b, 0);
  if (fn === "avg") return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  if (fn === "min") return vals.length ? Math.min(...vals) : 0;
  if (fn === "max") return vals.length ? Math.max(...vals) : 0;
  return 0;
}

function callFn(f: string, args: Node[], s: EvalScope): any {
  if (f === "sum" || f === "count" || f === "avg" || f === "min" || f === "max") return aggregate(f, args, s);
  if (f === "if" || f === "iif") return evalNode(args[0], s) ? evalNode(args[1], s) : (args[2] ? evalNode(args[2], s) : "");
  const a = args.map((x) => evalNode(x, s));
  switch (f) {
    case "coalesce": return a.find((v) => !isEmpty(v)) ?? "";
    case "concat": return a.map((v) => (v == null ? "" : String(v))).join("");
    case "upper": return String(a[0] ?? "").toUpperCase();
    case "lower": return String(a[0] ?? "").toLowerCase();
    case "trim": return String(a[0] ?? "").trim();
    case "substr": return String(a[0] ?? "").substr(num(a[1]), a[2] === undefined ? undefined : num(a[2]));
    case "len": return String(a[0] ?? "").length;
    case "round": { const d = a[1] === undefined ? 0 : num(a[1]); const m = Math.pow(10, d); return Math.round(num(a[0]) * m) / m; }
    case "abs": return Math.abs(num(a[0]));
    case "number": return num(a[0]);
    case "format": return formatValue(a[0], String(a[1] ?? "text") as any, s.lang ?? "ar");
    case "date": return formatValue(a[0], "date", s.lang ?? "ar");
    case "tafqeet": return tafqeet(num(a[0]), String(a[1] ?? "EGP"));
    case "t": return (s.lang ?? "ar") === "en" ? (a[1] ?? a[0]) : a[0];          // t('عربي', 'English')
    case "zatcaqr": {
      // zatcaQr(seller, vatNo, timestamp, total, vat) — كل القيم اختيارية (الافتراضي من الشركة و header)
      const h = s.header ?? {}, c = s.company ?? {};
      const seller = a[0] ?? (c.CompNameA || c.CompNameE || "");
      const vatNo = a[1] ?? (c.VatNo || "");
      const ts = a[2] ?? (getCI(h, "SaleDate") || getCI(h, "TrDate") || new Date());
      const total = a[3] ?? (getCI(h, "NetAmount") ?? 0);
      const vat = a[4] ?? (getCI(h, "VatAmount") ?? 0);
      return zatcaTlvBase64(String(seller), String(vatNo), ts, num(total), num(vat));
    }
    default: throw new Error(`Unknown function ${f}()`);
  }
}

function cmp(a: any, b: any): number {
  if (typeof a === "number" || typeof b === "number") { const x = num(a), y = num(b); return x === y ? 0 : x < y ? -1 : 1; }
  const x = String(a ?? ""), y = String(b ?? ""); return x === y ? 0 : x < y ? -1 : 1;
}

export function evalNode(n: Node, s: EvalScope): any {
  switch (n.k) {
    case "lit": return n.v;
    case "path": return resolvePath(n.p, s);
    case "call": return callFn(n.f, n.a, s);
    case "un": { const v = evalNode(n.a, s); return n.op === "-" ? -num(v) : !v; }
    case "tern": return evalNode(n.c, s) ? evalNode(n.a, s) : evalNode(n.b, s);
    case "bin": {
      if (n.op === "&&") return evalNode(n.a, s) && evalNode(n.b, s);
      if (n.op === "||") return evalNode(n.a, s) || evalNode(n.b, s);
      const a = evalNode(n.a, s), b = evalNode(n.b, s);
      switch (n.op) {
        case "+": return (typeof a === "string" && isNaN(Number(a))) || (typeof b === "string" && isNaN(Number(b))) ? `${a ?? ""}${b ?? ""}` : num(a) + num(b);
        case "-": return num(a) - num(b);
        case "*": return num(a) * num(b);
        case "/": return num(b) === 0 ? 0 : num(a) / num(b);
        case "%": return num(b) === 0 ? 0 : num(a) % num(b);
        case "=": case "==": return cmp(a, b) === 0;
        case "!=": case "<>": return cmp(a, b) !== 0;
        case "<": return cmp(a, b) < 0;
        case ">": return cmp(a, b) > 0;
        case "<=": return cmp(a, b) <= 0;
        case ">=": return cmp(a, b) >= 0;
      }
    }
  }
  return undefined;
}

/** يحسب تعبير. أي خطأ بيرجع "#ERR" (والتقرير مايقفش). */
export function evaluate(src: string | undefined | null, s: EvalScope): any {
  if (src == null || String(src).trim() === "") return "";
  try { return evalNode(compile(String(src)), s); }
  catch (e) { console.warn("[report] expression error:", src, e); return "#ERR"; }
}

/** نص فيه {{تعبيرات}} — كل تعبير ممكن يكون "expr | format" */
export function interpolate(text: string | undefined | null, s: EvalScope): string {
  if (!text) return "";
  return String(text).replace(/\{\{([\s\S]+?)\}\}/g, (_, body: string) => {
    const bar = body.lastIndexOf("|");
    let ex = body, fmt: string | null = null;
    if (bar > 0 && body[bar + 1] !== "|" && body[bar - 1] !== "|") { ex = body.slice(0, bar); fmt = body.slice(bar + 1).trim(); }
    const v = evaluate(ex, s);
    return formatValue(v, (fmt || "auto") as any, s.lang ?? "ar");
  });
}
