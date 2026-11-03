# Phase 2 — التخطيط المعماري والتصميم التفصيلي
**التاريخ:** 2026-11-03  
**يعتمد على:** `ARCHITECTURE_ANALYSIS.md` (Phase 1)

---

## 1. المخطط العام للمشروع

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Screen Builder                        │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐       │
│  │ Component │  │  Live Canvas │  │  Properties     │       │
│  │ Panel     │  │  (DynamicGrid│  │  Panel          │       │
│  │           │  │  /MasterDet) │  │                 │       │
│  └──────────┘  └──────────────┘  └─────────────────┘       │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Bottom: Structure / Layers / Diagnostics        │       │
│  └─────────────────────────────────────────────────┘       │
└───────────────────────────┬─────────────────────────────────┘
                            │ يحفظ / يحمل
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ScreenConfig v4 (JSON)                          │
│  متوافق مع GridScreenSettings v3 + خصائص جديدة             │
└───────────────────────────┬─────────────────────────────────┘
                            │ يولّد
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  شاشة React: <Module>.ts + page.tsx                         │
│  بتستخدم: DynamicGrid / MasterDetail المحسنين               │
│  + DynamicGridFilter فوق الجريد                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. تصميم DynamicGridColumn المحسّن

### 2.1 الخصائص الجديدة

الخصائص دي **بتنضاف** على `DynamicGridColumn` الحالي. كل الخصائص الحالية بتفضل زي ما هي بقيمها الافتراضية — **مفيش breaking change**.

```typescript
export interface DynamicGridColumn {
  // ═══════════════════════════════════════════════
  // الخصائص الحالية (بدون تغيير)
  // ═══════════════════════════════════════════════
  field: string;
  NameDataBase?: string;
  title: string;
  type?: ColumnType;
  editable?: boolean;           // يتحفظ في التعديل
  insertable?: boolean;         // يتحفظ في الإضافة
  sortable?: boolean;
  IsSave?: boolean;
  IsVisibleDisplayInGrid?: boolean;
  IsDigits?: boolean;
  IsSearchColumn?: boolean;
  IsDisabledInEdit?: boolean;
  IsDisabledInAdd?: boolean;
  SortFieldInEditAndAdd?: number;
  width?: number | string;
  options?: SelectOption[];
  IsRequired?: boolean;
  IsValid?: (value: any, row?: any) => boolean;
  validationMessage?: string;
  inputType?: InputControlType;
  selectOptions?: SelectOption[];
  searchModal?: SearchModalConfig;
  placeholder?: string;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  DefaultValue?: any;
  itemTemplate?: (...) => React.ReactNode;
  EditTemplate?: (...) => React.ReactNode;
  InsertTemplate?: (...) => React.ReactNode;

  // ═══════════════════════════════════════════════
  // خصائص جديدة — Mode Visibility
  // ═══════════════════════════════════════════════

  /** يظهر في فورم الإنشاء (الافتراضي: true لو insertable !== false) */
  visibleInCreate?: boolean;

  /** يظهر في فورم التعديل (الافتراضي: true لو editable !== false) */
  visibleInEdit?: boolean;

  /** يظهر في وضع العرض فقط (الافتراضي: true) */
  visibleInView?: boolean;

  // ═══════════════════════════════════════════════
  // خصائص جديدة — Date Configuration
  // ═══════════════════════════════════════════════

  /** تنسيق العرض للتاريخ. مثال: "DD/MM/YYYY", "YYYY-MM-DD" */
  dateDisplayFormat?: string;

  /** تنسيق التخزين (الافتراضي: ISO 8601). مش هيتغير لأن القاعدة بتتعامل مع ISO */
  dateStorageFormat?: string;

  /** تاريخ فقط أو تاريخ ووقت. الافتراضي: "date" */
  dateMode?: "date" | "datetime";

  // ═══════════════════════════════════════════════
  // خصائص جديدة — Conditional
  // ═══════════════════════════════════════════════

  /** شرط الظهور: دالة بتاخد الصف وبترجع true/false */
  visibleWhen?: (row: Record<string, any>, mode: "create" | "edit" | "view") => boolean;

  /** شرط التفعيل: دالة بتاخد الصف وبترجع true/false */
  enabledWhen?: (row: Record<string, any>, mode: "create" | "edit" | "view") => boolean;

  // ═══════════════════════════════════════════════
  // خصائص جديدة — DynamicSelect Integration
  // ═══════════════════════════════════════════════

  /** لو نوع الحقل select وعايز يحمل Options من القاعدة */
  dynamicSelect?: DynamicSelectConfig;

  // ═══════════════════════════════════════════════
  // خصائص جديدة — Alignment
  // ═══════════════════════════════════════════════

  /** محاذاة العمود في الجريد. الافتراضي: حسب النوع (أرقام يمين، نص شمال) */
  align?: "left" | "center" | "right";
}
```

