"use client";

// =====================================================================================
//  printSync.ts  -  ربط إعدادات الطباعة في ScreenBuilder بتعريف تقرير في إدارة التقارير
//  (بيشتغل بتوكن الأدمن X-Admin-Token). المصمم/التصاميم بتتعمل بعدين من شاشة Sys_ReportsAdmin.
// =====================================================================================

import { reportsCallAdminToken } from "./ReportApi";
import { ReportDef, ReportKind, ReportParamDef } from "./ReportTypes";

export const cleanReportCode = (s: string) => (s || "").replace(/[^A-Za-z0-9_\-]/g, "");
export const defaultReportCode = (module: string, kind: ReportKind) => cleanReportCode(`${module}_${kind === "list" ? "List" : "Print"}`);

export interface PrintProcLike {
  proc: string;
  params: { name: string; source: string; value: string }[];
  reportCode?: string;
}

/** ينشئ/يحدّث تعريف التقرير (الإجراء + ربط الباراميترات) ويرجّع الكود. بيرمي Error برسالة واضحة. */
export async function syncPrintReport(a: {
  module: string; titleAr: string; titleEn: string; kind: ReportKind; usePermissions: boolean; pc: PrintProcLike;
}): Promise<string> {
  const code = cleanReportCode(a.pc.reportCode || "") || defaultReportCode(a.module, a.kind);
  if (!a.pc.proc.trim()) throw new Error("Choose the stored procedure first / اختار الإجراء المخزن الأول");
  const params: ReportParamDef[] = a.pc.params
    .filter((p) => p.name.trim())
    .map((p, i) => ({
      ParamName: p.name.trim().replace(/^@/, ""),
      Source: p.source === "row" ? "trid" : (p.source as ReportParamDef["Source"]),
      SourceValue: p.value,
      SortOrder: i + 1,
    }));
  const suffixAr = a.kind === "list" ? "قائمة" : "طباعة";
  const suffixEn = a.kind === "list" ? "List" : "Print";
  const def: ReportDef = {
    ReportCode: code,
    NameA: `${a.titleAr || a.module} - ${suffixAr}`,
    NameE: `${a.titleEn || a.module} - ${suffixEn}`,
    Kind: a.kind,
    MODULE_CODE: a.usePermissions ? a.module : "",
    ProcName: a.pc.proc.trim(),
    IsActive: true,
    Params: params,
  };
  try {
    const old = await reportsCallAdminToken<ReportDef>("get-report", { ReportCode: code });
    if (old) { def.NameA = old.NameA || def.NameA; def.NameE = old.NameE || def.NameE; def.IsActive = old.IsActive; }   // مانغيّرش اسم عدّله الأدمن
  } catch { /* new report */ }
  await reportsCallAdminToken("save-report", def);
  return code;
}
