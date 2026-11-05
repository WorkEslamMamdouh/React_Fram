# المرحلة 5 — ScreenBuilder بدون كود (تصميم الشاشات بالسحب والإفلات)

> الهدف: صاحب المشروع يبني أي شاشة من الألف للياء من شاشة المصمم، بالسحب والإفلات، وهو عارف بس يجهّز جداول/فيوهات/إجراءات في القاعدة.
> الأساس: اللي كان موجود (ScreenBuilder v4 + codegen) اتطوّر، مااتشالش منه حاجة. التابات القديمة (الإعداد/الحقول/القايمة/التفاصيل/التحققات/المعاينة) لسه شغالة.

## 1) الفكرة في سطرين
- الكونفج الجديد اسمه **v5** = كل حاجة في v4 + `layout` (الفورم) + `filterArea` (الفلاتر) + `actions` (أزرار تشغّل إجراء) + `print` + `excel`.
- الكود المتولد نفس النمط: `<Name>.ts` (اللوجيك) + `page.tsx` (الشكل) وآخره `// @ScreenBuilder-Settings: {json v5}` (وكمان `@CreatePageReact-Settings` v3 للتوافق).

## 2) شكل الكونفج v5 (`ScreenBuilder/types/ScreenConfig.ts`)
```ts
interface ScreenConfigV5 extends Omit<ScreenConfigV4,"version"> {
  version: 5;
  // --- من v4 (زي ما هي): module, table, view, keyColumn, titleAr/En, icon, iconColor, pageSize, orderBy/orderType,
  //     extraCondition (الشرط الافتراضي), processTrans + trType, permissions{insert,edit,delete,export,usePermissions,parentMenu,roles},
  //     fields[] (الأعمدة + نوع الإدخال + دروب داون + شروط), listFields[], details[] (لحد 5), validations[], tree
  menuSort: number;                 // 0 = تلقائي
  layout: { sections: { id,titleAr,titleEn, rows: { id, cells: CellV5[] }[] }[] };
  filterArea: FilterControlV5[];
  actions: ActionV5[];
  print: { listPrint: PrintProcConfigV5; transactionPrint: PrintProcConfigV5 };
  excel: { enabled; templateName; columns: string[]; keyLookups: {column,table,valueField,displayField}[] };
}
CellV5 = { id, kind, field?, textAr?, textEn?, span:{base,md,lg} }       // 12 عمود: موبايل/تابلت/كمبيوتر
FilterControlV5 = { id, field, kind, labelAr/En, operator?, required, defaultValue, options, source?: DropdownSourceV5, span }
DropdownSourceV5 = { table, valueField, displayField, displayFieldEn, condition, orderBy }
ActionV5 = { id, labelAr/En, icon, scope:'toolbar'|'row', proc, params: ParamMapV5[], confirm, after:'refresh'|'message'|'none', messageAr/En }
ParamMapV5 = { name, source:'const'|'session'|'filter'|'row', value }
PrintProcConfigV5 = { enabled, proc, params: ParamMapV5[], paper, orientation }
```
- **نوع الشاشة** (`screenType`): `Grid` | `MasterDetail` | `Tree`. نوع "فورم لسجل واحد" **لسه مش موجود** (مفيش مكوّن تشغيل ليه).
- الأعمدة (`fields[]`) هي مصدر الحقيقة للربط بالقاعدة. الـ `layout` بس بيقول مكان كل حقل. الحقل اللي مش في الـ layout بيبقى `inForm=false`.
- العمود المحسوب في القاعدة أو الموجود في الفيو بس = `noSave` (بيظهر قراءة فقط ومابيتحفظش، علامة 🔒) — نفس قواعد أداة الديسك توب.

## 3) التحويل من القديم
`normalizeConfig(any)` بيقبل v3 (الأداة الديسك توب) و v4 و v5:
- v3 → v4 (`convertV3toV4` موجودة) → v5: `filterArea` بتتولد من الحقول اللي `inFilter` (نفس سلوك v4)، و`layout` تلقائي (3 حقول في الصف، النص الطويل صف لوحده).
- v5 ناقص حاجة بيتكمّل بالافتراضي. الخلايا اللي حقولها اتمسحت بتتشال.
- شاشة من غير ماركر: `importFromTs` بتستورد الجدول والأعمدة وعناوينها بالـ regex (علامة `importedBestEffort` وتحذير واضح قبل الحفظ).

## 4) الـ Layout
أقسام ← صفوف ← خلايا. الخلية لها عرض من 12 عمود لكل مقاس. التحويل للتشغيل: `layoutToFormLayout()` بيسطّح التخطيط لقايمة خلايا `{kind, field, span, spanMd, newRow}` بتتبعت لخاصية جديدة اختيارية `formLayout` في `DynamicGrid` و`MasterDetail`.
لو `formLayout` مش متحددة الفورم زي ما كان بالظبط. الحقول اللي مش مذكورة في التخطيط بتتضاف في الآخر (مفيش حقل يختفي).