### 2.2 قواعد التوافق مع الشاشات الحالية

| الخاصية الجديدة | القيمة الافتراضية | السبب |
|----------------|-----------------|-------|
| `visibleInCreate` | `undefined` → يرجع لـ `insertable` | الشاشات الحالية مش بتستخدمه |
| `visibleInEdit` | `undefined` → يرجع لـ `editable` | نفس السبب |
| `visibleInView` | `true` | العرض بيظهر كل الحقول |
| `dateDisplayFormat` | `undefined` → `"YYYY-MM-DD"` | النظام الحالي |
| `dateMode` | `"date"` | أغلب الحقول تاريخ بس |
| `visibleWhen` | `undefined` → يظهر دايماً | بدون شرط |
| `enabledWhen` | `undefined` → مفعّل دايماً | بدون شرط |
| `align` | `undefined` → حسب النوع | سلوك ذكي تلقائي |

### 2.3 منطق حل الـ Visibility في DynamicGrid

```typescript
function resolveColumnVisibility(
  col: DynamicGridColumn,
  mode: "create" | "edit" | "view",
  row: Record<string, any>
): { visible: boolean; enabled: boolean } {
  // 1. الشرط الديناميكي أولاً
  if (col.visibleWhen && !col.visibleWhen(row, mode)) {
    return { visible: false, enabled: false };
  }

  // 2. حسب الوضع
  let visible: boolean;
  switch (mode) {
    case "create":
      visible = col.visibleInCreate ?? (col.insertable !== false);
      break;
    case "edit":
      visible = col.visibleInEdit ?? (col.editable !== false);
      break;
    case "view":
      visible = col.visibleInView ?? true;
      break;
  }

  // 3. التفعيل
  let enabled = true;
  if (mode === "create" && col.IsDisabledInAdd) enabled = false;
  if (mode === "edit" && col.IsDisabledInEdit) enabled = false;
  if (mode === "view") enabled = false;
  if (col.enabledWhen && !col.enabledWhen(row, mode)) enabled = false;

  return { visible, enabled };
}
```

---

## 3. تصميم DynamicGridFilter

### 3.1 المفهوم

`DynamicGridFilter` هو **component مستقل** بيظهر **فوق الجريد دايماً** (مش popup زي AdvancedFilter). بيوفر فلاتر إجبارية واختيارية مع قيم افتراضية.

### 3.2 الفرق بين AdvancedFilter و DynamicGridFilter

| | AdvancedFilter (الحالي) | DynamicGridFilter (الجديد) |
|---|---|---|
| **الموقع** | popup بيظهر ويختفي | مدمج فوق الجريد دايماً |
| **الفلاتر الإجبارية** | `required` flag بس | مع validation + منع التحميل |
| **التهيئة قبل التحميل** | لأ — الجريد بيحمل الأول | أيوه — بيهيئ القيم الافتراضية قبل أول request |
| **حالة الاستخدام** | بحث متقدم اختياري | فلاتر شاشة ثابتة (زي نطاق تاريخ) |
| **البناء** | component جديد | يعتمد على `FilterFieldConfig` الموجود |

