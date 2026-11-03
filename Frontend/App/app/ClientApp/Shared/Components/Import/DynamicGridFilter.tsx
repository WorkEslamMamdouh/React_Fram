'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FilterFieldConfig, ActiveFilter, FilterFieldType } from './AdvancedFilter';
import SearchModal from './SearchModal';
import { SearchModalConfig } from './ModelGrid';
import { useSys } from '../../SystemUsing';
import { firstDayOfMonth, today } from '../../dateUtils';

// ============================================================
// TYPES
// ============================================================

export interface GridFilterConfig {
  fields: FilterFieldConfig[];
  visible?: boolean;
  applyOnInit?: boolean;
  applyOnChange?: boolean;
  layout?: "inline" | "stacked";
  columns?: number;
}

export interface DynamicGridFilterProps {
  config: GridFilterConfig;
  onFiltersChange: (filters: ActiveFilter[]) => void;
  onReady?: () => void;
}

// ============================================================
// HELPER
// ============================================================

function resolveDefault(field: FilterFieldConfig): { value?: any; fromValue?: any; toValue?: any } {
  if (field.type === 'dateRange') {
    return {
      fromValue: field.defaultRange?.from || firstDayOfMonth(),
      toValue: field.defaultRange?.to || today(),
    };
  }
  if (field.defaultValue !== undefined) {
    return { value: field.defaultValue };
  }
  return {};
}

function buildInitialFilters(fields: FilterFieldConfig[]): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  for (const f of fields) {
    const defaults = resolveDefault(f);
    const hasValue = defaults.value != null || defaults.fromValue != null || defaults.toValue != null;
    if (hasValue || f.required) {
      filters.push({
        id: f.field,
        field: f.field,
        label: f.label,
        type: f.type,
        value: defaults.value ?? null,
        displayValue: '',
        fromValue: defaults.fromValue,
        toValue: defaults.toValue,
      });
    }
  }
  return filters;
}

// ============================================================
// FILTER INPUT
// ============================================================

