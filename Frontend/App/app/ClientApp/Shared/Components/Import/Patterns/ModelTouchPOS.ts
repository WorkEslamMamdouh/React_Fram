/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================================
//  ModelTouchPOS — P11 نقطة بيع باللمس (مطعم / كافيه / تجزئة / صيدلية / كانتين)
//  فئات + شبكة أصناف + سلة + إضافات (modifiers) + كمية + خصومات + لوحة دفع (دفع مقسّم)
// =====================================================================================

import type { DataSourceConfig, LoadMode, LText } from "./ModelPatterns";

export interface PosCategory {
  id: string | number;
  label: LText;
  color?: string;
  icon?: string;
}

export interface PosModifierOption {
  id: string | number;
  label: LText;
  priceDelta?: number;
}

export interface PosModifierGroup {
  id: string | number;
  label: LText;
  /** أقل عدد اختيارات (1 = إجباري) */
  min?: number;
  /** أكتر عدد (1 = اختيار واحد) */
  max?: number;
  options: PosModifierOption[];
  /** الأصناف اللي المجموعة دي بتظهر لها (أو الفئات) — فاضي الاتنين = مش بتظهر لوحدها */
  itemIds?: Array<string | number>;
  categoryIds?: Array<string | number>;
}

export interface PosItemsConfig {
  source: DataSourceConfig;
  idField: string;
  nameField: string;
  nameFieldEn?: string;
  priceField: string;
  categoryField: string;
  barcodeField?: string;
  imageField?: string;
  colorField?: string;
  /** حقل بيقول الصنف متاح ولا خلصان (false = مش متاح) */
  availableField?: string;
  /** حقل فيه أرقام مجموعات الإضافات "1,3" (بديل itemIds في المجموعة) */
  modifierGroupsField?: string;
  loadMode?: LoadMode;
  pageSize?: number;
  /** أعمدة البحث */
  searchFields?: string[];
}

export interface PosPaymentMethod {
  id: string;
  label: LText;
  icon?: string;
  /** كاش: بيحسب الباقي */
  isCash?: boolean;
}

/** باركود الميزان: بادئة + كود صنف + وزن/سعر */
export interface ScaleBarcodeRule {
  prefixes: string[];
  itemCodeLength: number;
  valueLength: number;
  valueType: "weight" | "price";
  /** القسمة على كام (1000 = جرام → كيلو) */
  divisor: number;
}

export interface TouchPOSConfig {
  mode?: "retail" | "restaurant" | "pharmacy";
  /** الفئات (ثابتة) أو من مصدر */
  categories?: PosCategory[];
  categoriesSource?: DataSourceConfig & { idField: string; labelField: string; labelFieldEn?: string; colorField?: string };
  items: PosItemsConfig;
  modifierGroups?: PosModifierGroup[];
  orderTypes?: Array<{ id: string; label: LText; icon?: string }>;
  paymentMethods: PosPaymentMethod[];
  discounts?: {
    allowLine?: boolean;
    allowOrder?: boolean;
    /** أقصى نسبة خصم مسموحة (أكتر منها محتاج موافقة — onDiscountOverLimit) */
    maxPercent?: number;
    presets?: number[];
  };
  tax?: { rate: number; inclusive?: boolean; label?: LText };
  /** رسوم خدمة % (مطعم) */
  serviceChargePercent?: number;
  currency?: LText;
  quickCash?: number[];
  /** قراءة الباركود من الكيبورد (scanner wedge) */
  scanner?: boolean;
  scaleBarcode?: ScaleBarcodeRule;
  /** الأرقام العشرية للعملة */
  decimals?: number;
}

export interface PosCartModifier {
  groupId: string | number;
  optionId: string | number;
  label: string;
  priceDelta: number;
}

export interface PosCartLine {
  key: string;
  itemId: any;
  name: string;
  unitPrice: number;
  qty: number;
  modifiers: PosCartModifier[];
  discountPct: number;
  note?: string;
}

export interface PosPayment {
  methodId: string;
  amount: number;
}

export interface PosTotals {
  subtotal: number;
  lineDiscounts: number;
  orderDiscount: number;
  serviceCharge: number;
  tax: number;
  total: number;
  itemsCount: number;
}

export interface PosOrder {
  orderType?: string;
  lines: PosCartLine[];
  orderDiscountPct: number;
  totals: PosTotals;
  payments: PosPayment[];
  paid: number;
  change: number;
}
