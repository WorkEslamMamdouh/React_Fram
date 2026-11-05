using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;

// =====================================================================================
//  ExternalApiCatalog  -  Phase 9: built-in definitions of free public APIs (code, not DB).
//  Every API has a FIXED allow-list of operations. A caller can never supply a URL:
//  the URL is built here from validated parameters only (SSRF safe).
//  Endpoint shapes were confirmed against each service on 2026-11-05 (see PHASE9_PUBLIC_APIS.md).
//  Dropped: REST Countries (v3 shut down, v5 needs an account key and docs don't show the shape).
// =====================================================================================
namespace ERP.Controllers.ExternalApis
{
    public enum PType { Text, Currency, Country, Year, Date, Decimal, Lat, Lon, Ip, Iban, Email, Enum }

    public class ParamDef
    {
        public string Name;
        public PType Type;
        public bool Required = true;
        public int Max = 100;
        public string[] Values;      // for Enum
        public ParamDef(string name, PType type, bool required = true, int max = 100, string[] values = null)
        { Name = name; Type = type; Required = required; Max = max; Values = values; }
    }

    public class UpstreamRequest
    {
        public string Url;
        public Dictionary<string, string> Headers = new Dictionary<string, string>();
        public bool Binary;
        public string UserAgent;
    }

    public class OpDef
    {
        public string Name;
        public string DescE, DescA;
        public ParamDef[] Params = new ParamDef[0];
        public Func<Dictionary<string, string>, string, UpstreamRequest> Build;       // (params, apiKey) -> request
        public Func<JToken, Dictionary<string, string>, object> Shape;               // optional post-processing (JSON only)
        public int? CacheMinutes;                                                     // overrides API default
    }

    public class ApiDef
    {
        public string Code, NameA, NameE, Category, Icon, DescA, DescE, DocsUrl;
        public string AuthType = "none";          // none | header | query | path
        public bool RequiresKey;
        public int RateLimitPerMin = 60;
        public int CacheMinutes = 10;
        public int Priority = 1;
        public string NoteA, NoteE;               // usage-terms note
        public string TestOp;
        public Dictionary<string, string> TestParams = new Dictionary<string, string>();
        public Dictionary<string, OpDef> Ops = new Dictionary<string, OpDef>(StringComparer.OrdinalIgnoreCase);
    }

    public static class ExternalApiCatalog
    {
        public const string UserAgent = "ErpFramework/1.0 (self-hosted ERP integration)";
        public static readonly List<ApiDef> All = Build();
        public static ApiDef Find(string code) => All.FirstOrDefault(a => string.Equals(a.Code, code, StringComparison.OrdinalIgnoreCase));

        static string E(string s) => Uri.EscapeDataString(s ?? "");
        static Dictionary<string, string> D(params string[] kv)
        {
            var d = new Dictionary<string, string>();
            for (int i = 0; i + 1 < kv.Length; i += 2) d[kv[i]] = kv[i + 1];
            return d;
        }
        static string Get(Dictionary<string, string> p, string k) => p.TryGetValue(k, out var v) ? v : null;

        // ------------------------------------------------------------------ validation
        static readonly Regex RxCur = new Regex("^[A-Za-z0-9]{2,10}$", RegexOptions.Compiled);
        static readonly Regex RxCountry = new Regex("^[A-Za-z]{2}$", RegexOptions.Compiled);
        static readonly Regex RxIban = new Regex("^[A-Za-z0-9]{5,34}$", RegexOptions.Compiled);
        static readonly Regex RxEmail = new Regex(@"^[^\s@/\\?#]{1,64}@[A-Za-z0-9.\-]{1,255}$", RegexOptions.Compiled);

