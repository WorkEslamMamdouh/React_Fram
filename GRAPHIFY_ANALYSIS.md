# React_Fram — تحليل Graphify الشامل

> **تاريخ التحليل:** 2026-11-03  
> **Commit:** `d8a9c98`  
> **إحصائيات الجراف:** 1,439 node · 3,403 edge · 88 community  

---

## 1. نظرة عامة على المشروع

إطار ERP متكامل مكوّن من 3 أجزاء رئيسية:

| الجزء | التقنية | المسار |
|---|---|---|
| **Backend** | ASP.NET Core 9 API | `Backend/` |
| **Frontend** | Next.js (Static Export) | `Frontend/App/` |
| **أداة التوليد** | WinForms (.NET 4.6.1) | `Tools/CreatePageReact/` |
| **قاعدة البيانات** | SQL Server (`ESSA_React`) | `Database/` |

### الحزم الأساسية (Backend)
- `Microsoft.EntityFrameworkCore.SqlServer 6.0.0`
- `Microsoft.AspNetCore.Authentication.JwtBearer 6.0.0`
- `Swashbuckle.AspNetCore 6.5.0`
- `FirebaseAdmin 3.5.0`
- `Microsoft.Extensions.Caching.StackExchangeRedis 10.0.6`

---

## 2. البنية المعمارية — Backend

### 2.1 الكنترولر العام (`ManageDataSQLController`)
**المسار:** `Backend/Controllers/GateWay/ManageDataSQLController.cs`

كل عمليات البيانات بتعدي من كنترولر واحد عام عبر الـ endpoints دي:

| Endpoint | HTTP | الوظيفة |
|---|---|---|
| `Query` | POST | استعلام (SELECT) — يدعم Tables و Stored Procedures |
| `GetDataFromSql` | POST | جلب بيانات مباشر |
| `Insert` | POST | إدخال صف واحد |
| `insert-list` | POST | إدخال عدة صفوف |
| `Update` | PUT | تعديل صف واحد |
| `update-list` | PUT | تعديل عدة صفوف |
| `bulk-insert` | POST | إدخال جماعي عالي الأداء |
| `InsertMasterDetail` | POST | إدخال ماستر + تفاصيل (لحد 5) |
| `UpdateMasterDetail` | PUT | تعديل ماستر + تفاصيل |
| `DeleteMasterDetail` | DELETE | حذف ماستر + تفاصيل |

**ملاحظات مهمة:**
- الكنترولر مزوّد بـ `[ServiceFilter(typeof(AutoDecryptFilter))]` لفك التشفير التلقائي.
- بيستخدم `SQLServer _service` مباشرة (مش DI).
- الـ `Query` بيدعم **Cache بـ 4 أوضاع:** بدون (default) / من الكاش (1) / حذف + تحميل (2) / إعادة تحميل (3).
- التوازي: `MaxDegreeOfParallelism = 10` في الـ Query.

### 2.2 خدمة قاعدة البيانات (`SQLServer`)
**المسار:** `Backend/Controllers/GateWay/Services/SQLServer.cs`

خدمة شاملة فيها:
- **Connection Pool:** `SemaphoreSlim` بحد أقصى 100 اتصال.
- **Caching:** Redis + Memory Cache (fallback) مع قوايم السماح والاستثناء.
- **Schema Cache:** تخزين مؤقت للـ Primary Keys و Identity Columns و Table Schema.
- **العمليات:** `InsertAuto` / `UpdateAuto` / `BulkInsertUltraFast` / `UpdateOneUltraFast` / `UpdateListUltraFast` / `BulkUpdateUltraFast`.
- `UpdateAuto` بيختار تلقائي بين single / list / bulk حسب عدد الصفوف (أقل من 500 = list، أكتر = bulk).
- `ExecuteTransaction` بتلف كل عملية كتابة في Transaction.
- `RunProcessTrans` بتنادي الإجراء المخزن `G_ProcessTrans`.

