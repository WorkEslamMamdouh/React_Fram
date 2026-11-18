/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  cascadingFilter — منطق الفلاتر المتتالية (من غير شكل)
//  دوال صافية (pure) تقدر تستخدمها في أي مكان + hook اسمه useCascadingFilters.
//
//  مع DynamicGrid:
//     const cf = useCascadingFilters(config);
//     <CascadingFilterBar state={cf} />
//     <DynamicGrid condition={andJoin(baseCondition, cf.condition)} ... />   // الجريد بيعيد التحميل لما الشرط يتغير
// =====================================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveFilter } from "../AdvancedFilter";
import type { DataPage, DataProvider, DataQuery } from "./ModelPatterns";
import type {
  CascadeFieldState, CascadeFilterConfig, CascadeFilterDef, CascadeOption, CascadeValue, CascadeValues,
} from "./ModelCascadingFilter";
import { escSql, fillSqlPlaceholders, isValidField, ltOf, sqlDataProvider, sqlLit } from "./patternKit";
import { useSys } from "../../../SystemUsing";

// ------------------------------------------------------------------ أدوات
export const isEmptyVal = (v: any) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function isCascadeValueActive(def: CascadeFilterDef, v: CascadeValue | undefined): boolean {
  if (!v) return false;
  if (def.type === "dateRange") return !isEmptyVal(v.from) || !isEmptyVal(v.to);
  return !isEmptyVal(v.value);
}

/** بيرجّع أخطاء التعريف: أب مش موجود، أب بعد الابن، دايرة */
export function validateCascade(defs: CascadeFilterDef[]): string[] {
  const errors: string[] = [];
  const names = new Set(defs.map((d) => d.field));
  for (const d of defs) {
    for (const dep of d.dependsOn || []) {
      if (!names.has(dep.parent)) errors.push(`${d.field}: unknown parent "${dep.parent}"`);
      if (dep.parent === d.field) errors.push(`${d.field}: depends on itself`);
    }
  }
  // دايرة (DFS)
  const state = new Map<string, number>(); // 1 = جاري، 2 = خلص
  const byName = new Map(defs.map((d) => [d.field, d]));
  const visit = (f: string, path: string[]): void => {
    if (state.get(f) === 2) return;
    if (state.get(f) === 1) { errors.push(`cycle: ${[...path, f].join(" -> ")}`); return; }
    state.set(f, 1);
    for (const dep of byName.get(f)?.dependsOn || []) visit(dep.parent, [...path, f]);
    state.set(f, 2);
  };
  for (const d of defs) visit(d.field, []);
  return errors;
}

/** ترتيب طوبولوجي (الآباء الأول) — بيحافظ على الترتيب الأصلي قدر الإمكان */
export function orderCascade(defs: CascadeFilterDef[]): CascadeFilterDef[] {
  const out: CascadeFilterDef[] = [];
  const done = new Set<string>();
  const byName = new Map(defs.map((d) => [d.field, d]));
  const add = (d: CascadeFilterDef, guard: Set<string>) => {
    if (done.has(d.field) || guard.has(d.field)) return;
    guard.add(d.field);
    for (const dep of d.dependsOn || []) { const p = byName.get(dep.parent); if (p) add(p, guard); }
    done.add(d.field);
    out.push(d);
  };
  for (const d of defs) add(d, new Set());
  return out;
}

/** كل الفلاتر اللي بتعتمد (مباشر أو غير مباشر) على field */
export function dependentsOf(defs: CascadeFilterDef[], field: string): string[] {
  const res: string[] = [];
  const queue = [field];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const d of defs) {
      if ((d.dependsOn || []).some((x) => x.parent === cur) && !res.includes(d.field)) {
        res.push(d.field);
        queue.push(d.field);
      }
    }
  }
  return res;
}

const flat = (values: CascadeValues) => {
  const o: Record<string, any> = {};
  for (const [k, v] of Object.entries(values)) o[k] = v?.value;
  return o;
};

