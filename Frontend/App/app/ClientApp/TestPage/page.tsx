'use client';

import React, { useState } from "react";
import DynamicGrid, { DynamicGridColumn } from "../Shared/Components/Import/DynamicGrid";
import { ColumnType, SearchModalConfig } from "../Shared/Components/Import/ModelGrid";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import { FilterFieldConfig, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import SearchModal from "../Shared/Components/Import/SearchModal";
import { Search_Users } from "../Shared/G_SearchFrom";


 

const D_B_RE_UnitFloorConfig = {
  tableName: "D_B_RE_UnitFloor",
  keyColumn: "FloorID",
  condition: "",
  orderBy: "FloorID",
  orderType: "DESC" as "ASC" | "DESC",
  pageSize: 11,
  keyTrType: "",
  RunProcessTrans: false,
  columns: [
    { 
      field: "FloorID", 
      title: "FloorID", 
      type: "number" as ColumnType,
      IsVisibleDisplayInGrid: true,
      IsSearchColumn: true,
      editable: false, 
      insertable: false, 
      width: 80,
      IsRequired: true,
      IsSave: true,
      IsDisabledInEdit: true,
      IsDisabledInAdd: false,
      DefaultValue: "0",
        IsValid: (value) => !isNaN(Number(value)) && Number(value) > 0, // رقم وصحيح
      SortFieldInEditAndAdd: 1,
    }, 
    { 
      field: "DescAr", 
      title: "Description (Arabic)", 
      inputType: "textarea",
      rows: 3,
      placeholder: "الوصف باللغة العربية",
      editable: true, 
      insertable: true, 
      width: 250,
      IsSave: true,
      IsRequired: true,
      SortFieldInEditAndAdd: 4,
    },
    { 
      field: "DescEn", 
      title: "Description (English)", 
      inputType: "textarea",
      rows: 3,
      placeholder: "Description in English",
      editable: true, 
      insertable: true, 
      IsSave: true,
      width: 250,
      SortFieldInEditAndAdd: 5,
    },
    { 
      field: "Status", 
      title: "Status",
      IsVisibleDisplayInGrid: false,
      IsSearchColumn: false,
      IsSave: true,
      SortFieldInEditAndAdd: 6,
      editable: false,
      insertable: false, 
      itemTemplate: (value, row, index, onChange) => {
        const isChecked = value === 1 || value === true;
        return (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              onChange(e.target.checked ? 1 : 0);
              Sys.ShowMessage("Status changed", "تم تغيير الحالة", "info");
            }}
            className="w-5 h-5 cursor-pointer"
          />
        );
      },
      EditTemplate: (value, row, onChange, isEdit) => {
        const isChecked = value === 1 || value === true;
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => onChange(e.target.checked ? 1 : 0)}
              className="w-5 h-5"
            />
            <span className="text-sm text-black-500 dark:text-black-400">
              {isChecked ? "Active" : "Inactive"}
            </span>
          </div>
        );
      },
      InsertTemplate: (value, onChange) => {
        return (
          <select
            className="w-full border p-2 rounded dark:bg-black-800 dark:border-black-700 dark:text-white"
            value={value || 0}
            onChange={(e) => onChange(parseInt(e.target.value))}
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        );
      },
      width: 80,
    }, 
    {
      field: "Testsearch",
      title: "TestSearch",
      inputType: "search",
       searchModal: Search_Users("USER_Status = 1"),  // Direct assignment, not wrapped in { config: ... }
      editable: true,
      insertable: false,
      IsSave: false,
      IsSearchColumn: false,
      width: 150,
      SortFieldInEditAndAdd: 8,
      
    },
    // { 
    //   field: "CreatedDate", 
    //   title: "Created Date", 
    //   type: "date" as ColumnType,
    //   inputType: "date", 
    //   IsSearchColumn: false,
    //   insertable: true,
    //   editable: true,
    //   IsSave: false,
    //   SortFieldInEditAndAdd: 9,
    // }, 
  ] as DynamicGridColumn[],
};

// ============================================================
// تكوين الفلاتر المتقدمة
// ============================================================

// الحصول على تاريخ اليوم وبداية الشهر وبداية السنة
const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getStartOfMonth = (): string => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
};

const getStartOfYear = (): string => {
  const today = new Date();
  return new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
};

// تكوين حقول الفلتر
// تكوين حقول الفلتر مع Search Modal
const filterFields: FilterFieldConfig[] = [
  {
    field: "FloorID",
    label: "FloorID",
    type: "number",
    placeholder: "بحث بالرقم التعريفي",
    sortOrder: 1,
  },
  {
    field: "Status",
    label: "Status",
    type: "select",
    options: [
      { value: "100", label: "City" },
      { value: "200", label: "Country" },
      { value: "300", label: "Currency" },
    ],
    placeholder: "اختر الحالة  ",
    sortOrder: 2,
  },
  {
    field: "Search_Users", // Changed from CodeValue to ParentID
    label: "Search Users",
    type: "search", // استخدام نوع search
     searchModal: Search_Users("USER_Status = 1"),  // Direct assignment, not wrapped in { config: ... }
    placeholder: "اختر  المستخدمين",
    sortOrder: 3,
  },
  {
    field: "DescA",
    label: "Description (Arabic)",
    type: "text",
    placeholder: "بحث بالوصف العربي",
    sortOrder: 4,
  },
  {
    field: "DescE",
    label: "Description (English)",
    type: "text",
    placeholder: "Search by English description",
    sortOrder: 5,
  }, 
];
// الفلاتر الافتراضية التي يتم تطبيقها عند تحميل الصفحة
const defaultFilters: ActiveFilter[] = [
  // {
  //   id: "default_status_active",
  //   field: "Status",
  //   label: "Status",
  //   type: "select",
  //   value: "1",
  //   displayValue: "✅ Active",
  // },
  // {
  //   id: "default_date_range",
  //   field: "CreatedDate",
  //   label: "Created Date",
  //   type: "dateRange",
  //   value: null, // required property - set to null for dateRange
  //   fromValue: getStartOfMonth(),
  //   toValue: getToday(),
  //   displayValue: `${getStartOfMonth()} → ${getToday()}`,
  // },
];

