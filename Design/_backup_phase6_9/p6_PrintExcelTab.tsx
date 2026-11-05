"use client";

// تاب الطباعة والإكسل — بيخزّن الاختيارات بس (التشغيل الفعلي في المرحلة 6 و7)
import React, { useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { useScreenBuilder } from "../../store/useScreenBuilder";
import { ParamMapV5, PrintProcConfigV5 } from "../../types/ScreenConfig";
import { DbMeta } from "../../utils/dbMeta";

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
                  <select className={`${inp} w-44`} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })}><option value="">—</option>{cfg.filterArea.map((f) => <option key={f.id} value={f.field}>{f.field}</option>)}</select>
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
  const ex = cfg.excel;
  const upEx = (patch: Partial<typeof ex>) => mutate((c) => { Object.assign(c.excel, patch); return c; });
  const toggleCol = (name: string) => upEx({ columns: ex.columns.includes(name) ? ex.columns.filter((x) => x !== name) : [...ex.columns, name] });
  const lookup = (name: string) => ex.keyLookups.find((l) => l.column === name);
  const setLookup = (name: string, patch: Partial<{ table: string; valueField: string; displayField: string }> | null) =>
    upEx({ keyLookups: patch === null ? ex.keyLookups.filter((l) => l.column !== name) : lookup(name) ? ex.keyLookups.map((l) => (l.column === name ? { ...l, ...patch } : l)) : [...ex.keyLookups, { column: name, table: "", valueField: "", displayField: "", ...patch }] });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="rounded-lg bg-erp-accent-soft text-erp-accent text-[12px] px-3 py-2">
        <i className="fa-solid fa-circle-info me-1" />
        {t("These settings are saved with the screen. Printing (Phase 7) and Excel (Phase 6) run later; until then the generated buttons show \"coming soon\".",
          "الإعدادات دي بتتحفظ مع الشاشة. التشغيل الفعلي للطباعة (مرحلة 7) والإكسل (مرحلة 6) هييجي بعدين، ولحد وقتها الأزرار بتقول \"قريبًا\".")}
      </div>
      <ProcBox title={t("List printing", "طباعة القايمة")} hint={t("Procedure parameters come from the filters", "باراميترات الإجراء من الفلاتر")} cfgKey="listPrint" db={db} rowMode={false} />
      <ProcBox title={t("Transaction printing", "طباعة مستند")} hint={t("Default: CompCode, BranchCode, TrID", "الافتراضي: CompCode, BranchCode, TrID")} cfgKey="transactionPrint" db={db} rowMode />

      <div className="rounded-xl border border-erp-border bg-erp-surface p-4 space-y-3">
        <label className="flex items-center gap-2 text-[14px] font-semibold text-erp-text cursor-pointer">
          <input type="checkbox" className="accent-[var(--erp-accent)]" checked={ex.enabled} onChange={(e) => upEx({ enabled: e.target.checked })} /> {t("Excel template download / upload", "تحميل ورفع تمبلت إكسل")}
        </label>
        {ex.enabled && (
          <>
            <input className={`${inp} w-64`} placeholder={t("Template name", "اسم التمبلت")} value={ex.templateName} onChange={(e) => upEx({ templateName: e.target.value })} />
            <div className="text-[12px] text-erp-text-muted">{t("Template columns (tick) and optional key lookups (a code column that is matched to a name from another table):", "أعمدة التمبلت (علّم) وتحويل المفاتيح (عمود كود بيتطابق مع اسم من جدول تاني):")}</div>
            <div className="space-y-1.5">
              {cfg.fields.filter((f) => !f.noSave && !f.auto).map((f) => (
                <div key={f.field} className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 w-56 text-[12px]"><input type="checkbox" className="accent-[var(--erp-accent)]" checked={ex.columns.includes(f.field)} onChange={() => toggleCol(f.field)} />{f.field}</label>
                  {ex.columns.includes(f.field) && (
                    <>
                      <label className="flex items-center gap-1 text-[11px] text-erp-text-muted"><input type="checkbox" checked={!!lookup(f.field)} onChange={(e) => setLookup(f.field, e.target.checked ? {} : null)} />{t("lookup", "تحويل مفتاح")}</label>
                      {lookup(f.field) && (
                        <>
                          <input className={`${inp} w-40`} dir="ltr" list="sb-objs2" placeholder="table" value={lookup(f.field)!.table} onChange={(e) => setLookup(f.field, { table: e.target.value })} />
                          <input className={`${inp} w-32`} dir="ltr" placeholder="value col" value={lookup(f.field)!.valueField} onChange={(e) => setLookup(f.field, { valueField: e.target.value })} />
                          <input className={`${inp} w-32`} dir="ltr" placeholder="display col" value={lookup(f.field)!.displayField} onChange={(e) => setLookup(f.field, { displayField: e.target.value })} />
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
              <datalist id="sb-objs2">{db.objects.map((o) => <option key={o.name} value={o.name} />)}</datalist>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
