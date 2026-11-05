"use client";

// =====================================================================================
//  ReportApi.ts  -  نداءات ReportsController (api/Reports/*)
//  - reportsCall: بـ JWT العادي (Sys.CallApi) — للطباعة وشاشة إدارة التقارير
//  - reportsCallAdminToken: بـ X-Admin-Token — للـ ScreenBuilder (أدمن مش بالضرورة عنده JWT)
// =====================================================================================

import api from "../../../../CallAPI/api";
import { Sys } from "../SystemTools";
import { BaseResponse } from "../Entities";
import {
  LayoutMeta, ProcInfo, ReportDef, ReportLookups, ReportsConfig, RunResult,
} from "./ReportTypes";

function unwrap<T>(res: any): T {
  if (typeof res === "string") {
    try { res = JSON.parse(res); } catch { /* ignore */ }
  }
  if (!res || res.IsSuccess === false) throw new Error((res as any)?.ErrorMessage || "Request failed");
  return (res as any).Response as T;
}

/** نداء عادي بالـ JWT. بيرمي Error برسالة واضحة. */
export async function reportsCall<T = any>(action: string, data?: any): Promise<T> {
  let res: BaseResponse<any>;
  try {
    res = await Sys.CallApi<BaseResponse<any>>({ method: "POST", controller: "Reports", action, data: data ?? {} });
  } catch (e: any) {
    throw new Error(typeof e === "string" ? e : e?.message || "Request failed");
  }
  return unwrap<T>(res);
}

/** نداء بتوكن الأدمن (ScreenBuilder). */
export async function reportsCallAdminToken<T = any>(action: string, data?: any): Promise<T> {
  let tok = "";
  try { tok = localStorage.getItem("admin_token") || ""; } catch { /* ignore */ }
  try {
    const r = await api.post(`Reports/${action}`, data ?? {}, { headers: { "X-Admin-Token": tok } });
    return unwrap<T>(r.data);
  } catch (e: any) {
    if (e?.response?.status === 401) throw new Error("Admin login expired - open AdminLogin / سجّل دخول الأدمن من جديد");
    throw new Error(e?.message || "Request failed");
  }
}

export const ReportsApi = {
  config: () => reportsCall<ReportsConfig>("config"),
  listReports: () => reportsCall<{ Mode: string; Reports: ReportDef[] }>("list-reports"),
  getReport: (ReportCode: string) => reportsCall<ReportDef>("get-report", { ReportCode }),
  saveReport: (def: ReportDef) => reportsCall<ReportDef>("save-report", def),
  deleteReport: (ReportCode: string) => reportsCall<boolean>("delete-report", { ReportCode }),
  listLayouts: (ReportCode: string) => reportsCall<LayoutMeta[]>("list-layouts", { ReportCode }),
  getLayout: (LayoutId: number) => reportsCall<LayoutMeta>("get-layout", { LayoutId }),
  saveLayout: (l: Partial<LayoutMeta>) => reportsCall<{ LayoutId: number }>("save-layout", l),
  deleteLayout: (LayoutId: number) => reportsCall<boolean>("delete-layout", { LayoutId }),
  setDefaultLayout: (LayoutId: number) => reportsCall<boolean>("set-default-layout", { LayoutId }),
  duplicateLayout: (LayoutId: number, Scope?: string, CompCode?: number | null, BranchCode?: number | null) =>
    reportsCall<{ LayoutId: number }>("duplicate-layout", { LayoutId, Scope, CompCode, BranchCode }),
  resolveLayout: (ReportCode: string, CompCode: number, BranchCode: number) =>
    reportsCall<{ Layout: LayoutMeta | null }>("resolve-layout", { ReportCode, CompCode, BranchCode }),
  procs: () => reportsCall<string[]>("procs"),
  procParams: (Name: string) => reportsCall<ProcInfo>("proc-params", { Name }),
  lookups: () => reportsCall<ReportLookups>("lookups"),
  run: (ReportCode: string, CompCode: number, BranchCode: number, Params: Record<string, any>, Sample = false) =>
    reportsCall<RunResult>("run", { ReportCode, CompCode, BranchCode, Params, Sample }),
};
