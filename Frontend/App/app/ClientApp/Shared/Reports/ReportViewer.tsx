"use client";

// =====================================================================================
//  ReportViewer.tsx  -  نافذة عرض التقرير (مرجع: Design/Stitch/.../report_viewer)
//   - شريط علوي: العنوان · المقاس · الاتجاه · الهوامش · الباراميترات · Excel · PDF · إغلاق
//   - جوه: عارض Stimulsoft (تنقل بين الصفحات + تكبير + بحث داخل التقرير + طباعة)
//   - لوحة جانبية: باراميترات التقرير (تتعدّل وتتنفّذ تاني)
//   مكتبة Stimulsoft بتتحمل بـ dynamic import أول ما النافذة تتفتح.
// =====================================================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSys } from "../SystemUsing";
import { Sys } from "../SystemTools";
import { ReportsApi } from "./ReportApi";
import { PreparedReport, buildReportObject, paramsSummary, resolveParamValues, runAndResolve } from "./ReportService";
import { downloadBytes, exportReport, loadStimulsoft, renderReport } from "./stimulsoft";
import {
  DEFAULT_MARGINS, LayoutMeta, Margins, OpenReportOptions, OrientationKey, PAPER_PRESETS, PaperSizeKey, ReportDef, RunResult,
} from "./ReportTypes";

const inp = "h-9 rounded-lg border border-erp-border-strong bg-erp-surface px-2 text-[13px] text-erp-text focus:outline-none focus:border-erp-accent";
const btn = "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const btnOutline = `${btn} border border-erp-border bg-erp-surface text-erp-text hover:bg-erp-surface-2`;
const btnAccent = `${btn} bg-erp-accent text-white hover:bg-erp-accent-hover`;

export interface ReportViewerProps extends OpenReportOptions {
  onClose: () => void;
}

