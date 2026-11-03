"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSys } from "../../Shared/SystemUsing";
import { Sys } from "../../Shared/SystemTools";
import { SqlConnection, loadColumns, loadTables, SqlColumn, addSearchFunction } from "../utils/sqlApi";

interface Props {
  connection: SqlConnection;
  projectPath: string;
  tables: string[];
  onClose: () => void;
  onCreated: (name: string) => void;
}

interface ColRow {
  field: string;
  title: string;
  width: number;
  IsVisible: boolean;
  search: boolean;
}

export default function SearchBuilderModal({ connection, projectPath, tables, onClose, onCreated }: Props) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [tableName, setTableName] = useState("");
  const [keyColumn, setKeyColumn] = useState("");
  const [returnField, setReturnField] = useState("");
  const [displayField, setDisplayField] = useState("");
  const [orderBy, setOrderBy] = useState("");
  const [orderType, setOrderType] = useState<"ASC" | "DESC">("ASC");
  const [pageSize, setPageSize] = useState(20);
  const [columns, setColumns] = useState<ColRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const bg = isDark ? "bg-gray-900" : "bg-white";
  const card = isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200";
  const inp = isDark
    ? "bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
    : "bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none";

  useEffect(() => {
    if (!tableName) return;
    (async () => {
      setLoading(true);
      const res = await loadColumns(connection, tableName);
      setLoading(false);
      if (!res.success || !res.columns) {
        await Sys.Alert("Failed to load columns: " + (res.error || ""), "فشل تحميل الأعمدة: " + (res.error || ""), "error");
        return;
      }
      const cols: ColRow[] = res.columns.map((c: SqlColumn) => ({
        field: c.name,
        title: c.name,
        width: 150,
        IsVisible: !c.isPK && !/^.*ID$/i.test(c.name),
        search: /name|desc|code/i.test(c.name),
      }));
      setColumns(cols);
      const pk = res.columns.find((c) => c.isPK) || res.columns[0];
      if (pk) {
        setKeyColumn(pk.name);
        setReturnField(pk.name);
        setOrderBy(pk.name);
      }
      const display = res.columns.find((c) => /desc|name/i.test(c.name));
      if (display) setDisplayField(display.name);
    })();
  }, [tableName]);

  const toggleCol = (i: number, prop: keyof ColRow, val: any) => {
    setColumns((prev) => prev.map((r, k) => (k === i ? { ...r, [prop]: val } : r)));
  };

  const canSave = useMemo(
    () =>
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) &&
      !!tableName &&
      !!keyColumn &&
      !!returnField &&
      !!displayField &&
      columns.some((c) => c.IsVisible),
    [name, tableName, keyColumn, returnField, displayField, columns]
  );

  const handleSave = async () => {
    if (!canSave) {
      await Sys.Alert("Fill name, table, key, return, display, and keep at least one visible column.", "املا الاسم والجدول والمفتاح والرجوع والعرض وعمود ظاهر واحد على الأقل.", "warning");
      return;
    }
    if (!projectPath) {
      await Sys.Alert("Set the project path in the sidebar first.", "حدّد مسار المشروع في القائمة الجانبية الأول.", "warning");
      return;
    }
    setSaving(true);
    const res = await addSearchFunction({
      projectPath,
      name,
      title: title || name,
      tableName,
      keyColumn,
      returnField,
      displayField,
      columns: columns.map(({ field, title, width, IsVisible }) => ({ field, title, width, IsVisible })),
      searchColumns: columns.filter((c) => c.search).map((c) => c.field),
      pageSize,
      orderBy,
      orderType,
    }).catch((e) => ({ success: false, error: String(e) }));
    setSaving(false);
    if (res.success) {
      await Sys.Alert(`Created: ${res.name}`, `تم إنشاء: ${res.name}`, "success");
      onCreated((res as any).name || name);
      onClose();
    } else {
      await Sys.Alert(res.error || "Save failed", res.error || "فشل الحفظ", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${bg} rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center text-white">
            <i className="fa-solid fa-magnifying-glass-plus" />
          </div>
          <div className="flex-1">
            <h2 className={`font-bold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{t("Add new Search type", "إضافة نوع بحث جديد")}</h2>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("Writes a new factory into G_SearchFrom.ts", "بيكتب دالة جديدة في G_SearchFrom.ts")}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* basic */}
          <div className={`${card} border rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3`}>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Name (English)", "الاسم بالإنجليزي")} *</label>
              <input className={inp + " w-full"} value={name} onChange={(e) => setName(e.target.value)} placeholder="Items" />
              <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("Prefix 'Search_' added automatically if missing.", "لو مكتبتش Search_ هتضاف تلقائي.")}</p>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Modal title", "عنوان النافذة")}</label>
              <input className={inp + " w-full"} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Search Items", "بحث الأصناف")} />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Table / View", "الجدول / الفيو")} *</label>
              <select className={inp + " w-full"} value={tableName} onChange={(e) => setTableName(e.target.value)}>
                <option value="">-- {t("Select", "اختار")} --</option>
                {tables.map((tb) => (
                  <option key={tb} value={tb}>{tb}</option>
                ))}
              </select>
              {loading && <p className="text-xs text-blue-500 mt-1"><i className="fa-solid fa-spinner fa-spin mr-1" />{t("Loading columns...", "جاري تحميل الأعمدة...")}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Key", "المفتاح")} *</label>
                <select className={inp + " w-full"} value={keyColumn} onChange={(e) => setKeyColumn(e.target.value)}>
                  <option value="">--</option>
                  {columns.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Returns", "اللي بيرجع")} *</label>
                <select className={inp + " w-full"} value={returnField} onChange={(e) => setReturnField(e.target.value)}>
                  <option value="">--</option>
                  {columns.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Display", "اللي بيظهر")} *</label>
                <select className={inp + " w-full"} value={displayField} onChange={(e) => setDisplayField(e.target.value)}>
                  <option value="">--</option>
                  {columns.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Page size", "عدد الصفوف")}</label>
                <input type="number" className={inp + " w-full"} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) || 20)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Order by", "ترتيب")}</label>
                <select className={inp + " w-full"} value={orderBy} onChange={(e) => setOrderBy(e.target.value)}>
                  <option value="">--</option>
                  {columns.map((c) => <option key={c.field} value={c.field}>{c.field}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("Order type", "الاتجاه")}</label>
                <select className={inp + " w-full"} value={orderType} onChange={(e) => setOrderType(e.target.value as any)}>
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </div>
            </div>
          </div>

          {/* columns */}
          {columns.length > 0 && (
            <div className={`${card} border rounded-xl p-3`}>
              <h3 className={`font-semibold text-sm mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                <i className="fa-solid fa-table-columns mr-1" />{t("Columns", "الأعمدة")}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={isDark ? "bg-gray-900 text-gray-300" : "bg-gray-100 text-gray-600"}>
                    <tr>
                      <th className="text-start p-2">{t("Field", "العمود")}</th>
                      <th className="text-start p-2">{t("Title", "عنوان")}</th>
                      <th className="text-center p-2 w-16">{t("Width", "العرض")}</th>
                      <th className="text-center p-2 w-20">{t("Show", "يظهر")}</th>
                      <th className="text-center p-2 w-20">{t("Search in", "بحث فيه")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((c, i) => (
                      <tr key={c.field} className={isDark ? "border-b border-gray-800" : "border-b border-gray-100"}>
                        <td className={`p-2 font-mono ${isDark ? "text-gray-300" : "text-gray-700"}`}>{c.field}</td>
                        <td className="p-2">
                          <input className={inp + " w-full"} value={c.title} onChange={(e) => toggleCol(i, "title", e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input type="number" className={inp + " w-full text-center"} value={c.width} onChange={(e) => toggleCol(i, "width", Number(e.target.value) || 100)} />
                        </td>
                        <td className="p-2 text-center">
                          <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={c.IsVisible} onChange={(e) => toggleCol(i, "IsVisible", e.target.checked)} />
                        </td>
                        <td className="p-2 text-center">
                          <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={c.search} onChange={(e) => toggleCol(i, "search", e.target.checked)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className={`flex items-center gap-2 px-5 py-3 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className={`text-xs flex-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            <i className="fa-solid fa-circle-info mr-1" />
            {t("A new factory is appended to G_SearchFrom.ts. Reopen ScreenBuilder to refresh the list.", "هتتكتب دالة جديدة في G_SearchFrom.ts. القائمة بتتحدّث لما تعيد فتح ScreenBuilder.")}
          </div>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
            {t("Cancel", "إلغاء")}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-floppy-disk mr-1" />}
            {t("Save", "حفظ")}
          </button>
        </div>
      </div>
    </div>
  );
}
