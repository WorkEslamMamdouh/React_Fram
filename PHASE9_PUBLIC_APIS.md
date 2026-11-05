# المرحلة 9 — الـ APIs المجانية المقترحة للفريم ورك

> المصدر: https://github.com/public-apis/public-apis (اتراجع 2026-11-05). الاختيار على أساس: مفيد لـ ERP، مجاني، HTTPS.
> كل النداءات هتبقى من الباك إند بس (proxy) عشان المفاتيح متظهرش والـ CORS ميفرقش.
> **قبل التشغيل في الإنتاج:** راجع شروط الاستخدام لكل خدمة (بعضها للاستخدام غير التجاري بس).

## الأولوية 1 — مفيدة فورًا (من غير مفتاح)
| الخدمة | الرابط | الاستخدام في الـ ERP |
|---|---|---|
| Frankfurter | https://frankfurter.dev | أسعار العملات اليومية والتاريخية (فواتير بعملة أجنبية، إعادة تقييم) |
| Currency-api (fawazahmed0) | https://github.com/fawazahmed0/currency-api | بديل للعملات (+150 عملة منها EGP و SAR) بدون حدود |
| Nager.Date | https://date.nager.at | الإجازات الرسمية (EG / SA ...) ← حساب أيام العمل والرواتب والاستحقاق |
| REST Countries | https://restcountries.com | الدول والعملات وأكواد الاتصال ← دروب داون الدول |
| VATComply | https://www.vatcomply.com | أسعار عملات + التحقق من الرقم الضريبي الأوروبي |
| IBAN Analyzer | https://iban-analyzer.com/free-iban-api | التحقق من الـ IBAN واسم البنك والـ BIC ← بيانات الموردين والموظفين |
| Disify / Email Validator (LifeStep) | https://www.disify.com · https://email.lifestep.io | التحقق من الإيميل (صيغة + MX + إيميل مؤقت) |
| Orca Scan Barcode | https://orcascan.com/guides/free-barcode-image-api-0e4a4fa6 | صور باركود (Code128 / EAN / QR) للأصناف والطباعة |
| QR Code (LifeStep) | https://qr.lifestep.io | QR للفواتير (ZATCA) والطباعة |
| Nominatim (OpenStreetMap) | https://nominatim.org | تحويل العنوان ↔ إحداثيات (العملاء، التوصيل) — حد استخدام: طلب/ثانية |
| ipwhois / GeoJS | https://ipwhois.io · https://www.geojs.io | مكان اليوزر من الـ IP ← سجل الدخول والأمان |
| Open Food Facts | https://world.openfoodfacts.org/data | بيانات الأصناف الغذائية من الباركود |
| Open-Meteo | https://open-meteo.com | الطقس (غير تجاري) — لوحة التحكم |
| World Bank / Statistics of the World | https://statisticsoftheworld.com/api-docs | مؤشرات اقتصادية للوحة التحكم |

## الأولوية 2 — محتاجة مفتاح مجاني
| الخدمة | الاستخدام |
|---|---|
| Calendarific | إجازات رسمية بتفاصيل أكتر |
| Open Exchange Rates / ExchangeRate-API / CurrencyFreaks | أسعار عملات بديلة |
| Veriphone / AbstractAPI Phone | التحقق من أرقام الموبايل |
| UPC database | بيانات الأصناف من الباركود |
| Hugging Face / Mistral | ترجمة وتلخيص نصوص (اتأكد من دعم العربي) |

## التصميم المقترح للربط
1. جدول `Sys_ExternalApis`: Code, NameA, NameE, Category, BaseUrl, AuthType (none/apiKey), ApiKey (متشفر)، IsEnabled, RateLimitPerMin, CacheMinutes, LastTestAt, LastTestOk, Notes.
2. باك إند `ExternalApisController`: `list`, `toggle`, `test`, `call/{code}` (proxy بقايمة endpoints مسموحة بس — مش أي URL)، كاش (Redis الموجود أو ذاكرة)، حد استخدام، تسجيل الأخطاء.
3. شاشة أدمن `Sys_ExternalApisAdmin`: كروت لكل API بزرار تفعيل/إيقاف (تكة واحدة)، خانة المفتاح، زرار "جرّب الاتصال"، آخر نتيجة.
4. استخدام جاهز: خدمة `ExternalApi.ts` في الفرونت + مصدر جديد في ScreenBuilder للدروب داون (الدول/العملات) وللقيمة الافتراضية (سعر الصرف اليوم).


---

## ما اتنفّذ في المرحلة 9 (تحديث 2026-11-05)

**الخدمات الجاهزة في الكود** (`Backend/Controllers/ExternalApis/ExternalApiCatalog.cs`) — كلها متوقفة افتراضياً:

