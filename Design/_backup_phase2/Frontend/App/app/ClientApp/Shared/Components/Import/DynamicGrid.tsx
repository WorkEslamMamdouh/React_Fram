'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { SQL } from "../../CallDataBase";
import { Sys } from "../../SystemTools";
import { useSys } from "../../SystemUsing";
import { DynamicGridColumn, DynamicGridProps, SortDirection, ColumnMode } from "../Import/ModelGrid";
import { SearchModalConfig } from "../Import/ModelGrid";
import AdvancedFilter, { FilterFieldConfig, ActiveFilter } from './AdvancedFilter';
import DynamicGridFilter from './DynamicGridFilter';
import { displayDate } from "../../dateUtils";

const SearchModal = lazy(() => import("./SearchModal"));
const DynamicSelect = lazy(() => import("./DynamicSelect"));

// ============================================================
// TYPES
// ============================================================

export interface ActionButtonConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any, id: any) => void;
  isVisible?: boolean;
  className?: string;
}

export interface DynamicGridExtendedProps extends DynamicGridProps {
  extraActions?: ActionButtonConfig[];
  enablePrint?: boolean;
  enableEmail?: boolean;
  enableArchive?: boolean;
  enableExportPDF?: boolean;
  enableCopy?: boolean;
  enableShare?: boolean;
  enableHistory?: boolean;
  enableAudit?: boolean;
  onPrint?: (row: any, id: any) => void;
  onEmail?: (row: any, id: any) => void;
  onArchive?: (row: any, id: any) => void;
  onExportPDF?: (row: any, id: any) => void;
  onCopy?: (row: any, id: any) => void;
  onShare?: (row: any, id: any) => void;
  onHistory?: (row: any, id: any) => void;
  onAudit?: (row: any, id: any) => void;
  virtualScroll?: boolean;
  rowHeight?: number;
  debounceDelay?: number;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableExportExcel?: boolean;
  enablePrintGrid?: boolean;
  filterFields?: FilterFieldConfig[];
  defaultFilters?: ActiveFilter[];
  enableAdvancedFilter?: boolean;
  // ✅ تحقق إضافي قبل الحفظ (Validation.ts → ValidateRow) — يرجّع رسالة الخطأ أو null
  beforeSave?: (row: Record<string, any>, isInsert: boolean) => Promise<string | null> | string | null;
  gridFilter?: GridFilterConfig;
  onGridFilterChange?: (filters: ActiveFilter[]) => void;
  deferLoadUntilFilter?: boolean;
}

export interface GridFilterConfig {
  fields: FilterFieldConfig[];
  visible?: boolean;
  applyOnInit?: boolean;
  applyOnChange?: boolean;
  layout?: "inline" | "stacked";
  columns?: number;
}

// ============================================================
// ICONS SVG
// ============================================================

const Icons = {
  Edit: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Delete: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Dots: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  ),
  Print: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  Email: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Archive: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Share: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  ),
  History: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Audit: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  PDF: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Add: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Export: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronDoubleLeft: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  ChevronDoubleRight: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  X: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ============================================================
// GLASS CARD STYLES - Matching the dark mode from CSS
// ============================================================

const glassCardStyle = (isDark: boolean): React.CSSProperties => ({
  background: 'var(--erp-surface)',
  border: '1px solid var(--erp-border)',
  borderRadius: '12px',
  boxShadow: 'var(--erp-shadow-1)',
});

// ============================================================
// BOTTOM SHEET MODAL MENU
// ============================================================

