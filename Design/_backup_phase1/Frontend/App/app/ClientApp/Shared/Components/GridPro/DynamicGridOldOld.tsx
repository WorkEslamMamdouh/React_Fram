'use client';

import React, { useEffect, useState, useCallback, useRef } from "react";
import { SQL } from "../../CallDataBase";
import { Sys } from "../../SystemTools";
import { useSys } from "../../SystemUsing";

// ============================================================
// TYPES
// ============================================================

export type ColumnType = "text" | "number" | "select" | "checkbox" | "date";
export type SortDirection = "ASC" | "DESC";
export type InputControlType = "text" | "number" | "select" | "search" | "date" | "textarea" | "checkbox";

export interface SelectOption {
  value: any;
  label: string;
}

export interface SearchModalConfig {
  title: string;
  tableName: string;
  keyColumn: string;
  columns: Array<{ field: string; title: string; width?: number; type?: ColumnType }>;
  searchColumns?: string[];
  returnField: string;
  displayField?: string;
  condition?: string;
  pageSize?: number;
  orderBy?: string;
  orderType?: SortDirection;
}

export interface DynamicGridColumn {
  field: string;
  NameDataBase?: string;
  title: string;
  type?: ColumnType;
  editable?: boolean;
  insertable?: boolean;
  sortable?: boolean;
  IsSave?: boolean;
  IsVisibleDisplayInGrid?: boolean;
  IsDigits?: boolean;
  IsSearchColumn?: boolean;
  IsDisabledInEdit?: boolean;
  IsDisabledInAdd?: boolean;
  SortFieldInEditAndAdd?: number;  // ✅ ترتيب الحقل في الفورم
  width?: number | string;
  options?: SelectOption[];
  IsRequired?: boolean;
  IsValid?: (value: any, row?: any) => boolean;
  validationMessage?: string;
  inputType?: InputControlType;
  selectOptions?: SelectOption[];
  searchModal?: SearchModalConfig;
  placeholder?: string;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  DefaultValue?: any;
  itemTemplate?: (value: any, row: any, index: number, onChange: (newValue: any) => void) => React.ReactNode;
  EditTemplate?: (value: any, row: any, onChange: (newValue: any) => void, isEdit: boolean) => React.ReactNode;
  InsertTemplate?: (value: any, onChange: (newValue: any) => void) => React.ReactNode;
}

export interface DynamicGridProps {
  tableName: string;
  keyColumn: string;
  columns: DynamicGridColumn[];
  condition?: string;
  orderBy?: string;
  orderType?: SortDirection;
  pageSize?: number;
  enableInsert?: boolean;
  enableUpdate?: boolean;
  enableDelete?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  enableSort?: boolean;
  enableSelection?: boolean;
  searchColumns?: string[];
  height?: number | string;
  onRowDoubleClick?: (row: any) => void;
  onRowSelect?: (row: any) => void;
  isModalMode?: boolean;
}

// ============================================================
// UTILITIES
// ============================================================

const formatCurrency = (value: any): string => {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ✅ تحسين ألوان الأزرار حسب الوضع
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
      ? "bg-green-600 hover:bg-amber-700 text-white focus:ring-amber-500" 
      : "bg-green-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    gray: isDark 
      ? "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500" 
      : "bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500",
  };
  
  return `${baseClass} ${styles[type]}`;
};

// ============================================================
// SEARCH MODAL - محسن
// ============================================================

const SearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: any, row: any) => void;
  config: SearchModalConfig;
  lang: string;
  isDark: boolean;
}> = ({ isOpen, onClose, onSelect, config, lang, isDark }) => {
  const [searchValue, setSearchValue] = useState("");
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [gridKey, setGridKey] = useState(0);

  const gridColumns: DynamicGridColumn[] = config.columns.map(col => ({
    field: col.field,
    title: col.title,
    type: col.type || "text",
    width: col.width,
    sortable: true,
    IsVisibleDisplayInGrid: true,
  }));

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className={`rounded-2xl w-full max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] h-[85vh] flex flex-col overflow-hidden shadow-2xl ${themeClass}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 md:p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <h3 className="text-xl md:text-2xl font-bold">{config.title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">×</button>
        </div>
        
        {/* Search Bar */}
        <div className={`p-4 md:p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder={t("🔍 Search... (press Enter to search)", "🔍 بحث... (اضغط Enter للبحث)")}
              className={`flex-1 border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                isDark 
                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSearch}
              className={getButtonClass('primary', isDark)}
            >
              {t("Search", "بحث")}
            </button>
          </div>
        </div>
        
        {/* DynamicGrid */}
        <div className="flex-1 overflow-hidden p-4 md:p-6" key={gridKey}>
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
        
        {/* Footer */}
        <div className={`flex justify-between items-center gap-3 p-4 md:p-6 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="text-sm text-gray-500">
            {selectedRow && config.displayField && (
              <span className="text-emerald-600 font-medium">
                {t("Selected:", "المحدد:")} {selectedRow[config.displayField]}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className={getButtonClass('gray', isDark)}>
              {t("Cancel", "إلغاء")}
            </button>
            <button
              onClick={() => {
                if (selectedRow) {
                  onSelect(selectedRow[config.returnField], selectedRow);
                  onClose();
                }
              }}
              disabled={!selectedRow}
              className={getButtonClass('primary', isDark)}
            >
              {t("Select", "تحديد")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INPUT CONTROL COMPONENT - محسن
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
  const baseClass = `w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`;
  const themeClass = isDark 
    ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
    : "bg-white border-gray-300 text-gray-900";
  const errorClass = error ? "border-red-500 ring-red-500" : "";
  
  const getDisabledState = (): boolean => {
    if (disabled) return true;
    if (isEdit && column.IsDisabledInEdit) return true;
    if (!isEdit && column.IsDisabledInAdd) return true;
    return false;
  };
  
  const disabledClass = getDisabledState() ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700" : "";

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  if (isEdit && column.EditTemplate) {
    return <>{column.EditTemplate(value, { [column.field]: value }, onChange, true)}</>;
  }

  if (!isEdit && column.InsertTemplate) {
    return <>{column.InsertTemplate(value, onChange)}</>;
  }

  if (inputType === "select" || column.type === "select") {
    const options = column.selectOptions || column.options || [];
    return (
      <select
        className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass}`}
        value={value || ""}
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
        rows={column.rows || 3}
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
        className="w-5 h-5 rounded border-gray-300 focus:ring-blue-500"
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
// FORM MODAL COMPONENT - محسن بشكل كبير
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
}) => {
  if (!isOpen) return null;

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;
  const themeClass = isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  
  // ✅ ترتيب الأعمدة حسب SortFieldInEditAndAdd
  const sortedColumns = [...columns]
    .filter(c => isEdit ? c.editable !== false : c.insertable !== false)
    .sort((a, b) => (a.SortFieldInEditAndAdd || 999) - (b.SortFieldInEditAndAdd || 999));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${themeClass}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 md:p-6 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <h3 className="text-xl md:text-2xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">×</button>
        </div>
        
        {/* Form Fields - Grid Layout */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {sortedColumns.map(col => (
              <div key={col.field} className="space-y-1">
                <label className="block text-sm font-medium">
                  {col.title}
                  {col.IsRequired && <span className="text-red-500 ml-1">*</span>}
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
                  <p className="text-red-500 text-xs mt-1">{validationErrors[col.field]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className={`flex justify-end gap-3 p-4 md:p-6 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <button onClick={onClose} className={getButtonClass('gray', isDark)}>
            {t("Cancel", "إلغاء")}
          </button>
          <button onClick={onSave} className={getButtonClass('success', isDark)}>
            {t("Save", "حفظ")}
          </button>
        </div>
      </div>
    </div>
  );
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
}: DynamicGridProps) {
  
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang); 
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [searchTemp, setSearchTemp] = useState<string>("");
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>(orderBy || keyColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(orderType);
  
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeSearchModal, setActiveSearchModal] = useState<DynamicGridColumn | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

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
    if (col.IsDigits) {
      return formatCurrency(value);
    }
    if (col.type === "checkbox") {
      return value ? (lang === "ar" ? "✅ نعم" : "✅ Yes") : (lang === "ar" ? "❌ لا" : "❌ No");
    }
    if (value === null || value === undefined) return "-";
    return String(value);
  };

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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearch(searchTemp);
      setPageNumber(1);
    }
  };

  const handleSearchBlur = () => {
    if (search !== searchTemp) {
      setSearch(searchTemp);
      setPageNumber(1);
    }
  };

  const handleSort = (field: string) => {
    if (!enableSort) return;
    const column = columns.find(col => col.field === field);
    if (column && column.sortable === false) return;
    const newDirection = sortField === field && sortDirection === "ASC" ? "DESC" : "ASC";
    setSortField(field);
    setSortDirection(newDirection);
    setPageNumber(1);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let finalCondition = condition;
      const searchCols = getSearchColumns();
      
      if (enableSearch && search && searchCols.length > 0) {
        const searchParts = searchCols.map(col => `${col} LIKE N'%${search}%'`);
        const searchClause = `(${searchParts.join(" OR ")})`;
        finalCondition = condition 
          ? `(${condition}) AND ${searchClause}`
          : searchClause;
      } else if (enableSearch && search) {
        const allColumns = columns.filter(c => c.IsVisibleDisplayInGrid !== false).map(col => col.field);
        const searchParts = allColumns.map(col => `${col} LIKE N'%${search}%'`);
        const searchClause = `(${searchParts.join(" OR ")})`;
        finalCondition = condition 
          ? `(${condition}) AND ${searchClause}`
          : searchClause;
      }
      
      const result = await SQL.Select(
        tableName, finalCondition, null, () => {}, () => {}, 0,
        sortField, sortDirection, 0, "", null, null,
        pageNumber, pageSize, true
      );
      setData(result.data);
      setTotal(result.totalCount);
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
  }, [tableName, condition, search, pageNumber, pageSize, sortField, sortDirection, enableSearch, getSearchColumns, columns, isModalMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const saveData = prepareDataForSave(formData);
    
    try {
      let result;
      if (isInsert) {
        result = await SQL.Insert(tableName, saveData, () => {}, () => {});
      } else {
        result = await SQL.Update(tableName, keyColumn, saveData, () => {}, () => {});
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
      Sys.ShowMessage("❌ Failed to save record", "❌ فشل حفظ السجل", "error");
    }
  };

  const handleDelete = async (row: any) => {
    if (!confirm(t(`Are you sure you want to delete record ${row[keyColumn]}?`, `هل أنت متأكد من حذف السجل رقم ${row[keyColumn]}؟`))) return;
    try {
      const result = await SQL.Delete(tableName, keyColumn, [row[keyColumn]], () => {}, () => {});
      if (result && result.IsSuccess) {
        Sys.ShowMessage("✅ Record deleted successfully!", "✅ تم حذف السجل بنجاح!", "success");
        loadData();
      } else {
        Sys.ShowMessage("❌ Error: " + (result?.ErrorMessage || "Unknown error"), "❌ خطأ", "error");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      Sys.ShowMessage("❌ Failed to delete record", "❌ فشل حذف السجل", "error");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      Sys.ShowMessage("⚠️ Please select at least one row", "⚠️ الرجاء تحديد صف واحد على الأقل", "warning");
      return;
    }
    const ids = selectedRows.map(r => r[keyColumn]);
    if (!confirm(t(`Delete ${ids.length} selected record(s)?`, `حذف ${ids.length} سجل؟`))) return;
    try {
      const result = await SQL.Delete(tableName, keyColumn, ids, () => {}, () => {});
      if (result && result.IsSuccess) {
        Sys.ShowMessage(`✅ ${ids.length} record(s) deleted successfully!`, `✅ تم حذف ${ids.length} سجل بنجاح!`, "success");
        setSelectedRows([]);
        loadData();
      } else {
        Sys.ShowMessage("❌ Error: " + (result?.ErrorMessage || "Unknown error"), "❌ خطأ", "error");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      Sys.ShowMessage("❌ Failed to delete records", "❌ فشل حذف السجلات", "error");
    }
  };

  const exportCSV = async () => {
    try {
      Sys.ShowMessage("⏳ Preparing export...", "⏳ جاري تجهيز التصدير...", "warning");
      const allData = await SQL.Select(
        tableName, condition, null, () => {}, () => {}, 0,
        sortField, sortDirection, 0, search, null, null,
        0, 0, false
      );
      const headers = columns.filter(c => c.IsVisibleDisplayInGrid !== false).map(c => c.title).join(",");
      const rows = allData.data.map((row: any) =>
        columns.filter(c => c.IsVisibleDisplayInGrid !== false).map(c => {
          let value = row[c.field];
          if (value === null || value === undefined) return "";
          if (typeof value === "boolean") return value ? "Yes" : "No";
          if (c.IsDigits) return formatCurrency(value);
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

  const visibleColumns = columns.filter(col => col.IsVisibleDisplayInGrid !== false);

  const themeStyles = {
    container: isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white",
    toolbar: isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50",
    input: isDark ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900",
    tableHeader: isDark ? "bg-gray-900 text-white border-gray-700" : "bg-gray-100 text-gray-700 border-gray-200",
    tableRow: isDark ? "hover:bg-gray-700 border-gray-700 text-gray-300" : "hover:bg-gray-50 border-gray-200 text-gray-900",
    tableCell: isDark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-900",
    paginationButton: isDark ? "border-gray-600 text-white hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100",
    paginationActiveButton: isDark ? "bg-blue-700 text-white" : "bg-blue-600 text-white",
    paginationInactiveButton: isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100",
    textMuted: isDark ? "text-gray-400" : "text-gray-500",
    sortIcon: isDark ? "text-gray-400" : "text-gray-500",
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center p-8 ${isDark ? "bg-gray-800" : "bg-white"}`}>
        <div className={isDark ? "text-gray-400" : "text-gray-500"}>
          {t(`⏳ Loading data from ${tableName}...`, `⏳ جاري تحميل البيانات من ${tableName}...`)}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);
  const maxVisiblePages = 5;
  const startPage = Math.max(1, pageNumber - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  const searchPlaceholder = t("🔍 Search... (press Enter to search)", "🔍 بحث... (اضغط Enter للبحث)");
  const addNewText = t("+ Add New", "+ إضافة جديد");
  const exportText = t("📥 Export CSV", "📥 تصدير CSV");
  const refreshText = t("🔄 Refresh", "🔄 تحديث");
  const totalRecordsText = t("records", "سجل");
  const noDataText = t("📭 No data found", "📭 لا توجد بيانات");
  const editText = t("✏ ", "✏ ");
  const deleteText = t("🗑 ", "🗑 ");
  const actionsText = t("Actions", "الإجراءات");

  const showToolbar = !isModalMode;
  const showSelection = enableSelection || !isModalMode;

  return (
    <div className={`border rounded-xl overflow-hidden ${themeStyles.container}`} style={{ height: typeof height === "number" ? `${height}px` : height, display: 'flex', flexDirection: 'column' }}>
      {/* Search Modal */}
      {activeSearchModal && activeSearchModal.searchModal && (
        <SearchModal
          isOpen={true}
          onClose={() => setActiveSearchModal(null)}
          onSelect={(value, row) => {
            setFormData({ ...formData, [activeSearchModal.field]: value });
            setActiveSearchModal(null);
          }}
          config={activeSearchModal.searchModal}
          lang={lang}
          isDark={isDark}
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
      />

      {/* Toolbar - محسن */}
      {showToolbar && (
        <div className={`flex flex-wrap gap-2 p-4 border-b ${themeStyles.toolbar}`}>
          {enableSearch && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              className={`flex-1 min-w-[200px] border p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${themeStyles.input}`}
              value={searchTemp}
              onChange={(e) => setSearchTemp(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
            />
          )}
          
          <div className="flex flex-wrap gap-2">
            {enableInsert && (
              <button
                onClick={openAddForm}
                className={getButtonClass('success', isDark)}
              >
                {addNewText}
              </button>
            )}
            
            {enableDelete && selectedRows.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className={getButtonClass('danger', isDark)}
              >
                🗑 {t("Delete", "حذف")} ({selectedRows.length})
              </button>
            )}
            
            {enableExport && data.length > 0 && (
              <button
                onClick={exportCSV}
                className={getButtonClass('primary', isDark)}
              >
                {exportText}
              </button>
            )}
            
            <button
              onClick={() => loadData()}
              className={getButtonClass('gray', isDark)}
            >
              {refreshText}
            </button>
          </div>
          
          <div className={`flex-1 text-right text-sm ${themeStyles.textMuted} self-center`}>
            📊 {t("Total", "الإجمالي")}: {total} {totalRecordsText}
          </div>
        </div>
      )}

      {/* Data Table - Responsive */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[640px]">
          <table className="w-full border-collapse">
            <thead className={`sticky top-0 z-10 ${themeStyles.tableHeader}`}>
              <tr className="border-b">
                {showSelection && (
                  <th className="border p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === data.length && data.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </th>
                )}
                {visibleColumns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`border p-3 text-left font-semibold ${enableSort && col.sortable !== false ? "cursor-pointer select-none hover:bg-opacity-80" : "cursor-default"}`}
                    style={{ width: col.width }}
                    onClick={() => handleSort(col.field)}
                  >
                    <div className="flex items-center gap-1">
                      {col.title}
                      {enableSort && col.sortable !== false && sortField === col.field && (
                        <span className={themeStyles.sortIcon}>
                          {sortDirection === "ASC" ? "↑" : "↓"}
                        </span>
                      )}
                      {enableSort && col.sortable !== false && sortField !== col.field && (
                        <span className="opacity-30">⇅</span>
                      )}
                    </div>
                  </th>
                ))}
                {!isModalMode && (enableUpdate || enableDelete) && <th className="border p-3 w-28">{actionsText}</th>}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (showSelection ? 2 : 1)} className={`text-center p-8 ${themeStyles.textMuted}`}>
                    {noDataText}
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const uniqueKey = row[keyColumn] !== undefined && row[keyColumn] !== null 
                    ? `${row[keyColumn]}_${idx}` 
                    : `row_${idx}`;
                  
                  return (
                    <tr 
                      key={uniqueKey}
                      className={`transition-colors border-b ${themeStyles.tableRow} ${onRowDoubleClick ? "cursor-pointer" : ""}`}
                      onDoubleClick={() => onRowDoubleClick?.(row)}
                    >
                      {showSelection && (
                        <td className={`border p-3 text-center ${themeStyles.tableCell}`}>
                          <input
                            type="checkbox"
                            checked={!!selectedRows.find(r => r[keyColumn] === row[keyColumn])}
                            onChange={() => toggleSelection(row)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      {visibleColumns.map((col, cIdx) => {
                        const value = row[col.field];
                        
                        if (col.itemTemplate) {
                          return (
                            <td key={`${col.field}_${uniqueKey}`} className={`border p-3 ${themeStyles.tableCell}`}>
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
                          <td key={`${col.field}_${uniqueKey}`} className={`border p-3 ${themeStyles.tableCell}`}>
                            {formatDisplayValue(col, value)}
                          </td>
                        );
                      })}
                      {!isModalMode && (enableUpdate || enableDelete) && (
                        <td className={`border p-3 ${themeStyles.tableCell}`}>
                          <div className="flex gap-2">
                            {enableUpdate && (
                              <button
                                onClick={() => openEditForm(row)}
                                className={getButtonClass('warning', isDark)}
                              >
                                {editText}
                              </button>
                            )}
                            {enableDelete && (
                              <button
                                onClick={() => handleDelete(row)}
                                className={getButtonClass('danger', isDark)}
                              >
                                {deleteText}
                              </button>
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

      {/* Pagination - محسن */}
      {totalPages > 1 && (
        <div className={`flex justify-center items-center gap-2 p-4 border-t ${themeStyles.toolbar}`}>
          <button
            onClick={() => setPageNumber(1)}
            disabled={pageNumber === 1}
            className={getButtonClass('gray', isDark)}
          >
            {t("First", "الأولى")}
          </button>
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber === 1}
            className={getButtonClass('gray', isDark)}
          >
            {t("Prev", "السابق")}
          </button>
          <div className="flex gap-1">
            {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
              <button
                key={page}
                onClick={() => setPageNumber(page)}
                className={`px-3 py-1.5 rounded-lg transition-colors min-w-[40px] font-medium ${
                  pageNumber === page 
                    ? (isDark ? "bg-blue-600 text-white" : "bg-blue-600 text-white")
                    : (isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
            disabled={pageNumber === totalPages}
            className={getButtonClass('gray', isDark)}
          >
            {t("Next", "التالي")}
          </button>
          <button
            onClick={() => setPageNumber(totalPages)}
            disabled={pageNumber === totalPages}
            className={getButtonClass('gray', isDark)}
          >
            {t("Last", "الأخيرة")}
          </button>
          <span className={`text-sm ${themeStyles.textMuted}`}>
            {t("Page", "صفحة")} {pageNumber} {t("of", "من")} {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}