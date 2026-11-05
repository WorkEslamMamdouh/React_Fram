// =====================================================================================
//  📄 Shared/Validation.ts  —  نظام التحقق قبل الحفظ (Validations)
// -------------------------------------------------------------------------------------
//  بيشتغل مع:
//    • شاشات الماستر ديتيل (MasterDetail)   → RunValidations(...)
//    • شاشات الجدول العادية (DynamicGrid)    → ValidateRow(...)  عن طريق beforeSave
//
//  كل قاعدة (ValidationRule) ليها نوع:
//    required    : الحقل لازم يتملى
//    compare     : مقارنة حقل بحقل تاني أو بقيمة   (مثلاً DueDate >= TrDate)
//    range       : رقم بين min و max
//    regex       : النص لازم يطابق شكل معين (موبايل / إيميل ...)
//    unique      : القيمة متتكررش في الجدول (بيستثني الصف اللي بيتعدّل)
//    exists      : لازم يكون فيه صف في أي جدول بالشرط ده   (مثلاً العميل ليه عنوان)
//    notExists   : لازم ميكونش فيه صف بالشرط ده
//    noDuplicate : نفس القيمة متتكررش في صفوف التفاصيل
//    minRows     : أقل عدد صفوف في التفاصيل
//    custom      : دالة بتكتبها بإيدك وترجّع رسالة الخطأ أو null
//
//  الشرط (condition) بتكتب فيه أسماء الحقول بين { } وهي بتتبدل بقيمها:
//    {CustomerID}          → قيمة الحقل في الصف الحالي
//    {Master.CustomerID}   → قيمة الحقل في الماستر (لما القاعدة على صفوف التفاصيل)
//  مثال:  "CustomerID = {CustomerID} AND ISNULL(Address, '') <> ''"
// =====================================================================================

import { SQL } from "./CallDataBase";

export type ValidationType =
  | "required"
  | "compare"
  | "range"
  | "regex"
  | "unique"
  | "exists"
  | "notExists"
  | "noDuplicate"
  | "minRows"
  | "custom";

export type CompareOperator = "=" | "!=" | ">" | ">=" | "<" | "<=";

export interface ValidationContext {
  row: Record<string, any>;            // الصف اللي بيتشيك عليه (الماستر أو صف تفاصيل)
  master: Record<string, any>;         // الماستر
  details: Record<string, any>[][];    // details[0] = صفوف التفاصيل الأولى ...
  isInsert: boolean;                   // إضافة ولا تعديل
  rowIndex?: number;                   // رقم صف التفاصيل (من 0)
}

export interface ValidationRule {
  type: ValidationType;
  field?: string;                      // الحقل اللي عليه القاعدة
  detail?: number;                     // لو القاعدة على صفوف تفاصيل: رقمها (1 = أول تفاصيل)
  when?: "insert" | "update" | "both"; // امتى تتشيك (الافتراضي both)

  operator?: CompareOperator;          // compare
  compareTo?: string;                  // compare: حقل تاني (أو Master.Field)
  value?: any;                         // compare: قيمة ثابتة
  min?: number;                        // range / minRows
  max?: number;                        // range
  pattern?: string;                    // regex
  table?: string;                      // unique / exists / notExists
  condition?: string;                  // exists / notExists  (فيه {Field})
  check?: (ctx: ValidationContext) => string | null | undefined | Promise<string | null | undefined>; // custom

  messageEn: string;
  messageAr: string;
}

export interface ValidationError {
  message: string;
  field?: string;
  detail?: number;                     // 1..5
  rowIndex?: number;                   // من 0
}

export interface ValidationOptions {
  isInsert: boolean;
  isLangEN: boolean;
  tableName: string;                   // جدول الماستر (للـ unique)
  keyColumn: string;                   // مفتاح الماستر
  details?: { tableName: string; keyColumn: string }[];  // جداول التفاصيل (للـ unique على التفاصيل)
}

// =====================================================================================
// أدوات صغيرة
// =====================================================================================
const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

const isNumeric = (v: any) => typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()));

