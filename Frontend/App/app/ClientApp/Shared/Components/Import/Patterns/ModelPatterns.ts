/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================================
//  ModelPatterns — الأنواع المشتركة لكل مكونات الأنماط (Patterns)
//  كل config هنا لازم يفضل "JSON-able" (من غير دوال) عشان الـ Studio يقدر يطلّعه كـ JSON.
//  الحاجات اللي محتاجة كود (زي مصدر بيانات وهمي أو دالة حفظ) بتتبعت كـ props منفصلة مش جوه الـ config.
// =====================================================================================

/** نص بلغتين — أو نص واحد لو مش محتاج ترجمة */
export type LText = string | { en: string; ar: string };

/** طريقة تحميل القوائم الكبيرة */
export type LoadMode =
  | "pages"     // ترقيم صفحات من السيرفر (SSP)
  | "infinite"  // تحميل الصفحة اللي بعدها مع السكرول (INF)
  | "all";      // تحميل الكل مرة واحدة (للقوائم الصغيرة بس)

/** مصدر بيانات: جدول/فيو + شرط ثابت + ترتيب */
export interface DataSourceConfig {
  /** اسم الجدول أو الفيو */
  tableName: string;
  /** المفتاح (لمنع التكرار في التحميل اللانهائي) */
  keyField?: string;
  /** شرط ثابت (SQL) زي "IsActive = 1" — ممكن فيه {Field} بيتبدل بقيمة من السجل الحالي */
  condition?: string;
  orderBy?: string;
  orderType?: "ASC" | "DESC";
  /** الأعمدة المطلوبة (فاضي = الكل) */
  selectedColumns?: string[];
}

/** طلب صفحة من مصدر بيانات */
export interface DataQuery {
  source: DataSourceConfig;
  /** شروط تساوي (عمود = قيمة) — بتتحول لـ SQL بأمان أو بتتفلتر محلي */
  where?: Record<string, any>;
  /** شرط SQL إضافي جاهز (مثلاً من محرك الفلاتر المتتالية) */
  extraCondition?: string;
  /** بحث نصي في أعمدة */
  search?: { text: string; fields: string[] };
  /** فترة زمنية (تحميل النافذة الظاهرة بس — WIN): field >= from AND field < to */
  range?: { field: string; from: string; to: string };
  /** رقم الصفحة من 1 (0 = من غير ترقيم) */
  page: number;
  pageSize: number;
}

export interface DataPage<T = any> {
  rows: T[];
  total: number;
}

/** دالة بتجيب صفحة بيانات — الافتراضي SQL.Select، والديمو بيستخدم بيانات محلية */
export type DataProvider = (q: DataQuery) => Promise<DataPage>;

/** شكل حالة (لون + أيقونة + اسم) — مشترك بين الفلور بلان والبلاطات والكانبان والمطبخ */
export interface StatusStyle {
  /** قيمة الحالة في الداتا */
  value: string | number;
  label: LText;
  /** لون أساسي (أي لون CSS) */
  color: string;
  /** لون خلفية فاتح (اختياري — بيتحسب من color لو مش موجود) */
  bg?: string;
  /** أيقونة (emoji أو حرف) */
  icon?: string;
  /** وميض (زي "طلب الحساب") */
  blink?: boolean;
}

/** زرار إجراء عام — المكون بيبعت id للـ onAction */
export interface PatternAction {
  id: string;
  label: LText;
  icon?: string;
  variant?: "primary" | "success" | "danger" | "warning" | "gray";
  /** يظهر بس في الحالات دي (فاضي = دايمًا) */
  showForStatus?: Array<string | number>;
  /** محتاج تأكيد قبل التنفيذ */
  confirm?: LText;
}

/** حد زمني بلون (للمؤقتات: أخضر < 8 د، أصفر < 15، أحمر بعد كده) */
export interface TimeThreshold {
  /** من دقيقة كام */
  fromMinutes: number;
  color: string;
  label?: LText;
}
