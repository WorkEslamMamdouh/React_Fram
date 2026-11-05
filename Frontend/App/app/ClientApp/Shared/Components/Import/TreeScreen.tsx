'use client';

// =====================================================================================
//  🌳 TreeScreen.tsx — شاشة شجرة كاملة (زي شجرة الحسابات / مراكز التكلفة)
// -------------------------------------------------------------------------------------
//  الشمال (أو اليمين في العربي): الشجرة (TreeView) — بحث + Infinite Scroll + تحميل كسول
//  الجنب التاني: بيانات العقدة المختارة (عرض / تعديل / إضافة ابن / إضافة جذر / حذف)
//                + تفاصيل اختيارية للعقدة (زي الماستر ديتيل بالظبط)
//
//  الحفظ بيستخدم نفس طريقة الماستر ديتيل:
//    إضافة → SQL.InsertMasterDetail   تعديل → SQL.UpdateMasterDetail   حذف → SQL.DeleteMasterDetail
//
//  ذكاء الإضافة:
//    • parentColumn بيتملي لوحده بكود الأب
//    • levelColumn = مستوى الأب + 1
//    • codeColumn = كود الأب + مسلسل جديد (01، 02 ...) لو autoCode مش false
//    • لو الأب متعلّم "نهائي" (leafColumn) بيسألك تحوله لمجموعة
//
//  الاستخدام:  <TreeScreen config={p.Config} />
// =====================================================================================