/** شروط مصدر الاختيارات من قيم الآباء. blocked = أب مطلوب فاضي (الفلتر يتقفل) */
export function optionsWhere(def: CascadeFilterDef, values: CascadeValues): { where: Record<string, any>; blocked: boolean } {
  const where: Record<string, any> = {};
  let blocked = false;
  for (const dep of def.dependsOn || []) {
    const pv = values[dep.parent]?.value;
    if (isEmptyVal(pv)) {
      if ((dep.whenParentEmpty || "none") === "none") blocked = true;
      continue;
    }
    where[dep.column] = pv;
  }
  return { where, blocked };
}

/** الطلب اللي بيجيب اختيارات فلتر (للسيرفر أو المحلي) */
export function buildOptionsQuery(def: CascadeFilterDef, values: CascadeValues, page: number, pageSize: number, search?: string): DataQuery | null {
  if (!def.source) return null;
  const s = def.source;
  const { where } = optionsWhere(def, values);
  return {
    source: {
      tableName: s.tableName,
      keyField: s.valueField,
      condition: s.condition ? fillSqlPlaceholders(s.condition, flat(values)) : undefined,
      orderBy: s.orderBy || s.displayField,
      orderType: s.orderType || "ASC",
      selectedColumns: undefined,
    },
    where,
    search: search ? { text: search, fields: s.searchFields && s.searchFields.length ? s.searchFields : [s.displayField] } : undefined,
    page, pageSize,
  };
}

const target = (d: CascadeFilterDef) => (d.targetColumn === undefined ? d.field : d.targetColumn);

/** شرط SQL للجريد/المصدر من القيم الحالية */
export function buildCascadeCondition(defs: CascadeFilterDef[], values: CascadeValues): string {
  const parts: string[] = [];
  for (const d of defs) {
    const col = target(d);
    if (!col || !isValidField(col)) continue;
    const v = values[d.field];
    if (!isCascadeValueActive(d, v)) continue;
    const type = d.type || "select";
    if (type === "dateRange") {
      if (!isEmptyVal(v!.from)) parts.push(`${col} >= '${escSql(v!.from)}'`);
      if (!isEmptyVal(v!.to)) parts.push(`${col} < DATEADD(day, 1, '${escSql(v!.to)}')`);
    } else if (type === "date") {
      parts.push(`(${col} >= '${escSql(v!.value)}' AND ${col} < DATEADD(day, 1, '${escSql(v!.value)}'))`);
    } else if (type === "text") {
      const op = d.operator || "contains";
      if (op === "=") parts.push(`${col} = ${sqlLit(String(v!.value))}`);
      else if (op === "starts") parts.push(`${col} LIKE N'${escSql(v!.value)}%'`);
      else parts.push(`${col} LIKE N'%${escSql(v!.value)}%'`);
    } else if (type === "boolean") {
      parts.push(`${col} = ${v!.value === true || v!.value === "true" || v!.value === 1 ? 1 : 0}`);
    } else if (type === "number") {
      const n = Number(v!.value);
      if (!isFinite(n)) continue;
      const op = d.operator === ">=" || d.operator === "<=" ? d.operator : "=";
      parts.push(`${col} ${op} ${n}`);
    } else {
      const val = v!.value;
      if (Array.isArray(val)) parts.push(`${col} IN (${val.map(sqlLit).join(", ")})`);
      else parts.push(`${col} = ${sqlLit(typeof val === "string" && /^-?\d+$/.test(val) && val.length < 16 ? Number(val) : val)}`);
    }
  }
  return parts.join(" AND ");
}

/** شروط تساوي فقط (للمصادر المحلية) */
export function buildCascadeWhere(defs: CascadeFilterDef[], values: CascadeValues): Record<string, any> {
  const w: Record<string, any> = {};
  for (const d of defs) {
    const col = target(d);
    const t = d.type || "select";
    if (!col || (t !== "select" && t !== "boolean" && !(t === "number" && (!d.operator || d.operator === "=")))) continue;
    const v = values[d.field];
    if (isCascadeValueActive(d, v)) w[col] = v!.value;
  }
  return w;
}

