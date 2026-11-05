# المرحلة 7 — التقارير والطباعة (Stimulsoft Reports.JS)

> الحالة: الكود جاهز ومتفحص بـ `tsc` و `dotnet build`، لكن **لسه ماتجربش في المتصفح** (مفيش تجربة بصرية اتعملت). اقرا آخر قسم "حدود ومخاطر" قبل ما تعتمد عليه.

## 1) الفكرة في سطرين
- كل تقرير = **إجراء مخزن (Stored Procedure)** في القاعدة. أعمدة نتيجة الإجراء بتبقى مصدر بيانات التقرير (`Data`) في المصمم.
- التصميم بتعمله بمصمم Stimulsoft داخل النظام (باندات، جروبات، شارتس، أشكال، صور، باركود/QR، مجاميع، أرقام صفحات، RTL عربي).
- كل طباعة فيها 3 اختيارات: **عرض داخل النظام** (فيه بحث جوه التقرير) · **PDF** · **Excel**.
- الطباعة بتحترم صلاحية **PRINT** (المرحلة 4) على شاشة التقرير.

## 2) تجهيز الإجراءات

### طباعة قائمة (مثلًا قائمة فواتير)
- الإجراء بياخد باراميترات تيجي من **فلاتر الشاشة** (أو الجلسة أو قيمة ثابتة).
- في ScreenBuilder ← تاب الطباعة/الإكسل ← "طباعة القايمة": اختار الإجراء، اضغط "حمّل الباراميترات"، واربط كل باراميتر بحقل فلتر من الشاشة.
  - لو الفلتر نوعه مدى تاريخ (dateRange) هتلاقي اختيارين: `الحقل.from` و `الحقل.to`.
- أي باراميتر ليه قيمة افتراضية في الإجراء وفلتره فاضي → القيمة الافتراضية هي اللي بتتطبق. فلتر فاضي من غير default → NULL ("الكل").

### طباعة مستند (مثلًا فاتورة)
- الإجراء بياخد بس: `@CompCode` و `@BranchCode` و `@TrID` (رقم المستند = عمود المفتاح للصف).
- الافتراضي في ScreenBuilder: CompCode ← الجلسة، BranchCode ← الجلسة، TrID ← عمود المفتاح.

### قواعد عامة للإجراء
- لازم يكون `SELECT` واحد أو أكتر (أول نتيجة = `Data`، التانية `Data2`... لحد 5).
- أسماء الأعمدة بحروف إنجليزي/أرقام/`_` أحسن (للتعبيرات في المصمم). الأعمدة العربي ممكن تتعب في التعبيرات.
- SQL Server لازم يقدر يوصف أعمدة النتيجة (`sys.dm_exec_describe_first_result_set_for_object`): ماينفعش جداول مؤقتة `#tmp` أو SQL ديناميكي في أول نتيجة. لو ماقدرش، المصمم هيقولك وتستخدم زر **"تشغيل عيّنة"** (بتكتب قيم الباراميترات بنفسك — بينفّذ الإجراء فعلًا بأول 200 صف بس).
- سقف الصفوف في التشغيل العادي 100,000 صف (بيطلع تحذير). المهلة 120 ثانية.

## 3) تعريف التقرير وتصميمه

### الطريقة الأولى: من ScreenBuilder
1. فعّل "طباعة القايمة" و/أو "طباعة مستند"، اختار الإجراء وربط الباراميترات.
2. اضغط **"إنشاء / تحديث التقرير"** (أو احفظ الشاشة من "حفظ وتسجيل": بيسجّل التقارير المفعّلة تلقائي).
   - الكود الافتراضي: `<الشاشة>_List` للقائمة و `<الشاشة>_Print` للمستند. تقدر تغيّره.
3. الشاشة المتولدة بتفتح العارض لوحدها (زر "طباعة القائمة" في الشريط + إجراء "طباعة" في الصف).

