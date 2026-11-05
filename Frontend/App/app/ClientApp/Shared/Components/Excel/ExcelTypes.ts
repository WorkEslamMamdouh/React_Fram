// =====================================================================================
//  📄 Shared/Components/Excel/ExcelTypes.ts  —  أنواع نظام الإكسل (Phase 6)
// -------------------------------------------------------------------------------------
//  الملف ده "نقي" (من غير React ولا اتصال بالقاعدة) عشان يتجرّب في Node.
// =====================================================================================

/** نوع الخلية في الإكسل */
export type ExcelColType = "text" | "number" | "decimal" | "date" | "bool";

/** شكل الشاشة اللي بيستخدم الإكسل */
export type ExcelMode = "grid" | "multi" | "details";

/** الخلية تابعة للماستر ولا للتفاصيل (في الجريد كله master) */
export type ExcelScope = "master" | "detail";

/** مصدر قائمة اختيار من جدول في القاعدة */
export interface ExcelLookupSpec {
  table: string;
  /** العمود اللي بيتخزن (المفتاح) */
  keyColumn: string;
  /** عمود الكود (اختياري) — اليوزر يقدر يكتب الكود */
  codeColumn?: string;
  /** عمود الاسم (اختياري) */
  nameColumn?: string;
  /** شرط إضافي (بدون كلمة WHERE) */
  condition?: string;
  /** أقصى عدد قيم في القائمة المنسدلة (الافتراضي 5000) */
  limit?: number;
  /** أعمدة تتملي من الصف المختار: { الهدف: عمود_المصدر } (زي fillFrom) */
  fill?: Record<string, string>;
}

/** عنصر في قائمة الاختيار */
export interface ExcelLookupItem {
  key: string | number;
  code?: string;
  name?: string;
  /** النص اللي بيظهر في القائمة المنسدلة */
  label: string;
  /** قيم إضافية من الصف (للـ fill) */
  extra?: Record<string, any>;
}

export interface ExcelOption {
  value: any;
  label: string;
}

/** عمود في الإكسل */
export interface ExcelColumnSpec {
  field: string;
  scope: ExcelScope;
  /** العنوان (بلغة الواجهة وقت التحميل) */
  title: string;
  /** عنوان بلغة تانية (اختياري) */
  titleAlt?: string;
  type: ExcelColType;
  required?: boolean;
  /** قائمة ثابتة (select) */
  options?: ExcelOption[];
  /** قائمة من القاعدة */
  lookup?: ExcelLookupSpec;
  /** مثال بيتكتب في شيت التعليمات */
  example?: any;
  /** تحقق إضافي على القيمة (بعد التحويل) */
  isValid?: (value: any, row: Record<string, any>) => boolean;
  validationMessage?: string;
  /** عرض العمود في الشاشة */
  width?: number;
  /** القيمة الافتراضية لو الخلية فاضية (بتتحط وقت الاستيراد) */
  defaultValue?: any;
}

export const colKey = (c: { scope: ExcelScope; field: string }) => (c.scope === "master" ? "m." : "d.") + c.field;

/** قيمة جاهزة تتحط في القائمة */
export interface ExcelLookupData {
  items: ExcelLookupItem[];
  /** القائمة اتقطعت (فيه أكتر من الحد) → لازم نكمل البحث بالاستعلام */
  truncated?: boolean;
}

export type ExcelLookups = Record<string, ExcelLookupData>;   // المفتاح = colKey

/** مواصفات التمبلت */
export interface ExcelTemplateSpec {
  name: string;
  lang: "ar" | "en";
  mode: ExcelMode;
  /** grid: كل الأعمدة · multi/details: columns(master) و columns(detail) بالـ scope */
  columns: ExcelColumnSpec[];
  lookups: ExcelLookups;
  /** عنوان تقديري للشاشة (يظهر في شيت التعليمات) */
  screenTitle?: string;
  /** صفوف المثال في التمبلت (اختياري) */
  sampleRows?: Record<string, any>[];
  /** أقصى عدد صفوف فيها قوائم اختيار (الافتراضي 1000) */
  validationRows?: number;
}