### 3.3 التصميم

```typescript
// ═══════════════════════════════════════════════
// DynamicGridFilter — Types
// ═══════════════════════════════════════════════

export interface GridFilterConfig {
  /** تكوين الحقول — نفس FilterFieldConfig الموجود */
  fields: FilterFieldConfig[];

  /** يظهر فوق الجريد (الافتراضي: true) */
  visible?: boolean;

  /** الفلاتر تتطبق تلقائياً أول ما الشاشة تفتح (الافتراضي: true) */
  applyOnInit?: boolean;

  /** الفلاتر تتطبق تلقائياً عند أي تغيير (الافتراضي: false — المستخدم يضغط "تطبيق") */
  applyOnChange?: boolean;

  /** تخطيط الفلاتر */
  layout?: "inline" | "stacked";

  /** عدد الأعمدة في حالة inline (الافتراضي: 3) */
  columns?: number;
}

// ═══════════════════════════════════════════════
// DynamicGridFilter — Component Props
// ═══════════════════════════════════════════════

export interface DynamicGridFilterProps {
  config: GridFilterConfig;
  onFiltersChange: (filters: ActiveFilter[]) => void;
  lang: "ar" | "en";
  isDark: boolean;
}
```

### 3.4 مثال: نطاق تاريخ إجباري

```typescript
const filterConfig: GridFilterConfig = {
  fields: [
    {
      field: "DateFrom",
      label: t("From Date", "من تاريخ"),
      type: "date",
      required: true,
      defaultValue: firstDayOfMonth(), // 2026-11-01
      sortOrder: 1,
    },
    {
      field: "DateTo",
      label: t("To Date", "إلى تاريخ"),
      type: "date",
      required: true,
      defaultValue: today(), // 2026-11-03
      sortOrder: 2,
    },
  ],
  visible: true,
  applyOnInit: true,
};
```

### 3.5 تدفق العمل

```
الشاشة بتفتح
    │
    ▼
DynamicGridFilter بيتهيئ بالقيم الافتراضية
    │
    ├── فلاتر إجبارية (required) → لازم تتملى
    ├── فلاتر اختيارية → ممكن تتساب
    │
    ▼
applyOnInit = true?
    ├── أيوه → بيبني الشرط وبيبعته لـ DynamicGrid → الجريد بيحمل
    └── لأ → المستخدم يضغط "تطبيق"
    │
    ▼
المستخدم بيغير فلتر
    ├── applyOnChange = true → الجريد بيتحدث فوراً
    └── applyOnChange = false → ينتظر "تطبيق"
    │
    ▼
المستخدم بيضغط "مسح"
    ├── فلاتر required → بترجع للقيم الافتراضية (مش بتتمسح)
    └── فلاتر اختيارية → بتتمسح
```

### 3.6 التكامل مع DynamicGrid

```typescript
// في DynamicGridExtendedProps — إضافة
export interface DynamicGridExtendedProps extends DynamicGridProps {
  // ... الموجود
  filterFields?: FilterFieldConfig[];
  defaultFilters?: ActiveFilter[];
  enableAdvancedFilter?: boolean;

  // ═══ الجديد ═══
  /** تكوين فلتر ثابت فوق الجريد */
  gridFilter?: GridFilterConfig;

  /** callback لما الفلاتر تتغير */
  onGridFilterChange?: (filters: ActiveFilter[]) => void;

  /** منع التحميل لحد ما الفلاتر الإجبارية تتطبق (الافتراضي: true لو فيه gridFilter) */
  deferLoadUntilFilter?: boolean;
}
```

---

## 4. تصميم Date Configuration

### 4.1 المشكلة

- حالياً التاريخ بيتعرض وبيتخزن بنفس الشكل (ISO)
- مفيش تحكم في تنسيق العرض
- ممكن يحصل timezone shift

### 4.2 الحل

