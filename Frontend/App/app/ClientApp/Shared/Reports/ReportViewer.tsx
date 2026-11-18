"use client";

// =====================================================================================
//  ReportViewer.tsx  -  نافذة عرض التقرير (تصميم JSON ← صفحات HTML)
//   شريط أدوات: طباعة · PDF (من نافذة الطباعة) · Excel · تكبير/تصغير/ملء العرض · تنقل بين الصفحات
//              · مقاس الورق للمعاينة · معايير التقرير · إغلاق
//   وضعين:  report = تقرير متعرّف في Sys_Reports (run + resolve-layout)
//           direct = تصميم + بيانات جاهزين (openLayoutReport)
//   متجاوب: على الموبايل الأزرار أيقونات بس والصفحة بتتصغّر على عرض الشاشة.
// =====================================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../SystemUsing";
import { Sys } from "../SystemTools";
import { ReportsApi } from "./ReportApi";
import { PreparedReport, paramsSummary, prepareReport, resolveParamValues, runAndResolve } from "./ReportService";
import type { Orientation, PagePreset, ReportLayout } from "./ReportLayoutTypes";
import { OpenLayoutReportOptions, OpenReportOptions, ReportDef } from "./ReportTypes";
import ReportDocument from "./renderer/ReportDocument";
import { PAGE_PRESETS, PX_PER_MM, ResolvedPage } from "./renderer/paper";
import { REPORT_CSS, printReport } from "./renderer/print";
import { exportReportExcel } from "./renderer/excel";

const btn = "inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg px-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const btnOutline = `${btn} border border-erp-border bg-erp-surface text-erp-text hover:bg-erp-surface-2`;
const btnAccent = `${btn} bg-erp-accent text-white hover:bg-erp-accent-hover`;
const inp = "h-9 rounded-lg border border-erp-border-strong bg-erp-surface px-2 text-[13px] text-erp-text focus:outline-none focus:border-erp-accent";

export interface ReportViewerProps {
  onClose: () => void;
  /** تقرير متعرّف في القاعدة */
  report?: OpenReportOptions;
  /** تصميم وبيانات جاهزين */
  direct?: OpenLayoutReportOptions;
}

type Zoom = number | "fit";

