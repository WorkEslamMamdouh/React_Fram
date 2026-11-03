"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSys } from "../../Shared/SystemUsing";
import {
  SqlConnection, SqlColumn, testConnection, loadTables, loadColumns,
  loadResources, scanScreens, loadSearchFunctions,
} from "../utils/sqlApi";

interface ConnectionPanelProps {
  onColumnsLoaded: (columns: SqlColumn[], table: string, view: string, keyColumn: string) => void;
  onScreenLoaded: (settingsJson: string) => void;
  onResourcesLoaded: (resources: Record<string, { ar: string; en: string }>) => void;
  onSearchFunctionsLoaded: (fns: string[]) => void;
  connection: SqlConnection;
  setConnection: (c: SqlConnection) => void;
  isConnected: boolean;
  setIsConnected: (v: boolean) => void;
  databases: string[];
  setDatabases: (d: string[]) => void;
  tables: { name: string; type: string }[];
  setTables: (t: { name: string; type: string }[]) => void;
}

const LS_KEY = "screenbuilder_connection";

export default function ConnectionPanel(props: ConnectionPanelProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  const { connection, setConnection, isConnected, setIsConnected, databases, setDatabases, tables, setTables } = props;

  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedView, setSelectedView] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [scannedScreens, setScannedScreens] = useState<{ name: string; screenType: string; table: string; hasSettings: boolean; settingsJson: string }[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConnection(parsed);
        if (parsed.projectPath) setProjectPath(parsed.projectPath);
      }
    } catch {}
  }, []);

  const saveToStorage = useCallback((conn: SqlConnection, path?: string) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ ...conn, projectPath: path || projectPath }));
    } catch {}
  }, [projectPath]);

  const updateConn = (key: keyof SqlConnection, val: string) => {
    const next = { ...connection, [key]: val };
    setConnection(next);
  };

  const handleConnect = async () => {
    setLoading("connect");
    setError("");
    const res = await testConnection(connection);
    setLoading("");
    if (res.success && res.databases) {
      setDatabases(res.databases);
      setIsConnected(true);
      saveToStorage(connection);
    } else {
      setError(res.error || t("Connection failed", "فشل الاتصال"));
      setIsConnected(false);
    }
  };

  const handleDbChange = async (db: string) => {
    updateConn("database", db);
    const conn = { ...connection, database: db };
    setConnection(conn);
    setLoading("tables");
    setError("");
    const res = await loadTables(conn);
    setLoading("");
    if (res.success) {
      const all = [
        ...(res.tables || []).map((t: any) => ({ name: t.name, type: "U" })),
        ...(res.views || []).map((v: any) => ({ name: v.name, type: "V" })),
      ];
      setTables(all);
      saveToStorage(conn);
      const rRes = await loadResources(conn);
      if (rRes.success && rRes.resources) props.onResourcesLoaded(rRes.resources);
    } else {
      setError(res.error || t("Failed to load tables", "فشل تحميل الجداول"));
    }
  };

  const handleLoadColumns = async () => {
    if (!selectedTable) return;
    setLoading("columns");
    setError("");
    const res = await loadColumns(connection, selectedTable, selectedView || undefined);
    setLoading("");
    if (res.success && res.columns) {
      const pkCol = res.columns.find((c) => c.isPK);
      const idCol = res.columns.find((c) => c.isIdentity);
      const keyCol = idCol?.name || pkCol?.name || res.columns[0]?.name || "";
      props.onColumnsLoaded(res.columns, selectedTable, selectedView, keyCol);
    } else {
      setError(res.error || t("Failed to load columns", "فشل تحميل الأعمدة"));
    }
  };

  const handleScanScreens = async () => {
    if (!projectPath) return;
    setLoading("scan");
    const res = await scanScreens(projectPath);
    setLoading("");
    if (res.success && res.screens) {
      setScannedScreens(res.screens);
    }
    const fnRes = await loadSearchFunctions(projectPath);
    if (fnRes.success && fnRes.functions) props.onSearchFunctionsLoaded(fnRes.functions);
    saveToStorage(connection, projectPath);
  };

  const bg = isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200";
  const inputCls = isDark
    ? "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 text-sm focus:border-blue-500 focus:outline-none"
    : "w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-800 text-sm focus:border-blue-500 focus:outline-none";
  const labelCls = `text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`;
  const btnPrimary = "w-full px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition disabled:opacity-50";
  const btnSecondary = isDark
    ? "w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700 transition disabled:opacity-50"
    : "w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50";

  if (collapsed) {
    return (
      <div className={`w-10 border-r flex flex-col items-center py-3 cursor-pointer ${bg}`} onClick={() => setCollapsed(false)}>
        <i className="fa-solid fa-database text-blue-500 mb-2" />
        <i className="fa-solid fa-chevron-right text-xs text-gray-500" />
        {isConnected && <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />}
      </div>
    );
  }

  return (
    <div className={`w-72 border-r flex flex-col overflow-y-auto ${bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-database text-blue-500" />
          <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
            {t("Connection", "الاتصال")}
          </span>
          {isConnected && <div className="w-2 h-2 rounded-full bg-green-500" title={t("Connected", "متصل")} />}
        </div>
        <button onClick={() => setCollapsed(true)} className="text-gray-500 hover:text-gray-300 text-xs">
          <i className="fa-solid fa-chevron-left" />
        </button>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {/* Server */}
        <div>
          <label className={labelCls}><i className="fa-solid fa-server mr-1" />{t("Server", "السيرفر")}</label>
          <input className={inputCls} value={connection.server} onChange={(e) => updateConn("server", e.target.value)} placeholder="." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>{t("User", "المستخدم")}</label>
            <input className={inputCls} value={connection.user} onChange={(e) => updateConn("user", e.target.value)} placeholder="sa" />
          </div>
          <div>
            <label className={labelCls}>{t("Password", "الباسورد")}</label>
            <input className={inputCls} type="password" value={connection.password} onChange={(e) => updateConn("password", e.target.value)} />
          </div>
        </div>

        <button className={btnPrimary} onClick={handleConnect} disabled={loading === "connect"}>
          {loading === "connect" ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-plug mr-1" />}
          {t("Connect", "اتصال")}
        </button>

        {error && <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">{error}</div>}

        {/* Database */}
        {isConnected && (
          <>
            <div>
              <label className={labelCls}><i className="fa-solid fa-database mr-1" />{t("Database", "قاعدة البيانات")}</label>
              <select className={inputCls} value={connection.database} onChange={(e) => handleDbChange(e.target.value)}>
                <option value="">{t("-- Select --", "-- اختار --")}</option>
                {databases.map((db) => <option key={db} value={db}>{db}</option>)}
              </select>
              {loading === "tables" && <span className="text-xs text-blue-400 mt-1 block"><i className="fa-solid fa-spinner fa-spin mr-1" />{t("Loading...", "جاري التحميل...")}</span>}
            </div>

            {/* Table & View */}
            {tables.length > 0 && (
              <>
                <div>
                  <label className={labelCls}><i className="fa-solid fa-table mr-1" />{t("Table (Save)", "الجدول (حفظ)")}</label>
                  <select className={inputCls} value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                    <option value="">{t("-- Select --", "-- اختار --")}</option>
                    {tables.filter((t) => t.type === "U").map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}><i className="fa-solid fa-eye mr-1" />{t("View (Display)", "العرض (عرض)")}</label>
                  <select className={inputCls} value={selectedView} onChange={(e) => setSelectedView(e.target.value)}>
                    <option value="">{t("-- Same as Table --", "-- نفس الجدول --")}</option>
                    {tables.filter((t) => t.type === "V").map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                  </select>
                </div>

                <button className={btnPrimary} onClick={handleLoadColumns} disabled={!selectedTable || loading === "columns"}>
                  {loading === "columns" ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-columns mr-1" />}
                  {t("Load Columns", "تحميل الأعمدة")}
                </button>
              </>
            )}
          </>
        )}

        {/* Divider */}
        <div className={`border-t pt-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <label className={labelCls}><i className="fa-solid fa-folder-open mr-1" />{t("Project Path", "مسار المشروع")}</label>
          <input className={inputCls} value={projectPath} onChange={(e) => setProjectPath(e.target.value)} placeholder={t("Frontend/App path", "مسار Frontend/App")} />
          <button className={`${btnSecondary} mt-2`} onClick={handleScanScreens} disabled={!projectPath || loading === "scan"}>
            {loading === "scan" ? <i className="fa-solid fa-spinner fa-spin mr-1" /> : <i className="fa-solid fa-magnifying-glass mr-1" />}
            {t("Scan Screens", "بحث عن شاشات")}
          </button>
        </div>

        {/* Scanned screens */}
        {scannedScreens.length > 0 && (
          <div>
            <label className={labelCls}>{t("Existing Screens", "الشاشات الموجودة")}</label>
            <div className={`max-h-40 overflow-y-auto rounded-lg border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              {scannedScreens.map((s) => (
                <button
                  key={s.name}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-50 text-gray-700"}`}
                  onClick={() => s.hasSettings && props.onScreenLoaded(s.settingsJson)}
                  disabled={!s.hasSettings}
                >
                  <i className={`fa-solid ${s.screenType === "MasterDetail" ? "fa-layer-group text-purple-400" : "fa-table-list text-blue-400"}`} />
                  <span className="truncate flex-1">{s.name}</span>
                  <span className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>{s.table}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