| الكود | الخدمة | العمليات المسموحة | مفتاح؟ |
|---|---|---|---|
| `frankfurter` | أسعار الصرف (البنك المركزي الأوروبي) | `latest(base,symbols)` · `convert(amount,from,to,date?)` | لا |
| `fawaz_currency` | Currency-API (فيها EGP و SAR) | `latest(base)` · `currencies()` | لا |
| `nager_date` | الإجازات الرسمية والدول | `holidays(year,country)` · `countries()` · `countryInfo(code)` | لا |
| `openiban` | التحقق من IBAN | `validate(iban)` | لا |
| `disify` | التحقق من الإيميل | `validate(email)` | لا |
| `barcodeapi` | صورة باركود | `image(type,data)` | لا |
| `qrserver` | صورة QR | `image(data,size?)` | لا |
| `nominatim` | عنوان ← إحداثيات (طلب/ثانية) | `search(q,limit?)` | لا |
| `ipwhois` | موقع IP عام | `lookup(ip)` | لا |
| `openmeteo` | الطقس الحالي (غير تجاري) | `current(lat,lon)` | لا |
| `currencyapi` | أسعار عملات | `latest(base,currencies?)` | **نعم** |
| `exchangerate_api` | أسعار عملات | `latest(base)` | **نعم** |
| `calendarific` | إجازات بتفاصيل أكتر | `holidays(year,country)` | **نعم** |

**اتشالت:** REST Countries (النسخة v3 اتوقفت والنسخة v5 محتاجة حساب ومفتاح ومش واضح شكل الطلب في التوثيق) — قائمة الدول بتيجي من `nager_date.countries`. VATComply وOpen Food Facts وWorld Bank مش مضافين دلوقتي (مرحلة لاحقة).

### إزاي تفعّل خدمة
1. افتح `/ClientApp/Sys_ExternalApisAdmin` (بعد تشغيل `Database/Phase9_ExternalApis.sql` هتلاقيها في قايمة الإدارة "الخدمات الخارجية (APIs)").
2. دوس على الزرار (التفعيل/الإيقاف) على كارت الخدمة — الحفظ فوري.
3. الخدمات اللي محتاجة مفتاح: الصق المفتاح واضغط "حفظ المفتاح" (بيتخزن مشفّر ومابيرجعش للشاشة، بيظهر آخر 4 حروف بس)، وبعدها فعّلها.
4. اضغط "جرّب الاتصال" تشوف النتيجة وزمن الرد.

الصلاحية: أي مستخدم دوره `Sys_Role.IsAdmin = 1` يقدر يدخل ويعدّل حتى قبل تسجيل الشاشة في القايمة. غير الأدمن لازم يكون عنده صلاحية على `Sys_ExternalApisAdmin` (التنفيذ للعرض، إضافة/تعديل للتغيير).

التخزين: لو جدول `Sys_ExternalApis` مش موجود → ملف `Backend/App_Data/external-apis.json` (المفاتيح مشفّرة AES-256-GCM بمفتاح مشتق من `ExternalApis:EncryptionKey` أو `Jwt:Key` في الإعدادات — لو غيّرت `Jwt:Key` لازم تعيد إدخال المفاتيح). بعد تشغيل السكربت الباك إند بيستخدم الجدول تلقائياً (خلال 30 ثانية) ومابينقلش الإعدادات القديمة — أعد إدخال المفاتيح.

### إزاي شاشة تستخدم خدمة
```ts
import { getExchangeRate, getHolidays, validateIban, qrImageUrl } from "../Shared/ExternalApis/ExternalApi";

// سعر صرف اليوم (لو الخدمة مقفولة بيرجع ok:false ورسالة جاهزة بلغة الواجهة)
const r = await getExchangeRate("USD", "EGP");
if (r.ok) setForm((f) => ({ ...f, ExchangeRate: r.data!.rate }));
else Sys.ShowMessage(r.message, r.message, "warning");

// إجازات 2026 في مصر
const h = await getHolidays(2026, "EG");           // h.data = [{ date, localName, name, ... }]

// تحقق من IBAN
const v = await validateIban(iban);                // v.data.valid / v.data.bank.name

// صورة QR جاهزة لـ <img src>
const q = await qrImageUrl("INV-1001");            // q.data = "data:image/png;base64,..."
```
أي عملية مالهاش دالة جاهزة: `callExternalApi("nager_date", "countryInfo", { code: "EG" })`.
كل النداءات بتعدي على `api/ExternalApis/Use` (يوزر مسجّل دخول عادي، مش لازم أدمن) ولا تقبل غير العمليات المسموحة والخدمات المفعّلة فقط، وفيها كاش وحد استخدام بالدقيقة.

### أفكار دمج مع ScreenBuilder (متابعة لاحقة — مفيش تعديل عليه الليلة)
- **مصدر جديد للقوائم المنسدلة:** `externalApi:nager_date.countries` (الدول) و`externalApi:fawaz_currency.currencies` (العملات) — الشاشة تعرضهم زي أي Lookup.
- **قيمة افتراضية ديناميكية:** حقل "سعر الصرف" يتملى تلقائياً من `getExchangeRate(currency, baseCurrency, date)` لما العملة أو التاريخ يتغيروا.
- **تحقق جاهز:** قاعدة تحقق من نوع "IBAN" أو "Email" تنادي `validateIban` / `validateEmail`.
- **زر في الطباعة:** إدراج صورة باركود/QR من `barcodeImageUrl` / `qrImageUrl` في قوالب الطباعة.
- **تنبيه:** لو الخدمة مقفولة الحقل يشتغل يدوي عادي (الدوال بترجّع ok:false وماترميش خطأ).
