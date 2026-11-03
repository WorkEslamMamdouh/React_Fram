# React_Fram — التحليل المعماري الشامل
**التاريخ:** 2026-11-03  
**الغرض:** تحليل كامل لبنية المشروع تمهيداً لبناء Web Screen Builder + تحسين الأداء + تطوير DynamicGrid

---

## 1. نظرة عامة على المشروع

### 1.1 المكونات الرئيسية

| المكون | التقنية | المسار |
|--------|---------|--------|
| Backend API | ASP.NET Core 9 | `Backend/` |
| Frontend | Next.js (Static Export) | `Frontend/App/` |
| قاعدة البيانات | SQL Server (`ESSA_React`) | `Backend/appsettings.json` |
| أداة التوليد | WinForms (.NET 4.6.1 / C# 7.3) | `Tools/CreatePageReact/` |
| سكريبتات SQL | إضافة شاشات وصلاحيات | `Database/` |

### 1.2 إحصائيات الكود (من Graphify)
- **عدد Nodes:** 1,448
- **عدد Edges:** 3,420
- **عدد Communities:** 88
- **آخر فهرسة:** 2026-11-03

---

## 2. أداة التوليد — CreatePageReact (Form4_GridPage)

### 2.1 البنية

الأداة مكتوبة بـ WinForms وبتتكون من:

| الملف | الدور |
|-------|-------|
| `Form4_GridPage.cs` | الواجهة + قاعدة البيانات + الفتح والحفظ |
| `Form4_GridPage.Gen.cs` | توليد الكود والقوالب |
| `GridScreenSettings.cs` | هيكل الإعدادات (v3) |
| `Form1.cs` | شاشة الاتصال والجداول القديمة |
| `Form3_React.cs` | توليد ملفات قديمة (HTML → TSX) |
| `Form5_SearchBuilder.cs` | بناء دوال البحث |

### 2.2 التابات في Form4

1. **الشاشة والجدول** — نوع الشاشة (Grid/MasterDetail)، الاتصال، الجدول/القالب، بيانات الشاشة، العرض والحفظ، الصلاحيات، المسارات
2. **الحقول** — حقول الجدول البسيط أو الماستر
3. **القائمة** — أعمدة القائمة (ماستر ديتيل فقط)
4. **التفاصيل** — لحد 5 تفاصيل، كل واحدة بجدول وقالب وحقول ومجاميع
5. **التحقق** — قواعد التحقق قبل الحفظ
6. **المعاينة والحفظ** — توليد الكود → مراجعة → حفظ الملفات + تنفيذ الصلاحيات

### 2.3 أنواع الشاشات

| النوع | الوصف | القالب |
|-------|-------|--------|
| Grid | جدول بسيط (CRUD + بحث + فلتر) | `TPL_TS` + `TPL_TSX` |
| MasterDetail | ماستر + لحد 5 تفاصيل | `TPL_MD_TS` + `TPL_MD_TSX` |

### 2.4 هيكل إعدادات الشاشة (`GridScreenSettings` v3)

```
GridScreenSettings
├── Version, ScreenType (Grid / MasterDetail)
├── Module, Table, View, KeyColumn
├── TitleAr, TitleEn, SubAr, SubEn, Icon
├── PageSize, OrderBy, OrderType
├── ProcessTrans, TrType, FilterComp, FilterBranch
├── ExtraCondition
├── Insert, Edit, Delete, Export
├── Permissions, ParentMenu, IconColor, Roles
├── Fields: GridFieldSettings[]         ← حقول الجدول البسيط / الماستر
├── ListFields: GridFieldSettings[]     ← أعمدة القائمة (ماستر ديتيل)
├── Details: MdDetailSettings[]         ← التفاصيل (لحد 5)
│   ├── TitleAr, TitleEn, Table, View, KeyColumn, ForeignKey
│   ├── Totals (TotalAmount=Total;ItemsCount=count)
│   ├── OrderBy
│   └── Fields: GridFieldSettings[]
└── Validations: ValidationSettings[]   ← قواعد التحقق
```

### 2.5 `GridFieldSettings` — إعدادات الحقل الواحد

| الخاصية | الوصف |
|---------|-------|
| `Field` | اسم العمود |
| `TitleAr` / `TitleEn` | العنوان بالعربي والإنجليزي |
| `InGrid` | يظهر في الجريد |
| `InForm` | يظهر في الفورم |
| `InFilter` | يظهر في الفلتر |
| `Required` | إجباري |
| `Search` | حقل بحث سريع |
| `InputType` | text / number / textarea / checkbox / date / select / search |
| `Options` | اختيارات select: `0=نقدي=Cash;1=آجل=Credit` |
| `SearchFn` | دالة البحث (مثلاً `Search_Users`) |
| `SearchCond` | شرط البحث |
| `FillFrom` | يملأ حقول من نتيجة البحث: `ItemName=NameA;UnitPrice=SalePrice` |
| `Formula` | معادلة حسابية: `Qty * UnitPrice` |
| `Auto` | قيمة تلقائية: CompCode / BranchCode / UserID / FinYear |
| `DefaultValue` | قيمة ثابتة أو `today` |
| `Width` / `Order` | العرض والترتيب |

### 2.6 `ValidationSettings` — قواعد التحقق

| النوع | الوصف |
|-------|-------|
| `required` | الحقل إجباري |
| `compare` | مقارنة مع حقل تاني أو قيمة |
| `range` | رقم بين الأقل والأكبر |
| `regex` | شكل معين |
| `unique` | متتكررش في الجدول |
| `exists` / `notExists` | لازم يكون/ميكونش فيه صف في جدول تاني |
| `noDuplicate` | متتكررش في صفوف التفاصيل |
| `minRows` | أقل عدد صفوف في التفاصيل |
| `custom` | كود JavaScript خاص |

### 2.7 عملية التوليد

```
Generate() →
  1. CollectSettings() → GridScreenSettings
  2. ReadRows(grid) → RowInfo[] (بيانات الحقول + metadata)
  3. Validate()
  4. IsMD ? GenMdTs() : GenTs()  → ملف .ts
  5. GenTsx()                     → ملف page.tsx
  6. GenResBlock()                → ترجمات Resources
  7. GenRoutesLine()              → سطر Routes
  8. GenSql()                     → سكريبت صلاحيات
  9. حفظ JSON Settings في آخر سطر: // @CreatePageReact-Settings: {json}
```

### 2.8 الملفات اللي بتتولد

```
Frontend/App/app/ClientApp/<Module>/
├── <Module>.ts     ← المنطق (hook بيرجع state + actions + grid config)
└── page.tsx        ← الشكل بس (JSX)
```

**السطر الأخير في `.ts`** بيحتوي على JSON الإعدادات عشان الأداة تفتح الشاشة تاني وتعدلها.

---

## 3. بنية الفرونت إند

### 3.1 نمط الشاشة (Screen Pattern)

كل شاشة = فولدر فيه:
- **`<Name>.ts`** — كل المنطق: hook بيرجّع `{ state, actions, grid }`
- **`page.tsx`** — الشكل بس: بيستدعي الـ hook ويعرض JSX

**مثال من CashTypes.ts:**
```typescript
export function CashTypes() {
  // 1. UsingSystem (useSys)
  // 2. State
  // 3. Events / Actions
  // 4. DynamicGrid Config (Columns, FilterFields, Validations)
  // 5. UI Return (state, actions, grid)
}
```

### 3.2 الشاشات الموجودة

| الشاشة | النوع | الملفات |
|--------|-------|---------|
| Login | نظام | Login.ts + page.tsx |
| LoginCompany | نظام | LoginCompany.ts + page.tsx |
| Register | نظام | Register.ts + page.tsx |
| Dashboard | نظام | Dashboard.ts + page.tsx |
| Home | نظام | Home.ts + page.tsx |
| Website | نظام | Website.ts + page.tsx |
| TestPage | Grid (تجريبي) | TestPage.ts + page.tsx |
| CashTypes | Grid (متولد) | CashTypes.ts + page.tsx |
| FinancialType | Grid (متولد) | FinancialType.ts + page.tsx |
| FinTrans_Expenses | Grid (متولد) | FinTrans_Expenses.ts + page.tsx |
| Employees | Grid (متولد) | Employees.ts + page.tsx |
| SalesInvoice | MasterDetail (متولد) | SalesInvoice.ts + page.tsx |

### 3.3 الحالة العامة — `useSys` (Zustand)

```typescript
// SystemUsing.ts — Zustand store + persist
{
  Session: SysSession,    // بيانات المستخدم والشركة والفرع
  isLoading: boolean,
  lang: "en" | "ar",
  IsLangEN: boolean,
  IsOpenMenu: boolean,
  IsDark: boolean,
  ShowLoader(), CloseLoader()
}
```

### 3.4 نداءات القاعدة — `SQL` (CallDataBase.ts)

```typescript
SQL.Select(NameTable, Condition, SelectedColumns?, ShowLoader?, CloseLoader?,
           CacheFlag?, OrderByID?, OrderType?, Top?, SearchValue?,
           SearchInColumns?, ExcludeColumns?, PageNumber?, PageSize?, ReturnTotalCount?)
→ Promise<{ data: T[], totalCount: number }>

SQL.Insert(TableName, Data, ShowLoader?, CloseLoader?)
SQL.Update(TableName, Data, KeyColumn, ShowLoader?, CloseLoader?)
SQL.Delete(TableName, Ids, KeyColumn, ShowLoader?, CloseLoader?)
SQL.InsertMasterDetail(request, ShowLoader?, CloseLoader?)
SQL.UpdateMasterDetail(request, ShowLoader?, CloseLoader?)
SQL.DeleteMasterDetail(request, ShowLoader?, CloseLoader?)
```

كل البيانات بتتشفر بمفتاح XOR (`Sys.CallApiEncrypted`) وبتتفك في الباك إند (`AutoDecryptFilter`).

---

## 4. المكونات المشتركة

### 4.1 DynamicGrid (`Import/DynamicGrid.tsx`)

**الـ component الرئيسي** للجداول. ~1,600+ سطر.

**Props الأساسية (`DynamicGridProps`):**
- `tableName`, `keyColumn`, `columns`, `condition`
- `orderBy`, `orderType`, `pageSize`
- `enableInsert/Update/Delete/Search/Export/Sort/Selection`

**Props الممتدة (`DynamicGridExtendedProps`):**
- `extraActions`, `enablePrint/Email/Archive/Copy/Share/History/Audit`
- `virtualScroll`, `debounceDelay`
- `filterFields`, `defaultFilters`, `enableAdvancedFilter`
- `beforeSave` — تحقق إضافي قبل الحفظ (ValidateRow)
- `compCode`, `branchCode`, `keyTrType`, `runProcessTrans`

**المكونات الداخلية:**
- `InputControl` — يتعامل مع أنواع الإدخال (text, number, select, search, date, textarea, checkbox)
- `FormModal` — مودال الإضافة/التعديل
- `BottomSheetMenu` — قائمة الموبايل
- `ModalDropdownMenu` — قائمة الأكشنز
- `MobileCard` — عرض بطاقات للموبايل
- `GlassContainer` — حاوية بخلفية زجاجية
- `buildFilterCondition()` — بناء شرط SQL من الفلاتر

**الملفات المجاورة (Graphify neighbors):**
```
DynamicGrid.tsx
├── imports → ModelGrid.ts (DynamicGridColumn, DynamicGridProps, SearchModalConfig, SortDirection)
├── imports → AdvancedFilter.tsx (ActiveFilter, FilterFieldConfig)
├── imports → SearchModal.tsx
├── imports → SystemTools.ts (Sys)
├── imports → SystemUsing.ts (useSys)
├── imports → CallDataBase.ts (SQL)
└── used by → CashTypes, Employees, FinancialType, FinTrans_Expenses, TestPage, MasterDetail
```

### 4.2 DynamicGridColumn (`ModelGrid.ts`)

```typescript
interface DynamicGridColumn {
  field: string;               // اسم العمود
  NameDataBase?: string;       // اسم مختلف في القاعدة
  title: string;               // العنوان
  type?: ColumnType;           // text | number | select | checkbox | date
  editable?: boolean;          // قابل للتعديل
  insertable?: boolean;        // يظهر في الإضافة
  sortable?: boolean;
  IsSave?: boolean;            // يتحفظ في القاعدة
  IsVisibleDisplayInGrid?: boolean;  // يظهر في الجريد
  IsDigits?: boolean;          // تنسيق أرقام
  IsSearchColumn?: boolean;    // البحث يدور فيه
  IsDisabledInEdit?: boolean;  // معطل في التعديل
  IsDisabledInAdd?: boolean;   // معطل في الإضافة
  SortFieldInEditAndAdd?: number;  // ترتيب في الفورم
  width?: number | string;
  options?: SelectOption[];
  IsRequired?: boolean;
  IsValid?: (value, row?) => boolean;
  validationMessage?: string;
  inputType?: InputControlType;  // text | number | select | search | date | textarea | checkbox
  selectOptions?: SelectOption[];
  searchModal?: SearchModalConfig;
  placeholder?: string;
  rows?: number;               // textarea
  min?, max?, step?: number;   // number
  DefaultValue?: any;
  itemTemplate?, EditTemplate?, InsertTemplate?;  // قوالب مخصصة
}
```

**ملاحظة مهمة:** الخصائص الحالية بالفعل بتدعم:
- ✅ ظهور/إخفاء في الجريد (`IsVisibleDisplayInGrid`)
- ✅ تعطيل في الإضافة/التعديل (`IsDisabledInAdd`, `IsDisabledInEdit`)
- ✅ ترتيب في الفورم (`SortFieldInEditAndAdd`)
- ✅ إجباري (`IsRequired`)
- ✅ قيمة افتراضية (`DefaultValue`)
- ✅ قوالب مخصصة (`itemTemplate`, `EditTemplate`, `InsertTemplate`)
- ❌ **ناقص:** ظهور في وضع العرض فقط (view mode visibility)
- ❌ **ناقص:** ظهور في وضع الإنشاء فقط vs التعديل فقط (create-only / edit-only)
- ❌ **ناقص:** تكوين تنسيق التاريخ (display/storage format)
- ❌ **ناقص:** Conditional visibility/enablement

### 4.3 MasterDetail (`Import/MasterDetail.tsx`)

**مكون الماستر ديتيل** — يدعم لحد 5 تفاصيل.

**`MasterDetailConfig`:**
```typescript
{
  tableName, viewName?, keyColumn,
  columns: MasterDetailColumn[],     // حقول الماستر
  listColumns: DynamicGridColumn[],  // أعمدة القائمة
  details: MasterDetailDetailConfig[], // لحد 5 تفاصيل
  condition?, orderBy?, orderType?, pageSize?,
  filterFields?, defaultFilters?,
  compCode, branchCode, keyTrType?, runProcessTrans?,
  validations?: ValidationRule[],
  enableInsert/Update/Delete/View/Print?,
  onPrint?,
  newTitle?, editTitle?
}
```

**`MasterDetailColumn` extends `DynamicGridColumn`:**
```typescript
{
  fillFrom?: Record<string, string>;    // يملأ حقول من البحث
  formula?: (row, n) => number;         // عمود محسوب
}
```

**العمليات:**
- `openNew()` — فورم جديد بقيم افتراضية
- `openEdit(row, readOnly?)` — تحميل الماستر + كل التفاصيل من القاعدة
- `save()` — Insert/Update MasterDetail + ProcessTrans
- `deleteRecord(row)` — حذف الماستر + كل التفاصيل
- `recalc(master, details, config)` — إعادة حساب المعادلات والمجاميع

### 4.4 AdvancedFilter (`Import/AdvancedFilter.tsx`)

**فلتر متقدم** — يظهر فوق الجريد.

**`FilterFieldConfig`:**
```typescript
{
  field, label,
  type: FilterFieldType,    // text | number | date | dateRange | select | multiselect | boolean | search
  options?: FilterOption[],
  placeholder?, defaultValue?,
  defaultRange?: { from?, to? },
  quickDateOptions?: boolean,
  searchModal?: SearchModalConfig,
  required?: boolean,
  sortOrder?: number
}
```

**مدعوم حالياً:**
- ✅ أنواع الفلتر الثمانية
- ✅ قيم افتراضية
- ✅ نطاق تاريخ
- ✅ خيارات تاريخ سريعة
- ✅ بحث modal
- ✅ متعدد الاختيارات
- ✅ `buildFilterCondition()` بتبني شرط SQL

### 4.5 Validation (`Shared/Validation.ts`)

- `RunValidations(rules, master, details, opt)` — بتشيك كل القواعد بالترتيب
- `ValidateRow(rules, row, opt)` — بتشيك على صف واحد (الماستر)
- `checkRule(rule, ctx, opt)` — بتشيك قاعدة واحدة
- بتدعم `{placeholder}` في الشروط والرسايل
- `exists`/`notExists` بتعمل query على القاعدة

### 4.6 مكونات تانية

| المكون | الدور |
|--------|-------|
| `SearchModal.tsx` | نافذة بحث (popup grid) |
| `G_SearchFrom.ts` | factory functions لنوافذ البحث |
| `G_DynamicSelect.ts` | factory functions لـ dropdown ديناميكي |
| `DynamicSelect.tsx` | dropdown بيحمل options من القاعدة |
| `Resources.ts` | ملفات الترجمة |
| `SystemTools.ts` | أدوات مساعدة (ShowMessage, CallApiEncrypted, etc.) |

---

## 5. الباك إند — API

### 5.1 `ManageDataSQLController`

كونترولر واحد عام لكل العمليات:

| Endpoint | HTTP | الوصف |
|----------|------|-------|
| `Query` | POST | استعلام (يدعم batch + cache) |
| `Insert` | POST | إضافة صف واحد |
| `insert-list` | POST | إضافة عدة صفوف |
| `Update` | PUT | تعديل صف واحد |
| `update-list` | PUT | تعديل عدة صفوف |
| `delete` | DELETE | حذف صفوف |
| `InsertMasterDetail` | POST | إضافة ماستر + تفاصيل |
| `UpdateMasterDetail` | PUT | تعديل ماستر + تفاصيل |
| `DeleteMasterDetail` | DELETE | حذف ماستر + تفاصيل |

### 5.2 `SQLServer` Service

- Connection pool محسن (MaxPool=100, MinPool=10)
- Cache: Redis + Memory Cache fallback
- `ExecuteTransaction` — كل العمليات في transaction
- `BulkInsertUltraFast` — إدخال سريع بالجملة
- `RunProcessTrans` — تشغيل G_ProcessTrans
- `BuildWhereUltraFast` — **بها مشكلة معروفة:** بتعمل replace لـ `"= 1"` فبتبوّظ `"= 15"`

### 5.3 التشفير

- الفرونت بيشفر البيانات بـ XOR: `Sys.CallApiEncrypted`
- الباك إند بيفك بـ `AutoDecryptFilter`
- كل الـ requests بتعدي من الفلتر ده

---

## 6. الصلاحيات

```
IQ_Sys_RoleModule = Sys_RoleModule (UserID=0) UNION Sys_UserModule (RoleId=0)
→ كل user/company/branch
→ JOIN Sys_Modules + Sys_RoleUsers
→ LEFT JOIN Sys_ControlYear

القيم:
- CREATE/EDIT/DELETE/CUSTOM → بس لو Year.Status = 0
- PRINT/VIEW → لو Status = 0 أو 1
- EXECUTE → لو Module.AVAILABLE = 1
```

---

## 7. التحليل — فرص التحسين والتطوير

### 7.1 DynamicGridColumn — الخصائص الناقصة

| الخاصية المطلوبة | الحالة | الأولوية |
|-----------------|--------|---------|
| `visibleInCreate` | ❌ ناقص (حالياً `insertable` بتتحكم في الحفظ مش الظهور) | عالية |
| `visibleInEdit` | ❌ ناقص (حالياً `editable` بتتحكم في الحفظ) | عالية |
| `visibleInView` | ❌ ناقص | عالية |
| `dateDisplayFormat` | ❌ ناقص | متوسطة |
| `dateStorageFormat` | ❌ ناقص (حالياً ISO فقط) | متوسطة |
| `conditionalVisibility` | ❌ ناقص | منخفضة |
| `conditionalEnablement` | ❌ ناقص | منخفضة |

### 7.2 DynamicGridFilter — الحالة الحالية

**`AdvancedFilter.tsx` موجود بالفعل** ويدعم:
- 8 أنواع فلتر
- قيم افتراضية ونطاق تاريخ
- `required` flag
- تكامل مع SearchModal

**الناقص:**
- ❌ الفلتر ده بيظهر كـ popup، مش visible فوق الجريد دايماً
- ❌ مفيش `initializeBeforeFirstLoad` — الجريد ممكن يحمّل قبل ما الفلاتر الإجبارية تتطبق
- ❌ مفيش mandatory date range مع validation على المسح

### 7.3 أداة التوليد (CreatePageReact) — التوافق

النسخة الويب لازم تحافظ على:
1. **هيكل `GridScreenSettings` v3** — عشان الشاشات المتولدة تتفتح تاني
2. **السطر `// @CreatePageReact-Settings: {json}`** — عشان الأداة تقرأ الإعدادات
3. **نفس أنواع الحقول** (7 أنواع: text, number, textarea, checkbox, date, select, search)
4. **نفس أنواع التحقق** (10 أنواع)
5. **نفس نمط الشاشة** (hook → state + actions + grid)

### 7.4 Performance — نقاط الاهتمام

| النقطة | التأثير |
|--------|---------|
| DynamicGrid ~1,600 سطر في ملف واحد | صعوبة الصيانة + bundle size |
| `buildFilterCondition` بتبني SQL string (مش parameterized) | أمان |
| `BuildWhereUltraFast` bug | بيبوّظ conditions فيها `= 1` |
| كل re-render بيعمل recalc للأعمدة لو مش في `useMemo` | أداء |
| SearchModal بيحمل كل البيانات مرة واحدة | ذاكرة |

---

## 8. المكونات القابلة لإعادة الاستخدام

### 8.1 مكونات جاهزة يمكن استخدامها في Web Screen Builder

| المكون | الاستخدام المحتمل |
|--------|-------------------|
| `DynamicGrid` | عرض الجريد في المعاينة الحية |
| `MasterDetail` | عرض شاشات الماستر ديتيل |
| `InputControl` | محررات الحقول في لوحة الخصائص |
| `AdvancedFilter` | تكوين الفلاتر |
| `SearchModal` | نوافذ البحث في المصمم |
| `DynamicSelect` | dropdowns في لوحة الخصائص |
| `Validation` | تطبيق التحقق في المعاينة |

### 8.2 أدوات مساعدة

| الأداة | الاستخدام |
|--------|----------|
| `SQL.Select/Insert/Update/Delete` | كل عمليات القاعدة |
| `useSys` | الحالة العامة (لغة، ثيم، جلسة) |
| `Sys.ShowMessage` | الرسائل |
| `useTranslate` / `Resources.ts` | الترجمة |
| `G_SearchFrom` / `G_DynamicSelect` | factory functions |

---

## 9. خريطة الملفات الأساسية

```
React_Fram/
├── Backend/
│   ├── Controllers/GateWay/
│   │   ├── ManageDataSQLController.cs      ← API الرئيسي
│   │   ├── Model/SharedModel.cs            ← Models
│   │   └── Services/SQLServer.cs           ← قاعدة البيانات
│   └── appsettings.json
├── Frontend/App/app/ClientApp/
│   ├── Shared/
│   │   ├── CallDataBase.ts                 ← SQL helper
│   │   ├── SystemUsing.ts                  ← Zustand store
│   │   ├── SystemTools.ts                  ← أدوات عامة
│   │   ├── Validation.ts                   ← التحقق
│   │   ├── Resources.ts                    ← الترجمة
│   │   ├── G_SearchFrom.ts                 ← factory: بحث
│   │   ├── G_DynamicSelect.ts              ← factory: dropdown
│   │   └── Components/Import/
│   │       ├── DynamicGrid.tsx             ← جريد ديناميكي
│   │       ├── MasterDetail.tsx            ← ماستر ديتيل
│   │       ├── ModelGrid.ts                ← types: Grid
│   │       ├── ModelMasterDetail.ts        ← types: MasterDetail
│   │       ├── AdvancedFilter.tsx          ← فلتر متقدم
│   │       ├── SearchModal.tsx             ← نافذة بحث
│   │       └── DynamicSelect.tsx           ← dropdown ديناميكي
│   ├── CashTypes/                          ← شاشة Grid (متولدة)
│   ├── SalesInvoice/                       ← شاشة MasterDetail (متولدة)
│   └── ...
├── Tools/CreatePageReact/UpdateNewModel/
│   ├── Form4_GridPage.cs                   ← الواجهة
│   ├── Form4_GridPage.Gen.cs               ← التوليد
│   └── GridScreenSettings.cs               ← الإعدادات
└── Database/                               ← سكريبتات SQL
```

---

## 10. التوصيات للمراحل القادمة

### Phase 2 — التخطيط المعماري
1. تحديد هيكل Web Screen Builder (أين يعيش في المشروع)
2. تحديد format إعدادات الشاشة الويب (توسيع `GridScreenSettings` v4؟)
3. تحديد كيفية التوافق مع الأداة الديسكتوب

### Phase 3 — المكونات الأساسية
1. تطوير `DynamicGridColumn` (إضافة visibility modes + date formats)
2. تطوير `DynamicGridFilter` (visible above grid + mandatory + initialize before load)
3. تطوير date configuration

### Phase 4 — Web Screen Builder
1. Main layout (component panel + canvas + properties)
2. Live preview using actual DynamicGrid/MasterDetail
3. Properties panel
4. Screen save/load (compatible with CreatePageReact settings)

### Phase 5 — Performance
1. إصلاح `BuildWhereUltraFast` bug
2. تقسيم DynamicGrid.tsx لملفات أصغر
3. Parameterized queries في buildFilterCondition
4. Lazy loading للـ SearchModal data
