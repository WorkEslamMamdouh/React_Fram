"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import type { CascadeFilterConfig } from "../Shared/Components/Import/Patterns/ModelCascadingFilter";
import type { LoadMode } from "../Shared/Components/Import/Patterns/ModelPatterns";
import { useCascadingFilters } from "../Shared/Components/Import/Patterns/cascadingFilter";
import { andJoin, createLocalProvider, usePagedData } from "../Shared/Components/Import/Patterns/patternKit";

// =======================
// #region بيانات وهمية (من غير قاعدة بيانات)
// =======================
const Categories = [
  { CategoryID: 1, NameAr: "مشروبات", NameEn: "Drinks" },
  { CategoryID: 2, NameAr: "أطعمة", NameEn: "Food" },
  { CategoryID: 3, NameAr: "حلويات", NameEn: "Desserts" },
];
const Types = [
  { TypeID: 11, CategoryID: 1, NameAr: "ساخن", NameEn: "Hot" },
  { TypeID: 12, CategoryID: 1, NameAr: "بارد", NameEn: "Cold" },
  { TypeID: 21, CategoryID: 2, NameAr: "ساندوتشات", NameEn: "Sandwiches" },
  { TypeID: 22, CategoryID: 2, NameAr: "وجبات", NameEn: "Meals" },
  { TypeID: 31, CategoryID: 3, NameAr: "كيك", NameEn: "Cakes" },
];
// 5000 صنف عشان نجرب الصفحات والتحميل اللانهائي
const Items = Array.from({ length: 5000 }, (_, i) => {
  const ty = Types[i % Types.length];
  return {
    ItemID: i + 1,
    TypeID: ty.TypeID,
    CategoryID: ty.CategoryID,
    NameAr: `${ty.NameAr} ${i + 1}`,
    NameEn: `${ty.NameEn} ${i + 1}`,
    Price: 10 + ((i * 7) % 90),
    IsActive: i % 9 !== 0,
  };
});
const provider = createLocalProvider({ Categories, Types, Items }, 80);
// #endregion

// =======================
// Demo_CascadingFilter  (X2 — الفلاتر المتتالية)
// =======================
export function Demo_CascadingFilter() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  // =======================
  // #region إعداد الفلاتر (JSON-able — الـ Studio يقدر يطلّعه)
  // =======================
  const FilterConfig = useMemo<CascadeFilterConfig>(() => ({
    id: "Demo_CascadingFilter",
    columns: 4,
    filters: [
      {
        field: "CategoryID", label: { en: "Category", ar: "الفئة" },
        source: { tableName: "Categories", valueField: "CategoryID", displayField: "NameAr", displayFieldEn: "NameEn" },
      },
      {
        field: "TypeID", label: { en: "Type", ar: "النوع" },
        source: { tableName: "Types", valueField: "TypeID", displayField: "NameAr", displayFieldEn: "NameEn" },
        dependsOn: [{ parent: "CategoryID", column: "CategoryID" }],
        onParentChange: "autoSelectSingle",
      },
      {
        field: "ItemID", label: { en: "Item", ar: "الصنف" },
        source: { tableName: "Items", valueField: "ItemID", displayField: "NameAr", displayFieldEn: "NameEn", searchFields: ["NameAr", "NameEn"] },
        dependsOn: [{ parent: "TypeID", column: "TypeID" }],
        loadMode: "server",
      },
      { field: "IsActive", label: { en: "Active", ar: "فعال" }, type: "boolean" },
    ],
  }), []);
  // #endregion

  const Filters = useCascadingFilters(FilterConfig, { provider });

  const [Mode, setMode] = useState<LoadMode>("infinite");

  // القايمة نفسها: نفس الفلاتر بتتطبق محلي (where) — مع DynamicGrid بنبعت Filters.condition
  const List = usePagedData({
    provider,
    source: { tableName: "Items", keyField: "ItemID", orderBy: "ItemID" },
    where: Filters.where,
    mode: Mode,
    pageSize: 50,
  });

  const BaseCondition = "CompCode = 1";
  const GridCondition = andJoin(BaseCondition, Filters.condition);

  const state = { IsLangEN, IsDark, Filters, List, Mode, GridCondition, FilterConfig };
  const actions = { t, setMode };
  const elements = {};
  return { ...state, ...actions, ...elements };
}