### الطريقة التانية: من شاشة "إدارة التقارير" (`Sys_ReportsAdmin`)
- أنشئ/عدّل تعريف (اسم عربي/إنجليزي، النوع، الشاشة صاحبة صلاحية PRINT، الإجراء، ربط الباراميترات: فلتر / جلسة / ثابت / TrID).
- زر **التصاميم**: قايمة تصاميم التقرير + **تصميم جديد** + **تصميم** (تعديل قديم في أي وقت) + **تكرار** (لنطاق تاني) + **افتراضي** + **حذف**.
- زر الطباعة التجريبية بيفتح التقرير (تقدر تعدّل الباراميترات من اللوحة الجانبية).
- الشاشة دي محتاجة تتسجل: شغّل `Database/Phase7_Reports.sql` (القسم D) أو سجّلها بـ `Sys_RegisterModule`. الوصول: دور أدمن (`Sys_Role.IsAdmin = 1`) أو EXECUTE+EDIT على `Sys_ReportsAdmin`.

### المصمم
- مصدر البيانات: `Data` (أعمدة الإجراء) و `Company` (بيانات الشركة والفرع واللوجو) و `Params` (الباراميترات المستخدمة).
- من غير تصميم محفوظ: التقرير بيتطبع بتصميم تلقائي (رأس: لوجو + اسم الشركة/الفرع + العنوان + التاريخ + الباراميترات، جدول بكل الأعمدة، تذييل برقم الصفحة، RTL). أول مرة تفتح "تصميم جديد" بيجيلك نفس التصميم التلقائي تعدّل عليه.
- حقول `Company`: `CompNameA/E`, `CompAddress`, `CompTel`, `CompFax`, `CompEmail`, `CompWebSite`, `BranchNameA/E`, `BranchAddress`, `BranchTel`, `VatNo`, `PrintedBy`, `PrintedAt`, `LogoBase64`.
- اللوجو: مفيش عمود لوجو في `Sys_Company`. حط ملف `comp_<رقم الشركة>.png` (أو jpg) في `Backend/App_Data/Reports/logos/` وهيظهر في `{Company.LogoBase64}`، أو حط صورة جوه التصميم نفسه (وده الأسهل لتصميم خاص بشركة).
- الحفظ بيحفظ كمان مقاس الورق والاتجاه والهوامش اللي في الصفحة.

## 4) النطاقات (Scopes)
| النطاق | بيطبق على |
|---|---|
| الكل (`all`) | أي شركة/فرع |
| شركة (`company`) | شركة واحدة (مثلًا بلوجو الشركة) |
| فرع (`branch`) | فرع واحد |

الأخص يكسب: **فرع ← شركة ← الكل**. جوه النطاق الواحد بيتاخد التصميم "الافتراضي" (وإلا الأحدث). لو مفيش ولا تصميم = التصميم التلقائي.

## 5) الورق
A4 · A5 · Letter · إيصال 80 مم · إيصال 58 مم (ارتفاع مفتوح) · مقاس مخصص (سم) — طولي/عرضي — هوامش (سم).
في العارض: زر المقاس والاتجاه بيغيّر المعاينة بس. للتثبيت: غيّره في المصمم واحفظ.

## 6) مفتاح الترخيص
- Stimulsoft مدفوع. من غير مفتاح بتشتغل Trial (علامة مائية على التقرير).
- حط المفتاح بإحدى الطريقتين:
  1. `Backend/appsettings.json`: `"Stimulsoft": { "LicenseKey": "..." }` (بيتقري من `api/Reports/config`)،
  2. أو متغير بيئة الفرونت وقت البناء: `NEXT_PUBLIC_STIMULSOFT_KEY`.
- الحزمة: `stimulsoft-reports-js@2026.4.2` (بتتحمل بـ `import()` عند فتح تقرير بس).
- الخط العربي: Cairo (رخصة OFL) في `Frontend/App/public/fonts/Cairo/Cairo.ttf` (+ `OFL.txt`).

