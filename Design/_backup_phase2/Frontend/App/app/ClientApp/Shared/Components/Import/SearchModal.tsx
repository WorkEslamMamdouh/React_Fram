// SearchModal.tsx
'use client';


import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { SQL } from "../../CallDataBase";
import DynamicGrid from "../Import/DynamicGrid"; 
import  { DynamicGridColumn, SearchModalConfig } from "../Import/ModelGrid"; 


// ============================================================
// TYPES
// ============================================================

 
export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: any, row: any) => void;
  config: SearchModalConfig;
  lang: string;
  isDark: boolean;
}

// ============================================================
// UTILITIES
// ============================================================

const getButtonClass = (type: 'primary' | 'success' | 'danger' | 'warning' | 'gray', isDark: boolean): string => {
  const baseClass = "px-4 h-10 rounded-lg font-medium text-[13px] transition-colors duration-200 erp-focus disabled:opacity-50 disabled:cursor-not-allowed";
  
  const styles = {
    primary: "bg-erp-accent hover:bg-erp-accent-hover text-white",
    success: "bg-erp-success hover:opacity-90 text-white",
    danger: "bg-erp-danger hover:opacity-90 text-white",
    warning: "bg-erp-warning hover:opacity-90 text-white",
    gray: "bg-erp-surface border border-erp-border text-erp-text hover:bg-erp-surface-2",
  };
  
  return `${baseClass} ${styles[type]}`;
};

// ============================================================
// SEARCH MODAL COMPONENT
// ============================================================

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  config,
  lang,
  isDark,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [gridKey, setGridKey] = useState(0);

  // تحويل إعدادات الـ SearchModal إلى إعدادات DynamicGrid
  const gridColumns: DynamicGridColumn[] = config.columns.map(col => ({
    field: col.field,
    title: col.title,
    type: col.type || "text",
    width: col.width,
    sortable:  col.IsSorTable !== false,
    IsVisibleDisplayInGrid: col.IsVisible !== false, // true إذا لم يتم تحديد false
  }));

  // بناء شرط البحث
  const buildSearchCondition = (searchText: string): string => {
    if (!searchText) return config.condition || "";
    
    if (config.searchColumns && config.searchColumns.length > 0) {
      const searchParts = config.searchColumns.map(col => `${col} LIKE N'%${searchText}%'`);
      const searchClause = `(${searchParts.join(" OR ")})`;
      return config.condition 
        ? `(${config.condition}) AND ${searchClause}`
        : searchClause;
    }
    
    const searchParts = config.columns.map(col => `${col.field} LIKE N'%${searchText}%'`);
    const searchClause = `(${searchParts.join(" OR ")})`;
    return config.condition 
      ? `(${config.condition}) AND ${searchClause}`
      : searchClause;
  };

  const handleSearch = () => {
    setGridKey(prev => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;
  const themeClass = "bg-erp-surface text-erp-text border border-erp-border";

 return createPortal(
  <div className="fixed inset-0 z-[99999]">
    
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-erp-overlay backdrop-blur-[2px]"
      onClick={onClose}
    />

    {/* Modal Container */}
    <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">

      <div
        className={`
          rounded-xl
          w-full
          max-w-[95vw]
          md:max-w-[90vw]
          lg:max-w-[85vw]
          h-[92vh]
          flex
          flex-col
          overflow-hidden
          shadow-erp-4
          animate-in
          fade-in
          zoom-in-95
          duration-200
          ${themeClass}
        `}
      >

        {/* Header */}
        <div
          className={`
            flex
            justify-between
            items-center
            px-5
            py-4
            border-b
            sticky
            top-0
            z-10
            backdrop-blur-xl
            shrink-0
            border-erp-border bg-erp-surface
          `}
        >
          <h3 className="text-[18px] leading-6 font-semibold truncate">
            {config.title}
          </h3>

          <button
            onClick={onClose}
            className={`
              w-10
              h-10
              flex
              items-center
              justify-center
              rounded-lg
              transition-colors
              duration-200
              hover:bg-erp-surface-2 text-erp-text-muted
            `}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div
          className={`
            p-4
            border-b
            shrink-0
            border-erp-border bg-erp-surface
          `}
        >
          <input
            type="text"
            placeholder={t(
              "🔍 Search... (press Enter to search)",
              "🔍 بحث..."
            )}
            className={`
              w-full
              border
              h-10
              px-3
              text-[13px]
              rounded-lg
              focus:outline-none
              focus:border-erp-accent
              focus:shadow-[0_0_0_3px_var(--erp-accent-soft)]
              transition
              bg-erp-surface border-erp-border-strong text-erp-text placeholder:text-erp-text-subtle
            `}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Grid */}
        <div
          className="flex-1 overflow-hidden min-h-0 p-3 md:p-5"
          key={gridKey}
        >
          <div className="h-full min-h-0">
            <DynamicGrid
              tableName={config.tableName}
              keyColumn={config.keyColumn}
              columns={gridColumns}
              condition={buildSearchCondition(searchValue)}
              orderBy={config.orderBy || config.keyColumn}
              orderType={config.orderType || "ASC"}
              pageSize={config.pageSize || 20}
              enableInsert={false}
              enableUpdate={false}
              enableDelete={false}
              enableSearch={false}
              enableExport={false}
              enableSort={true}
              enableSelection={true}
              height="100%"
              isModalMode={true}
              onRowSelect={(row) => setSelectedRow(row)}
              onRowDoubleClick={(row) => {
                onSelect(row[config.returnField], row);
                onClose();
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className={`
            flex
            justify-between
            items-center
            gap-3
            px-4
            py-4
            border-t
            sticky
            bottom-0
            z-10
            shrink-0
            backdrop-blur-xl
            border-erp-border bg-erp-surface
          `}
          style={{
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          <div className="text-sm text-erp-text-muted truncate">
            {selectedRow && config.displayField && (
              <span className="text-erp-success font-medium">
                {t("Selected:", "المحدد:")}{" "}
                {selectedRow[config.displayField]}
              </span>
            )}
          </div>

          <div className="flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className={getButtonClass("gray", isDark)}
            >
              {t("Cancel", "إلغاء")}
            </button>

            <button
              onClick={() => {
                if (selectedRow) {
                  onSelect(
                    selectedRow[config.returnField],
                    selectedRow
                  );
                  onClose();
                }
              }}
              disabled={!selectedRow}
              className={getButtonClass("primary", isDark)}
            >
              {t("Select", "تحديد")}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
};

export default SearchModal;