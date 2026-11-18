// =====================================================================================
//  ModelProfile360 — P05 ملف السجل الشامل (مريض / عميل / موظف / أصل / عربية ...)
//  كارت رأس (صورة + شارات + أرقام) + تابات، كل تاب نوع جاهز وبيتحمّل أول ما يتفتح بس.
// =====================================================================================

import type { DataSourceConfig, LoadMode, LText, PatternAction, StatusStyle } from "./ModelPatterns";

export type ValueFormat = "text" | "number" | "money" | "date" | "datetime" | "boolean";

export interface ProfileField {
  field: string;
  label: LText;
  format?: ValueFormat;
  /** عرض الحقل في شبكة الحقول (1..4) */
  span?: number;
}

export interface ProfileStat {
  label: LText;
  field: string;
  format?: ValueFormat;
  /** لون الرقم (اختياري) */
  color?: string;
}

export interface ProfileBadge {
  field: string;
  /** لو موجودة: القيمة بتتعرض بلون الحالة */
  statuses?: StatusStyle[];
  /** بادئة قبل القيمة */
  prefix?: LText;
}

export interface ProfileHeaderConfig {
  titleField: string;
  /** عنوان بالإنجليزي (اختياري) */
  titleFieldEn?: string;
  subtitleField?: string;
  photoField?: string;
  badges?: ProfileBadge[];
  stats?: ProfileStat[];
  /** حقول صغيرة تحت العنوان (تليفون، كود ...) */
  infoFields?: ProfileField[];
}

export interface ProfileListColumn {
  field: string;
  label: LText;
  format?: ValueFormat;
  width?: number | string;
  /** يظهر على الموبايل (في الكارت) — الافتراضي أول 3 أعمدة */
  mobile?: boolean;
}

interface ProfileTabBase {
  id: string;
  label: LText;
  icon?: string;
  /** عداد على التاب من حقل في السجل (مثلاً VisitsCount) */
  countField?: string;
}

export interface ProfileFieldsTab extends ProfileTabBase {
  kind: "fields";
  fields: ProfileField[];
}

export interface ProfileListTab extends ProfileTabBase {
  kind: "list";
  source: DataSourceConfig;
  /** العمود في المصدر اللي بيساوي مفتاح السجل */
  foreignKey: string;
  columns: ProfileListColumn[];
  loadMode?: LoadMode;
  pageSize?: number;
  statusField?: string;
  statuses?: StatusStyle[];
  /** بحث في أعمدة */
  searchFields?: string[];
}

export interface ProfileTimelineTab extends ProfileTabBase {
  kind: "timeline";
  source: DataSourceConfig;
  foreignKey: string;
  timeField: string;
  titleField: string;
  noteField?: string;
  userField?: string;
  statusField?: string;
  statuses?: StatusStyle[];
  pageSize?: number;
}

export interface ProfileNotesTab extends ProfileTabBase {
  kind: "notes";
  source: DataSourceConfig;
  foreignKey: string;
  textField: string;
  userField?: string;
  timeField?: string;
  /** السماح بإضافة ملاحظة (بينده onAddNote) */
  allowAdd?: boolean;
}

export interface ProfileKpisTab extends ProfileTabBase {
  kind: "kpis";
  items: ProfileStat[];
}

export type ProfileTab = ProfileFieldsTab | ProfileListTab | ProfileTimelineTab | ProfileNotesTab | ProfileKpisTab;

export interface Profile360Config {
  /** مصدر السجل الرئيسي */
  entity: DataSourceConfig & { keyField: string };
  header: ProfileHeaderConfig;
  quickActions?: PatternAction[];
  tabs: ProfileTab[];
  /** على الموبايل: تابات chips (الافتراضي) أو أقسام تحت بعض */
  mobileTabs?: "chips" | "stacked";
}
