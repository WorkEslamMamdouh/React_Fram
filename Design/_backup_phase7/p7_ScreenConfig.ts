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
  selectDisplay?: string;       // Arabic display column
  selectDisplayEn?: string;     // English display column (optional)
  selectValue?: string;
  selectCondition?: string;      // يدعم {row.X} (حقل تاني في الفورم) و {session.CompCode} ...
  // ===== v5 (كلها اختيارية) =====
  readOnly?: boolean;                 // يظهر بس مش بيتعدل (بيتحفظ لو مش noSave)
  visibleWhen?: RuleV5;               // يظهر لما ...
  enabledWhen?: RuleV5;               // يتفعّل لما ... (الجريد بس)
  selectOrderBy?: string;
  selectSearchable?: boolean;         // معلومة للمصمم (الدروب داون الكبير بيتحول لبحث تلقائيًا)
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

export function createEmptyScreenV4(type: ScreenType = "Grid"): ScreenConfigV4 {
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
export function normalizeConfigV4(cfg: ScreenConfigV4): ScreenConfigV4 {
  const base = createEmptyScreenV4(cfg.screenType || "Grid");
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


// ============================================================
// ===================== ScreenConfig v5 ======================
// (Phase 5 - No-code ScreenBuilder)  v5 = v4 + layout + filter area + actions + print + excel
// ============================================================

export type RuleOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "empty" | "notEmpty";
/** شرط بسيط على قيمة حقل تاني في نفس الفورم */
export interface RuleV5 { field: string; op: RuleOp; value: string }

export type ControlKind =
  | "text" | "number" | "decimal" | "date" | "select" | "selectSearch" | "search"
  | "checkbox" | "textarea" | "file" | "image"
  | "label" | "heading" | "divider" | "button";

/** عدد الأعمدة (من 12) على: الموبايل / التابلت / الكمبيوتر */
export interface SpanV5 { base: number; md: number; lg: number }

export interface CellV5 {
  id: string;
  kind: ControlKind;
  field?: string;          // اسم العمود (في fields[]) لو الكنترول مربوط بعمود
  textAr?: string;         // للـ label / heading
  textEn?: string;
  actionId?: string;       // للـ button → actions[].id
  span: SpanV5;
}
export interface RowV5 { id: string; cells: CellV5[] }
export interface SectionV5 { id: string; titleAr: string; titleEn: string; rows: RowV5[] }
export interface LayoutV5 { sections: SectionV5[] }

export type FilterKind = "text" | "number" | "date" | "dateRange" | "select" | "multiselect" | "boolean" | "search";
export type FilterOperator = "=" | "contains" | "starts" | ">=" | "<=" | "<>";

/** مصدر الدروب داون من جدول/فيو. condition يدعم {filter.X} (فلتر تاني) و {session.CompCode} */
export interface DropdownSourceV5 {
  table: string;
  valueField: string;
  displayField: string;      // عربي
  displayFieldEn: string;    // انجليزي (اختياري)
  condition: string;
  orderBy: string;
}

export interface FilterControlV5 {
  id: string;
  field: string;             // العمود المستهدف في الليست/الفيو
  kind: FilterKind;
  labelAr: string;
  labelEn: string;
  operator?: FilterOperator; // الافتراضي حسب النوع
  required: boolean;
  defaultValue: string;      // قيمة / today / monthStart / yearStart / CompCode ...
  options: string;           // اختيارات ثابتة  "1:فعال|0:غير فعال"
  source?: DropdownSourceV5; // اختيارات من جدول
  span: SpanV5;
}

/** ربط باراميتر إجراء/طباعة بقيمة */
export interface ParamMapV5 {
  name: string;                                         // اسم الباراميتر بدون @
  source: "const" | "session" | "filter" | "row";
  value: string;                                        // ثابت | CompCode.. | اسم الفلتر(العمود) | اسم عمود الصف
}

export interface ActionV5 {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: string;
  scope: "toolbar" | "row";          // row = جريد بس
  proc: string;
  params: ParamMapV5[];
  confirm: boolean;
  after: "refresh" | "message" | "none";
  messageAr: string;
  messageEn: string;
}

export interface PrintProcConfigV5 {
  enabled: boolean;
  proc: string;
  params: ParamMapV5[];
  paper: "A4" | "A5" | "Letter" | "Thermal80";
  orientation: "portrait" | "landscape";
}
export interface PrintConfigV5 {
  listPrint: PrintProcConfigV5;          // طباعة القايمة (Phase 7): بروسيجر + ربط البارامترات بالفلاتر
  transactionPrint: PrintProcConfigV5;   // طباعة مستند (Phase 7): الافتراضي CompCode/BranchCode/TrID
}

export interface ExcelConfigV5 {
  enabled: boolean;                                   // Phase 6
  templateName: string;
  columns: string[];                                  // أعمدة التمبلت (أسماء fields)
  /** قوائم الاختيار من جداول: valueField = العمود اللي بيتخزن · codeField = كود (اختياري) · displayField = الاسم · scope: ماستر/تفاصيل (الافتراضي ماستر) */
  keyLookups: { column: string; table: string; valueField: string; displayField: string; codeField?: string; condition?: string; scope?: "master" | "detail" }[];
  // ===== Phase 6 (كلها اختيارية) =====
  mode?: "multiTransaction" | "detailsOnly" | "both";   // الماستر ديتيل: معاملات كتير · أصناف في الفاتورة · الاتنين (الافتراضي both)
  detailIndex?: number;            // أي تفاصيل (من 0)
  detailColumns?: string[];        // أعمدة التفاصيل في التمبلت (فاضي = الكل)
  allOrNothing?: boolean;          // جريد: لو صف فشل الكل يتلغي
}

export interface ScreenConfigV5 extends Omit<ScreenConfigV4, "version"> {
  version: 5;
  menuSort: number;            // 0 = تلقائي (آخر ترتيب في المجموعة)
  layout: LayoutV5;            // شكل الفورم (شبكة 12 عمود: أقسام ← صفوف ← خلايا)
  filterArea: FilterControlV5[];
  actions: ActionV5[];
  print: PrintConfigV5;
  excel: ExcelConfigV5;
  /** screens imported best-effort from code without settings marker */
  importedBestEffort?: boolean;
}

let _idCounter = 0;
export function uid(prefix: string = "c"): string {
  _idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${_idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export const DEFAULT_SPAN: SpanV5 = { base: 12, md: 6, lg: 4 };

export function createEmptyProcConfig(defaults: ParamMapV5[] = []): PrintProcConfigV5 {
  return { enabled: false, proc: "", params: defaults, paper: "A4", orientation: "portrait" };
}

export function createEmptyScreen(type: ScreenType = "Grid"): ScreenConfigV5 {
  const base = createEmptyScreenV4(type);
  return {
    ...base,
    version: 5,
    menuSort: 0,
    layout: { sections: [] },
    filterArea: [],
    actions: [],
    print: {
      listPrint: createEmptyProcConfig(),
      transactionPrint: createEmptyProcConfig([
        { name: "CompCode", source: "session", value: "CompCode" },
        { name: "BranchCode", source: "session", value: "BranchCode" },
        { name: "TrID", source: "row", value: base.keyColumn || "" },
      ]),
    },
    excel: { enabled: false, templateName: "", columns: [], keyLookups: [] },
  };
}

export function inputKindOfField(f: FieldConfigV4): ControlKind {
  switch (f.inputType) {
    case "number": return "number";
    case "textarea": return "textarea";
    case "checkbox": return "checkbox";
    case "date": return "date";
    case "select": return "select";
    case "selectSearch": return "selectSearch";
    case "search": return "search";
    default: return "text";
  }
}

export function filterKindOfField(f: FieldConfigV4): FilterKind {
  if (f.inputType === "date") return "date";
  if (f.inputType === "number") return "number";
  if (f.inputType === "checkbox") return "select";
  if (f.inputType === "select" || f.inputType === "selectSearch") return "select";
  return "text";
}

/** فلاتر افتراضية من الحقول (زي سلوك v4) */
export function deriveFilterArea(cfg: Pick<ScreenConfigV4, "screenType" | "fields" | "listFields">): FilterControlV5[] {
  if (cfg.screenType === "Tree") return [];
  const src = cfg.screenType === "Grid" ? cfg.fields : cfg.listFields.length ? cfg.listFields : cfg.fields;
  return src.filter((f) => f.inFilter && !f.auto).map((f) => {
    const kind = filterKindOfField(f);
    const fc: FilterControlV5 = {
      id: uid("flt"), field: f.field, kind, labelAr: f.titleAr || f.field, labelEn: f.titleEn || f.field,
      required: false, defaultValue: "", options: "", span: { ...DEFAULT_SPAN },
    };
    if (f.inputType === "select" && f.options) fc.options = f.options;
    if (f.inputType === "checkbox") fc.options = "1:✓|0:✗";
    if (f.inputType === "selectSearch" && f.selectTable) {
      fc.source = { table: f.selectTable, valueField: f.selectValue || "", displayField: f.selectDisplay || "", displayFieldEn: f.selectDisplayEn || "", condition: f.selectCondition || "", orderBy: "" };
    }
    return fc;
  });
}

/** تخطيط تلقائي للفورم: 3 حقول في الصف، النص الطويل صف لوحده */
export function autoLayout(cfg: Pick<ScreenConfigV4, "fields">): LayoutV5 {
  const items = cfg.fields.filter((f) => f.inForm && !f.auto && !f.formula).sort((a, b) => (a.order || 99) - (b.order || 99));
  const rows: RowV5[] = [];
  let cur: CellV5[] = [];
  const flush = () => { if (cur.length) { rows.push({ id: uid("row"), cells: cur }); cur = []; } };
  for (const f of items) {
    const kind = inputKindOfField(f);
    if (kind === "textarea") {
      flush();
      rows.push({ id: uid("row"), cells: [{ id: uid("cell"), kind, field: f.field, span: { base: 12, md: 12, lg: 12 } }] });
      continue;
    }
    cur.push({ id: uid("cell"), kind, field: f.field, span: { ...DEFAULT_SPAN } });
    if (cur.length === 3) flush();
  }
  flush();
  return { sections: rows.length ? [{ id: uid("sec"), titleAr: "", titleEn: "", rows }] : [] };
}

/** كل الخلايا المربوطة بحقول (مسطّحة) */
export function layoutFieldNames(l: LayoutV5): string[] {
  return l.sections.flatMap((s) => s.rows.flatMap((r) => r.cells.filter((c) => c.field).map((c) => c.field as string)));
}

/** يشيل خلايا الحقول اللي اتمسحت من fields */
export function pruneLayout(l: LayoutV5, fieldNames: Set<string>): LayoutV5 {
  return {
    sections: l.sections.map((s) => ({
      ...s,
      rows: s.rows.map((r) => ({ ...r, cells: r.cells.filter((c) => !c.field || fieldNames.has(c.field)) })).filter((r) => r.cells.length > 0),
    })),
  };
}

/** أي نسخة (v3 / v4 / v5) → v5 كاملة */
export function normalizeConfig(raw: any): ScreenConfigV5 {
  const v4 = normalizeConfigV4(raw as ScreenConfigV4);
  const base = createEmptyScreen(v4.screenType);
  const isV5 = raw && raw.version === 5;
  const cfg: ScreenConfigV5 = {
    ...base,
    ...v4,
    version: 5,
    menuSort: isV5 && typeof raw.menuSort === "number" ? raw.menuSort : 0,
    layout: isV5 && raw.layout && Array.isArray(raw.layout.sections) ? raw.layout : { sections: [] },
    filterArea: isV5 && Array.isArray(raw.filterArea) ? raw.filterArea : [],
    actions: isV5 && Array.isArray(raw.actions) ? raw.actions : [],
    print: {
      listPrint: { ...base.print.listPrint, ...(isV5 ? raw.print?.listPrint : {}) },
      transactionPrint: { ...base.print.transactionPrint, ...(isV5 ? raw.print?.transactionPrint : {}) },
    },
    excel: { ...base.excel, ...(isV5 ? raw.excel : {}) },
    importedBestEffort: isV5 ? !!raw.importedBestEffort : false,
  };
  const fresh = !isV5 || !(raw.layout && Array.isArray(raw.layout.sections) && raw.layout.sections.length);
  if (!isV5 || (fresh && cfg.filterArea.length === 0)) cfg.filterArea = deriveFilterArea(cfg);
  if (!isV5) {
    cfg.layout = autoLayout(cfg);
  } else if (cfg.layout.sections.length === 0 && cfg.fields.some((f) => f.inForm)) {
    cfg.layout = autoLayout(cfg);
  }
  cfg.layout = pruneLayout(cfg.layout, new Set(cfg.fields.map((f) => f.field)));
  return cfg;
}