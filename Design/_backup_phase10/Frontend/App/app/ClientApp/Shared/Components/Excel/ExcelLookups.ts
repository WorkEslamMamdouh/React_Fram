// =====================================================================================
//  📄 Shared/Components/Excel/ExcelLookups.ts  —  تحميل قوائم الاختيار من القاعدة وحل القيم الناقصة
// -------------------------------------------------------------------------------------
//  • loadLookups   : أول N قيمة (الافتراضي 5000) لكل عمود له lookup → للقوائم المنسدلة وللمطابقة.
//  • resolveMissing: لو الجدول أكبر من الحد، القيم اللي في الملف وماتلاقتش بتتدور عليها بالاستعلام (دفعات).
//  كله قراءة (SELECT) عن طريق نفس SQL.Querys بتاع باقي النظام.
// =====================================================================================

import { SQL, GetDataModel } from "../../CallDataBase";
import { isBlank, LookupIndex, makeLabel, normText } from "./ExcelCore";
import { ExcelColumnSpec, ExcelLookupData, ExcelLookupItem, ExcelLookups, ExcelLookupSpec, colKey } from "./ExcelTypes";

export const DEFAULT_LOOKUP_LIMIT = 5000;
const IN_BATCH = 100;

const sqlText = (v: string) => "N'" + String(v).replace(/'/g, "''") + "'";

async function queryRows(table: string, condition: string, columns: string[], top: number, orderBy: string): Promise<any[]> {
  const tm: any = {
    NameTable: table,
    Condition: condition,
    SelectedColumns: columns.length ? columns : null,
    Top: top,
    OrderByID: orderBy,
    OrderType: "ASC",
    IsPage: false,
    PageNumber: 0,
    PageSize: 0,
  };
  const res = await SQL.Querys([tm], null, null);
  if (!Array.isArray(res)) throw new Error(String(res || "Server error"));
  const first = res[0];
  if (Array.isArray(first)) return first;
  return GetDataModel(table, [tm], res);
}

function selectedColumns(l: ExcelLookupSpec): string[] {
  const set = new Set<string>([l.keyColumn]);
  if (l.codeColumn) set.add(l.codeColumn);
  if (l.nameColumn) set.add(l.nameColumn);
  for (const src of Object.values(l.fill || {})) set.add(src);
  return Array.from(set);
}

function rowToItem(l: ExcelLookupSpec, r: any): ExcelLookupItem {
  const code = l.codeColumn ? r[l.codeColumn] : undefined;
  const name = l.nameColumn ? r[l.nameColumn] : undefined;
  const key = r[l.keyColumn];
  return {
    key,
    code: isBlank(code) ? undefined : String(code),
    name: isBlank(name) ? undefined : String(name),
    label: makeLabel(code, name, key),
    extra: l.fill ? r : undefined,
  };
}

const specSig = (l: ExcelLookupSpec) => JSON.stringify([l.table, l.keyColumn, l.codeColumn, l.nameColumn, l.condition, l.limit, l.fill]);

/** يحمّل قوائم كل الأعمدة اللي ليها lookup (اللي ليها options ثابتة مش محتاجة). الأخطاء بترجع في errors بدل ما ترمي */
export async function loadLookups(columns: ExcelColumnSpec[]): Promise<{ lookups: ExcelLookups; errors: string[] }> {
  const lookups: ExcelLookups = {};
  const errors: string[] = [];
  const cache = new Map<string, Promise<ExcelLookupData>>();

  const load = (l: ExcelLookupSpec): Promise<ExcelLookupData> => {
    const sig = specSig(l);
    let p = cache.get(sig);
    if (!p) {
      const limit = l.limit && l.limit > 0 ? l.limit : DEFAULT_LOOKUP_LIMIT;
      const order = l.nameColumn || l.codeColumn || l.keyColumn;
      p = queryRows(l.table, l.condition || "", selectedColumns(l), limit + 1, order).then((rows) => {
        const truncated = rows.length > limit;
        const items = rows.slice(0, limit).map((r) => rowToItem(l, r));
        return { items, truncated };
      });
      cache.set(sig, p);
    }
    return p;
  };

  await Promise.all(
    columns.filter((c) => c.lookup && !(c.options && c.options.length)).map(async (c) => {
      try {
        lookups[colKey(c)] = await load(c.lookup!);
      } catch (e: any) {
        lookups[colKey(c)] = { items: [] };
        errors.push(`${c.title}: ${typeof e === "string" ? e : e?.message || e?.ErrorMessage || "load failed"}`);
      }
    }),
  );
  return { lookups, errors };
}

/** القيم اللي في الملف وماتلاقتش في القائمة المقطوعة → بتتدور في القاعدة وتتضاف للفهرس */
export async function resolveMissing(
  col: ExcelColumnSpec,
  data: ExcelLookupData,
  index: LookupIndex,
  texts: string[],
): Promise<void> {
  const l = col.lookup;
  if (!l || !data.truncated) return;
  const missing = Array.from(new Set(texts.filter((t) => !isBlank(t) && index.match(t) === null)));
  if (!missing.length) return;
  const have = new Set(data.items.map((i) => normText(i.key)));

  const cols = selectedColumns(l);
  for (let i = 0; i < missing.length; i += IN_BATCH) {
    const batch = missing.slice(i, i + IN_BATCH);
    const list = batch.map(sqlText).join(", ");
    const parts = [`CAST(${l.keyColumn} AS NVARCHAR(100)) IN (${list})`];
    if (l.codeColumn) parts.push(`CAST(${l.codeColumn} AS NVARCHAR(100)) IN (${list})`);
    if (l.nameColumn) parts.push(`${l.nameColumn} IN (${list})`);
    // "كود - اسم": نجرّب الجزء الأول (الكود)
    if (l.codeColumn) {
      const codes = batch.map((b) => b.split(" - ")[0].trim()).filter((x) => x && !batch.includes(x));
      if (codes.length) parts.push(`CAST(${l.codeColumn} AS NVARCHAR(100)) IN (${codes.map(sqlText).join(", ")})`);
    }
    const cond = `(${parts.join(" OR ")})` + (l.condition ? ` AND (${l.condition})` : "");
    let rows: any[] = [];
    try {
      rows = await queryRows(l.table, cond, cols, IN_BATCH * 3, l.keyColumn);
    } catch {
      continue;
    }
    for (const r of rows) {
      const it = rowToItem(l, r);
      if (have.has(normText(it.key))) continue;
      have.add(normText(it.key));
      data.items.push(it);
      index.add(it);
    }
  }
  // "كود - اسم" اتكتب كامل: نطابق بالكود
  for (const t of missing) {
    if (index.match(t) !== null) continue;
    const code = t.split(" - ")[0].trim();
    if (code && code !== t) {
      const m = index.match(code);
      if (m && m !== "ambiguous") index.add({ ...m, label: t });
    }
  }
}
