"use client";

// =====================================================================================
//  📄 Shared/Components/Excel/ExcelBar.tsx  —  زراير "تحميل نموذج Excel" و "استيراد من Excel"
// -------------------------------------------------------------------------------------
//  • مكتبة exceljs ومعاينة الاستيراد بيتحملوا لما اليوزر يدوس (مش مع الصفحة).
//  • بيتستخدم جوه DynamicGrid (ExcelGridBar) و MasterDetail (ExcelMasterBar / ExcelDetailsBar).
// =====================================================================================

import React, { lazy, Suspense, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSys } from "../../SystemUsing";
import { Sys } from "../../SystemTools";
import { loadLookups } from "./ExcelLookups";
import { buildTemplateBytes } from "./ExcelTemplate";
import { downloadBytes } from "./ExcelDownload";
import { ExcelColumnSpec, ExcelMode, ExcelTemplateSpec, ImportRecord } from "./ExcelTypes";
import type { CommitOutcome, RecordIssue } from "./ExcelImportModal";

const ExcelImportModal = lazy(() => import("./ExcelImportModal"));

export interface ExcelBarProps {
  mode: ExcelMode;
  columns: ExcelColumnSpec[];
  templateName: string;
  screenTitle?: string;
  allowTemplate?: boolean;
  allowImport?: boolean;
  templateLabel?: [string, string];   // [عربي, إنجليزي]
  importLabel?: [string, string];
  /** شكل صغير (جوه التفاصيل) */
  compact?: boolean;
  maxRows?: number;
  maxRecords?: number;
  commitKind: "save" | "append";
  allOrNothing?: boolean;
  chunkSize?: number;
  validateRecord?: (rec: ImportRecord) => Promise<RecordIssue[]>;
  commit: (recs: ImportRecord[]) => Promise<CommitOutcome>;
  onDone?: (savedCount: number) => void;
}

export default function ExcelBar(p: ExcelBarProps) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const isAr = !IsLangEN;
  const L = (ar: string, en: string) => (isAr ? ar : en);
  const [busy, setBusy] = useState<"" | "template" | "file">("");
  const [file, setFile] = useState<{ bytes: ArrayBuffer; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const baseSpec = (): ExcelTemplateSpec => ({
    name: p.templateName,
    lang: isAr ? "ar" : "en",
    mode: p.mode,
    columns: p.columns,
    lookups: {},
    screenTitle: p.screenTitle,
  });

  const downloadTemplate = async () => {
    if (busy) return;
    if (!p.columns.length) {
      Sys.ShowMessage("No columns are available for the Excel template", "مفيش أعمدة متاحة للتمبلت", "warning");
      return;
    }
    setBusy("template");
    try {
      const { lookups, errors } = await loadLookups(p.columns);
      const bytes = await buildTemplateBytes({ ...baseSpec(), lookups });
      downloadBytes(bytes, `${p.templateName}_template.xlsx`);
      if (errors.length) Sys.ShowMessage("Template created, but some lists could not be loaded: " + errors.join("; "), "اتعمل التمبلت لكن فيه قوائم متحملتش: " + errors.join("؛ "), "warning");
      else Sys.ShowMessage("Template downloaded", "تم تنزيل النموذج", "success");
    } catch (e: any) {
      const m = typeof e === "string" ? e : e?.message || e?.ErrorMessage || String(e);
      Sys.ShowMessage("Failed to create the template: " + m, "تعذر إنشاء النموذج: " + m, "error");
    } finally {
      setBusy("");
    }
  };

  const onPick = async (f: File | undefined | null) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      Sys.ShowMessage("Please use an .xlsx file (Save As > Excel Workbook)", "استخدم ملف بصيغة .xlsx (احفظ باسم > مصنف Excel)", "warning");
      return;
    }
    setBusy("file");
    try {
      const bytes = await f.arrayBuffer();
      setFile({ bytes, name: f.name });
    } catch (e: any) {
      Sys.ShowMessage("Could not read the file: " + (e?.message || e), "تعذر قراءة الملف: " + (e?.message || e), "error");
    } finally {
      setBusy("");
    }
  };

  const cls = p.compact
    ? "px-3 h-10 rounded-lg font-medium text-[13px] transition-colors erp-focus disabled:opacity-50 flex items-center gap-1.5 bg-erp-surface border border-erp-border text-erp-text hover:bg-erp-surface-2"
    : "px-3 h-11 md:h-9 rounded-lg font-medium text-[13px] transition-colors erp-focus disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 bg-erp-surface border border-erp-border text-erp-text hover:bg-erp-surface-2";

  const tl = p.templateLabel || ["تحميل نموذج Excel", "Download Excel template"];
  const il = p.importLabel || ["استيراد من Excel", "Import from Excel"];

  return (
    <>
      {p.allowTemplate !== false && (
        <button type="button" onClick={() => void downloadTemplate()} disabled={!!busy} className={cls} title={L(tl[0], tl[1])}>
          <i className={`fa-solid ${busy === "template" ? "fa-circle-notch fa-spin" : "fa-file-excel"} text-erp-success`} />
          <span className="hidden sm:inline">{L(tl[0], tl[1])}</span>
        </button>
      )}
      {p.allowImport !== false && (
        <>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={!!busy} className={cls} title={L(il[0], il[1])}>
            <i className={`fa-solid ${busy === "file" ? "fa-circle-notch fa-spin" : "fa-file-import"} text-erp-info`} />
            <span className="hidden sm:inline">{L(il[0], il[1])}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void onPick(f); }}
          />
        </>
      )}
      {file && typeof document !== "undefined" && createPortal(
        <Suspense fallback={null}>
          <ExcelImportModal
            fileBytes={file.bytes}
            fileName={file.name}
            spec={baseSpec()}
            maxRows={p.maxRows ?? 5000}
            maxRecords={p.maxRecords ?? 5000}
            commitKind={p.commitKind}
            allOrNothing={p.allOrNothing}
            chunkSize={p.chunkSize}
            validateRecord={p.validateRecord}
            commit={p.commit}
            onClose={() => setFile(null)}
            onDone={p.onDone}
          />
        </Suspense>,
        document.body,
      )}
    </>
  );
}
