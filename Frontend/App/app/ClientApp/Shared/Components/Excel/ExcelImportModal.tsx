"use client";

// =====================================================================================
//  📄 Shared/Components/Excel/ExcelImportModal.tsx  —  معاينة الاستيراد من الإكسل (Phase 6)
// -------------------------------------------------------------------------------------
//  قراءة الملف ← مطابقة القوائم من القاعدة ← تحقق (أعمدة + قواعد الشاشة) ← معاينة بالأخطاء ← حفظ.
//  • الجدول بيرسم الصفوف الظاهرة بس (آلاف الصفوف عادي).
//  • ✓/✗ لكل صف، فلاتر (الكل / صالح / أخطاء)، تعديل الخلية في مكانها، حذف صف، تحميل ملف الأخطاء.
//  • الحفظ: بيحفظ الصالح بس، على دفعات، مع شريط تقدم وملخص نهائي (اتحفظ N / فشل M + السبب).
// =====================================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../../SystemUsing";
import { Sys } from "../../SystemTools";
import {
  ComputeCtx, buildIndexes, buildRecords, recomputeRecord,
} from "./ExcelCore";
import { loadLookups, resolveMissing } from "./ExcelLookups";
import { buildTemplateBytes, parseWorkbookBytes } from "./ExcelTemplate";
import {
  ExcelColumnSpec, ExcelErrorRow, ExcelLookups, ExcelScope, ExcelTemplateSpec, ImportRecord, PreviewRow, colKey, recordValid,
} from "./ExcelTypes";
import { downloadBytes } from "./ExcelDownload";

export interface RecordIssue {
  message: string;
  /** رقم الصف داخل المعاملة (من 0) */
  rowIndex?: number;
  field?: string;
  scope?: ExcelScope;
}

export interface CommitOutcome {
  ok: boolean;
  message?: string;
}

export interface ExcelImportModalProps {
  onClose: () => void;
  /** بعد الإغلاق: عدد اللي اتحفظ/اتضاف */
  onDone?: (savedCount: number) => void;
  fileBytes: ArrayBuffer;
  fileName: string;
  spec: ExcelTemplateSpec;
  maxRows: number;
  maxRecords: number;
  /** save = حفظ في القاعدة (على دفعات) · append = إضافة للفاتورة المفتوحة (مرة واحدة) */
  commitKind: "save" | "append";
  allOrNothing?: boolean;
  chunkSize?: number;
  /** قواعد الشاشة (Validation.ts) على المعاملة كلها */
  validateRecord?: (rec: ImportRecord) => Promise<RecordIssue[]>;
  commit: (recs: ImportRecord[]) => Promise<CommitOutcome>;
}

type Phase = "loading" | "ready" | "saving" | "done" | "fatal";
type Filter = "all" | "valid" | "errors";

const ROW_H = 42;
const HEAD_H = 46;

function colWidth(c: ExcelColumnSpec): number {
  if (c.lookup || c.options) return 200;
  switch (c.type) {
    case "date": return 140;
    case "number": case "decimal": return 120;
    case "bool": return 100;
    default: return 180;
  }
}

function recStatus(r: ImportRecord): "saved" | "failed" | "invalid" | "valid" {
  if (r.saved) return "saved";
  if (r.saveError) return "failed";
  return recordValid(r) ? "valid" : "invalid";
}

