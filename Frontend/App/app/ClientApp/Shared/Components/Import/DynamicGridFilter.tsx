'use client';

// =====================================================================================
//  شريط الفلتر الظاهر (Phase 2) — بيظهر فوق الجريد على طول
//  - كل الحقول ظاهرة مرة واحدة (مفيش "اختار الحقل الأول")
//  - الحقل الفاضي = مفيش شرط (بيجيب الكل)
//  - أي تغيير بيفلتر فورًا: النص بعد 400ms، والاختيار/التاريخ في نفس اللحظة (مفيش زرار تطبيق)
//  - زرار واحد "مسح الفلاتر"، وعدد الفلاتر النشطة وعدد النتايج
//  - chips اختيارية لقيم عمود (دوسة واحدة تفلتر)
//  - آخر قيم الفلتر بتتحفظ لكل يوزر/شاشة في localStorage (جوه try/catch)
//  - موبايل (<768): الفلتر بيتقفل في شيت بيتفتح من فوق وعليه عدد الفلاتر النشطة
// =====================================================================================

import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import type { FilterFieldConfig, ActiveFilter, FilterOption } from './AdvancedFilter';
import type { SearchModalConfig } from './ModelGrid';
import { useSys } from '../../SystemUsing';
import { firstDayOfMonth, today } from '../../dateUtils';

// SearchModal بيستورد DynamicGrid اللي بيستورد الملف ده → lazy عشان نتجنب الدايرة
const SearchModal = lazy(() => import('./SearchModal'));

// ============================================================
// TYPES
// ============================================================

export interface FilterChipsConfig {
  /** العمود اللي بيتفلتر بالـ chips */
  field: string;
  /** القيم (value/label) — بتتعرض كـ chips، ودوسة واحدة بتفلتر */
  options: FilterOption[];
  /** نص chip "الكل" (الافتراضي: الكل / All) */
  allLabel?: string;
}

export interface GridFilterConfig {
  fields: FilterFieldConfig[];
  visible?: boolean;
  applyOnInit?: boolean;
  /** الافتراضي true = فلترة فورية. false = يرجع بزرار "تطبيق" (للتوافق مع القديم) */
  applyOnChange?: boolean;
  layout?: "inline" | "stacked";
  /** عدد الأعمدة على الكمبيوتر (الافتراضي: تلقائي حسب العرض) */
  columns?: number;
  /** chips اختيارية لحالة/نوع (اختياري) */
  chips?: FilterChipsConfig;
  /** حفظ آخر قيم الفلتر لكل يوزر (الافتراضي true) */
  persist?: boolean;
  /** لو الحقول أكتر من الرقم ده، الباقي بيتخبى ورا "فلاتر أكتر" (الافتراضي 8) */
  maxVisibleFields?: number;
}

export interface DynamicGridFilterProps {
  config: GridFilterConfig;
  onFiltersChange: (filters: ActiveFilter[]) => void;
  onReady?: () => void;
  /** القيم المبدئية (من الحفظ أو الافتراضي) — الجريد بيحسبها وبيبعتها */
  initialFilters?: ActiveFilter[];
  resultCount?: number;
  loading?: boolean;
  storageKey?: string;
  textDebounceMs?: number;
}

// ============================================================
// HELPERS (بتتستخدم من DynamicGrid)
// ============================================================

export function isFilterActive(f: ActiveFilter | undefined | null): boolean {
  if (!f) return false;
  const v = f.value;
  const has = v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
  return has || !!f.fromValue || !!f.toValue;
}

function resolveDefault(field: FilterFieldConfig): { value?: any; fromValue?: any; toValue?: any } {
  if (field.type === 'dateRange') {
    // فترة افتراضية بس لو الشاشة حددتها صراحة — غير كده الحقل فاضي = الكل
    if (field.defaultRange) {
      return {
        fromValue: field.defaultRange.from || firstDayOfMonth(),
        toValue: field.defaultRange.to || today(),
      };
    }
    return {};
  }
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    return { value: field.defaultValue };
  }
  return {};
}

