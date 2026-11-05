"use client";

// =====================================================================================
//  Sys_ReportsAdmin/page.tsx  -  الشكل بس (اللوجيك في Sys_ReportsAdmin.ts)
// =====================================================================================

import { Sys_ReportsAdmin, SESSION_NAMES } from "./Sys_ReportsAdmin";
import { Badge, Field, Modal, btnAccent, btnDanger, btnOutline, inputCls } from "../Sys_UsersAdmin/AdminUi";
import ReportDesigner from "../Shared/Reports/ReportDesigner";
import { ReportKind, ReportScope } from "../Shared/Reports/ReportTypes";

export default function InitalizeComponent() {
  const p = Sys_ReportsAdmin();
  return <Sys_ReportsAdminPage {...p} />;
}

type Props = ReturnType<typeof Sys_ReportsAdmin>;

const iconBtn = "flex h-9 w-9 items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-3 max-md:h-11 max-md:w-11";

function Sys_ReportsAdminPage(p: Props) {
  const t = p.t;
  const e = p.editor;
  const d = e.def;
  const nm = (a: { NameA: string; NameE: string }) => (p.IsLangEN ? a.NameE || a.NameA : a.NameA || a.NameE);
  const scopeLabel = (s: ReportScope) => (s === "all" ? t("All companies", "كل الشركات") : s === "company" ? t("Company", "شركة") : t("Branch", "فرع"));
  const kindLabel = (k: ReportKind) => (k === "list" ? t("List", "قائمة") : t("Transaction", "مستند"));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-erp-text md:text-[28px]">{t("Reports", "إدارة التقارير")}</h1>
          <p className="text-[13px] text-erp-text-muted">
            {t("Define printable reports (list / transaction) on top of stored procedures, then design their layouts per company or branch.", "عرّف تقارير الطباعة (قائمة / مستند) فوق إجراءات مخزنة، وصمّم شكلها لكل شركة أو فرع.")}
            {p.mode && <span className="ms-2 rounded-md bg-erp-surface-2 px-2 py-0.5 text-[11px]" dir="ltr">{p.mode === "database" ? "Storage: database" : "Storage: files (App_Data/Reports)"}</span>}
          </p>
        </div>
        <button type="button" className={btnAccent} onClick={p.OpenNew}><i className="fa-solid fa-plus" aria-hidden="true" /> {t("New report", "تقرير جديد")}</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-3">
        <input className={`${inputCls} max-w-sm`} placeholder={t("Search reports...", "بحث في التقارير...")} value={p.search} onChange={(ev) => p.setSearch(ev.target.value)} aria-label={t("Search", "بحث")} />
        <span className="text-[12px] text-erp-text-muted">{p.reports.length} / {p.total}</span>
        <button type="button" className={`${btnOutline} ms-auto`} onClick={p.Load} disabled={p.loading}><i className="fa-solid fa-rotate" aria-hidden="true" /> {t("Refresh", "تحديث")}</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-erp-border bg-erp-surface">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="bg-erp-surface-2 text-erp-text-muted">
            <tr>
              {[t("Code", "الكود"), t("Name", "الاسم"), t("Type", "النوع"), t("Screen", "الشاشة"), t("Procedure", "الإجراء"), t("Status", "الحالة"), ""].map((h, i) => (
                <th key={i} className="px-3 py-2 text-start font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.reports.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-erp-text-muted">{p.loading ? t("Loading...", "جاري التحميل...") : t("No reports yet. Create one with \"New report\" or from the ScreenBuilder print tab.", "لا توجد تقارير. أنشئ واحد بزر \"تقرير جديد\" أو من تاب الطباعة في ScreenBuilder.")}</td></tr>
            )}
            {p.reports.map((r) => (
              <tr key={r.ReportCode} className="border-t border-erp-border hover:bg-erp-surface-2/50">
                <td className="px-3 py-2 font-mono text-[12px]" dir="ltr">{r.ReportCode}</td>
                <td className="px-3 py-2">{nm(r)}</td>
                <td className="px-3 py-2"><Badge tone={r.Kind === "list" ? "info" : "warning"}>{kindLabel(r.Kind)}</Badge></td>
                <td className="px-3 py-2 font-mono text-[12px]" dir="ltr">{r.MODULE_CODE || "—"}</td>
                <td className="px-3 py-2 font-mono text-[12px]" dir="ltr">{r.ProcName || "—"}</td>
                <td className="px-3 py-2">{r.IsActive ? <Badge tone="success">{t("Active", "فعّال")}</Badge> : <Badge tone="danger">{t("Disabled", "معطّل")}</Badge>}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button type="button" className={iconBtn} title={t("Layouts / design", "التصاميم / التصميم")} aria-label={t("Layouts", "التصاميم")} onClick={() => void p.OpenLayouts(r)}><i className="fa-solid fa-pen-ruler" aria-hidden="true" /></button>
                    <button type="button" className={iconBtn} title={t("Test print", "تجربة طباعة")} aria-label={t("Test print", "تجربة طباعة")} onClick={() => p.TestPrint(r)}><i className="fa-solid fa-print" aria-hidden="true" /></button>
                    <button type="button" className={iconBtn} title={t("Edit definition", "تعديل التعريف")} aria-label={t("Edit", "تعديل")} onClick={() => p.OpenEdit(r)}><i className="fa-solid fa-pen" aria-hidden="true" /></button>
                    <button type="button" className={`${iconBtn} text-erp-danger-text`} title={t("Delete", "حذف")} aria-label={t("Delete", "حذف")} onClick={() => void p.DeleteDef(r)}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- تعريف التقرير ---------- */}
      <Modal open={e.open} wide onClose={p.CloseEditor} title={e.isNew ? t("New report", "تقرير جديد") : `${t("Edit report", "تعديل تقرير")} - ${d.ReportCode}`}
        footer={<>
          <button type="button" className={btnOutline} onClick={p.CloseEditor}>{t("Cancel", "إلغاء")}</button>
          <button type="button" className={btnAccent} disabled={e.saving} onClick={() => void p.SaveDef()}>{e.saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}</button>
        </>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={t("Report code", "كود التقرير")} required hint={t("Letters, digits, _ and - only", "حروف وأرقام و _ و - فقط")}>
            <input className={inputCls} dir="ltr" disabled={!e.isNew} value={d.ReportCode} onChange={(ev) => p.SetDef({ ReportCode: ev.target.value })} />
          </Field>
          <Field label={t("Type", "النوع")}>
            <select className={inputCls} value={d.Kind} onChange={(ev) => p.SetDef({ Kind: ev.target.value as ReportKind })}>
              <option value="list">{t("List (parameters from the screen filters)", "قائمة (باراميترات من فلاتر الشاشة)")}</option>
              <option value="transaction">{t("Transaction (CompCode, BranchCode, TrID)", "مستند (CompCode, BranchCode, TrID)")}</option>
            </select>
          </Field>
          <Field label={t("Name (Arabic)", "الاسم (عربي)")} required><input className={inputCls} value={d.NameA} onChange={(ev) => p.SetDef({ NameA: ev.target.value })} /></Field>
          <Field label={t("Name (English)", "الاسم (إنجليزي)")}><input className={inputCls} dir="ltr" value={d.NameE} onChange={(ev) => p.SetDef({ NameE: ev.target.value })} /></Field>
          <Field label={t("Screen (PRINT permission)", "الشاشة (صلاحية الطباعة)")} hint={t("Users need PRINT on this screen to run the report", "المستخدم محتاج صلاحية PRINT على الشاشة دي")}>
            <select className={inputCls} value={d.MODULE_CODE || ""} onChange={(ev) => p.SetDef({ MODULE_CODE: ev.target.value })}>
              <option value="">—</option>
              {(p.lookups?.Modules || []).map((m) => <option key={m.MODULE_CODE} value={m.MODULE_CODE}>{m.MODULE_CODE} - {p.IsLangEN ? m.DescE || m.DescA : m.DescA || m.DescE}</option>)}
            </select>
          </Field>
          <Field label={t("Stored procedure", "الإجراء المخزن")} required>
            <div className="flex gap-2">
              <input className={inputCls} dir="ltr" list="rpt-procs" value={d.ProcName} onChange={(ev) => p.SetDef({ ProcName: ev.target.value })} />
              <datalist id="rpt-procs">{p.procs.map((x) => <option key={x} value={x} />)}</datalist>
              <button type="button" className={btnOutline} onClick={() => void p.LoadParams()}>{t("Load parameters", "حمّل الباراميترات")}</button>
            </div>
          </Field>
        </div>
        {e.msg && <p className="mt-2 text-[12px] text-erp-text-muted">{e.msg}</p>}
        {e.warn && <p className="mt-1 rounded-md bg-erp-warning-bg px-2 py-1 text-[12px] text-erp-warning-text">{e.warn}</p>}

        <h4 className="mb-2 mt-4 text-[13px] font-semibold text-erp-text">{t("Parameter mapping", "ربط الباراميترات")}</h4>
        <div className="space-y-2">
          {d.Params.length === 0 && <p className="text-[12px] text-erp-text-muted">{t("No parameters. Pick the procedure then \"Load parameters\".", "لا توجد باراميترات. اختار الإجراء واضغط \"حمّل الباراميترات\".")}</p>}
          {d.Params.map((pa, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <input className={`${inputCls} col-span-4 font-mono`} dir="ltr" aria-label={t("Parameter", "الباراميتر")} value={pa.ParamName} onChange={(ev) => p.SetParam(i, { ParamName: ev.target.value })} />
              <select className={`${inputCls} col-span-3`} aria-label={t("Source", "المصدر")} value={pa.Source} onChange={(ev) => p.SetParam(i, { Source: ev.target.value as any, SourceValue: "" })}>
                <option value="filter">{t("Screen filter", "فلتر الشاشة")}</option>
                <option value="session">{t("Session", "الجلسة")}</option>
                <option value="const">{t("Constant", "قيمة ثابتة")}</option>
                <option value="trid">{t("Row / TrID", "الصف / TrID")}</option>
              </select>
              {pa.Source === "session" ? (
                <select className={`${inputCls} col-span-4`} value={pa.SourceValue} onChange={(ev) => p.SetParam(i, { SourceValue: ev.target.value })}>
                  <option value="">—</option>{SESSION_NAMES.map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : (
                <input className={`${inputCls} col-span-4`} dir="ltr" aria-label={t("Value", "القيمة")}
                  placeholder={pa.Source === "filter" ? t("filter field (or Field.from / Field.to)", "حقل الفلتر (أو Field.from / Field.to)") : pa.Source === "trid" ? t("key column (TrID)", "عمود المفتاح (TrID)") : ""}
                  value={pa.SourceValue} onChange={(ev) => p.SetParam(i, { SourceValue: ev.target.value })} />
              )}
              <button type="button" className={`${iconBtn} col-span-1`} aria-label={t("Remove", "حذف")} onClick={() => p.RemoveParam(i)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </div>
          ))}
          <button type="button" className="text-[12px] text-erp-accent hover:underline" onClick={p.AddParam}>+ {t("Add parameter", "إضافة باراميتر")}</button>
        </div>
        <label className="mt-4 flex items-center gap-2 text-[13px] text-erp-text">
          <input type="checkbox" className="accent-[var(--erp-accent)]" checked={d.IsActive} onChange={(ev) => p.SetDef({ IsActive: ev.target.checked })} /> {t("Active", "فعّال")}
        </label>
      </Modal>

      {/* ---------- التصاميم ---------- */}
      <Modal open={!!p.layoutsFor} wide onClose={p.CloseLayouts} title={`${t("Layouts", "التصاميم")} - ${p.layoutsFor?.ReportCode || ""}`}
        footer={<>
          <button type="button" className={btnOutline} onClick={p.CloseLayouts}>{t("Close", "إغلاق")}</button>
          <button type="button" className={btnAccent} onClick={() => p.DesignLayout()}><i className="fa-solid fa-plus" aria-hidden="true" /> {t("New layout", "تصميم جديد")}</button>
        </>}>
        <p className="mb-3 text-[12px] text-erp-text-muted">{t("Most specific wins: branch layout, then company layout, then the general one. With no layout the system prints an automatic table.", "الأخص يكسب: تصميم الفرع، بعدين الشركة، بعدين العام. ومن غير تصميم بيطبع جدول تلقائي.")}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="bg-erp-surface-2 text-erp-text-muted">
              <tr>{["#", t("Scope", "النطاق"), t("Company", "الشركة"), t("Branch", "الفرع"), t("Paper", "الورق"), t("Default", "افتراضي"), ""].map((h, i) => <th key={i} className="px-2 py-2 text-start font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {p.layouts.length === 0 && <tr><td colSpan={7} className="px-2 py-6 text-center text-erp-text-muted">{t("No saved layouts (automatic layout is used).", "لا توجد تصاميم محفوظة (بيتم استخدام التصميم التلقائي).")}</td></tr>}
              {p.layouts.map((l) => (
                <tr key={l.LayoutId} className="border-t border-erp-border">
                  <td className="px-2 py-2 num">{l.LayoutId}</td>
                  <td className="px-2 py-2">{scopeLabel(l.Scope)}</td>
                  <td className="px-2 py-2">{l.Scope === "all" ? "—" : p.compName(l.CompCode)}</td>
                  <td className="px-2 py-2">{l.Scope === "branch" ? p.branchName(l.CompCode, l.BranchCode) : "—"}</td>
                  <td className="px-2 py-2" dir="ltr">{l.PaperSize} · {l.Orientation === "landscape" ? "L" : "P"}</td>
                  <td className="px-2 py-2">{l.IsDefault ? <Badge tone="success">{t("Default", "افتراضي")}</Badge> : <button type="button" className="text-[12px] text-erp-accent hover:underline" onClick={() => void p.SetDefault(l)}>{t("Make default", "اجعله افتراضي")}</button>}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <button type="button" className={iconBtn} title={t("Design", "تصميم")} aria-label={t("Design", "تصميم")} onClick={() => p.DesignLayout(l)}><i className="fa-solid fa-pen-ruler" aria-hidden="true" /></button>
                      <button type="button" className={iconBtn} title={t("Duplicate", "تكرار")} aria-label={t("Duplicate", "تكرار")} onClick={() => p.OpenDup(l)}><i className="fa-solid fa-copy" aria-hidden="true" /></button>
                      <button type="button" className={`${iconBtn} text-erp-danger-text`} title={t("Delete", "حذف")} aria-label={t("Delete", "حذف")} onClick={() => void p.DeleteLayout(l)}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* ---------- تكرار تصميم ---------- */}
      <Modal open={!!p.dup} onClose={p.CloseDup} title={t("Duplicate layout", "تكرار التصميم")}
        footer={<>
          <button type="button" className={btnOutline} onClick={p.CloseDup}>{t("Cancel", "إلغاء")}</button>
          <button type="button" className={btnAccent} onClick={() => void p.DoDup()}>{t("Duplicate", "تكرار")}</button>
        </>}>
        {p.dup && (
          <div className="space-y-3">
            <p className="text-[12px] text-erp-text-muted">{t("Copy this layout to another scope (e.g. a company with its own logo).", "انسخ التصميم لنطاق تاني (مثلًا شركة ليها لوجو خاص).")}</p>
            <Field label={t("Scope", "النطاق")}>
              <select className={inputCls} value={p.dup.scope} onChange={(ev) => p.setDup({ ...p.dup!, scope: ev.target.value as ReportScope })}>
                <option value="all">{t("All companies", "كل الشركات")}</option><option value="company">{t("One company", "شركة واحدة")}</option><option value="branch">{t("One branch", "فرع واحد")}</option>
              </select>
            </Field>
            {p.dup.scope !== "all" && (
              <Field label={t("Company", "الشركة")}>
                <select className={inputCls} value={p.dup.comp ?? ""} onChange={(ev) => p.setDup({ ...p.dup!, comp: ev.target.value === "" ? null : Number(ev.target.value), branch: null })}>
                  <option value="">—</option>{(p.lookups?.Companies || []).map((c) => <option key={c.CompCode} value={c.CompCode}>{c.CompCode} - {p.IsLangEN ? c.NameE || c.NameA : c.NameA || c.NameE}</option>)}
                </select>
              </Field>
            )}
            {p.dup.scope === "branch" && (
              <Field label={t("Branch", "الفرع")}>
                <select className={inputCls} value={p.dup.branch ?? ""} onChange={(ev) => p.setDup({ ...p.dup!, branch: ev.target.value === "" ? null : Number(ev.target.value) })}>
                  <option value="">—</option>{(p.lookups?.Branches || []).filter((b) => b.CompCode === p.dup!.comp).map((b) => <option key={b.BranchCode} value={b.BranchCode}>{b.BranchCode} - {p.IsLangEN ? b.BranchDescE || b.BranchDescA : b.BranchDescA || b.BranchDescE}</option>)}
                </select>
              </Field>
            )}
          </div>
        )}
      </Modal>

      {p.designer && (
        <ReportDesigner key={`${p.designer.code}-${p.designer.layoutId || "new"}`} reportCode={p.designer.code} layoutId={p.designer.layoutId}
          initialScope={p.designer.scope} initialComp={p.designer.comp} initialBranch={p.designer.branch}
          onClose={p.CloseDesigner} onSaved={() => void p.ReloadLayouts(p.designer!.code)} />
      )}
    </div>
  );
}

void btnDanger;