const FilterInput: React.FC<{
  field: FilterFieldConfig;
  value: any;
  fromValue?: any;
  toValue?: any;
  onChange: (value: any, fromValue?: any, toValue?: any) => void;
  isDark: boolean;
  lang: string;
  onOpenSearch?: (field: FilterFieldConfig) => void;
}> = ({ field, value, fromValue, toValue, onChange, isDark, lang, onOpenSearch }) => {
  const t = (en: string, ar: string) => lang === "ar" ? ar : en;
  const base = `w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
    isDark ? 'bg-gray-800/60 border-gray-700 text-white placeholder-gray-500' : 'bg-white/90 border-gray-200 text-gray-900 placeholder-gray-400'
  }`;

  switch (field.type) {
    case 'text':
      return (
        <input type="text" className={base} value={value || ''} placeholder={field.placeholder || t("Search...", "بحث...")}
          onChange={(e) => onChange(e.target.value)} />
      );

    case 'number':
      return (
        <input type="number" className={base} value={value ?? ''} placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      );

    case 'date':
      return (
        <input type="date" className={base} value={value || ''}
          onChange={(e) => onChange(e.target.value)} />
      );

    case 'dateRange':
      return (
        <div className="flex gap-2">
          <input type="date" className={base} value={fromValue || ''}
            onChange={(e) => onChange(null, e.target.value, toValue)} />
          <input type="date" className={base} value={toValue || ''}
            onChange={(e) => onChange(null, fromValue, e.target.value)} />
        </div>
      );

    case 'select':
      return (
        <select className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">{field.placeholder || t("All", "الكل")}</option>
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );

    case 'boolean':
      return (
        <select className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">{t("All", "الكل")}</option>
          <option value="true">{t("Yes", "نعم")}</option>
          <option value="false">{t("No", "لا")}</option>
        </select>
      );

    case 'search':
      return (
        <div className="flex gap-2">
          <input type="text" className={`flex-1 ${base}`} value={value || ''} readOnly
            placeholder={field.placeholder || t("Press 🔍", "دوس 🔍")} />
          <button type="button" onClick={() => onOpenSearch?.(field)}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90 transition-all">
            🔍
          </button>
        </div>
      );

    default:
      return (
        <input type="text" className={base} value={value || ''}
          onChange={(e) => onChange(e.target.value)} />
      );
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DynamicGridFilter({ config, onFiltersChange, onReady }: DynamicGridFilterProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = useCallback((en: string, ar: string) => lang === "ar" ? ar : en, [lang]);

  const sortedFields = useMemo(() =>
    [...config.fields].sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)),
    [config.fields]
  );

  const [filters, setFilters] = useState<ActiveFilter[]>(() => buildInitialFilters(sortedFields));
  const [searchTarget, setSearchTarget] = useState<FilterFieldConfig | null>(null);
  const [initialized, setInitialized] = useState(false);

  // applyOnInit: تطبيق الفلاتر الافتراضية أول ما الشاشة تفتح
  useEffect(() => {
    if (!initialized && (config.applyOnInit !== false)) {
      onFiltersChange(filters);
      onReady?.();
      setInitialized(true);
    }
  }, [initialized]);

  const visible = config.visible !== false;
  if (!visible) return null;

  const cols = config.columns || 3;

  const updateFilter = (field: string, value: any, fromValue?: any, toValue?: any) => {
    setFilters(prev => {
      const next = prev.map(f => f.field === field ? { ...f, value, fromValue, toValue } : f);
      // لو الحقل مش موجود، ضيفه
      if (!next.find(f => f.field === field)) {
        const cfg = sortedFields.find(sf => sf.field === field);
        if (cfg) {
          next.push({
            id: field, field, label: cfg.label, type: cfg.type,
            value, displayValue: '', fromValue, toValue,
          });
        }
      }
      if (config.applyOnChange) {
        setTimeout(() => onFiltersChange(next), 0);
      }
      return next;
    });
  };

  const apply = () => {
    // تحقق من الفلاتر الإجبارية
    for (const f of sortedFields) {
      if (!f.required) continue;
      const active = filters.find(af => af.field === f.field);
      if (!active) return;
      if (f.type === 'dateRange') {
        if (!active.fromValue || !active.toValue) {
          Sys_ShowRequired(f.label, t);
          return;
        }
      } else if (active.value == null || active.value === '') {
        Sys_ShowRequired(f.label, t);
        return;
      }
    }
    onFiltersChange(filters);
  };

  const clear = () => {
    const cleared = buildInitialFilters(sortedFields);
    setFilters(cleared);
    if (config.applyOnChange) {
      setTimeout(() => onFiltersChange(cleared), 0);
    }
  };

  const getFilterValue = (field: string) => {
    const f = filters.find(af => af.field === field);
    return { value: f?.value, fromValue: f?.fromValue, toValue: f?.toValue };
  };

  return (
    <>
      <div className={`rounded-2xl border shadow-sm p-3 mb-3 ${isDark ? 'bg-gray-900/60 border-gray-700/50' : 'bg-white/80 border-gray-200'}`}>
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {sortedFields.map((f) => {
            const vals = getFilterValue(f.field);
            return (
              <div key={f.field} className={f.type === 'dateRange' ? 'col-span-2' : ''}>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {f.label}
                  {f.required && <span className="text-red-500 mx-0.5">*</span>}
                </label>
                <FilterInput
                  field={f}
                  value={vals.value}
                  fromValue={vals.fromValue}
                  toValue={vals.toValue}
                  onChange={(v, fv, tv) => updateFilter(f.field, v, fv, tv)}
                  isDark={isDark}
                  lang={lang}
                  onOpenSearch={(fc) => setSearchTarget(fc)}
                />
              </div>
            );
          })}
        </div>

        {!config.applyOnChange && (
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={clear}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              {t("Clear", "مسح")}
            </button>
            <button onClick={apply}
              className="px-5 py-1.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition-all shadow-sm">
              {t("Apply", "تطبيق")}
            </button>
          </div>
        )}
      </div>

      {searchTarget?.searchModal && (
        <SearchModal
          isOpen={true}
          onClose={() => setSearchTarget(null)}
          config={searchTarget.searchModal}
          onSelect={(value: any) => {
            updateFilter(searchTarget.field, value);
            setSearchTarget(null);
          }}
          lang={lang}
          isDark={isDark}
        />
      )}
    </>
  );
}

function Sys_ShowRequired(label: string, t: (en: string, ar: string) => string) {
  try {
    const { Sys } = require('../../SystemTools');
    Sys.ShowMessage(`${label} is required`, `${label} مطلوب`, 'warning');
  } catch { }
}
