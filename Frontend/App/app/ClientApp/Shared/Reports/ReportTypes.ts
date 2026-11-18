// =====================================================================================
//  ReportTypes.ts  -  أنواع التقارير في الرن تايم (تعريف التقرير + التصميم + نتيجة التشغيل)
//  شكل تصميم JSON نفسه في ReportLayoutTypes.ts (rf-report/1)
// =====================================================================================

import type { ReportData, ReportLayout } from "./ReportLayoutTypes";

export type ReportKind = "list" | "transaction";
export type ParamSource = "filter" | "session" | "const" | "trid";
export type ReportScope = "all" | "company" | "branch";

export interface ReportParamDef {
  ParamName: string;
  Source: ParamSource;
  SourceValue: string;
  SortOrder?: number;
}

export interface ReportDef {
  ReportCode: string;
  NameA: string;
  NameE: string;
  Kind: ReportKind;
  MODULE_CODE: string | null;
  ProcName: string;
  IsActive: boolean;
  Params: ReportParamDef[];
}

/** التصميم اللي resolve-layout بيرجّعه. LayoutFormat = json (الجديد) أو mrt (Stimulsoft قديم — مش بيتقري) */
export interface LayoutMeta {
  LayoutId: number;
  ReportCode: string;
  Scope: ReportScope;
  CompCode: number | null;
  BranchCode: number | null;
  PaperSize: string;
  Orientation: "portrait" | "landscape";
  MarginsJson: string | null;
  LayoutFormat?: "json" | "mrt" | string | null;
  LayoutJson?: string | null;
  IsDefault: boolean;
  UpdatedAt?: string | null;
}

export interface RunColumn { Name: string; Type: string; SqlType?: string }
export interface RunTable { Name: string; Columns: RunColumn[]; Rows: Record<string, any>[] }

export interface RunResult {
  ReportCode: string;
  Kind: ReportKind;
  NameA: string;
  NameE: string;
  Tables: RunTable[];
  Params: Record<string, any>;
  Company: Record<string, any>;
  Truncated: boolean;
  RowCap: number;
  ElapsedMs: number;
  Warning: string;
}

/** ما بتبعته الشاشة لما تطبع (التوقيع ثابت — DynamicGrid / MasterDetail / الشاشات المتولدة) */
export interface OpenReportOptions {
  reportCode: string;
  /** الفلاتر الحالية (طباعة قائمة): { الحقل: قيمة | {from,to} } */
  filters?: Record<string, any>;
  /** الصف المختار (طباعة مستند) */
  row?: Record<string, any>;
  /** رقم المستند لو متاح (بيتحط في باراميتر المصدر trid لو الصف مش فيه العمود) */
  trId?: any;
  /** عنوان بديل */
  title?: string;
  /** اسم الشاشة (للتحقق من صلاحية الطباعة على الواجهة) */
  moduleCode?: string;
}

/** طباعة بتصميم جاهز وبيانات جاهزة (من غير تعريف تقرير في القاعدة) — openLayoutReport() */
export interface OpenLayoutReportOptions {
  layout: ReportLayout;
  data: ReportData;
  title?: string;
  /** اسم ملف Excel/PDF */
  fileName?: string;
}

/**
 * إعداد اختياري للجريد / الماستر ديتيل (`report` prop).
 * ربط الباراميترات (فلتر / جلسة / ثابت / TrID) محفوظ في تعريف التقرير نفسه (Sys_ReportParams).
 */
export interface ScreenReportConfig {
  /** طباعة القائمة: زر "طباعة القائمة" في شريط الأدوات (بيبعت قيم الفلاتر الحالية) */
  list?: { reportCode: string; title?: string };
  /** طباعة مستند: إجراء "طباعة" في الصف (وزر الطباعة في فورم الماستر ديتيل) — بيبعت الصف المختار */
  transaction?: { reportCode: string; title?: string };
}

/** قيم الفلاتر الحالية كـ { الحقل: قيمة | {from,to} } (نفس شكل filterVals في الشاشات المتولدة) */
export function filtersToMap(filters: { field: string; type?: string; value?: any; fromValue?: any; toValue?: any }[]): Record<string, any> {
  const m: Record<string, any> = {};
  for (const f of filters || []) m[f.field] = f.type === "dateRange" ? { from: f.fromValue, to: f.toValue } : f.value;
  return m;
}