```typescript
// ═══════════════════════════════════════════════
// DateConfig — يتضاف على DynamicGridColumn
// ═══════════════════════════════════════════════

// الخصائص اللي اتحطت في DynamicGridColumn (القسم 2):
//   dateDisplayFormat?: string;     // "DD/MM/YYYY"
//   dateStorageFormat?: string;     // ISO 8601 (الافتراضي)
//   dateMode?: "date" | "datetime";

// ═══════════════════════════════════════════════
// إعدادات تاريخ عامة في المشروع
// ═══════════════════════════════════════════════

export interface ProjectDateConfig {
  /** تنسيق العرض الافتراضي لكل حقول التاريخ */
  defaultDisplayFormat: string;  // "DD/MM/YYYY"

  /** تنسيق التخزين (ISO 8601 — مش بيتغير) */
  storageFormat: "ISO8601";

  /** timezone handling */
  timezone: "local" | "utc" | string;  // "local" = المتصفح

  /** أول يوم في الأسبوع */
  firstDayOfWeek: 0 | 1 | 6;  // 0=أحد, 1=اتنين, 6=سبت
}

// القيم الافتراضية:
const DEFAULT_DATE_CONFIG: ProjectDateConfig = {
  defaultDisplayFormat: "DD/MM/YYYY",
  storageFormat: "ISO8601",
  timezone: "local",
  firstDayOfWeek: 6,  // السبت (لأن المشروع مصري)
};
```

### 4.3 دوال مساعدة

```typescript
// ═══ Utility Functions ═══

/** أول يوم في الشهر الحالي */
function firstDayOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

/** التاريخ الحالي */
function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** تحويل من ISO لتنسيق عرض */
function formatDate(iso: string, format: string): string { ... }

/** تحويل من تنسيق إدخال لـ ISO */
function parseDate(input: string, format: string): string { ... }
```

---

## 5. تصميم Web Screen Builder

### 5.1 موقعه في المشروع

```
Frontend/App/app/ClientApp/
├── ScreenBuilder/                     ← الشاشة الرئيسية
│   ├── ScreenBuilder.ts               ← المنطق (hook)
│   ├── page.tsx                       ← الشكل
│   ├── components/
│   │   ├── ComponentPanel.tsx         ← لوحة المكونات (يسار)
│   │   ├── LiveCanvas.tsx             ← المعاينة الحية (وسط)
│   │   ├── PropertiesPanel.tsx        ← لوحة الخصائص (يمين)
│   │   ├── BottomPanel.tsx            ← هيكل الشاشة (تحت)
│   │   ├── Toolbar.tsx                ← شريط الأدوات (فوق)
│   │   ├── FieldEditor.tsx            ← محرر حقل واحد
│   │   ├── FilterEditor.tsx           ← محرر فلتر واحد
│   │   ├── ValidationEditor.tsx       ← محرر تحقق
│   │   ├── ScreenList.tsx             ← قائمة الشاشات
│   │   └── PreviewModes.tsx           ← أوضاع المعاينة
│   ├── store/
│   │   ├── useScreenBuilder.ts        ← Zustand store
│   │   └── undoRedoMiddleware.ts      ← Undo/Redo
│   ├── utils/
│   │   ├── configConverter.ts         ← تحويل v3 ↔ v4
│   │   ├── codeGenerator.ts           ← توليد .ts/.tsx
│   │   └── configValidator.ts         ← تحقق من الإعدادات
│   └── types/
│       └── ScreenConfig.ts            ← ScreenConfig v4
```

### 5.2 ScreenConfig v4 — هيكل الإعدادات