### 2.3 المصادقة (`AuthController`)
**المسار:** `Backend/Controllers/AuthController.cs`

- Endpoint: `GET api/auth/login?Username=...&Password=...`
- بيستعلم من جدول `Sys_Users` مباشرة.
- بيرجّع JWT Token + بيانات الشركات والفروع والسنوات المالية.
- بيحدّث التوكن في جدول المستخدم.

### 2.4 التشفير
**الآلية:** XOR Encryption (مفتاح Base64 ثابت)

| الطرف | الملف | الوظيفة |
|---|---|---|
| **Frontend** | `Shared/SystemTools.ts` | `encrypt()` — تشفير XOR + Base64 |
| **Frontend** | `Shared/SystemTools.ts` | `CallApiEncrypted()` — تشفير الحقول قبل الإرسال |
| **Backend** | `Security/Filters.cs` | `AutoDecryptFilter` — فك التشفير التلقائي |
| **Backend** | `Security/CryptoHelper.cs` | `DecryptFast()` — فك XOR |

**الحقول المشفرة:** `TableName`, `KeyColumn`, `NameTable`, `Condition`, `SearchValue`, `OrderByID`, `Data`, `DataList`, `Ids`

---

## 3. البنية المعمارية — Frontend

### 3.1 هيكل الشاشات
كل شاشة عبارة عن فولدر في `app/ClientApp/<Name>/` فيه:

```
<Name>/
  ├── <Name>.ts    ← اللوجيك (hook بيرجّع state + actions + elements)
  └── page.tsx     ← الشكل (UI) بس
```

### 3.2 الحالة العامة (`useSys`)
**ملفين:**
- `Shared/SystemUsing.ts` — Store أساسي (zustand + persist + BroadcastChannel)
- `Shared/SystemSession.ts` — Store مطوّر (مع syncState)

**البيانات المخزنة:**

| الفئة | الحقول |
|---|---|
| **الجلسة** | `Session` (SysSession) · `token` |
| **بيانات العمل** | `DataCompany` · `DataBranch` · `DataYearControl` |
| **اللغة** | `lang` ("en"/"ar") · `IsLangEN` |
| **المظهر** | `IsDark` · `IsOpenMenu` · `IsNotifications` |
| **الـ Loader** | `isLoading` · `ShowLoader()` · `CloseLoader()` |

**المزامنة بين التابات:** عبر `BroadcastChannel` + `SYNC_KEYS`.

### 3.3 الراوتنج (`Routes.tsx`)
**المسار:** `Frontend/App/app/ClientApp/Routes.tsx`

بيعتمد على segment الـ URL الثاني:

| الصفحة | الـ Layout |
|---|---|
| `""`, `Website` | `NotLayout` |
| `Login`, `Register`, `LoginCompany` | `LoginLayout` |
| `Admin` | `AdminLayout` |
| `Home`, `SalesInvoice`, `TestPage`, `CashTypes`, `FinancialType`, `Dashboard`, `Employees`, `FinTrans_Expenses`, `Salse`, `Pur` | `HomeLayout` |

### 3.4 نداءات قاعدة البيانات (`CallDataBase.ts`)
**المسار:** `Frontend/App/app/ClientApp/Shared/CallDataBase.ts`

كل النداءات بتعدي على `Sys.CallApiEncrypted` وبتنادي `ManageDataSQL` controller:

| الدالة | الـ Action |
|---|---|
| `SQL.Select(...)` | `Query` |
| `SQL.Insert(...)` | `Insert` |
| `SQL.Update(...)` | `Update` |
| `SQL.Delete(...)` | `Delete` |
| `SQL.InsertMasterDetail(...)` | `InsertMasterDetail` |
| `SQL.UpdateMasterDetail(...)` | `UpdateMasterDetail` |
| `SQL.DeleteMasterDetail(...)` | `DeleteMasterDetail` |

