"use client";

// =====================================================================================
//  ExternalApi.ts  -  Phase 9: typed helpers for the free public APIs (via the backend)
//  كل الدوال بتنادي api/ExternalApis/Use بالـ JWT، ومبترميش خطأ أبداً:
//  لو الخدمة مش مفعّلة (أو فيها مشكلة) بترجّع { ok:false, data:null, message } بدل ما تبوّظ الشاشة.
//  التفعيل بيتم من شاشة الأدمن: /ClientApp/Sys_ExternalApisAdmin
//
//  مثال:
//    const r = await getExchangeRate("USD", "EUR");
//    if (r.ok) setRate(r.data!.rate); else Sys.ShowMessage(r.message, r.message, "warning");
// =====================================================================================

import { Sys } from "../SystemTools";
import { useSys } from "../SystemUsing";
import { BaseResponse } from "../Entities";

export type ExternalApiCode =
  | "frankfurter" | "fawaz_currency" | "nager_date" | "openiban" | "disify" | "barcodeapi" | "qrserver"
  | "nominatim" | "ipwhois" | "openmeteo" | "currencyapi" | "exchangerate_api" | "calendarific";

export interface ExternalApiResult<T> {
  ok: boolean;
  data: T | null;
  /** رسالة جاهزة للعرض بلغة الواجهة الحالية (فاضية لو ok) */
  message: string;
  /** OK | DISABLED | NO_KEY | BAD_REQUEST | RATE_LIMIT | UPSTREAM | TIMEOUT | NETWORK | ... */
  code: string;
  cached?: boolean;
}

/** الرسايل من السيرفر بصيغة "English / عربي" — بنختار حسب لغة الواجهة */
function pickLang(msg: string | null | undefined): string {
  if (!msg) return "";
  const i = msg.lastIndexOf(" / ");
  if (i < 0) return msg;
  const isEn = useSys.getState().IsLangEN;
  return isEn ? msg.slice(0, i) : msg.slice(i + 3);
}

/** النداء العام. ماتستخدمهوش مباشرة غير للعمليات اللي مفيش لها دالة جاهزة تحت. */
export async function callExternalApi<T = any>(code: ExternalApiCode | string, op: string, params?: Record<string, string | number | undefined | null>): Promise<ExternalApiResult<T>> {
  const clean: Record<string, string> = {};
  Object.entries(params ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== null && String(v) !== "") clean[k] = String(v); });
  try {
    const res = await Sys.CallApi<BaseResponse<any>>({ method: "POST", controller: "ExternalApis", action: "Use", data: { code, op, params: clean } });
    if (!res || (res as any).IsSuccess === false) {
      return { ok: false, data: null, code: "ERROR", message: pickLang((res as any)?.ErrorMessage) || pickLang("Request failed / فشل الطلب") };
    }
    const r = (res as any).Response;
    if (!r) return { ok: false, data: null, code: "ERROR", message: pickLang("Empty response / رد فاضي") };
    return r.ok
      ? { ok: true, data: r.data as T, code: "OK", message: "", cached: !!r.cached }
      : { ok: false, data: null, code: r.code || "ERROR", message: pickLang(r.message) };
  } catch (e: any) {
    return { ok: false, data: null, code: "NETWORK", message: pickLang(typeof e === "string" ? e : e?.message || "Network error / خطأ في الاتصال") };
  }
}

// ------------------------------------------------------------------ العملات
export interface ConvertResult { amount: number; from: string; to: string; date: string | null; result: number | null; rate: number | null }

export async function convertCurrency(amount: number, from: string, to: string, date?: string): Promise<ExternalApiResult<ConvertResult>> {
  const r = await callExternalApi<ConvertResult>("frankfurter", "convert", { amount, from, to, date });
  if (r.ok && r.data && r.data.result == null) return { ok: false, data: null, code: "UPSTREAM", message: pickLang("Currency not supported by this service / العملة غير مدعومة في الخدمة") };
  if (r.ok || date) return r;
  // بديل بدون مفتاح (بيدعم EGP/SAR...) لو فرانكفورتر مقفولة أو مش بتدعم العملة
  const f = await getRatesFromFawaz(from);
  if (f.ok && f.data && f.data.rates[to.toLowerCase()] != null) {
    const rate = Number(f.data.rates[to.toLowerCase()]);
    return { ok: true, code: "OK", message: "", data: { amount, from: from.toUpperCase(), to: to.toUpperCase(), date: f.data.date, rate, result: amount * rate } };
  }
  return r;
}

