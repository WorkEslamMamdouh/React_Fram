"use client";

// تاب الطباعة والإكسل — الإكسل شغال (Phase 6) · الطباعة بتخزّن الاختيارات بس (التشغيل في المرحلة 7)
import React, { useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { useScreenBuilder } from "../../store/useScreenBuilder";
import { ParamMapV5, PrintProcConfigV5 } from "../../types/ScreenConfig";
import { DbMeta } from "../../utils/dbMeta";
import ExcelBox from "./ExcelBox";
import { defaultReportCode, syncPrintReport } from "../../../Shared/Reports/printSync";

const inp = "h-8 rounded-md border border-erp-border-strong bg-erp-surface px-2 text-[12px] text-erp-text focus:outline-none focus:border-erp-accent";
const SESSION_LIST = ["CompCode", "BranchCode", "UserID", "UserName", "FinYear", "Today"];

function ProcBox({ title, hint, cfgKey, db, rowMode }: { title: string; hint: string; cfgKey: "listPrint" | "transactionPrint"; db: DbMeta; rowMode: boolean }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const cfg = useScreenBuilder((s) => s.config);
  const mutate = useScreenBuilder((s) => s.mutate);
  const pc: PrintProcConfigV5 = cfg.print[cfgKey];
  const [msg, setMsg] = useState("");
  const up = (patch: Partial<PrintProcConfigV5>) => mutate((c) => { Object.assign(c.print[cfgKey], patch); return c; });
  const setParam = (i: number, patch: Partial<ParamMapV5>) => up({ params: pc.params.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  // Phase 7: إنشاء/تحديث تعريف التقرير (الإجراء + ربط الباراميترات) في إدارة التقارير
  const kind = cfgKey === "listPrint" ? "list" : "transaction";
  async function syncReport() {
    try {
      const code = await syncPrintReport({ module: cfg.module, titleAr: cfg.titleAr, titleEn: cfg.titleEn, kind, usePermissions: cfg.permissions.usePermissions, pc });
      up({ reportCode: code });
      setMsg(t(`Report "${code}" saved. Design its layout from the Reports admin screen (Sys_ReportsAdmin).`, `التقرير "${code}" اتسجل. صمّم شكله من شاشة إدارة التقارير (Sys_ReportsAdmin).`));
    } catch (e: any) { setMsg(e?.message || String(e)); }
  }

  async function loadParams(name: string) {
    if (!name) return;
    const r = await db.procInfo(name);
    if (!r.params.length && r.error) { setMsg(r.error); return; }
    const params: ParamMapV5[] = r.params.filter((p) => !p.isOutput).map((p) => {
      const existing = pc.params.find((x) => x.name.toLowerCase() === p.name.toLowerCase());
      if (existing) return existing;
      const sn = SESSION_LIST.find((s) => s.toLowerCase() === p.name.toLowerCase());
      if (sn) return { name: p.name, source: "session", value: sn };
      if (rowMode && /^(trid|id|docid)$/i.test(p.name)) return { name: p.name, source: "row", value: cfg.keyColumn };
      return { name: p.name, source: rowMode ? "row" : "filter", value: "" };
    });
    up({ proc: name, params });
    setMsg(`${params.length} ${t("parameter(s)", "باراميتر")}`);
  }

  return (
    <div className="rounded-xl border border-erp-border bg-erp-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-[14px] font-semibold text-erp-text cursor-pointer">
          <input type="checkbox" className="accent-[var(--erp-accent)]" checked={pc.enabled} onChange={(e) => up({ enabled: e.target.checked })} /> {title}
        </label>
        <span className="text-[11px] text-erp-text-subtle">{hint}</span>
      </div>
      {pc.enabled && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${inp} w-72`} dir="ltr" list="sb-procs2" placeholder={t("Stored procedure…", "الإجراء المخزن…")} value={pc.proc}
              onChange={(e) => { up({ proc: e.target.value }); if (db.procs.includes(e.target.value)) void loadParams(e.target.value); }} />
            <datalist id="sb-procs2">{db.procs.map((p) => <option key={p} value={p} />)}</datalist>
            <button className="h-8 px-3 rounded-md border border-erp-border-strong text-[12px] hover:border-erp-accent" onClick={() => loadParams(pc.proc)}>{t("Load parameters", "حمّل الباراميترات")}</button>
            <select className={inp} value={pc.paper} onChange={(e) => up({ paper: e.target.value as any })}>{["A4", "A5", "Letter", "Thermal80"].map((p) => <option key={p}>{p}</option>)}</select>
            <select className={inp} value={pc.orientation} onChange={(e) => up({ orientation: e.target.value as any })}><option value="portrait">{t("Portrait", "طولي")}</option><option value="landscape">{t("Landscape", "عرضي")}</option></select>
            {msg && <span className="text-[11px] text-erp-text-muted">{msg}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-erp-text-muted">{t("Report code", "كود التقرير")}</span>
            <input className={`${inp} w-60 font-mono`} dir="ltr" placeholder={defaultReportCode(cfg.module || "Screen", kind)} value={pc.reportCode || ""}
              onChange={(e) => up({ reportCode: e.target.value.replace(/[^A-Za-z0-9_\-]/g, "") })} />
            <button className="h-8 px-3 rounded-md border border-erp-border-strong text-[12px] hover:border-erp-accent" onClick={() => void syncReport()}>
              <i className="fa-solid fa-link me-1" />{t("Create / update the report", "إنشاء / تحديث التقرير")}
            </button>
          </div>
          <div className="space-y-1.5">
            {pc.params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={`${inp} w-40 font-mono`} dir="ltr" value={p.name} onChange={(e) => setParam(i, { name: e.target.value })} />
                <select className={`${inp} w-28`} value={p.source} onChange={(e) => setParam(i, { source: e.target.value as any, value: "" })}>
                  <option value="const">{t("value", "ثابت")}</option><option value="session">{t("session", "جلسة")}</option>
                  <option value="filter">{t("filter", "فلتر")}</option><option value="row">{t("row / TrID", "الصف / TrID")}</option>
                </select>
                {p.source === "session" ? (
                  <select className={`${inp} w-44`} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })}><option value="">—</option>{SESSION_LIST.map((s) => <option key={s}>{s}</option>)}</select>
                ) : p.source === "filter" ? (
                  <select className={`${inp} w-44`} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })}><option value="">—</option>{cfg.filterArea.flatMap((f) => (f.kind === "dateRange" ? [`${f.field}.from`, `${f.field}.to`] : [f.field]).map((v) => <option key={`${f.id}-${v}`} value={v}>{v}</option>))}</select>
                ) : p.source === "row" ? (
                  <select className={`${inp} w-44`} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })}><option value="">—</option>{cfg.fields.map((f) => <option key={f.field}>{f.field}</option>)}</select>
                ) : (
                  <input className={`${inp} w-44`} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })} />
                )}
                <button className="text-erp-text-subtle hover:text-erp-danger" onClick={() => up({ params: pc.params.filter((_, j) => j !== i) })}><i className="fa-solid fa-xmark" /></button>
              </div>
            ))}
            <button className="text-[12px] text-erp-accent hover:underline" onClick={() => up({ params: [...pc.params, { name: "", source: "const", value: "" }] })}>+ {t("Add parameter", "إضافة باراميتر")}</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PrintExcelTab({ db }: { db: DbMeta }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const cfg = useScreenBuilder((s) => s.config);
  const mutate = useScreenBuilder((s) => s.mutate);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="rounded-lg bg-erp-accent-soft text-erp-accent text-[12px] px-3 py-2">
        <i className="fa-solid fa-circle-info me-1" />
        {t("These settings are saved with the screen. Printing opens the report viewer (view / PDF / Excel): press \"Create / update the report\" to register the procedure and parameter mapping, then design the layout in Reports admin. Excel works too.",
          "الإعدادات دي بتتحفظ مع الشاشة. الطباعة بتفتح عارض التقرير (عرض / PDF / Excel): اضغط \"إنشاء / تحديث التقرير\" عشان يتسجل الإجراء وربط الباراميترات، وبعدين صمّم الشكل من إدارة التقارير. والإكسل شغال برضو.")}
      </div>
      <ProcBox title={t("List printing", "طباعة القايمة")} hint={t("Procedure parameters come from the filters", "باراميترات الإجراء من الفلاتر")} cfgKey="listPrint" db={db} rowMode={false} />
      <ProcBox title={t("Transaction printing", "طباعة مستند")} hint={t("Default: CompCode, BranchCode, TrID", "الافتراضي: CompCode, BranchCode, TrID")} cfgKey="transactionPrint" db={db} rowMode />

      <ExcelBox db={db} />
    </div>
  );
}
