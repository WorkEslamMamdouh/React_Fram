'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import SearchModal from './SearchModal'; // استيراد SearchModal
import { SearchModalConfig } from '../Import/ModelGrid';

// ============================================================
// TYPES
// ============================================================

export type FilterFieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'dateRange' 
  | 'select' 
  | 'multiselect' 
  | 'boolean'
  | 'search'; // إضافة نوع search

export interface FilterOption {
  value: string | number;
  label: string;
}

export interface FilterFieldConfig {
  field: string;
  label: string;
  type: FilterFieldType;
  options?: FilterOption[]; // للـ select / multiselect
  placeholder?: string;
  defaultValue?: any;
  defaultRange?: {
    from?: string;
    to?: string;
  };
  // للتاريخ: خيارات مسبقة
  quickDateOptions?: boolean;
  // للـ search: تكوين نافذة البحث
  searchModal?: SearchModalConfig;
  // هل الحقل مطلوب في الفلتر؟
  required?: boolean;
  // ترتيب الظهور
  sortOrder?: number;
}

export interface ActiveFilter {
  id: string;
  field: string;
  label: string;
  type: FilterFieldType;
  value: any;
  displayValue: string;
  operator?: string;
  fromValue?: any;
  toValue?: any;
}

export interface AdvancedFilterProps {
  fields: FilterFieldConfig[];
  onApplyFilters: (filters: ActiveFilter[]) => void;
  onClearFilters: () => void;
  initialFilters?: ActiveFilter[];
  lang: 'ar' | 'en';
  isDark: boolean;
  triggerButton?: React.ReactNode;
  defaultFilters?: ActiveFilter[];
}

// ... (الأيقونات كما هي)

// ============================================================
// FILTER ROW COMPONENT (محدث)
// ============================================================

interface FilterRowProps {
  fieldConfig: FilterFieldConfig;
  value: any;
  fromValue?: any;
  toValue?: any;
  onChange: (field: string, value: any, fromValue?: any, toValue?: any) => void;
  onRemove: () => void;
  lang: 'ar' | 'en';
  isDark: boolean;
  onOpenSearch?: (fieldConfig: FilterFieldConfig, currentValue: any, onSelect: (value: any, displayValue: string) => void) => void;
}

