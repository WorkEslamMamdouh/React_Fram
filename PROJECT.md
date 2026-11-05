# React_Fram — الملف المرجعي للمشروع كله

> آخر تحديث: 2026-11-04 · المصدر: Graphify (commit `6684713`) + قراءة الكود + قراءة القاعدة `ESSA_React` (قراءة بس).
> الملف ده بيوصف **الوضع الحالي**. الخطة الجاية في `PROJECT_MASTER_PLAN.md`، والتصميم في `DESIGN.md` (هيتعمل في المرحلة 1).

---

## 1. الأجزاء

| الجزء | التقنية | المكان |
|---|---|---|
| الباك إند | ASP.NET Core 9 | `Backend/` |
| الفرونت | Next.js 16 (static export) + React 19 + Tailwind 3 + antd 6 + zustand 5 + apexcharts | `Frontend/App/` |
| القاعدة | SQL Server — `ESSA_React` (62 جدول/فيو) | الاتصال في `Backend/appsettings.json` |
| أداة الديسكتوب | WinForms .NET 4.6.1 (C# 7.3) | `Tools/CreatePageReact/` |
| سكربتات الشاشات | SQL | `Database/` |

ملحوظة: `git` مش موجود في الـ PATH على الجهاز ده.

---

## 2. الباك إند

### الكنترولرز
| الكنترولر | المسار | الشغل |
|---|---|---|
| `GateWay/ManageDataSQLController` | `api/ManageDataSQL/*` | Query, GetDataFromSql, Insert, insert-list, Update, UpdateList, Delete, bulk-insert, BulkUpdate, InsertMasterDetail, UpdateMasterDetail, DeleteMasterDetail |
| `AuthController` | `api/auth/login` | دخول على `Sys_Users` |
| `AdminAuthController` | `api/admin/login` | دخول الأدمن (من `appsettings`) |
| `ScreenBuilderController` | `api/ScreenBuilder/*` | connect, tables, columns, resources, search-functions, execute-sql, save-files, scan-screens |
| `SharedController` | `api/Shared/PushNotification` | إشعارات Firebase |

### `Services/SQLServer.cs`
- `QueryBuilder` فيه `Paginate()` بـ `OFFSET/FETCH`.
- `Get_DataFromSql(TableModel)` بيدعم `IsPage / PageNumber / PageSize / ReturnTotalCount / SearchValue / SearchInColumns / OrderBy` → **التقسيم لصفحات موجود في السيرفر**.
- `ExecuteStoredProcedure(TableModel)` → تشغيل أي إجراء بباراميترات (هنستخدمه في التقارير).
- `BulkInsertUltraFast` / `BulkUpdateUltraFast` (SqlBulkCopy) → هنستخدمهم في رفع الإكسل.
- `ExecuteTransaction`, `RunProcessTrans` (`G_ProcessTrans`: `@Ok=1` نجاح).
- كاش Redis اختياري (`ExecuteQueryWithCache`).

### الأمان
- الفرونت بيشفّر بـ XOR (`Sys.CallApiEncrypted`) والباك بيفك في `AutoDecryptFilter`.
- JWT متعرّف في `appsettings`.

---

## 3. الفرونت

### المسارات والـ Layouts (`app/ClientApp/Routes.tsx`)
- `NotLayout`: الصفحة الرئيسية، Website، AdminLogin.
- `LoginLayout`: Login، Register، LoginCompany.
- `AdminLayout`: Admin، ScreenBuilder.
- `HomeLayout` (Navbar + SideMenu): كل شاشات البرنامج.
- **أي شاشة جديدة لازم تتضاف في `routes` يدوي** (هنخليها تلقائي).

### نمط الشاشة
`app/ClientApp/<Name>/<Name>.ts` (اللوجيك hook) + `page.tsx` (الشكل بس). آخر الملف فيه `// @CreatePageReact-Settings: {json}` أو `@ScreenBuilder-Settings`.

### الملفات المشتركة (`Shared/`)
| الملف | الشغل |
|---|---|
| `SystemUsing.ts` | zustand `useSys`: Session, lang, IsDark, loader |
| `SystemTools.ts` | `Sys.ShowMessage`, `Sys.CallApiEncrypted` ... |
| `CallDataBase.ts` / `_New` | `SQL` (نداءات القاعدة) |
| `Entities.ts` | `TableModel`, `SysSession`, `MenuItemType` |
| `Entities_DataBase.ts` | كلاسات الجداول (`IQ_Sys_RoleModule` ...) |
| `App.ts` | `OpenPage`, `InitalizeSystemSession`, `Set_SettingsUserProfile` |
| `Resources.ts` | الترجمة (`useTranslate`) |
| `Validation.ts` | `RunValidations`, `ValidateRow` |
| `dateUtils.ts` | دوال التاريخ |
| `G_SearchFrom.ts`, `G_DynamicSelect.ts` | البحث والدروب داون العام |

### المكونات (`Shared/Components/Import/`)
| المكون | الحجم | الملاحظات |
|---|---|---|
| `DynamicGrid.tsx` | 86KB | جريد كامل: إضافة/تعديل/حذف/بحث/ترتيب/تصدير، `pageSize`, `virtualScroll`, `gridFilter`, `deferLoadUntilFilter`, `extraActions`, `beforeSave` |
| `DynamicGridFilter.tsx` | فلتر ظاهر فوق الجريد (text/number/date/dateRange/select/boolean/search) |
| `AdvancedFilter.tsx` | الفلتر المتقدم (اختار الحقل ← اختار القيمة) — **ده اللي اليوزر شايفه خطوات كتير** |
| `MasterDetail.tsx` + `ModelMasterDetail.ts` | ماستر + لحد 5 تفاصيل، عرض/تعديل/طباعة/حذف، `onPrint` |
| `TreeScreen.tsx`, `TreeView.tsx` | شاشات الشجرة |
| `SearchModal.tsx`, `DynamicSelect.tsx`, `SmartDropdown.tsx` | البحث والاختيار |
| `GridPro/` | نسخ قديمة (`DynamicGridOldOld.tsx`) — مش مستخدمة |

### القايمة (`Layouts/HomeLayout/SideMenu/SideMenu.ts`)
- بتتبني من `Session.CurrentPrivileges` (صفوف `IQ_Sys_RoleModule`) بشرط `IS_Show = 1` و `EXECUTE = true`.
- `MODULE_TYPE = 'M'` = قايمة، غير كده = شاشة. الأب = `MODULE_MENU`. الترتيب = `MODULE_SORT`. اللون = `Icon_Color`.
- ترتيب خاص لكل يوزر (`Sys_UserMenu`) ومفضلة (`Sys_Favorites`) — المرحلة 3، المنطق في `Shared/MenuPrefs.ts`.

### ScreenBuilder الحالي (`ClientApp/ScreenBuilder/`)
- `types/ScreenConfig.ts` (v4)، `store/useScreenBuilder.ts` (undo/redo 50 خطوة)، `utils/codeGenerator.ts`، `utils/configConverter.ts` (v3↔v4).
- مكونات: Toolbar, ComponentPanel, LiveCanvas, PropertiesPanel, BottomPanel, SetupWizard, SetupTab, FieldsTab, DetailsTab, ValidationsTab, PreviewTab, SearchManagerModal, ConnectionPanel, WelcomeScreen, HelpPanel, ExamplesModal.
- بيحفظ الملفات عن طريق `api/ScreenBuilder/save-files`.
- **ناقص:** سحب وإفلات حقيقي على مكان، تخطيط حر للفورم، ربط دروب داون بجدول + شرط + استخدامه في البحث، طباعة/تقارير/إكسل، تسجيل الشاشة في القايمة والصلاحيات تلقائي، ومتجربش في المتصفح.

---

## 4. القاعدة

### جداول النظام
`Sys_Company`, `Sys_Branch`, `Sys_ControlYear`, `Sys_Users`, `Sys_Role`, `Sys_RoleUsers` (UserID, RoleId, CompCode, BranchCode, ISActive), `Sys_Modules`, `Sys_RoleModule`, `Sys_UserModule`, `Sys_Favorites` (FavoriteId, UserId, MODULE_CODE, PageName, PageUrl, Icon, CreatedAt, CompCode, BranchCode), `Sys_SettingsUserProfile`, `Sys_Log_User`, `Sys_Messages`, `Sys_Device`, `Sys_N_*` (إشعارات), `G_TransCounter`, `G_TransCounterSetting`, `G_Tr_Archive`, `G_D_Codes`, `G_D_Employees`.

### الفيوهات
`IQ_Sys_RoleModule`, `IQ_Sys_Company`, `IQ_Sys_ControlYear`, `IQ_Sys_RoleUsersAllDataComp`, `IQ_Sys_RoleUsersBranch`, `IQ_Sys_RoleUsersComp`, `IQ_Sys_Users`, `IQ_Sys_N_MessageNotifications`.

### الفيو `IQ_Sys_RoleModule` (اتقرا من القاعدة)
```
RolMod = Sys_RoleModule (UserID=0, CompCode=0, BranchCode=0)
         UNION ALL
         Sys_UserModule (RoleId=0)
INNER JOIN Sys_Modules Modu        ON MODULE_CODE
INNER JOIN (Sys_RoleUsers ISActive=1 GROUP BY CompCode, RoleId) RoleComp ON RoleId
LEFT  JOIN Sys_ControlYear GCont   ON CompCode
```
- قيمة الدور/اليوزر تغلب على قيمة الموديول (MENU, DESC, Url_Image, Icon_Color, TYPE, SORT, IS_Show).
- `EXECUTE` = قيمة الدور بس لو `Modu.AVAILABLE = 1`.
- `CREATE/EDIT/DELETE/CUSTOM1..9/IsArchive` = لو السنة `Status = 0` وصلاحية الموديول مفتوحة ← قيمة الدور، غير كده false.
- `PRINT/VIEW` = نفس الفكرة بس السنة `Status IN (0,1)`.
- **ملحوظة مهمة:** صفوف `Sys_UserModule` ليها `RoleId = 0` فبتعدي من الـ JOIN مع `RoleComp` بس لو فيه صف في `Sys_RoleUsers` بـ `RoleId = 0`. لازم نتأكد من ده في مرحلة الصلاحيات.
- الفرونت بياخد صف اليوزر الأول وإلا صف الدور، الأعلى `Prc_Preference`.

### الإجراءات المخزنة المهمة
`G_ProcessTrans`, `G_TOL_GetCounter`, `IProc_Z_A_*` (كشوف حساب، ميزان، ميزانية)، `Z_A_Create_Open_Journal`، `Z_G_GenerateJournal*`.

---

## 5. شاشات موجودة
TestPage، CashTypes، CashTypesDemo، FinancialType، Employees، FinTrans_Expenses، Cost_Center، CostCenterTree (جريد/شجرة) — SalesInvoice، SalesApproval (ماستر ديتيل) — Dashboard، Home.

## 6. اللي اتعمل في المراحل (سجل)

### المرحلة 1 — التصميم (2026-11-04) ✅
- متغيرات `--erp-*` (فاتح/غامق) في `globals.css` + ألوان `erp-*` في `tailwind.config.js` + `.num` للأرقام. التفاصيل في `DESIGN.md`.
- خطوط Cairo + Inter في `app/layout.tsx`. `MainLayout.tsx` بيحط `dir/lang` على `<html>`.
- `HomeLayout` جديد: شريط علوي 64px، قايمة 260px ↔ 72px، درج جانبي تحت 1024px، شريط تنقل تحت على الموبايل.
- إعادة تلوين DynamicGrid / MasterDetail / SearchModal / Tree / ShowMessage / DialogModal / Login / LoginCompany.
- نسخة قبل التعديل: `Design/_backup_phase1/`.

### المرحلة 2 — السرعة والفلتر (2026-11-04) ✅
- `DynamicGrid`: صفحات من السيرفر + تحميل مستمر (`pagingMode` = `infinite` افتراضي | `pages`)، 25/50/100، "عرض X من Y"، حماية من النتايج القديمة، رسم الصفوف الظاهرة بس فوق 300 صف، التصدير بيحترم الفلتر.
  - خصائص جديدة اختيارية: `pagingMode`, `pageSizeOptions`, `enablePageSizeSelector`, `filterStorageKey`, `persistFilters`, `filterMode` (`bar` | `advanced`).
- `DynamicGridFilter` اتكتب من جديد: ظاهر دايمًا، فوري، مسح الكل، عداد، chips (`gridFilter.chips`)، "فلاتر أكتر" بعد 8 حقول (`maxVisibleFields`)، بيفتكر آخر فلتر (`erp.gf.v1:{user}:{comp}:{key}`)، شيت على الموبايل.
- `DynamicSelect` → `SearchableSelect` (جديد) لو الجدول أكتر من 100 صف: بحث من السيرفر وتحميل مستمر.
- `useInfiniteSentinel.ts` (جديد).
- الباك: `SQLServer.cs` بيرجّع العدد الإجمالي مع الأعمدة المختارة + مفتاح الكاش.
- `tsconfig.json` بيستثني `_Backup_Screens` ← `tsc` = 0 أخطاء.
- فهارس مقترحة (متشغلتش): `Database/Phase2_Suggested_Indexes.sql`.
- نسخة قبل التعديل: `Design/_backup_phase2/`.
- `BuildWhereUltraFast` اتأكدنا إنه متصلح فعلًا.

### المرحلة 3 — القايمة والمفضلة (2026-11-05) ✅
- جدول جديد `Sys_UserMenu` (ترتيب/إخفاء لكل يوزر+شركة) + عمود `Sys_Favorites.SortOrder`. السكربت: `Database/Phase3_UserMenu_Favorites.sql` (اتشغّل).
- `Shared/MenuPrefs.ts` (بناء الشجرة من الصلاحيات + الترتيب + المفضلة + آخر الشاشات)، `SideMenu/useDragSort.ts` (سحب بالماوس/اللمس/الكيبورد).
- وضع "ترتيب القايمة"، نجمة المفضلة، قسم المفضلة فوق، زرار المفضلة في الـ Navbar، Ctrl+K (مفضلة + آخر 8 شاشات)، البحث بيتجاهل الهمزات.
- لو الجداول مش موجودة القايمة بتشتغل عادي.

### المرحلة 4 — المستخدمين والصلاحيات (2026-11-05) ✅
- السكربت `Database/Phase4_Permissions.sql` (اتشغّل A–D، القسم E للفيو متعطل):
  - `Sys_Role.IsAdmin` (الأدوار 1 و 2 أدمن).
  - مفتاح `Sys_UserModule` بقى (UserID, CompCode, BranchCode, MODULE_CODE).
  - الإجراء `Sys_RegisterModule` لتسجيل أي شاشة جديدة وإعطاء الأدمن كل الصلاحيات.
  - مجموعة `Menu_Admin` + الشاشات `Sys_UsersAdmin`, `Sys_RolesAdmin`, `Sys_UserPermsAdmin`.
- الباك: `AdminUsersController` (`api/AdminUsers/*`، JWT + صلاحية EXECUTE، باراميترات، ترانزاكشن).
- `AuthController`: اليوزر الموقوف (`USER_ACTIVE`) مابيدخلش.
- `Shared/Permissions.ts` (`usePermissions`)، و`DynamicGrid`/`MasterDetail` بياخدوا `moduleCode` / `permissions` اختياري.
- `Routes.tsx`: أي شاشة مش متسجلة بتاخد `HomeLayout` تلقائي.
- نسخ احتياطي للقاعدة قبل التشغيل: جداول `BK_20261105_*`. بيانات اختبار: `qa_test_user` (موقوف) و "QA Test Role" — `Database/QA_TestData.md`.

### المرحلة 5 — ScreenBuilder بدون كود (2026-11-05) ✅
- التصميم في `PHASE5_SCREENBUILDER_DESIGN.md`. كونفج v5 (layout + filterArea + actions + print + excel) والتحويل من v3/v4.
- مصمم بالسحب والإفلات (`ScreenBuilder/components/designer/*`)، codegen بيولّد `formLayout` / فلاتر من جدول / أزرار إجراءات / الطباعة / الإكسل.
- الباك: `ScreenBuilderController` اتأمّن بـ `X-Admin-Token` (بيتسجل في الذاكرة — بعد أي ريستارت للباك لازم دخول أدمن تاني) + endpoints جديدة.
- خصائص اختيارية: `formLayout`، `operator` في الفلتر، `{row.X}` في دروب داون الجريد. ملفات `FormLayout.tsx` و`Shared/RunProc.ts`.
- الحفظ بياخد نسخة احتياطية في `Frontend/App/_Backup_Screens/<Name>_<وقت>/` وبيسجل الشاشة بـ `Sys_RegisterModule`.
- شاشة تجربة: `DemoCash` (على `D_A_CashTypes`، تحت `Menu_Admin`).
- `Database/Phase5_ScreenBuilder.sql` اتشغّل (2026-11-06): جدول `Sys_ScreenConfig`.

### المرحلة 6 — قوالب Excel للحركات (2026-11-05) ✅
- الشرح والوصفات في `PHASE6_EXCEL.md`. مكتبة `exceljs@4.4.0` (بتتحمل وقت الضغط بس).
- `Shared/Components/Excel/*`: قالب (Data / Instructions / Lists مخفي، عناوين عربي/إنجليزي، قوايم اختيار من القاعدة، RTL)، استيراد بمعاينة (✓/✗، فلاتر، تصليح في الخانة، تنزيل الأخطاء Excel)، حفظ على دفعات بشريط تقدم.
- 3 أنواع: `grid` (صف = سجل) / `multiTransaction` (عمود GroupNo) / `detailsOnly` (أصناف على الفاتورة المفتوحة من غير حفظ).
- خصائص اختيارية: `excel` في `DynamicGrid` و`MasterDetailConfig`. متوصلة في `DemoCash` و`SalesInvoice` (أصناف).
- ScreenBuilder: قسم Excel في تاب الطباعة والإكسل (`ExcelBox.tsx`).

### المرحلة 7 — التقارير والطباعة (2026-11-05) ✅
- الشرح في `PHASE7_REPORTS.md`. مكتبة `stimulsoft-reports-js@2026.4.2` (بتتحمل وقت الطباعة بس؛ نسخة تجريبية بعلامة مائية لحد ما تحط المفتاح في `Stimulsoft:LicenseKey`). خط Cairo في `public/fonts/Cairo`.
- الباك: `Backend/Controllers/Reports/*` (`api/Reports/*`) — صلاحية PRINT، إجراءات بباراميترات، اختيار التصميم فرع ← شركة ← الكل.
- `Database/Phase7_Reports.sql` اتشغّل (2026-11-06): جداول `Sys_Reports` / `Sys_ReportParams` / `Sys_ReportLayouts` + شاشة `Sys_ReportsAdmin` في القايمة. الباك بقى يقرا من الجداول (الملفات القديمة في `App_Data/Reports` كانت بيانات اختبار ومتنقلتش).
- الفرونت: `Shared/Reports/*` (عارض بالبحث + PDF + Excel + مقاس الورق، مصمم تقارير، تصميم تلقائي لو مفيش تصميم)، شاشة `Sys_ReportsAdmin`.
- خاصية اختيارية `report` في `DynamicGrid` و`MasterDetailConfig`، وScreenBuilder بيعمل التقرير ويربط الباراميترات بالفلاتر.

### المرحلة 9 — APIs مجانية (2026-11-05) ✅
- الشرح في `PHASE9_PUBLIC_APIS.md`. 13 خدمة (عملات، إجازات، IBAN، إيميل، باركود، QR، عناوين، IP، طقس ...) كلها متقفلة افتراضي.
- الباك: `Backend/Controllers/ExternalApis/*` (`api/ExternalApis/*`) — عمليات محددة بس، مفاتيح متشفرة AES، كاش وحد استخدام.
- `Database/Phase9_ExternalApis.sql` اتشغّل (2026-11-06): جدول `Sys_ExternalApis` + الشاشة في القايمة. الإعدادات بقت في الجدول.
- الفهارس: `Phase2_Suggested_Indexes.sql` و`Phase6_Excel.sql` اتشغّلوا — 10 فهارس اتعملت (الباقي اتخطى لأن العمود مش موجود أو نوعه max). نسخة احتياطية قبلها: `BK_20261106_Sys_Modules` و`BK_20261106_Sys_RoleModule`.
- شاشة `Sys_ExternalApisAdmin` (تفعيل بتكة + تجربة الاتصال)، ومساعد `Shared/ExternalApis/ExternalApi.ts`.

## 7. مشاكل ونقط معروفة
- مافيش اختبارات آلية في المشروع؛ التأكد كله بـ `tsc` وتجربة يدوية.
- صفحة `Home` لسه قالب تجريبي بنصوص إنجليزي ثابتة، وفي شاشات عناوينها أسماء خام (`Cost_Center`, `Store`) وعناوين أعمدة Employees إنجليزي كابيتال.
- بعد أي ريستارت للباك لازم دخول أدمن تاني لـ ScreenBuilder (التوكن في الذاكرة).
- مفيش build إنتاج اتعمل (كان هيتعارض مع سيرفر التطوير) — يتعمل بعد ما توقف `npm run dev`.
- `appsettings.json` فيه باسورد القاعدة ومفتاح JWT بشكل مكشوف.
- **أمان الدخول:** `AuthController.Login` بيبني الـ SQL بلزق النص (SQL injection)، والباسورد متخزن نص عادي (`USER_Password` nvarchar(20)).
- `Sys_Users`: الكود `updated_user_1` متكرر (UserID 1, 4, 5).
- `Sys_Modules.CUSTOM9_DESC` فيه كلمة "False" في 16 شاشة.
- `Sys_RoleModule` لدور 2 فيه 7 أكواد `Menu_*` مش موجودة في `Sys_Modules`.
- شاشة SalesInvoice: عمود التفاصيل `Qty` بس الفيو `IQ_TR_SaleDetails` فيه `Quantity` — محتاج مراجعة.
- بيانات اختبار في `D_A_CashTypes`: `QA_TEST_1..3` (CashTypeID 42, 43, 44) — ممكن تتمسح.