        /// returns null when OK, else an error message. Normalizes values in place (trim / upper / invariant numbers).
        public static string Validate(OpDef op, Dictionary<string, string> p)
        {
            var allowed = new HashSet<string>(op.Params.Select(x => x.Name), StringComparer.OrdinalIgnoreCase);
            foreach (var k in p.Keys.ToList())
                if (!allowed.Contains(k)) p.Remove(k);          // unknown params are dropped, never forwarded

            foreach (var d in op.Params)
            {
                string key = p.Keys.FirstOrDefault(x => string.Equals(x, d.Name, StringComparison.OrdinalIgnoreCase));
                string v = key == null ? null : (p[key] ?? "").Trim();
                if (key != null && key != d.Name) { p.Remove(key); if (v != null) p[d.Name] = v; }
                if (string.IsNullOrEmpty(v))
                {
                    p.Remove(d.Name);
                    if (d.Required) return $"Parameter '{d.Name}' is required / المعامل '{d.Name}' مطلوب";
                    continue;
                }
                if (v.Length > d.Max) return $"Parameter '{d.Name}' is too long / المعامل '{d.Name}' طويل";
                string bad = $"Parameter '{d.Name}' is invalid / المعامل '{d.Name}' غير صالح";
                switch (d.Type)
                {
                    case PType.Currency: if (!RxCur.IsMatch(v)) return bad; v = v.ToUpperInvariant(); break;
                    case PType.Country: if (!RxCountry.IsMatch(v)) return bad; v = v.ToUpperInvariant(); break;
                    case PType.Year: if (!int.TryParse(v, NumberStyles.None, CultureInfo.InvariantCulture, out var y) || y < 1900 || y > 2100) return bad; break;
                    case PType.Date:
                        if (!DateTime.TryParseExact(v, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt) || dt.Year < 1999) return bad;
                        break;
                    case PType.Decimal:
                        if (!decimal.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out var m) || m <= 0 || m > 1000000000000m) return bad;
                        v = m.ToString(CultureInfo.InvariantCulture); break;
                    case PType.Lat:
                        if (!double.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out var la) || la < -90 || la > 90) return bad;
                        v = la.ToString("0.####", CultureInfo.InvariantCulture); break;
                    case PType.Lon:
                        if (!double.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out var lo) || lo < -180 || lo > 180) return bad;
                        v = lo.ToString("0.####", CultureInfo.InvariantCulture); break;
                    case PType.Ip:
                        if (!IPAddress.TryParse(v, out var ip) || IsPrivate(ip)) return $"Parameter '{d.Name}' must be a public IP address / عنوان IP عام مطلوب";
                        v = ip.ToString(); break;
                    case PType.Iban: v = v.Replace(" ", "").ToUpperInvariant(); if (!RxIban.IsMatch(v)) return bad; break;
                    case PType.Email: if (!RxEmail.IsMatch(v)) return bad; break;
                    case PType.Enum: if (d.Values == null || !d.Values.Contains(v, StringComparer.OrdinalIgnoreCase)) return bad + " (" + string.Join("|", d.Values ?? new string[0]) + ")"; v = d.Values.First(x => string.Equals(x, v, StringComparison.OrdinalIgnoreCase)); break;
                    default: if (v.Any(char.IsControl)) return bad; break;
                }
                p[d.Name] = v;
            }
            return null;
        }

        static bool IsPrivate(IPAddress ip)
        {
            if (IPAddress.IsLoopback(ip) || ip.Equals(IPAddress.Any) || ip.Equals(IPAddress.IPv6Any)) return true;
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast) return true;
            var b = ip.GetAddressBytes();
            if (b.Length == 4)
            {
                if (b[0] == 10 || b[0] == 127 || b[0] == 0) return true;
                if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true;
                if (b[0] == 192 && b[1] == 168) return true;
                if (b[0] == 169 && b[1] == 254) return true;
                if (b[0] == 100 && b[1] >= 64 && b[1] <= 127) return true;
                if (b[0] >= 224) return true;
            }
            else if ((b[0] & 0xFE) == 0xFC) return true;       // fc00::/7
            return false;
        }

        // ------------------------------------------------------------------ catalog
        static List<ApiDef> Build()
        {
            var list = new List<ApiDef>();
            var cur = new ParamDef("base", PType.Currency, false, 10);

            // ---------- Frankfurter (ECB rates) ----------
            var fr = new ApiDef
            {
                Code = "frankfurter", NameA = "فرانكفورتر - أسعار الصرف", NameE = "Frankfurter - Exchange Rates", Category = "finance", Icon = "fa-coins",
                DescA = "أسعار صرف يومية وتاريخية من البنك المركزي الأوروبي (مفيد لفواتير العملة الأجنبية وإعادة التقييم). لا يدعم كل العملات (مثلاً الجنيه المصري غير موجود).",
                DescE = "Daily and historical ECB exchange rates (foreign-currency invoices, revaluation). Not every currency is covered (e.g. EGP is not).",
                DocsUrl = "https://frankfurter.dev", RateLimitPerMin = 60, CacheMinutes = 60, TestOp = "latest", TestParams = D("base", "USD", "symbols", "EUR")
            };
            fr.Ops["latest"] = new OpDef
            {
                Name = "latest", DescE = "Latest rates for a base currency", DescA = "آخر الأسعار لعملة أساس",
                Params = new[] { cur, new ParamDef("symbols", PType.Text, false, 60) },
                Build = (p, k) => new UpstreamRequest { Url = "https://api.frankfurter.dev/v1/latest?base=" + E(Get(p, "base") ?? "EUR") + (Get(p, "symbols") != null ? "&symbols=" + E(Get(p, "symbols").ToUpperInvariant()) : "") }
            };
            fr.Ops["convert"] = new OpDef
            {
                Name = "convert", DescE = "Convert an amount between two currencies (optional date)", DescA = "تحويل مبلغ بين عملتين (تاريخ اختياري)",
                Params = new[] { new ParamDef("amount", PType.Decimal), new ParamDef("from", PType.Currency, true, 10), new ParamDef("to", PType.Currency, true, 10), new ParamDef("date", PType.Date, false, 10) },
                Build = (p, k) => new UpstreamRequest { Url = "https://api.frankfurter.dev/v1/" + (Get(p, "date") ?? "latest") + "?amount=" + E(Get(p, "amount")) + "&base=" + E(Get(p, "from")) + "&symbols=" + E(Get(p, "to")) },
                Shape = (j, p) =>
                {
                    var to = Get(p, "to");
                    var res = j["rates"]?[to]?.Value<decimal?>();
                    var amount = decimal.Parse(Get(p, "amount"), CultureInfo.InvariantCulture);
                    return new { amount, from = Get(p, "from"), to, date = j["date"]?.ToString(), result = res, rate = (res.HasValue && amount != 0) ? res / amount : (decimal?)null };
                }
            };
            list.Add(fr);

            // ---------- fawazahmed0 currency-api (no key, 200+ currencies incl. EGP/SAR) ----------
            var fw = new ApiDef
            {
                Code = "fawaz_currency", NameA = "Currency-API - عملات بدون حدود", NameE = "Currency-API (fawazahmed0)", Category = "finance", Icon = "fa-money-bill-transfer",
                DescA = "أسعار +200 عملة (منها EGP و SAR) بدون مفتاح وبدون حد استخدام، تتحدث يومياً. بديل لفرانكفورتر.",
                DescE = "Rates for 200+ currencies (incl. EGP and SAR), no key, no rate limit, daily updates. Fallback for Frankfurter.",
                DocsUrl = "https://github.com/fawazahmed0/currency-api", RateLimitPerMin = 60, CacheMinutes = 60, TestOp = "latest", TestParams = D("base", "usd")
            };
            fw.Ops["latest"] = new OpDef
            {
                Name = "latest", DescE = "All rates for a base currency", DescA = "كل الأسعار لعملة أساس",
                Params = new[] { new ParamDef("base", PType.Currency, true, 10) },
                Build = (p, k) => new UpstreamRequest { Url = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/" + E(Get(p, "base").ToLowerInvariant()) + ".json" },
                Shape = (j, p) => { var b = Get(p, "base").ToLowerInvariant(); return new { @base = b.ToUpperInvariant(), date = j["date"]?.ToString(), rates = j[b] }; }
            };
            fw.Ops["currencies"] = new OpDef
            {
                Name = "currencies", DescE = "List of currency codes and names", DescA = "قائمة العملات وأسماؤها",
                Build = (p, k) => new UpstreamRequest { Url = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json" },
                CacheMinutes = 1440
            };
            list.Add(fw);

            // ---------- Nager.Date ----------
            var ng = new ApiDef
            {
                Code = "nager_date", NameA = "Nager.Date - الإجازات الرسمية والدول", NameE = "Nager.Date - Public Holidays & Countries", Category = "calendar", Icon = "fa-calendar-days",
                DescA = "الإجازات الرسمية لأكثر من 100 دولة (لحساب أيام العمل والرواتب) + قائمة الدول لقوائم الاختيار.",
                DescE = "Public holidays for 100+ countries (working days, payroll) plus a country list for dropdowns.",
                DocsUrl = "https://date.nager.at", RateLimitPerMin = 60, CacheMinutes = 1440, TestOp = "holidays", TestParams = D("year", DateTime.UtcNow.Year.ToString(), "country", "EG")
            };
            ng.Ops["holidays"] = new OpDef
            {
                Name = "holidays", DescE = "Public holidays of a country for a year", DescA = "الإجازات الرسمية لدولة في سنة",
                Params = new[] { new ParamDef("year", PType.Year, true, 4), new ParamDef("country", PType.Country, true, 2) },
                Build = (p, k) => new UpstreamRequest { Url = "https://date.nager.at/api/v3/PublicHolidays/" + E(Get(p, "year")) + "/" + E(Get(p, "country")) }
            };
            ng.Ops["countries"] = new OpDef
            {
                Name = "countries", DescE = "Supported countries (code + name)", DescA = "الدول المدعومة (الكود والاسم)",
                Build = (p, k) => new UpstreamRequest { Url = "https://date.nager.at/api/v3/AvailableCountries" }
            };
            ng.Ops["countryInfo"] = new OpDef
            {
                Name = "countryInfo", DescE = "Country details (names, region, borders)", DescA = "بيانات دولة (الأسماء والإقليم والحدود)",
                Params = new[] { new ParamDef("code", PType.Country, true, 2) },
                Build = (p, k) => new UpstreamRequest { Url = "https://date.nager.at/api/v3/CountryInfo/" + E(Get(p, "code")) }
            };
            list.Add(ng);

            // ---------- OpenIBAN ----------
            var ib = new ApiDef
            {
                Code = "openiban", NameA = "OpenIBAN - التحقق من IBAN", NameE = "OpenIBAN - IBAN Validation", Category = "validation", Icon = "fa-building-columns",
                DescA = "التحقق من صحة رقم الـ IBAN واسم البنك والـ BIC (بيانات الموردين والموظفين). تنبيه: الرقم بيتبعت لخدمة خارجية.",
                DescE = "Validate an IBAN and look up bank name / BIC (suppliers, employees). Note: the number is sent to a third-party service.",
                DocsUrl = "https://openiban.com", RateLimitPerMin = 30, CacheMinutes = 1440, TestOp = "validate", TestParams = D("iban", "DE89370400440532013000"),
                NoteA = "الرقم بيتبعت لطرف ثالث.", NoteE = "The number is sent to a third party."
            };
            ib.Ops["validate"] = new OpDef
            {
                Name = "validate", DescE = "Validate an IBAN", DescA = "التحقق من IBAN",
                Params = new[] { new ParamDef("iban", PType.Iban, true, 40) },
                Build = (p, k) => new UpstreamRequest { Url = "https://openiban.com/validate/" + E(Get(p, "iban")) + "?getBIC=true&validateBankCode=true" },
                Shape = (j, p) => new { valid = j["valid"]?.Value<bool>() ?? false, iban = j["iban"]?.ToString(), messages = j["messages"], bank = j["bankData"] }
            };
            list.Add(ib);

            // ---------- Disify ----------
            var ds = new ApiDef
            {
                Code = "disify", NameA = "Disify - التحقق من الإيميل", NameE = "Disify - Email Validation", Category = "validation", Icon = "fa-envelope-circle-check",
                DescA = "التحقق من صيغة الإيميل ووجود الدومين (DNS) وكشف الإيميلات المؤقتة. تنبيه: الإيميل بيتبعت لخدمة خارجية.",
                DescE = "Checks email format, domain DNS and detects disposable emails. Note: the address is sent to a third-party service.",
                DocsUrl = "https://www.disify.com", RateLimitPerMin = 30, CacheMinutes = 1440, TestOp = "validate", TestParams = D("email", "test@gmail.com"),
                NoteA = "الإيميل بيتبعت لطرف ثالث.", NoteE = "The address is sent to a third party."
            };
            ds.Ops["validate"] = new OpDef
            {
                Name = "validate", DescE = "Validate an email address", DescA = "التحقق من إيميل",
                Params = new[] { new ParamDef("email", PType.Email, true, 254) },
                Build = (p, k) => new UpstreamRequest { Url = "https://disify.com/api/email/" + E(Get(p, "email")) },
                Shape = (j, p) => new { format = j["format"]?.Value<bool>() ?? false, dns = j["dns"]?.Value<bool>() ?? false, disposable = j["disposable"]?.Value<bool>() ?? false, domain = j["domain"]?.ToString() }
            };
            list.Add(ds);

            // ---------- BarcodeAPI.org ----------
            var bc = new ApiDef
            {
                Code = "barcodeapi", NameA = "BarcodeAPI - صور الباركود", NameE = "BarcodeAPI - Barcode Images", Category = "images", Icon = "fa-barcode",
                DescA = "توليد صورة باركود (Code128 / EAN / UPC ...) للأصناف والطباعة. القيمة بتتبعت لخدمة خارجية فمتحطش بيانات حساسة.",
                DescE = "Generates barcode images (Code128 / EAN / UPC ...) for items and printing. The value is sent to a third party: do not encode sensitive data.",
                DocsUrl = "https://barcodeapi.org", RateLimitPerMin = 60, CacheMinutes = 1440, TestOp = "image", TestParams = D("type", "code128", "data", "12345"),
                NoteA = "القيمة بتتبعت لطرف ثالث.", NoteE = "The value is sent to a third party."
            };
            bc.Ops["image"] = new OpDef
            {
                Name = "image", DescE = "Barcode PNG (base64)", DescA = "صورة باركود PNG (base64)",
                Params = new[] { new ParamDef("type", PType.Enum, true, 20, new[] { "code128", "code39", "ean13", "ean8", "upca", "upce", "itf", "codabar", "auto" }), new ParamDef("data", PType.Text, true, 100) },
                Build = (p, k) => new UpstreamRequest { Url = "https://barcodeapi.org/api/" + E(Get(p, "type").ToLowerInvariant()) + "/" + E(Get(p, "data")), Binary = true }
            };
            list.Add(bc);

            // ---------- QR Server ----------
            var qr = new ApiDef
            {
                Code = "qrserver", NameA = "QR Server - أكواد QR", NameE = "QR Server - QR Codes", Category = "images", Icon = "fa-qrcode",
                DescA = "توليد صورة QR للفواتير والروابط. النص بيتبعت لخدمة خارجية فمتحطش بيانات حساسة (لـ QR الفاتورة الإلكترونية الأفضل توليده محلياً).",
                DescE = "Generates QR images for invoices and links. The text is sent to a third party; for regulated e-invoice QR prefer local generation.",
                DocsUrl = "https://goqr.me/api/", RateLimitPerMin = 60, CacheMinutes = 1440, TestOp = "image", TestParams = D("data", "ERP"),
                NoteA = "النص بيتبعت لطرف ثالث.", NoteE = "The text is sent to a third party."
            };
            qr.Ops["image"] = new OpDef
            {
                Name = "image", DescE = "QR code PNG (base64)", DescA = "صورة QR بصيغة PNG (base64)",
                Params = new[] { new ParamDef("data", PType.Text, true, 900), new ParamDef("size", PType.Enum, false, 8, new[] { "100x100", "150x150", "200x200", "300x300", "400x400", "500x500" }) },
                Build = (p, k) => new UpstreamRequest { Url = "https://api.qrserver.com/v1/create-qr-code/?size=" + (Get(p, "size") ?? "200x200") + "&margin=2&data=" + E(Get(p, "data")), Binary = true }
            };
            list.Add(qr);

            // ---------- Nominatim ----------
            var nm = new ApiDef
            {
                Code = "nominatim", NameA = "Nominatim - البحث عن العناوين", NameE = "Nominatim - Address Search", Category = "geo", Icon = "fa-location-dot",
                DescA = "تحويل عنوان إلى إحداثيات (OpenStreetMap). حد أقصى طلب في الثانية والنتائج بتتخزن مؤقتاً. ممنوع الاستخدام المكثف.",
                DescE = "Geocode an address to coordinates (OpenStreetMap). Max 1 request/second; results are cached. No heavy/bulk use.",
                DocsUrl = "https://nominatim.org/release-docs/latest/api/Search/", RateLimitPerMin = 30, CacheMinutes = 1440, TestOp = "search", TestParams = D("q", "Cairo"),
                NoteA = "سياسة الاستخدام: طلب/ثانية كحد أقصى.", NoteE = "Usage policy: max 1 request/second."
            };
            nm.Ops["search"] = new OpDef
            {
                Name = "search", DescE = "Search an address / place", DescA = "البحث عن عنوان أو مكان",
                Params = new[] { new ParamDef("q", PType.Text, true, 200), new ParamDef("limit", PType.Decimal, false, 2) },
                Build = (p, k) =>
                {
                    int lim = 5; if (int.TryParse(Get(p, "limit"), NumberStyles.Integer, CultureInfo.InvariantCulture, out var l)) lim = Math.Max(1, Math.Min(10, l));
                    return new UpstreamRequest { Url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=" + lim + "&q=" + E(Get(p, "q")), UserAgent = UserAgent };
                },
                Shape = (j, p) => (j as JArray ?? new JArray()).Select(x => (object)new { name = x["display_name"]?.ToString(), lat = x["lat"]?.ToString(), lon = x["lon"]?.ToString(), type = x["type"]?.ToString(), address = x["address"] }).ToList()
            };
            list.Add(nm);

            // ---------- ipwho.is ----------
            var ip = new ApiDef
            {
                Code = "ipwhois", NameA = "ipwho.is - موقع الـ IP", NameE = "ipwho.is - IP Geolocation", Category = "geo", Icon = "fa-globe",
                DescA = "معرفة الدولة والمدينة والمزود من عنوان IP عام (سجل الدخول والأمان).",
                DescE = "Country, city and ISP from a public IP address (login log, security).",
                DocsUrl = "https://ipwhois.io", RateLimitPerMin = 30, CacheMinutes = 1440, TestOp = "lookup", TestParams = D("ip", "8.8.8.8")
            };
            ip.Ops["lookup"] = new OpDef
            {
                Name = "lookup", DescE = "Geolocate a public IP", DescA = "موقع عنوان IP عام",
                Params = new[] { new ParamDef("ip", PType.Ip, true, 45) },
                Build = (p, k) => new UpstreamRequest { Url = "https://ipwho.is/" + E(Get(p, "ip")) },
                Shape = (j, p) =>
                {
                    if (!(j["success"]?.Value<bool>() ?? false)) throw new ExternalApiException(j["message"]?.ToString() ?? "Lookup failed");
                    return new { ip = j["ip"]?.ToString(), country = j["country"]?.ToString(), countryCode = j["country_code"]?.ToString(), region = j["region"]?.ToString(), city = j["city"]?.ToString(), latitude = j["latitude"], longitude = j["longitude"], timezone = j["timezone"]?["id"]?.ToString(), isp = j["connection"]?["isp"]?.ToString() };
                }
            };
            list.Add(ip);

            // ---------- Open-Meteo ----------
            var om = new ApiDef
            {
                Code = "openmeteo", NameA = "Open-Meteo - الطقس", NameE = "Open-Meteo - Weather", Category = "geo", Icon = "fa-cloud-sun",
                DescA = "الطقس الحالي لإحداثيات (للوحة التحكم). للاستخدام غير التجاري فقط.",
                DescE = "Current weather for coordinates (dashboard). Non-commercial use only.",
                DocsUrl = "https://open-meteo.com", RateLimitPerMin = 30, CacheMinutes = 15, TestOp = "current", TestParams = D("lat", "30.04", "lon", "31.23"),
                NoteA = "غير تجاري فقط.", NoteE = "Non-commercial use only."
            };
            om.Ops["current"] = new OpDef
            {
                Name = "current", DescE = "Current weather", DescA = "الطقس الحالي",
                Params = new[] { new ParamDef("lat", PType.Lat, true, 12), new ParamDef("lon", PType.Lon, true, 12) },
                Build = (p, k) => new UpstreamRequest { Url = "https://api.open-meteo.com/v1/forecast?latitude=" + E(Get(p, "lat")) + "&longitude=" + E(Get(p, "lon")) + "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto" },
                Shape = (j, p) => new { latitude = j["latitude"], longitude = j["longitude"], timezone = j["timezone"]?.ToString(), current = j["current"], units = j["current_units"] }
            };
            list.Add(om);

            // ---------- Priority 2: need a free key (disabled until a key is saved) ----------
            var ca = new ApiDef
            {
                Code = "currencyapi", NameA = "CurrencyAPI - أسعار العملات (بمفتاح)", NameE = "CurrencyAPI - Exchange Rates (key)", Category = "finance", Icon = "fa-chart-line", Priority = 2,
                DescA = "أسعار عملات بمفتاح مجاني من currencyapi.com (بيانات الخطة المجانية تتحدث يومياً).",
                DescE = "Exchange rates using a free key from currencyapi.com (free plan updates daily).",
                DocsUrl = "https://currencyapi.com/docs/latest", AuthType = "header", RequiresKey = true, RateLimitPerMin = 10, CacheMinutes = 120, TestOp = "latest", TestParams = D("base", "USD", "currencies", "EUR")
            };
            ca.Ops["latest"] = new OpDef
            {
                Name = "latest", DescE = "Latest rates for a base currency", DescA = "آخر الأسعار لعملة أساس",
                Params = new[] { cur, new ParamDef("currencies", PType.Text, false, 60) },
                Build = (p, k) =>
                {
                    var r = new UpstreamRequest { Url = "https://api.currencyapi.com/v3/latest?base_currency=" + E(Get(p, "base") ?? "USD") + (Get(p, "currencies") != null ? "&currencies=" + E(Get(p, "currencies").ToUpperInvariant()) : "") + "&shape=compact" };
                    r.Headers["apikey"] = k; return r;
                },
                Shape = (j, p) => new { @base = j["meta"]?["base_currency"]?.ToString() ?? Get(p, "base") ?? "USD", date = j["meta"]?["last_updated_at"]?.ToString(), rates = j["data"] }
            };
            list.Add(ca);

            var ex = new ApiDef
            {
                Code = "exchangerate_api", NameA = "ExchangeRate-API - أسعار العملات (بمفتاح)", NameE = "ExchangeRate-API - Exchange Rates (key)", Category = "finance", Icon = "fa-right-left", Priority = 2,
                DescA = "أسعار +160 عملة بمفتاح مجاني من exchangerate-api.com.",
                DescE = "Rates for 160+ currencies using a free key from exchangerate-api.com.",
                DocsUrl = "https://www.exchangerate-api.com/docs/standard-requests", AuthType = "path", RequiresKey = true, RateLimitPerMin = 10, CacheMinutes = 120, TestOp = "latest", TestParams = D("base", "USD")
            };
            ex.Ops["latest"] = new OpDef
            {
                Name = "latest", DescE = "Latest rates for a base currency", DescA = "آخر الأسعار لعملة أساس",
                Params = new[] { new ParamDef("base", PType.Currency, true, 10) },
                Build = (p, k) => new UpstreamRequest { Url = "https://v6.exchangerate-api.com/v6/" + E(k) + "/latest/" + E(Get(p, "base")) },
                Shape = (j, p) =>
                {
                    if (j["result"]?.ToString() != "success") throw new ExternalApiException("Upstream error: " + (j["error-type"]?.ToString() ?? "unknown"));
                    return new { @base = j["base_code"]?.ToString(), date = j["time_last_update_utc"]?.ToString(), rates = j["conversion_rates"] };
                }
            };
            list.Add(ex);

            var cl = new ApiDef
            {
                Code = "calendarific", NameA = "Calendarific - إجازات بتفاصيل أكتر (بمفتاح)", NameE = "Calendarific - Detailed Holidays (key)", Category = "calendar", Icon = "fa-calendar-check", Priority = 2,
                DescA = "إجازات رسمية بتفاصيل أكتر بمفتاح مجاني (500 طلب في الشهر).",
                DescE = "Detailed public holidays with a free key (500 requests/month).",
                DocsUrl = "https://calendarific.com/api-documentation", AuthType = "query", RequiresKey = true, RateLimitPerMin = 5, CacheMinutes = 1440, TestOp = "holidays", TestParams = D("year", DateTime.UtcNow.Year.ToString(), "country", "EG")
            };
            cl.Ops["holidays"] = new OpDef
            {
                Name = "holidays", DescE = "Holidays of a country for a year", DescA = "إجازات دولة في سنة",
                Params = new[] { new ParamDef("year", PType.Year, true, 4), new ParamDef("country", PType.Country, true, 2) },
                Build = (p, k) => new UpstreamRequest { Url = "https://calendarific.com/api/v2/holidays?api_key=" + E(k) + "&country=" + E(Get(p, "country")) + "&year=" + E(Get(p, "year")) },
                Shape = (j, p) => j["response"]?["holidays"] ?? new JArray()
            };
            list.Add(cl);

            return list;
        }
    }

    public class ExternalApiException : Exception { public ExternalApiException(string m) : base(m) { } }
}
