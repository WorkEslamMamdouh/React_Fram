// =====================================================================================
//  ModelFloorPlan — P09 مخطط الصالة (ترابيزات / سراير / رفوف / كراسي ...)
//  كل عنصر ليه مكان (x,y,w,h) جوه منطقة، ولونه بيتغير حسب حالته (فاضية/محجوزة/مشغولة/الحساب ...)
// =====================================================================================

import type { DataSourceConfig, LText, PatternAction, StatusStyle } from "./ModelPatterns";

export interface FloorArea {
  id: string | number;
  label: LText;
  /** صورة خلفية (اختياري) */
  background?: string;
  /** مقاس اللوحة بوحدات التصميم (الافتراضي من canvas) */
  width?: number;
  height?: number;
}

export interface FloorObjectFields {
  idField: string;
  areaField: string;
  labelField: string;
  xField: string;
  yField: string;
  wField: string;
  hField: string;
  /** "round" | "rect" */
  shapeField?: string;
  rotationField?: string;
  seatsField?: string;
  statusField: string;
  /** وقت فتح الطلب — بيتعرض كمدة */
  openedAtField?: string;
  guestsField?: string;
  amountField?: string;
  waiterField?: string;
}

export interface FloorPlanConfig {
  areas: FloorArea[];
  /** مصدر العناصر (أو ابعت rows للمكون مباشرة — تحديث لحظي) */
  objects: FloorObjectFields & { source?: DataSourceConfig };
  statuses: StatusStyle[];
  /** مقاس اللوحة بوحدات التصميم (بتتصغر/تكبر على حسب الشاشة) */
  canvas?: { width: number; height: number; grid?: number };
  /** الإجراءات (بتظهر حسب showForStatus) */
  actions?: PatternAction[];
  /** إجراء مباشر لما تدوس على عنصر في حالة معينة: { "free": "openOrder" } */
  clickAction?: Record<string, string>;
  /** على الموبايل: بلاطات (الافتراضي) أو نفس اللوحة */
  phoneLayout?: "tiles" | "canvas";
  /** تحديث كل كام ثانية (لو مفيش تحديث لحظي) — 0 = لا */
  refreshSeconds?: number;
  /** الحالة اللي فيها الوقت بيتعد (الافتراضي كل حالة فيها openedAt) */
  timedStatuses?: Array<string | number>;
}
