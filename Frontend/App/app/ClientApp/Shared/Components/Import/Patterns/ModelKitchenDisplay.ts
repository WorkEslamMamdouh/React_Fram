// =====================================================================================
//  ModelKitchenDisplay — P18 شاشة التذاكر / المطبخ (KDS)
//  تذاكر شغالة بمؤقت ولون حسب التأخير، bump للصنف أو التذكرة، استرجاع، ملخص اليوم.
//  تنفع كمان: بنش المعمل، تجهيز الصيدلية، بيت الصيانة، محطة التغليف.
// =====================================================================================

import type { DataSourceConfig, LText, TimeThreshold } from "./ModelPatterns";

export interface KdsStation {
  id: string;
  label: LText;
  /** الأصناف اللي بتروح للمحطة دي حسب item.station (فاضي = كله — محطة "expo") */
  accepts?: string[];
}

export interface KdsTicketFields {
  idField: string;
  numberField: string;
  tableField?: string;
  /** نوع الطلب (صالة/تيك أواي/توصيل) */
  typeField?: string;
  createdAtField: string;
  statusField: string;
  notesField?: string;
  /** وقت الـ bump (للاسترجاع) */
  bumpedAtField?: string;
  /** الأصناف: مصفوفة KdsItem (أو JSON نص) */
  itemsField: string;
}

export interface KdsItem {
  id: string | number;
  name: string;
  qty: number;
  modifiers?: string[];
  note?: string;
  station?: string;
  course?: number;
  done?: boolean;
}

export interface KitchenDisplayConfig {
  source?: DataSourceConfig;
  fields: KdsTicketFields;
  stations?: KdsStation[];
  /** قيم الحالات */
  statusValues?: { new?: string; started?: string; done?: string };
  /** ألوان حسب التأخير بالدقايق (مرتبة تصاعدي) */
  thresholds?: TimeThreshold[];
  /** إظهار ملخص "كل اليوم" (عدد كل صنف مفتوح) */
  showAllDay?: boolean;
  /** عدد التذاكر اللي تقدر تسترجعها */
  recallCount?: number;
  /** صوت لما تذكرة جديدة توصل */
  soundOnNew?: boolean;
  layout?: "rail" | "grid";
  refreshSeconds?: number;
  typeLabels?: Record<string, LText>;
}