### 3.5 الترجمة (`Resources.ts`)
**المسار:** `Frontend/App/app/ClientApp/Shared/Resources.ts`

- `resources` = كائن فيه `en` و `ar`، كل واحد فيه كل مفاتيح الترجمة.
- `useTranslate()` = hook بيرجّع الكائن المناسب حسب اللغة الحالية.
- كل شاشة بتضيف مفاتيحها بـ prefix خاص (مثلاً `ct_title` لـ CashTypes).

### 3.6 التحقق من البيانات (`Validation.ts`)
**المسار:** `Frontend/App/app/ClientApp/Shared/Validation.ts`

**أنواع التحقق المدعومة:**
`required` · `compare` · `range` · `regex` · `unique` · `exists` · `notExists` · `noDuplicate` · `minRows` · `custom`

**الدوال الأساسية:**
- `RunValidations(rules, master, details, opt)` — بتشيك كل القواعد بالترتيب.
- `ValidateRow(rules, row, opt)` — نسخة مختصرة للماستر بس.
- `checkRule(rule, ctx, opt)` — بتنفذ قاعدة واحدة.
- `FillPlaceholders(text, row, master, forSql)` — بتستبدل `{FieldName}` بالقيم.
- `SqlLiteral(v)` — بتحول القيمة لصيغة SQL آمنة.

**ملاحظة:** التحقق بيدعم الاستعلام من جدول خارجي (exists/notExists/unique) عبر `firstRow()`.

---

## 4. المكونات المشتركة

### 4.1 `DynamicGrid`
**المسار:** `Frontend/App/app/ClientApp/Shared/Components/Import/DynamicGrid.tsx`

جدول ديناميكي متكامل بيدعم:
- **CRUD:** إدراج / تعديل / حذف عبر Modal.
- **البحث:** فوري + debounce + أعمدة بحث مخصصة.
- **الفلترة:** فلاتر متقدمة (`filterFields`, `defaultFilters`).
- **الترتيب:** على أي عمود.
- **التصدير:** Excel.
- **Responsive:** عرض مختلف للموبايل.
- **Virtual Scroll:** اختياري.
- **G_ProcessTrans:** بيشتغل بعد الحفظ لو `runProcessTrans = true`.
- **الإجراءات الإضافية:** `extraActions` · `onPrint` · `onEmail` · `onArchive` · etc.
- **`beforeSave`:** تحقق إضافي قبل الحفظ.

**الأعمدة لازم تبقى جوه `useMemo`.**

### 4.2 `MasterDetail`
**المسار:** `Frontend/App/app/ClientApp/Shared/Components/Import/MasterDetail.tsx`

مكوّن ماستر-ديتيل متكامل:
- **الأوضاع:** قائمة (`list`) / فورم (`form`).
- **الإجراءات:** عرض (قراءة بس) / إضافة / تعديل / حذف / طباعة.
- لحد **5 تفاصيل** (Detail_1..Detail_5).
- **الحسابات التلقائية:** `recalc()` + `applyFormulas()` — المجاميع والمعادلات.
- **`enableView`** و **`enablePrint`** (الافتراضي true).
- **`onPrint(row)`** — لو مش متحددة بتظهر رسالة "الطباعة هتبقى متاحة قريب".

### 4.3 نماذج البيانات
- `ModelGrid.ts` — `DynamicGridColumn` + `DynamicGridProps`
- `ModelMasterDetail.ts` — `MasterDetailConfig` + `MasterDetailColumn`
- `Entities.ts` — `InsertMasterDetailRequest` + `UpdateMasterDetailRequest` + `DeleteMasterDetailRequest`
- `Entities_DataBase.ts` — كلاسات الجداول (D_A_CashTypes, D_A_FinancialType, I_TR_Sales, etc.)

---

## 5. الشاشات الموجودة

### 5.1 شاشات الجريد

