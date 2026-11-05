"use client";

// =====================================================================================
//  Sys_ReportsAdmin.ts  -  لوجيك شاشة "إدارة التقارير" (Phase 7)
//   - قايمة التقارير + إنشاء/تعديل تعريف (الاسم، النوع قائمة/مستند، الشاشة، الإجراء، ربط الباراميترات)
//   - التصاميم لكل نطاق (الكل / شركة / فرع): تصميم · تكرار · افتراضي · حذف
//   - المصمم (Stimulsoft) بيتفتح بملء الشاشة فوق الصفحة
//  الباك: api/Reports/*   (الصلاحية: أدمن، أو EXECUTE+EDIT على Sys_ReportsAdmin)
//  MODULE_CODE = Sys_ReportsAdmin
// =====================================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import { ReportsApi } from "../Shared/Reports/ReportApi";
import { openReport } from "../Shared/Reports/openReport";
import { LayoutMeta, ReportDef, ReportKind, ReportLookups, ReportParamDef, ReportScope } from "../Shared/Reports/ReportTypes";

export const SESSION_NAMES = ["CompCode", "BranchCode", "UserID", "FinYear", "Today"];

export const emptyDef = (): ReportDef => ({ ReportCode: "", NameA: "", NameE: "", Kind: "list", MODULE_CODE: "", ProcName: "", IsActive: true, Params: [] });

const err = (e: any) => { const m = e?.message || String(e); Sys.ShowMessage(m, m, "error"); };

export interface DesignerTarget { code: string; layoutId?: number; scope: ReportScope; comp: number | null; branch: number | null }
export interface DupTarget { layoutId: number; scope: ReportScope; comp: number | null; branch: number | null }