/** فلترة صف محليًا بكل أنواع الفلاتر */
export function matchesCascade(row: Record<string, any>, defs: CascadeFilterDef[], values: CascadeValues): boolean {
  for (const d of defs) {
    const col = target(d);
    if (!col) continue;
    const v = values[d.field];
    if (!isCascadeValueActive(d, v)) continue;
    const cell = row[col];
    const t = d.type || "select";
    if (t === "text") {
      const s = String(cell ?? "").toLowerCase(), q = String(v!.value).toLowerCase();
      if (d.operator === "=" ? s !== q : d.operator === "starts" ? !s.startsWith(q) : !s.includes(q)) return false;
    } else if (t === "dateRange") {
      const c = String(cell ?? "").substring(0, 10);
      if (!isEmptyVal(v!.from) && c < v!.from) return false;
      if (!isEmptyVal(v!.to) && c > v!.to) return false;
    } else if (t === "date") {
      if (String(cell ?? "").substring(0, 10) !== v!.value) return false;
    } else if (t === "number" && (d.operator === ">=" || d.operator === "<=")) {
      const n = Number(cell), q = Number(v!.value);
      if (d.operator === ">=" ? !(n >= q) : !(n <= q)) return false;
    } else if (t === "boolean") {
      if (!!cell !== (v!.value === true || v!.value === "true" || v!.value === 1)) return false;
    } else if (Array.isArray(v!.value)) {
      if (!v!.value.map(String).includes(String(cell))) return false;
    } else if (String(cell) !== String(v!.value)) return false;
  }
  return true;
}

/** تحويل لـ ActiveFilter[] (نفس شكل AdvancedFilter / DynamicGridFilter) */
export function cascadeToActiveFilters(defs: CascadeFilterDef[], values: CascadeValues, lang: string): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  for (const d of defs) {
    const v = values[d.field];
    const col = target(d);
    if (!col || !isCascadeValueActive(d, v)) continue;
    const type = (d.type || "select") as ActiveFilter["type"];
    out.push({
      id: d.field, field: col, label: ltOf(d.label, lang), type,
      value: v!.value ?? null, displayValue: String(v!.value ?? ""), fromValue: v!.from, toValue: v!.to,
      operator: d.operator,
    });
  }
  return out;
}

/** تغيير قيمة فلتر + مسح الأبناء حسب قاعدتهم */
export function applyCascadeChange(defs: CascadeFilterDef[], values: CascadeValues, field: string, next: CascadeValue): CascadeValues {
  const out: CascadeValues = { ...values, [field]: next };
  for (const child of dependentsOf(defs, field)) {
    const d = defs.find((x) => x.field === child);
    // keepIfValid / autoSelectSingle بيتحسموا بعد تحميل الاختيارات الجديدة (في الـ hook)
    if (!d || (d.onParentChange || "clear") === "clear") delete out[child];
  }
  return out;
}

// ------------------------------------------------------------------ تخزين
function loadPersisted(key: string): CascadeValues | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && p.v === 1 && typeof p.f === "object" ? (p.f as CascadeValues) : null;
  } catch { return null; }
}
function savePersisted(key: string, values: CascadeValues) {
  try { window.localStorage.setItem(key, JSON.stringify({ v: 1, f: values })); } catch { /* مفيش تخزين */ }
}

// ------------------------------------------------------------------ الـ hook
export interface CascadeChange {
  values: CascadeValues;
  condition: string;
  where: Record<string, any>;
}

export interface UseCascadingFiltersOptions {
  provider?: DataProvider;
  onChange?: (c: CascadeChange) => void;
  /** حجم صفحة الاختيارات في وضع server */
  optionsPageSize?: number;
  textDebounceMs?: number;
}

