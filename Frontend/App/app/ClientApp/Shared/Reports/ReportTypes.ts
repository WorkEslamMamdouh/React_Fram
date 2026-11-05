// =====================================================================================
//  ReportTypes.ts  -  أنواع التقارير (Phase 7)
// =====================================================================================

export type ReportKind = "list" | "transaction";
export type ParamSource = "filter" | "session" | "const" | "trid";
export type ReportScope = "all" | "company" | "branch";
export type PaperSizeKey = "A4" | "A5" | "Letter" | "Thermal80" | "Thermal58" | "Custom";
export type OrientationKey = "portrait" | "landscape";

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
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
  Params: ReportParamDef[];
}

export interface LayoutMeta {
  LayoutId: number;
  ReportCode: string;
  Scope: ReportScope;
  CompCode: number | null;
  BranchCode: number | null;
  PaperSize: PaperSizeKey;
  Orientation: OrientationKey;
  MarginsJson: string | null;
  LayoutMrt?: string | null;
  IsDefault: boolean;
  UpdatedAt?: string | null;
  UpdatedBy?: string | null;
}

/** هوامش بالسنتيمتر + مقاس مخصص (لو PaperSize = Custom) */
export interface Margins {
  left: number;
  right: number;
  top: number;
  bottom: number;
  customWidth?: number;
  customHeight?: number;
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

export interface ProcParamInfo { Name: string; SqlType: string; MaxLength: number; IsOutput: boolean; HasDefault: boolean }
export interface ProcInfo { Parameters: ProcParamInfo[]; Columns: { Name: string; SqlType: string }[]; Warning: string }

export interface ReportsConfig { LicenseKey: string; StorageMode: "files" | "database"; CanDesign: boolean; RowCap: number }

export interface ReportLookups {
  Modules: { MODULE_CODE: string; DescA: string; DescE: string }[];
  Companies: { CompCode: number; NameA: string; NameE: string }[];
  Branches: { CompCode: number; BranchCode: number; BranchDescA: string; BranchDescE: string }[];
}

/** ما بتبعته الشاشة لما تطبع */
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

/**
 * إعداد اختياري للجريد / الماستر ديتيل (`report` prop).
 * ربط الباراميترات (فلتر / جلسة / ثابت / TrID) محفوظ في تعريف التقرير نفسه (شاشة إدارة التقارير).
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

export const PAPER_PRESETS: Record<Exclude<PaperSizeKey, "Custom">, { w: number; h: number; labelEn: string; labelAr: string }> = {
  A4: { w: 21, h: 29.7, labelEn: "A4", labelAr: "A4" },
  A5: { w: 14.8, h: 21, labelEn: "A5", labelAr: "A5" },
  Letter: { w: 21.59, h: 27.94, labelEn: "Letter", labelAr: "Letter" },
  Thermal80: { w: 8, h: 29.7, labelEn: "Receipt 80mm", labelAr: "إيصال 80 مم" },
  Thermal58: { w: 5.8, h: 29.7, labelEn: "Receipt 58mm", labelAr: "إيصال 58 مم" },
};

export const DEFAULT_MARGINS: Margins = { left: 1, right: 1, top: 1, bottom: 1 };

export function parseMargins(json: string | null | undefined): Margins {
  if (!json) return { ...DEFAULT_MARGINS };
  try {
    const m = JSON.parse(json);
    return { ...DEFAULT_MARGINS, ...m };
  } catch {
    return { ...DEFAULT_MARGINS };
  }
}
