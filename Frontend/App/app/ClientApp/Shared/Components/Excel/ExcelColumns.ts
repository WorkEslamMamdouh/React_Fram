// =====================================================================================
//  📄 Shared/Components/Excel/ExcelColumns.ts  —  تحويل أعمدة DynamicGrid / MasterDetail لأعمدة إكسل
// -------------------------------------------------------------------------------------
//  القواعد:
//   • العمود بيدخل التمبلت لو بيتحفظ (IsSave) ومش محسوب (formula) وينفع يتدخل (insertable / editable).
//   • نوع الخلية من type / inputType. القوائم من: excel.lookups ← selectConfig / dynamicSelect ← searchModal ← selectOptions.
//   • شرط القائمة اللي فيه {row.X} (معتمد على صف تاني) بيتشال عشان مايتطبقش غلط.
// =====================================================================================

import type { DynamicGridColumn } from "../Import/ModelGrid";
import type { MasterDetailColumn } from "../Import/ModelMasterDetail";
import { ExcelColType, ExcelColumnSpec, ExcelLookupSpec, ExcelScope } from "./ExcelTypes";

type AnyCol = DynamicGridColumn & Partial<Pick<MasterDetailColumn, "fillFrom" | "formula">>;

const isPrimitive = (v: any) => v !== null && v !== undefined && v !== "" && ["string", "number", "boolean"].includes(typeof v);

function colType(c: AnyCol): ExcelColType {
  const t = c.inputType || c.type;
  if (t === "checkbox") return "bool";
  if (t === "date") return "date";
  if (t === "number") return c.step !== undefined && c.step % 1 !== 0 ? "decimal" : "number";
  return "text";
}

/** هل العمود ينفع يتكتب من الإكسل؟ */
export function isExcelEligible(c: AnyCol, scope: ExcelScope, exclude: string[], explicit: boolean): boolean {
  // أعمدة التفاصيل المحددة صراحة (detailColumns) بتدخل حتى لو IsSave:false (زي ItemName/Qty في SalesInvoice: بتتعرض في الجدول وبتتحفظ من أعمدة تانية)
  if (c.IsSave === false && !(explicit && scope === "detail")) return false;
  if (c.formula) return false;
  if (exclude.includes(c.field)) return false;
  if (explicit) return true;
  if (c.IsDisabledInAdd) return false;
  if (scope === "detail") return c.editable !== false;
  return c.insertable !== false && c.editable !== false;
}

/** شرط من غير أي {placeholder} (وإلا بيتشال) */
function cleanCondition(cond?: string): string | undefined {
  if (!cond || !cond.trim()) return undefined;
  return /\{[^}]*\}/.test(cond) ? undefined : cond;
}

export function lookupOfColumn(c: AnyCol, override?: ExcelLookupSpec): ExcelLookupSpec | undefined {
  if (override && override.table && override.keyColumn) {
    return { ...override, fill: override.fill ?? (c.fillFrom && Object.keys(c.fillFrom).length ? c.fillFrom : undefined) };
  }
  const sc = (c.selectConfig || c.dynamicSelect) as { tableName: string; displayField: string; valueField: string; condition?: string } | undefined;
  if (sc && sc.tableName && sc.valueField) {
    return { table: sc.tableName, keyColumn: sc.valueField, nameColumn: sc.displayField || undefined, condition: cleanCondition(sc.condition) };
  }
  const sm = c.searchModal;
  if (sm && sm.tableName && sm.returnField) {
    return {
      table: sm.tableName,
      keyColumn: sm.returnField,
      nameColumn: sm.displayField && sm.displayField !== sm.returnField ? sm.displayField : undefined,
      condition: cleanCondition(sm.condition),
      fill: c.fillFrom && Object.keys(c.fillFrom).length ? c.fillFrom : undefined,
    };
  }
  return undefined;
}

export interface BuildSpecOptions {
  scope: ExcelScope;
  /** أعمدة محددة (فاضي = الكل المؤهل) */
  include?: string[];
  /** أعمدة تتشال دايمًا (المفتاح / الربط) */
  exclude?: string[];
  lookups?: Record<string, ExcelLookupSpec>;
}

/** أعمدة الإكسل لمجموعة أعمدة شاشة */
export function buildColumnSpecs(cols: AnyCol[], opt: BuildSpecOptions): ExcelColumnSpec[] {
  const explicit = !!(opt.include && opt.include.length);
  const exclude = opt.exclude || [];
  const wanted = (c: AnyCol) => (explicit ? opt.include!.includes(c.field) : true);
  const list = cols.filter((c) => wanted(c) && isExcelEligible(c, opt.scope, exclude, explicit));
  // نحافظ على ترتيب include لو متحدد
  if (explicit) list.sort((a, b) => opt.include!.indexOf(a.field) - opt.include!.indexOf(b.field));

  return list.map((c) => {
    const options = (c.selectOptions && c.selectOptions.length ? c.selectOptions : c.options) || [];
    const lookup = options.length ? undefined : lookupOfColumn(c, opt.lookups?.[c.field]);
    const spec: ExcelColumnSpec = {
      field: c.field,
      scope: opt.scope,
      title: String(c.title ?? c.field),
      type: colType(c),
      required: !!c.IsRequired,
      width: typeof c.width === "number" ? c.width : undefined,
      isValid: c.IsValid ? (v, row) => c.IsValid!(v, row) : undefined,
      validationMessage: c.validationMessage,
    };
    if (options.length) spec.options = options.map((o) => ({ value: o.value, label: String(o.label) }));
    else if (lookup) spec.lookup = lookup;
    if (isPrimitive(c.DefaultValue)) spec.defaultValue = c.DefaultValue;
    return spec;
  });
}
