// =====================================================================================
//  ModelDashboard — P14 لوحة المؤشرات
//  ويدجتس: KPI / رسم (bar, line, area, donut) / أعلى N / تنبيهات / اختصارات
//  كل ويدجت بيقرا من مصدر مجمّع (View أو إجراء بيرجع أرقام جاهزة — AGG، مش صفوف خام)
//  الفلاتر العامة (تاريخ / فرع ...) = محرك الفلاتر المتتالية، وبتتبعت لكل الويدجتس.
// =====================================================================================

import type { DataSourceConfig, LText, StatusStyle } from "./ModelPatterns";
import type { CascadeFilterConfig } from "./ModelCascadingFilter";
import type { ValueFormat } from "./ModelProfile360";

interface WidgetBase {
  id: string;
  title: LText;
  /** عرض الويدجت من 12 عمود على الكمبيوتر (الافتراضي 3 للـ KPI و6 للباقي) */
  span?: number;
  /** الفلاتر العامة اللي الويدجت ده بيتأثر بيها (فاضي = كلها) */
  filterFields?: string[];
  /** فتح شاشة لما تدوس (بيتبعت لـ onDrill) */
  drillTo?: string;
}

export interface KpiWidget extends WidgetBase {
  kind: "kpi";
  source: DataSourceConfig;
  valueField: string;
  /** القيمة السابقة للمقارنة (نسبة التغير) */
  compareField?: string;
  /** هل الزيادة كويسة (أخضر) ولا وحشة (زي المرتجعات) */
  higherIsBetter?: boolean;
  format?: ValueFormat;
  icon?: string;
  suffix?: LText;
}

export interface ChartSeries {
  field: string;
  label: LText;
  /** لون ثابت للسلسلة (لو مش موجود: ترتيب ثابت من الباليتة) */
  color?: string;
}

export interface ChartWidget extends WidgetBase {
  kind: "chart";
  chartType: "bar" | "line" | "area" | "donut";
  source: DataSourceConfig;
  labelField: string;
  series: ChartSeries[];
  height?: number;
  format?: ValueFormat;
}

export interface ListWidget extends WidgetBase {
  kind: "list";
  source: DataSourceConfig;
  columns: Array<{ field: string; label: LText; format?: ValueFormat }>;
  limit?: number;
}

export interface AlertsWidget extends WidgetBase {
  kind: "alerts";
  source: DataSourceConfig;
  textField: string;
  levelField?: string;
  levels?: StatusStyle[];
  limit?: number;
}

export interface ShortcutsWidget extends WidgetBase {
  kind: "shortcuts";
  items: Array<{ label: LText; icon?: string; href: string }>;
}

export type DashboardWidget = KpiWidget | ChartWidget | ListWidget | AlertsWidget | ShortcutsWidget;

export interface DashboardConfig {
  title?: LText;
  filters?: CascadeFilterConfig;
  widgets: DashboardWidget[];
  /** تحديث تلقائي كل كام ثانية (0 = لا) */
  refreshSeconds?: number;
}
