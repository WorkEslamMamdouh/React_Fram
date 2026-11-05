"use client";

// =====================================================================================
//  AdminHttp.ts  -  نداءات منطقة الأدمن (بتوكن الأدمن X-Admin-Token بس، من غير JWT)
//  - AuthMode: "jwt" = مستخدم ERP عادي (Sys.CallApi)  |  "admin" = الأدمن (X-Admin-Token)
//  - التوكن محفوظ في الذاكرة بالسيرفر: بعد إعادة تشغيل الباك إند بيرجع 401 → بنمسح التوكن
//    ونوديه لصفحة دخول الأدمن برسالة واضحة.
// =====================================================================================

import api, { API_BASE_URL } from "../../../CallAPI/api";

export type AuthMode = "jwt" | "admin";

export const ADMIN_TOKEN_KEY = "admin_token";
export const ADMIN_MSG_KEY = "admin_login_msg";
export const ADMIN_EXPIRED_MSG = "Admin session expired (the server was restarted or the token expired). Please log in again. / انتهت جلسة الأدمن (السيرفر اتعمله إعادة تشغيل أو انتهت مدة التوكن). سجّل الدخول من جديد.";

export function getAdminToken(): string {
  try { return localStorage.getItem(ADMIN_TOKEN_KEY) || ""; } catch { return ""; }
}

/** يمسح توكن الأدمن ويحوّل لصفحة الدخول مع رسالة (مرة واحدة). */
export function adminSessionExpired(): never {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.setItem(ADMIN_MSG_KEY, ADMIN_EXPIRED_MSG);
  } catch { /* ignore */ }
  if (typeof window !== "undefined" && !window.location.pathname.includes("AdminLogin")) {
    window.location.replace("/ClientApp/AdminLogin/");
  }
  throw new Error(ADMIN_EXPIRED_MSG);
}

export function adminLogout() {
  try { localStorage.removeItem(ADMIN_TOKEN_KEY); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.location.replace("/ClientApp/AdminLogin/");
}

function parseBody(text: string): any {
  let body: any = text;
  try { body = JSON.parse(text); } catch { return text; }
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { /* keep */ } }
  return body;
}

/**
 * POST api/{controller}/{action} بتوكن الأدمن فقط (مفيش Authorization).
 * بيرجّع Response أو بيرمي Error برسالة السيرفر. 401 (HTTP أو داخل الـ body) = جلسة الأدمن خلصت.
 */
export async function adminFetch<T = any>(controller: string, action: string, data?: any): Promise<T> {
  const tok = getAdminToken();
  if (!tok) adminSessionExpired();
  const base = String((api as any).defaults?.baseURL || API_BASE_URL).replace(/\/?$/, "/");
  let res: Response;
  try {
    res = await fetch(`${base}${controller}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": tok },
      body: JSON.stringify(data ?? {}),
    });
  } catch (e: any) {
    throw new Error(e?.message || "Network error");
  }
  if (res.status === 401) adminSessionExpired();
  const body = parseBody(await res.text());
  if (body && typeof body === "object" && body.IsSuccess === false && Number(body.StatusCode) === 401) adminSessionExpired();
  if (!res.ok && !(body && typeof body === "object" && "IsSuccess" in body)) throw new Error(`HTTP ${res.status}`);
  if (!body || typeof body !== "object" || body.IsSuccess === false) throw new Error((body && body.ErrorMessage) || "Request failed");
  return body.Response as T;
}