/** سعر الصرف: 1 from = ? to  (تاريخ اختياري) */
export async function getExchangeRate(from: string, to: string, date?: string): Promise<ExternalApiResult<{ from: string; to: string; rate: number; date: string | null }>> {
  const r = await convertCurrency(1, from, to, date);
  if (!r.ok || !r.data || r.data.rate == null) return { ok: false, data: null, code: r.code, message: r.message };
  return { ok: true, code: "OK", message: "", data: { from: r.data.from, to: r.data.to, rate: r.data.rate, date: r.data.date } };
}

export interface RatesResult { base: string; date: string | null; rates: Record<string, number> }

export function getRatesFromFawaz(base: string): Promise<ExternalApiResult<RatesResult>> {
  return callExternalApi<RatesResult>("fawaz_currency", "latest", { base });
}

/** كل العملات (كود + اسم) — مناسبة لقائمة اختيار */
export async function getCurrencies(): Promise<ExternalApiResult<{ code: string; name: string }[]>> {
  const r = await callExternalApi<Record<string, string>>("fawaz_currency", "currencies");
  if (!r.ok || !r.data) return { ok: false, data: null, code: r.code, message: r.message };
  const list = Object.entries(r.data).filter(([k, v]) => /^[a-z]{3}$/.test(k) && !!v).map(([k, v]) => ({ code: k.toUpperCase(), name: String(v) }));
  return { ok: true, code: "OK", message: "", data: list };
}

// ------------------------------------------------------------------ الإجازات والدول
export interface Holiday { date: string; localName: string; name: string; countryCode: string; global: boolean; types: string[] }

export function getHolidays(year: number, country: string): Promise<ExternalApiResult<Holiday[]>> {
  return callExternalApi<Holiday[]>("nager_date", "holidays", { year, country });
}

export function getCountries(): Promise<ExternalApiResult<{ countryCode: string; name: string }[]>> {
  return callExternalApi("nager_date", "countries");
}

export function getCountryInfo(code: string): Promise<ExternalApiResult<any>> {
  return callExternalApi("nager_date", "countryInfo", { code });
}

// ------------------------------------------------------------------ التحقق
export interface IbanResult { valid: boolean; iban: string; messages: string[]; bank: { bankCode?: string; name?: string; bic?: string; city?: string; zip?: string } | null }
export function validateIban(iban: string): Promise<ExternalApiResult<IbanResult>> {
  return callExternalApi<IbanResult>("openiban", "validate", { iban });
}

export interface EmailResult { format: boolean; dns: boolean; disposable: boolean; domain: string }
export function validateEmail(email: string): Promise<ExternalApiResult<EmailResult>> {
  return callExternalApi<EmailResult>("disify", "validate", { email });
}

// ------------------------------------------------------------------ الصور (باركود / QR) — بترجّع data URI جاهز لـ <img src>
type ImageData = { contentType: string; base64: string };
const toDataUri = (r: ExternalApiResult<ImageData>): ExternalApiResult<string> =>
  r.ok && r.data ? { ok: true, code: "OK", message: "", data: `data:${r.data.contentType};base64,${r.data.base64}` } : { ok: false, data: null, code: r.code, message: r.message };

export type BarcodeType = "code128" | "code39" | "ean13" | "ean8" | "upca" | "upce" | "itf" | "codabar" | "auto";
export async function barcodeImageUrl(type: BarcodeType, data: string): Promise<ExternalApiResult<string>> {
  return toDataUri(await callExternalApi<ImageData>("barcodeapi", "image", { type, data }));
}

export async function qrImageUrl(data: string, size: "100x100" | "150x150" | "200x200" | "300x300" | "400x400" | "500x500" = "200x200"): Promise<ExternalApiResult<string>> {
  return toDataUri(await callExternalApi<ImageData>("qrserver", "image", { data, size }));
}

// ------------------------------------------------------------------ الموقع والطقس
export interface GeoPlace { name: string; lat: string; lon: string; type: string; address: any }
export function geocode(q: string, limit = 5): Promise<ExternalApiResult<GeoPlace[]>> {
  return callExternalApi<GeoPlace[]>("nominatim", "search", { q, limit });
}

export interface IpLocation { ip: string; country: string; countryCode: string; region: string; city: string; latitude: number; longitude: number; timezone: string; isp: string }
export function ipLocation(ip: string): Promise<ExternalApiResult<IpLocation>> {
  return callExternalApi<IpLocation>("ipwhois", "lookup", { ip });
}

export function getWeather(lat: number, lon: number): Promise<ExternalApiResult<{ current: { temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; time: string }; units: any }>> {
  return callExternalApi("openmeteo", "current", { lat, lon });
}
