// ============================================================
// ScreenConfig v4 — Web Screen Builder
// ============================================================

import { FilterFieldType } from "../../Shared/Components/Import/AdvancedFilter";

export interface ScreenConfigV4 {
  version: 4;
  screenType: ScreenType;
  module: string;
  table: string;
  view: string;
  keyColumn: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  icon: string;
  iconColor: string;
  pageSize: number;
  orderBy: string;
  orderType: "ASC" | "DESC";
  extraCondition: string;
  processTrans: boolean;
  trType: string;
  permissions: PermissionsConfig;
  fields: FieldConfigV4[];
  listFields: FieldConfigV4[];
  details: DetailConfigV4[];
  validations: ValidationConfigV4[];
  gridFilter: GridFilterConfigV4 | null;
  tree: TreeSettingsV4;
  headerFilter: HeaderFilterConfigV4;
  inlineStatus: InlineStatusConfigV4;
  meta: ScreenMeta;
}

// فلتر إجباري في الهيدر (مدى تاريخ)
export interface HeaderFilterConfigV4 {
  enabled: boolean;
  field: string;            // عمود SQL (مثلاً TransDate)
  labelAr: string;
  labelEn: string;
  type: "dateRange";
  fromDefault: "monthStart" | "yearStart";
  toDefault: "today" | "yearEnd";
}

export function createEmptyHeaderFilter(): HeaderFilterConfigV4 {
  return { enabled: false, field: "", labelAr: "", labelEn: "", type: "dateRange", fromDefault: "monthStart", toDefault: "today" };
}

// مربع اعتماد مضمّن داخل الجريد
export interface InlineStatusConfigV4 {
  enabled: boolean;
  field: string;
  approveTrType: string;
  unapproveTrType: string;
  approvePermission: string;
  unapprovePermission: string;
  confirmBeforeChange: boolean;
}

export function createEmptyInlineStatus(): InlineStatusConfigV4 {
  return { enabled: false, field: "", approveTrType: "", unapproveTrType: "", approvePermission: "", unapprovePermission: "", confirmBeforeChange: true };
}

export type ScreenType = "Grid" | "MasterDetail" | "Tree";

// إعدادات شاشة الشجرة (زي شجرة الحسابات / مراكز التكلفة)
export interface TreeSettingsV4 {
  codeColumn: string;      // كود العقدة  CC_CODE
  parentColumn: string;    // كود الأب    PARENT_ACC
  titleColumn: string;     // الاسم عربي  CC_DESCA
  titleColumnEn: string;   // الاسم انجليزي CC_DESCL
  levelColumn: string;     // المستوى     CC_LEVEL
  leafColumn: string;      // نهائي/تفصيلي DETAIL
  activeColumn: string;    // فعال        CC_ACTIVE
  autoCode: boolean;       // كود الابن = كود الأب + مسلسل
  codeDigits: number;      // خانات المسلسل
  codeSeparator: string;   // فاصل بين كود الأب والمسلسل
  searchColumns: string;   // أعمدة البحث مفصولة بفاصلة (فاضي = الكود والاسم)
  treePageSize: number;    // عدد العقد في كل تحميل
}

export function createEmptyTree(): TreeSettingsV4 {
  return {
    codeColumn: "", parentColumn: "", titleColumn: "", titleColumnEn: "",
    levelColumn: "", leafColumn: "", activeColumn: "",
    autoCode: true, codeDigits: 2, codeSeparator: "", searchColumns: "", treePageSize: 50,
  };
}

export interface PermissionsConfig {
  insert: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  usePermissions: boolean;
  parentMenu: string;
  roles: string;
}

export interface FieldConfigV4 {
  field: string;
  titleAr: string;
  titleEn: string;
  inGrid: boolean;
  inForm: boolean;
  required: boolean;
  search: boolean;
  inFilter: boolean;
  inputType: string;
  options: string;
  searchFn: string;
  searchCond: string;
  fillFrom: string;
  formula: string;
  auto: string;
  defaultValue: string;
  width: number;
  order: number;
  visibleInCreate?: boolean;
  visibleInEdit?: boolean;
  visibleInView?: boolean;
  dateDisplayFormat?: string;
  dateMode?: "date" | "datetime";
  align?: "left" | "center" | "right";
  noSave?: boolean;       // عمود محسوب في القاعدة أو موجود في الـ View بس → مابيتحفظش
  // عند inputType === "selectSearch" نحمل الخيارات من جدول بدل options ثابتة
  selectTable?: string;
  selectDisplay?: string;
  selectValue?: string;
  selectCondition?: string;
}

export interface DetailConfigV4 {
  titleAr: string;
  titleEn: string;
  table: string;
  view: string;
  keyColumn: string;
  foreignKey: string;
  totals: string;
  orderBy: string;
  fields: FieldConfigV4[];
}

export interface ValidationConfigV4 {
  detail: number;
  type: string;
  field: string;
  when: "insert" | "update" | "both";
  operator: string;
  compareTo: string;
  value: string;
  min: string;
  max: string;
  pattern: string;
  table: string;
  condition: string;
  code: string;
  messageAr: string;
  messageEn: string;
}

