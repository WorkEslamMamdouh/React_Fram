"use client";

// =====================================================================================
//  ReportApi.ts  -  نداءات ReportsController (api/Reports/*)
//  - reportsCall: بـ JWT العادي (Sys.CallApi) — للطباعة وشاشة إدارة التقارير
//  - reportsCallAdminToken: بـ X-Admin-Token — للـ ScreenBuilder (أدمن مش بالضرورة عنده JWT)
// =====================================================================================

import { adminFetch, AuthMode } from "../AdminHttp";
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

/** نداء بتوكن الأدمن (ScreenBuilder / منطقة الأدمن). 401 = الجلسة خلصت → تحويل لصفحة دخول الأدمن. */
export async function reportsCallAdminToken<T = any>(action: string, data?: any): Promise<T> {
  return adminFetch<T>("Reports", action, data);
}

export type ReportsApiType = ReturnType<typeof createReportsApi>;

/** mode = "jwt" (شاشات الـ ERP) أو "admin" (منطقة الأدمن بتوكن الأدمن). */
export function createReportsApi(mode: AuthMode = "jwt") {
  const call = <T = any>(action: string, data?: any): Promise<T> => (mode === "admin" ? reportsCallAdminToken<T>(action, data) : reportsCall<T>(action, data));
  return {
  config: () => call<ReportsConfig>("config"),
  listReports: () => call<{ Mode: string; Reports: ReportDef[] }>("list-reports"),
  getReport: (ReportCode: string) => call<ReportDef>("get-report", { ReportCode }),
  saveReport: (def: ReportDef) => call<ReportDef>("save-report", def),
  deleteReport: (ReportCode: string) => call<boolean>("delete-report", { ReportCode }),
  listLayouts: (ReportCode: string) => call<LayoutMeta[]>("list-layouts", { ReportCode }),
  getLayout: (LayoutId: number) => call<LayoutMeta>("get-layout", { LayoutId }),
  saveLayout: (l: Partial<LayoutMeta>) => call<{ LayoutId: number }>("save-layout", l),
  deleteLayout: (LayoutId: number) => call<boolean>("delete-layout", { LayoutId }),
  setDefaultLayout: (LayoutId: number) => call<boolean>("set-default-layout", { LayoutId }),
  duplicateLayout: (LayoutId: number, Scope?: string, CompCode?: number | null, BranchCode?: number | null) =>
    call<{ LayoutId: number }>("duplicate-layout", { LayoutId, Scope, CompCode, BranchCode }),
  resolveLayout: (ReportCode: string, CompCode: number, BranchCode: number) =>
    call<{ Layout: LayoutMeta | null }>("resolve-layout", { ReportCode, CompCode, BranchCode }),
  procs: () => call<string[]>("procs"),
  procParams: (Name: string) => call<ProcInfo>("proc-params", { Name }),
  lookups: () => call<ReportLookups>("lookups"),
  run: (ReportCode: string, CompCode: number, BranchCode: number, Params: Record<string, any>, Sample = false, UserId = 0) =>
    call<RunResult>("run", { ReportCode, CompCode, BranchCode, Params, Sample, UserId }),
};
}

export const ReportsApi = createReportsApi("jwt");
