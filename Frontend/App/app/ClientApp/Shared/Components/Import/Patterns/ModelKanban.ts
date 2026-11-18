// =====================================================================================
//  ModelKanban — P06 لوحة كانبان (أعمدة حالات)
//  CRM / أوامر صيانة / توصيل / مهام / توظيف. كل عمود بيحمّل صفحاته لوحده (load more).
// =====================================================================================

import type { DataSourceConfig, LText, StatusStyle } from "./ModelPatterns";

export interface KanbanColumn {
  /** قيمة الحالة */
  value: string | number;
  label: LText;
  color: string;
  /** أقصى عدد كروت (WIP) — 0/فاضي = مفتوح */
  wipLimit?: number;
}

export interface KanbanCardBadge {
  field: string;
  statuses?: StatusStyle[];
  prefix?: LText;
}

export interface KanbanConfig {
  source: DataSourceConfig;
  idField: string;
  statusField: string;
  titleField: string;
  subtitleField?: string;
  amountField?: string;
  dateField?: string;
  /** اسم/حروف المسؤول */
  assigneeField?: string;
  badges?: KanbanCardBadge[];
  columns: KanbanColumn[];
  /** الانتقالات المسموحة: { "new": ["qualified","lost"] } — فاضي = أي انتقال */
  transitions?: Record<string, Array<string | number>>;
  /** عدد الكروت في كل تحميل لكل عمود */
  pageSize?: number;
  /** WIP: block = يمنع، warn = يسأل (الافتراضي warn) */
  wipRule?: "block" | "warn";
}