```typescript
// ═══════════════════════════════════════════════
// ScreenConfig v4
// متوافق مع GridScreenSettings v3 + خصائص جديدة
// ═══════════════════════════════════════════════

export interface ScreenConfigV4 {
  /** نسخة الإعدادات */
  version: 4;

  /** نوع الشاشة */
  screenType: "Grid" | "MasterDetail";

  // ═══ معلومات الشاشة (زي v3) ═══
  module: string;
  table: string;
  view?: string;
  keyColumn: string;
  titleAr: string;
  titleEn: string;
  subAr?: string;
  subEn?: string;
  icon: string;
  iconColor: string;
  pageSize: number;

  // ═══ ترتيب وشرط ═══
  orderBy?: string;
  orderType: "ASC" | "DESC";
  extraCondition?: string;

  // ═══ G_ProcessTrans ═══
  processTrans: boolean;
  trType?: string;

  // ═══ أذونات ═══
  permissions: {
    insert: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
    usePermissions: boolean;
    parentMenu?: string;
    roles?: string;
  };

  // ═══ الحقول ═══
  fields: FieldConfigV4[];

  // ═══ أعمدة القائمة (MasterDetail فقط) ═══
  listFields?: FieldConfigV4[];

  // ═══ التفاصيل (MasterDetail فقط، لحد 5) ═══
  details?: DetailConfigV4[];

  // ═══ التحققات ═══
  validations: ValidationConfigV4[];

  // ═══ الجديد في v4 ═══

  /** فلتر ثابت فوق الجريد */
  gridFilter?: GridFilterConfigV4;

  /** تكوين التاريخ العام */
  dateConfig?: ProjectDateConfig;

  /** metadata: آخر تعديل، المستخدم، المصدر */
  meta?: {
    lastModified?: string;
    modifiedBy?: string;
    source?: "web" | "desktop";
  };
}

// ═══ حقل v4 = GridFieldSettings v3 + خصائص جديدة ═══
export interface FieldConfigV4 {
  // ═══ من v3 ═══
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

  // ═══ جديد في v4 ═══
  visibleInCreate?: boolean;
  visibleInEdit?: boolean;
  visibleInView?: boolean;
  dateDisplayFormat?: string;
  dateMode?: "date" | "datetime";
  align?: "left" | "center" | "right";
  dynamicSelect?: {
    tableName: string;
    displayField: string;
    valueField: string;
    condition?: string;
    attributes?: string[];
  };
}

// ═══ تفاصيل v4 ═══
export interface DetailConfigV4 {
  titleAr: string;
  titleEn: string;
  table: string;
  view?: string;
  keyColumn: string;
  foreignKey: string;
  totals?: string;
  orderBy?: string;
  fields: FieldConfigV4[];
}

// ═══ تحقق v4 ═══
export interface ValidationConfigV4 {
  detail: number;  // 0=master, 1..5=details
  type: string;
  field: string;
  when: "insert" | "update" | "both";
  operator?: string;
  compareTo?: string;
  value?: string;
  min?: string;
  max?: string;
  pattern?: string;
  table?: string;
  condition?: string;
  code?: string;
  messageAr: string;
  messageEn: string;
}

// ═══ فلتر v4 ═══
export interface GridFilterConfigV4 {
  fields: Array<{
    field: string;
    label: string;
    type: FilterFieldType;
    required?: boolean;
    defaultValue?: string;
    defaultRange?: { from?: string; to?: string };
    options?: string;  // نفس تنسيق Options: "0=نقدي=Cash;1=آجل=Credit"
    searchFn?: string;
    sortOrder?: number;
  }>;
  visible: boolean;
  applyOnInit: boolean;
  applyOnChange: boolean;
  layout: "inline" | "stacked";
  columns: number;
}
```

### 5.3 التحويل v3 ↔ v4

