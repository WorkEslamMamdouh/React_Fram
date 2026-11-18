// =====================================================================================
//  ModelTileBoard — P10 لوحة الحالة الحية + عداد الجلسات (بلايستيشن / بلياردو / غرف / مكن)
//  كل بلاطة = جهاز/مورد بحالته ووقت الجلسة الشغال وحسابها لحظيًا حسب قواعد التسعير.
// =====================================================================================

import type { DataSourceConfig, LText, PatternAction, StatusStyle } from "./ModelPatterns";

/** شريحة وقت بسعر مختلف (ليلي، ويك إند ...) */
export interface PriceBand {
  /** "HH:mm" */
  from: string;
  /** "HH:mm" (لو أصغر من from يبقى بيعدّي نص الليل) */
  to: string;
  perHour: number;
  /** أيام الأسبوع (0 أحد .. 6 سبت) — فاضي = كل الأيام */
  days?: number[];
}

export interface RateRule {
  /** نوع الجهاز (PS5 / PS4 / Billiard ...) — فاضي = أي نوع */
  type?: string;
  /** الوضع (single / multi) — فاضي = أي وضع */
  mode?: string;
  perHour: number;
  bands?: PriceBand[];
}

export interface PricingConfig {
  currency?: LText;
  rates: RateRule[];
  /** "minute" = بالدقيقة، "block" = بالبلوك (مثلاً كل 15 دقيقة) */
  unit?: "minute" | "block";
  blockMinutes?: number;
  /** تقريب البلوكات: up (الافتراضي) / nearest / down */
  rounding?: "up" | "nearest" | "down";
  /** أقل حساب */
  minimumCharge?: number;
  /** دقايق سماح في الأول من غير حساب */
  graceMinutes?: number;
}

/** تغيير الوضع جوه الجلسة (single → multi) — كل جزء بيتحسب بسعر وضعه */
export interface SessionSegment {
  mode: string;
  /** وقت بداية الجزء ISO */
  start: string;
}

export interface TileSessionFields {
  /** وقت بداية الجلسة ISO */
  startField: string;
  /** إجمالي وقت الإيقاف المؤقت بالمللي ثانية */
  pausedMsField?: string;
  /** لو موقوف دلوقتي: وقت الإيقاف */
  pausedAtField?: string;
  modeField?: string;
  /** JSON array من SessionSegment (اختياري) */
  segmentsField?: string;
  /** وقت مدفوع مقدمًا بالدقايق (عد تنازلي) */
  prepaidMinutesField?: string;
  /** مبلغ المشتريات (سناكس) على الجلسة */
  itemsAmountField?: string;
  customerField?: string;
}

export interface TileBoardConfig {
  source?: DataSourceConfig;
  idField: string;
  labelField: string;
  typeField?: string;
  groupField?: string;
  statusField: string;
  /** الحالات اللي فيها الجلسة شغالة (العداد بيعد) */
  runningStatuses: Array<string | number>;
  /** الحالات اللي فيها الجلسة موقوفة مؤقتًا */
  pausedStatuses?: Array<string | number>;
  statuses: StatusStyle[];
  session: TileSessionFields;
  pricing: PricingConfig;
  actions?: PatternAction[];
  /** حجم البلاطة */
  tileSize?: "sm" | "md" | "lg";
  /** تنبيه قبل انتهاء الوقت المدفوع بكام دقيقة */
  alertBeforeEndMinutes?: number;
  refreshSeconds?: number;
  /** أسماء الأوضاع للعرض { single: {en,ar} } */
  modeLabels?: Record<string, LText>;
}

export interface SessionCharge {
  /** الدقايق المحسوبة (بعد الإيقاف) */
  minutes: number;
  billedMinutes: number;
  timeAmount: number;
  itemsAmount: number;
  total: number;
  /** السعر الحالي في الساعة */
  currentRate: number;
  /** المتبقي من الوقت المدفوع بالدقايق (null لو مفيش) */
  remainingMinutes: number | null;
  elapsedMs: number;
}
