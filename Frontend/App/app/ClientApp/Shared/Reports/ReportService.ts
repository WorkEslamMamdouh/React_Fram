"use client";

// =====================================================================================
//  ReportService.ts  -  تشغيل تقرير + اختيار التصميم + بناء تقرير Stimulsoft
//   resolveParamValues : يطلّع قيم باراميترات الإجراء من (فلاتر الشاشة | الجلسة | الصف/TrID)
//   prepareReport      : run (الباك) + resolve-layout (الأخص يكسب: فرع > شركة > الكل) + بناء التقرير
//  الاستخدام من الشاشات: openReport({ reportCode, filters | row }) في openReport.tsx
// =====================================================================================

import { useSys } from "../SystemUsing";
import { ReportsApi } from "./ReportApi";
import { buildDefaultReport } from "./defaultLayout";
import { applyPaper, registerData } from "./stimulsoft";
import {
  LayoutMeta, Margins, OpenReportOptions, OrientationKey, PaperSizeKey, ReportDef, RunResult, parseMargins,
} from "./ReportTypes";

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
    else if (p.Source === "trid") v = lookupCI(ctx.row, p.SourceValue) ?? ctx.trId;
    else {
      const m = /^(.*)\.(from|to)$/i.exec(p.SourceValue || "");
      const base = lookupCI(ctx.filters, p.SourceValue);
      if (base === undefined && m) {
        const rng = lookupCI(ctx.filters, m[1]);
        v = rng && typeof rng === "object" ? rng[m[2].toLowerCase()] : undefined;
      } else if (base && typeof base === "object" && !Array.isArray(base) && !(base instanceof Date)) {
        v = base.from ?? base.value;          // مدى تاريخ من غير تحديد from/to = البداية
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

export interface PreparedReport {
  report: any;
  def: ReportDef;
  run: RunResult;
  layout: LayoutMeta | null;
  paper: PaperSizeKey;
  orientation: OrientationKey;
  margins: Margins;
}

export function tablesForRegister(run: RunResult) {
  const t = run.Tables.map((x) => ({ name: x.Name, rows: x.Rows, columns: x.Columns.map((c) => c.Name) }));
  t.push({ name: "Company", rows: [run.Company], columns: Object.keys(run.Company) });
  const pr: Record<string, any> = { ReportCode: run.ReportCode, ...run.Params };
  t.push({ name: "Params", rows: [pr], columns: Object.keys(pr) });
  return t;
}

/** بيبني StiReport من نتيجة run + تصميم محفوظ (لو فيه) أو التصميم التلقائي. */
export function buildReportObject(S: any, def: ReportDef, run: RunResult, layout: LayoutMeta | null, isEN: boolean, paramsText: string,
  override?: { paper: PaperSizeKey; orientation: OrientationKey; margins: Margins }): PreparedReport {
  const register = (rep: any) => registerData(S, rep, tablesForRegister(run));
  const cols = run.Tables[0]?.Columns || [];
  let paper: PaperSizeKey = layout?.PaperSize || "A4";
  let orientation: OrientationKey = layout?.Orientation || (cols.length > 8 ? "landscape" : "portrait");
  let margins = parseMargins(layout?.MarginsJson);
  if (override) { paper = override.paper; orientation = override.orientation; margins = override.margins; }

  let report: any;
  if (layout?.LayoutMrt) {
    report = new S.Report.StiReport();
    report.load(layout.LayoutMrt);
    register(report);
    if (override) applyPaper(S, report, paper, orientation, margins);   // المقاس المحفوظ في التصميم بيفضل إلا لو اليوزر غيّره
  } else {
    report = buildDefaultReport(S, {
      title: (isEN ? run.NameE : run.NameA) || def.ReportCode,
      columns: cols, isEN, paper, orientation, margins, paramsText, register,
    });
  }
  return { report, def, run, layout, paper, orientation, margins };
}

export async function runAndResolve(reportCode: string, params: Record<string, any>) {
  const env: any = useSys.getState().Session?.CurrentEnvironment;
  const comp = env?.CompCode ?? 0, branch = env?.BranchCode ?? 0;
  const [run, lay] = await Promise.all([
    ReportsApi.run(reportCode, comp, branch, params),
    ReportsApi.resolveLayout(reportCode, comp, branch),
  ]);
  return { run, layout: lay.Layout || null, comp, branch };
}