/** الفلاتر الافتراضية: من defaultFilters لو موجودة، وإلا من defaultValue/defaultRange في الحقل. الفاضي مابيتضافش. */
export function buildInitialFilters(fields: FilterFieldConfig[], defaults?: ActiveFilter[]): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  for (const f of fields) {
    const d = defaults?.find((x) => x.field === f.field);
    const base = d
      ? { value: d.value, fromValue: d.fromValue, toValue: d.toValue }
      : resolveDefault(f);
    const af: ActiveFilter = {
      id: f.field, field: f.field, label: f.label, type: f.type, operator: f.operator,
      value: base.value ?? null, displayValue: '', fromValue: base.fromValue, toValue: base.toValue,
    };
    if (isFilterActive(af)) out.push(af);
  }
  return out;
}

/** قراءة آخر قيم محفوظة. بترجع null لو مفيش حفظ (يبقى نستخدم الافتراضي). */
export function loadSavedFilters(key: string, fields: FilterFieldConfig[]): ActiveFilter[] | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || typeof parsed.f !== 'object' || parsed.f === null) return null;
    const out: ActiveFilter[] = [];
    for (const f of fields) {
      const s = parsed.f[f.field];
      if (!s) continue;
      // قيمة select مابقتش موجودة في الاختيارات → نتجاهلها عشان ماتخبيش الداتا
      if ((f.type === 'select') && f.options && s.v != null && s.v !== '' && !f.options.some((o) => String(o.value) === String(s.v))) continue;
      const af: ActiveFilter = {
        id: f.field, field: f.field, label: f.label, type: f.type, operator: f.operator,
        value: s.v ?? null, displayValue: '', fromValue: s.a, toValue: s.b,
      };
      if (isFilterActive(af)) out.push(af);
    }
    return out;
  } catch {
    return null;
  }
}

export function saveFilters(key: string, filters: ActiveFilter[]): void {
  try {
    const f: Record<string, { v: any; a: any; b: any }> = {};
    for (const a of filters) {
      if (isFilterActive(a)) f[a.field] = { v: a.value, a: a.fromValue, b: a.toValue };
    }
    window.localStorage.setItem(key, JSON.stringify({ v: 1, f }));
  } catch { /* مفيش تخزين (وضع خاص / ممنوع) — عادي */ }
}

/** أول حقل إجباري ناقص (أو null) */
export function firstMissingRequired(fields: FilterFieldConfig[], filters: ActiveFilter[]): FilterFieldConfig | null {
  for (const f of fields) {
    if (!f.required) continue;
    const a = filters.find((x) => x.field === f.field);
    if (f.type === 'dateRange') {
      if (!a || !a.fromValue || !a.toValue) return f;
    } else if (!isFilterActive(a)) return f;
  }
  return null;
}

type Vals = Record<string, { value?: any; fromValue?: any; toValue?: any }>;

function toVals(list: ActiveFilter[]): Vals {
  const v: Vals = {};
  for (const a of list) v[a.field] = { value: a.value, fromValue: a.fromValue, toValue: a.toValue };
  return v;
}

function toActive(vals: Vals, defs: FilterFieldConfig[]): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  for (const f of defs) {
    const s = vals[f.field];
    if (!s) continue;
    const af: ActiveFilter = {
      id: f.field, field: f.field, label: f.label, type: f.type, operator: f.operator,
      value: s.value ?? null, displayValue: '', fromValue: s.fromValue, toValue: s.toValue,
    };
    if (isFilterActive(af)) out.push(af);
  }
  return out;
}

const sigOf = (list: ActiveFilter[]) => JSON.stringify(list.map((a) => [a.field, a.value, a.fromValue, a.toValue]));

// ============================================================
// FILTER INPUT
// ============================================================

type ChangeFn = (patch: { value?: any; fromValue?: any; toValue?: any }, immediate: boolean) => void;

const inputBase =
  "w-full h-9 border border-erp-border-strong rounded-lg px-3 text-[13px] bg-erp-surface text-erp-text placeholder:text-erp-text-subtle focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition";