// قيمة لـ SQL: رقم زي ما هو، نص بين N'...'، فاضي = NULL
export function SqlLiteral(v: any): string {
  if (isEmpty(v)) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (isNumeric(v)) return String(v).trim();
  return "N'" + String(v).replace(/'/g, "''") + "'";
}

// بيبدّل {Field} و {Master.Field} بالقيم
export function FillPlaceholders(text: string, row: Record<string, any>, master: Record<string, any>, forSql: boolean): string {
  return (text || "").replace(/\{(Master\.)?(\w+)\}/g, (_m, isMaster, name) => {
    const v = isMaster ? master?.[name] : row?.[name];
    return forSql ? SqlLiteral(v) : (isEmpty(v) ? "" : String(v));
  });
}

function getValue(path: string, ctx: ValidationContext): any {
  if (path.startsWith("Master.")) return ctx.master?.[path.substring(7)];
  return ctx.row?.[path];
}

function compareValues(a: any, b: any, op: CompareOperator): boolean {
  let x: any = a, y: any = b;
  if (isNumeric(a) && isNumeric(b)) {
    x = Number(a); y = Number(b);
  } else if (!isNaN(Date.parse(a)) && !isNaN(Date.parse(b)) && /\d{4}-\d{2}-\d{2}/.test(String(a))) {
    x = Date.parse(a); y = Date.parse(b);
  } else {
    x = String(a ?? ""); y = String(b ?? "");
  }
  switch (op) {
    case "=": return x === y;
    case "!=": return x !== y;
    case ">": return x > y;
    case ">=": return x >= y;
    case "<": return x < y;
    case "<=": return x <= y;
  }
  return true;
}

// بيجيب أول صف من أي جدول بشرط — بيرمي خطأ لو الخادم رجّع خطأ
async function firstRow(table: string, condition: string): Promise<any | null> {
  const res = await SQL.Querys([{ NameTable: table, Condition: condition, Top: 1, OrderByID: "1" }], null, null);
  if (!Array.isArray(res)) throw new Error(String(res || "Server error"));
  const rows = res[0];
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function message(rule: ValidationRule, ctx: ValidationContext, isEN: boolean): string {
  return FillPlaceholders(isEN ? rule.messageEn : rule.messageAr, ctx.row, ctx.master, false);
}

// =====================================================================================
// تشغيل قاعدة واحدة على صف واحد  → رسالة الخطأ أو null
// =====================================================================================
async function checkRule(rule: ValidationRule, ctx: ValidationContext, opt: ValidationOptions): Promise<string | null> {
  const v = rule.field ? getValue(rule.field, ctx) : undefined;
  const msg = () => message(rule, ctx, opt.isLangEN);

  switch (rule.type) {
    case "required":
      return isEmpty(v) ? msg() : null;

    case "compare": {
      if (isEmpty(v)) return null;
      const other = rule.compareTo ? getValue(rule.compareTo, ctx) : rule.value;
      if (isEmpty(other)) return null;
      return compareValues(v, other, rule.operator || "=") ? null : msg();
    }

    case "range": {
      if (isEmpty(v)) return null;
      const n = Number(v);
      if (isNaN(n)) return msg();
      if (rule.min !== undefined && n < rule.min) return msg();
      if (rule.max !== undefined && n > rule.max) return msg();
      return null;
    }

    case "regex":
      if (isEmpty(v) || !rule.pattern) return null;
      return new RegExp(rule.pattern).test(String(v)) ? null : msg();

    case "unique": {
      if (isEmpty(v) || !rule.field) return null;
      // الجدول: اللي في القاعدة، أو جدول الماستر/التفاصيل
      const meta = rule.detail ? opt.details?.[rule.detail - 1] : { tableName: opt.tableName, keyColumn: opt.keyColumn };
      const table = rule.table || meta?.tableName || opt.tableName;
      const key = meta?.keyColumn || opt.keyColumn;
      let cond = `${rule.field} = ${SqlLiteral(v)}`;
      if (!ctx.isInsert && !isEmpty(ctx.row?.[key])) cond += ` AND ${key} <> ${SqlLiteral(ctx.row[key])}`;
      if (rule.condition) cond += ` AND (${FillPlaceholders(rule.condition, ctx.row, ctx.master, true)})`;
      return (await firstRow(table, cond)) ? msg() : null;
    }

    case "exists":
    case "notExists": {
      if (!rule.table || !rule.condition) return null;
      // لو الشرط معتمد على حقل فاضي منتشيكش (الـ required هو اللي يمسكه)
      if (rule.field && isEmpty(v)) return null;
      const cond = FillPlaceholders(rule.condition, ctx.row, ctx.master, true);
      const found = await firstRow(rule.table, cond);
      if (rule.type === "exists") return found ? null : msg();
      return found ? msg() : null;
    }

    case "custom":
      if (!rule.check) return null;
      return (await rule.check(ctx)) || null;
  }
  return null;
}

// =====================================================================================
// ✅ للماستر ديتيل: بيشيك على الماستر وكل صفوف التفاصيل
// =====================================================================================
export async function RunValidations(
  rules: ValidationRule[] | undefined,
  master: Record<string, any>,
  details: Record<string, any>[][],
  opt: ValidationOptions
): Promise<ValidationError | null> {
  if (!rules || rules.length === 0) return null;
  const isEN = opt.isLangEN;

  for (const rule of rules) {
    const when = rule.when || "both";
    if (when === "insert" && !opt.isInsert) continue;
    if (when === "update" && opt.isInsert) continue;

    // ----- قواعد على التفاصيل كلها مرة واحدة -----
    if (rule.type === "minRows") {
      const rows = details[(rule.detail || 1) - 1] || [];
      if (rows.length < (rule.min ?? 1)) {
        return { message: message(rule, { row: master, master, details, isInsert: opt.isInsert }, isEN), detail: rule.detail || 1 };
      }
      continue;
    }

    if (rule.type === "noDuplicate" && rule.detail && rule.field) {
      const rows = details[rule.detail - 1] || [];
      const seen = new Map<string, number>();
      for (let i = 0; i < rows.length; i++) {
        const val = rows[i]?.[rule.field];
        if (isEmpty(val)) continue;
        const k = String(val);
        if (seen.has(k)) {
          const ctx = { row: rows[i], master, details, isInsert: opt.isInsert, rowIndex: i };
          return { message: rowPrefix(i, isEN) + message(rule, ctx, isEN), field: rule.field, detail: rule.detail, rowIndex: i };
        }
        seen.set(k, i);
      }
      continue;
    }

    // ----- قاعدة على صفوف التفاصيل: بتتشيك على كل صف -----
    if (rule.detail) {
      const rows = details[rule.detail - 1] || [];
      for (let i = 0; i < rows.length; i++) {
        const ctx: ValidationContext = { row: rows[i], master, details, isInsert: opt.isInsert, rowIndex: i };
        const err = await checkRule(rule, ctx, opt);
        if (err) return { message: rowPrefix(i, isEN) + err, field: rule.field, detail: rule.detail, rowIndex: i };
      }
      continue;
    }

    // ----- قاعدة على الماستر -----
    const ctx: ValidationContext = { row: master, master, details, isInsert: opt.isInsert };
    const err = await checkRule(rule, ctx, opt);
    if (err) return { message: err, field: rule.field };
  }
  return null;
}

function rowPrefix(i: number, isEN: boolean) {
  return isEN ? `Row ${i + 1}: ` : `صف ${i + 1}: `;
}

// =====================================================================================
// ✅ لشاشات الجدول العادية (DynamicGrid → beforeSave)
//    بترجّع رسالة الخطأ أو null
// =====================================================================================
export async function ValidateRow(
  rules: ValidationRule[] | undefined,
  row: Record<string, any>,
  opt: ValidationOptions
): Promise<string | null> {
  const masterRules = (rules || []).filter((r) => !r.detail && r.type !== "minRows" && r.type !== "noDuplicate");
  const err = await RunValidations(masterRules, row, [], opt);
  return err ? err.message : null;
}
