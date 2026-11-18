// =====================================================================================
//  ReportLayoutTypes.ts  -  شكل ملف تصميم التقرير JSON (rf-report/1)
//  المواصفات الكاملة: Docs/Studio/05_Report_Layout_Format.md
//  الملف ده هو العقد بين مصمم الـ Studio والعارض اللي في الفريم ورك (renderer/).
// =====================================================================================

export const REPORT_SCHEMA = "rf-report/1";

/** مقاسات الورق الجاهزة. Custom = width/height بالمللي. */
export type PagePreset =
  | "A4" | "A5" | "Letter"
  | "Thermal80" | "Thermal58"
  | "LabelA4_3x8" | "LabelA4_3x7" | "LabelA4_2x7"
  | "Label50x25" | "Label40x30" | "Label100x50"
  | "Custom";

export type Orientation = "portrait" | "landscape";
export type TextDir = "auto" | "rtl" | "ltr";
export type Align = "start" | "center" | "end" | "justify";

/** بالمللي */
export interface Margins { top: number; right: number; bottom: number; left: number }

export interface PageSettings {
  size: PagePreset;
  orientation?: Orientation;
  /** مللي — للـ Custom (أو لتغطية المقاس الجاهز). height = null ⇒ طول مفتوح (إيصال) */
  width?: number | null;
  height?: number | null;
  margins?: Partial<Margins>;
  /** auto = حسب لغة المستخدم */
  dir?: TextDir;
}

