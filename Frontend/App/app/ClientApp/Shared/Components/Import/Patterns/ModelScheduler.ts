/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================================
//  ModelScheduler — P07 التقويم والمواعيد (عيادات، صالونات، جيم، قاعات)
//  عروض: يوم / أسبوع / شهر / أجندة / موارد (عمود لكل دكتور/كرسي/غرفة)
//  البيانات بتتحمل للفترة الظاهرة بس (WIN) عن طريق DataQuery.range
// =====================================================================================

import type { DataSourceConfig, LText, StatusStyle } from "./ModelPatterns";

export type SchedulerView = "day" | "week" | "month" | "agenda" | "resource";

export interface SchedulerEventsConfig {
  source: DataSourceConfig;
  idField: string;
  /** بداية الموعد "YYYY-MM-DDTHH:mm" */
  startField: string;
  /** نهاية الموعد (أو durationField) */
  endField?: string;
  /** المدة بالدقايق (لو مفيش endField) */
  durationField?: string;
  titleField: string;
  subtitleField?: string;
  resourceField?: string;
  statusField?: string;
}

export interface SchedulerResource {
  id: string | number;
  label: LText;
  color?: string;
  /** ساعات العمل للمورد "HH:mm" (اختياري) */
  workStart?: string;
  workEnd?: string;
}

export interface SchedulerConfig {
  events: SchedulerEventsConfig;
  /** الموارد: ثابتة أو من جدول */
  resources?: SchedulerResource[];
  resourcesSource?: DataSourceConfig & { idField: string; labelField: string; labelFieldEn?: string; colorField?: string };
  statuses?: StatusStyle[];
  views?: SchedulerView[];
  defaultView?: SchedulerView;
  /** العرض الافتراضي على الموبايل (الافتراضي agenda) */
  mobileView?: SchedulerView;
  /** حجم الخانة بالدقايق */
  slotMinutes?: 10 | 15 | 20 | 30 | 60;
  /** "HH:mm" */
  dayStart?: string;
  dayEnd?: string;
  /** أول يوم في الأسبوع: 0 أحد، 1 اتنين، 6 سبت */
  weekStartsOn?: 0 | 1 | 6;
  /** تعارض المواعيد: block = يمنع، warn = يسأل، allow = عادي */
  overlap?: "block" | "warn" | "allow";
  /** عدد المواعيد المسموح في نفس الوقت لنفس المورد (الافتراضي 1) */
  capacity?: number;
  /** السماح بالسحب لتغيير الميعاد */
  allowDrag?: boolean;
  /** المدة الافتراضية لموعد جديد بالدقايق */
  defaultDuration?: number;
}

/** موعد بعد التحويل (المكون بيشتغل عليه) */
export interface SchedulerEvent {
  id: any;
  start: Date;
  end: Date;
  title: string;
  subtitle?: string;
  resource?: any;
  status?: any;
  row: Record<string, any>;
}
