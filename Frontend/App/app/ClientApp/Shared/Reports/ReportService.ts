"use client";

// =====================================================================================
//  ReportService.ts  -  تشغيل تقرير + اختيار التصميم (JSON) + تجهيز البيانات للعارض
//   resolveParamValues : قيم باراميترات الإجراء من (فلاتر الشاشة | الجلسة | الصف/TrID)
//   runAndResolve      : run (الباك) + resolve-layout (الأخص يكسب: فرع > شركة > الكل)
//   prepareReport      : تصميم JSON المحفوظ، أو تصميم تلقائي (تقرير جديد / تصميم Stimulsoft قديم)
// =====================================================================================

import { useSys } from "../SystemUsing";
import { ReportsApi } from "./ReportApi";
import { buildAutoLayout } from "./autoLayout";
import type { PagePreset, ReportData, ReportLayout } from "./ReportLayoutTypes";
import { PAGE_PRESETS } from "./renderer/paper";
import { LayoutMeta, OpenReportOptions, ReportDef, RunResult } from "./ReportTypes";

const pad = (n: number) => String(n).padStart(2, "0");
export function toParamText(v: any): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (Array.isArray(v)) return v.map((x) => toParamText(x) ?? "").filter(Boolean).join(",") || null;
  if (typeof v === "object") return toParamText((v as any).value ?? (v as any).from ?? null);
  if (typeof v === "boolean") return v ? "1" : "0";
  return String(v);
}

function lookupCI(o: Record<string, any> | undefined, key: string): any {
  if (!o) return undefined;
  if (key in o) return o[key];
  const k = Object.keys(o).find((x) => x.toLowerCase() === key.toLowerCase());
  return k ? o[k] : undefined;
}

function sessionValue(name: string): any {
  const env: any = useSys.getState().Session?.CurrentEnvironment;
  switch (name) {
    case "CompCode": return env?.CompCode;
    case "BranchCode": return env?.BranchCode;
    case "UserID": return env?.UserID;
    case "FinYear": return env?.FinYear;
    case "Today": return toParamText(new Date());
    default: return undefined;
  }
}

/** قيم الباراميترات اللي الكلاينت يعرفها (الباك بيفرض const و CompCode/BranchCode/UserID بنفسه) */
export function resolveParamValues(def: ReportDef, ctx: Pick<OpenReportOptions, "filters" | "row" | "trId">): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const p of def.Params || []) {
    let v: any;
    if (p.Source === "session") v = sessionValue(p.SourceValue);
    else if (p.Source === "const") v = p.SourceValue;
    else if (p.Source === "trid") v = (p.SourceValue ? lookupCI(ctx.row, p.SourceValue) : undefined) ?? ctx.trId;
    else {
      const m = /^(.*)\.(from|to)$/i.exec(p.SourceValue || "");
      const base = lookupCI(ctx.filters, p.SourceValue);
      if (base === undefined && m) {
        const rng = lookupCI(ctx.filters, m[1]);
        v = rng && typeof rng === "object" ? rng[m[2].toLowerCase()] : undefined;
      } else if (base && typeof base === "object" && !Array.isArray(base) && !(base instanceof Date)) {
        // مدى تاريخ من غير تحديد from/to: الباراميتر اللي اسمه بيبدأ بـ To (زي ToDate) ياخد النهاية، والباقي البداية
        v = /^[Tt]o[A-Z_]/.test(p.ParamName) && base.to !== undefined ? base.to : (base.from ?? base.value);
      } else v = base;
    }
    out[p.ParamName] = toParamText(v);
  }
  return out;
}

export function paramsSummary(def: ReportDef, vals: Record<string, any>): string {
  return (def.Params || [])
    .filter((p) => p.Source === "filter" && vals[p.ParamName] != null && vals[p.ParamName] !== "")
    .map((p) => `${p.SourceValue || p.ParamName}: ${vals[p.ParamName]}`)
    .join(" | ");
}

export async function runAndResolve(reportCode: string, params: Record<string, any>) {
  const env: any = useSys.getState().Session?.CurrentEnvironment;
  const comp = env?.CompCode ?? 0, branch = env?.BranchCode ?? 0;
  const [run, lay] = await Promise.all([
    ReportsApi.run(reportCode, comp, branch, params),
    ReportsApi.resolveLayout(reportCode, comp, branch),
  ]);
  return { run, layout: lay.Layout || null };
}