const FilterInput: React.FC<{
  field: FilterFieldConfig;
  value: any;
  fromValue?: any;
  toValue?: any;
  onChange: ChangeFn;
  lang: string;
  onOpenSearch?: (field: FilterFieldConfig) => void;
  invalid?: boolean;
}> = ({ field, value, fromValue, toValue, onChange, lang, onOpenSearch, invalid }) => {
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const base = inputBase + (invalid ? ' !border-erp-danger' : '');

  switch (field.type) {
    case 'text':
      return (
        <input type="text" className={base} value={value ?? ''} placeholder={field.placeholder || t('Search...', 'بحث...')}
          onChange={(e) => onChange({ value: e.target.value }, false)} />
      );

    case 'number':
      return (
        <input type="number" className={`${base} num`} value={value ?? ''} placeholder={field.placeholder}
          onChange={(e) => onChange({ value: e.target.value === '' ? null : Number(e.target.value) }, false)} />
      );

    case 'date':
      return (
        <input type="date" className={base} value={value || ''}
          onChange={(e) => onChange({ value: e.target.value || null }, true)} />
      );

    case 'dateRange':
      return (
        <div className="flex gap-2">
          <input type="date" className={base} value={fromValue || ''} aria-label={t('From', 'من')}
            onChange={(e) => onChange({ value: null, fromValue: e.target.value || null, toValue }, true)} />
          <input type="date" className={base} value={toValue || ''} aria-label={t('To', 'إلى')}
            onChange={(e) => onChange({ value: null, fromValue, toValue: e.target.value || null }, true)} />
        </div>
      );

    case 'select':
      return (
        <select className={base} value={value ?? ''} onChange={(e) => onChange({ value: e.target.value || null }, true)}>
          <option value="">{field.placeholder || t('All', 'الكل')}</option>
          {(field.options || []).map((o) => (
            <option key={String(o.value)} value={o.value}>{o.label}</option>
          ))}
        </select>
      );

    case 'multiselect':
      return (
        <select className={base} value={Array.isArray(value) && value.length ? String(value[0]) : ''}
          onChange={(e) => onChange({ value: e.target.value ? [e.target.value] : null }, true)}>
          <option value="">{field.placeholder || t('All', 'الكل')}</option>
          {(field.options || []).map((o) => (
            <option key={String(o.value)} value={o.value}>{o.label}</option>
          ))}
        </select>
      );

    case 'boolean':
      return (
        <select className={base} value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange({ value: e.target.value === '' ? null : e.target.value === 'true' }, true)}>
          <option value="">{t('All', 'الكل')}</option>
          <option value="true">{t('Yes', 'نعم')}</option>
          <option value="false">{t('No', 'لا')}</option>
        </select>
      );

    case 'search':
      return (
        <div className="flex gap-1.5">
          <input type="text" className={`flex-1 min-w-0 ${base}`} value={value ?? ''} readOnly
            placeholder={field.placeholder || t('Press 🔍', 'دوس 🔍')} onClick={() => onOpenSearch?.(field)} />
          {value !== null && value !== undefined && value !== '' && (
            <button type="button" onClick={() => onChange({ value: null }, true)} aria-label={t('Clear', 'مسح')}
              className="px-2 h-9 rounded-lg bg-erp-surface-2 text-erp-text-muted hover:bg-erp-surface-3 text-xs">✕</button>
          )}
          <button type="button" onClick={() => onOpenSearch?.(field)}
            className="px-3 h-9 rounded-lg bg-erp-accent text-white text-[13px] font-medium hover:bg-erp-accent-hover transition-colors">
            🔍
          </button>
        </div>
      );

    default:
      return (
        <input type="text" className={base} value={value ?? ''}
          onChange={(e) => onChange({ value: e.target.value }, false)} />
      );
  }
};

// ============================================================
// ICONS
// ============================================================

