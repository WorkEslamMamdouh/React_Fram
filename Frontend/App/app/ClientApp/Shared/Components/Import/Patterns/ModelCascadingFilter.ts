/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================================
//  ModelCascadingFilter — محرك الفلاتر/القوائم المتتالية (X2 / X1)
//  مثال: الفئة → النوع → الصنف. كل فلتر ممكن يعتمد على فلتر واحد أو أكتر قبله.
//  - لما الأب يتغير: الأبناء بيتمسحوا (أو بيتسابوا لو لسه صالحين، أو بيتختار الوحيد)
//  - اختيارات كل فلتر بتتحمل من جدول/فيو بشرط مبني من قيم الآباء
//  - الناتج: شرط SQL جاهز للجريد (condition) + where (للمصادر المحلية) + ActiveFilter[]
// =====================================================================================

import type { LText } from "./ModelPatterns";

export type CascadeParentChange = "clear" | "keepIfValid" | "autoSelectSingle";

export interface CascadeDependency {
  /** اسم الفلتر الأب (field بتاعه) */
  parent: string;
  /** العمود في مصدر الاختيارات بتاع الابن اللي بيتقارن بقيمة الأب (مثلاً CategoryID) */
  column: string;
  /** لو الأب فاضي: "all" = هات كل الاختيارات، "none" = اقفل الفلتر لحد ما الأب يتختار (الافتراضي) */
  whenParentEmpty?: "all" | "none";
}

export interface CascadeOptionsSource {
  tableName: string;
  valueField: string;
  /** عمود الاسم (عربي) */
  displayField: string;
  /** عمود الاسم الإنجليزي (اختياري) */
  displayFieldEn?: string;
  /** شرط ثابت — ممكن فيه {OtherFilterField} */
  condition?: string;
  orderBy?: string;
  orderType?: "ASC" | "DESC";
  /** أعمدة البحث (للوضع server) */
  searchFields?: string[];
}

export interface CascadeFilterDef {
  /** اسم الفلتر (والعمود في بيانات الشاشة لو targetColumn مش متحدد) */
  field: string;
  label: LText;
  /** العمود في بيانات الشاشة اللي الفلتر بيتطبق عليه (الافتراضي = field). null = الفلتر للتسلسل بس */
  targetColumn?: string | null;
  /** select = اختيار من مصدر، text = بحث نصي (LIKE)، number / date / dateRange / boolean */
  type?: "select" | "text" | "number" | "date" | "dateRange" | "boolean";
  /** للـ select: مصدر الاختيارات */
  source?: CascadeOptionsSource;
  /** اختيارات ثابتة (بدل source) */
  options?: Array<{ value: string | number; label: LText; parentValues?: Record<string, string | number> }>;
  dependsOn?: CascadeDependency[];
  /** إيه اللي يحصل لما أب يتغير (الافتراضي clear) */
  onParentChange?: CascadeParentChange;
  /** all = حمّل الكل (قايمة صغيرة < 500)، server = صفحة + بحث من السيرفر (كبيرة) */
  loadMode?: "all" | "server";
  required?: boolean;
  /** text: contains (الافتراضي) | starts | = ، number: = | >= | <= */
  operator?: "=" | "contains" | "starts" | ">=" | "<=";
  defaultValue?: any;
  placeholder?: LText;
  /** مخفي (بس بيأثر في التسلسل/الشرط — زي الشركة) */
  hidden?: boolean;
  /** عرض العمود في الشريط (1..4 على الكمبيوتر) */
  span?: number;
}

export interface CascadeFilterConfig {
  /** id للحفظ في localStorage (فاضي = من غير حفظ) */
  id?: string;
  filters: CascadeFilterDef[];
  /** حفظ آخر قيم (الافتراضي true لو فيه id) */
  persist?: boolean;
  /** فلترة فورية مع كل تغيير (الافتراضي true) — false = زرار تطبيق */
  applyOnChange?: boolean;
  /** عدد الأعمدة على الكمبيوتر */
  columns?: number;
  /** "bar" شريط أفقي (الافتراضي) | "stacked" عمود واحد (جوه شيت/جنب) */
  layout?: "bar" | "stacked";
}

/** قيمة فلتر — value للعادي، from/to للفترة */
export interface CascadeValue {
  value?: any;
  from?: any;
  to?: any;
}

export type CascadeValues = Record<string, CascadeValue>;

export interface CascadeOption {
  value: any;
  label: string;
  row?: Record<string, any>;
}

export interface CascadeFieldState {
  def: CascadeFilterDef;
  options: CascadeOption[];
  total: number;
  loading: boolean;
  /** مقفول لأن أب مطلوب لسه فاضي */
  disabled: boolean;
}