/** صف خطأ لتحميل ملف الأخطاء */
export interface ExcelErrorRow {
  group?: string;
  raw: Record<string, string>;
  message: string;
}

/** نتيجة قراءة صف من الإكسل (قبل التحويل) */
export interface RawExcelRow {
  excelRow: number;
  group?: string;
  /** النص الخام لكل عمود (مفتاحه colKey) */
  raw: Record<string, string>;
}

export interface ParsedSheet {
  rows: RawExcelRow[];
  /** أعمدة اتلاقت في الملف */
  found: string[];
  /** أعمدة مطلوبة مش موجودة في الملف */
  missingRequired: string[];
  /** عناوين في الملف مش متعرفة (بتتجاهل) */
  ignored: string[];
  /** مشاكل عامة (مفيش شيت، فاضي ...) */
  errors: string[];
  hasGroupColumn: boolean;
}

// ------------------------- إعدادات الاستخدام في الشاشات -------------------------

/** إعدادات الإكسل للجريد (DynamicGrid) — كلها اختيارية */
export interface ExcelGridConfig {
  enabled: boolean;
  templateName?: string;
  /** الأعمدة (field) اللي تدخل التمبلت. فاضي = كل الأعمدة اللي بتتحفظ وينفع تتدخل */
  columns?: string[];
  /** قوائم الاختيار من القاعدة حسب اسم العمود (بتغلب على selectConfig) */
  lookups?: Record<string, ExcelLookupSpec>;
  mode?: "grid";
  /** true = لو صف فشل، كل الصفوف تتلغي (ترانزاكشن واحدة). الافتراضي false */
  allOrNothing?: boolean;
  /** أقصى عدد صفوف في الملف (الافتراضي 5000) */
  maxRows?: number;
  /** حجم الدفعة في الحفظ (الافتراضي 200) */
  chunkSize?: number;
}

/** إعدادات الإكسل للماستر ديتيل */
export interface ExcelMasterDetailConfig {
  enabled: boolean;
  /** multiTransaction = معاملات كتير في ملف · detailsOnly = أصناف في الفاتورة المفتوحة · both = الاتنين */
  mode: "multiTransaction" | "detailsOnly" | "both";
  templateName?: string;
  /** أي تفاصيل (من 0). الافتراضي 0 */
  detailIndex?: number;
  masterColumns?: string[];
  detailColumns?: string[];
  /** قوائم الماستر */
  lookups?: Record<string, ExcelLookupSpec>;
  /** قوائم التفاصيل */
  detailLookups?: Record<string, ExcelLookupSpec>;
  /** أقصى عدد معاملات في الملف (الافتراضي 1000) */
  maxTransactions?: number;
  /** أقصى عدد صفوف (الافتراضي 20000) */
  maxRows?: number;
}

// ------------------------- نتائج الاستيراد -------------------------

export interface PreviewRow {
  id: number;
  excelRow: number;
  group?: string;
  /** أول صف في المعاملة (في الجريد/التفاصيل دايمًا true) */
  first: boolean;
  /** النص اللي ظاهر في كل خلية (colKey → نص) */
  raw: Record<string, string>;
  /** القيم المحوّلة (colKey → قيمة) + قيم الـ fill (بمفتاح m.Field / d.Field) */
  values: Record<string, any>;
  /** أخطاء (colKey → رسالة) و "_" = رسالة عامة للصف */
  errors: Record<string, string>;
}

export interface ImportRecord {
  id: number;
  group?: string;
  rows: PreviewRow[];
  /** أخطاء على مستوى المعاملة كلها */
  issues: string[];
  /** حالة الحفظ بعد المحاولة */
  saved?: boolean;
  saveError?: string;
  savedId?: any;
}

export const recordValid = (r: ImportRecord): boolean =>
  r.issues.length === 0 && r.rows.every((x) => Object.keys(x.errors).length === 0);