## 5) كتالوج العناصر
| العنصر | يتحفظ في | ملاحظات |
|---|---|---|
| نص / رقم / رقم عشري / تاريخ / اختيار / نص طويل | عمود | الرقم العشري = رقم (نفس المكوّن) |
| قائمة ثابتة | عمود | `value:label|value:label` |
| دروب داون من جدول | عمود | جدول/فيو + عمود القيمة + عمود العرض (ع/إنجليزي) + شرط + ترتيب |
| نافذة بحث | عمود | دالة من `G_SearchFrom` |
| نص ثابت / عنوان / فاصل | الـ layout بس | |
| زر | `actions[]` | بيشغّل Stored Procedure |
| ملف / صورة / تابات | — | **ظاهرين "قريبًا"** (مش متنفذين) |

خصائص كل عنصر: العمود المربوط (النوع بيتحدد منه)، العنوان ع/إنجليزي، إجباري، قراءة فقط، القيمة الافتراضية (ثابت أو جلسة: CompCode/BranchCode/UserID/UserName/FinYear/Today)، **يظهر لما** و**يتفعّل لما** (عمود + عملية + قيمة)، العرض لكل مقاس.

## 6) الربط بالبيانات والدروب داون المتسلسل
- الشرط النصي يدعم:
  - `{session.CompCode}` … بتتحوّل وقت التوليد لقيمة الجلسة.
  - `{row.X}` أو `{X}` = قيمة حقل تاني **في نفس الفورم** → دروب داون متسلسل (الفورم بيعيد التحميل لما القيمة تتغير). دعم `{row.X}` في الجريد اتضاف بشكل اختياري (كان في الماستر ديتيل بس).
  - `{filter.X}` (في فلاتر الجريد) = قيمة فلتر تاني → فلتر متسلسل. لو الفلتر الأب فاضي الشرط بيبقى `1 = 0`.
- زر "تحقق من الشرط" بيجرّب `SELECT TOP 1` على الجدول.

## 7) الفلاتر
- `filterArea` بتتحوّل لـ `FilterFields` في `.ts` وبتتعرض في شريط الفلتر بتاع المرحلة 2.
- العمليات: `=` ، يحتوي، يبدأ بـ، `>=` ، `<=` ، `<>`. اتضافت خاصية اختيارية `operator` في `FilterFieldConfig` وبتتحترم في `buildFilterCondition` (من غيرها السلوك القديم).
- الدروب داون من جدول: الـ hook بيحمّل الاختيارات (`SQL.Select`، لحد 500) والجريد مابيتعرضش قبل ما تتحمل (`filterReady`)، عشان قيم الفلتر المحفوظة ماتتحذفش.
- فلتر إجباري (`required`) → `deferLoadUntilFilter`.
- القيم الافتراضية: `today`, `monthStart`, `yearStart`, `yearEnd`, اسم متغير جلسة، أو ثابت. مدى التاريخ: `monthStart|today`.
- قيم الفلاتر الحالية (`filterVals`) متاحة لأزرار الشاشة وللفلاتر المتسلسلة **في شاشات الجريد بس** (الماستر ديتيل بيعرض فلاتره بس).

## 8) الأحداث والأزرار
- زر = إجراء مخزن: اختار الإجراء من قايمة القاعدة، باراميتراته بتتحمّل من `sys.parameters`، وكل باراميتر يتربط بـ: ثابت / جلسة / فلتر / عمود الصف.
- بعد التنفيذ: تحديث / رسالة / ولا حاجة. تأكيد قبل التنفيذ اختياري.
- المكان: فوق القايمة (`toolbar`)، أو على كل صف (`row`، جريد بس، عن طريق `extraActions`).
- التنفيذ: `Shared/RunProc.ts` (جديد) فوق `ManageDataSQL/Query` بـ `IsProc` — مفيش API جديد.

## 9) شكل الكود المتولد
`<Name>.ts`: ثوابت (`TableName/ViewName/KeyColumn/TrType/RunProcessTrans/ModuleCode`) ← جلسة ← حالة الفلاتر والـ effects ← الإجراءات ← `FormLayoutCells` ← الأعمدة (`useMemo`) ← `FilterFields` ← التحققات ← `Config` (ماستر ديتيل) ← `return`.
`page.tsx`: أزرار الشريط ← `DynamicGrid` (أو `MasterDetail`) بالخصائص: `moduleCode` (المرحلة 4)، `formLayout`، `filterFields`، `onGridFilterChange`، `deferLoadUntilFilter`، `extraActions`، وتقسيم الصفحات من السيرفر (افتراضي المرحلة 2).
آخر `.ts`: `@CreatePageReact-Settings` (v3) و`@ScreenBuilder-Settings` (v5).

