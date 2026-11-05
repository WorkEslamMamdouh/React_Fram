"use client";

// =====================================================================================
//  ReportDesigner.tsx  -  مصمم التقارير (Stimulsoft Designer) بملء الشاشة
//   مصدر البيانات: أعمدة نتيجة الإجراء (Data) + بيانات الشركة (Company) + الباراميترات (Params)
//   - لو SQL Server ماقدرش يوصف الأعمدة: زر "تشغيل عيّنة" (بقيم باراميترات يكتبها الأدمن) — ماينفّذش حاجة تلقائي
//   - الحفظ: النطاق (الكل / شركة / فرع) + المقاس والاتجاه والهوامش بتتقرا من الصفحة نفسها
//   - تصميم قديم: layoutId → بيتحمّل ويتعدّل. تصميم جديد: تصميم تلقائي (جدول بكل الأعمدة) تعدّل عليه.
// =====================================================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSys } from "../SystemUsing";
import { Sys } from "../SystemTools";
import { ReportsApi } from "./ReportApi";
import { buildDefaultReport } from "./defaultLayout";
import { loadStimulsoft, registerData } from "./stimulsoft";
import { tablesForRegister } from "./ReportService";
import {
  DEFAULT_MARGINS, LayoutMeta, Margins, OrientationKey, PAPER_PRESETS, PaperSizeKey, ReportDef, ReportLookups, ReportScope, RunResult,
} from "./ReportTypes";

const inp = "h-9 rounded-lg border border-erp-border-strong bg-erp-surface px-2 text-[13px] text-erp-text focus:outline-none focus:border-erp-accent";
const btn = "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const btnOutline = `${btn} border border-erp-border bg-erp-surface text-erp-text hover:bg-erp-surface-2`;
const btnAccent = `${btn} bg-erp-accent text-white hover:bg-erp-accent-hover`;

export interface ReportDesignerProps {
  reportCode: string;
  layoutId?: number;
  initialScope?: ReportScope;
  initialComp?: number | null;
  initialBranch?: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

function netType(sqlType: string): string {
  const t = (sqlType || "").toLowerCase();
  if (/^(bigint|int|smallint|tinyint)/.test(t)) return "Int32";
  if (/^(decimal|numeric|money|smallmoney|float|real)/.test(t)) return "Decimal";
  if (/^(date|datetime|smalldatetime|datetime2)/.test(t)) return "DateTime";
  if (/^bit/.test(t)) return "Boolean";
  return "String";
}
function sampleOf(type: string): any {
  switch (type) {
    case "Int32": return 1;
    case "Decimal": return 1234.5;
    case "DateTime": return "2026-01-01T00:00:00";
    case "Boolean": return true;
    default: return "Sample";
  }
}

const SAMPLE_COMPANY = {
  CompCode: 1, BranchCode: 1, CompNameA: "اسم الشركة", CompNameE: "Company name", CompAddress: "Address", CompTel: "000", CompFax: "000",
  CompEmail: "info@example.com", CompWebSite: "www.example.com", BranchNameA: "اسم الفرع", BranchNameE: "Branch name", BranchTel: "000",
  BranchFax: "000", BranchEmail: "", BranchWebSite: "", BranchAddress: "Branch address", VatNo: "000000000", PrintedBy: "user", PrintedAt: "2026-01-01 10:00", LogoBase64: "",
};

function fakeRun(def: ReportDef, cols: { Name: string; SqlType: string }[]): RunResult {
  const columns = (cols.length ? cols : [{ Name: "Value", SqlType: "nvarchar" }]).map((c) => ({ Name: c.Name || "Column", Type: netType(c.SqlType), SqlType: c.SqlType }));
  const row: Record<string, any> = {};
  columns.forEach((c) => (row[c.Name] = sampleOf(c.Type)));
  return {
    ReportCode: def.ReportCode, Kind: def.Kind, NameA: def.NameA, NameE: def.NameE,
    Tables: [{ Name: "Data", Columns: columns, Rows: [row] }], Params: {}, Company: SAMPLE_COMPANY,
    Truncated: false, RowCap: 0, ElapsedMs: 0, Warning: "",
  };
}

export default function ReportDesigner(props: ReportDesignerProps) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const hostRef = useRef<HTMLDivElement>(null);
  const SRef = useRef<any>(null);
  const designerRef = useRef<any>(null);
  const defRef = useRef<ReportDef | null>(null);
  const colsRef = useRef<{ Name: string; SqlType: string }[]>([]);
  const lastRunRef = useRef<RunResult | null>(null);
  const seq = useRef(0);
  const saveRef = useRef<((r: any) => Promise<void>) | null>(null);

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [def, setDef] = useState<ReportDef | null>(null);
  const [lookups, setLookups] = useState<ReportLookups | null>(null);
  const [layoutId, setLayoutId] = useState(props.layoutId || 0);
  const [scope, setScope] = useState<ReportScope>(props.initialScope || "all");
  const [comp, setComp] = useState<number | null>(props.initialComp ?? null);
  const [branch, setBranch] = useState<number | null>(props.initialBranch ?? null);
  const [isDefault, setIsDefault] = useState(true);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleVals, setSampleVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ---------- تركيب المصمم على تقرير
  const mount = useCallback((S: any, report: any) => {
    const host = hostRef.current;
    if (!host) return;
    try { designerRef.current?.dispose?.(); } catch { /* ignore */ }
    host.innerHTML = "";
    const holder = document.createElement("div");
    const n = ++seq.current;
    holder.id = "erp-report-designer-holder-" + n;   // لازم يختلف عن designerId (Stimulsoft بيشيل أي عنصر ليه نفس الـ id)
    holder.style.height = "100%";
    host.appendChild(holder);
    const o = new S.Designer.StiDesignerOptions();
    const set = (f: () => void) => { try { f(); } catch { /* option not available */ } };
    set(() => { o.appearance.fullScreenMode = false; o.width = "100%"; o.height = "100%"; });
    set(() => { o.appearance.rightToLeft = !IsLangEN; });
    set(() => { o.toolbar.showFileMenuExit = false; o.toolbar.showFileMenuNew = false; o.toolbar.showFileMenuOpen = false; });
    const d = new S.Designer.StiDesigner(o, "erp-report-designer-" + n, false);
    d.onSaveReport = (args: any, cb: () => void) => { void saveRef.current?.(args?.report || d.report).then(() => cb?.()); };
    d.onSaveAsReport = d.onSaveReport;
    d.report = report;
    d.renderHtml(holder);
    designerRef.current = d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IsLangEN]);

