/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================================
//  ModelScanTask — P21 شاشة المسح بالباركود (استلام / تخزين / تجهيز / جرد / تشيك إن ...)
//  حلقة خطوات: امسح الموقع → امسح الصنف → الكمية → تأكيد. للموبايل/الهاندهيلد أساسًا.
// =====================================================================================

import type { DataSourceConfig, LText } from "./ModelPatterns";
import type { ScaleBarcodeRule } from "./ModelTouchPOS";

export type ScanStepKind = "location" | "item" | "qty" | "confirm";

export interface ScanTaskLinesConfig {
  /** مصدر سطور المهمة المتوقعة (أو ابعت lines للمكون) */
  source?: DataSourceConfig;
  keyField: string;
  itemField: string;
  nameField: string;
  /** باركود الصنف (ممكن أكتر من باركود مفصولين بفاصلة) */
  barcodeField: string;
  expectedQtyField?: string;
  locationField?: string;
  batchField?: string;
  expiryField?: string;
}

export interface ScanTaskConfig {
  /** id لحفظ التقدم محليًا (يكمل بعد قفل الصفحة / من غير نت) */
  id?: string;
  title: LText;
  /** الخطوات بالترتيب (الافتراضي: item ثم qty) */
  steps?: ScanStepKind[];
  /** expected = فيه قايمة متوقعة، blind = جرد أعمى (من غير ما يشوف الكميات) */
  mode?: "expected" | "blind";
  lines: ScanTaskLinesConfig;
  /** كل مسحة = +1 (perScan) أو يسأل عن الكمية (ask) — لو فيه خطوة qty يبقى ask */
  qtyMode?: "perScan" | "ask";
  tolerance?: {
    /** نسبة الزيادة المسموحة % (0 = ممنوع يزيد) */
    overPercent?: number;
    /** block = يمنع، warn = يحذر بس */
    rule?: "block" | "warn";
  };
  /** قراءة GS1-128: (01) GTIN، (10) تشغيلة، (17) صلاحية، (21) سيريال */
  gs1?: boolean;
  scaleBarcode?: ScaleBarcodeRule;
  feedback?: { sound?: boolean; vibrate?: boolean };
  /** السماح بالكاميرا (BarcodeDetector) لو الجهاز بيدعمها */
  allowCamera?: boolean;
  /** منع الصنف المنتهي الصلاحية */
  blockExpired?: boolean;
}

export interface ScanEvent {
  at: string;
  code: string;
  lineKey?: any;
  location?: string;
  qty: number;
  batch?: string;
  expiry?: string;
  serial?: string;
}

export interface ScanParsed {
  raw: string;
  gtin?: string;
  batch?: string;
  /** YYYY-MM-DD */
  expiry?: string;
  serial?: string;
  qty?: number;
  price?: number;
  /** الكود اللي بيتدور بيه على الصنف */
  lookup: string;
}
