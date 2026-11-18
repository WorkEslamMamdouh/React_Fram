"use client";

// =====================================================================================
//  ReportApi.ts  -  نداءات ReportsController (api/Reports/*) بالـ JWT العادي
//  الرن تايم بيقرا بس: config / get-report / resolve-layout / run
//  (تعريف التقارير وتصميمها بقى في ERP Studio)
// =====================================================================================

import { Sys } from "../SystemTools";
import { BaseResponse } from "../Entities";
import { LayoutMeta, ReportDef, RunResult } from "./ReportTypes";

function unwrap<T>(res: any): T {
  if (typeof res === "string") {
    try { res = JSON.parse(res); } catch { /* ignore */ }
  }
  if (!res || res.IsSuccess === false) throw new Error((res as any)?.ErrorMessage || "Request failed");
  return (res as any).Response as T;
}

/** نداء بالـ JWT. بيرمي Error برسالة واضحة. */
export async function reportsCall<T = any>(action: string, data?: any): Promise<T> {
  let res: BaseResponse<any>;
  try {
    res = await Sys.CallApi<BaseResponse<any>>({ method: "POST", controller: "Reports", action, data: data ?? {} });
  } catch (e: any) {
    throw new Error(typeof e === "string" ? e : e?.message || "Request failed");
  }
  return unwrap<T>(res);
}

export const ReportsApi = {
  config: () => reportsCall<{ RowCap: number }>("config"),
  getReport: (ReportCode: string) => reportsCall<ReportDef>("get-report", { ReportCode }),
  resolveLayout: (ReportCode: string, CompCode: number, BranchCode: number) =>
    reportsCall<{ Layout: LayoutMeta | null }>("resolve-layout", { ReportCode, CompCode, BranchCode }),
  run: (ReportCode: string, CompCode: number, BranchCode: number, Params: Record<string, any>) =>
    reportsCall<RunResult>("run", { ReportCode, CompCode, BranchCode, Params }),
};