const FunnelIcon = ({ className = 'size-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);
const ClearIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DynamicGridFilter({
  config, onFiltersChange, onReady, initialFilters, resultCount, loading, storageKey, textDebounceMs = 400,
}: DynamicGridFilterProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = useCallback((en: string, ar: string) => (lang === 'ar' ? ar : en), [lang]);

  const sortedFields = useMemo(
    () => [...config.fields].sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)),
    [config.fields]
  );

  // تعريفات كل الحقول اللي بتتفلتر (الحقول + حقل الـ chips لو مش موجود فيهم)
  const chips = config.chips;
  const fieldDefs = useMemo<FilterFieldConfig[]>(() => {
    if (chips && !sortedFields.some((f) => f.field === chips.field)) {
      return [...sortedFields, { field: chips.field, label: chips.field, type: 'select', options: chips.options } as FilterFieldConfig];
    }
    return sortedFields;
  }, [sortedFields, chips]);

  const instant = config.applyOnChange !== false;

  const [vals, setVals] = useState<Vals>(() => toVals(initialFilters ?? buildInitialFilters(sortedFields)));
  const valsRef = useRef<Vals>(vals);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSigRef = useRef<string | null>(null);
  const onChangeRef = useRef(onFiltersChange);
  onChangeRef.current = onFiltersChange;
  const fieldDefsRef = useRef(fieldDefs);
  fieldDefsRef.current = fieldDefs;
  const sortedFieldsRef = useRef(sortedFields);
  sortedFieldsRef.current = sortedFields;

  if (lastSigRef.current === null) lastSigRef.current = sigOf(toActive(vals, fieldDefs));

  const [searchTarget, setSearchTarget] = useState<FilterFieldConfig | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRequiredErr, setShowRequiredErr] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { onReady?.(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // ---------- إرسال الفلاتر للجريد ----------
  const emit = useCallback((v: Vals, force = false) => {
    const active = toActive(v, fieldDefsRef.current);
    if (!force) {
      const missing = firstMissingRequired(sortedFieldsRef.current, active);
      if (missing) { setShowRequiredErr(true); return; }
    }
    setShowRequiredErr(false);
    const sig = sigOf(active);
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    if (storageKey && config.persist !== false) saveFilters(storageKey, active);
    onChangeRef.current(active);
  }, [storageKey, config.persist]);

  const setField = useCallback((field: string, patch: { value?: any; fromValue?: any; toValue?: any }, immediate: boolean) => {
    const next: Vals = { ...valsRef.current, [field]: { ...valsRef.current[field], ...patch } };
    valsRef.current = next;
    setVals(next);
    if (!instant) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (immediate) emit(next);
    else timerRef.current = setTimeout(() => emit(valsRef.current), textDebounceMs);
  }, [instant, emit, textDebounceMs]);

  const clearAll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    valsRef.current = {};
    setVals({});
    emit({}, true);
  }, [emit]);

  const applyNow = () => emit(valsRef.current);

  // ---------- المشتقات للعرض ----------
  const activeList = useMemo(() => toActive(vals, fieldDefs), [vals, fieldDefs]);
  const activeCount = activeList.length;
  const getVal = (field: string) => vals[field] || {};

  const limit = config.maxVisibleFields ?? 8;
  const extraActive = sortedFields.slice(limit).some((f) => isFilterActive(activeList.find((a) => a.field === f.field)));
  const expandedAll = showExtra || extraActive || sortedFields.length <= limit;
  const shownFields = expandedAll ? sortedFields : sortedFields.slice(0, limit);
  const hiddenCount = sortedFields.length - shownFields.length;

  if (config.visible === false) return null;

  const missingNames = showRequiredErr
    ? new Set(sortedFields.filter((f) => f.required && !isFilterActive(activeList.find((a) => a.field === f.field)) && !(f.type === 'dateRange' && getVal(f.field).fromValue && getVal(f.field).toValue)).map((f) => f.field))
    : new Set<string>();

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: config.columns ? `repeat(${config.columns}, minmax(0, 1fr))` : 'repeat(auto-fill, minmax(190px, 1fr))',
  };

  const renderFields = (stacked: boolean) => (
    <div className={stacked ? 'grid gap-3 grid-cols-1 sm:grid-cols-2' : 'grid gap-x-3 gap-y-2.5'} style={stacked ? undefined : gridStyle}>
      {shownFields.map((f) => {
        const v = getVal(f.field);
        return (
          <div key={f.field} className={f.type === 'dateRange' ? 'sm:col-span-2' : ''}>
            <label className="block text-[12px] font-medium mb-1 text-erp-text-muted">
              {f.label}
              {f.required && <span className="text-erp-danger mx-0.5">*</span>}
            </label>
            <FilterInput
              field={f}
              value={v.value}
              fromValue={v.fromValue}
              toValue={v.toValue}
              onChange={(patch, imm) => setField(f.field, patch, imm)}
              lang={lang}
              onOpenSearch={(fc) => setSearchTarget(fc)}
              invalid={missingNames.has(f.field)}
            />
          </div>
        );
      })}
    </div>
  );

  const chipsRow = chips ? (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" role="group" aria-label={t('Status', 'الحالة')}>
      {[{ value: '', label: chips.allLabel || t('All', 'الكل') } as FilterOption, ...chips.options].map((o) => {
        const cur = getVal(chips.field).value;
        const active = (cur === null || cur === undefined || cur === '') ? o.value === '' : String(cur) === String(o.value);
        return (
          <button
            key={String(o.value) + o.label}
            type="button"
            onClick={() => setField(chips.field, { value: o.value === '' ? null : o.value }, true)}
            className={`shrink-0 h-8 px-3 rounded-full border text-[12px] font-medium whitespace-nowrap transition-colors ${
              active
                ? 'bg-erp-accent text-white border-erp-accent'
                : 'bg-erp-surface text-erp-text-muted border-erp-border hover:bg-erp-surface-2 hover:text-erp-text'
            }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  ) : null;

  const countText = (
    <span className="inline-flex items-center gap-1.5 text-xs text-erp-text-muted whitespace-nowrap" aria-live="polite">
      <span className={`size-2 rounded-full ${loading ? 'bg-erp-warning animate-pulse' : 'bg-erp-success'}`} />
      {instant ? t('Live filtering active', 'التصفية المباشرة نشطة') : t('Filters', 'الفلاتر')}
      {resultCount !== undefined && (
        <>
          <span>•</span>
          <span><span className="num font-semibold text-erp-text">{resultCount}</span> {t('results', 'نتيجة')}</span>
        </>
      )}
    </span>
  );

  const clearBtn = (
    <button
      type="button"
      onClick={clearAll}
      disabled={activeCount === 0}
      title={t('Clear all filters', 'مسح الفلاتر')}
      aria-label={t('Clear all filters', 'مسح الفلاتر')}
      className="erp-focus size-9 inline-flex items-center justify-center rounded-lg border border-erp-border bg-erp-surface text-erp-text-muted hover:bg-erp-surface-2 hover:text-erp-danger disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <ClearIcon />
    </button>
  );

  const activeBadge = activeCount > 0 ? (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-erp-accent-soft text-erp-accent text-[11px] font-semibold">
      <span className="num">{activeCount}</span> {t('active', 'نشط')}
    </span>
  ) : null;

  const applyBtn = !instant ? (
    <button type="button" onClick={applyNow}
      className="px-4 h-9 rounded-lg text-[13px] font-medium text-white bg-erp-accent hover:bg-erp-accent-hover transition-colors">
      {t('Apply', 'تطبيق')}
    </button>
  ) : null;

  // ============================ موبايل ============================
  if (isMobile) {
    return (
      <>
        <div className="shrink-0 border-b border-erp-border bg-erp-surface px-3 py-2.5 space-y-2 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="erp-focus flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-erp-border-strong bg-erp-surface text-erp-text text-[13px] font-medium"
            >
              <FunnelIcon />
              {t('Filters', 'الفلاتر')}
              {activeCount > 0 && (
                <span className="num inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-erp-accent text-white text-[11px] font-bold">{activeCount}</span>
              )}
            </button>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} aria-label={t('Clear all filters', 'مسح الفلاتر')}
                className="erp-focus size-11 inline-flex items-center justify-center rounded-lg border border-erp-border bg-erp-surface text-erp-text-muted">
                <ClearIcon />
              </button>
            )}
          </div>
          {chipsRow}
          <div className="flex justify-end">{countText}</div>
        </div>

        {sheetOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[99990]" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-erp-overlay" onClick={() => setSheetOpen(false)} />
            <div className="absolute top-0 inset-x-0 max-h-[88vh] flex flex-col bg-erp-surface rounded-b-2xl shadow-erp-4 border-b border-erp-border">
              <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-erp-border">
                <span className="font-semibold text-erp-text flex items-center gap-2"><FunnelIcon />{t('Filters', 'الفلاتر')} {activeBadge}</span>
                <button type="button" onClick={() => setSheetOpen(false)} aria-label={t('Close', 'إغلاق')}
                  className="size-11 inline-flex items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-2"><ClearIcon /></button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {renderFields(true)}
                {hiddenCount > 0 && (
                  <button type="button" onClick={() => setShowExtra(true)} className="text-[13px] font-medium text-erp-accent">
                    {t(`More filters (+${hiddenCount})`, `فلاتر أكتر (+${hiddenCount})`)}
                  </button>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2 p-3 border-t border-erp-border">
                <button type="button" onClick={clearAll} disabled={activeCount === 0}
                  className="px-4 min-h-[44px] rounded-lg border border-erp-border text-erp-text text-[13px] font-medium disabled:opacity-40">
                  {t('Clear', 'مسح')}
                </button>
                {applyBtn}
                <button type="button" onClick={() => { if (!instant) applyNow(); setSheetOpen(false); }}
                  className="flex-1 min-h-[44px] rounded-lg bg-erp-accent text-white text-[13px] font-semibold">
                  {resultCount !== undefined ? t(`Show ${resultCount} results`, `عرض ${resultCount} نتيجة`) : t('Done', 'تم')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {searchTarget?.searchModal && (
          <Suspense fallback={null}>
            <SearchModal
              isOpen={true}
              onClose={() => setSearchTarget(null)}
              config={searchTarget.searchModal as SearchModalConfig}
              onSelect={(value: any) => { setField(searchTarget.field, { value }, true); setSearchTarget(null); }}
              lang={lang}
              isDark={isDark}
            />
          </Suspense>
        )}
      </>
    );
  }

  // ============================ كمبيوتر / تابلت ============================
  return (
    <>
      <div className="shrink-0 border-b border-erp-border bg-erp-surface px-3 md:px-4 py-3 sticky top-0 z-20 max-h-[50vh] overflow-y-auto">
        {renderFields(false)}

        {chipsRow && <div className="mt-3">{chipsRow}</div>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {clearBtn}
            {applyBtn}
            {hiddenCount > 0 && (
              <button type="button" onClick={() => setShowExtra(true)} className="h-9 px-3 rounded-lg text-[13px] font-medium text-erp-accent hover:bg-erp-accent-soft transition-colors">
                {t(`More filters (+${hiddenCount})`, `فلاتر أكتر (+${hiddenCount})`)}
              </button>
            )}
            {showExtra && !extraActive && sortedFields.length > limit && (
              <button type="button" onClick={() => setShowExtra(false)} className="h-9 px-3 rounded-lg text-[13px] text-erp-text-muted hover:bg-erp-surface-2 transition-colors">
                {t('Fewer filters', 'فلاتر أقل')}
              </button>
            )}
            {activeBadge}
          </div>
          {countText}
        </div>
      </div>

      {searchTarget?.searchModal && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={true}
            onClose={() => setSearchTarget(null)}
            config={searchTarget.searchModal as SearchModalConfig}
            onSelect={(value: any) => { setField(searchTarget.field, { value }, true); setSearchTarget(null); }}
            lang={lang}
            isDark={isDark}
          />
        </Suspense>
      )}
    </>
  );
}