```typescript
// configConverter.ts

/** تحويل من v3 (CreatePageReact) لـ v4 (Web Builder) */
function convertV3toV4(v3: GridScreenSettings): ScreenConfigV4 {
  return {
    version: 4,
    screenType: v3.ScreenType as any,
    module: v3.Module,
    table: v3.Table,
    view: v3.View || undefined,
    keyColumn: v3.KeyColumn,
    titleAr: v3.TitleAr,
    titleEn: v3.TitleEn,
    // ... باقي الحقول 1:1
    fields: v3.Fields.map(f => ({
      ...f,  // كل حقول v3 بنفس الأسماء (camelCase)
      // الجديد: قيم افتراضية
      visibleInCreate: undefined,
      visibleInEdit: undefined,
      visibleInView: undefined,
    })),
    // ... details, validations
    meta: { source: "desktop" },
  };
}

/** تحويل من v4 لـ v3 (عشان الأداة الديسكتوب تفتحه) */
function convertV4toV3(v4: ScreenConfigV4): GridScreenSettings {
  return {
    Version: 3,
    ScreenType: v4.screenType,
    Module: v4.module,
    Table: v4.table,
    // ... باقي الحقول
    // الخصائص الجديدة بتتشال لأن v3 مش بيفهمها
    Fields: v4.fields.map(f => ({
      Field: f.field,
      TitleAr: f.titleAr,
      TitleEn: f.titleEn,
      InGrid: f.inGrid,
      InForm: f.inForm,
      // ... باقي v3 fields
    })),
  };
}

/** قراءة سطر الإعدادات من آخر ملف .ts */
function parseSettingsLine(tsContent: string): GridScreenSettings | null {
  const marker = "// @CreatePageReact-Settings:";
  const idx = tsContent.lastIndexOf(marker);
  if (idx < 0) return null;
  const json = tsContent.substring(idx + marker.length).trim();
  return JSON.parse(json);
}
```

### 5.4 الـ Store (Zustand)

```typescript
// useScreenBuilder.ts

interface ScreenBuilderState {
  // ═══ الشاشة الحالية ═══
  config: ScreenConfigV4 | null;
  isDirty: boolean;
  selectedElement: SelectedElement | null;
  previewMode: "create" | "edit" | "view" | "grid";

  // ═══ Undo/Redo ═══
  history: ScreenConfigV4[];
  historyIndex: number;

  // ═══ UI ═══
  panelSizes: { left: number; right: number; bottom: number };
  showBottomPanel: boolean;
  showComponentPanel: boolean;

  // ═══ Actions ═══
  newScreen: (type: "Grid" | "MasterDetail") => void;
  loadScreen: (module: string) => Promise<void>;
  saveScreen: () => Promise<void>;
  duplicateScreen: (newModule: string) => void;

  // ═══ Field Actions ═══
  addField: (field: FieldConfigV4) => void;
  updateField: (index: number, updates: Partial<FieldConfigV4>) => void;
  removeField: (index: number) => void;
  reorderFields: (fromIndex: number, toIndex: number) => void;

  // ═══ Detail Actions ═══
  addDetail: () => void;
  updateDetail: (index: number, updates: Partial<DetailConfigV4>) => void;
  removeDetail: (index: number) => void;

  // ═══ Validation Actions ═══
  addValidation: (rule: ValidationConfigV4) => void;
  updateValidation: (index: number, updates: Partial<ValidationConfigV4>) => void;
  removeValidation: (index: number) => void;

  // ═══ Filter Actions ═══
  setGridFilter: (config: GridFilterConfigV4 | null) => void;

  // ═══ Selection ═══
  selectElement: (el: SelectedElement | null) => void;

  // ═══ Undo/Redo ═══
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface SelectedElement {
  type: "field" | "filter" | "validation" | "detail" | "screen";
  index?: number;
  detailIndex?: number;
}
```

### 5.5 Live Canvas — آلية العمل

```
LiveCanvas
├── mode = "grid" → يعرض DynamicGrid بالإعدادات الحالية
│   ├── DynamicGridFilter (لو مكوّن)
│   └── DynamicGrid (columns من config.fields)
│
├── mode = "create" → يعرض FormModal في وضع الإضافة
│   └── FormModal (columns بعد resolveColumnVisibility)
│
├── mode = "edit" → يعرض FormModal في وضع التعديل
│   └── FormModal (columns بعد resolveColumnVisibility)
│
└── mode = "view" → يعرض FormModal في وضع القراءة
    └── FormModal (columns بعد resolveColumnVisibility)

كل element بيبقى عليه overlay شفاف:
├── click → selectElement → PropertiesPanel بيعرض الخصائص
├── drag → reorderFields
└── hover → border highlight
```

