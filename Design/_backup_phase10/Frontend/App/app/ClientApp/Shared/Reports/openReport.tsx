"use client";

// =====================================================================================
//  openReport.tsx  -  فتح عارض التقرير من أي مكان (من غير ما نحتاج حاوية جاهزة في الـ Layout)
//    openReport({ reportCode, filters })   ← طباعة قائمة (قيم الفلاتر الحالية)
//    openReport({ reportCode, row })       ← طباعة مستند (الصف المختار: CompCode / BranchCode / TrID)
//  بيركّب ReportViewer في div مؤقت على الـ body (createRoot) ويشيله لما يتقفل.
// =====================================================================================

import React from "react";
import { createRoot } from "react-dom/client";
import ReportViewer from "./ReportViewer";
import { OpenReportOptions } from "./ReportTypes";

export function openReport(opts: OpenReportOptions) {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  host.setAttribute("data-erp-report-host", opts.reportCode);
  document.body.appendChild(host);
  const root = createRoot(host);
  const close = () => {
    setTimeout(() => { try { root.unmount(); } catch { /* ignore */ } host.remove(); }, 0);
  };
  root.render(<ReportViewer {...opts} onClose={close} />);
}