const FilterRow: React.FC<FilterRowProps> = ({
  fieldConfig,
  value,
  fromValue,
  toValue,
  onChange,
  onRemove,
  lang,
  isDark,
  onOpenSearch,
}) => {
  const t = (en: string, ar: string) => lang === 'ar' ? ar : en;
  const [showQuickDates, setShowQuickDates] = useState(false);
  
  const quickOptions = useMemo(() => getQuickDateOptions(lang), [lang]);
  
  const handleDateRangeQuick = (from: string, to: string) => {
    onChange(fieldConfig.field, null, from, to);
    setShowQuickDates(false);
  };
  
  const renderInput = () => {
    switch (fieldConfig.type) {
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(fieldConfig.field, e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDark 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="">{t('Select...', 'اختر...')}</option>
            {fieldConfig.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
        
      case 'search':
        return (
          <div className="flex gap-2">
            <input
              type="text"
              value={value || ''}
              readOnly
              placeholder={fieldConfig.placeholder || t('Search...', 'بحث...')}
              className={`flex-1 px-3 py-2 rounded-xl border text-sm ${
                isDark 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
            <button
              type="button"
              onClick={() => onOpenSearch?.(fieldConfig, value, (newValue, displayValue) => {
                onChange(fieldConfig.field, newValue);
                // يمكن تحديث display value هنا إذا أردت
              })}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                isDark 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              🔍
            </button>
          </div>
        );
        
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="relative">
            <div className={`flex flex-wrap gap-1 p-1 border rounded-xl min-h-[42px] ${
              isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              {selectedValues.length === 0 && (
                <span className={`text-sm px-2 py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('Select...', 'اختر...')}
                </span>
              )}
              {selectedValues.map(v => {
                const opt = fieldConfig.options?.find(o => o.value === v);
                return (
                  <span key={v} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {opt?.label || v}
                    <button onClick={() => onChange(fieldConfig.field, selectedValues.filter(s => s !== v))}>
                      <Icons.X />
                    </button>
                  </span>
                );
              })}
              <select
                className="absolute inset-0 opacity-0 cursor-pointer"
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedValues.includes(e.target.value)) {
                    onChange(fieldConfig.field, [...selectedValues, e.target.value]);
                  }
                }}
              >
                <option value="">{t('Add...', 'إضافة...')}</option>
                {fieldConfig.options?.filter(opt => !selectedValues.includes(opt.value)).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        );
        
      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value === true}
                onChange={() => onChange(fieldConfig.field, true)}
                className="w-4 h-4"
              />
              <span className="text-sm">{t('Yes', 'نعم')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value === false}
                onChange={() => onChange(fieldConfig.field, false)}
                className="w-4 h-4"
              />
              <span className="text-sm">{t('No', 'لا')}</span>
            </label>
            {value !== undefined && value !== null && (
              <button onClick={() => onChange(fieldConfig.field, null)} className="text-xs text-gray-400">
                {t('Clear', 'مسح')}
              </button>
            )}
          </div>
        );
        
      case 'dateRange':
        return (
          <div className="space-y-2">
            <div className="relative">
              <button
                onClick={() => setShowQuickDates(!showQuickDates)}
                className={`text-xs px-2 py-1 rounded-lg ${
                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t('Quick select', 'اختيار سريع')}
              </button>
              {showQuickDates && (
                <div className={`absolute top-full left-0 mt-1 z-20 rounded-xl shadow-lg overflow-hidden min-w-[160px] ${
                  isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
                }`}>
                  {quickOptions.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => handleDateRangeQuick(opt.from, opt.to)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('From', 'من')}
                </label>
                <input
                  type="date"
                  value={fromValue || ''}
                  onChange={(e) => onChange(fieldConfig.field, null, e.target.value, toValue)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDark 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex-1">
                <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('To', 'إلى')}
                </label>
                <input
                  type="date"
                  value={toValue || ''}
                  onChange={(e) => onChange(fieldConfig.field, null, fromValue, e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDark 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>
        );
        
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(fieldConfig.field, e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-sm ${
              isDark 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(fieldConfig.field, e.target.value === '' ? null : Number(e.target.value))}
            placeholder={fieldConfig.placeholder}
            className={`w-full px-3 py-2 rounded-xl border text-sm ${
              isDark 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          />
        );
        
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(fieldConfig.field, e.target.value)}
            placeholder={fieldConfig.placeholder || t('Search...', 'بحث...')}
            className={`w-full px-3 py-2 rounded-xl border text-sm ${
              isDark 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          />
        );
    }
  };
  
  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-white/80'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <label className={`font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {fieldConfig.label}
          {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <button
          onClick={onRemove}
          className={`p-1 rounded-lg transition-colors ${
            isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
          }`}
        >
          <Icons.Trash />
        </button>
      </div>
      {renderInput()}
    </div>
  );
};

// ============================================================
// MAIN ADVANCED FILTER COMPONENT (محدث)
// ============================================================

export default function AdvancedFilter({
  fields,
  onApplyFilters,
  onClearFilters,
  initialFilters = [],
  lang,
  isDark,
  triggerButton,
  defaultFilters = [],
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(initialFilters);
  const [tempFilters, setTempFilters] = useState<ActiveFilter[]>(initialFilters);
  const [activeSearchModal, setActiveSearchModal] = useState<{ fieldConfig: FilterFieldConfig; onSelect: (value: any, displayValue: string) => void } | null>(null);
  
  const t = (en: string, ar: string) => lang === 'ar' ? ar : en;
  
  // تحميل الفلاتر الافتراضية
  useEffect(() => {
    if (defaultFilters.length > 0 && activeFilters.length === 0 && initialFilters.length === 0) {
      setActiveFilters(defaultFilters);
      setTempFilters(defaultFilters);
      onApplyFilters(defaultFilters);
    }
  }, [defaultFilters]);
  
  // الحقول المتاحة للإضافة (التي لم تستخدم بعد)
  const availableFields = useMemo(() => {
    const usedFields = tempFilters.map(f => f.field);
    return fields.filter(f => !usedFields.includes(f.field)).sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  }, [fields, tempFilters]);
  
  const handleAddFilter = () => {
    if (!selectedField) return;
    const fieldConfig = fields.find(f => f.field === selectedField);
    if (!fieldConfig) return;
    
    const newFilter: ActiveFilter = {
      id: `${Date.now()}_${Math.random()}`,
      field: fieldConfig.field,
      label: fieldConfig.label,
      type: fieldConfig.type,
      value: fieldConfig.defaultValue || null,
      displayValue: '',
    };
    
    if (fieldConfig.type === 'dateRange' && fieldConfig.defaultRange) {
      newFilter.fromValue = fieldConfig.defaultRange.from;
      newFilter.toValue = fieldConfig.defaultRange.to;
      newFilter.displayValue = `${fieldConfig.defaultRange.from || '...'} → ${fieldConfig.defaultRange.to || '...'}`;
    } else if (fieldConfig.type === 'select' && fieldConfig.defaultValue) {
      const option = fieldConfig.options?.find(o => o.value === fieldConfig.defaultValue);
      newFilter.displayValue = option?.label || String(fieldConfig.defaultValue);
    } else if (fieldConfig.defaultValue) {
      newFilter.displayValue = String(fieldConfig.defaultValue);
    }
    
    setTempFilters([...tempFilters, newFilter]);
    setSelectedField('');
  };
  
  const handleUpdateFilter = (field: string, value: any, fromValue?: any, toValue?: any) => {
    setTempFilters(prev => prev.map(f => {
      if (f.field !== field) return f;
      const updated = { ...f, value, fromValue, toValue };
      
      // تحديث display value
      const fieldConfig = fields.find(fc => fc.field === field);
      if (fieldConfig?.type === 'dateRange') {
        updated.displayValue = `${fromValue || '...'} → ${toValue || '...'}`;
      } else if (fieldConfig?.type === 'select' && value) {
        const option = fieldConfig.options?.find(o => o.value === value);
        updated.displayValue = option?.label || String(value);
      } else if (fieldConfig?.type === 'multiselect' && Array.isArray(value)) {
        const labels = value.map(v => {
          const opt = fieldConfig.options?.find(o => o.value === v);
          return opt?.label || v;
        });
        updated.displayValue = labels.join(', ');
      } else if (value !== null && value !== undefined && value !== '') {
        updated.displayValue = String(value);
      } else {
        updated.displayValue = '';
      }
      
      return updated;
    }));
  };
  
  const handleRemoveFilter = (field: string) => {
    setTempFilters(prev => prev.filter(f => f.field !== field));
  };
  
  const handleOpenSearch = (fieldConfig: FilterFieldConfig, currentValue: any, onSelect: (value: any, displayValue: string) => void) => {
    setActiveSearchModal({ fieldConfig, onSelect });
  };
  
  const handleSearchSelect = (value: any, row: any) => {
    if (activeSearchModal) {
      const displayValue = row[activeSearchModal.fieldConfig.searchModal?.displayField || 'ID'];
      activeSearchModal.onSelect(value, displayValue);
      handleUpdateFilter(activeSearchModal.fieldConfig.field, value);
      setActiveSearchModal(null);
    }
  };
  
  const handleApply = () => {
    setActiveFilters(tempFilters);
    onApplyFilters(tempFilters);
    setIsOpen(false);
  };
  
  const handleClearAll = () => {
    setTempFilters([]);
    setActiveFilters([]);
    onClearFilters();
    setIsOpen(false);
  };
  
  const handleCancel = () => {
    setTempFilters(activeFilters);
    setIsOpen(false);
  };
  
  // شريط الفلاتر النشطة
  const ActiveFiltersBar = () => {
    if (activeFilters.length === 0) return null;
    
    return (
      <div className={`flex flex-wrap items-center gap-2 p-3 border-b ${
        isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50/50'
      }`}>
        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('Active filters:', 'الفلاتر النشطة:')}
        </span>
        {activeFilters.map(filter => (
          <div
            key={filter.id}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
              isDark 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}
          >
            <span className="font-medium">{filter.label}:</span>
            <span>{filter.displayValue || filter.value || '...'}</span>
            <button
              onClick={() => {
                const newFilters = activeFilters.filter(f => f.id !== filter.id);
                setActiveFilters(newFilters);
                onApplyFilters(newFilters);
              }}
              className={`ml-1 p-0.5 rounded-full transition-colors ${
                isDark ? 'hover:bg-blue-400/20' : 'hover:bg-blue-200'
              }`}
            >
              <Icons.X />
            </button>
          </div>
        ))}
        {activeFilters.length > 0 && (
          <button
            onClick={() => {
              setActiveFilters([]);
              onClearFilters();
            }}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              isDark 
                ? 'text-red-400 hover:bg-red-500/20' 
                : 'text-red-500 hover:bg-red-50'
            }`}
          >
            {t('Clear all', 'مسح الكل')} ✕
          </button>
        )}
      </div>
    );
  };
  
  // زر الفلتر
  const FilterButton = () => {
    if (triggerButton) {
      return (
        <div onClick={() => setIsOpen(true)}>
          {triggerButton}
        </div>
      );
    }
    
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
          activeFilters.length > 0
            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
            : isDark
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Icons.Filter />
        {t('Filter', 'فلتر')}
        {activeFilters.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
            {activeFilters.length}
          </span>
        )}
      </button>
    );
  };
  
  return (
    <>
      {/* شريط الفلاتر النشطة */}
      <ActiveFiltersBar />
      
      {/* زر الفلتر */}
      <FilterButton />
      
      {/* نافذة الفلتر المنبثقة */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 animate-fade-in"
            onClick={handleCancel}
          />
          
          <div 
            className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl shadow-2xl transition-all duration-300 animate-slide-up ${
              isDark ? 'bg-gray-900/95' : 'bg-white/95'
            }`}
            style={{
              backdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
            }}
          >
            {/* header */}
            <div className={`flex justify-between items-center px-5 py-4 border-b ${
              isDark ? 'border-gray-700' : 'border-gray-100'
            }`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {t('Advanced Filter', 'فلتر متقدم')}
              </h3>
              <button
                onClick={handleCancel}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <Icons.Close />
              </button>
            </div>
            
            {/* body */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* إضافة فلتر جديد */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'
              }`}>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('Add new filter', 'إضافة فلتر جديد')}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm ${
                      isDark 
                        ? 'bg-gray-800 border-gray-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">{t('Select field...', 'اختر حقل...')}</option>
                    {availableFields.map(field => (
                      <option key={field.field} value={field.field}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddFilter}
                    disabled={!selectedField}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Icons.Plus />
                  </button>
                </div>
              </div>
              
              {/* قائمة الفلاتر */}
              {tempFilters.length === 0 && (
                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('No filters added. Select a field above to start filtering.', 
                     'لا توجد فلاتر. اختر حقلاً من الأعلى لبدء التصفية.')}
                </div>
              )}
              
              {tempFilters.map(filter => {
                const fieldConfig = fields.find(f => f.field === filter.field);
                if (!fieldConfig) return null;
                return (
                  <FilterRow
                    key={filter.id}
                    fieldConfig={fieldConfig}
                    value={filter.value}
                    fromValue={filter.fromValue}
                    toValue={filter.toValue}
                    onChange={(field, value, fromValue, toValue) => 
                      handleUpdateFilter(field, value, fromValue, toValue)
                    }
                    onRemove={() => handleRemoveFilter(filter.field)}
                    lang={lang}
                    isDark={isDark}
                    onOpenSearch={handleOpenSearch}
                  />
                );
              })}
            </div>
            
            {/* footer */}
            <div className={`flex justify-end gap-3 px-5 py-4 border-t ${
              isDark ? 'border-gray-700' : 'border-gray-100'
            }`}>
              <button
                onClick={handleClearAll}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  isDark 
                    ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                    : 'bg-red-50 text-red-500 hover:bg-red-100'
                }`}
              >
                {t('Clear all', 'مسح الكل')}
              </button>
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  isDark 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                onClick={handleApply}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                  isDark 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {t('Apply filters', 'تطبيق الفلاتر')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Search Modal */}
      {activeSearchModal && activeSearchModal.fieldConfig.searchModal && (
        <SearchModal
          isOpen={true}
          onClose={() => setActiveSearchModal(null)}
          onSelect={(value, row) => handleSearchSelect(value, row)}
          config={activeSearchModal.fieldConfig.searchModal}
          lang={lang}
          isDark={isDark}
        />
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </>
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getQuickDateOptions = (lang: 'ar' | 'en') => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 30);
  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 7);
  
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  return [
    { 
      label: lang === 'ar' ? 'اليوم' : 'Today', 
      from: formatDate(today), 
      to: formatDate(today) 
    },
    { 
      label: lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 days', 
      from: formatDate(last7Days), 
      to: formatDate(today) 
    },
    { 
      label: lang === 'ar' ? 'آخر 30 يوم' : 'Last 30 days', 
      from: formatDate(last30Days), 
      to: formatDate(today) 
    },
    { 
      label: lang === 'ar' ? 'هذا الشهر' : 'This month', 
      from: formatDate(startOfMonth), 
      to: formatDate(today) 
    },
    { 
      label: lang === 'ar' ? 'هذه السنة' : 'This year', 
      from: formatDate(startOfYear), 
      to: formatDate(today) 
    },
  ];
};

// أيقونات إضافية
const Icons = {
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  X: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};