| الشاشة | الجدول | المفتاح | المميزات |
|---|---|---|---|
| **CashTypes** | `D_A_CashTypes` | `CashTypeID` | `G_ProcessTrans` بـ TrType="CashBox" · فلتر CompCode |
| **FinancialType** | `D_A_FinancialType` | `FinancialTypeID` | قائمة select (قبض/صرف) · `G_ProcessTrans` · فلتر CompCode |
| **TestPage** | — | — | شاشة تجريبية لإظهار إمكانيات الإطار |

### 5.2 شاشة ماستر ديتيل

| الشاشة | الماستر | التفاصيل | القائمة |
|---|---|---|---|
| **SalesInvoice** | `I_TR_Sales` (SaleID) | `I_TR_SaleDetails` (FK: SaleID) | `IQ_TR_Sales` / `IQ_TR_SaleDetails` |

**حقول SalesInvoice الماستر:**
`SaleID` (تلقائي) · `TrNo` (قراءة) · `TrDate` · `SaleDate` · `CustomerName` · `PaymentType` (نقدي/آجل) · `Remarks` · `TotalAmount` (مجموع) · `DiscountAmount` · `VatAmount` · `NetAmount` (محسوب، `IsSave: false`)

### 5.3 البحث المشترك (`G_SearchFrom.ts`)
دوال بحث جاهزة بتتنادى من `searchModal`:
- `CashTypes(condition)` — بحث في `D_A_CashTypes`
- `FinancialType(condition)` — بحث في `D_A_FinancialType`

---

## 6. أداة التوليد (`CreatePageReact`)

### 6.1 الهيكل
**المسار:** `Tools/CreatePageReact/UpdateNewModel/`

| الملف | الوظيفة |
|---|---|
| `Form4_GridPage.cs` | الشكل (UI) + التحميل + الحفظ + القراءة |
| `Form4_GridPage.Gen.cs` | التوليد + القوالب |
| `GridScreenSettings.cs` | إعدادات الشاشة (Version 3) |

### 6.2 آلية العمل
1. **التابات:** الإعداد / الحقول / القائمة (ماستر ديتيل بس) / التفاصيل / التحققات / المعاينة.
2. **نوع الشاشة:** `Grid` (جدول بسيط) أو `MasterDetail`.
3. **التوليد (`Generate()`):**
   - يجمع الإعدادات عبر `CollectSettings()`.
   - يقرأ الحقول عبر `ReadRows()` و `ReadFieldSettings()`.
   - يولّد: `.ts` (اللوجيك) + `.tsx` (الشكل) + Resources + Routes + SQL.
4. **الإعدادات المحفوظة:** آخر سطر في `.ts` → `// @CreatePageReact-Settings: {json}`
5. **فتح شاشة موجودة:** يقرأ الـ JSON من آخر سطر عبر `ReadSettingsBlock()` أو يحلل الكود عبر `ParseLegacyScreen()`.

### 6.3 إعدادات الحقل (`GridFieldSettings`)
```
Field · TitleAr · TitleEn · InGrid · InForm · Required · Search · InFilter
InputType (text/number/textarea/checkbox/date/select/search)
Options · SearchFn · SearchCond · FillFrom · Formula
Auto (CompCode/BranchCode/UserID/FinYear) · DefaultValue · Width · Order
```

### 6.4 قواعد مهمة
- الأعمدة المحسوبة (`IsComputed`) = قراءة بس ومابتتحفظش.
- الأعمدة من القالب بس (`NotInDb`) = مابتتحفظش.
- `Auto` = بيتملى من الجلسة ومش بيظهر في الفورم.
- ملفات C# لازم CRLF.

---

## 7. خريطة الاعتماديات الأساسية