## 7) الصلاحيات
- تشغيل تقرير: PRINT على `MODULE_CODE` بتاع التقرير (للشركة/الفرع الحاليين). التقرير من غير شاشة = أي مستخدم داخل.
- لو الشاشة ماستخدمتش الصلاحيات (`usePermissions` مقفول في ScreenBuilder) بيتسجل التقرير من غير شاشة.
- تصميم/تعريف/حذف: أدمن فقط. "تشغيل عيّنة" أدمن فقط.
- الباراميترات الثابتة و `CompCode/BranchCode/UserID` السيرفر هو اللي بيفرضها (الكلاينت مايقدرش يغيّرها). كل الاستعلامات بباراميترات SQL، وأسماء الإجراءات بتتفحص من `sys.procedures`.

## 8) مثال كامل: SalesInvoice

**اللي لازم تعمله في القاعدة (أنت — الكود ده ماتنفّذش):**

```sql
-- (1) طباعة القائمة: فواتير بين تاريخين (وعميل اختياري)
CREATE OR ALTER PROCEDURE dbo.Rpt_SalesInvoice_List
    @CompCode     INT,
    @BranchCode   INT,
    @FromDate     DATE = NULL,
    @ToDate       DATE = NULL,
    @CustomerName NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SaleID, TrNo, SaleDate, CustomerName, Mobile, ItemsTotal, Discount, VatAmount, NetAmount, PaymentAmount, RemainAmount, Remarks
    FROM dbo.IQ_TR_Sales
    WHERE CompCode = @CompCode AND BranchCode = @BranchCode
      AND (@FromDate IS NULL OR SaleDate >= @FromDate)
      AND (@ToDate   IS NULL OR SaleDate <  DATEADD(DAY, 1, @ToDate))
      AND (@CustomerName IS NULL OR CustomerName LIKE N'%' + @CustomerName + N'%')
    ORDER BY SaleDate, TrNo;
END
GO

-- (2) طباعة فاتورة: CompCode, BranchCode, TrID (= SaleID) فقط
CREATE OR ALTER PROCEDURE dbo.Rpt_SalesInvoice_Print
    @CompCode   INT,
    @BranchCode INT,
    @TrID       INT
AS
BEGIN
    SET NOCOUNT ON;
    -- نتيجة واحدة (Data): سطر لكل صنف + بيانات الفاتورة مكررة في كل سطر (أسهل في التصميم)
    SELECT  h.SaleID, h.TrNo, h.SaleDate, h.CustomerName, h.Mobile, h.Remarks,
            h.ItemsTotal, h.Discount, h.VatAmount, h.NetAmount, h.PaymentAmount, h.RemainAmount, h.QRCode,
            d.Ser, d.ItemCode, d.ItemName, d.Quantity, d.UnitPrice, d.DiscountAmount, d.VatAmount AS LineVat, d.ItemTotal, d.NetAfterVat
    FROM dbo.IQ_TR_Sales h
    JOIN dbo.IQ_TR_SaleDetails d ON d.SaleID = h.SaleID
    WHERE h.SaleID = @TrID AND h.CompCode = @CompCode AND h.BranchCode = @BranchCode
    ORDER BY d.Ser;
END
GO
```

**الخطوات:**
1. شغّل `Database/Phase7_Reports.sql` (اختياري) و أعد تشغيل الباك إند عشان `api/Reports/*` تشتغل.
2. ScreenBuilder ← SalesInvoice ← تاب الطباعة:
   - طباعة القايمة: الإجراء `Rpt_SalesInvoice_List`؛ `CompCode`/`BranchCode` ← الجلسة؛ `FromDate` ← `SaleDate.from`؛ `ToDate` ← `SaleDate.to`؛ `CustomerName` ← فلتر اسم العميل. (محتاج الشاشة تكون فيها فلاتر بالأسماء دي.)
   - طباعة مستند: الإجراء `Rpt_SalesInvoice_Print`؛ الباراميترات الافتراضية (CompCode/BranchCode من الجلسة و `TrID` ← `SaleID`).
   - اضغط "إنشاء / تحديث التقرير" على الاتنين ← احفظ الشاشة.
