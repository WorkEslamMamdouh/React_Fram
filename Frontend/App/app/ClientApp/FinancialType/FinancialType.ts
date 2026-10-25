"use client";

// =====================================================================================
//  📄 FinancialType.ts   ←  ملف المنطق (البيزنس) — شاشة أنواع الحسابات المالية
// -------------------------------------------------------------------------------------
//  الجدول  : D_A_FinancialType
//  الحقول  : TrType (0 = قبض , 1 = صرف) , DescAr , DescEn , IsActive
//  الحفظ   : عادي من غير G_ProcessTrans
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "D_A_FinancialType";
const KeyColumn = "FinancialTypeID";
const TrType = "";                     // مفيش نوع حركة لأننا مش بننادي G_ProcessTrans
const RunProcessTrans = false;         // 👈 false = حفظ عادي من غير G_ProcessTrans

// قيم نوع الحركة (TrType) — بنستخدمها في الفورم والفلتر وفي شكل الجدول
export const TrTypes = {
  Receipt: 0,   // قبض
  Payment: 1,   // صرف
};

const DefaultFilters: ActiveFilter[] = [];
// #endregion

// =======================
// FinancialType
// =======================
export function FinancialType() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    InitalizeComponent();
  }, []);

  // =======================
  // #region UsingSystem Glopal
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  const CompCode = Session?.CurrentEnvironment?.CompCode || 1;
  const BranchCode = Session?.CurrentEnvironment?.BranchCode || 1;
  // #endregion

  // =======================
  // #region State
  // =======================
  const [gridKey, setGridKey] = useState(0);
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  function InitalizeComponent() {
    // الجدول بيحمّل بياناته لوحده
  }

  // =======================
  // #region Events Elements Html
  // =======================
  function RefreshGrid() {
    setGridKey((k) => k + 1);
  }
  // #endregion

  // =======================
  // #region إعدادات الجدول DynamicGrid
  // =======================
  //  ⚠️ الأعمدة والفلاتر جوه useMemo عشان الجدول ميعيدش التحميل على طول

  const Condition = `CompCode = ${CompCode}`;

  // اختيارات نوع الحركة
  const TrTypeOptions = useMemo(
    () => [
      { value: TrTypes.Receipt, label: t("Receipt", "قبض") },
      { value: TrTypes.Payment, label: t("Payment", "صرف") },
    ],
    [IsLangEN]
  );

  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "FinancialTypeID",
        title: t("ID", "الرقم"),
        type: "number",
        width: 90,
        editable: false,
        insertable: false,          // ترقيم تلقائي
        IsSave: true,               // لازم يتبعت في التعديل
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "TrType",
        title: t("Type", "النوع"),
        inputType: "select",        // قايمة: قبض / صرف
        selectOptions: TrTypeOptions,
        DefaultValue: TrTypes.Receipt,
        width: 110,
        IsRequired: true,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 2,
        // 👈 شكل النوع جوه الجدول (شارة ملونة) متعرّف في page.tsx
      },
      {
        field: "DescAr",
        title: t("Description (Arabic)", "الوصف عربي"),
        placeholder: "مثلاً: إيجار، مرتبات، مبيعات نقدية",
        width: 250,
        IsRequired: true,
        IsSave: true,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "DescEn",
        title: t("Description (English)", "الوصف إنجليزي"),
        placeholder: "e.g. Rent, Salaries, Cash sales",
        width: 250,
        IsSave: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "IsActive",
        title: t("Active", "فعال"),
        type: "checkbox",
        DefaultValue: true,
        width: 100,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 5,
      },
      // ===== أعمدة مخفية بتتحفظ تلقائي =====
      {
        field: "CompCode",
        title: "CompCode",
        DefaultValue: CompCode,
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: true,
        IsSearchColumn: false,
      },
      {
        field: "BranchCode",
        title: "BranchCode",
        DefaultValue: BranchCode,
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: true,
        IsSearchColumn: false,
      },
    ],
    [IsLangEN, CompCode, BranchCode, TrTypeOptions]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        field: "TrType",
        label: t("Type", "النوع"),
        type: "select",
        options: [
          { value: "0", label: t("Receipt", "قبض") },
          { value: "1", label: t("Payment", "صرف") },
        ],
        sortOrder: 1,
      },
      { field: "DescAr", label: t("Description (Arabic)", "الوصف عربي"), type: "text", sortOrder: 2 },
      { field: "DescEn", label: t("Description (English)", "الوصف إنجليزي"), type: "text", sortOrder: 3 },
      {
        field: "IsActive",
        label: t("Active", "فعال"),
        type: "select",
        options: [
          { value: "1", label: t("Active", "فعال") },
          { value: "0", label: t("Inactive", "غير فعال") },
        ],
        sortOrder: 4,
      },
    ],
    [IsLangEN]
  );
  // #endregion

  // =======================
  // UI
  // =======================
  const state = {
    IsLangEN,
    IsDark,
    gridKey,
  };

  const actions = {
    RefreshGrid,
  };

  const grid = {
    TableName,
    KeyColumn,
    TrType,
    RunProcessTrans,
    Condition,
    CompCode,
    BranchCode,
    Columns,
    FilterFields,
    DefaultFilters,
  };

  return {
    ...state,
    ...actions,
    grid,
  };
}
