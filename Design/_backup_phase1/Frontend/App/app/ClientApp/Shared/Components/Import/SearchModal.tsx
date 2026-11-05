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
  const baseClass = "px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const styles = {
    primary: isDark 
      ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500" 
      : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    success: isDark 
      ? "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500" 
      : "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
    danger: isDark 
      ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500" 
      : "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    warning: isDark 
      ? "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500" 
      : "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    gray: isDark 
      ? "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500" 
      : "bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500",
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
  const themeClass = isDark 
    ? "bg-gray-900 text-white border-gray-700"
    : "bg-white text-gray-900 border-gray-200";

 return createPortal(
  <div className="fixed inset-0 z-[99999]">
    
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    />

    {/* Modal Container */}
    <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">

      <div
        className={`
          rounded-3xl
          w-full
          max-w-[95vw]
          md:max-w-[90vw]
          lg:max-w-[85vw]
          h-[92vh]
          flex
          flex-col
          overflow-hidden
          shadow-2xl
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
            ${isDark ? "border-gray-700 bg-[#111827]/95" : "border-gray-200 bg-white/95"}
          `}
        >
          <h3 className="text-lg md:text-2xl font-bold truncate">
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
              rounded-xl
              transition-all
              duration-200
              ${
                isDark
                  ? "hover:bg-white/10 text-gray-300"
                  : "hover:bg-gray-100 text-gray-600"
              }
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
            ${isDark ? "border-gray-700 bg-[#0f172a]" : "border-gray-200 bg-white"}
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
              p-3
              rounded-2xl
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
              transition-all
              ${
                isDark
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }
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
            ${isDark ? "border-gray-700 bg-[#111827]/95" : "border-gray-200 bg-white/95"}
          `}
          style={{
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          <div className="text-sm text-gray-500 truncate">
            {selectedRow && config.displayField && (
              <span className="text-emerald-500 font-medium">
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