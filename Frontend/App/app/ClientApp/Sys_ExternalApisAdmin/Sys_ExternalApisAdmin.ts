"use client";

// =====================================================================================
//  Sys_ExternalApisAdmin.ts  -  لوجيك شاشة "الخدمات الخارجية (APIs)"  (المرحلة 9)
//  الباك إند: api/ExternalApis/{List, Toggle, SetKey, Test}
//  - تفعيل/إيقاف بضغطة واحدة، مفتاح الـ API (مخفي بعد الحفظ)، تجربة الاتصال، بحث وفلتر بالقسم.
//  - الصلاحية: دور أدمن (Sys_Role.IsAdmin) أو صلاحية على الشاشة Sys_ExternalApisAdmin — السيرفر هو اللي بيقرر
//    (canWrite جاي من السيرفر)، فالشاشة شغالة حتى قبل ما تتسجل في القايمة.
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import { BaseResponse } from "../Shared/Entities";
import { adminFetch, AuthMode } from "../Shared/AdminHttp";

export interface ApiOpInfo { name: string; descE: string; descA: string; params: { name: string; type: string; required: boolean }[] }
export interface ApiCard {
  code: string; nameA: string; nameE: string; category: string; icon: string; descA: string; descE: string;
  noteA: string | null; noteE: string | null; docsUrl: string; authType: string; requiresKey: boolean; priority: number;
  rateLimitPerMin: number; cacheMinutes: number; ops: ApiOpInfo[];
  enabled: boolean; hasKey: boolean; keyMasked: string | null;
  lastTestAt: string | null; lastTestOk: boolean | null; lastTestMs: number | null; lastTestMsg: string | null;
}

export const CATEGORIES: { code: string; en: string; ar: string; icon: string }[] = [
  { code: "finance", en: "Finance & currencies", ar: "المالية والعملات", icon: "fa-coins" },
  { code: "calendar", en: "Calendar & holidays", ar: "التقويم والإجازات", icon: "fa-calendar-days" },
  { code: "validation", en: "Validation", ar: "التحقق من البيانات", icon: "fa-circle-check" },
  { code: "images", en: "Barcode & QR", ar: "الباركود و QR", icon: "fa-qrcode" },
  { code: "geo", en: "Location & weather", ar: "المواقع والطقس", icon: "fa-location-dot" },
];

async function callBase<T = any>(action: string, data?: any, mode: AuthMode = "jwt"): Promise<T> {
  if (mode === "admin") return adminFetch<T>("ExternalApis", action, data);
  let res: BaseResponse<any>;
  try {
    res = await Sys.CallApi<BaseResponse<any>>({ method: "POST", controller: "ExternalApis", action, data: data ?? {} });
  } catch (e: any) {
    throw new Error(typeof e === "string" ? e : e?.message || "Request failed");
  }
  if (!res || res.IsSuccess === false) throw new Error((res as any)?.ErrorMessage || "Request failed");
  return (res as any).Response as T;
}

export function Sys_ExternalApisAdmin(mode: AuthMode = "jwt") {
  const call = <T = any>(action: string, data?: any) => callBase<T>(action, data, mode);
  const didRun = useRef(false);
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  /** رسائل السيرفر "English / عربي" */
  const pick = (m: string) => { const i = (m || "").lastIndexOf(" / "); return i < 0 ? m : IsLangEN ? m.slice(0, i) : m.slice(i + 3); };

  const [apis, setApis] = useState<ApiCard[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [storage, setStorage] = useState("json");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState<Record<string, string>>({});          // code -> toggle | key | test
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  async function Load() {
    setLoading(true); setLoadError("");
    try {
      const res = await call<{ apis: ApiCard[]; canWrite: boolean; storage: string }>("List");
      setApis(res.apis); setCanWrite(res.canWrite); setStorage(res.storage);
    } catch (e: any) { setLoadError(pick(e?.message || "Request failed")); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    Load();
  }, []);

  const setBusyFor = (code: string, v: string | null) => setBusy((b) => { const n = { ...b }; if (v) n[code] = v; else delete n[code]; return n; });
  const patch = (code: string, p: Partial<ApiCard>) => setApis((l) => l.map((a) => (a.code === code ? { ...a, ...p } : a)));
  const err = (e: any) => { const m = pick(e?.message || String(e)); Sys.ShowMessage(m, m, "error"); };

  async function Toggle(a: ApiCard) {
    if (!canWrite || busy[a.code]) return;
    const next = !a.enabled;
    if (next && a.requiresKey && !a.hasKey) {
      Sys.ShowMessage("Save the API key first", "احفظ المفتاح (API key) الأول", "warning");
      return;
    }
    patch(a.code, { enabled: next });                                   // optimistic
    setBusyFor(a.code, "toggle");
    try {
      await call("Toggle", { code: a.code, enabled: next });
      Sys.ShowMessage(next ? "Service enabled" : "Service disabled", next ? "تم تفعيل الخدمة" : "تم إيقاف الخدمة", "success");
    } catch (e) { patch(a.code, { enabled: !next }); err(e); }
    finally { setBusyFor(a.code, null); }
  }

  async function SaveKey(a: ApiCard, remove = false) {
    if (!canWrite || busy[a.code]) return;
    const key = remove ? "" : (keyInputs[a.code] || "").trim();
    if (!remove && !key) { Sys.ShowMessage("Enter the API key", "اكتب المفتاح", "warning"); return; }
    setBusyFor(a.code, "key");
    try {
      const r = await call<{ hasKey: boolean; keyMasked: string | null }>("SetKey", { code: a.code, key });
      patch(a.code, { hasKey: r.hasKey, keyMasked: r.keyMasked, ...(remove ? { enabled: false } : {}) });
      setKeyInputs((k) => ({ ...k, [a.code]: "" }));
      Sys.ShowMessage(remove ? "Key removed" : "Key saved", remove ? "تم مسح المفتاح" : "تم حفظ المفتاح", "success");
    } catch (e) { err(e); }
    finally { setBusyFor(a.code, null); }
  }

  async function Test(a: ApiCard) {
    if (!canWrite || busy[a.code]) return;
    setBusyFor(a.code, "test");
    try {
      const r = await call<{ ok: boolean; ms: number; message: string; lastTestAt: string }>("Test", { code: a.code });
      patch(a.code, { lastTestAt: r.lastTestAt, lastTestOk: r.ok, lastTestMs: r.ms, lastTestMsg: r.message });
    } catch (e) { err(e); }
    finally { setBusyFor(a.code, null); }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apis.filter((a) =>
      (category === "all" || a.category === category) &&
      (!q || [a.code, a.nameA, a.nameE, a.descA, a.descE].some((x) => (x || "").toLowerCase().includes(q))));
  }, [apis, search, category]);

  const groups = useMemo(
    () => CATEGORIES.map((c) => ({ ...c, items: filtered.filter((a) => a.category === c.code) })).filter((g) => g.items.length > 0),
    [filtered]);

  const counts = useMemo(() => ({ total: apis.length, enabled: apis.filter((a) => a.enabled).length }), [apis]);

  return {
    t, IsLangEN, apis, filtered, groups, counts, canWrite, storage, loading, loadError,
    search, setSearch, category, setCategory, busy, keyInputs, setKeyInputs, showKey, setShowKey,
    Load, Toggle, SaveKey, Test,
  };
}