/** ستايل بسيط (كل القيم اختيارية) — الأحجام بالـ pt، المسافات بالمللي */
export interface Style {
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  background?: string;
  align?: Align;
  /** حدود: true = كل الجوانب، أو جوانب محددة */
  border?: boolean | { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
  borderColor?: string;
  borderWidth?: number;     // مللي
  radius?: number;          // مللي
  padding?: number;         // مللي
  lineHeight?: number;
  nowrap?: boolean;
}

/** نص بلغتين — أو نص واحد */
export type I18nText = string | { ar?: string; en?: string };

export type FormatKey =
  | "text" | "n0" | "n1" | "n2" | "n3" | "c" | "percent"
  | "date" | "dateTime" | "time" | "bool";

// ---------------------------------------------------------------- data binding

export type ParamFrom = "row" | "session" | "filter" | "const";

export interface DataSettings {
  /** (Studio) مصدر البيانات — في الرن تايم بييجي من تعريف التقرير في Sys_Reports */
  source?: { type: "proc" | "view"; name: string };
  params?: { name: string; from: ParamFrom; value: string }[];
  /**
   * ربط نتائج الإجراء بأسماء مستعارة: { "Data": "header", "Data2": "lines" }.
   * الاسم المستعار "header" ليه معنى خاص: أول صف فيه متاح كـ header.X في أي تعبير.
   */
  tables?: Record<string, string>;
}

// ---------------------------------------------------------------- elements

interface ElementBase {
  /** id اختياري (للمصمم) */
  id?: string;
  /** عرض العنصر في الـ flow: "50%" أو رقم بالمللي. لو مش موجود = عرض كامل */
  width?: string | number;
  /** ارتفاع ثابت بالمللي (اختياري) */
  height?: number;
  /** الموضع في الـ absolute band (مللي) */
  x?: number;
  y?: number;
  style?: Style;
  /** تعبير — لو طلع false العنصر مايظهرش */
  visibleIf?: string;
}

/** نص ثابت فيه {{تعبيرات}} */
export interface TextElement extends ElementBase { type: "text"; text: I18nText }
/** قيمة حقل من الصف الحالي */
export interface FieldElement extends ElementBase { type: "field"; field: string; format?: FormatKey; label?: I18nText }
/** تعبير محسوب (من غير {{ }}) */
export interface ExpressionElement extends ElementBase { type: "expression"; expr: string; format?: FormatKey; label?: I18nText }
/** صورة: src = تعبير يرجّع data URL / base64 / رابط. "Company.LogoBase64" = لوجو الشركة */
export interface ImageElement extends ElementBase { type: "image"; src: string; fit?: "contain" | "cover" | "fill" }
export interface LineElement extends ElementBase { type: "line"; orientation?: "horizontal" | "vertical"; thickness?: number; color?: string; dashed?: boolean }
/** مستطيل/صندوق — ممكن يكون جواه نص */
export interface RectElement extends ElementBase { type: "rect"; text?: I18nText }
export interface SpacerElement extends ElementBase { type: "spacer" }
export interface PageNumberElement extends ElementBase { type: "pageNumber"; template?: I18nText }
export interface SignatureElement extends ElementBase { type: "signature"; label?: I18nText }

export type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "CODE39" | "ITF" | "ITF14" | "UPC";
export interface BarcodeElement extends ElementBase {
  type: "barcode";
  value: string;                 // تعبير
  format?: BarcodeFormat;
  /** يكتب الرقم تحت الباركود */
  showText?: boolean;
  /** ارتفاع الخطوط بالمللي */
  barHeight?: number;
}

/** QR — value تعبير. لفاتورة ZATCA استخدم zatcaQr(...) في التعبير */
export interface QrElement extends ElementBase { type: "qr"; value: string; size?: number; level?: "L" | "M" | "Q" | "H" }

export type ChartKind = "bar" | "line" | "pie" | "donut";
export interface ChartElement extends ElementBase {
  type: "chart";
  chart: ChartKind;
  /** اسم الجدول (المستعار) — الافتراضي جدول الـ detail */
  table?: string;
  category: string;              // حقل التصنيف
  value: string;                 // حقل القيمة
  /** يجمّع القيم لنفس التصنيف */
  aggregate?: "sum" | "count" | "avg";
  colors?: string[];
  title?: I18nText;
}

/** المبلغ بالحروف (عربي) — تفقيط */
export interface AmountWordsElement extends ElementBase {
  type: "amountWords";
  value: string;                 // تعبير رقمي
  currency?: string;             // EGP | SAR | USD | AED | KWD ...
  prefix?: I18nText;             // مثال: "فقط"
  suffix?: I18nText;             // مثال: "لا غير"
}

export interface TableColumn {
  field?: string;
  /** تعبير بدل field */
  expr?: string;
  title?: I18nText;
  width?: string | number;
  format?: FormatKey;
  align?: Align;
  /** إجمالي العمود في صف الإجمالي */
  aggregate?: "sum" | "count" | "avg" | "min" | "max";
}

/** جدول كامل جوه باند (جدول فرعي — من غير تقسيم صفحات). للجدول الأساسي استخدم detail band. */
export interface TableElement extends ElementBase {
  type: "table";
  table: string;
  columns: TableColumn[];
  showTotals?: boolean;
  headerStyle?: Style;
  zebra?: boolean;
}

/** حاوية: صف أفقي (row) أو عمود (column) يحتوي عناصر */
export interface RowElement extends ElementBase { type: "row"; direction?: "row" | "column"; gap?: number; items: ReportElement[] }

export type ReportElement =
  | TextElement | FieldElement | ExpressionElement | ImageElement | LineElement | RectElement
  | SpacerElement | PageNumberElement | SignatureElement | BarcodeElement | QrElement
  | ChartElement | AmountWordsElement | TableElement | RowElement;

// ---------------------------------------------------------------- bands

export type BandType =
  | "reportHeader" | "pageHeader" | "groupHeader" | "detail" | "groupFooter" | "reportFooter" | "pageFooter";

interface BandBase {
  type: BandType;
  /** flow (الافتراضي) = العناصر ورا بعض · absolute = مواضع بالمللي (x,y) — لازم height */
  layout?: "flow" | "absolute";
  height?: number;
  elements?: ReportElement[];
  style?: Style;
  visibleIf?: string;
}

export interface PageHeaderBand extends BandBase { type: "pageHeader"; skipFirstPage?: boolean }
export interface PageFooterBand extends BandBase { type: "pageFooter"; skipLastPage?: boolean }
export interface ReportHeaderBand extends BandBase { type: "reportHeader" }
export interface ReportFooterBand extends BandBase { type: "reportFooter" }
export interface GroupHeaderBand extends BandBase { type: "groupHeader"; groupBy: string; keepWithNext?: boolean }
export interface GroupFooterBand extends BandBase { type: "groupFooter"; groupBy: string }

export interface LabelSettings {
  columns: number;
  rows: number;
  /** مقاس الملصق بالمللي */
  width: number;
  height: number;
  gapX?: number;
  gapY?: number;
  /** كام نسخة من كل صف (أو اسم حقل فيه العدد) */
  copies?: number | string;
  /** ترتيب العناصر جوه الملصق: flow (الافتراضي) أو absolute (x/y بالمللي) */
  elementLayout?: "flow" | "absolute";
  /** يرسم إطار خفيف حوالين كل ملصق (للمعاينة) */
  outline?: boolean;
}

export interface DetailBand extends Omit<BandBase, "layout"> {
  type: "detail";
  /** اسم الجدول المستعار (الافتراضي: lines لو موجود وإلا أول جدول) */
  table?: string;
  /** table = جدول بأعمدة (الافتراضي) · flow = كل صف بيرسم عناصر الباند · labels = ملصقات */
  layout?: "table" | "flow" | "absolute" | "labels";
  columns?: TableColumn[];
  headerStyle?: Style;
  zebra?: boolean;
  /** صف إجمالي في آخر الجدول (للأعمدة اللي ليها aggregate) */
  showTotals?: boolean;
  /** ترتيب الصفوف قبل التجميع */
  sortBy?: string[];
  labels?: LabelSettings;
}

export type ReportBand =
  | PageHeaderBand | PageFooterBand | ReportHeaderBand | ReportFooterBand
  | GroupHeaderBand | GroupFooterBand | DetailBand;

// ---------------------------------------------------------------- layout root

export interface ReportLayout {
  schema: typeof REPORT_SCHEMA | string;
  code?: string;
  nameAr?: string;
  nameEn?: string;
  /** document = سجل واحد + سطوره · list = قائمة (مجموعات) · labels = ملصقات */
  kind?: "document" | "list" | "labels";
  page: PageSettings;
  data?: DataSettings;
  /** ستايلات مسماة. base = الافتراضي لكل التقرير */
  styles?: Record<string, Style>;
  bands: ReportBand[];
}

// ---------------------------------------------------------------- runtime data

export type DataRow = Record<string, any>;

/** البيانات اللي العارض بياخدها مع التصميم */
export interface ReportData {
  /** الجداول بالأسماء الأصلية (Data, Data2..) أو المستعارة (header, lines) */
  tables: Record<string, DataRow[]>;
  /** بيانات الشركة/الفرع (من ReportsController.run) */
  company?: DataRow;
  /** الباراميترات المستخدمة */
  params?: DataRow;
}