export default function D_B_RE_UnitFloorPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeFilterCount, setActiveFilterCount] = useState(defaultFilters.length);
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);

  // Event handlers for extra buttons
  const handlePrint = (row: any, id: any) => {
    console.log("Print - Row:", row, "ID:", id);
    alert(`طباعة السجل رقم ${id}`);
  };

  const handleEmail = (row: any, id: any) => {
    console.log("Email - Row:", row, "ID:", id);
    alert(`إرسال بريد إلكتروني للسجل رقم ${id}`);
  };

  const handleArchive = (row: any, id: any) => {
    console.log("Archive - Row:", row, "ID:", id);
    alert(`أرشفة السجل رقم ${id}`);
  };

  const handleExportPDF = (row: any, id: any) => {
    console.log("Export PDF - Row:", row, "ID:", id);
    alert(`تصدير السجل رقم ${id} إلى PDF`);
  };

  const handleCopy = (row: any, id: any) => {
    console.log("Copy - Row:", row, "ID:", id);
    navigator.clipboard.writeText(JSON.stringify(row));
    alert(`تم نسخ بيانات السجل رقم ${id}`);
  };

  const handleShare = (row: any, id: any) => {
    console.log("Share - Row:", row, "ID:", id);
    alert(`مشاركة السجل رقم ${id}`);
  };

  const handleHistory = (row: any, id: any) => {
    console.log("History - Row:", row, "ID:", id);
    alert(`عرض تاريخ السجل رقم ${id}`);
  };

  const handleAudit = (row: any, id: any) => {
    console.log("Audit - Row:", row, "ID:", id);
    alert(`تدقيق السجل رقم ${id}`);
  };

  // Custom actions
  const customActions = [
    {
      key: 'custom1',
      label: lang === 'ar' ? 'إجراء مخصص 1' : 'Custom Action 1',
      icon: <span>⭐</span>,
      onClick: (row: any, id: any) => {
        alert(`${lang === 'ar' ? `إجراء مخصص 1 على السجل ${id}` : `Custom action 1 on record ${id}`}`);
      },
      isVisible: true,
    },
    {
      key: 'custom2',
      label: lang === 'ar' ? 'إجراء مخصص 2' : 'Custom Action 2',
      icon: <span>🔧</span>,
      onClick: (row: any, id: any) => {
        alert(`${lang === 'ar' ? `إجراء مخصص 2 على السجل ${id}` : `Custom action 2 on record ${id}`}`);
      },
      isVisible: true,
    },
  ];

  const handleRowDoubleClick = (row: any) => {
    setSelectedRecord(row);
    const messageEn = `📋 Record Details:\n\n${Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("\n")}`;
    const messageAr = `📋 تفاصيل السجل:\n\n${Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("\n")}`;
    alert(lang === "ar" ? messageAr : messageEn);
  };

  const handleFiltersChange = (filters: ActiveFilter[]) => {
    setActiveFilterCount(filters.length);
    console.log("Active filters:", filters);
  };

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  return (
    <>
    
      {/* Grid Component with Advanced Filter */}
      <div className="flex-1   md:p-1">
        <DynamicGrid
          tableName={D_B_RE_UnitFloorConfig.tableName}
          keyColumn={D_B_RE_UnitFloorConfig.keyColumn}
          columns={D_B_RE_UnitFloorConfig.columns}
          condition={D_B_RE_UnitFloorConfig.condition}
          orderBy={D_B_RE_UnitFloorConfig.orderBy}
          orderType={D_B_RE_UnitFloorConfig.orderType}
          pageSize={D_B_RE_UnitFloorConfig.pageSize}
          compCode={1}
          branchCode={1}
          keyTrType={D_B_RE_UnitFloorConfig.keyTrType}
          runProcessTrans={D_B_RE_UnitFloorConfig.RunProcessTrans}
          enableInsert={true}
          enableUpdate={true}
          enableDelete={true}
          enableSearch={true}
          enableExport={true}
          enableSort={true}
          height="calc(105vh - 140px)"
          
          // ============================================================
          // تكوين الفلتر المتقدم
          // ============================================================
          enableAdvancedFilter={true}
          filterFields={filterFields}
          defaultFilters={defaultFilters}
          
          // Enable extra actions
          enablePrint={true}
          enableEmail={true}
          enableArchive={true}
          enableExportPDF={true}
          enableCopy={true}
          enableShare={true}
          enableHistory={true}
          enableAudit={true}
          
          // Event handlers
          onPrint={handlePrint}
          onEmail={handleEmail}
          onArchive={handleArchive}
          onExportPDF={handleExportPDF}
          onCopy={handleCopy}
          onShare={handleShare}
          onHistory={handleHistory}
          onAudit={handleAudit}
          
          // Custom actions
          extraActions={customActions}
          onRowDoubleClick={handleRowDoubleClick}
        />
      </div>
    </>
  );



  
 

}