"use client";

// =====================================================================================
//  📄 CashTypes.ts   ←  ملف المنطق (البيزنس) — شاشة أنواع الماليات
// -------------------------------------------------------------------------------------
//  الجدول  : D_A_CashTypes
//  الحقول  : Description (الوصف) , ChargePrc (نسبة الرسوم) , IsActive (فعال)
//  الحفظ   : الإضافة والتعديل والحذف بينادوا على  G_ProcessTrans  بـ  @TrType = 'CashBox'
//            (الجدول DynamicGrid بيعمل ده لوحده لما نديله  keyTrType  و  runProcessTrans)
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "D_A_CashTypes";
const KeyColumn = "CashTypeID";
const TrType = "CashBox";              // 👈 ده اللي بيروح لـ @TrType في G_ProcessTrans
const RunProcessTrans = true;          // 👈 true = شغّل G_ProcessTrans بعد كل حفظ أو حذف

const DefaultFilters: ActiveFilter[] = [];
// #endregion

// =======================
// CashTypes
// =======================
export function CashTypes() {
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

  // الشركة والفرع اللي المستخدم اختارهم في LoginCompany
  const CompCode = Session?.CurrentEnvironment?.CompCode || 1;
  const BranchCode = Session?.CurrentEnvironment?.BranchCode || 1;
  // #endregion

  // =======================
  // #region State
  // =======================
  const [gridKey, setGridKey] = useState(0);   // لما يزيد الجدول بيتحمل من جديد
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  function InitalizeComponent() {
    // مفيش حاجة محتاجة تتحمل في البداية — الجدول بيحمّل بياناته لوحده
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

  // الجدول يعرض أنواع الماليات بتاعة الشركة الحالية بس
  const Condition = `CompCode = ${CompCode}`;

  const Columns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "CashTypeID",
        title: t("ID", "الرقم"),
        type: "number",
        width: 90,
        editable: false,
        insertable: false,          // ترقيم تلقائي من قاعدة البيانات
        IsSave: true,               // لازم يتبعت في التعديل عشان نعرف الصف
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "Description",
        title: t("Description", "الوصف"),
        placeholder: t("e.g. Cash, Visa, Bank transfer", "مثلاً: نقدي، فيزا، تحويل بنكي"),
        width: 260,
        IsRequired: true,           // إجباري
        IsSave: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "ChargePrc",
        title: t("Charge %", "نسبة الرسوم %"),
        type: "number",
        inputType: "number",
        min: 0,
        max: 100,
        step: 0.01,
        DefaultValue: 0,
        width: 130,
        IsSave: true,
        IsSearchColumn: false,
        IsValid: (v) => Number(v) >= 0 && Number(v) <= 100,
        validationMessage: t("Charge must be between 0 and 100", "النسبة لازم تكون من 0 لـ 100"),
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "IsActive",
        title: t("Active", "فعال"),
        type: "checkbox",           // في الجدول بيظهر ✅ / ❌ وفي الفورم مربع اختيار
        DefaultValue: true,
        width: 100,
        IsSave: true,
        IsSearchColumn: false,
        SortFieldInEditAndAdd: 4,
      },
      {
        // للعرض بس — غالباً G_ProcessTrans هو اللي بيملاه
        field: "CashAccCode",
        title: t("Account code", "كود الحساب"),
        width: 140,
        editable: false,
        insertable: false,
        IsSave: false,              // مش بنبعته عشان منمسحش القيمة اللي اتعملت
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
    [IsLangEN, CompCode, BranchCode]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "Description", label: t("Description", "الوصف"), type: "text", sortOrder: 1 },
      { field: "ChargePrc", label: t("Charge %", "نسبة الرسوم %"), type: "number", sortOrder: 2 },
      {
        field: "IsActive",
        label: t("Active", "فعال"),
        type: "select",             // قايمة بدل boolean عشان "غير فعال" تشتغل صح
        options: [
          { value: "1", label: t("Active", "فعال") },
          { value: "0", label: t("Inactive", "غير فعال") },
        ],
        sortOrder: 3,
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
