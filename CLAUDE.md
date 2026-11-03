# React_Fram — ملف تعريف المشروع (بيتقري تلقائي في Claude Code)

## طريقة الرد
- الرد بالعربي المصري البسيط، ومن غير الاعتماد على مصطلحات إنجليزي تقنية.

## المشروع
- إطار ERP بتاعي: `Backend` (ASP.NET Core 9 API) + `Frontend/App` (Next.js، static export) + قاعدة SQL Server اسمها `ESSA_React` (الاتصال في `Backend/appsettings.json`).
- `Database/` فيها سكربتات SQL لإضافة الشاشات والصلاحيات (زي `Add_CashTypes_Module.sql`).
- `Tools/CreatePageReact` أداة ديسكتوب (WinForms على .NET 4.6.1 ← C# 7.3 بس) بتولّد شاشات React.

## الباك إند
- كل العمليات بتعدي على `ManageDataSQLController` العام: Query / Insert / Update / Delete / bulk / InsertMasterDetail / UpdateMasterDetail / DeleteMasterDetail فوق `Services/SQLServer.cs`.
- الماستر ديتيل بيدعم لحد 5 تفاصيل (Detail_1..Detail_5).
- البيانات بتتشفر من الفرونت بمفتاح XOR (`Sys.CallApiEncrypted`) وبتتفك في `AutoDecryptFilter`.
- تسجيل الدخول: `api/auth/login` على جدول `Sys_Users`.
- الإجراء `G_ProcessTrans`: `@Ok = 1` نجاح و`0` فشل، بيستخدم `SAVE TRANSACTION` جوه ترانزاكشن الباك إند، وكل TrType ليه فرع خاص جوه الإجراء.
- **مشكلة معروفة لسه ماتصلحتش:** `BuildWhereUltraFast` بيعمل replace لـ `"= 1"` فبيبوّظ `"= 15"`.

## الفرونت إند
- كل شاشة فولدر في `app/ClientApp/<Name>/`:
  - `<Name>.ts` = كل اللوجيك (hook بيرجّع state و actions و elements) — نفس نمط شاشة Login.
  - `page.tsx` = الشكل بس.
- الحالة العامة: zustand store اسمه `useSys` في `SystemUsing.ts`.
- الترجمة: `Shared/Resources.ts` عن طريق `useTranslate`.
- نداءات القاعدة: `SQL` من `Shared/CallDataBase.ts`.
- الرسايل: `Sys.ShowMessage(en, ar, type)` والنوع: success / error / warning / info.
- `Routes.tsx` فيه الـ layout لكل مسار. القايمة بتتبني من `IQ_Sys_RoleModule` و `MODULE_CODE` = اسم فولدر الشاشة.

### المكونات المشتركة (`Shared/Components/Import/`)
- `DynamicGrid`: شاشات الجريد العادية. الأعمدة لازم تبقى جوه `useMemo`. خصائص مهمة: `extraActions`, `onRowDoubleClick`, `beforeSave`.
- `MasterDetail.tsx` + أنواعه في `ModelMasterDetail.ts`:
  - قايمة الإجراءات: عرض (قراءة بس) / تعديل / طباعة / حذف.
  - `enableView` و `enablePrint` (الافتراضي true)، و `onPrint(row)` — لو مش متحددة بتظهر رسالة "الطباعة هتبقى متاحة قريب".
- `Validation.ts`: `RunValidations` و `ValidateRow`، وبيدعم شرط على جدول خارجي.

## الصلاحيات
- `IQ_Sys_RoleModule` = صفوف `Sys_RoleModule` (UserID 0) UNION صفوف `Sys_UserModule` (RoleId 0) لكل مستخدم/شركة/فرع، JOIN `Sys_Modules` و `Sys_RoleUsers` الفعالة، LEFT JOIN `Sys_ControlYear`.
- قيم الدور/المستخدم بتغلب على قيم الموديول (القايمة، الوصف، الأيقونة، الترتيب، IS_Show).
- EXECUTE بس لو `Sys_Modules.AVAILABLE = 1`.
- CREATE / EDIT / DELETE / CUSTOM بس لو السنة Status = 0. PRINT / VIEW لو Status 0 أو 1.
- الفرونت بياخد صف المستخدم الأول وإلا صف الدور، الأعلى `Prc_Preference`.

## أداة التوليد (Tools/CreatePageReact/UpdateNewModel)
- `Form4_GridPage.cs` = الشكل والقاعدة والفتح والحفظ. `Form4_GridPage.Gen.cs` = التوليد والقوالب. `GridScreenSettings.cs` = الإعدادات (نسخة v3).
- التابات: الإعداد / الحقول / القايمة / التفاصيل / التحققات / المعاينة.
- نوع الشاشة: جريد أو ماستر ديتيل (لحد 5 تفاصيل).
- كل شاشة متولدة آخرها سطر `// @CreatePageReact-Settings: {json}` عشان تتفتح تاني في الأداة.
- الأعمدة المحسوبة في القاعدة (IsComputed) بتتعمل قراءة بس ومابتتحفظش (بتتلوّن أصفر في الأداة).
- الأعمدة اللي في الـ View بس (NotInDb) مابتتحفظش.
- `G_ProcessTrans` بيتشغّل/يتقفل من الأداة.
- ملفات C# لازم تفضل بنهايات سطور CRLF.

## شاشات معمولة
- TestPage، CashTypes، FinancialType (جريد).
- SalesInvoice (ماستر ديتيل): الماستر بيتحفظ في `I_TR_Sales` والقايمة من `IQ_TR_Sales`، والتفاصيل بتتحفظ في `I_TR_SaleDetails` وبتتحمل من `IQ_TR_SaleDetails`. عمود `NetAmount` محسوب فـ `IsSave: false`.

## مستني
- الطباعة الفعلية لشاشات الماستر ديتيل (عن طريق `onPrint`).
- إصلاح `BuildWhereUltraFast`.



# React_Fram Project Instructions

## Mandatory Graphify Usage
Before starting ANY task in this project, you MUST use Graphify to:
1. Inspect the repository structure and relevant nodes.
2. Identify dependencies and relationships related to the requested task.
3. Determine which files and components may be affected.
4. Review relevant cross-version dependencies and potential regression risks.

Do not skip Graphify for small tasks. If Graphify is unavailable or returns insufficient information, report this and proceed using direct code inspection.

## Implementation
5. Make only the changes necessary to fulfill the requested task.
6. Preserve existing functionality and backward compatibility unless explicitly instructed otherwise.
7. Do not modify unrelated files without my approval.

## Validation
8. Run relevant tests and validation commands when available.
9. Report the files changed, checks performed, and remaining risks.
10. Never claim a test passed unless it was actually executed successfully.

## Safety
- Do not perform real-money trades or live trading actions.
- Ask for approval before destructive operations or changes outside the requested scope.