export default function ReportViewer({ onClose, report, direct }: ReportViewerProps) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const lang: "ar" | "en" = IsLangEN ? "en" : "ar";
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [def, setDef] = useState<ReportDef | null>(null);
  const [prep, setPrep] = useState<PreparedReport | null>(null);
  const [paramVals, setParamVals] = useState<Record<string, string | null>>({});
  const [showParams, setShowParams] = useState(false);
  const [paper, setPaper] = useState<{ size: PagePreset; orientation: Orientation } | null>(null);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [info, setInfo] = useState<{ pages: number; page: ResolvedPage; heightMm: number | null } | null>(null);
  const [current, setCurrent] = useState(1);
  const [working, setWorking] = useState("");
  const [areaW, setAreaW] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

  // ---------- تحميل
  const execute = useCallback(async (vals: Record<string, any>, d: ReportDef) => {
    setBusy(true); setError("");
    try {
      const r = await runAndResolve(d.ReportCode, vals);
      const p = prepareReport(d, r.run, r.layout, IsLangEN, paramsSummary(d, vals), report?.title);
      setPrep(p);
      setWarning([r.run.Warning, p.notice ? (IsLangEN ? p.notice.en : p.notice.ar) : ""].filter(Boolean).join(" · "));
    } catch (e: any) {
      console.error("[ReportViewer] execute failed", e?.stack || e);
      setError(e?.message || String(e));
    }
    setBusy(false);
  }, [IsLangEN, report?.title]);

  useEffect(() => {
    let off = false;
    if (direct) {
      setPrep({ layout: direct.layout, data: direct.data, isAuto: false, notice: null });
      setBusy(false);
      return;
    }
    if (!report) return;
    (async () => {
      try {
        const d = await ReportsApi.getReport(report.reportCode);
        if (off) return;
        setDef(d);
        const vals = resolveParamValues(d, report);
        setParamVals(vals);
        await execute(vals, d);
      } catch (e: any) {
        if (!off) { setError(e?.message || String(e)); setBusy(false); }
      }
    })();
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- قفل سكرول الصفحة + Esc
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // ---------- عرض المنطقة (للـ "ملء العرض")
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setAreaW(el.clientWidth));
    ro.observe(el);
    setAreaW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const layout: ReportLayout | null = useMemo(() => {
    if (!prep) return null;
    if (!paper) return prep.layout;
    return { ...prep.layout, page: { ...prep.layout.page, size: paper.size, orientation: paper.orientation, width: undefined, height: undefined, margins: undefined } };
  }, [prep, paper]);

  const pageWpx = info ? info.page.width * PX_PER_MM : 794;
  const scale = zoom === "fit" ? Math.max(0.2, Math.min(1.5, (areaW - 24) / pageWpx)) : zoom;
  const onReady = useCallback((x: { pages: number; page: ResolvedPage; heightMm: number | null }) => setInfo(x), []);

  // ---------- تتبّع الصفحة الحالية
  const onScroll = () => {
    const sc = scrollRef.current; if (!sc) return;
    const secs = Array.from(sc.querySelectorAll<HTMLElement>(".rf-page"));
    const top = sc.getBoundingClientRect().top;
    let cur = 1;
    for (const s of secs) { if (s.getBoundingClientRect().top - top <= sc.clientHeight / 3) cur = Number(s.dataset.page) || cur; }
    setCurrent(cur);
  };
  const goTo = (n: number) => {
    const total = info?.pages ?? 1;
    const p = Math.max(1, Math.min(total, n));
    const sc = scrollRef.current;
    const el = sc?.querySelector<HTMLElement>(`.rf-page[data-page="${p}"]`);
    if (sc && el) sc.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
    setCurrent(p);
  };

  const title = def ? (IsLangEN ? def.NameE : def.NameA) || def.ReportCode : direct?.title || report?.title || report?.reportCode || "";
  const fileName = direct?.fileName || title || "Report";
  const ready = !busy && !error && !!layout && !!info;

  const doPrint = async (pdf: boolean) => {
    if (!docRef.current || !info) return;
    if (pdf) Sys.ShowMessage("In the print window choose \"Save as PDF\" as the printer.", "في نافذة الطباعة اختار \"حفظ كـ PDF\" (Save as PDF) بدل الطابعة.", "info");
    setWorking(pdf ? "pdf" : "print");
    try {
      await printReport(docRef.current, { widthMm: info.page.width, heightMm: info.heightMm, title: fileName, dir: IsLangEN ? "ltr" : "rtl", lang });
    } catch (e: any) {
      Sys.ShowMessage("Print failed: " + (e?.message || e), "فشلت الطباعة: " + (e?.message || e), "error");
    }
    setWorking("");
  };

  const doExcel = async () => {
    if (!layout || !prep) return;
    setWorking("excel");
    try { await exportReportExcel(layout, prep.data, lang, fileName); }
    catch (e: any) { Sys.ShowMessage("Export failed: " + (e?.message || e), "فشل التصدير: " + (e?.message || e), "error"); }
    setWorking("");
  };

  const zoomStep = (d: number) => setZoom(Math.max(0.3, Math.min(3, Math.round(((zoom === "fit" ? scale : zoom) + d) * 10) / 10)));
  const curPaper = paper?.size ?? (layout?.page.size as PagePreset) ?? "A4";
  const curOrient = paper?.orientation ?? layout?.page.orientation ?? "portrait";
  const hasParams = !!def && def.Params.length > 0;
  const lbl = "max-sm:hidden";

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-erp-bg" dir={IsLangEN ? "ltr" : "rtl"} role="dialog" aria-modal="true" aria-label={title}>
      <style>{REPORT_CSS}</style>

      {/* ===== الشريط العلوي ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-erp-border bg-erp-surface px-3 py-2 sm:px-4">
        <i className="fa-solid fa-file-lines text-erp-accent" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-erp-text" title={title}>{title}</h2>
        {prep?.isAuto && !busy && <span className="rounded-md bg-erp-surface-2 px-2 py-0.5 text-[11px] text-erp-text-muted max-sm:hidden">{t("Auto layout", "تصميم تلقائي")}</span>}

        <div className="flex items-center gap-1.5">
          <button className={btnAccent} disabled={!ready || !!working} onClick={() => void doPrint(false)} title={t("Print", "طباعة")} aria-label={t("Print", "طباعة")}>
            <i className={`fa-solid ${working === "print" ? "fa-spinner fa-spin" : "fa-print"}`} aria-hidden="true" /><span className={lbl}>{t("Print", "طباعة")}</span>
          </button>
          <button className={btnOutline} disabled={!ready || !!working} onClick={() => void doPrint(true)} title="PDF" aria-label="PDF">
            <i className="fa-solid fa-file-pdf text-red-600" aria-hidden="true" /><span className={lbl}>PDF</span>
          </button>
          <button className={btnOutline} disabled={!ready || !!working} onClick={() => void doExcel()} title="Excel" aria-label="Excel">
            <i className={`fa-solid ${working === "excel" ? "fa-spinner fa-spin" : "fa-file-excel"} text-green-700`} aria-hidden="true" /><span className={lbl}>Excel</span>
          </button>
          {hasParams && (
            <button className={btnOutline} onClick={() => setShowParams((v) => !v)} aria-expanded={showParams} title={t("Parameters", "المعايير")} aria-label={t("Parameters", "المعايير")}>
              <i className="fa-solid fa-sliders" aria-hidden="true" /><span className={lbl}>{t("Parameters", "المعايير")}</span>
            </button>
          )}
          <button className={btnOutline} onClick={onClose} title={t("Close", "إغلاق")} aria-label={t("Close", "إغلاق")}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ===== شريط التنقل والتكبير ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-erp-border bg-erp-surface-2 px-3 py-1.5 text-[12px] text-erp-text sm:px-4">
        <div className="flex items-center gap-1" dir="ltr">
          <button className={btnOutline} disabled={!ready || current <= 1} onClick={() => goTo(current - 1)} aria-label={t("Previous page", "الصفحة السابقة")}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
          <input className={`${inp} w-12 text-center`} inputMode="numeric" aria-label={t("Page", "الصفحة")} value={current}
            onChange={(e) => { const n = parseInt(e.target.value, 10); if (n) goTo(n); }} disabled={!ready} />
          <span className="px-1 text-erp-text-muted">/ {info?.pages ?? "-"}</span>
          <button className={btnOutline} disabled={!ready || current >= (info?.pages ?? 1)} onClick={() => goTo(current + 1)} aria-label={t("Next page", "الصفحة التالية")}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
        </div>
        <div className="flex items-center gap-1" dir="ltr">
          <button className={btnOutline} onClick={() => zoomStep(-0.1)} aria-label={t("Zoom out", "تصغير")}><i className="fa-solid fa-magnifying-glass-minus" aria-hidden="true" /></button>
          <span className="w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button className={btnOutline} onClick={() => zoomStep(0.1)} aria-label={t("Zoom in", "تكبير")}><i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true" /></button>
          <button className={`${btnOutline} ${zoom === "fit" ? "!border-erp-accent !text-erp-accent" : ""}`} onClick={() => setZoom("fit")} title={t("Fit width", "ملء العرض")} aria-label={t("Fit width", "ملء العرض")}><i className="fa-solid fa-arrows-left-right-to-line" aria-hidden="true" /></button>
          <button className={btnOutline} onClick={() => setZoom(1)} title="100%" aria-label="100%">1:1</button>
        </div>
        <div className="ms-auto flex items-center gap-1.5">
          <select className={`${inp} max-w-[11rem]`} aria-label={t("Paper", "الورق")} value={curPaper} disabled={!layout}
            onChange={(e) => setPaper({ size: e.target.value as PagePreset, orientation: curOrient })}>
            {(Object.keys(PAGE_PRESETS) as (keyof typeof PAGE_PRESETS)[]).map((k) => <option key={k} value={k}>{PAGE_PRESETS[k][IsLangEN ? "labelEn" : "labelAr"]}</option>)}
            {curPaper === "Custom" && <option value="Custom">{t("Custom", "مخصص")}</option>}
          </select>
          <select className={inp} aria-label={t("Orientation", "الاتجاه")} value={curOrient} disabled={!layout}
            onChange={(e) => setPaper({ size: curPaper, orientation: e.target.value as Orientation })}>
            <option value="portrait">{t("Portrait", "طولي")}</option>
            <option value="landscape">{t("Landscape", "عرضي")}</option>
          </select>
          {paper && <button className={btnOutline} onClick={() => setPaper(null)} title={t("Back to the saved paper", "رجوع لمقاس التصميم")} aria-label={t("Reset paper", "رجوع لمقاس التصميم")}><i className="fa-solid fa-rotate-left" aria-hidden="true" /></button>}
        </div>
      </div>

      {warning && <div className="bg-erp-warning-bg px-4 py-1.5 text-[12px] text-erp-warning-text">{warning}</div>}

      <div className="relative flex min-h-0 flex-1">
        {/* ===== المعايير ===== */}
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
            <button className={`${btnAccent} mt-4 w-full`} disabled={busy} onClick={() => { void execute(paramVals, def); if (window.innerWidth < 768) setShowParams(false); }}>
              <i className="fa-solid fa-rotate" aria-hidden="true" /> {t("Apply and refresh", "تطبيق وتحديث")}
            </button>
          </aside>
        )}

        {/* ===== الصفحات ===== */}
        <main ref={scrollRef} onScroll={onScroll} className="relative min-w-0 flex-1 overflow-auto bg-erp-surface-3 px-3 py-4">
          {layout && prep && !error && (
            <div ref={docRef} style={{ ["--rf-zoom" as any]: scale }}>
              <ReportDocument key={JSON.stringify(layout.page)} layout={layout} data={prep.data} lang={lang} onReady={onReady} />
            </div>
          )}
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
        </main>
      </div>
    </div>
  );
}