import React, { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { SQL } from "../../CallDataBase";
import { Sys } from "../../SystemTools";
import { useSys } from "../../SystemUsing";
import { RunValidations, SqlLiteral } from "../../Validation";
import { ColumnMode } from "./ModelGrid";
import { MasterDetailColumn, MasterDetailConfig } from "./ModelMasterDetail";
import { TreeNode, TreeScreenConfig } from "./ModelTree";
import TreeView, { TreeViewHandle } from "./TreeView";
import { buildSaveRow, DetailsEditor, emptyRow, FieldInput, isBlankRow, recalc } from "./MasterDetail";
const SearchModal = lazy(() => import("./SearchModal"));

type Row = Record<string, any>;
type Mode = "empty" | "view" | "new" | "edit";

// الأكواد دايماً نص (عشان 0101 متتحولش لرقم 101)
const codeLit = (v: any) => "N'" + String(v ?? "").replace(/'/g, "''") + "'";
const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
let uid = 0;
const newUid = () => "t" + ++uid;

export default function TreeScreen({ config, height = "calc(100vh - 170px)" }: { config: TreeScreenConfig; height?: string }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const lang = useSys((s) => s.lang);
  const isDark = useSys((s) => s.IsDark);
  const ShowLoader = useSys((s) => s.ShowLoader);
  const CloseLoader = useSys((s) => s.CloseLoader);
  const t = useCallback((en: string, ar: string) => (IsLangEN ? en : ar), [IsLangEN]);

  const tree = useRef<TreeViewHandle>(null);
  const detailCfgs = config.details || [];
  // الماستر ديتيل محتاج config بالشكل ده عشان الحسابات (Formula / Totals)
  const mdCfg = useMemo(() => ({ columns: config.columns, details: detailCfgs } as unknown as MasterDetailConfig), [config.columns, detailCfgs]);

  const [mode, setMode] = useState<Mode>("empty");
  const modeRef = useRef<Mode>("empty");
  modeRef.current = mode;
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [parentForNew, setParentForNew] = useState<TreeNode | null>(null);
  const [master, setMaster] = useState<Row>({});
  const [details, setDetails] = useState<Row[][]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [searchTarget, setSearchTarget] = useState<{ col: MasterDetailColumn; detail: number; rowIndex: number } | null>(null);

  const enableInsert = config.enableInsert !== false;
  const enableUpdate = config.enableUpdate !== false;
  const enableDelete = config.enableDelete !== false;
  const readOnly = mode === "view";
  const isInsert = mode === "new";

  const card = "bg-erp-surface border-erp-border text-erp-text";
  const muted = "text-erp-text-muted";
  const btnOutline = `px-3 py-2 rounded-xl border-2 text-sm font-medium transition ${"border-erp-border-strong hover:border-erp-accent"}`;

  // ---------- تحديث القيم ----------
  const update = (m: Row, d: Row[][]) => {
    const r = recalc(m, d, mdCfg);
    setMaster(r.master);
    setDetails(r.details);
  };
  const setMasterField = (field: string, value: any, extra?: Row) => {
    update({ ...master, [field]: value, ...(extra || {}) }, details);
    if (errors["m." + field]) setErrors({ ...errors, ["m." + field]: "" });
  };
  const setDetailField = (d: number, i: number, field: string, value: any, extra?: Row) => {
    update(master, details.map((rows, di) => (di !== d ? rows : rows.map((r, ri) => (ri !== i ? r : { ...r, [field]: value, ...(extra || {}) })))));
  };

  // ---------- مسار العقدة (للعنوان) ----------
  const pathOf = (node: TreeNode | null): TreeNode[] => {
    const out: TreeNode[] = [];
    let cur = node;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.code) && out.length < 50) {
      seen.add(cur.code);
      out.unshift(cur);
      cur = cur.parent ? tree.current?.getNode(cur.parent) || null : null;
    }
    return out;
  };

  // ---------- تحميل عقدة كاملة (من الجدول + التفاصيل) ----------
  const loadNode = useCallback(
    async (node: TreeNode, nextMode: Mode) => {
      try {
        ShowLoader();
        const keyCond = `${config.keyColumn} = ${SqlLiteral(node.key)}`;
        const m = await SQL.Select(config.tableName, keyCond);
        const row: Row = { ...node.row, ...(m.data?.[0] || {}) };
        const loaded: Row[][] = [];
        for (const d of detailCfgs) {
          const res = await SQL.Select(d.viewName || d.tableName, `${d.foreignKeyColumn} = ${SqlLiteral(node.key)}`, null, null, null, 0, d.orderBy || d.keyColumn, "ASC");
          loaded.push((res.data || []).map((r: Row) => ({ ...r, __uid: newUid() })));
        }
        setErrors({});
        setActiveTab(0);
        update(row, loaded);
        setMode(nextMode);
      } catch (e) {
        Sys.ShowMessage("❌ Failed to load: " + Sys.GetErrorMessage(e), "❌ فشل التحميل: " + Sys.GetErrorMessage(e), "error");
      } finally {
        CloseLoader();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, detailCfgs, mdCfg]
  );

  const confirmLeave = async () => {
    if (modeRef.current !== "new" && modeRef.current !== "edit") return true;
    return Sys.Confirm("Discard unsaved changes?", "تلغي التعديلات اللي ما اتحفظتش؟", { danger: true, okEn: "Discard", okAr: "إلغاء التعديلات", cancelEn: "Stay", cancelAr: "رجوع" });
  };

  const selectNode = async (node: TreeNode) => {
    if (!(await confirmLeave())) return;
    setSelected(node);
    await loadNode(node, "view");
  };

  // ---------- الكود الجاي تلقائي ----------
  const nextCode = async (parent: TreeNode | null): Promise<string> => {
    const sep = config.codeSeparator ?? "";
    const digits = config.codeDigits || 2;
    const prefix = parent ? parent.code + sep : "";
    const rv = config.rootValue;
    const pc = parent
      ? `${config.parentColumn} = ${codeLit(parent.code)}`
      : isEmpty(rv)
        ? `(${config.parentColumn} IS NULL OR ${config.parentColumn} = N'')`
        : `${config.parentColumn} = ${codeLit(rv)}`;
    const cond = config.condition ? `(${config.condition}) AND (${pc})` : pc;
    const res = await SQL.Select(config.viewName || config.tableName, cond, [config.codeColumn], null, null, 0, config.codeColumn, "DESC", 200);
    let max = 0;
    for (const r of res.data || []) {
      const c = String(r[config.codeColumn] ?? "");
      if (prefix && !c.startsWith(prefix)) continue;
      const num = Number(c.substring(prefix.length));
      if (!isNaN(num) && num > max) max = num;
    }
    return prefix + String(max + 1).padStart(digits, "0");
  };

  // ---------- إضافة (جذر أو ابن) ----------
  const openNew = async (parent: TreeNode | null) => {
    if (!(await confirmLeave())) return;
    if (parent && config.leafColumn && parent.isLeaf && (parent.row[config.leafColumn] === true || parent.row[config.leafColumn] === 1)) {
      const ok = await Sys.Confirm(
        `"${parent.title}" is a detail (final) node. Convert it to a group so it can have children?`,
        `"${parent.title}" عقدة نهائية. تحوّلها لمجموعة عشان يبقى ليها أبناء؟`,
        { okEn: "Convert", okAr: "حوّلها" }
      );
      if (!ok) return;
      try {
        const res = await SQL.UpdateMasterDetail(
          { compCode: config.compCode, branchCode: config.branchCode, keyTrType: "", masterKeyColumn: config.keyColumn, runProcessTrans: false, master: { tableName: config.tableName, keyColumn: config.keyColumn, data: { [config.keyColumn]: parent.key, [config.leafColumn]: false } } } as any,
          ShowLoader,
          CloseLoader
        );
        if (!res?.IsSuccess) throw new Error(res?.ErrorMessage || "Error");
        parent.row[config.leafColumn] = false;
        parent.isLeaf = false;
      } catch (e) {
        Sys.ShowMessage("❌ " + Sys.GetErrorMessage(e), "❌ " + Sys.GetErrorMessage(e), "error");
        return;
      }
    }

    const row = emptyRow(config.columns);
    row[config.parentColumn] = parent ? parent.code : isEmpty(config.rootValue) ? null : config.rootValue;
    if (config.levelColumn) {
      const pl = parent ? Number(parent.row[config.levelColumn]) || parent.level + 1 : 0;
      row[config.levelColumn] = pl + 1;
    }
    if (config.leafColumn) row[config.leafColumn] = !!parent;
    if (config.activeColumn && isEmpty(row[config.activeColumn])) row[config.activeColumn] = true;
    if (config.autoCode !== false) {
      try {
        row[config.codeColumn] = await nextCode(parent);
      } catch {
        /* الكود هيتكتب يدوي */
      }
    }
    setParentForNew(parent);
    setErrors({});
    setActiveTab(0);
    update(row, detailCfgs.map((d) => [emptyRow(d.columns)]));
    setMode("new");
  };

  // ---------- حذف ----------
  const deleteNode = async (node: TreeNode) => {
    if (!config.allowDeleteWithChildren) {
      const kids = await SQL.Select(config.viewName || config.tableName, `${config.parentColumn} = ${codeLit(node.code)}`, [config.codeColumn], null, null, 0, config.codeColumn, "ASC", 1);
      if ((kids.data || []).length > 0) {
        await Sys.Alert(`"${node.title}" has children. Delete or move them first.`, `"${node.title}" ليها أبناء. امسحهم أو انقلهم الأول.`, "warning");
        return;
      }
    }
    const ok = await Sys.Confirm(`Delete "${node.code} - ${node.title}"${detailCfgs.length ? " and its details" : ""}?`, `حذف "${node.code} - ${node.title}"${detailCfgs.length ? " وتفاصيلها" : ""}؟`, { danger: true, okEn: "Delete", okAr: "حذف" });
    if (!ok) return;
    const request: any = {
      compCode: config.compCode,
      branchCode: config.branchCode,
      keyTrType: config.keyTrType || "",
      masterKeyColumn: config.keyColumn,
      runProcessTrans: !!config.runProcessTrans,
      master: { tableName: config.tableName, keyColumn: config.keyColumn, id: Number(node.key) },
    };
    detailCfgs.forEach((d, i) => {
      request["detail_" + (i + 1)] = { detailForeignKeyColumn: d.foreignKeyColumn, delete_Details: { tableName: d.tableName, keyColumn: d.foreignKeyColumn, deleteAllRelated: true } };
    });
    try {
      const res = await SQL.DeleteMasterDetail(request, ShowLoader, CloseLoader);
      if (res?.IsSuccess) {
        Sys.ShowMessage("✅ Deleted", "✅ تم الحذف", "success");
        if (selected?.key === node.key) {
          setSelected(null);
          setMode("empty");
        }
        await tree.current?.refreshChildren(node.parent || null);
      } else {
        Sys.ShowMessage("❌ " + (res?.ErrorMessage || "Error"), "❌ " + (res?.ErrorMessage || "خطأ"), "error");
      }
    } catch (e) {
      Sys.ShowMessage("❌ Failed to delete: " + Sys.GetErrorMessage(e), "❌ فشل الحذف: " + Sys.GetErrorMessage(e), "error");
    }
  };

  // ---------- الحفظ ----------
  const save = async () => {
    if (saving) return;
    const clean = details.map((rows, d) => rows.filter((r) => !isBlankRow(r, detailCfgs[d].columns)));
    const final = recalc(master, clean, mdCfg);

    // الحقول الإجبارية
    for (const c of config.columns) {
      const editableNow = isInsert ? c.insertable !== false : c.editable !== false;
      if (!editableNow || c.formula) continue;
      const v = final.master[c.field];
      const msg = c.IsRequired && isEmpty(v) ? c.validationMessage || t(`${c.title} is required`, `${c.title} مطلوب`) : c.IsValid && !isEmpty(v) && !c.IsValid(v, final.master) ? c.validationMessage || t(`Invalid value for ${c.title}`, `قيمة غير صحيحة في ${c.title}`) : null;
      if (msg) {
        setErrors({ ["m." + c.field]: msg });
        Sys.ShowMessage("❌ " + msg, "❌ " + msg, "error");
        return;
      }
    }
    if (isEmpty(final.master[config.codeColumn])) {
      setErrors({ ["m." + config.codeColumn]: t("Code is required", "الكود مطلوب") });
      Sys.ShowMessage("❌ Code is required", "❌ الكود مطلوب", "error");
      return;
    }

    setSaving(true);
    try {
      ShowLoader();
      // الكود ميتكررش
      const code = String(final.master[config.codeColumn]);
      const dupCond = `${config.codeColumn} = ${codeLit(code)}` + (!isInsert ? ` AND ${config.keyColumn} <> ${SqlLiteral(final.master[config.keyColumn])}` : "");
      const dup = await SQL.Select(config.tableName, config.condition ? `(${config.condition}) AND ${dupCond}` : dupCond, [config.codeColumn], null, null, 0, config.codeColumn, "ASC", 1);
      if ((dup.data || []).length > 0) {
        const msg = t(`Code ${code} already exists`, `الكود ${code} موجود قبل كده`);
        setErrors({ ["m." + config.codeColumn]: msg });
        Sys.ShowMessage("❌ " + msg, "❌ " + msg, "error");
        return;
      }

      const vErr = await RunValidations(config.validations, final.master, final.details, {
        isInsert,
        isLangEN: IsLangEN,
        tableName: config.tableName,
        keyColumn: config.keyColumn,
        details: detailCfgs.map((d) => ({ tableName: d.tableName, keyColumn: d.keyColumn })),
      });
      if (vErr) {
        if (vErr.detail) setActiveTab(vErr.detail - 1);
        else if (vErr.field) setErrors({ ["m." + vErr.field]: vErr.message });
        Sys.ShowMessage("❌ " + vErr.message, "❌ " + vErr.message, "error");
        return;
      }

      const masterData = buildSaveRow(final.master, config.columns, isInsert ? [config.keyColumn] : []);
      // أعمدة الشجرة بتتحفظ حتى لو مش ظاهرة في الفورم
      for (const f of [config.codeColumn, config.parentColumn, config.levelColumn, config.leafColumn]) {
        if (f && !(f in masterData)) masterData[f] = final.master[f] ?? null;
      }
      if (!isInsert) masterData[config.keyColumn] = final.master[config.keyColumn];

      const request: any = {
        compCode: config.compCode,
        branchCode: config.branchCode,
        keyTrType: config.keyTrType || "",
        masterKeyColumn: config.keyColumn,
        runProcessTrans: !!config.runProcessTrans,
        master: isInsert ? { tableName: config.tableName, data: masterData } : { tableName: config.tableName, keyColumn: config.keyColumn, data: masterData },
      };
      detailCfgs.forEach((d, i) => {
        const dataList = final.details[i].map((r) => buildSaveRow(r, d.columns, [d.keyColumn, d.foreignKeyColumn]));
        const wrapper: any = { detailForeignKeyColumn: d.foreignKeyColumn };
        if (dataList.length > 0) wrapper.bulkInsertRequest = { tableName: d.tableName, dataList };
        if (!isInsert) wrapper.delete_Details = { tableName: d.tableName, keyColumn: d.foreignKeyColumn, deleteAllRelated: true };
        request["detail_" + (i + 1)] = wrapper;
      });

      const res = isInsert ? await SQL.InsertMasterDetail(request, null, null) : await SQL.UpdateMasterDetail(request, null, null);
      if (!res?.IsSuccess) {
        Sys.ShowMessage("❌ " + (res?.ErrorMessage || "Error"), "❌ " + (res?.ErrorMessage || "خطأ"), "error");
        return;
      }
      Sys.ShowMessage(isInsert ? `✅ Saved (${code})` : "✅ Updated", isInsert ? `✅ تم الحفظ (${code})` : "✅ تم التعديل", "success");
      const parentCode = isEmpty(final.master[config.parentColumn]) ? null : String(final.master[config.parentColumn]);
      const oldParent = selected && !isInsert ? selected.parent || null : null;
      CloseLoader();
      modeRef.current = "view";
      setMode("view");
      await tree.current?.refreshChildren(parentCode);
      if (!isInsert && oldParent !== parentCode) await tree.current?.refreshChildren(oldParent);
      await tree.current?.reveal(code);
    } catch (e) {
      const msg = Sys.GetErrorMessage(e);
      Sys.ShowMessage("❌ Failed to save: " + msg, "❌ فشل الحفظ: " + msg, "error");
    } finally {
      setSaving(false);
      CloseLoader();
    }
  };

  const cancel = async () => {
    if (!(await confirmLeave())) return;
    if (selected) await loadNode(selected, "view");
    else setMode("empty");
  };

  // ---------- أزرار جنب كل عقدة ----------
  const nodeActions = (node: TreeNode) => (
    <>
      {enableInsert && (
        <button type="button" title={t("Add child", "إضافة ابن")} onClick={(e) => { e.stopPropagation(); setSelected(node); openNew(node); }} className="w-6 h-6 rounded-md text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
          <i className="fa-solid fa-plus text-xs" />
        </button>
      )}
      {enableUpdate && (
        <button type="button" title={t("Edit", "تعديل")} onClick={async (e) => { e.stopPropagation(); if (!(await confirmLeave())) return; setSelected(node); loadNode(node, "edit"); }} className="w-6 h-6 rounded-md text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40">
          <i className="fa-solid fa-pen text-xs" />
        </button>
      )}
      {enableDelete && (
        <button type="button" title={t("Delete", "حذف")} onClick={(e) => { e.stopPropagation(); deleteNode(node); }} className="w-6 h-6 rounded-md text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">
          <i className="fa-solid fa-trash text-xs" />
        </button>
      )}
    </>
  );

  // ---------- حقول الفورم ----------
  const formMode: ColumnMode = readOnly ? "view" : isInsert ? "create" : "edit";
  const fields = config.columns
    .filter((c) => {
      if (c.visibleWhen && !c.visibleWhen(master, formMode)) return false;
      if (formMode === "view") return c.visibleInView ?? (c.IsVisibleDisplayInGrid !== false || c.insertable !== false || c.editable !== false);
      if (formMode === "create") return c.visibleInCreate ?? (c.insertable !== false || !!c.formula);
      return c.visibleInEdit ?? (c.editable !== false || !!c.formula || c.IsVisibleDisplayInGrid !== false);
    })
    .sort((a, b) => (a.SortFieldInEditAndAdd || 999) - (b.SortFieldInEditAndAdd || 999));
  const totalFields = new Set(detailCfgs.flatMap((d) => (d.totals || []).map((x) => x.masterField)));
  const lockedTreeCols = new Set([config.parentColumn, config.levelColumn].filter(Boolean) as string[]);
  const codeLocked = !isInsert && selected?.isLeaf === false; // كود أب ليه أبناء مينفعش يتغير

  const path = pathOf(mode === "new" ? parentForNew : selected);
  const panelTitle =
    mode === "new" ? (parentForNew ? config.newChildTitle || t("New child", "إضافة ابن") : config.newRootTitle || t("New root", "إضافة جذر")) : mode === "edit" ? t("Edit", "تعديل") : t("Details", "البيانات");

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 0 }}>
      {/* ===================== الشجرة ===================== */}
      <div className={`lg:w-[42%] xl:w-[38%] shrink-0 rounded-2xl border shadow-lg p-3 ${card}`}>
        <div className="flex items-center justify-between mb-2 gap-2">
          <h2 className="font-bold flex items-center gap-2">
            <i className="fa-solid fa-sitemap text-erp-accent" /> {config.treeTitle || t("Tree", "الشجرة")}
          </h2>
          {enableInsert && (
            <button onClick={() => openNew(null)} className="px-3 py-1.5 rounded-xl text-white text-sm font-semibold bg-erp-accent hover:bg-erp-accent-hover hover:opacity-90 shadow">
              <i className="fa-solid fa-plus mx-1" /> {config.newRootTitle || t("New root", "جذر جديد")}
            </button>
          )}
        </div>
        <TreeView
          ref={tree}
          config={config}
          selectedKey={mode === "new" ? undefined : selected?.key}
          onSelect={selectNode}
          onDoubleClick={(n) => enableUpdate && (setSelected(n), loadNode(n, "edit"))}
          renderActions={nodeActions}
          height={height}
        />
      </div>

      {/* ===================== بيانات العقدة ===================== */}
      <div className="flex-1 min-w-0 space-y-4">
        {mode === "empty" ? (
          <div className={`rounded-2xl border shadow-lg p-10 flex flex-col items-center justify-center text-center gap-3 ${card}`} style={{ minHeight: 320 }}>
            <div className="w-20 h-20 rounded-full bg-erp-accent flex items-center justify-center text-white text-4xl shadow-lg">
              <i className="fa-solid fa-diagram-project" />
            </div>
            <h3 className="text-lg font-bold">{t("Pick a node from the tree", "اختار عقدة من الشجرة")}</h3>
            <p className={`text-sm max-w-md ${muted}`}>
              {t("Click a node to see its data. Hover a node for quick actions (add child, edit, delete). Use the search box for big trees.", "دوس على أي عقدة عشان تشوف بياناتها. عدّي بالماوس على العقدة عشان تظهر أزرار (إضافة ابن، تعديل، حذف). استخدم البحث لو الشجرة كبيرة.")}
            </p>
            {enableInsert && (
              <button onClick={() => openNew(null)} className="mt-2 px-5 py-2.5 rounded-xl text-white font-semibold bg-erp-accent hover:bg-erp-accent-hover hover:opacity-90 shadow-md">
                <i className="fa-solid fa-plus mx-1" /> {config.newRootTitle || t("New root", "جذر جديد")}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ===== شريط الأزرار ===== */}
            <div className={`rounded-2xl border shadow-lg p-3 flex flex-wrap items-center gap-2 ${card}`}>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {panelTitle}
                  {readOnly && <span className={`mx-2 px-2 py-0.5 rounded-full text-xs font-semibold align-middle ${"bg-erp-surface-2 text-erp-text"}`}>👁️ {t("View only", "عرض بس")}</span>}
                </h2>
                {path.length > 0 && (
                  <div className={`text-xs flex flex-wrap items-center gap-1 mt-0.5 ${muted}`}>
                    {path.map((p, i) => (
                      <React.Fragment key={p.code}>
                        {i > 0 && <i className={`fa-solid fa-chevron-${IsLangEN ? "right" : "left"} text-[8px]`} />}
                        <button className="hover:text-erp-accent hover:underline" onClick={() => tree.current?.reveal(p.code)}>
                          {p.code} {p.title}
                        </button>
                      </React.Fragment>
                    ))}
                    {mode === "new" && (
                      <>
                        <i className={`fa-solid fa-chevron-${IsLangEN ? "right" : "left"} text-[8px]`} />
                        <span className="text-erp-success font-semibold">{t("new", "جديد")}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              {readOnly ? (
                <>
                  {enableInsert && selected && (
                    <button onClick={() => openNew(selected)} className={btnOutline}>
                      <i className="fa-solid fa-plus mx-1 text-erp-success" /> {t("Add child", "إضافة ابن")}
                    </button>
                  )}
                  {enableDelete && selected && (
                    <button onClick={() => deleteNode(selected)} className={btnOutline}>
                      <i className="fa-solid fa-trash mx-1 text-erp-danger" /> {t("Delete", "حذف")}
                    </button>
                  )}
                  {enableUpdate && (
                    <button onClick={() => setMode("edit")} className="px-5 py-2 rounded-xl text-white font-semibold bg-erp-warning hover:opacity-90 shadow-md">
                      ✏️ {t("Edit", "تعديل")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={cancel} className={btnOutline}>
                    {t("Cancel", "إلغاء")}
                  </button>
                  <button onClick={save} disabled={saving} className="px-6 py-2 rounded-xl text-white font-semibold bg-erp-accent hover:bg-erp-accent-hover hover:opacity-90 shadow-md disabled:opacity-50">
                    💾 {saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
                  </button>
                </>
              )}
            </div>

            {/* ===== حقول العقدة ===== */}
            <div className={`rounded-2xl border shadow-lg p-4 ${card}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((c) => {
                  const editableNow = isInsert ? c.insertable !== false : c.editable !== false;
                  const disabled =
                    readOnly ||
                    !editableNow ||
                    (!isInsert && !!c.IsDisabledInEdit) ||
                    (isInsert && !!c.IsDisabledInAdd) ||
                    totalFields.has(c.field) ||
                    lockedTreeCols.has(c.field) ||
                    (c.field === config.codeColumn && codeLocked);
                  const errKey = "m." + c.field;
                  return (
                    <div key={c.field} className={c.inputType === "textarea" ? "sm:col-span-2" : ""}>
                      <label className={`block text-sm font-semibold mb-1 ${muted}`}>
                        {c.title}
                        {c.IsRequired && !disabled && <span className="text-erp-danger mx-1">*</span>}
                        {c.field === config.codeColumn && codeLocked && !readOnly && <i className="fa-solid fa-lock mx-1 text-xs" title={t("Has children", "ليها أبناء")} />}
                      </label>
                      <FieldInput
                        col={c}
                        value={master[c.field]}
                        onChange={(v) => setMasterField(c.field, v)}
                        onSearch={() => setSearchTarget({ col: c, detail: -1, rowIndex: -1 })}
                        disabled={disabled}
                        error={errors[errKey]}
                        isDark={isDark}
                        t={t}
                      />
                      {errors[errKey] && <p className="text-erp-danger text-xs mt-1">{errors[errKey]}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===== التفاصيل ===== */}
            <DetailsEditor
              configs={detailCfgs}
              allRows={details}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              viewOnly={readOnly}
              errors={errors}
              onChange={setDetailField}
              onSearch={(c, di, ri) => setSearchTarget({ col: c, detail: di, rowIndex: ri })}
              onAddRow={(d) => update(master, details.map((rows, di) => (di !== d ? rows : [...rows, emptyRow(detailCfgs[d].columns)])))}
              onRemoveRow={(d, i) => update(master, details.map((rows, di) => (di !== d ? rows : rows.filter((_, ri) => ri !== i))))}
              isDark={isDark}
              t={t}
              card={card}
              muted={muted}
            />
          </>
        )}
      </div>

      {searchTarget && searchTarget.col.searchModal && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={true}
            onClose={() => setSearchTarget(null)}
            onSelect={(value: any, row: Row) => {
              const { col, detail, rowIndex } = searchTarget;
              const extra: Row = {};
              for (const [target, src] of Object.entries(col.fillFrom || {})) extra[target] = row?.[src];
              if (detail < 0) setMasterField(col.field, value, extra);
              else setDetailField(detail, rowIndex, col.field, value, extra);
              setSearchTarget(null);
            }}
            config={searchTarget.col.searchModal}
            lang={lang}
            isDark={isDark}
          />
        </Suspense>
      )}
    </div>
  );
}
