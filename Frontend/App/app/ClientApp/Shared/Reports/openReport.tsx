"use client";

// =====================================================================================
//  openReport.tsx  -  فتح عارض التقرير من أي مكان (من غير حاوية جاهزة في الـ Layout)
//    openReport({ reportCode, filters })   ← طباعة قائمة (قيم الفلاتر الحالية)
//    openReport({ reportCode, row })       ← طباعة مستند (الصف المختار: CompCode / BranchCode / TrID)
//    openLayoutReport({ layout, data })    ← تصميم JSON + بيانات جاهزة (من غير تعريف تقرير)
//  بيركّب ReportViewer في div مؤقت على الـ body (createRoot) ويشيله لما يتقفل.
//  العارض نفسه (والباركود / QR / Excel) بيتحمّل بـ import() أول ما المستخدم يطبع بس.
// =====================================================================================

import React from "react";
import { createRoot } from "react-dom/client";
import { OpenLayoutReportOptions, OpenReportOptions } from "./ReportTypes";

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as any).__openReport = (o: OpenReportOptions) => openReport(o);   // dev-only QA hook
  (window as any).__openLayoutReport = (o: OpenLayoutReportOptions) => openLayoutReport(o);
  (window as any).__reportTemplates = () => import("./templates");
}

function mount(key: string, props: { report?: OpenReportOptions; direct?: OpenLayoutReportOptions }) {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  host.setAttribute("data-erp-report-host", key);
  document.body.appendChild(host);
  const root = createRoot(host);
  const close = () => {
    setTimeout(() => { try { root.unmount(); } catch { /* ignore */ } host.remove(); }, 0);
  };
  import("./ReportViewer")
    .then(({ default: ReportViewer }) => root.render(<ReportViewer {...props} onClose={close} />))
    .catch((e) => { console.error("[openReport] viewer failed to load", e); close(); });
}

export function openReport(opts: OpenReportOptions) {
  mount(opts.reportCode, { report: opts });
}

export function openLayoutReport(opts: OpenLayoutReportOptions) {
  mount(opts.layout.code || "layout", { direct: opts });
}