```
page.tsx ──imports──► <Screen>.ts ──imports──► useSys (SystemUsing.ts)
                                  ──imports──► SQL (CallDataBase.ts)
                                  ──imports──► useTranslate (Resources.ts)
                                  ──imports──► DynamicGrid | MasterDetail
                                  ──imports──► Validation.ts
                                  ──imports──► G_SearchFrom.ts

CallDataBase.ts ──calls──► Sys.CallApiEncrypted (SystemTools.ts)
                ──calls──► ManageDataSQL controller (Backend)

ManageDataSQLController ──uses──► SQLServer service
                        ──filter──► AutoDecryptFilter

MasterDetail.tsx ──uses──► DynamicGrid (للقائمة)
                 ──uses──► recalc() + applyFormulas()
                 ──imports──► ModelMasterDetail.ts ──imports──► ModelGrid.ts
```

---

## 8. مشاكل معروفة

| المشكلة | الحالة |
|---|---|
| `BuildWhereUltraFast` بيعمل replace لـ `"= 1"` فبيبوّظ `"= 15"` | لسه ماتصلحتش |
| الطباعة الفعلية لشاشات الماستر ديتيل (`onPrint`) | مستنية |

---

## 9. الصلاحيات

- **المصدر:** `IQ_Sys_RoleModule` (UNION بين `Sys_RoleModule` و `Sys_UserModule`).
- **الأولوية:** قيم الدور/المستخدم تغلب على قيم الموديول.
- **الشروط:**
  - EXECUTE: بس لو `Sys_Modules.AVAILABLE = 1`.
  - CREATE/EDIT/DELETE/CUSTOM: بس لو السنة `Status = 0`.
  - PRINT/VIEW: لو `Status = 0` أو `1`.
- **الفرونت:** بياخد صف المستخدم الأول وإلا صف الدور (الأعلى `Prc_Preference`).
- **القائمة:** بتتبني من `IQ_Sys_RoleModule` و `MODULE_CODE` = اسم فولدر الشاشة.

---

## 10. ملخص الملفات الأساسية

| الملف | الدور | عدد الـ Nodes |
|---|---|---|
| `Backend/Controllers/GateWay/ManageDataSQLController.cs` | الكنترولر العام لكل عمليات البيانات | 3 |
| `Backend/Controllers/GateWay/Services/SQLServer.cs` | خدمة قاعدة البيانات (CRUD + Cache + Bulk) | كبير |
| `Backend/Controllers/AuthController.cs` | المصادقة وتسجيل الدخول | 1 |
| `Backend/Controllers/GateWay/Security/Filters.cs` | فلتر فك التشفير التلقائي | 3 |
| `Frontend/App/app/ClientApp/Shared/SystemUsing.ts` | الحالة العامة (zustand store) | 1 |
| `Frontend/App/app/ClientApp/Shared/CallDataBase.ts` | دوال نداء قاعدة البيانات | 3+ |
| `Frontend/App/app/ClientApp/Shared/SystemTools.ts` | أدوات النظام (API + تشفير + log) | 5+ |
| `Frontend/App/app/ClientApp/Shared/Resources.ts` | الترجمة (en/ar) | 2 |
| `Frontend/App/app/ClientApp/Shared/Validation.ts` | التحقق من البيانات | 8+ |
| `Frontend/App/app/ClientApp/Shared/Components/Import/DynamicGrid.tsx` | جدول ديناميكي | 3 |
| `Frontend/App/app/ClientApp/Shared/Components/Import/MasterDetail.tsx` | ماستر ديتيل | 2 |
| `Frontend/App/app/ClientApp/Routes.tsx` | الراوتنج | 1 |
| `Tools/CreatePageReact/UpdateNewModel/Form4_GridPage.cs` | أداة التوليد (UI) | كبير |
| `Tools/CreatePageReact/UpdateNewModel/Form4_GridPage.Gen.cs` | أداة التوليد (القوالب) | كبير |
| `Tools/CreatePageReact/UpdateNewModel/GridScreenSettings.cs` | إعدادات الشاشة | 3 |
