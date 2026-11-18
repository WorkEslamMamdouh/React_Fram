"use client";

import { useMemo } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { DashboardConfig } from "../Shared/Components/Import/Patterns/ModelDashboard";
import { createLocalProvider } from "../Shared/Components/Import/Patterns/patternKit";

// =======================
// #region بيانات وهمية — أرقام مجمّعة جاهزة (زي View مجمّع على السيرفر)
// =======================
const Branches = [{ BranchID: 1, NameAr: "مدينة نصر", NameEn: "Nasr City" }, { BranchID: 2, NameAr: "المعادي", NameEn: "Maadi" }];
const KpiToday = [
  { BranchID: 1, Sales: 48250, SalesPrev: 41200, Orders: 312, OrdersPrev: 290, Returns: 4, ReturnsPrev: 7, AvgTicket: 154.6, AvgTicketPrev: 142 },
  { BranchID: 2, Sales: 30120, SalesPrev: 33010, Orders: 201, OrdersPrev: 215, Returns: 6, ReturnsPrev: 3, AvgTicket: 149.8, AvgTicketPrev: 153 },
];
const SalesByHour = [1, 2].flatMap((b) => Array.from({ length: 14 }, (_, i) => ({
  BranchID: b, Hour: `${String(9 + i).padStart(2, "0")}:00`, Sales: Math.round((b === 1 ? 2400 : 1500) * (1 + Math.sin(i / 2.2)) + i * 80), Target: b === 1 ? 3200 : 2100,
})));
const SalesByCategory = [1, 2].flatMap((b) => [
  { BranchID: b, Category: "Drinks", Value: b === 1 ? 18000 : 11000 }, { BranchID: b, Category: "Food", Value: b === 1 ? 21000 : 12500 },
  { BranchID: b, Category: "Desserts", Value: b === 1 ? 6500 : 4100 }, { BranchID: b, Category: "Other", Value: b === 1 ? 2750 : 2520 },
]);
const TopItems = [1, 2].flatMap((b) => ["Latte", "Club sandwich", "Cheesecake", "Espresso", "Mango juice"].map((n, i) => ({ BranchID: b, Item: n, Qty: (b === 1 ? 120 : 80) - i * 14, Amount: ((b === 1 ? 120 : 80) - i * 14) * (50 + i * 7) })));
const Alerts = [
  { BranchID: 1, Text: "Milk stock below minimum (4 L left)", Level: "critical" },
  { BranchID: 1, Text: "3 batches expire within 7 days", Level: "warning" },
  { BranchID: 2, Text: "Cashier 2 shift not closed yesterday", Level: "warning" },
  { BranchID: 2, Text: "Price list updated for Desserts", Level: "info" },
];
const provider = createLocalProvider({ Branches, KpiToday, SalesByHour, SalesByCategory, TopItems, Alerts }, 150);
// #endregion

// =======================
// Demo_Dashboard  (P14)
// =======================
export function Demo_Dashboard() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const Config = useMemo<DashboardConfig>(() => ({
    title: { en: "Sales today", ar: "مبيعات النهارده" },
    filters: {
      id: "Demo_Dashboard", columns: 4,
      filters: [
        { field: "BranchID", label: { en: "Branch", ar: "الفرع" }, defaultValue: 1, onParentChange: "clear",
          source: { tableName: "Branches", valueField: "BranchID", displayField: "NameAr", displayFieldEn: "NameEn" } },
      ],
    },
    refreshSeconds: 60,
    widgets: [
      { id: "sales", kind: "kpi", title: { en: "Sales", ar: "المبيعات" }, source: { tableName: "KpiToday" }, valueField: "Sales", compareField: "SalesPrev", format: "money", icon: "💰", drillTo: "SalesInvoice" },
      { id: "orders", kind: "kpi", title: { en: "Orders", ar: "الطلبات" }, source: { tableName: "KpiToday" }, valueField: "Orders", compareField: "OrdersPrev", icon: "🧾" },
      { id: "avg", kind: "kpi", title: { en: "Avg ticket", ar: "متوسط الفاتورة" }, source: { tableName: "KpiToday" }, valueField: "AvgTicket", compareField: "AvgTicketPrev", format: "money", icon: "📈" },
      { id: "returns", kind: "kpi", title: { en: "Returns", ar: "المرتجعات" }, source: { tableName: "KpiToday" }, valueField: "Returns", compareField: "ReturnsPrev", higherIsBetter: false, icon: "↩" },
      { id: "byHour", kind: "chart", chartType: "area", title: { en: "Sales by hour", ar: "المبيعات بالساعة" }, span: 8,
        source: { tableName: "SalesByHour", orderBy: "Hour" }, labelField: "Hour",
        series: [{ field: "Sales", label: { en: "Sales", ar: "المبيعات" } }, { field: "Target", label: { en: "Target", ar: "المستهدف" } }], format: "number" },
      { id: "byCat", kind: "chart", chartType: "donut", title: { en: "By category", ar: "حسب الفئة" }, span: 4,
        source: { tableName: "SalesByCategory" }, labelField: "Category", series: [{ field: "Value", label: { en: "Sales", ar: "المبيعات" } }] },
      { id: "hourBars", kind: "chart", chartType: "bar", title: { en: "Sales vs target", ar: "المبيعات مقابل المستهدف" }, span: 6,
        source: { tableName: "SalesByHour", orderBy: "Hour" }, labelField: "Hour",
        series: [{ field: "Sales", label: { en: "Sales", ar: "المبيعات" } }, { field: "Target", label: { en: "Target", ar: "المستهدف" } }] },
      { id: "top", kind: "list", title: { en: "Top items", ar: "أعلى الأصناف" }, span: 6, source: { tableName: "TopItems" }, limit: 5,
        columns: [{ field: "Item", label: { en: "Item", ar: "الصنف" } }, { field: "Qty", label: { en: "Qty", ar: "الكمية" }, format: "number" }, { field: "Amount", label: { en: "Amount", ar: "المبلغ" }, format: "money" }] },
      { id: "alerts", kind: "alerts", title: { en: "Alerts", ar: "تنبيهات" }, span: 6, source: { tableName: "Alerts" }, textField: "Text", levelField: "Level",
        levels: [
          { value: "critical", label: { en: "Critical", ar: "حرج" }, color: "#d03b3b", icon: "⛔" },
          { value: "warning", label: { en: "Warning", ar: "تحذير" }, color: "#fab219", icon: "⚠" },
          { value: "info", label: { en: "Info", ar: "معلومة" }, color: "#2a78d6", icon: "ℹ" },
        ] },
      { id: "links", kind: "shortcuts", title: { en: "Shortcuts", ar: "اختصارات" }, span: 6, items: [
        { label: { en: "POS", ar: "نقطة البيع" }, icon: "🛒", href: "/ClientApp/Demo_TouchPOS" },
        { label: { en: "Tables", ar: "الترابيزات" }, icon: "🍽", href: "/ClientApp/Demo_FloorPlan" },
        { label: { en: "Kitchen", ar: "المطبخ" }, icon: "👨‍🍳", href: "/ClientApp/Demo_KDS" },
      ] },
    ],
  }), []);

  function OnDrill(widgetId: string, target: string) {
    Sys.ShowMessage(`Open ${target} from ${widgetId}`, `فتح ${target} من ${widgetId}`, "info");
  }

  const state = { IsLangEN, Config, provider };
  const actions = { t, OnDrill };
  return { ...state, ...actions };
}