export interface GridFilterConfigV4 {
  fields: GridFilterFieldV4[];
  visible: boolean;
  applyOnInit: boolean;
  applyOnChange: boolean;
  layout: "inline" | "stacked";
  columns: number;
}

export interface GridFilterFieldV4 {
  field: string;
  label: string;
  type: FilterFieldType;
  required: boolean;
  defaultValue: string;
  defaultRange: { from: string; to: string };
  options: string;
  searchFn: string;
  sortOrder: number;
}

export interface ScreenMeta {
  lastModified: string;
  modifiedBy: string;
  source: "web" | "desktop";
}

// ============================================================
// Defaults
// ============================================================

export function createEmptyField(fieldName: string = ""): FieldConfigV4 {
  return {
    field: fieldName,
    titleAr: fieldName,
    titleEn: fieldName,
    inGrid: true,
    inForm: true,
    required: false,
    search: true,
    inFilter: true,
    inputType: "text",
    options: "",
    searchFn: "",
    searchCond: "",
    fillFrom: "",
    formula: "",
    auto: "",
    defaultValue: "",
    width: 150,
    order: 99,
  };
}

export function createEmptyScreen(type: ScreenType = "Grid"): ScreenConfigV4 {
  return {
    version: 4,
    screenType: type,
    module: "",
    table: "",
    view: "",
    keyColumn: "",
    titleAr: "",
    titleEn: "",
    subAr: "",
    subEn: "",
    icon: type === "Tree" ? "fa-sitemap" : "fa-table-list",
    iconColor: "indigo",
    pageSize: 10,
    orderBy: "",
    orderType: "DESC",
    extraCondition: "",
    processTrans: false,
    trType: "",
    permissions: {
      insert: true, edit: true, delete: true, export: true,
      usePermissions: true, parentMenu: "", roles: "",
    },
    fields: [],
    listFields: [],
    details: [],
    validations: [],
    gridFilter: null,
    tree: createEmptyTree(),
    headerFilter: createEmptyHeaderFilter(),
    inlineStatus: createEmptyInlineStatus(),
    meta: { lastModified: new Date().toISOString(), modifiedBy: "", source: "web" },
  };
}

// بيكمّل أي إعدادات ناقصة (شاشات قديمة اتحفظت قبل إضافة خاصية جديدة)
export function normalizeConfig(cfg: ScreenConfigV4): ScreenConfigV4 {
  const base = createEmptyScreen(cfg.screenType || "Grid");
  return {
    ...base,
    ...cfg,
    permissions: { ...base.permissions, ...(cfg.permissions || {}) },
    tree: { ...createEmptyTree(), ...(cfg.tree || {}) },
    headerFilter: { ...createEmptyHeaderFilter(), ...((cfg as any).headerFilter || {}) },
    inlineStatus: { ...createEmptyInlineStatus(), ...((cfg as any).inlineStatus || {}) },
    fields: cfg.fields || [],
    listFields: cfg.listFields || [],
    details: cfg.details || [],
    validations: cfg.validations || [],
  };
}

export function createEmptyDetail(): DetailConfigV4 {
  return {
    titleAr: "", titleEn: "", table: "", view: "",
    keyColumn: "", foreignKey: "", totals: "", orderBy: "",
    fields: [],
  };
}

export function createEmptyValidation(): ValidationConfigV4 {
  return {
    detail: 0, type: "required", field: "", when: "both",
    operator: "", compareTo: "", value: "", min: "", max: "",
    pattern: "", table: "", condition: "", code: "",
    messageAr: "", messageEn: "",
  };
}

export const INPUT_TYPES = ["text", "number", "textarea", "checkbox", "date", "select", "selectSearch", "search"] as const;
export const AUTO_VALUES = ["", "CompCode", "BranchCode", "UserID", "FinYear", "UserName", "Today", "Now"] as const;
export const VALIDATION_TYPES = ["required", "compare", "range", "regex", "unique", "exists", "notExists", "noDuplicate", "minRows", "custom"] as const;

export const DEFAULT_PRESETS: { value: string; labelEn: string; labelAr: string; description: string }[] = [
  { value: "GetDateNow()", labelEn: "GetDateNow()", labelAr: "التاريخ الحالي", description: "Current date yyyy-MM-dd" },
  { value: "GetDateTimeNow()", labelEn: "GetDateTimeNow()", labelAr: "التاريخ والوقت الحالي", description: "Current datetime" },
  { value: "UserName", labelEn: "UserName", labelAr: "اسم المستخدم", description: "Logged-in user name" },
  { value: "UserID", labelEn: "UserID", labelAr: "رقم المستخدم", description: "Logged-in user ID" },
  { value: "CompCode", labelEn: "CompCode", labelAr: "كود الشركة", description: "Current company code" },
  { value: "BranchCode", labelEn: "BranchCode", labelAr: "كود الفرع", description: "Current branch code" },
  { value: "FinYear", labelEn: "FinYear", labelAr: "السنة المالية", description: "Current fiscal year" },
  { value: "0", labelEn: "0", labelAr: "صفر", description: "Zero" },
  { value: "true", labelEn: "true", labelAr: "صح", description: "Boolean true" },
  { value: "false", labelEn: "false", labelAr: "غلط", description: "Boolean false" },
];