export function useCascadingFilters(config: CascadeFilterConfig, opts: UseCascadingFiltersOptions = {}) {
  const { provider = sqlDataProvider, onChange, optionsPageSize = 30, textDebounceMs = 400 } = opts;
  const lang = useSys((s) => s.lang);

  const defs = useMemo(() => orderCascade(config.filters), [config.filters]);
  const errors = useMemo(() => validateCascade(config.filters), [config.filters]);
  const storageKey = config.id && config.persist !== false ? `cascade:${config.id}` : "";
  const instant = config.applyOnChange !== false;

  const initial = useMemo<CascadeValues>(() => {
    const v: CascadeValues = {};
    for (const d of defs) if (d.defaultValue !== undefined) v[d.field] = { value: d.defaultValue };
    return v;
  }, [defs]);

  const [values, setValuesState] = useState<CascadeValues>(initial);
  const valuesRef = useRef<CascadeValues>(initial);
  const setValues = useCallback((v: CascadeValues) => { valuesRef.current = v; setValuesState(v); }, []);
  const [applied, setApplied] = useState<CascadeValues>(initial);
  const [opts2, setOpts] = useState<Record<string, { options: CascadeOption[]; total: number; loading: boolean; sig: string }>>({});
  const providerRef = useRef(provider);
  providerRef.current = provider;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeq = useRef<Record<string, number>>({});

  // استرجاع المحفوظ بعد أول render (عشان static export)
  useEffect(() => {
    if (!storageKey) return;
    const saved = loadPersisted(storageKey);
    if (saved) { setValues(saved); setApplied(saved); }
  }, [storageKey, setValues]);

  // ---------- نشر التغيير ----------
  const emit = useCallback((vals: CascadeValues) => {
    setApplied(vals);
    if (storageKey) savePersisted(storageKey, vals);
    onChangeRef.current?.({ values: vals, condition: buildCascadeCondition(defs, vals), where: buildCascadeWhere(defs, vals) });
  }, [defs, storageKey]);

  const commit = useCallback((next: CascadeValues, immediate: boolean) => {
    setValues(next);
    if (!instant) return;
    if (timer.current) clearTimeout(timer.current);
    if (immediate) emit(next);
    else timer.current = setTimeout(() => emit(next), textDebounceMs);
  }, [instant, emit, textDebounceMs, setValues]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const toOption = useCallback((d: CascadeFilterDef, r: any): CascadeOption => {
    const s = d.source!;
    const label = lang === "en" && s.displayFieldEn ? r[s.displayFieldEn] ?? r[s.displayField] : r[s.displayField];
    return { value: r[s.valueField], label: String(label ?? r[s.valueField] ?? ""), row: r };
  }, [lang]);

  // ---------- تحميل الاختيارات لكل فلتر لما قيم آبائه تتغير ----------
  // اللغة جزء من التوقيع: لما تتغير، أسماء الاختيارات (displayFieldEn / label) تتحمل تاني باللغة الجديدة
  const parentSig = (d: CascadeFilterDef, vals: CascadeValues) =>
    JSON.stringify([(d.dependsOn || []).map((x) => vals[x.parent]?.value ?? null), d.source?.condition ? fillSqlPlaceholders(d.source.condition, flat(vals)) : "", lang]);

  useEffect(() => {
    for (const d of defs) {
      if ((d.type || "select") !== "select") continue;
      const sig = parentSig(d, values);
      if (opts2[d.field]?.sig === sig) continue;
      const { blocked, where } = optionsWhere(d, values);

      if (d.options) {
        void where;
        const list = blocked ? [] : d.options
          .filter((o) => (d.dependsOn || []).every((dep) => {
            const pv = values[dep.parent]?.value;
            const ov = o.parentValues?.[dep.parent];
            return isEmptyVal(pv) || ov === undefined || String(ov) === String(pv);
          }))
          .map((o) => ({ value: o.value, label: ltOf(o.label, lang) }));
        setOpts((p) => ({ ...p, [d.field]: { options: list, total: list.length, loading: false, sig } }));
        continue;
      }
      if (!d.source || blocked) {
        setOpts((p) => ({ ...p, [d.field]: { options: [], total: 0, loading: false, sig } }));
        continue;
      }
      const q = buildOptionsQuery(d, values, d.loadMode === "server" ? 1 : 0, optionsPageSize);
      if (!q) continue;
      const my = (loadSeq.current[d.field] = (loadSeq.current[d.field] || 0) + 1);
      setOpts((p) => ({ ...p, [d.field]: { options: p[d.field]?.options || [], total: p[d.field]?.total || 0, loading: true, sig } }));
      providerRef.current(q)
        .then((res) => {
          if (loadSeq.current[d.field] !== my) return;
          const list = res.rows.map((r) => toOption(d, r));
          setOpts((p) => ({ ...p, [d.field]: { options: list, total: d.loadMode === "server" ? res.total : list.length, loading: false, sig } }));
        })
        .catch(() => {
          if (loadSeq.current[d.field] !== my) return;
          setOpts((p) => ({ ...p, [d.field]: { options: [], total: 0, loading: false, sig } }));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs, values, optionsPageSize, toOption]);

  // ---------- keepIfValid / autoSelectSingle بعد ما الاختيارات توصل ----------
  useEffect(() => {
    let changed = false;
    let next = { ...values };
    for (const d of defs) {
      const st = opts2[d.field];
      if (!st || st.loading || st.sig !== parentSig(d, values)) continue;
      const mode = d.onParentChange || "clear";
      const cur = values[d.field]?.value;
      const fullyLoaded = st.total <= st.options.length;
      // applyCascadeChange عشان أبناء الفلتر ده (اللي قاعدتهم clear) يتمسحوا هما كمان
      if (!isEmptyVal(cur) && fullyLoaded && !st.options.some((o) => String(o.value) === String(cur)) && mode !== "clear") {
        next = applyCascadeChange(defs, next, d.field, {}); delete next[d.field]; changed = true;
      }
      if (mode === "autoSelectSingle" && isEmptyVal(next[d.field]?.value) && st.options.length === 1 && fullyLoaded) {
        next = applyCascadeChange(defs, next, d.field, { value: st.options[0].value }); changed = true;
      }
    }
    if (changed) commit(next, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts2]);

  const setValue = useCallback((field: string, v: CascadeValue) => {
    const d = defs.find((x) => x.field === field);
    const immediate = !d || (d.type !== "text" && d.type !== "number");
    commit(applyCascadeChange(defs, valuesRef.current, field, v), immediate);
  }, [defs, commit]);

  const clearAll = useCallback(() => {
    const next: CascadeValues = {};
    for (const d of defs) if (d.hidden && values[d.field]) next[d.field] = values[d.field];
    commit(next, true);
    if (!instant) emit(next);
  }, [defs, values, commit, instant, emit]);

  const apply = useCallback(() => emit(values), [emit, values]);

  /** بحث في اختيارات فلتر (وضع server) */
  const searchOptions = useCallback(async (field: string, text: string, page: number): Promise<DataPage<CascadeOption>> => {
    const d = defs.find((x) => x.field === field);
    if (!d?.source) return { rows: [], total: 0 };
    const q = buildOptionsQuery(d, values, page, optionsPageSize, text);
    if (!q) return { rows: [], total: 0 };
    const res = await providerRef.current(q);
    return { rows: res.rows.map((r) => toOption(d, r)), total: res.total };
  }, [defs, values, optionsPageSize, toOption]);

  const fields: CascadeFieldState[] = defs.map((d) => ({
    def: d,
    options: opts2[d.field]?.options || [],
    total: opts2[d.field]?.total || 0,
    loading: !!opts2[d.field]?.loading,
    disabled: optionsWhere(d, values).blocked,
  }));

  const condition = useMemo(() => buildCascadeCondition(defs, applied), [defs, applied]);
  const where = useMemo(() => buildCascadeWhere(defs, applied), [defs, applied]);
  const activeCount = defs.filter((d) => !d.hidden && isCascadeValueActive(d, values[d.field])).length;
  const missingRequired = defs.filter((d) => d.required && !isCascadeValueActive(d, values[d.field])).map((d) => d.field);
  const predicate = useCallback((row: Record<string, any>) => matchesCascade(row, defs, applied), [defs, applied]);

  return {
    config, defs, errors, values, applied, fields, condition, where, activeCount, missingRequired, instant,
    setValue, clearAll, apply, searchOptions, predicate,
  };
}

export type CascadingFiltersState = ReturnType<typeof useCascadingFilters>;