3. من "إدارة التقارير": `SalesInvoice_Print` ← التصاميم ← تصميم جديد، وعدّل الرأس/الأصناف/المجاميع (Data.NetAmount إلخ) واحفظ. جرّب "تشغيل عيّنة" بـ `TrID` فاتورة حقيقية.
4. في شاشة SalesInvoice: إجراء "طباعة" في الصف وزر الطباعة في الفورم هيفتحوا الفاتورة؛ "طباعة القائمة" في الشريط (لو الشاشة جريد).

## 9) الاستخدام في شاشة مكتوبة بإيدك (مش من ScreenBuilder)
```tsx
// DynamicGrid
<DynamicGrid ... moduleCode="MyScreen" report={{ list: { reportCode: "My_List" }, transaction: { reportCode: "My_Print" } }} />
// MasterDetail (داخل config)
report: { list: { reportCode: "SalesInvoice_List" }, transaction: { reportCode: "SalesInvoice_Print" } }
// أو من أي كود
import { openReport } from "../Shared/Reports/openReport";
openReport({ reportCode: "X", filters: { SaleDate: { from: "2026-01-01", to: "2026-01-31" } } });   // قائمة
openReport({ reportCode: "Y", row, trId: row.SaleID });                                              // مستند
```
- `report` مش متحدد = مفيش أي تغيير في السلوك القديم. `onPrint`/`enablePrint` الموجودين بيفضلوا ليهم الأولوية.

## 10) التخزين
- افتراضي: ملفات تحت `Backend/App_Data/Reports/` (`definitions.json`, `layouts.json`, `layouts/<id>.mrt`) بكتابة ذرية (ملف مؤقت ثم استبدال).
- بعد تشغيل `Phase7_Reports.sql`: الباك بيستخدم الجداول `Sys_Reports` / `Sys_ReportParams` / `Sys_ReportLayouts` تلقائي (بيفحص كل 30 ثانية). الملفات القديمة مش بتتنقل لوحدها.

## 11) endpoints (`api/Reports/*` — POST — JWT أو X-Admin-Token)
`config` · `list-reports` · `get-report` · `save-report` · `delete-report` · `list-layouts` · `get-layout` · `save-layout` · `delete-layout` · `set-default-layout` · `duplicate-layout` · `resolve-layout` · `procs` · `proc-params` · `lookups` · `run`.

## 12) حدود ومخاطر
- **ماتجربش في المتصفح**: بناء التصميم التلقائي ومصمم/عارض Stimulsoft مكتوبين على الـ API الموثق ونوع الملفات (`d.ts`) لكن بدون تشغيل فعلي. أول تجربة ممكن تطلّع تعديلات بسيطة (مثلًا اسم مصدر البيانات أو أحد خصائص الشكل). الخطوات الشكلية في التصميم التلقائي جوه try/catch.
- Trial: علامة مائية لحد وضع المفتاح.
- واجهة المصمم/العارض بالإنجليزي (مفيش ملف ترجمة عربي للمكتبة)؛ **محتوى** التقرير عربي RTL.
- الخط Cairo متغير (Variable) — الـ Bold ممكن يطلع محاكى في PDF.
- أنواع التواريخ بتتحول من نص ISO بقراءة Stimulsoft؛ لو ظهر التاريخ كنص استخدم دالة تنسيق في التعبير.
- أول فتح لتقرير بيحمّل مكتبة كبيرة (عشرات الـ MB غير مضغوطة) — بيتأخر ثواني.
- طباعة من المتصفح (زر Print في العارض) بتطبع الصفحات كصور/PDF حسب إعدادات Stimulsoft.
- الباك إند لازم يتعمله إعادة تشغيل عشان `api/Reports/*` تتفعّل (الكود اتبنى بس).