/** بيانات العارض من نتيجة run: Data, Data2... + Company + Params */
export function runToData(run: RunResult): ReportData {
  const tables: Record<string, any[]> = {};
  for (const t of run.Tables || []) tables[t.Name] = t.Rows || [];
  return { tables, company: run.Company || {}, params: { ReportCode: run.ReportCode, ...(run.Params || {}) } };
}

/**
 * صف "Company" (نفس مفاتيح ReportsController.run) من Sys_Company / Sys_Branch —
 * للطباعة المباشرة بـ openLayoutReport من غير تعريف تقرير.
 */
export async function loadCompanyRow(): Promise<Record<string, any>> {
  const env: any = useSys.getState().Session?.CurrentEnvironment;
  const comp = Number(env?.CompCode) || 0, branch = Number(env?.BranchCode) || 0;
  const rows = (r: any) => (Array.isArray(r?.data) ? r.data : []);
  const { SQL } = await import("../CallDataBase");
  const [c, b] = await Promise.all([
    SQL.Select("Sys_Company", `CompCode = ${comp}`).then(rows).catch(() => []),
    SQL.Select("Sys_Branch", `CompCode = ${comp} AND BranchCode = ${branch}`).then(rows).catch(() => []),
  ]);
  const cr: any = c[0] ?? {}, br: any = b[0] ?? {};
  const s = (v: any) => (v == null ? "" : String(v));
  const now = new Date();
  return {
    CompCode: comp, BranchCode: branch,
    CompNameA: s(cr.NameA), CompNameE: s(cr.NameE), CompAddress: s(cr.Address), CompTel: s(cr.Tel), CompEmail: s(cr.Email), CompWebSite: s(cr.WebSite),
    BranchNameA: s(br.BranchDescA), BranchNameE: s(br.BranchDescE), BranchTel: s(br.Tel), BranchEmail: s(br.Email),
    BranchAddress: [s(br.Address_Street), s(br.Address_City)].filter(Boolean).join(", "),
    VatNo: s(br.GroupVatNo),
    PrintedBy: s(env?.Sys_CompanyAndUser?.USER_CODE ?? env?.Sys_CompanyAndUser?.USER_NAME ?? ""),
    PrintedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    LogoBase64: "",
  };
}

export interface PreparedReport {
  layout: ReportLayout;
  data: ReportData;
  /** true = التصميم التلقائي */
  isAuto: boolean;
  /** سبب التصميم التلقائي (لو فيه) */
  notice: { en: string; ar: string } | null;
}

/** التصميم المحفوظ (JSON) لو صالح، وإلا التصميم التلقائي من أعمدة النتيجة */
export function prepareReport(def: ReportDef | null, run: RunResult, meta: LayoutMeta | null, isEN: boolean, paramsText: string, title?: string): PreparedReport {
  const data = runToData(run);
  let notice: PreparedReport["notice"] = null;
  if (meta && (meta.LayoutFormat || "").toLowerCase() === "json" && meta.LayoutJson) {
    try {
      const layout = JSON.parse(meta.LayoutJson) as ReportLayout;
      if (!layout || !Array.isArray(layout.bands) || !layout.page) throw new Error("bad layout");
      return { layout, data, isAuto: false, notice: null };
    } catch (e) {
      console.warn("[Reports] saved JSON layout is invalid, using the auto layout", e);
      notice = { en: "The saved layout is invalid — showing the automatic layout.", ar: "التصميم المحفوظ تالف — بيتعرض التصميم التلقائي." };
    }
  } else if (meta) {
    notice = { en: "This report still has an old Stimulsoft layout — showing the automatic layout until a new one is designed in ERP Studio.", ar: "التقرير ده لسه عليه تصميم Stimulsoft قديم — بيتعرض التصميم التلقائي لحد ما يتعمل تصميم جديد من ERP Studio." };
  }
  const paper = meta?.PaperSize && (meta.PaperSize in PAGE_PRESETS) ? (meta.PaperSize as PagePreset) : "A4";
  const layout = buildAutoLayout({
    title: title || (isEN ? run.NameE : run.NameA) || def?.ReportCode || run.ReportCode,
    columns: run.Tables[0]?.Columns || [],
    isEN, paper, orientation: meta?.Orientation, paramsText, table: run.Tables[0]?.Name || "Data",
  });
  return { layout, data, isAuto: true, notice };
}
