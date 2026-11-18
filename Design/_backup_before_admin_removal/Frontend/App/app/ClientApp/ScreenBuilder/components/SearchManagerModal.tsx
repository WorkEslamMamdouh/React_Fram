"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSys } from "../../Shared/SystemUsing";
import { Sys } from "../../Shared/SystemTools";
import {
  SqlConnection, SqlColumn, loadColumns,
  SearchFunctionDto, listSearchFunctions, saveSearchFunction, deleteSearchFunction,
} from "../utils/sqlApi";

interface Props {
  connection: SqlConnection;
  projectPath: string;
  tables: string[];
  onClose: () => void;
  onChanged: (functions: SearchFunctionDto[]) => void;
}

interface ColRow {
  field: string;
  title: string;
  width: number;
  IsVisible: boolean;
  search: boolean;
}

const EMPTY: SearchFunctionDto = {
  name: "",
  title: "",
  tableName: "",
  keyColumn: "",
  returnField: "",
  displayField: "",
  columns: [],
  searchColumns: [],
  pageSize: 20,
  orderBy: "",
  orderType: "ASC",
};

export default function SearchManagerModal({ connection, projectPath, tables, onClose, onChanged }: Props) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [functions, setFunctions] = useState<SearchFunctionDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filter, setFilter] = useState("");

  const [selected, setSelected] = useState<SearchFunctionDto | null>(null);
  const [originalName, setOriginalName] = useState("");         // tracks rename
  const [draft, setDraft] = useState<SearchFunctionDto>(EMPTY);
  const [cols, setCols] = useState<ColRow[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mode, setMode] = useState<"idle" | "edit" | "new">("idle");

  const bg = isDark ? "bg-gray-900" : "bg-white";
  const panel = isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200";
  const inp = isDark
    ? "bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none w-full"
    : "bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none w-full";
  const label = `block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`;
  const subMuted = isDark ? "text-gray-400" : "text-gray-500";

  const loadAll = async () => {
    if (!projectPath) return;
    setLoadingList(true);
    const res = await listSearchFunctions(projectPath);
    setLoadingList(false);
    if (res.success && res.functions) {
      setFunctions(res.functions);
      onChanged(res.functions);
    } else {
      await Sys.Alert(res.error || "Load failed", res.error || "فشل التحميل", "error");
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [projectPath]);

  const colsFromDraft = (d: SearchFunctionDto): ColRow[] => {
    const scSet = new Set(d.searchColumns || []);
    return (d.columns || []).map((c) => ({
      field: c.field, title: c.title, width: c.width,
      IsVisible: c.IsVisible !== false,
      search: scSet.has(c.field),
    }));
  };

  const openForEdit = (fn: SearchFunctionDto) => {
    setSelected(fn);
    setDraft({ ...fn });
    setCols(colsFromDraft(fn));
    setOriginalName(fn.name);
    setMode("edit");
  };

  const openForNew = () => {
    setSelected(null);
    setDraft({ ...EMPTY });
    setCols([]);
    setOriginalName("");
    setMode("new");
  };

  // when table changes in the editor, load its columns (merge with existing)
  const handleTableChange = async (tableName: string) => {
    setDraft((d) => ({ ...d, tableName }));
    if (!tableName) return;
    setLoadingCols(true);
    const res = await loadColumns(connection, tableName);
    setLoadingCols(false);
    if (!res.success || !res.columns) {
      await Sys.Alert("Failed to load columns", "فشل تحميل الأعمدة", "error");
      return;
    }
    const existing = new Map(cols.map((c) => [c.field, c]));
    const next: ColRow[] = res.columns.map((c: SqlColumn) => {
      const old = existing.get(c.name);
      if (old) return old;
      return {
        field: c.name,
        title: c.name,
        width: 150,
        IsVisible: !c.isPK && !/^.*ID$/i.test(c.name),
        search: /name|desc|code/i.test(c.name),
      };
    });
    setCols(next);
    const pk = res.columns.find((c) => c.isPK) || res.columns[0];
    setDraft((d) => ({
      ...d,
      keyColumn: d.keyColumn || pk?.name || "",
      returnField: d.returnField || pk?.name || "",
      orderBy: d.orderBy || pk?.name || "",
      displayField: d.displayField || (res.columns!.find((c) => /desc|name/i.test(c.name))?.name || ""),
    }));
  };

  const setCol = (i: number, prop: keyof ColRow, val: any) =>
    setCols((prev) => prev.map((r, k) => (k === i ? { ...r, [prop]: val } : r)));

  const canSave = useMemo(() =>
    /^[A-Za-z_][A-Za-z0-9_]*$/.test((draft.name || "").trim()) &&
    !!draft.tableName && !!draft.keyColumn && !!draft.returnField && !!draft.displayField &&
    cols.some((c) => c.IsVisible)
  , [draft, cols]);

  const handleSave = async () => {
    if (!canSave) {
      await Sys.Alert("Fill name, table, key, return, display, and keep at least one visible column.",
        "املا الاسم والجدول والمفتاح والرجوع والعرض وعمود ظاهر واحد على الأقل.", "warning");
      return;
    }
    if (!projectPath) { await Sys.Alert("Project path required", "حدّد مسار المشروع", "warning"); return; }
    const payload = {
      ...draft,
      projectPath,
      originalName: mode === "edit" ? originalName : "",
      columns: cols.map(({ field, title, width, IsVisible }) => ({ field, title, width, IsVisible })),
      searchColumns: cols.filter((c) => c.search).map((c) => c.field),
    };
    setSaving(true);
    const res = await saveSearchFunction(payload).catch((e) => ({ success: false, error: String(e) } as any));
    setSaving(false);
    if (res.success) {
      await Sys.Alert(res.updated ? `Updated: ${res.name}` : `Created: ${res.name}`,
                      res.updated ? `تم التعديل: ${res.name}` : `تم الإنشاء: ${res.name}`, "success");
      await loadAll();
      // reselect under new name
      setOriginalName(res.name || "");
      setDraft((d) => ({ ...d, name: (res.name || d.name).replace(/^Search_/, "") }));
      setMode("edit");
    } else {
      await Sys.Alert(res.error || "Save failed", res.error || "فشل الحفظ", "error");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const ok = await Sys.Confirm(`Delete search "${selected.name}"? This removes it from G_SearchFrom.ts.`,
      `حذف البحث "${selected.name}"؟ الدالة هتتمسح من G_SearchFrom.ts.`,
      { danger: true, okEn: "Delete", okAr: "حذف" });
    if (!ok) return;
    setDeleting(true);
    const res = await deleteSearchFunction(projectPath, selected.name).catch((e) => ({ success: false, error: String(e) } as any));
    setDeleting(false);
    if (res.success) {
      await loadAll();
      setSelected(null); setMode("idle"); setDraft({ ...EMPTY }); setCols([]); setOriginalName("");
    } else {
      await Sys.Alert(res.error || "Delete failed", res.error || "فشل الحذف", "error");
    }
  };

  const filteredFns = functions.filter((f) =>
    !filter ? true : (f.name + " " + f.title + " " + f.tableName).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center text-white text-lg shadow-lg">
            <i className="fa-solid fa-magnifying-glass" />
          </div>
          <div className="flex-1">
            <h2 className={`font-bold text-lg ${isDark ? "text-gray-100" : "text-gray-800"}`}>{t("Search Manager", "إدارة أنواع البحث")}</h2>
            <p className={`text-xs ${subMuted}`}>{t("Browse, edit, or add Search factories in G_SearchFrom.ts.", "استعرض/عدّل/أضف دوال بحث في G_SearchFrom.ts.")}</p>
          </div>
          <button onClick={loadAll} className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`} title={t("Reload", "تحديث")}>
            <i className={`fa-solid fa-rotate ${loadingList ? "fa-spin" : ""}`} />
          </button>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Body: 2 panes */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left list */}
          <aside className={`w-72 shrink-0 border-r flex flex-col ${isDark ? "border-gray-700" : "border-gray-200"}`}>
            <div className="p-3 space-y-2">
              <button onClick={openForNew} className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 transition">
                <i className="fa-solid fa-plus mr-1" /> {t("New search", "بحث جديد")}
              </button>
              <input
                className={inp}
                placeholder={t("Filter...", "فلترة...")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <div className={`text-[11px] ${subMuted}`}>{functions.length} {t("total", "دالة")}</div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
              {filteredFns.map((fn) => {
                const active = selected?.name === fn.name && mode === "edit";
                return (
                  <button
                    key={fn.name}
                    onClick={() => openForEdit(fn)}
                    className={`w-full text-start px-3 py-2 rounded-lg transition border ${
                      active
                        ? isDark ? "bg-blue-900/40 border-blue-600 text-blue-100" : "bg-blue-50 border-blue-400 text-blue-800"
                        : isDark ? "bg-gray-800/60 border-gray-700 hover:bg-gray-800 text-gray-200" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold truncate">{fn.name}</div>
                    <div className={`text-[11px] truncate ${subMuted}`}>
                      <i className="fa-solid fa-table mx-1" />{fn.tableName || "—"}
                      <span className="mx-1">·</span>
                      <i className="fa-solid fa-hashtag mx-1" />{fn.columns.length}
                    </div>
                  </button>
                );
              })}
              {!loadingList && filteredFns.length === 0 && (
                <div className={`text-center text-xs py-6 ${subMuted}`}>{t("No searches", "لا توجد نتائج")}</div>
              )}
            </div>
          </aside>

          {/* Right editor */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            {mode === "idle" && (
              <div className={`h-full flex flex-col items-center justify-center text-center p-10 ${subMuted}`}>
                <i className="fa-solid fa-magnifying-glass-plus text-5xl mb-3 opacity-40" />
                <p className="text-sm">{t("Pick a search on the left, or click 'New search' to add one.", "اختار بحث من الشمال، أو اضغط 'بحث جديد' علشان تضيف واحد.")}</p>
              </div>
            )}

            {mode !== "idle" && (
              <div className="p-5 space-y-4">
                {/* Toolbar */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${panel}`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mode === "new" ? "bg-emerald-500/20 text-emerald-500" : "bg-blue-500/20 text-blue-500"}`}>
                    {mode === "new" ? t("NEW", "جديد") : t("EDIT", "تعديل")}
                  </span>
                  {mode === "edit" && selected && (
                    <>
                      <span className={`text-sm font-mono ${isDark ? "text-gray-200" : "text-gray-700"}`}>{selected.name}</span>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="ms-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition"
                      >
                        {deleting ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-trash mr-1" />}
                        {t("Delete", "حذف")}
                      </button>
                    </>
                  )}
                </div>

                {/* Basic */}
                <div className={`${panel} border rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3`}>
                  <div>
                    <label className={label}>{t("Name (English)", "اسم الدالة")} *</label>
                    <input className={inp} value={draft.name.replace(/^Search_/, "")} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Items" />
                    <p className={`text-[11px] mt-1 ${subMuted}`}>{t("Prefix 'Search_' added automatically.", "البادئة Search_ بتتضاف تلقائي.")}</p>
                  </div>
                  <div>
                    <label className={label}>{t("Modal title", "عنوان النافذة")}</label>
                    <input className={inp} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t("Search Items", "بحث الأصناف")} />
                  </div>
                  <div>
                    <label className={label}>{t("Table / View", "الجدول / الفيو")} *</label>
                    <select className={inp} value={draft.tableName} onChange={(e) => handleTableChange(e.target.value)}>
                      <option value="">-- {t("Select", "اختار")} --</option>
                      {!!draft.tableName && !tables.includes(draft.tableName) && <option value={draft.tableName}>{draft.tableName}</option>}
                      {tables.map((tb) => <option key={tb} value={tb}>{tb}</option>)}
                    </select>
                    {loadingCols && <p className="text-xs text-blue-500 mt-1"><i className="fa-solid fa-spinner fa-spin mr-1" />{t("Loading columns...", "جاري تحميل الأعمدة...")}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={label}>{t("Key", "المفتاح")} *</label>
                      <select className={inp} value={draft.keyColumn} onChange={(e) => setDraft({ ...draft, keyColumn: e.target.value })}>
                        <option value="">--</option>
                        {cols.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>{t("Returns", "اللي بيرجع")} *</label>
                      <select className={inp} value={draft.returnField} onChange={(e) => setDraft({ ...draft, returnField: e.target.value })}>
                        <option value="">--</option>
                        {cols.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={label}>{t("Display", "اللي بيظهر")} *</label>
                      <select className={inp} value={draft.displayField} onChange={(e) => setDraft({ ...draft, displayField: e.target.value })}>
                        <option value="">--</option>
                        {cols.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>{t("Page size", "عدد الصفوف")}</label>
                      <input type="number" className={inp} value={draft.pageSize} onChange={(e) => setDraft({ ...draft, pageSize: Number(e.target.value) || 20 })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={label}>{t("Order by", "ترتيب")}</label>
                      <select className={inp} value={draft.orderBy} onChange={(e) => setDraft({ ...draft, orderBy: e.target.value })}>
                        <option value="">--</option>
                        {cols.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>{t("Order type", "الاتجاه")}</label>
                      <select className={inp} value={draft.orderType} onChange={(e) => setDraft({ ...draft, orderType: e.target.value as any })}>
                        <option value="ASC">ASC</option>
                        <option value="DESC">DESC</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Columns */}
                {cols.length > 0 && (
                  <div className={`${panel} border rounded-xl p-3`}>
                    <h3 className={`font-semibold text-sm mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                      <i className="fa-solid fa-table-columns mr-1" />{t("Columns", "الأعمدة")}
                      <span className={`text-xs font-normal ms-2 ${subMuted}`}>{cols.filter((c) => c.IsVisible).length}/{cols.length} {t("shown", "ظاهر")}</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className={isDark ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-600"}>
                          <tr>
                            <th className="text-start p-2">{t("Field", "العمود")}</th>
                            <th className="text-start p-2">{t("Title", "عنوان")}</th>
                            <th className="text-center p-2 w-20">{t("Width", "العرض")}</th>
                            <th className="text-center p-2 w-20">{t("Show", "يظهر")}</th>
                            <th className="text-center p-2 w-20">{t("Search in", "بحث فيه")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cols.map((c, i) => (
                            <tr key={c.field} className={isDark ? "border-b border-gray-800" : "border-b border-gray-100"}>
                              <td className={`p-2 font-mono ${isDark ? "text-gray-300" : "text-gray-700"}`}>{c.field}</td>
                              <td className="p-2"><input className={inp} value={c.title} onChange={(e) => setCol(i, "title", e.target.value)} /></td>
                              <td className="p-2"><input type="number" className={`${inp} text-center`} value={c.width} onChange={(e) => setCol(i, "width", Number(e.target.value) || 100)} /></td>
                              <td className="p-2 text-center"><input type="checkbox" className="w-4 h-4 accent-blue-600" checked={c.IsVisible} onChange={(e) => setCol(i, "IsVisible", e.target.checked)} /></td>
                              <td className="p-2 text-center"><input type="checkbox" className="w-4 h-4 accent-blue-600" checked={c.search} onChange={(e) => setCol(i, "search", e.target.checked)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Save row */}
                <div className="flex items-center gap-2 pt-2">
                  <div className={`text-xs flex-1 ${subMuted}`}>
                    <i className="fa-solid fa-circle-info mr-1" />
                    {t("Changes write to G_SearchFrom.ts. The dropdown refreshes after save.", "التغييرات بتتحفظ في G_SearchFrom.ts. القائمة بتتحدّث تلقائي بعد الحفظ.")}
                  </div>
                  <button onClick={() => { setMode("idle"); setSelected(null); }} className={`px-4 py-2 rounded-lg text-sm ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                    {t("Cancel", "إلغاء")}
                  </button>
                  <button onClick={handleSave} disabled={!canSave || saving} className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-50">
                    {saving ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-floppy-disk mr-1" />}
                    {mode === "new" ? t("Create", "إنشاء") : t("Save changes", "حفظ التعديلات")}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