export default function ExcelImportModal(props: ExcelImportModalProps) {
  const { spec, maxRows, maxRecords, commitKind, allOrNothing = false, validateRecord, commit } = props;
  const IsLangEN = useSys((s) => s.IsLangEN);
  const isAr = !IsLangEN;
  const L = useCallback((ar: string, en: string) => (isAr ? ar : en), [isAr]);

  const [phase, setPhase] = useState<Phase>("loading");
  const [phaseMsg, setPhaseMsg] = useState<string>("");
  const [fatal, setFatal] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [validating, setValidating] = useState<{ done: number; total: number } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ saved: number; failed: number; skipped: number } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(520);

  const recordsRef = useRef<ImportRecord[]>([]);
  recordsRef.current = records;
  const ctxRef = useRef<ComputeCtx | null>(null);
  const lookupsRef = useRef<ExcelLookups>({});
  const lookupDataRef = useRef<ExcelLookups>({});
  const cancelRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const editTimers = useRef<Record<number, any>>({});

  const cols = spec.columns;
  const hasGroup = spec.mode === "multi";

  // ------------------------- تطبيق نتيجة قواعد الشاشة -------------------------
  const applyIssues = useCallback((rec: ImportRecord, issues: RecordIssue[]): ImportRecord => {
    const rowsCopy = rec.rows.map((r) => ({ ...r, errors: { ...r.errors } }));
    const general: string[] = [];
    for (const is of issues) {
      if (is.rowIndex !== undefined && rowsCopy[is.rowIndex]) {
        const scope: ExcelScope = is.scope || (spec.mode === "grid" ? "master" : "detail");
        const key = is.field && cols.some((c) => c.field === is.field && c.scope === scope) ? (scope === "master" ? "m." : "d.") + is.field : "_";
        const r = rowsCopy[is.rowIndex];
        r.errors[key] = r.errors[key] ? r.errors[key] + " | " + is.message : is.message;
      } else if (is.field && rowsCopy[0] && cols.some((c) => c.field === is.field && c.scope === "master")) {
        const key = "m." + is.field;
        rowsCopy[0].errors[key] = rowsCopy[0].errors[key] ? rowsCopy[0].errors[key] + " | " + is.message : is.message;
      } else general.push(is.message);
    }
    return { ...rec, rows: rowsCopy, issues: general };
  }, [cols, spec.mode]);

  const runValidate = useCallback(async (list: ImportRecord[]) => {
    if (!validateRecord) return list;
    const todo = list.filter((r) => r.rows.every((x) => Object.keys(x.errors).length === 0));
    if (!todo.length) return list;
    setValidating({ done: 0, total: todo.length });
    const result = new Map<number, ImportRecord>();
    let next = 0, done = 0;
    const worker = async () => {
      while (next < todo.length && !cancelRef.current) {
        const rec = todo[next++];
        try {
          const issues = await validateRecord(rec);
          result.set(rec.id, applyIssues(rec, issues));
        } catch (e: any) {
          result.set(rec.id, { ...rec, issues: [typeof e === "string" ? e : e?.message || "Validation failed"] });
        }
        done++;
        if (done % 10 === 0 || done === todo.length) setValidating({ done, total: todo.length });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    setValidating(null);
    return list.map((r) => result.get(r.id) ?? r);
  }, [validateRecord, applyIssues]);

  // ------------------------- تحميل الملف -------------------------
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        setPhaseMsg(L("بقرا الملف...", "Reading the file..."));
        const parsed = await parseWorkbookBytes(props.fileBytes, spec);
        if (off) return;
        if (parsed.errors.length) { setFatal(parsed.errors); setPhase("fatal"); return; }
        if (parsed.missingRequired.length) {
          setFatal([L("أعمدة إجبارية مش موجودة في الملف: ", "Required columns missing from the file: ") + parsed.missingRequired.join(" ، ")]);
          setPhase("fatal");
          return;
        }
        if (parsed.rows.length === 0) { setFatal([L("الملف مفيهوش صفوف بيانات.", "The file has no data rows.")]); setPhase("fatal"); return; }
        if (parsed.rows.length > maxRows) {
          setFatal([L(`عدد الصفوف (${parsed.rows.length}) أكبر من الحد المسموح (${maxRows}). قسّم الملف.`, `Row count (${parsed.rows.length}) exceeds the limit (${maxRows}). Split the file.`)]);
          setPhase("fatal");
          return;
        }
        const warn: string[] = [];
        if (parsed.ignored.length) warn.push(L("أعمدة مش متعرفة وهتتجاهل: ", "Unknown columns (ignored): ") + parsed.ignored.join(" ، "));

        setPhaseMsg(L("بحمّل القوائم من القاعدة...", "Loading lists from the database..."));
        const { lookups, errors } = await loadLookups(cols);
        if (off) return;
        for (const e of errors) warn.push(L("تعذر تحميل قائمة: ", "Could not load list: ") + e);
        lookupDataRef.current = lookups;
        const indexes = buildIndexes(lookups);

        // قوائم كبيرة: نكمل بالاستعلام على القيم اللي في الملف
        for (const c of cols) {
          const k = colKey(c);
          const d = lookups[k];
          if (c.lookup && d?.truncated) {
            setPhaseMsg(L(`بطابق ${c.title}...`, `Matching ${c.title}...`));
            await resolveMissing(c, d, indexes[k], parsed.rows.map((r) => r.raw[k] ?? ""));
          }
        }
        if (off) return;
        lookupsRef.current = lookups;
        const ctx: ComputeCtx = { columns: cols, indexes, isAr };
        ctxRef.current = ctx;

        setPhaseMsg(L("بجهّز المعاينة...", "Preparing the preview..."));
        const recs = buildRecords(parsed.rows, spec.mode, ctx);
        if (recs.length > maxRecords) {
          setFatal([L(`عدد المعاملات (${recs.length}) أكبر من الحد (${maxRecords}).`, `Transaction count (${recs.length}) exceeds the limit (${maxRecords}).`)]);
          setPhase("fatal");
          return;
        }
        setWarnings(warn);
        setRecords(recs);
        setPhase("ready");
        const validated = await runValidate(recs);
        if (!off) setRecords((cur) => merge(cur, validated));
      } catch (e: any) {
        if (!off) { setFatal([typeof e === "string" ? e : e?.message || String(e)]); setPhase("fatal"); }
      }
    })();
    return () => { off = true; cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // دمج نتيجة التحقق في الحالة الحالية (لو اليوزر عدّل وقت التحقق منكسرش تعديله)
  function merge(cur: ImportRecord[], validated: ImportRecord[]): ImportRecord[] {
    const m = new Map(validated.map((r) => [r.id, r]));
    return cur.map((r) => {
      const v = m.get(r.id);
      return v && r.rows.length === v.rows.length && r.rows.every((x, i) => x === v.rows[i] || JSON.stringify(x.raw) === JSON.stringify(v.rows[i].raw)) ? v : r;
    });
  }

  // ------------------------- تعديل خلية -------------------------
  const onEdit = (recId: number, rowId: number, key: string, text: string) => {
    setRecords((cur) => cur.map((r) => (r.id !== recId ? r : { ...r, rows: r.rows.map((x) => (x.id !== rowId ? x : { ...x, raw: { ...x.raw, [key]: text } })) })));
  };

  const finishEdit = async (recId: number, key: string) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const rec = recordsRef.current.find((r) => r.id === recId);
    if (!rec) return;
    const col = cols.find((c) => colKey(c) === key);
    const d = lookupDataRef.current[key];
    if (col?.lookup && d?.truncated) {
      await resolveMissing(col, d, ctx.indexes[key], rec.rows.map((x) => x.raw[key] ?? ""));
    }
    const fresh = recomputeRecord(recordsRef.current.find((r) => r.id === recId) || rec, ctx, spec.mode);
    setRecords((cur) => cur.map((r) => (r.id === recId ? { ...fresh, saved: r.saved, saveError: undefined } : r)));
    if (validateRecord && fresh.rows.every((x) => Object.keys(x.errors).length === 0)) {
      clearTimeout(editTimers.current[recId]);
      editTimers.current[recId] = setTimeout(async () => {
        try {
          const issues = await validateRecord(fresh);
          const sig = JSON.stringify(fresh.rows.map((x) => x.raw));
          setRecords((cur) => cur.map((r) => (r.id === recId && JSON.stringify(r.rows.map((x) => x.raw)) === sig ? applyIssues(r, issues) : r)));
        } catch { /* ignore */ }
      }, 250);
    }
  };

  // ------------------------- حذف -------------------------
  const removeRow = (recId: number, rowId: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    setRecords((cur) => {
      const out: ImportRecord[] = [];
      for (const rec of cur) {
        if (rec.id !== recId) { out.push(rec); continue; }
        if (spec.mode !== "multi" || rec.rows.length === 1 || rec.rows[0].id === rowId) continue;   // حذف المعاملة كلها
        out.push(recomputeRecord({ ...rec, rows: rec.rows.filter((x) => x.id !== rowId) }, ctx, spec.mode));
      }
      return out;
    });
  };

  // ------------------------- العد والفلترة -------------------------
  const counts = useMemo(() => {
    let valid = 0, bad = 0, saved = 0;
    for (const r of records) {
      const s = recStatus(r);
      if (s === "saved") saved++;
      else if (s === "valid") valid++;
      else bad++;
    }
    return { valid, bad, saved, total: records.length };
  }, [records]);

  const visible = useMemo(() => {
    const list: { rec: ImportRecord; row: PreviewRow; idx: number }[] = [];
    for (const rec of records) {
      const s = recStatus(rec);
      if (filter === "valid" && !(s === "valid" || s === "saved")) continue;
      if (filter === "errors" && !(s === "invalid" || s === "failed")) continue;
      rec.rows.forEach((row, idx) => list.push({ rec, row, idx }));
    }
    return list;
  }, [records, filter]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) setViewH(el.clientHeight || 520);
  }, [phase, filter]);

  const widths = useMemo(() => cols.map(colWidth), [cols]);
  const baseW = 56 + 70 + (hasGroup ? 90 : 0);
  const totalW = baseW + widths.reduce((a, b) => a + b, 0) + 300 + 44;

  const start = Math.max(0, Math.floor(Math.max(0, scrollTop - HEAD_H) / ROW_H) - 6);
  const end = Math.min(visible.length, Math.ceil((scrollTop + viewH) / ROW_H) + 6);

  // ------------------------- ملف الأخطاء -------------------------
  const rowMessage = (rec: ImportRecord, row: PreviewRow, idx: number): string => {
    const parts: string[] = [];
    for (const c of cols) {
      const e = row.errors[colKey(c)];
      if (e) parts.push(`${c.title}: ${e}`);
    }
    if (row.errors["_"]) parts.push(row.errors["_"]);
    if (idx === 0) {
      parts.push(...rec.issues);
      if (rec.saveError) parts.push(rec.saveError);
    }
    return parts.join(" | ");
  };

  const downloadErrors = async () => {
    const rows: ExcelErrorRow[] = [];
    for (const rec of records) {
      const s = recStatus(rec);
      if (s === "valid" || s === "saved") continue;
      rec.rows.forEach((row, idx) => rows.push({ group: rec.group ?? row.group, raw: row.raw, message: rowMessage(rec, row, idx) }));
    }
    if (!rows.length) {
      Sys.ShowMessage("No errors to export", "مفيش أخطاء تتصدّر", "info");
      return;
    }
    try {
      const bytes = await buildTemplateBytes({ ...spec, lookups: lookupsRef.current }, rows);
      downloadBytes(bytes, `${spec.name}_errors.xlsx`);
    } catch (e: any) {
      Sys.ShowMessage("Failed to build the file: " + (e?.message || e), "تعذر إنشاء الملف: " + (e?.message || e), "error");
    }
  };

  // ------------------------- الحفظ -------------------------
  const doCommit = async () => {
    const all = recordsRef.current;
    const valid = all.filter((r) => recStatus(r) === "valid");
    const invalid = all.filter((r) => recStatus(r) === "invalid" || recStatus(r) === "failed");
    if (!valid.length) {
      Sys.ShowMessage("There are no valid rows to save", "مفيش صفوف صالحة للحفظ", "warning");
      return;
    }
    if (allOrNothing && invalid.length) {
      Sys.ShowMessage("All-or-nothing mode: fix or remove the invalid rows first", "وضع الكل أو لا شيء: صلّح أو احذف الصفوف الغلط الأول", "warning");
      return;
    }
    const msg = commitKind === "append"
      ? L(`إضافة ${valid.length} صف للفاتورة؟`, `Add ${valid.length} row(s) to the document?`)
      : L(`حفظ ${valid.length} ${spec.mode === "grid" ? "سجل" : "معاملة"}${invalid.length ? ` (وتجاهل ${invalid.length} فيهم أخطاء)` : ""}؟`,
          `Save ${valid.length} ${spec.mode === "grid" ? "record(s)" : "transaction(s)"}${invalid.length ? ` (skipping ${invalid.length} with errors)` : ""}?`);
    if (!(await Sys.Confirm(msg, msg))) return;

    cancelRef.current = false;
    setPhase("saving");
    setProgress({ done: 0, total: valid.length });
    let saved = 0, failed = 0;
    const mark = (ids: number[], ok: boolean, err?: string) => {
      const set = new Set(ids);
      setRecords((cur) => cur.map((r) => (set.has(r.id) ? { ...r, saved: ok, saveError: ok ? undefined : err || "Failed" } : r)));
    };

    if (commitKind === "append" || allOrNothing) {
      let out: CommitOutcome;
      try { out = await commit(valid); } catch (e: any) { out = { ok: false, message: typeof e === "string" ? e : e?.ErrorMessage || e?.message || "Failed" }; }
      mark(valid.map((r) => r.id), out.ok, out.message);
      if (out.ok) saved = valid.length; else failed = valid.length;
      setProgress({ done: valid.length, total: valid.length });
    } else {
      const size = Math.max(1, props.chunkSize || 1);
      for (let i = 0; i < valid.length && !cancelRef.current; i += size) {
        const chunk = valid.slice(i, i + size);
        let out: CommitOutcome;
        try { out = await commit(chunk); } catch (e: any) { out = { ok: false, message: typeof e === "string" ? e : e?.ErrorMessage || e?.message || "Failed" }; }
        if (out.ok) {
          saved += chunk.length;
          mark(chunk.map((r) => r.id), true);
        } else if (chunk.length > 1) {
          // الدفعة فشلت: نجرّب كل معاملة لوحدها عشان نعرف الغلط فين
          for (const rec of chunk) {
            let o2: CommitOutcome;
            try { o2 = await commit([rec]); } catch (e: any) { o2 = { ok: false, message: typeof e === "string" ? e : e?.ErrorMessage || e?.message || "Failed" }; }
            if (o2.ok) saved++; else failed++;
            mark([rec.id], o2.ok, o2.message);
          }
        } else {
          failed++;
          mark([chunk[0].id], false, out.message);
        }
        setProgress({ done: Math.min(valid.length, i + size), total: valid.length });
      }
    }
    setSummary({ saved, failed, skipped: invalid.length });
    setPhase("done");
    if (failed > 0) setFilter("errors");
  };

  const close = () => {
    cancelRef.current = true;
    props.onClose();
    if (summary && summary.saved > 0) props.onDone?.(summary.saved);
    else if (records.some((r) => r.saved)) props.onDone?.(records.filter((r) => r.saved).length);
  };

  // ------------------------- الرسم -------------------------
  const filterBtn = (id: Filter, label: string, n: number) => (
    <button
      key={id}
      onClick={() => { setFilter(id); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}
      className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors ${filter === id ? "bg-erp-accent text-white border-erp-accent" : "bg-erp-surface text-erp-text border-erp-border hover:bg-erp-surface-2"}`}
    >
      {label} <span className="num font-bold">({n})</span>
    </button>
  );

  const failedList = records.filter((r) => recStatus(r) === "failed").slice(0, 50);
  const inputCls = "w-full h-8 px-2 rounded-md border text-[12px] bg-erp-surface text-erp-text focus:outline-none focus:border-erp-accent";

  return (
    <div className="fixed inset-0 z-[1000] bg-erp-overlay flex items-center justify-center p-2 md:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-[1320px] max-h-[96vh] h-[92vh] flex flex-col rounded-xl bg-erp-surface text-erp-text border border-erp-border shadow-erp-4 overflow-hidden">
        {/* ===== العنوان ===== */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-erp-border">
          <div className="w-9 h-9 rounded-lg bg-erp-accent-soft text-erp-accent flex items-center justify-center"><i className="fa-solid fa-file-excel" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold truncate">{L("معاينة الاستيراد من Excel", "Excel import preview")}</h3>
            <p className="text-[12px] text-erp-text-muted truncate" dir="ltr">{props.fileName}</p>
          </div>
          <button onClick={close} className="w-9 h-9 rounded-lg hover:bg-erp-surface-2 text-erp-text-muted" aria-label={L("إغلاق", "Close")}><i className="fa-solid fa-xmark" /></button>
        </div>

        {phase === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-erp-text-muted">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-erp-accent" />
            <p className="text-[14px]">{phaseMsg}</p>
          </div>
        )}

        {phase === "fatal" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <div className="w-14 h-14 rounded-full bg-erp-danger-bg text-erp-danger-text flex items-center justify-center text-2xl"><i className="fa-solid fa-triangle-exclamation" /></div>
            <h4 className="text-[16px] font-bold">{L("مقدرتش أقرا الملف", "Could not read the file")}</h4>
            <ul className="text-[13px] text-erp-danger-text space-y-1 max-w-xl text-center">{fatal.map((f, i) => <li key={i}>{f}</li>)}</ul>
            <button onClick={close} className="mt-2 h-10 px-5 rounded-lg bg-erp-primary text-erp-on-primary text-[13px] font-semibold">{L("إغلاق", "Close")}</button>
          </div>
        )}

        {(phase === "ready" || phase === "saving" || phase === "done") && (
          <>
            {/* ===== الإحصائيات والفلاتر ===== */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-erp-border">
              {filterBtn("all", L("الكل", "All"), counts.total)}
              {filterBtn("valid", L("صالح", "Valid"), counts.valid + counts.saved)}
              {filterBtn("errors", L("فيه أخطاء", "Errors"), counts.bad)}
              <span className="text-[12px] text-erp-text-muted mx-2">
                {spec.mode === "multi"
                  ? L(`${counts.total} معاملة · ${records.reduce((a, r) => a + r.rows.length, 0)} صف`, `${counts.total} transaction(s) · ${records.reduce((a, r) => a + r.rows.length, 0)} row(s)`)
                  : L(`${counts.total} صف`, `${counts.total} row(s)`)}
              </span>
              {validating && (
                <span className="text-[12px] text-erp-info flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  {L(`بفحص قواعد الشاشة ${validating.done}/${validating.total}`, `Checking screen rules ${validating.done}/${validating.total}`)}
                </span>
              )}
              <div className="flex-1" />
              {counts.bad > 0 && (
                <button onClick={downloadErrors} className="h-9 px-3 rounded-lg border border-erp-border bg-erp-surface text-[13px] font-medium hover:bg-erp-surface-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-download" />{L("تحميل الأخطاء Excel", "Download errors (Excel)")}
                </button>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="px-4 py-2 text-[12px] bg-erp-warning-bg text-erp-warning-text border-b border-erp-warning-border">
                {warnings.map((w, i) => <div key={i}><i className="fa-solid fa-circle-info me-1" />{w}</div>)}
              </div>
            )}

            {/* ===== الجدول ===== */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-[200px] overflow-auto bg-erp-canvas"
              onScroll={(e) => { setScrollTop(e.currentTarget.scrollTop); if (e.currentTarget.clientHeight !== viewH) setViewH(e.currentTarget.clientHeight); }}
            >
              <div style={{ minWidth: totalW }}>
                <div className="sticky top-0 z-10 flex items-center bg-erp-surface-2 border-b border-erp-border-strong text-[11px] font-semibold text-erp-text-muted" style={{ height: HEAD_H }}>
                  <div style={{ width: 56 }} className="px-2 text-center">#</div>
                  <div style={{ width: 70 }} className="px-2 text-center">{L("الحالة", "Status")}</div>
                  {hasGroup && <div style={{ width: 90 }} className="px-2">{L("المعاملة", "Trans.")}</div>}
                  {cols.map((c, i) => (
                    <div key={colKey(c)} style={{ width: widths[i] }} className="px-2 truncate" title={c.field}>
                      {hasGroup && <span className={`inline-block w-1.5 h-1.5 rounded-full me-1 ${c.scope === "master" ? "bg-erp-info" : "bg-erp-success"}`} />}
                      {c.title}{c.required && <span className="text-erp-danger mx-0.5">*</span>}
                    </div>
                  ))}
                  <div style={{ width: 300 }} className="px-2">{L("ملاحظات", "Notes")}</div>
                  <div style={{ width: 44 }} />
                </div>

                <div style={{ height: visible.length * ROW_H, position: "relative" }}>
                  {visible.length === 0 && (
                    <div className="absolute inset-x-0 top-10 text-center text-[13px] text-erp-text-muted">{L("مفيش صفوف في الفلتر ده", "No rows in this filter")}</div>
                  )}
                  {visible.slice(start, end).map(({ rec, row, idx }, i) => {
                    const st = recStatus(rec);
                    const rowOk = st === "valid" || st === "saved";
                    const msg = rowMessage(rec, row, idx);
                    const top = (start + i) * ROW_H;
                    const readOnlyAll = phase !== "ready" || rec.saved;
                    return (
                      <div
                        key={row.id}
                        className={`absolute inset-x-0 flex items-center border-b border-erp-border ${st === "saved" ? "bg-erp-success-bg" : !rowOk ? "bg-erp-danger-bg/40" : "bg-erp-surface"}`}
                        style={{ top, height: ROW_H, minWidth: totalW, borderTop: hasGroup && idx === 0 ? "2px solid var(--erp-border-strong)" : undefined }}
                      >
                        <div style={{ width: 56 }} className="px-2 text-center text-[12px] text-erp-text-muted num">{row.excelRow}</div>
                        <div style={{ width: 70 }} className="px-2 text-center" title={st === "saved" ? (commitKind === "append" ? L("تمت الإضافة", "Added") : L("تم الحفظ", "Saved")) : rowOk ? L("صالح", "Valid") : msg}>
                          {st === "saved" ? <i className="fa-solid fa-check-double text-erp-success" /> : rowOk ? <i className="fa-solid fa-circle-check text-erp-success" /> : <i className="fa-solid fa-circle-xmark text-erp-danger" />}
                        </div>
                        {hasGroup && <div style={{ width: 90 }} className="px-2 text-[12px] num truncate" dir="ltr">{idx === 0 ? <b>{rec.group ?? row.group}</b> : <span className="text-erp-text-subtle">↳</span>}</div>}
                        {cols.map((c, ci) => {
                          const k = colKey(c);
                          const inherited = hasGroup && c.scope === "master" && idx > 0 && !row.errors[k];
                          const err = row.errors[k];
                          const listId = c.lookup && (lookupDataRef.current[k]?.items.length || 0) <= 300 && (lookupDataRef.current[k]?.items.length || 0) > 0 ? `xl_${k}` : undefined;
                          return (
                            <div key={k} style={{ width: widths[ci] }} className="px-1">
                              {inherited ? (
                                <div className="px-2 text-[12px] text-erp-text-subtle">—</div>
                              ) : (
                                <input
                                  className={`${inputCls} ${err ? "border-erp-danger bg-erp-danger-bg" : "border-transparent hover:border-erp-border"}`}
                                  value={row.raw[k] ?? ""}
                                  title={err || row.raw[k] || ""}
                                  list={listId}
                                  disabled={readOnlyAll}
                                  dir={c.type === "number" || c.type === "decimal" || c.type === "date" ? "ltr" : undefined}
                                  onChange={(e) => onEdit(rec.id, row.id, k, e.target.value)}
                                  onBlur={() => void finishEdit(rec.id, k)}
                                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                />
                              )}
                            </div>
                          );
                        })}
                        <div style={{ width: 300 }} className={`px-2 text-[12px] truncate ${st === "saved" ? "text-erp-success-text" : "text-erp-danger-text"}`} title={msg}>
                          {st === "saved" ? (commitKind === "append" ? L("تمت الإضافة", "Added") : L("تم الحفظ", "Saved")) : msg}
                        </div>
                        <div style={{ width: 44 }} className="text-center">
                          {phase === "ready" && !rec.saved && (
                            <button
                              onClick={() => removeRow(rec.id, row.id)}
                              className="w-8 h-8 rounded-md text-erp-text-subtle hover:text-erp-danger hover:bg-erp-danger-bg"
                              title={spec.mode === "multi" && idx === 0 ? L("حذف المعاملة كلها", "Remove the whole transaction") : L("حذف الصف", "Remove row")}
                              aria-label={L("حذف", "Remove")}
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {cols.filter((c) => c.lookup && (lookupDataRef.current[colKey(c)]?.items.length || 0) > 0 && (lookupDataRef.current[colKey(c)]?.items.length || 0) <= 300).map((c) => (
                <datalist key={colKey(c)} id={`xl_${colKey(c)}`}>
                  {lookupDataRef.current[colKey(c)].items.map((it, i) => <option key={i} value={it.label} />)}
                </datalist>
              ))}
            </div>

            {/* ===== الحفظ / الملخص ===== */}
            {phase === "saving" && (
              <div className="px-4 py-3 border-t border-erp-border">
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span>{L("جاري الحفظ...", "Saving...")}</span>
                  <span className="num">{progress.done} / {progress.total}</span>
                </div>
                <div className="h-2 rounded-full bg-erp-surface-3 overflow-hidden"><div className="h-full bg-erp-accent transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                <div className="mt-2 flex justify-end">
                  {commitKind === "save" && !allOrNothing && <button onClick={() => { cancelRef.current = true; }} className="h-9 px-4 rounded-lg border border-erp-border text-[13px]">{L("إيقاف بعد الدفعة الحالية", "Stop after current batch")}</button>}
                </div>
              </div>
            )}

            {phase === "done" && summary && (
              <div className="px-4 py-3 border-t border-erp-border space-y-2">
                <div className="flex flex-wrap gap-3 text-[13px]">
                  <span className="px-3 py-1.5 rounded-lg bg-erp-success-bg text-erp-success-text border border-erp-success-border">
                    <i className="fa-solid fa-check me-1" />{commitKind === "append" ? L("اتضاف", "Added") : L("اتحفظ", "Saved")}: <b className="num">{summary.saved}</b>
                  </span>
                  {summary.failed > 0 && <span className="px-3 py-1.5 rounded-lg bg-erp-danger-bg text-erp-danger-text border border-erp-danger-border"><i className="fa-solid fa-xmark me-1" />{L("فشل", "Failed")}: <b className="num">{summary.failed}</b></span>}
                  {summary.skipped > 0 && <span className="px-3 py-1.5 rounded-lg bg-erp-warning-bg text-erp-warning-text border border-erp-warning-border"><i className="fa-solid fa-forward me-1" />{L("اتجاهل (أخطاء)", "Skipped (errors)")}: <b className="num">{summary.skipped}</b></span>}
                </div>
                {failedList.length > 0 && (
                  <ul className="max-h-24 overflow-auto text-[12px] text-erp-danger-text space-y-0.5">
                    {failedList.map((r) => <li key={r.id}>• {r.group ? `${L("معاملة", "Trans.")} ${r.group}` : `${L("صف", "Row")} ${r.rows[0].excelRow}`}: {r.saveError}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-erp-border bg-erp-surface">
              <button onClick={close} className="h-11 md:h-10 px-4 rounded-lg border border-erp-border bg-erp-surface text-[13px] font-medium hover:bg-erp-surface-2">
                {phase === "done" ? L("إغلاق", "Close") : L("إلغاء", "Cancel")}
              </button>
              <div className="flex-1 text-[12px] text-erp-text-muted hidden md:block">
                {allOrNothing
                  ? L("وضع الكل أو لا شيء: لو أي صف فشل مفيش حاجة هتتحفظ.", "All-or-nothing: if any row fails, nothing is saved.")
                  : commitKind === "save"
                    ? L("بيتحفظ الصالح بس. الصفوف اللي فيها أخطاء بتتجاهل.", "Only valid rows are saved. Rows with errors are skipped.")
                    : L("الصفوف الصالحة بتتضاف للفاتورة المفتوحة ومفيش حفظ لحد ما تدوس حفظ.", "Valid rows are added to the open document; nothing is saved until you save it.")}
              </div>
              {phase === "ready" && (
                <button
                  onClick={() => void doCommit()}
                  disabled={!!validating || counts.valid === 0 || (allOrNothing && counts.bad > 0)}
                  className="h-11 md:h-10 px-6 rounded-lg bg-erp-accent hover:bg-erp-accent-hover text-white text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <i className={`fa-solid ${commitKind === "append" ? "fa-plus" : "fa-floppy-disk"}`} />
                  {commitKind === "append"
                    ? L(`إضافة ${counts.valid} للفاتورة`, `Add ${counts.valid} to document`)
                    : L(`حفظ ${counts.valid} ${spec.mode === "grid" ? "سجل صالح" : "معاملة صالحة"}`, `Save ${counts.valid} valid ${spec.mode === "grid" ? "record(s)" : "transaction(s)"}`)}
                </button>
              )}
              {phase === "done" && summary && summary.failed > 0 && (
                <button onClick={downloadErrors} className="h-11 md:h-10 px-4 rounded-lg bg-erp-primary text-erp-on-primary text-[13px] font-semibold flex items-center gap-2"><i className="fa-solid fa-download" />{L("تحميل الفاشل Excel", "Download failed (Excel)")}</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