export default function ReportViewer(props: ReportViewerProps) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const hostRef = useRef<HTMLDivElement>(null);
  const SRef = useRef<any>(null);
  const prepRef = useRef<PreparedReport | null>(null);
  const viewerRef = useRef<any>(null);
  const seq = useRef(0);

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [def, setDef] = useState<ReportDef | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);
  const [layout, setLayout] = useState<LayoutMeta | null>(null);
  const [paper, setPaper] = useState<PaperSizeKey>("A4");
  const [orientation, setOrientation] = useState<OrientationKey>("portrait");
  const [margins, setMargins] = useState<Margins>({ ...DEFAULT_MARGINS });
  const [paramVals, setParamVals] = useState<Record<string, string | null>>({});
  const [showParams, setShowParams] = useState(false);
  const [showPaper, setShowPaper] = useState(false);
  const [exporting, setExporting] = useState("");

  // ---------- عرض تقرير جاهز جوه الحاوية
  const show = useCallback(async (S: any, prep: PreparedReport) => {
    await renderReport(prep.report);
    const host = hostRef.current;
    if (!host) return;
    try { viewerRef.current?.dispose?.(); } catch { /* ignore */ }
    host.innerHTML = "";
    const holder = document.createElement("div");
    const n = ++seq.current;
    holder.id = "erp-report-holder-" + n;          // لازم يختلف عن viewerId: Stimulsoft بيشيل أي عنصر ليه نفس الـ id
    holder.style.height = "100%";
    host.appendChild(holder);
    const o = new S.Viewer.StiViewerOptions();
    const set = (f: () => void) => { try { f(); } catch { /* option not available */ } };
    set(() => { o.height = "100%"; o.width = "100%"; });
    set(() => { o.appearance.rightToLeft = !IsLangEN; o.appearance.fullScreenMode = false; o.appearance.scrollbarsMode = true; });
    set(() => {
      o.toolbar.showOpenButton = false; o.toolbar.showSendEmailButton = false; o.toolbar.showDesignButton = false;
      o.toolbar.showAboutButton = false; o.toolbar.showFullScreenButton = false; o.toolbar.showParametersButton = false;
      o.toolbar.showFindButton = true; o.toolbar.showPrintButton = true; o.toolbar.showZoomButton = true;
    });
    const viewer = new S.Viewer.StiViewer(o, "erp-report-viewer-" + n, false);
    viewer.report = prep.report;
    viewer.renderHtml(holder);
    viewerRef.current = viewer;
    // وضع الموبايل في Stimulsoft بيخلّي العارض position:fixed فوق شريطنا (بيغطي زر الإغلاق/PDF) — نثبّته جوه الحاوية
    const pin = () => {
      const el = document.getElementById("erp-report-viewer-" + n);
      if (el) { el.style.setProperty("position", "absolute", "important"); el.style.setProperty("z-index", "1", "important"); }
    };
    pin(); setTimeout(pin, 300); setTimeout(pin, 1500);
  }, [IsLangEN]);

  // ---------- تنفيذ التقرير (run + layout + build)
  const execute = useCallback(async (vals: Record<string, any>, d: ReportDef) => {
    setBusy(true); setError("");
    try {
      const S = await loadStimulsoft();
      SRef.current = S;
      const r = await runAndResolve(d.ReportCode, vals);
      setRun(r.run); setLayout(r.layout); setWarning(r.run.Warning || "");
      const prep = buildReportObject(S, d, r.run, r.layout, IsLangEN, paramsSummary(d, vals));
      prepRef.current = prep;
      setPaper(prep.paper); setOrientation(prep.orientation); setMargins(prep.margins);
      await show(S, prep);
    } catch (e: any) {
      console.error("[ReportViewer] execute failed", e?.stack || e);
      setError(e?.message || String(e));
    }
    setBusy(false);
  }, [IsLangEN, show]);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const d = await ReportsApi.getReport(props.reportCode);
        if (off) return;
        setDef(d);
        const vals = resolveParamValues(d, props);
        setParamVals(vals);
        await execute(vals, d);
      } catch (e: any) {
        if (!off) { setError(e?.message || String(e)); setBusy(false); }
      }
    })();
    return () => {
      off = true;
      try { viewerRef.current?.dispose?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- تغيير المقاس/الاتجاه/الهوامش: نعيد البناء من نفس البيانات من غير نداء السيرفر
  const applyPaperChange = useCallback(async (p: PaperSizeKey, o: OrientationKey, m: Margins) => {
    const S = SRef.current; const cur = prepRef.current;
    if (!S || !cur || !def) return;
    setBusy(true); setError("");
    try {
      const prep = buildReportObject(S, def, cur.run, cur.layout, IsLangEN, paramsSummary(def, paramVals), { paper: p, orientation: o, margins: m });
      prepRef.current = prep;
      await show(S, prep);
    } catch (e: any) { setError(e?.message || String(e)); }
    setBusy(false);
  }, [def, IsLangEN, paramVals, show]);

  const doExport = async (format: "pdf" | "excel") => {
    const S = SRef.current; const prep = prepRef.current;
    if (!S || !prep) return;
    setExporting(format);
    try {
      const data = await exportReport(S, prep.report, format);
      const base = ((IsLangEN ? prep.run.NameE : prep.run.NameA) || prep.def.ReportCode).replace(/[\\/:*?"<>|]+/g, "_");
      if (format === "pdf") downloadBytes(data, base + ".pdf", "application/pdf");
      else downloadBytes(data, base + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e: any) {
      Sys.ShowMessage("Export failed: " + (e?.message || e), "فشل التصدير: " + (e?.message || e), "error");
    }
    setExporting("");
  };

  const title = def ? (IsLangEN ? def.NameE : def.NameA) || def.ReportCode : props.title || props.reportCode;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-erp-bg" dir={IsLangEN ? "ltr" : "rtl"} role="dialog" aria-modal="true" aria-label={title}>
      {/* الشريط العلوي */}
      <div className="flex flex-wrap items-center gap-2 border-b border-erp-border bg-erp-surface px-4 py-2">
        <i className="fa-solid fa-file-lines text-erp-accent" aria-hidden="true" />
        <h2 className="me-2 text-[15px] font-semibold text-erp-text">{title}</h2>
        {def && <span className="rounded-md bg-erp-surface-2 px-2 py-0.5 text-[11px] text-erp-text-muted" dir="ltr">{def.ReportCode}</span>}
        {layout && <span className="rounded-md bg-erp-accent-soft px-2 py-0.5 text-[11px] text-erp-accent">{t("Layout", "التصميم")}: {layout.Scope === "branch" ? t("Branch", "فرع") : layout.Scope === "company" ? t("Company", "شركة") : t("All", "الكل")}</span>}
        {!layout && !error && !busy && <span className="rounded-md bg-erp-surface-2 px-2 py-0.5 text-[11px] text-erp-text-muted">{t("Auto layout", "تصميم تلقائي")}</span>}

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <button className={btnOutline} onClick={() => setShowPaper((v) => !v)} aria-expanded={showPaper}>
            <i className="fa-solid fa-file" aria-hidden="true" />
            {paper === "Custom" ? t("Custom", "مخصص") : PAPER_PRESETS[paper][IsLangEN ? "labelEn" : "labelAr"]} · {orientation === "landscape" ? t("Landscape", "عرضي") : t("Portrait", "طولي")}
          </button>
          <button className={btnOutline} onClick={() => setShowParams((v) => !v)} aria-expanded={showParams} disabled={!def || def.Params.length === 0}>
            <i className="fa-solid fa-sliders" aria-hidden="true" /> {t("Parameters", "المعايير")}
          </button>
          <button className={btnOutline} disabled={busy || !!error || !!exporting} onClick={() => doExport("excel")}>
            <i className="fa-solid fa-file-excel" aria-hidden="true" /> Excel
          </button>
          <button className={btnAccent} disabled={busy || !!error || !!exporting} onClick={() => doExport("pdf")}>
            <i className="fa-solid fa-file-pdf" aria-hidden="true" /> PDF
          </button>
          <button className={btnOutline} onClick={props.onClose} aria-label={t("Close", "إغلاق")}>
            <i className="fa-solid fa-xmark" aria-hidden="true" /> {t("Close", "إغلاق")}
          </button>
        </div>
      </div>

      {/* لوحة المقاس */}
      {showPaper && (
        <div className="flex flex-wrap items-end gap-3 border-b border-erp-border bg-erp-surface-2 px-4 py-3 text-[12px] text-erp-text">
          <label className="flex flex-col gap-1">{t("Paper", "الورق")}
            <select className={inp} value={paper} onChange={(e) => { const p = e.target.value as PaperSizeKey; const o: OrientationKey = (p === "Thermal80" || p === "Thermal58") ? "portrait" : orientation; setPaper(p); setOrientation(o); void applyPaperChange(p, o, margins); }}>
              {(Object.keys(PAPER_PRESETS) as (keyof typeof PAPER_PRESETS)[]).map((k) => <option key={k} value={k}>{PAPER_PRESETS[k][IsLangEN ? "labelEn" : "labelAr"]}</option>)}
              <option value="Custom">{t("Custom size", "مقاس مخصص")}</option>
            </select>
          </label>
          {paper === "Custom" && (
            <>
              <label className="flex flex-col gap-1">{t("Width (cm)", "العرض (سم)")}
                <input className={`${inp} w-24`} type="number" min={3} step="0.1" value={margins.customWidth ?? 21} onChange={(e) => setMargins({ ...margins, customWidth: parseFloat(e.target.value) || 21 })} />
              </label>
              <label className="flex flex-col gap-1">{t("Height (cm)", "الارتفاع (سم)")}
                <input className={`${inp} w-24`} type="number" min={3} step="0.1" value={margins.customHeight ?? 29.7} onChange={(e) => setMargins({ ...margins, customHeight: parseFloat(e.target.value) || 29.7 })} />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1">{t("Orientation", "الاتجاه")}
            <select className={inp} value={orientation} onChange={(e) => { const o = e.target.value as OrientationKey; setOrientation(o); void applyPaperChange(paper, o, margins); }}>
              <option value="portrait">{t("Portrait", "طولي")}</option>
              <option value="landscape">{t("Landscape", "عرضي")}</option>
            </select>
          </label>
          {(["top", "bottom", "left", "right"] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1">{t({ top: "Top", bottom: "Bottom", left: "Left", right: "Right" }[k] + " (cm)", { top: "أعلى", bottom: "أسفل", left: "يسار", right: "يمين" }[k] + " (سم)")}
              <input className={`${inp} w-20`} type="number" min={0} step="0.1" value={margins[k]} onChange={(e) => setMargins({ ...margins, [k]: Math.max(0, parseFloat(e.target.value) || 0) })} />
            </label>
          ))}
          <button className={btnAccent} onClick={() => void applyPaperChange(paper, orientation, margins)}>{t("Apply", "تطبيق")}</button>
          <span className="text-erp-text-muted">{t("Applies to this view only. Save it in the designer to keep it.", "التغيير لهذه المعاينة فقط. احفظه من المصمم لو عايزه دايم.")}</span>
        </div>
      )}

      {warning && <div className="bg-erp-warning-bg px-4 py-1.5 text-[12px] text-erp-warning-text">{warning}</div>}

      <div className="relative flex min-h-0 flex-1">
        {/* الباراميترات */}
        {showParams && def && (
          <aside className="w-72 shrink-0 overflow-y-auto border-e border-erp-border bg-erp-surface p-4 max-md:absolute max-md:inset-y-0 max-md:z-10 max-md:w-full">
            <h3 className="mb-3 text-[14px] font-semibold text-erp-text"><i className="fa-solid fa-filter me-1 text-erp-accent" aria-hidden="true" /> {t("Report parameters", "معايير التقرير")}</h3>
            <div className="space-y-3">
              {def.Params.map((p) => {
                const fixed = p.Source === "const" || p.Source === "session";
                return (
                  <label key={p.ParamName} className="block">
                    <span className="mb-1 block text-[12px] font-medium text-erp-text" dir="ltr">@{p.ParamName}{fixed ? ` (${p.Source})` : ""}</span>
                    <input className={`${inp} w-full`} dir="ltr" disabled={fixed} value={paramVals[p.ParamName] ?? ""}
                      onChange={(e) => setParamVals({ ...paramVals, [p.ParamName]: e.target.value })} />
                  </label>
                );
              })}
            </div>
            <button className={`${btnAccent} mt-4 w-full`} disabled={busy} onClick={() => def && void execute(paramVals, def)}>
              <i className="fa-solid fa-rotate" aria-hidden="true" /> {t("Apply and refresh", "تطبيق وتحديث")}
            </button>
          </aside>
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden bg-erp-surface-3">
          <div ref={hostRef} className="h-full w-full" />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-erp-overlay">
              <div className="rounded-xl border border-erp-border bg-erp-surface px-5 py-3 text-[13px] text-erp-text shadow-erp-4">
                <i className="fa-solid fa-spinner fa-spin me-2" aria-hidden="true" />{t("Preparing report...", "جاري تجهيز التقرير...")}
              </div>
            </div>
          )}
          {error && !busy && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-lg rounded-xl border border-erp-danger-border bg-erp-danger-bg p-5 text-[13px] text-erp-danger-text">
                <div className="mb-1 font-semibold"><i className="fa-solid fa-triangle-exclamation me-1" aria-hidden="true" />{t("Could not open the report", "تعذّر فتح التقرير")}</div>
                <div className="whitespace-pre-wrap break-words">{error}</div>
              </div>
            </div>
          )}
          {run && !busy && !error && run.Tables[0]?.Rows.length === 0 && (
            <div className="pointer-events-none absolute bottom-3 start-1/2 -translate-x-1/2 rounded-lg bg-erp-surface px-3 py-1.5 text-[12px] text-erp-text-muted shadow-erp-4">
              {t("The procedure returned no rows.", "الإجراء مرجّعش صفوف.")}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