const BottomSheetMenu: React.FC<{
  actions: ActionButtonConfig[];
  row: any;
  id: any;
  isDark: boolean;
  lang: string;
  isOpen: boolean;
  onClose: () => void;
}> = ({ actions, row, id, isDark, lang, isOpen, onClose }) => {
  const visibleActions = actions.filter(action => action.isVisible !== false);
  if (visibleActions.length === 0) return null;
  if (!isOpen) return null;

  const getActionIcon = (key: string) => {
    switch(key) {
      case 'print': return <Icons.Print />;
      case 'email': return <Icons.Email />;
      case 'archive': return <Icons.Archive />;
      case 'copy': return <Icons.Copy />;
      case 'share': return <Icons.Share />;
      case 'history': return <Icons.History />;
      case 'audit': return <Icons.Audit />;
      case 'pdf': return <Icons.PDF />;
      default: return actions.find(a => a.key === key)?.icon;
    }
  };

  const sheetStyle: React.CSSProperties = {
    background: 'var(--erp-surface)',
    borderTop: '1px solid var(--erp-border)',
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-erp-overlay transition-all duration-300"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={onClose}
      />
      
      <div 
        className="fixed left-0 right-0 z-50 mx-auto transition-all duration-300"
        style={{
          bottom: '0',
          maxWidth: '500px',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <div 
          className="rounded-t-2xl overflow-hidden shadow-erp-4"
          style={sheetStyle}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className={`w-12 h-1 rounded-full ${'bg-erp-border-strong'}`} />
          </div>
          
          <div className={`px-5 pt-2 pb-3 border-b ${'border-erp-border'}`}>
            <h3 className={`text-base font-semibold text-center ${'text-erp-text'}`}>
              {lang === 'ar' ? 'الإجراءات' : 'Actions'}
            </h3>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {visibleActions.map((action, idx) => (
              <button
                key={action.key}
                onClick={() => {
                  action.onClick(row, id);
                  onClose();
                }}
                className={`w-full text-start px-5 py-4 min-h-[48px] transition-all duration-150 flex items-center gap-4 border-b ${'border-erp-border hover:bg-erp-surface-2'} active:bg-gray-100 last:border-0`}
                style={{
                  animationDelay: `${idx * 30}ms`,
                  animation: 'fadeInSlide 0.2s ease-out forwards',
                  opacity: 0,
                  transform: 'translateY(10px)'
                }}
              >
                <span className={`w-5 h-5 flex-shrink-0 ${'text-erp-text-muted'}`}>
                  {getActionIcon(action.key)}
                </span>
                <span className={`font-medium text-base ${'text-erp-text'}`}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
          
          <div className={`p-4 pt-2 pb-6 border-t ${'border-erp-border'}`}>
            <button
              onClick={onClose}
              className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-all duration-200 ${
                'bg-erp-surface-2 text-erp-text active:bg-erp-surface-3'
              }`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

// ============================================================
// MODAL DROPDOWN MENU COMPONENT
// ============================================================

const ModalDropdownMenu: React.FC<{
  actions: ActionButtonConfig[];
  row: any;
  id: any;
  isDark: boolean;
  lang: string;
  onClose: () => void;
}> = ({ actions, row, id, isDark, lang, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  const visibleActions = actions.filter(action => action.isVisible !== false);
  if (visibleActions.length === 0) return null;

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const getActionIcon = (key: string) => {
    switch(key) {
      case 'print': return <Icons.Print />;
      case 'email': return <Icons.Email />;
      case 'archive': return <Icons.Archive />;
      case 'copy': return <Icons.Copy />;
      case 'share': return <Icons.Share />;
      case 'history': return <Icons.History />;
      case 'audit': return <Icons.Audit />;
      case 'pdf': return <Icons.PDF />;
      default: return actions.find(a => a.key === key)?.icon;
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`p-2 rounded-xl transition-all duration-200 ${
          isOpen 
            ? ('bg-erp-surface-2 scale-95')
            : ('hover:bg-erp-surface-2')
        }`}
        title={lang === 'ar' ? 'إجراءات إضافية' : 'More actions'}
      >
        <Icons.Dots />
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div 
            className="absolute inset-0 bg-erp-overlay"
            onClick={handleClose}
          />
          
          <div 
            className="relative w-full max-w-sm mx-auto overflow-hidden animate-slide-up"
            style={glassCardStyle(isDark)}
          >
            <div className={`flex justify-end items-center p-4 border-b ${'border-erp-border'}`}>
              <button
                onClick={handleClose}
                className={`p-1 rounded-lg transition-all duration-200 ${
                  'hover:bg-erp-surface-2'
                }`}
              >
                <Icons.Close />
              </button>
            </div>
            
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {visibleActions.map((action, idx) => (
                <button
                  key={action.key}
                  onClick={() => {
                    action.onClick(row, id);
                    handleClose();
                  }}
                  className={`
                    w-full text-start px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 group
                    ${'text-erp-text hover:bg-erp-accent-soft hover:text-erp-accent'
                    }
                    ${action.className || ''}
                  `}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    animation: 'fadeInSlide 0.2s ease-out forwards',
                    opacity: 0,
                    transform: 'translateY(-8px)'
                  }}
                >
                  <span className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${'text-erp-text-muted group-hover:text-erp-accent'}`}>
                    {getActionIcon(action.key)}
                  </span>
                  <span className="font-medium text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </>
  );
};

// ============================================================
// GLASS CONTAINER - Using glassCardStyle
// ============================================================

const GlassContainer: React.FC<{
  children: React.ReactNode;
  isDark: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, isDark, className = '', style = {} }) => {
  return (
    <div 
      className={`${className}`}
      style={{
        ...glassCardStyle(isDark),
        ...style,
        padding: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
};

// ============================================================
// RESPONSIVE CARD COMPONENT
// ============================================================

const MobileCard: React.FC<{
  row: any;
  visibleColumns: DynamicGridColumn[];
  showSelection: boolean;
  selected: boolean;
  onSelect: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onDoubleClick?: (row: any) => void;
  allActions: ActionButtonConfig[];
  isDark: boolean;
  lang: string;
  t: (en: string, ar: string) => string;
  onMenuClose: () => void;
  openBottomSheet: (row: any) => void;
  index: number;
}> = ({ row, visibleColumns, showSelection, selected, onSelect, onEdit, onDelete, onDoubleClick, allActions, isDark, lang, t, openBottomSheet }) => {
  const cardStyle: React.CSSProperties = {
    background: 'var(--erp-surface)',
    border: '1px solid ' + (selected ? 'var(--erp-accent)' : 'var(--erp-border)'),
    borderRadius: '12px',
    boxShadow: 'var(--erp-shadow-1)',
  };

  const hasExtraActions = allActions.length > 0;

  return (
    <div 
      className="group mb-3 transition-all duration-200 hover:shadow-md active:scale-[0.99]"
      style={cardStyle}
      onDoubleClick={() => onDoubleClick?.(row)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3 pb-2 border-b border-erp-border">
          <div className="flex items-center gap-3">
            {showSelection && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(row)}
                onClick={(e) => e.stopPropagation()}
                className="size-4 rounded border-erp-border-strong accent-[var(--erp-accent)] transition-all"
              />
            )}
            <span className={`text-xs font-mono ${'text-erp-text-subtle'}`}>
              #{row.ID || row.id || '-'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(row)}
                title={t("Edit", "تعديل")}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 ${'text-erp-warning-text hover:bg-erp-warning-bg'}`}
              >
                <div className="text-inherit"><Icons.Edit /></div>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(row)}
                title={t("Delete", "حذف")}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 ${'text-erp-danger hover:bg-erp-danger-bg'}`}
              >
                <div className="text-inherit"><Icons.Delete /></div>
              </button>
            )}
            {hasExtraActions && (
              <button
                onClick={() => openBottomSheet(row)}
                className={`p-2 rounded-xl transition-all duration-200 ${'text-erp-text-muted hover:bg-erp-surface-2'}`}
                title={t("More actions", "إجراءات إضافية")}
              >
                <Icons.Menu />
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-2.5">
          {visibleColumns.map((col, idx) => {
            const value = row[col.field];
            let displayValue = value;
            if (col.type === "checkbox") {
              displayValue = value ? (lang === "ar" ? "✅ نعم" : "✅ Yes") : (lang === "ar" ? "❌ لا" : "❌ No");
            } else if (col.IsDigits && value) {
              displayValue = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
            } else if (value === null || value === undefined) {
              displayValue = "-";
            }
            
            return (
              <div key={idx} className="flex justify-between items-start gap-2">
                <span className={`text-xs uppercase tracking-wide font-semibold ${'text-erp-text-subtle'} min-w-[90px]`}>
                  {col.title}:
                </span>
                <span className={`num text-sm text-end flex-1 font-medium break-words [overflow-wrap:anywhere] ${'text-erp-text'}`}>
                  {String(displayValue)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// UTILITIES
// ============================================================

const formatCurrency = (value: any, locale: string = 'en-US'): string => {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getButtonClass = (type: 'primary' | 'success' | 'danger' | 'warning' | 'gray', isDark: boolean): string => {
  const baseClass = "px-3 h-11 md:h-9 rounded-lg font-medium text-[13px] transition-colors duration-200 erp-focus disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5";
  
  const styles = {
    primary: "bg-erp-primary hover:bg-erp-primary-hover text-erp-on-primary",
    success: "bg-erp-accent hover:bg-erp-accent-hover text-white",
    danger: "bg-erp-danger hover:opacity-90 text-white",
    warning: "bg-erp-warning hover:opacity-90 text-white",
    gray: "bg-erp-surface border border-erp-border text-erp-text hover:bg-erp-surface-2",
  };
  
  return `${baseClass} ${styles[type]}`;
};

// ============================================================
// INPUT CONTROL COMPONENT
// ============================================================

const InputControl: React.FC<{
  column: DynamicGridColumn;
  value: any;
  onChange: (value: any) => void;
  onSearch?: (column: DynamicGridColumn) => void;
  error?: string;
  lang: string;
  isDark: boolean;
  disabled?: boolean;
  isEdit?: boolean;
}> = ({ column, value, onChange, onSearch, error, lang, isDark, disabled, isEdit = false }) => {
  const inputType = column.inputType || column.type || "text";
  const baseClass = `w-full border rounded-lg px-3 h-10 md:h-9 focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition-all duration-200 text-[13px]`;
  const themeClass = "bg-erp-surface border-erp-border-strong text-erp-text placeholder:text-erp-text-subtle";
  const errorClass = error ? "!border-erp-danger" : "";
  
  const getDisabledState = (): boolean => {
    if (disabled) return true;
    if (isEdit && column.IsDisabledInEdit) return true;
    if (!isEdit && column.IsDisabledInAdd) return true;
    if (column.enabledWhen) {
      const mode: ColumnMode = isEdit ? "edit" : "create";
      if (!column.enabledWhen({}, mode)) return true;
    }
    return false;
  };
  
  const disabledClass = getDisabledState() ? "opacity-60 cursor-not-allowed !bg-erp-surface-2" : "";

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  if (isEdit && column.EditTemplate) {
    return <>{column.EditTemplate(value, { [column.field]: value }, onChange, true)}</>;
  }

  if (!isEdit && column.InsertTemplate) {
    return <>{column.InsertTemplate(value, onChange)}</>;
  }

  if (inputType === "selectSearch" && column.selectConfig) {
    return (
      <Suspense fallback={<div className={`${baseClass} ${themeClass}`}>...</div>}>
        <DynamicSelect
          config={column.selectConfig}
          value={value}
          onChange={(v) => onChange(v)}
          disabled={getDisabledState()}
          error={!!error}
          className=""
        />
      </Suspense>
    );
  }

  if (inputType === "select" || column.type === "select") {
    const options = column.selectOptions || column.options || [];
    return (
      <select
        className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass}`}
        value={value ?? ""}  // ✅ ?? بدل || عشان القيمة 0 تظهر صح
        onChange={(e) => onChange(e.target.value)}
        disabled={getDisabledState()}
      >
        <option value="">{t("Select...", "اختر...")}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (inputType === "search" && column.searchModal) {
    return (
      <div className="flex gap-2">
        <input
          type="text" 
          className={`flex-1 ${baseClass} ${themeClass} ${errorClass} ${disabledClass}`}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={column.placeholder || t("Search...", "بحث...")}
          readOnly
          disabled={getDisabledState()}
        />
        <button
          type="button"
          onClick={() => onSearch?.(column)}
          disabled={getDisabledState()}
          className={getButtonClass('primary', isDark)}
        >
          🔍
        </button>
      </div>
    );
  }

  if (inputType === "textarea") {
    return (
      <textarea
        className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={column.placeholder}
        rows={column.rows || 2}
        disabled={getDisabledState()}
      />
    );
  }

  if (inputType === "checkbox" || column.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value || false}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-erp-border-strong accent-[var(--erp-accent)] transition-all"
        disabled={getDisabledState()}
      />
    );
  }

  if (inputType === "date" || column.type === "date") {
    return (
      <input
        type="date"
        className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={getDisabledState()}
      />
    );
  }

  if (inputType === "number" || column.type === "number") {
    return (
      <input
        type="number"
        className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder={column.placeholder}
        min={column.min}
        max={column.max}
        step={column.step}
        disabled={getDisabledState()}
      />
    );
  }

  return (
    <input
      type="text"
      className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass}`}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={column.placeholder}
      disabled={getDisabledState()}
    />
  );
};

// ============================================================
// FORM MODAL COMPONENT
// ============================================================

interface FormModalProps {
  isOpen: boolean;
  title: string;
  data: Record<string, any>;
  columns: DynamicGridColumn[];
  validationErrors: Record<string, string>;
  onClose: () => void;
  onSave: () => void;
  onChange: (field: string, value: any) => void;
  onSearch: (column: DynamicGridColumn) => void;
  isDark: boolean;
  lang: string;
  isEdit?: boolean;
  compCode: number;
  branchCode: number;
  keyTrType: string;
  runProcessTrans: boolean;
  ShowLoader: () => void;
  CloseLoader: () => void;
}

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  title,
  data,
  columns,
  validationErrors,
  onClose,
  onSave,
  onChange,
  onSearch,
  isDark,
  lang,
  isEdit = false,
  compCode,
  branchCode,
  keyTrType,
  runProcessTrans,
  ShowLoader,
  CloseLoader,
}) => {
  if (!isOpen) return null;

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;
  
  const mode: ColumnMode = isEdit ? "edit" : "create";
  const sortedColumns = [...columns]
    .filter(c => {
      if (c.visibleWhen && !c.visibleWhen(data, mode)) return false;
      if (mode === "create") return c.visibleInCreate ?? (c.insertable !== false);
      if (mode === "edit") return c.visibleInEdit ?? (c.editable !== false);
      return true;
    })
    .sort((a, b) => (a.SortFieldInEditAndAdd || 999) - (b.SortFieldInEditAndAdd || 999));

  return createPortal(
    <div className="fixed inset-0 z-[99999]">
      <div
        className="absolute inset-0 bg-erp-overlay backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <div
          className="relative w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden rounded-xl shadow-erp-4 animate-slide-up"
          style={glassCardStyle(isDark)}
        >
          <div className={`flex justify-between items-center px-5 py-4 border-b sticky top-0 z-10 shrink-0 ${'border-erp-border bg-erp-surface'}`}>
            <h3 className={`text-[18px] leading-6 font-semibold truncate ${'text-erp-text'}`}>
              {title}
            </h3>
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors duration-200 ${'hover:bg-erp-surface-2 text-erp-text-muted'}`}>
              <Icons.Close />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-5 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedColumns.map(col => (
                <div key={col.field} className="space-y-1.5">
                  <label className={`block text-[13px] font-medium ${'text-erp-text'}`}>
                    {col.title}
                    {col.IsRequired && <span className="text-erp-danger ms-1">*</span>}
                  </label>
                  <InputControl
                    column={col}
                    value={data[col.field]}
                    onChange={(value) => onChange(col.field, value)}
                    onSearch={onSearch}
                    error={validationErrors[col.field]}
                    lang={lang}
                    isDark={isDark}
                    isEdit={isEdit}
                  />
                  {validationErrors[col.field] && (
                    <p className="text-erp-danger text-xs mt-1">{validationErrors[col.field]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className={`flex justify-end gap-3 px-5 py-4 border-t sticky bottom-0 z-10 shrink-0 ${'border-erp-border bg-erp-surface'}`} style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <button onClick={onClose} className={getButtonClass('gray', isDark)}>{t("Cancel", "إلغاء")}</button>
            <button onClick={onSave} className={getButtonClass('success', isDark)}>{t("Save", "حفظ")}</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>,
    document.body
  );
};

// ============================================================
// BUILD FILTER CONDITION FUNCTION
// ============================================================

const escSql = (v: any): string => String(v ?? '').replace(/'/g, "''");
const isValidField = (f: string): boolean => /^[\w.[\]]+$/.test(f);
const isValidDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d);

const buildFilterCondition = (filters: ActiveFilter[], lang: string): string => {
  if (!filters || filters.length === 0) return '';

  const conditions: string[] = [];

  for (const filter of filters) {
    if (!filter.value && !filter.fromValue && !filter.toValue) continue;
    if (!isValidField(filter.field)) continue;

    switch (filter.type) {
      case 'text':
      case 'search':
        if (filter.value) {
          conditions.push(`${filter.field} LIKE N'%${escSql(filter.value)}%'`);
        }
        break;
      case 'number':
        if (filter.value !== null && filter.value !== undefined && filter.value !== '') {
          const num = Number(filter.value);
          if (!isNaN(num)) conditions.push(`${filter.field} = ${num}`);
        }
        break;
      case 'date':
        if (filter.value && isValidDate(String(filter.value))) {
          conditions.push(`CONVERT(date, ${filter.field}) = '${filter.value}'`);
        }
        break;
      case 'dateRange':
        {
          const from = filter.fromValue && isValidDate(String(filter.fromValue)) ? filter.fromValue : null;
          const to = filter.toValue && isValidDate(String(filter.toValue)) ? filter.toValue : null;
          if (from && to) {
            conditions.push(`CONVERT(date, ${filter.field}) BETWEEN '${from}' AND '${to}'`);
          } else if (from) {
            conditions.push(`CONVERT(date, ${filter.field}) >= '${from}'`);
          } else if (to) {
            conditions.push(`CONVERT(date, ${filter.field}) <= '${to}'`);
          }
        }
        break;
      case 'select':
        if (filter.value) {
          conditions.push(`${filter.field} = '${escSql(filter.value)}'`);
        }
        break;
      case 'multiselect':
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          const values = filter.value.map(v => `'${escSql(v)}'`).join(',');
          conditions.push(`${filter.field} IN (${values})`);
        }
        break;
      case 'boolean':
        if (filter.value !== null && filter.value !== undefined) {
          conditions.push(`${filter.field} = ${filter.value ? 1 : 0}`);
        }
        break;
    }
  }

  return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';
};

// ============================================================
// MAIN DYNAMIC GRID COMPONENT
// ============================================================

export default function DynamicGrid({
  tableName,
  keyColumn,
  columns,
  condition = "",
  orderBy = "",
  orderType = "DESC",
  pageSize = 20,
  enableInsert = true,
  enableUpdate = true,
  enableDelete = true,
  enableSearch = true,
  enableExport = true,
  enableSort = true,
  enableSelection = false,
  searchColumns: externalSearchColumns,
  height = 500,
  onRowDoubleClick,
  onRowSelect,
  isModalMode = false,
  compCode = 1,
  branchCode = 1,
  keyTrType = "",
  runProcessTrans = true,
  extraActions = [],
  enablePrint = false,
  enableEmail = false,
  enableArchive = false,
  enableExportPDF = false,
  enableCopy = false,
  enableShare = false,
  enableHistory = false,
  enableAudit = false,
  virtualScroll = false,
  debounceDelay = 500,
  onPrint,
  onEmail,
  onArchive,
  onExportPDF,
  onCopy,
  onShare,
  onHistory,
  onAudit,
  filterFields = [],
  defaultFilters = [],
  enableAdvancedFilter = false,
  beforeSave,
  gridFilter,
  onGridFilterChange,
  deferLoadUntilFilter,
}: DynamicGridExtendedProps & { compCode?: number; branchCode?: number; keyTrType?: string; runProcessTrans?: boolean }) {
  
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const ShowLoader = useSys((s) => s.ShowLoader);
  const CloseLoader = useSys((s) => s.CloseLoader);
  
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [searchTemp, setSearchTemp] = useState<string>("");
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>(orderBy || keyColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(orderType as SortDirection);
  
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeSearchModal, setActiveSearchModal] = useState<DynamicGridColumn | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [selectedRowForSheet, setSelectedRowForSheet] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(defaultFilters);
  const [gridFilterValues, setGridFilterValues] = useState<ActiveFilter[]>([]);
  const [gridFilterReady, setGridFilterReady] = useState(!gridFilter || !deferLoadUntilFilter);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const rowHeight = 65;

  // Responsive check
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Container style adjustment
  useEffect(() => {
    if (containerRef.current && !isMobile) {
      const scrollContainer = containerRef.current;
      if (scrollContainer) {
        scrollContainer.style.overflow = 'auto';
        scrollContainer.style.flex = '1';
      }
    }
  }, [isMobile, data]);

  // Search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (search !== searchTemp) {
        setSearch(searchTemp);
        setPageNumber(1);
      }
    }, debounceDelay);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTemp, debounceDelay]);

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  // Build extra actions
  const buildExtraActions = useCallback((): ActionButtonConfig[] => {
    const actions: ActionButtonConfig[] = [...extraActions];
    
    if (enablePrint && onPrint) {
      actions.push({ key: 'print', label: t("Print", "طباعة"), icon: <Icons.Print />, onClick: onPrint });
    }
    if (enableEmail && onEmail) {
      actions.push({ key: 'email', label: t("Email", "بريد"), icon: <Icons.Email />, onClick: onEmail });
    }
    if (enableArchive && onArchive) {
      actions.push({ key: 'archive', label: t("Archive", "أرشفة"), icon: <Icons.Archive />, onClick: onArchive });
    }
    if (enableExportPDF && onExportPDF) {
      actions.push({ key: 'pdf', label: t("Export PDF", "PDF"), icon: <Icons.PDF />, onClick: onExportPDF });
    }
    if (enableCopy && onCopy) {
      actions.push({ key: 'copy', label: t("Copy", "نسخ"), icon: <Icons.Copy />, onClick: onCopy });
    }
    if (enableShare && onShare) {
      actions.push({ key: 'share', label: t("Share", "مشاركة"), icon: <Icons.Share />, onClick: onShare });
    }
    if (enableHistory && onHistory) {
      actions.push({ key: 'history', label: t("History", "التاريخ"), icon: <Icons.History />, onClick: onHistory });
    }
    if (enableAudit && onAudit) {
      actions.push({ key: 'audit', label: t("Audit", "تدقيق"), icon: <Icons.Audit />, onClick: onAudit });
    }
    
    return actions;
  }, [extraActions, enablePrint, enableEmail, enableArchive, enableExportPDF, enableCopy, enableShare, enableHistory, enableAudit, onPrint, onEmail, onArchive, onExportPDF, onCopy, onShare, onHistory, onAudit, t]);

  const allActions = buildExtraActions();

  // Get search columns
  const getSearchColumns = useCallback((): string[] => {
    if (externalSearchColumns && externalSearchColumns.length > 0) {
      return externalSearchColumns;
    }
    return columns.filter(col => col.IsSearchColumn !== false).map(col => col.field);
  }, [columns, externalSearchColumns]);

  const getDataBaseFieldName = (col: DynamicGridColumn): string => {
    return col.NameDataBase || col.field;
  };

  const formatDisplayValue = (col: DynamicGridColumn, value: any): string => {
    if (col.IsDigits) return formatCurrency(value, lang === 'ar' ? 'ar-EG' : 'en-US');
    if (col.type === "checkbox") {
      return value ? (lang === "ar" ? "✅ نعم" : "✅ Yes") : (lang === "ar" ? "❌ لا" : "❌ No");
    }
    if (value === null || value === undefined) return "-";
    if ((col.type === "date" || col.inputType === "date") && col.dateDisplayFormat) {
      return displayDate(value, col.dateDisplayFormat);
    }
    return String(value);
  };

  // Validation
  const validateRow = (rowData: Record<string, any>, isInsert: boolean = true): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    for (const col of columns) {
      if (col.IsSave === false) continue;
      if (isInsert && col.insertable === false) continue;
      if (!isInsert && col.editable === false) continue;
      
      const value = rowData[col.field];
      
      if (col.IsRequired) {
        const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          errors[col.field] = col.validationMessage || t(`${col.title} is required`, `${col.title} مطلوب`);
          continue;
        }
      }
      
      if (col.IsValid && value !== undefined && value !== null && value !== "") {
        if (!col.IsValid(value, rowData)) {
          errors[col.field] = col.validationMessage || t(`Invalid value for ${col.title}`, `قيمة غير صالحة لـ ${col.title}`);
        }
      }
      
      if ((col.type === "number" || col.inputType === "number") && value !== undefined && value !== null && value !== "") {
        if (isNaN(Number(value))) {
          errors[col.field] = t(`${col.title} must be a number`, `${col.title} يجب أن يكون رقماً`);
        }
      }
    }
    
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const prepareDataForSave = (rowData: Record<string, any>): Record<string, any> => {
    const saveData: Record<string, any> = {};
    for (const col of columns) {
      if (col.IsSave !== false) {
        const dbFieldName = getDataBaseFieldName(col);
        saveData[dbFieldName] = rowData[col.field];
      }
    }
    return saveData;
  };

  // Sorting
  const handleSort = (field: string) => {
    if (!enableSort) return;
    const column = columns.find(col => col.field === field);
    if (column && column.sortable === false) return;
    const newDirection = sortField === field && sortDirection === "ASC" ? "DESC" : "ASC";
    setSortField(field);
    setSortDirection(newDirection);
    setPageNumber(1);
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!gridFilterReady) return;
    setLoading(true);
    try {
      let finalCondition = condition;
      const searchCols = getSearchColumns();

      let searchCondition = '';
      if (enableSearch && search && searchCols.length > 0) {
        const safeSearch = escSql(search);
        const searchParts = searchCols.filter(isValidField).map(col => `${col} LIKE N'%${safeSearch}%'`);
        searchCondition = searchParts.length > 0 ? `(${searchParts.join(" OR ")})` : '';
      } else if (enableSearch && search) {
        const safeSearch = escSql(search);
        const allColumns = columns.filter(c => c.IsVisibleDisplayInGrid !== false).map(col => col.field).filter(isValidField);
        const searchParts = allColumns.map(col => `${col} LIKE N'%${safeSearch}%'`);
        searchCondition = searchParts.length > 0 ? `(${searchParts.join(" OR ")})` : '';
      }

      const advancedFilterCondition = enableAdvancedFilter ? buildFilterCondition(activeFilters, lang) : '';
      const gridFilterCondition = gridFilterValues.length > 0 ? buildFilterCondition(gridFilterValues, lang) : '';

      let combinedCondition = '';
      if (condition) combinedCondition = condition;
      if (searchCondition) combinedCondition = combinedCondition
        ? `(${combinedCondition}) AND ${searchCondition}`
        : searchCondition;
      if (advancedFilterCondition) combinedCondition = combinedCondition
        ? `(${combinedCondition}) AND ${advancedFilterCondition}`
        : advancedFilterCondition;
      if (gridFilterCondition) combinedCondition = combinedCondition
        ? `(${combinedCondition}) AND ${gridFilterCondition}`
        : gridFilterCondition;

      finalCondition = combinedCondition;
      
      const result = await SQL.Select(
        tableName, finalCondition, null, null, null, 0,
        sortField, sortDirection, 0, "", null, null,
        pageNumber, pageSize, true
      );
      setData(result.data);
      setTotal(result.totalCount);
      requestAnimationFrame(() => {
        if (shouldRestoreFocusRef.current && searchInputRef.current) {
          searchInputRef.current.focus();
          const length = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(length, length);
          shouldRestoreFocusRef.current = false;
        }
      });
    } catch (error) {
      console.error("Failed to load data:", error);
      if (!isModalMode) {
        Sys.ShowMessage("❌ Failed to load data", "❌ فشل تحميل البيانات", "error");
      }
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tableName, condition, search, pageNumber, pageSize, sortField, sortDirection, enableSearch, getSearchColumns, columns, isModalMode, activeFilters, enableAdvancedFilter, lang, gridFilterValues, gridFilterReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CRUD Operations
  const openAddForm = () => {
    const emptyRow: Record<string, any> = {};
    columns.forEach(col => {
      if (col.DefaultValue !== undefined && col.DefaultValue !== null) {
        emptyRow[col.field] = col.DefaultValue;
      } else if (col.type === "checkbox") {
        emptyRow[col.field] = false;
      } else {
        emptyRow[col.field] = "";
      }
    });
    setFormData(emptyRow);
    setValidationErrors({});
    setFormMode("add");
    setShowFormModal(true);
  };

  const openEditForm = (row: any) => {
    setFormData({ ...row });
    setValidationErrors({});
    setFormMode("edit");
    setShowFormModal(true);
  };

  const handleSave = async () => {
    const isInsert = formMode === "add";
    const { isValid, errors } = validateRow(formData, isInsert);
    
    if (!isValid) {
      setValidationErrors(errors);
      const firstError = Object.values(errors)[0];
      Sys.ShowMessage(`❌ ${firstError}`, `❌ ${firstError}`, "error");
      return;
    }
    
    setValidationErrors({});

    // ✅ التحقق الإضافي (قواعد Validation.ts) قبل الحفظ
    if (beforeSave) {
      try {
        ShowLoader();
        const msg = await beforeSave(formData, isInsert);
        if (msg) {
          Sys.ShowMessage("❌ " + msg, "❌ " + msg, "error");
          return;
        }
      } catch (e) {
        const m = Sys.GetErrorMessage(e);
        Sys.ShowMessage("❌ Validation failed: " + m, "❌ فشل التحقق: " + m, "error");
        return;
      } finally {
        CloseLoader();
      }
    }

    const saveData = prepareDataForSave(formData);
    
    try {
      let result;
      if (isInsert) {
        const request = {
          compCode,
          branchCode,
          keyTrType,
          masterKeyColumn: keyColumn,
          runProcessTrans,
          master: { tableName: tableName, data: saveData }
        };
        result = await SQL.InsertMasterDetail(request, ShowLoader, CloseLoader);
      } else {
        const request = {
          compCode,
          branchCode,
          keyTrType,
          masterKeyColumn: keyColumn,
          runProcessTrans,
          master: { tableName: tableName, keyColumn: keyColumn, data: saveData }
        };
        result = await SQL.UpdateMasterDetail(request, ShowLoader, CloseLoader);
      }
      
      if (result && result.IsSuccess) {
        Sys.ShowMessage(
          isInsert ? "✅ Record added successfully!" : "✅ Record updated successfully!",
          isInsert ? "✅ تمت إضافة السجل بنجاح!" : "✅ تم تعديل السجل بنجاح!",
          "success"
        );
        setShowFormModal(false);
        loadData();
      } else {
        Sys.ShowMessage("❌ Error: " + (result?.ErrorMessage || "Unknown error"), "❌ خطأ", "error");
      }
    } catch (error) {
      console.error("Save failed:", error);
      const msg = Sys.GetErrorMessage(error);
      Sys.ShowMessage("❌ Failed to save record: " + msg, "❌ فشل حفظ السجل: " + msg, "error");
    }
  };

  const handleDelete = async (row: any) => {
    if (!(await Sys.Confirm(`Are you sure you want to delete record ${row[keyColumn]}?`, `هل أنت متأكد من حذف السجل رقم ${row[keyColumn]}؟`, { danger: true }))) return;
    try {
      const request = {
        compCode,
        branchCode,
        keyTrType,
        masterKeyColumn: keyColumn,
        runProcessTrans,
        master: { tableName: tableName, keyColumn: keyColumn, id: row[keyColumn] }
      };
      const result = await SQL.DeleteMasterDetail(request, ShowLoader, CloseLoader);
      
      if (result && result.IsSuccess) {
        Sys.ShowMessage("✅ Record deleted successfully!", "✅ تم حذف السجل بنجاح!", "success");
        loadData();
      } else {
        Sys.ShowMessage("❌ Error: " + (result?.ErrorMessage || "Unknown error"), "❌ خطأ", "error");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      const msg = Sys.GetErrorMessage(error);
      Sys.ShowMessage("❌ Failed to delete record: " + msg, "❌ فشل حذف السجل: " + msg, "error");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      Sys.ShowMessage("⚠️ Please select at least one row", "⚠️ الرجاء تحديد صف واحد على الأقل", "warning");
      return;
    }
    
    if (!(await Sys.Confirm(`Delete ${selectedRows.length} selected record(s)?`, `حذف ${selectedRows.length} سجل؟`, { danger: true }))) return;
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of selectedRows) {
      try {
        const request = {
          compCode,
          branchCode,
          keyTrType,
          masterKeyColumn: keyColumn,
          runProcessTrans,
          master: { tableName: tableName, keyColumn: keyColumn, id: row[keyColumn] }
        };
        const result = await SQL.DeleteMasterDetail(request, ShowLoader, CloseLoader);
        if (result && result.IsSuccess) successCount++;
        else errorCount++;
      } catch { errorCount++; }
    }
    
    if (successCount > 0) {
      Sys.ShowMessage(`✅ ${successCount} record(s) deleted successfully!`, `✅ تم حذف ${successCount} سجل بنجاح!`, "success");
    }
    if (errorCount > 0) {
      Sys.ShowMessage(`❌ ${errorCount} record(s) failed to delete`, `❌ فشل حذف ${errorCount} سجل`, "error");
    }
    
    setSelectedRows([]);
    loadData();
  };

  const exportCSV = async () => {
    try {
      Sys.ShowMessage("⏳ Preparing export...", "⏳ جاري تجهيز التصدير...", "warning");
      const allData = await SQL.Select(
        tableName, condition, null, ShowLoader, CloseLoader, 0,
        sortField, sortDirection, 0, search, null, null,
        0, 0, false
      );
      const headers = columns.filter(c => c.IsVisibleDisplayInGrid !== false).map(c => c.title).join(",");
      const rows = allData.data.map((row: any) =>
        columns.filter(c => c.IsVisibleDisplayInGrid !== false).map(c => {
          let value = row[c.field];
          if (value === null || value === undefined) return "";
          if (typeof value === "boolean") return value ? "Yes" : "No";
          if (c.IsDigits) return formatCurrency(value, 'en-US');
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      ).join("\n");
      const blob = new Blob(["\uFEFF" + headers + "\n" + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableName}_export_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      Sys.ShowMessage(`✅ Exported ${allData.data.length} records!`, `✅ تم تصدير ${allData.data.length} سجل!`, "success");
    } catch (error) {
      console.error("Export failed:", error);
      Sys.ShowMessage("❌ Failed to export data", "❌ فشل تصدير البيانات", "error");
    }
  };

  // Selection handlers
  const toggleSelection = (row: any) => {
    const newSelected = selectedRows.find(r => r[keyColumn] === row[keyColumn])
      ? selectedRows.filter(r => r[keyColumn] !== row[keyColumn])
      : [...selectedRows, row];
    setSelectedRows(newSelected);
    onRowSelect?.(row);
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...data]);
    }
  };
  
  const openBottomSheet = (row: any) => {
    setSelectedRowForSheet(row);
    setBottomSheetOpen(true);
  };
  
  const closeBottomSheet = () => {
    setBottomSheetOpen(false);
    setSelectedRowForSheet(null);
  };

  const visibleColumns = columns.filter(col => col.IsVisibleDisplayInGrid !== false);

  // Virtual scroll
  const visibleData = useMemo(() => {
    if (!virtualScroll) return data;
    const startIndex = Math.floor(scrollTop / rowHeight);
    const endIndex = Math.min(startIndex + Math.ceil(Number(height) / rowHeight) + 5, data.length);
    return data.slice(startIndex, endIndex);
  }, [data, scrollTop, height, rowHeight, virtualScroll]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (virtualScroll) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [virtualScroll]);

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className={`flex justify-center items-center p-12 rounded-xl ${'bg-erp-surface'} border border-erp-border`}>
        <div className="relative">
          <div className="w-10 h-10 border-[3px] border-erp-accent border-t-transparent rounded-full animate-spin"></div>
          <div className={`mt-3 text-sm font-medium ${'text-erp-text-muted'}`}>
            {t(`Loading data...`, `⏳ جاري تحميل البيانات...`)}
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);
  const maxVisiblePages = 5;
  const startPage = Math.max(1, pageNumber - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  const searchPlaceholder = t("🔍 Search...", "🔍 بحث...");
  const addNewText = t("+ Add New", "+ إضافة جديد");
  const exportText = t("📥 Export CSV", "📥 تصدير CSV");
  const refreshText = t("🔄 Refresh", "🔄 تحديث");
  const totalRecordsText = t("records", "سجل");
  const noDataText = t("📭 No data found", "📭 لا توجد بيانات");
  const actionsText = t("Actions", "الإجراءات");

  const showToolbar = !isModalMode;
  const showSelection = enableSelection || !isModalMode;
 
  return (
    <>
      <GlassContainer isDark={isDark} className="w-full" style={{ height: typeof height === "number" ? `${height}px` : height }}>
        {/* Search Modal — lazy loaded */}
        {activeSearchModal && activeSearchModal.searchModal && (
          <Suspense fallback={null}>
            <SearchModal
              isOpen={true}
              onClose={() => setActiveSearchModal(null)}
              onSelect={(value: any, row: any) => {
                setFormData({ ...formData, [activeSearchModal.field]: value });
                setActiveSearchModal(null);
              }}
              config={activeSearchModal.searchModal}
              lang={lang}
              isDark={isDark}
            />
          </Suspense>
        )}

        {/* Grid Filter — ثابت فوق الجريد */}
        {gridFilter && gridFilter.fields.length > 0 && (
          <DynamicGridFilter
            config={gridFilter}
            onFiltersChange={(filters) => {
              setGridFilterValues(filters);
              if (!gridFilterReady) setGridFilterReady(true);
              onGridFilterChange?.(filters);
              setPageNumber(1);
            }}
            onReady={() => { if (!gridFilterReady) setGridFilterReady(true); }}
          />
        )}

        {/* Add/Edit Form Modal */}
        <FormModal
          isOpen={showFormModal}
          title={formMode === "add" ? t("Add New Record", "إضافة سجل جديد") : t("Edit Record", "تعديل سجل")}
          data={formData}
          columns={columns}
          validationErrors={validationErrors}
          onClose={() => setShowFormModal(false)}
          onSave={handleSave}
          onChange={(field, value) => setFormData({ ...formData, [field]: value })}
          onSearch={(col) => setActiveSearchModal(col)}
          isDark={isDark}
          lang={lang}
          isEdit={formMode === "edit"}
          compCode={compCode}
          branchCode={branchCode}
          keyTrType={keyTrType}
          runProcessTrans={runProcessTrans}
          ShowLoader={ShowLoader}
          CloseLoader={CloseLoader}
        />

        {/* Toolbar */}
        {showToolbar && (
          <div className={`flex flex-wrap gap-2 p-3 border-b ${'border-erp-border'}`}>
            <div className="flex flex-1 flex-wrap gap-2">
              {enableSearch && (
                <div className="flex flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={searchPlaceholder}
                      className={`w-full h-9 border rounded-lg ps-9 pe-3 text-[13px] focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition-all duration-200 ${
                        'bg-erp-surface border-erp-border-strong text-erp-text placeholder:text-erp-text-subtle'
                      }`}
                      value={searchTemp}
                      onChange={(e) => {
                        shouldRestoreFocusRef.current = true;
                        setSearchTemp(e.target.value);
                      }}
                    />
                    <div className="absolute start-3 top-1/2 -translate-y-1/2 text-erp-text-subtle">
                      <Icons.Search />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {/* Advanced Filter Button */}
                {enableAdvancedFilter && filterFields.length > 0 && (
                  <AdvancedFilter
                    fields={filterFields}
                    onApplyFilters={(filters) => {
                      setActiveFilters(filters);
                      setPageNumber(1);
                    }}
                    onClearFilters={() => {
                      setActiveFilters([]);
                      setPageNumber(1);
                    }}
                    initialFilters={activeFilters}
                    defaultFilters={defaultFilters}
                    lang={lang}
                    isDark={isDark}
                  />
                )}
                
                {enableInsert && (
                  <button onClick={openAddForm} className={getButtonClass('success', isDark)}>
                    <Icons.Add />
                    <span className="hidden sm:inline">{addNewText}</span>
                  </button>
                )}
                {enableDelete && selectedRows.length > 0 && (
                  <button onClick={handleDeleteSelected} className={getButtonClass('danger', isDark)}>
                    <Icons.Delete />
                    <span className="hidden sm:inline">{t("Delete", "حذف")} ({selectedRows.length})</span>
                  </button>
                )}
                {enableExport && data.length > 0 && (
                  <button onClick={exportCSV} className={getButtonClass('primary', isDark)}>
                    <Icons.Export />
                    <span className="hidden sm:inline">{exportText}</span>
                  </button>
                )}
                <button onClick={() => loadData()} className={getButtonClass('gray', isDark)}>
                  <Icons.Refresh />
                  <span className="hidden sm:inline">{refreshText}</span>
                </button>
              </div>
            </div>
            <div className={`text-end text-xs self-center whitespace-nowrap ${'text-erp-text-muted'}`}>
              📊 {t("Total", "الإجمالي")}: <span className="num font-bold text-erp-text">{total}</span> {totalRecordsText}
            </div>
          </div>
        )}

        {/* Data Table / Cards */}
        {isMobile ? (
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto p-3" 
            onScroll={handleScroll}
            style={{ overflowY: 'auto', flex: 1 }}
          >
            <div className="pb-4">
              {data.length === 0 ? (
                <div className={`text-center p-12 ${'text-erp-text-muted'}`}>{noDataText}</div>
              ) : (
                (virtualScroll ? visibleData : data).map((row, idx) => {
                  const uniqueKey = row[keyColumn] !== undefined && row[keyColumn] !== null 
                    ? `${row[keyColumn]}_${idx}` : `row_${idx}`;
                  return (
                    <MobileCard
                      key={uniqueKey}
                      row={row}
                      visibleColumns={visibleColumns}
                      showSelection={showSelection}
                      selected={!!selectedRows.find(r => r[keyColumn] === row[keyColumn])}
                      onSelect={toggleSelection}
                      onEdit={enableUpdate ? openEditForm : undefined}
                      onDelete={enableDelete ? handleDelete : undefined}
                      onDoubleClick={onRowDoubleClick}
                      allActions={allActions}
                      isDark={isDark}
                      lang={lang}
                      t={t}
                      onMenuClose={() => {}}
                      openBottomSheet={openBottomSheet}
                      index={idx}
                    />
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto" 
            onScroll={handleScroll}
            style={{ overflowY: 'auto', flex: 1 }}
          >
            <div className="min-w-[800px]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-erp-surface-2 border-b border-erp-border-strong">
                  <tr>
                    {showSelection && (
                      <th className="px-3 h-10 w-10">
                        <input
                          type="checkbox"
                          checked={selectedRows.length === data.length && data.length > 0}
                          onChange={toggleSelectAll}
                          className="size-4 rounded border-erp-border-strong accent-[var(--erp-accent)] transition-all"
                        />
                      </th>
                    )}
                    {visibleColumns.map((col, idx) => (
                      <th 
                        key={idx} 
                        className={`px-3 h-10 text-start font-semibold text-[11px] uppercase tracking-[.04em] whitespace-nowrap text-erp-text-muted ${enableSort && col.sortable !== false ? 'cursor-pointer select-none hover:text-erp-accent transition-colors' : 'cursor-default'}`}
                        style={{ width: col.width }}
                        onClick={() => handleSort(col.field)}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.title}
                          {enableSort && col.sortable !== false && sortField === col.field && (
                            <span className="text-erp-accent">
                              {sortDirection === "ASC" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    {!isModalMode && (
                      <th className="px-3 h-10 text-center w-24 text-erp-text-muted font-semibold text-[11px] uppercase tracking-[.04em]">
                        {actionsText}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + (showSelection ? 2 : 1)} className={`text-center p-12 ${'text-erp-text-muted'}`}>
                        {noDataText}
                      </td>
                    </tr>
                  ) : (
                    (virtualScroll ? visibleData : data).map((row, idx) => {
                      const uniqueKey = row[keyColumn] !== undefined && row[keyColumn] !== null 
                        ? `${row[keyColumn]}_${idx}` : `row_${idx}`;
                      return (
                        <tr 
                          key={uniqueKey} 
                          className={`h-12 border-b transition-colors duration-150 ${
                            !!selectedRows.find(r => r[keyColumn] === row[keyColumn]) ? 'border-erp-border bg-erp-accent-soft' : 'border-erp-border hover:bg-erp-surface-2'
                          }`}
                          onDoubleClick={() => onRowDoubleClick?.(row)}
                        >
                          {showSelection && (
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={!!selectedRows.find(r => r[keyColumn] === row[keyColumn])}
                                onChange={() => toggleSelection(row)}
                                onClick={(e) => e.stopPropagation()}
                                className="size-4 rounded border-erp-border-strong accent-[var(--erp-accent)] transition-all"
                              />
                            </td>
                          )}
                          {visibleColumns.map((col, cIdx) => {
                            const value = row[col.field];
                            if (col.inlineToggle) {
                              return (
                                <td key={`${col.field}_${uniqueKey}`} className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={!!value && value !== 0 && value !== "0"}
                                    onChange={async (e) => {
                                      const newVal = e.target.checked;
                                      const cfg = col.inlineToggle!;
                                      try {
                                        if (cfg.confirmBeforeChange !== false) {
                                          const ok = await Sys.Confirm(
                                            newVal ? `Approve record ${row[keyColumn]}?` : `Unapprove record ${row[keyColumn]}?`,
                                            newVal ? `اعتماد السجل رقم ${row[keyColumn]}؟` : `إلغاء اعتماد السجل رقم ${row[keyColumn]}؟`,
                                            { danger: !newVal }
                                          );
                                          if (!ok) return;
                                        }
                                        const trType = newVal ? cfg.approveTrType : cfg.unapproveTrType;
                                        const dbField = col.NameDataBase || col.field;
                                        const updateData: any = { [keyColumn]: row[keyColumn], [dbField]: newVal ? 1 : 0 };
                                        const req: any = {
                                          compCode: (row as any).CompCode || 1,
                                          branchCode: (row as any).BranchCode || 1,
                                          keyTrType: trType || "",
                                          masterKeyColumn: keyColumn,
                                          runProcessTrans: !!trType,
                                          master: { tableName, keyColumn, data: updateData },
                                        };
                                        const res = await SQL.UpdateMasterDetail(req, null, null);
                                        if (res?.IsSuccess) {
                                          const index = data.findIndex(r => r[keyColumn] === row[keyColumn]);
                                          if (index !== -1) {
                                            const newData = [...data];
                                            newData[index] = { ...row, [col.field]: newVal ? 1 : 0 };
                                            setData(newData);
                                          }
                                          Sys.ShowMessage("Updated", "تم التحديث", "success");
                                        } else {
                                          Sys.ShowMessage(res?.ErrorMessage || "Failed", res?.ErrorMessage || "فشل", "error");
                                        }
                                      } catch (err: any) {
                                        console.error(err);
                                        Sys.ShowMessage(err?.message || "Error", err?.message || "خطأ", "error");
                                      }
                                    }}
                                    className="size-4 rounded accent-[var(--erp-accent)] cursor-pointer"
                                  />
                                </td>
                              );
                            }
                            if (col.itemTemplate) {
                              return (
                                <td key={`${col.field}_${uniqueKey}`} className="px-3 py-2">
                                  {col.itemTemplate(value, row, idx, (newValue) => {
                                    const newRow = { ...row, [col.field]: newValue };
                                    const index = data.findIndex(r => r[keyColumn] === row[keyColumn]);
                                    if (index !== -1) {
                                      const newData = [...data];
                                      newData[index] = newRow;
                                      setData(newData);
                                    }
                                    if (onRowSelect) onRowSelect(newRow);
                                  })}
                                </td>
                              );
                            }
                            return (
                              <td key={`${col.field}_${uniqueKey}`} className={`px-3 py-2 text-[13px] text-erp-text ${col.IsDigits || col.type === "number" ? "num text-end" : ""}`}>
                                {formatDisplayValue(col, value)}
                              </td>
                            );
                          })}
                          {!isModalMode && (
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {enableUpdate && (
                                  <button
                                    onClick={() => openEditForm(row)}
                                    className="p-1.5 rounded-lg transition-colors duration-200 text-erp-text-muted hover:text-erp-warning-text hover:bg-erp-warning-bg"
                                    title={t("Edit", "تعديل")}
                                  >
                                    <Icons.Edit />
                                  </button>
                                )}
                                {enableDelete && (
                                  <button
                                    onClick={() => handleDelete(row)}
                                    className="p-1.5 rounded-lg transition-colors duration-200 text-erp-text-muted hover:text-erp-danger hover:bg-erp-danger-bg"
                                    title={t("Delete", "حذف")}
                                  >
                                    <Icons.Delete />
                                  </button>
                                )}
                                {allActions.length > 0 && (
                                  <ModalDropdownMenu 
                                    actions={allActions} 
                                    row={row} 
                                    id={row[keyColumn]} 
                                    isDark={isDark} 
                                    lang={lang}
                                    onClose={() => {}}
                                  />
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer: showing X of Y + Pagination */}
        {total > 0 && !isModalMode && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-erp-border bg-erp-surface-2 text-xs text-erp-text-muted">
            <span>
              {t("Showing", "عرض")} <span className="num font-semibold text-erp-text">{Math.min(data.length, total)}</span> {t("of", "من")} <span className="num font-semibold text-erp-text">{total}</span> {totalRecordsText}
            </span>
            <span className="num">{t("Page size", "حجم الصفحة")}: {pageSize}</span>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap justify-center items-center gap-1.5 p-3 border-t border-erp-border bg-erp-surface">
            <button
              onClick={() => setPageNumber(1)}
              disabled={pageNumber === 1}
              className={`p-1.5 rounded-lg disabled:opacity-50 transition-all duration-200 ${
                'text-erp-text-muted hover:bg-erp-surface-2'
              }`}
            >
              <Icons.ChevronDoubleLeft />
            </button>
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber === 1}
              className={`p-1.5 rounded-lg disabled:opacity-50 transition-all duration-200 ${
                'text-erp-text-muted hover:bg-erp-surface-2'
              }`}
            >
              <Icons.ChevronLeft />
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                <button
                  key={page}
                  onClick={() => setPageNumber(page)}
                  className={`num px-3 h-9 rounded-lg transition-colors duration-200 min-w-[36px] text-[13px] font-medium ${
                    pageNumber === page 
                      ? "bg-erp-accent text-white"
                      : ('text-erp-text-muted hover:bg-erp-surface-2')
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
              disabled={pageNumber === totalPages}
              className={`p-1.5 rounded-lg disabled:opacity-50 transition-all duration-200 ${
                'text-erp-text-muted hover:bg-erp-surface-2'
              }`}
            >
              <Icons.ChevronRight />
            </button>
            <button
              onClick={() => setPageNumber(totalPages)}
              disabled={pageNumber === totalPages}
              className={`p-1.5 rounded-lg disabled:opacity-50 transition-all duration-200 ${
                'text-erp-text-muted hover:bg-erp-surface-2'
              }`}
            >
              <Icons.ChevronDoubleRight />
            </button>
            <span className="text-xs ms-1 text-erp-text-subtle">
              {t("Page", "صفحة")} <span className="num font-bold text-erp-text">{pageNumber}</span> {t("of", "من")} <span className="num font-bold text-erp-text">{totalPages}</span>
            </span>
          </div>
        )}
      </GlassContainer>
      
      {/* Bottom Sheet Menu */}
      {bottomSheetOpen && selectedRowForSheet && (
        <BottomSheetMenu
          actions={allActions}
          row={selectedRowForSheet}
          id={selectedRowForSheet[keyColumn]}
          isDark={isDark}
          lang={lang}
          isOpen={bottomSheetOpen}
          onClose={closeBottomSheet}
        />
      )}
    </>
  );
}

// Export for external use
export type { SearchModalConfig, DynamicGridColumn, DynamicGridProps };