### 5.6 Code Generation (Web)

الويب بلدر بيولّد نفس الملفات زي الأداة الديسكتوب:

```typescript
// codeGenerator.ts

function generateTs(config: ScreenConfigV4): string {
  // نفس TPL_TS / TPL_MD_TS — بس بيضيف الخصائص الجديدة
  // مثال: visibleInCreate, dateDisplayFormat
}

function generateTsx(config: ScreenConfigV4): string {
  // نفس TPL_TSX / TPL_MD_TSX
}

function generateResources(config: ScreenConfigV4): { en: string; ar: string } {
  // ترجمات
}

function generateSql(config: ScreenConfigV4): string {
  // سكريبت الصلاحيات
}
```

**السطر الأخير** بيفضل نفسه:
```
// @CreatePageReact-Settings: {v3 JSON}
```
عشان الأداة الديسكتوب تفتح الشاشة. لكن كمان بيضيف سطر جديد:
```
// @ScreenBuilder-Settings: {v4 JSON}
```

---

## 6. استراتيجية التوافق والترحيل

### 6.1 التوافق العكسي

| العنصر | الاستراتيجية |
|--------|-------------|
| شاشات متولدة من الديسكتوب | بتشتغل بدون تعديل — الخصائص الجديدة كلها اختيارية |
| `DynamicGridColumn` | كل الخصائص الجديدة بقيم `undefined` → الافتراضي = السلوك الحالي |
| `GridScreenSettings` v3 | محفوظ — الويب بلدر بيحول v3 → v4 → v3 |
| `AdvancedFilter` | مش هيتلغى — `DynamicGridFilter` بديل جديد، مش replacement |
| الأداة الديسكتوب | **مش هنعدلها** — بتقرأ v3 وبتكتب v3 |

### 6.2 خطة الترحيل

```
المرحلة 1: إضافة الخصائص الجديدة على DynamicGridColumn
  → كل الشاشات الحالية تشتغل بدون تغيير
  → الشاشات الجديدة ممكن تستخدم الخصائص الجديدة

المرحلة 2: إضافة DynamicGridFilter
  → DynamicGrid بيدعم gridFilter prop جديد
  → الشاشات الحالية مش بتستخدمه → مفيش تأثير

المرحلة 3: Web Screen Builder
  → شاشة جديدة مستقلة: /ScreenBuilder
  → بتقرأ شاشات حالية عن طريق // @CreatePageReact-Settings
  → بتحفظ v3 + v4 في آخر سطر

المرحلة 4: Performance
  → تعديلات على DynamicGrid.tsx (تقسيم، memoization)
  → مفيش تغيير في API
```

### 6.3 ملفات هتتعدل

| الملف | التعديل | الخطورة |
|-------|--------|---------|
| `ModelGrid.ts` | إضافة خصائص جديدة على `DynamicGridColumn` | **منخفضة** — إضافة فقط |
| `DynamicGrid.tsx` | دعم الخصائص الجديدة + `gridFilter` + `deferLoadUntilFilter` | **متوسطة** — تعديل منطق |
| `MasterDetail.tsx` | دعم `visibleInCreate/Edit/View` | **متوسطة** |
| `AdvancedFilter.tsx` | مفيش تعديل | **صفر** |
| `Validation.ts` | مفيش تعديل | **صفر** |
| `CallDataBase.ts` | مفيش تعديل | **صفر** |

### 6.4 ملفات جديدة

| الملف | الوصف |
|-------|-------|
| `DynamicGridFilter.tsx` | فلتر ثابت فوق الجريد |
| `ScreenBuilder/` (فولدر كامل) | شاشة الويب بلدر |
| `ScreenConfig.ts` | أنواع v4 |
| `configConverter.ts` | تحويل v3 ↔ v4 |
| `codeGenerator.ts` | توليد كود من v4 |
| `dateUtils.ts` | دوال التاريخ |