  // ---------- تحميل الأساسيات
  useEffect(() => {
    let off = false;
    const prevTitle = document.title;     // Stimulsoft بيغيّر عنوان التاب ومابيرجّعوش
    (async () => {
      try {
        const [d, lk] = await Promise.all([ReportsApi.getReport(props.reportCode), ReportsApi.lookups()]);
        if (off) return;
        setDef(d); defRef.current = d; setLookups(lk);
        const S = await loadStimulsoft(true);
        SRef.current = S;
        let cols: { Name: string; SqlType: string }[] = [];
        if (d.ProcName) {
          try {
            const pi = await ReportsApi.procParams(d.ProcName);
            cols = pi.Columns;
            if (!cols.length && pi.Warning) setInfo(pi.Warning);
          } catch (e: any) { setInfo(e?.message || ""); }
        }
        colsRef.current = cols;
        const run = fakeRun(d, cols);
        lastRunRef.current = run;
        let report: any;
        let paper: PaperSizeKey = "A4", orientation: OrientationKey = cols.length > 8 ? "landscape" : "portrait", margins: Margins = { ...DEFAULT_MARGINS };
        if (props.layoutId) {
          const l: LayoutMeta = await ReportsApi.getLayout(props.layoutId);
          setScope(l.Scope); setComp(l.CompCode); setBranch(l.BranchCode); setIsDefault(l.IsDefault);
          report = new S.Report.StiReport();
          report.load(l.LayoutMrt || "");
          registerData(S, report, tablesForRegister(run));
        } else {
          report = buildDefaultReport(S, {
            title: (IsLangEN ? d.NameE : d.NameA) || d.ReportCode, columns: run.Tables[0].Columns, isEN: IsLangEN, paper, orientation, margins,
            register: (r: any) => registerData(S, r, tablesForRegister(run)),
          });
        }
        void paper; void orientation; void margins;
        if (off) return;
        mount(S, report);
        setBusy(false);
      } catch (e: any) {
        if (!off) { setError(e?.message || String(e)); setBusy(false); }
      }
    })();
    return () => { off = true; try { designerRef.current?.dispose?.(); } catch { /* ignore */ } document.title = prevTitle; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- حفظ التصميم
  async function save(report: any) {
    const S = SRef.current; const d = defRef.current;
    if (!S || !d || !report) return;
    if (scope !== "all" && comp == null) { Sys.ShowMessage("Choose the company first", "اختر الشركة الأول", "warning"); return; }
    if (scope === "branch" && branch == null) { Sys.ShowMessage("Choose the branch first", "اختر الفرع الأول", "warning"); return; }
    setSaving(true);
    try {
      const page = report.pages.getByIndex(0);
      const w = Number(page.pageWidth), h = Number(page.pageHeight);
      const orientation: OrientationKey = w > h ? "landscape" : "portrait";
      const lo = Math.min(w, h), hi = Math.max(w, h);
      let paper: PaperSizeKey = "Custom";
      for (const k of Object.keys(PAPER_PRESETS) as (keyof typeof PAPER_PRESETS)[]) {
        const p = PAPER_PRESETS[k];
        if (Math.abs(Math.min(p.w, p.h) - lo) < 0.06 && (Math.abs(Math.max(p.w, p.h) - hi) < 0.06 || ((k === "Thermal80" || k === "Thermal58") && page.unlimitedHeight))) { paper = k; break; }
      }
      const m: Margins = {
        left: Number(page.margins.left), right: Number(page.margins.right), top: Number(page.margins.top), bottom: Number(page.margins.bottom),
        ...(paper === "Custom" ? { customWidth: lo, customHeight: hi } : {}),
      };
      const mrt = report.saveToJsonString();
      const res = await ReportsApi.saveLayout({
        LayoutId: layoutId, ReportCode: d.ReportCode, Scope: scope, CompCode: scope === "all" ? null : comp, BranchCode: scope === "branch" ? branch : null,
        PaperSize: paper, Orientation: orientation, MarginsJson: JSON.stringify(m), LayoutMrt: mrt, IsDefault: isDefault,
      });
      setLayoutId(res.LayoutId);
      Sys.ShowMessage("Layout saved", "اتحفظ التصميم", "success");
      props.onSaved?.();
    } catch (e: any) {
      Sys.ShowMessage(e?.message || String(e), e?.message || String(e), "error");
    }
    setSaving(false);
  }

  saveRef.current = save;

  // ---------- تشغيل عيّنة بقيم من الأدمن
  async function runSample() {
    const S = SRef.current; const d = defRef.current; const cur = designerRef.current;
    if (!S || !d || !cur?.report) return;
    setBusy(true);
    try {
      const env: any = useSys.getState().Session?.CurrentEnvironment;
      const run = await ReportsApi.run(d.ReportCode, env?.CompCode ?? 0, env?.BranchCode ?? 0, sampleVals, true);
      lastRunRef.current = run;
      const json = cur.report.saveToJsonString();
      const rep = new S.Report.StiReport();
      rep.load(json);
      registerData(S, rep, tablesForRegister(run));
      mount(S, rep);
      setInfo(`${run.Tables[0]?.Rows.length ?? 0} ${t("sample rows loaded", "صف عيّنة اتحمّل")} (${run.ElapsedMs} ms)`);
      setSampleOpen(false);
    } catch (e: any) {
      Sys.ShowMessage(e?.message || String(e), e?.message || String(e), "error");
    }
    setBusy(false);
  }

  const branchesOf = (lookups?.Branches || []).filter((b) => b.CompCode === comp);
  const name = (a: string, e: string) => (IsLangEN ? e || a : a || e);

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-erp-bg" dir={IsLangEN ? "ltr" : "rtl"} role="dialog" aria-modal="true">
      <div className="flex flex-wrap items-center gap-2 border-b border-erp-border bg-erp-surface px-4 py-2">
        <i className="fa-solid fa-pen-ruler text-erp-accent" aria-hidden="true" />
        <h2 className="me-2 text-[15px] font-semibold text-erp-text">{t("Report designer", "مصمم التقرير")}: {def ? name(def.NameA, def.NameE) : props.reportCode}</h2>
        <span className="rounded-md bg-erp-surface-2 px-2 py-0.5 text-[11px] text-erp-text-muted" dir="ltr">{props.reportCode}{layoutId ? ` #${layoutId}` : ` (${t("new", "جديد")})`}</span>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[12px] text-erp-text">{t("Scope", "النطاق")}
            <select className={inp} value={scope} onChange={(e) => { const s = e.target.value as ReportScope; setScope(s); if (s === "all") { setComp(null); setBranch(null); } if (s === "company") setBranch(null); }}>
              <option value="all">{t("All companies", "كل الشركات")}</option>
              <option value="company">{t("One company", "شركة واحدة")}</option>
              <option value="branch">{t("One branch", "فرع واحد")}</option>
            </select>
          </label>
          {scope !== "all" && (
            <select className={inp} value={comp ?? ""} onChange={(e) => { setComp(e.target.value === "" ? null : Number(e.target.value)); setBranch(null); }} aria-label={t("Company", "الشركة")}>
              <option value="">{t("Company...", "الشركة...")}</option>
              {(lookups?.Companies || []).map((c) => <option key={c.CompCode} value={c.CompCode}>{c.CompCode} - {name(c.NameA, c.NameE)}</option>)}
            </select>
          )}
          {scope === "branch" && (
            <select className={inp} value={branch ?? ""} onChange={(e) => setBranch(e.target.value === "" ? null : Number(e.target.value))} aria-label={t("Branch", "الفرع")}>
              <option value="">{t("Branch...", "الفرع...")}</option>
              {branchesOf.map((b) => <option key={b.BranchCode} value={b.BranchCode}>{b.BranchCode} - {name(b.BranchDescA, b.BranchDescE)}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1 text-[12px] text-erp-text">
            <input type="checkbox" className="accent-[var(--erp-accent)]" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> {t("Default for this scope", "الافتراضي لهذا النطاق")}
          </label>
          <button className={btnOutline} disabled={busy || !def || def.Params.length === 0} onClick={() => { const v: Record<string, string> = {}; (def?.Params || []).forEach((p) => (v[p.ParamName] = sampleVals[p.ParamName] ?? (p.Source === "const" ? p.SourceValue : ""))); setSampleVals(v); setSampleOpen(true); }}>
            <i className="fa-solid fa-database" aria-hidden="true" /> {t("Run sample", "تشغيل عيّنة")}
          </button>
          <button className={btnAccent} disabled={busy || saving} onClick={() => void save(designerRef.current?.report)}>
            <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {saving ? t("Saving...", "جاري الحفظ...") : t("Save layout", "حفظ التصميم")}
          </button>
          <button className={btnOutline} onClick={props.onClose}><i className="fa-solid fa-xmark" aria-hidden="true" /> {t("Close", "إغلاق")}</button>
        </div>
      </div>
      {info && <div className="bg-erp-accent-soft px-4 py-1.5 text-[12px] text-erp-accent">{info}</div>}

      <div className="relative min-h-0 flex-1 bg-erp-surface-3">
        <div ref={hostRef} className="h-full w-full" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-erp-overlay">
            <div className="rounded-xl border border-erp-border bg-erp-surface px-5 py-3 text-[13px] text-erp-text"><i className="fa-solid fa-spinner fa-spin me-2" aria-hidden="true" />{t("Loading designer...", "جاري تحميل المصمم...")}</div>
          </div>
        )}
        {error && !busy && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-lg rounded-xl border border-erp-danger-border bg-erp-danger-bg p-5 text-[13px] text-erp-danger-text whitespace-pre-wrap break-words">{error}</div>
          </div>
        )}
      </div>

      {sampleOpen && def && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-erp-overlay p-4" onClick={() => setSampleOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-[15px] font-semibold text-erp-text">{t("Run sample data", "تشغيل بيانات عيّنة")}</h3>
            <p className="mb-3 text-[12px] text-erp-text-muted">{t("Runs the procedure with these values (first 200 rows) so you can design with real data. Nothing is saved.", "هينفّذ الإجراء بالقيم دي (أول 200 صف) عشان تصمم على بيانات حقيقية. مفيش حاجة بتتحفظ.")}</p>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {def.Params.map((p) => (
                <label key={p.ParamName} className="block">
                  <span className="mb-1 block text-[12px] font-medium text-erp-text" dir="ltr">@{p.ParamName} <span className="text-erp-text-subtle">({p.Source}{p.SourceValue ? `: ${p.SourceValue}` : ""})</span></span>
                  <input className={`${inp} w-full`} dir="ltr" value={sampleVals[p.ParamName] ?? ""} onChange={(e) => setSampleVals({ ...sampleVals, [p.ParamName]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className={btnOutline} onClick={() => setSampleOpen(false)}>{t("Cancel", "إلغاء")}</button>
              <button className={btnAccent} onClick={() => void runSample()}>{t("Run", "تشغيل")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
