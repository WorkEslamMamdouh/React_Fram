// =====================================================================================
//  📄 ModelMasterDetail.ts  —  أنواع إعدادات شاشة الماستر ديتيل
// -------------------------------------------------------------------------------------
//  الشاشة = ماستر واحد (رأس الفاتورة) + تفاصيل واحدة أو أكتر (لحد 5)
//  كل جزء بيتحفظ في جدول، وممكن يتعرض من قالب (View) فيه أسماء زيادة للعرض.
// =====================================================================================

import { DynamicGridColumn, SortDirection } from "./ModelGrid";
import { FilterFieldConfig, ActiveFilter } from "./AdvancedFilter";
import { ValidationRule } from "../../Validation";

// عمود في الماستر ديتيل = نفس عمود DynamicGrid + شوية إضافات
export interface MasterDetailColumn extends DynamicGridColumn {
  // لما تختار من نافذة بحث: املأ حقول تانية من الصف المختار
  //  { ItemName: "NameA", UnitPrice: "SalePrice" }  →  ItemName = row.NameA ...
  fillFrom?: Record<string, string>;
  // عمود محسوب (بيتحسب لوحده ومش بيتكتب فيه)  مثلاً: (r, n) => n(r.Qty) * n(r.UnitPrice)
  formula?: (row: Record<string, any>, n: (v: any) => number) => number;
}

// تجميع من التفاصيل للماستر  (مثلاً مجموع Total في التفاصيل → TotalAmount في الماستر)
export interface MasterDetailTotal {
  masterField: string;
  detailField?: string;          // مش محتاج مع count
  type?: "sum" | "count";        // الافتراضي sum
}

export interface MasterDetailDetailConfig {
  title: string;                 // اسم التاب (مترجم)
  tableName: string;             // الجدول اللي بيتحفظ فيه
  viewName?: string;             // القالب اللي بيتعرض منه (لو مختلف عن الجدول)
  keyColumn: string;             // مفتاح صف التفاصيل
  foreignKeyColumn: string;      // العمود اللي بيربط التفاصيل بالماستر
  columns: MasterDetailColumn[];
  totals?: MasterDetailTotal[];
  orderBy?: string;              // ترتيب الصفوف لما تتحمل
}

export interface MasterDetailConfig {
  // ===== الماستر =====
  tableName: string;             // الجدول اللي بيتحفظ فيه
  viewName?: string;             // القالب اللي بيتعرض منه في القائمة
  keyColumn: string;
  columns: MasterDetailColumn[]; // حقول الفورم (الماستر)
  listColumns: DynamicGridColumn[]; // أعمدة القائمة (من القالب)

  // ===== التفاصيل (1 لحد 5) =====
  details: MasterDetailDetailConfig[];

  // ===== القائمة =====
  condition?: string;
  orderBy?: string;
  orderType?: SortDirection;
  pageSize?: number;
  filterFields?: FilterFieldConfig[];
  defaultFilters?: ActiveFilter[];

  // ===== الحفظ =====
  compCode: number;
  branchCode: number;
  keyTrType?: string;            // @TrType في G_ProcessTrans
  runProcessTrans?: boolean;
  validations?: ValidationRule[];

  // ===== الأزرار =====
  enableInsert?: boolean;
  enableUpdate?: boolean;
  enableDelete?: boolean;
  enableView?: boolean;          // زرار "عرض" (الفورم للقراءة بس) — الافتراضي true
  enablePrint?: boolean;         // زرار "طباعة" — الافتراضي true
  onPrint?: (row: Record<string, any>) => void;   // الطباعة (لو مش متحددة بتظهر رسالة "قريباً")

  // ===== Phase 7 (اختياري): تقارير الطباعة. list = "طباعة القائمة" · transaction = إجراء الطباعة في الصف وزر الطباعة في الفورم (لو onPrint مش متحددة) =====
  report?: import("../../Reports/ReportTypes").ScreenReportConfig;

  // ===== الصلاحيات (اختياري — مش متحدد = مفيش تغيير) =====
  moduleCode?: string;          // = MODULE_CODE: بيقرا صلاحيات الشاشة من Session.CurrentPrivileges
  permissions?: import("../../Permissions").ModulePermissions;   // أو صلاحيات جاهزة بتتطبق مباشرة

  // ===== Phase 5 (اختياري): تخطيط حر لفورم الماستر (شبكة 12 عمود). مش متحدد = زي ما كان =====
  formLayout?: import("./FormLayout").FormLayout;

  // ===== Phase 6 (اختياري): تحميل نموذج Excel واستيراد معاملات/سطور. مش متحدد = مفيش تغيير. بيحتاج صلاحية الإضافة. =====
  excel?: import("../Excel/ExcelTypes").ExcelMasterDetailConfig;

  // نصوص الشاشة
  newTitle?: string;             // "فاتورة جديدة"
  editTitle?: string;            // "تعديل فاتورة رقم"
}