---

## 7. ترتيب التنفيذ المقترح

### Phase 3 — Core Components (الأولوية العالية)

| الخطوة | الوصف | التبعيات |
|--------|-------|---------|
| 3.1 | تحديث `DynamicGridColumn` في `ModelGrid.ts` | لا شيء |
| 3.2 | تحديث `DynamicGrid.tsx` لدعم الخصائص الجديدة | 3.1 |
| 3.3 | تحديث `MasterDetail.tsx` لدعم الخصائص الجديدة | 3.1 |
| 3.4 | إنشاء `dateUtils.ts` | لا شيء |
| 3.5 | إنشاء `DynamicGridFilter.tsx` | 3.1 |
| 3.6 | تكامل `DynamicGridFilter` مع `DynamicGrid` | 3.2 + 3.5 |
| 3.7 | اختبار التوافق مع الشاشات الحالية | 3.2 + 3.3 |

### Phase 4 — Web Screen Builder

| الخطوة | الوصف | التبعيات |
|--------|-------|---------|
| 4.1 | إنشاء `ScreenConfig.ts` و `configConverter.ts` | Phase 3 |
| 4.2 | إنشاء `useScreenBuilder.ts` (Zustand + Undo/Redo) | 4.1 |
| 4.3 | إنشاء الـ Layout الرئيسي (Toolbar + Panels) | 4.2 |
| 4.4 | ComponentPanel | 4.3 |
| 4.5 | LiveCanvas (عرض DynamicGrid/MasterDetail) | 4.3 |
| 4.6 | PropertiesPanel | 4.3 |
| 4.7 | BottomPanel (هيكل الشاشة) | 4.3 |
| 4.8 | Screen Management (حفظ/تحميل/تكرار) | 4.2 |
| 4.9 | Code Generation | 4.1 |
| 4.10 | اختبار شامل | كل اللي فوق |

### Phase 5 — Performance

| الخطوة | الوصف |
|--------|-------|
| 5.1 | إصلاح `BuildWhereUltraFast` bug |
| 5.2 | تقسيم `DynamicGrid.tsx` لملفات أصغر |
| 5.3 | Parameterized queries في `buildFilterCondition` |
| 5.4 | Virtual scroll + lazy loading |
| 5.5 | قياس الأداء قبل/بعد |

### Phase 6 — QA

| الخطوة | الوصف |
|--------|-------|
| 6.1 | اختبار كل الشاشات الحالية (backward compatibility) |
| 6.2 | اختبار الخصائص الجديدة |
| 6.3 | اختبار DynamicGridFilter |
| 6.4 | اختبار Web Screen Builder |
| 6.5 | اختبار الأداء |
| 6.6 | تقرير QA النهائي |

---

## 8. ملخص القرارات المعمارية

| القرار | السبب |
|--------|-------|
| `ScreenConfig v4` منفصل عن `GridScreenSettings v3` | التوافق مع الأداة الديسكتوب |
| محوّل ثنائي الاتجاه v3 ↔ v4 | الشاشات تتفتح في الاتنين |
| `DynamicGridFilter` component جديد مش تعديل على `AdvancedFilter` | `AdvancedFilter` popup، الفلتر الجديد ثابت |
| الخصائص الجديدة كلها اختيارية بقيم `undefined` | صفر breaking changes |
| Web Builder في فولدر `ScreenBuilder/` مستقل | مش بيأثر على أي شاشة موجودة |
| الكود المتولد بيحتوي على سطرين settings: v3 + v4 | الأداتين تقدر تفتح الشاشة |
| Zustand store مع undo/redo middleware | نفس نمط `useSys` الموجود |
| LiveCanvas بيعرض components حقيقية مش mockups | المستخدم يشوف النتيجة الفعلية |