export function Sys_ReportsAdmin() {
  const didRun = useRef(false);
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const [reports, setReports] = useState<ReportDef[]>([]);
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [lookups, setLookups] = useState<ReportLookups | null>(null);
  const [procs, setProcs] = useState<string[]>([]);

  const [editor, setEditor] = useState({ open: false, isNew: true, saving: false, def: emptyDef(), msg: "", warn: "" });
  const [layoutsFor, setLayoutsFor] = useState<ReportDef | null>(null);
  const [layouts, setLayouts] = useState<LayoutMeta[]>([]);
  const [designer, setDesigner] = useState<DesignerTarget | null>(null);
  const [dup, setDup] = useState<DupTarget | null>(null);

  const Load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ReportsApi.listReports();
      setReports(r.Reports);
      setMode(r.Mode);
    } catch (e) { err(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    void Load();
    ReportsApi.lookups().then(setLookups).catch(() => { /* shown when needed */ });
    ReportsApi.procs().then(setProcs).catch(() => { /* ignore */ });
  }, [Load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => [r.ReportCode, r.NameA, r.NameE, r.MODULE_CODE || "", r.ProcName].some((x) => (x || "").toLowerCase().includes(q)));
  }, [reports, search]);

  // ---------------- تعريف التقرير
  const OpenNew = () => setEditor({ open: true, isNew: true, saving: false, def: emptyDef(), msg: "", warn: "" });
  const OpenEdit = (d: ReportDef) => setEditor({ open: true, isNew: false, saving: false, def: JSON.parse(JSON.stringify(d)), msg: "", warn: "" });
  const CloseEditor = () => setEditor((e) => ({ ...e, open: false }));
  const SetDef = (patch: Partial<ReportDef>) => setEditor((e) => ({ ...e, def: { ...e.def, ...patch } }));
  const SetParam = (i: number, patch: Partial<ReportParamDef>) =>
    setEditor((e) => ({ ...e, def: { ...e.def, Params: e.def.Params.map((p, j) => (j === i ? { ...p, ...patch } : p)) } }));
  const AddParam = () => setEditor((e) => ({ ...e, def: { ...e.def, Params: [...e.def.Params, { ParamName: "", Source: "const", SourceValue: "" }] } }));
  const RemoveParam = (i: number) => setEditor((e) => ({ ...e, def: { ...e.def, Params: e.def.Params.filter((_, j) => j !== i) } }));

  async function LoadParams() {
    const d = editor.def;
    if (!d.ProcName.trim()) return;
    try {
      const pi = await ReportsApi.procParams(d.ProcName.trim());
      const params: ReportParamDef[] = pi.Parameters.filter((p) => !p.IsOutput).map((p) => {
        const ex = d.Params.find((x) => x.ParamName.toLowerCase() === p.Name.toLowerCase());
        if (ex) return ex;
        if (/^(comp|compcode)$/i.test(p.Name)) return { ParamName: p.Name, Source: "session", SourceValue: "CompCode" };
        if (/^(branch|branchcode)$/i.test(p.Name)) return { ParamName: p.Name, Source: "session", SourceValue: "BranchCode" };
        if (/^(userid)$/i.test(p.Name)) return { ParamName: p.Name, Source: "session", SourceValue: "UserID" };
        if (/^(finyear)$/i.test(p.Name)) return { ParamName: p.Name, Source: "session", SourceValue: "FinYear" };
        if (d.Kind === "transaction" && /^(trid|id|docid|invoiceid)$/i.test(p.Name)) return { ParamName: p.Name, Source: "trid", SourceValue: "TrID" };
        return { ParamName: p.Name, Source: "filter", SourceValue: p.Name };
      });
      setEditor((e) => ({ ...e, def: { ...e.def, Params: params }, msg: `${params.length} ${t("parameter(s) loaded", "باراميتر اتحمّل")} · ${pi.Columns.length} ${t("result column(s)", "عمود في النتيجة")}`, warn: pi.Warning || "" }));
    } catch (e) { err(e); }
  }

  async function SaveDef() {
    const d = editor.def;
    if (!d.ReportCode.trim()) { Sys.ShowMessage("Report code is required", "كود التقرير مطلوب", "warning"); return; }
    if (!d.NameA.trim() && !d.NameE.trim()) { Sys.ShowMessage("Report name is required", "اسم التقرير مطلوب", "warning"); return; }
    setEditor((e) => ({ ...e, saving: true }));
    try {
      await ReportsApi.saveReport({ ...d, ReportCode: d.ReportCode.trim() });
      Sys.ShowMessage("Report saved", "اتحفظ التقرير", "success");
      CloseEditor();
      await Load();
    } catch (e) { err(e); }
    setEditor((e) => ({ ...e, saving: false }));
  }

  async function DeleteDef(d: ReportDef) {
    const ok = await Sys.Confirm(`Delete report "${d.ReportCode}" and ALL its layouts?`, `حذف التقرير "${d.ReportCode}" وكل تصاميمه؟`, { okEn: "Delete", okAr: "حذف" });
    if (!ok) return;
    try { await ReportsApi.deleteReport(d.ReportCode); await Load(); } catch (e) { err(e); }
  }

  const TestPrint = (d: ReportDef) => openReport({ reportCode: d.ReportCode, filters: {}, row: {} });

  // ---------------- التصاميم
  const ReloadLayouts = useCallback(async (code: string) => {
    try { setLayouts(await ReportsApi.listLayouts(code)); } catch (e) { err(e); }
  }, []);
  const OpenLayouts = async (d: ReportDef) => { setLayoutsFor(d); setLayouts([]); await ReloadLayouts(d.ReportCode); };
  const CloseLayouts = () => setLayoutsFor(null);

  const DesignLayout = (l?: LayoutMeta) => {
    if (!layoutsFor) return;
    setDesigner({ code: layoutsFor.ReportCode, layoutId: l?.LayoutId, scope: l?.Scope || "all", comp: l?.CompCode ?? null, branch: l?.BranchCode ?? null });
  };
  const CloseDesigner = () => setDesigner(null);

  const OpenDup = (l: LayoutMeta) => setDup({ layoutId: l.LayoutId, scope: l.Scope, comp: l.CompCode, branch: l.BranchCode });
  const CloseDup = () => setDup(null);
  async function DoDup() {
    if (!dup || !layoutsFor) return;
    try {
      await ReportsApi.duplicateLayout(dup.layoutId, dup.scope, dup.scope === "all" ? null : dup.comp, dup.scope === "branch" ? dup.branch : null);
      setDup(null);
      await ReloadLayouts(layoutsFor.ReportCode);
      Sys.ShowMessage("Layout duplicated", "اتكرر التصميم", "success");
    } catch (e) { err(e); }
  }
  async function SetDefault(l: LayoutMeta) {
    try { await ReportsApi.setDefaultLayout(l.LayoutId); if (layoutsFor) await ReloadLayouts(layoutsFor.ReportCode); } catch (e) { err(e); }
  }
  async function DeleteLayout(l: LayoutMeta) {
    const ok = await Sys.Confirm(`Delete layout #${l.LayoutId}?`, `حذف التصميم رقم ${l.LayoutId}؟`, { okEn: "Delete", okAr: "حذف" });
    if (!ok) return;
    try { await ReportsApi.deleteLayout(l.LayoutId); if (layoutsFor) await ReloadLayouts(layoutsFor.ReportCode); } catch (e) { err(e); }
  }

  const compName = (c: number | null) => {
    const x = lookups?.Companies.find((k) => k.CompCode === c);
    return c == null ? "—" : `${c}${x ? " - " + (IsLangEN ? x.NameE || x.NameA : x.NameA || x.NameE) : ""}`;
  };
  const branchName = (c: number | null, b: number | null) => {
    const x = lookups?.Branches.find((k) => k.CompCode === c && k.BranchCode === b);
    return b == null ? "—" : `${b}${x ? " - " + (IsLangEN ? x.BranchDescE || x.BranchDescA : x.BranchDescA || x.BranchDescE) : ""}`;
  };

  return {
    IsLangEN, t, reports: filtered, total: reports.length, mode, loading, search, setSearch, Load, lookups, procs,
    editor, OpenNew, OpenEdit, CloseEditor, SetDef, SetParam, AddParam, RemoveParam, LoadParams, SaveDef, DeleteDef, TestPrint,
    layoutsFor, layouts, OpenLayouts, CloseLayouts, DesignLayout, ReloadLayouts, designer, CloseDesigner,
    dup, setDup, OpenDup, CloseDup, DoDup, SetDefault, DeleteLayout, compName, branchName,
  };
}

export type KindType = ReportKind;