## 10) الحفظ والتسجيل
"حفظ وتسجيل" في الشريط العلوي:
1. فحص الإعدادات (أخطاء تمنع الحفظ، تحذيرات).
2. `save-files`: نسخة احتياطية من الملفات القديمة في `Frontend/App/_Backup_Screens/<Name>_<timestamp>/` ثم كتابة الملفات + ملفات CSS + `Resources.ts`. **مابقاش بيعدّل `Routes.tsx`** (المرحلة 4: أي شاشة مش مكتوبة بتاخد HomeLayout).
3. `config-save`: حفظ JSON v5 في `Sys_ScreenConfig` (لو الجدول مش موجود بيتخطى بتحذير والإعدادات تفضل في الماركر).
4. `register-module`: `dbo.Sys_RegisterModule` (مجموعة القايمة، الترتيب، العناوين، الأيقونة، اللون) وبتدي الأدمن صلاحيات كاملة. الشاشة تظهر بعد خروج ودخول تاني.
الفتح: "افتح شاشة" بيعرض الشاشات الموجودة (scan-screens) ويفضّل JSON من `Sys_ScreenConfig` ثم الماركر ثم الاستيراد بأفضل جهد.
مسودة تلقائية في `localStorage` كل ثانيتين بعد آخر تعديل، وبتتعرض كشريط "استرجاع".

## 11) الباك إند (`ScreenBuilderController`)
- **الأمان:** كل النداءات لازم تبعت `X-Admin-Token` (التوكن اللي بيطلع من `api/admin/login`، متخزن في ذاكرة السيرفر 24 ساعة). التوكن بيتفقد بعد ريستارت السيرفر → لازم تسجيل دخول أدمن من جديد.
- **الاتصال:** لو `server` فاضي بيستخدم `ConnectionStrings:cs` من السيرفر نفسه (مفيش باسورد في المتصفح). الطريقة القديمة (سيرفر/يوزر/باسورد) لسه شغالة.
- الجداول: `connect`, `tables` (جداول+فيوهات بنوعها), `columns` (نوع/nullable/identity/محسوب/PK), `resources`, `procs`, `proc-params` (باراميترات + أعمدة النتيجة بـ `sys.dm_exec_describe_first_result_set_for_object`، وبيتجاوز لو فشل), `distinct-values`, `validate-condition`.
- الحفظ: `save-files`, `register-module`, `config-save`, `config-list`, `read-screen`, `scan-screens`, `project-info` (بيكتشف مسار المشروع).
- كل SQL بباراميترات؛ أسماء الجداول/الأعمدة بتتحقق بـ regex وبتتقفل بـ `[ ]`؛ الشروط بتترفض لو فيها `;` أو `--` أو `/*` أو كلمات كتابة (drop/delete/insert/update/exec…).

## 12) الطباعة والإكسل (Hooks للمرحلتين 6 و7)
- تاب "الطباعة والإكسل": طباعة القايمة (إجراء + ربط باراميتراته بالفلاتر)، طباعة مستند (الافتراضي `CompCode, BranchCode, TrID`)، حجم الورق والاتجاه، وإعدادات الإكسل (الأعمدة + تحويل المفاتيح من جدول تاني).
- الشاشة المتولدة فيها ثوابت `PrintConfig` و`ExcelConfig` ودوال `onPrintList / onPrintTransaction / onExcelTemplate / onExcelUpload` بتعرض "هتبقى متاحة قريب". الأزرار **مابتظهرش إلا لو الميزة مفعّلة**. `onPrintTransaction` بيتوصل بـ `onPrint` الموجودة في MasterDetail/DynamicGrid. في المرحلتين 6 و7 هيتبدل جسم الدالة بس.

## 13) الحدود (مش متنفذ لسه)
- نوع شاشة "فورم سجل واحد"، تابات جوه الفورم، رفع ملف/صورة.
- زر جوه الفورم نفسه (الأزرار فوق القايمة أو على الصف).
- `enabledWhen` في الماستر ديتيل (مدعوم في الجريد)، والفلاتر المتسلسلة/ربط الفلتر بالأزرار في الماستر ديتيل.
- المصمم بيعرض الفورم بعناصر شكلية (مش بالمكوّنات الحقيقية، لأن المكوّنات الحقيقية محتاجة جلسة يوزر عادي مش أدمن).
- ماستر ديتيل: تفاصيله بتتعدل من تاب "التفاصيل" الكلاسيك (مش بالسحب).
