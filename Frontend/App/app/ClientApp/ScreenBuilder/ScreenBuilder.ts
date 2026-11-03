"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useSys } from "../Shared/SystemUsing";
import { useScreenBuilder } from "./store/useScreenBuilder";
import { parseSettingsFromTs, convertV3toV4 } from "./utils/configConverter";
import {
  generateHookFile, generatePageFile, generateSqlScript,
  generateResourcesEntries, generateRoutesEntry,
} from "./utils/codeGenerator";
import {
  SqlConnection, SqlColumn, testConnection, loadTables, loadColumns,
  loadResources, scanScreens, loadSearchFunctions,
  sqlTypeToInputType, getKnownTitle, detectAutoValue, detectDefaultValue,
} from "./utils/sqlApi";
import { FieldConfigV4, createEmptyField, createEmptyScreen } from "./types/ScreenConfig";

const LS_KEY = "screenbuilder_connection";
const LS_PROJECT = "screenbuilder_projectpath";

export type TabId = "setup" | "fields" | "list" | "details" | "validations" | "preview";

export function ScreenBuilder() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const store = useScreenBuilder();

  // Connection state
  const [connection, setConnection] = useState<SqlConnection>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { server: ".", user: "sa", password: "", database: "" };
  });
  const [isConnected, setIsConnected] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<{ name: string; type: string }[]>([]);
  const [searchFunctions, setSearchFunctions] = useState<string[]>([]);
  const [resources, setResources] = useState<Record<string, { ar: string; en: string }>>({});
  const [columnMeta, setColumnMeta] = useState<Map<string, { sqlType: string; isPK: boolean; isComputed: boolean; isIdentity: boolean; notInDb: boolean }>>(new Map());
  const [projectPath, setProjectPath] = useState(() => {
    try { return localStorage.getItem(LS_PROJECT) || ""; } catch { return ""; }
  });

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [showHelp, setShowHelp] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState("");

  // Save connection to localStorage
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(connection)); } catch {}
  }, [connection]);

  useEffect(() => {
    try { if (projectPath) localStorage.setItem(LS_PROJECT, projectPath); } catch {}
  }, [projectPath]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); store.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); store.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Connection handlers
  const handleConnect = useCallback(async () => {
    setLoading("Connecting...");
    const res = await testConnection(connection);
    setLoading("");
    if (res.success && res.databases) {
      setDatabases(res.databases);
      setIsConnected(true);
      // Auto-load resources if database is selected
      if (connection.database) {
        const rRes = await loadResources(connection);
        if (rRes.success && rRes.resources) setResources(rRes.resources);
      }
    } else {
      setIsConnected(false);
      alert(res.error || "Connection failed");
    }
  }, [connection]);

  const handleDatabaseChange = useCallback(async (db: string) => {
    const newConn = { ...connection, database: db };
    setConnection(newConn);
    if (db) {
      setLoading("Loading tables...");
      const [tRes, rRes] = await Promise.all([
        loadTables(newConn),
        loadResources(newConn),
      ]);
      setLoading("");
      if (tRes.success) {
        const all = [
          ...(tRes.tables || []).map(t => ({ name: t.name, type: "U" })),
          ...(tRes.views || []).map(v => ({ name: v.name, type: "V" })),
        ];
        setTables(all);
      }
      if (rRes.success && rRes.resources) setResources(rRes.resources);
    }
  }, [connection]);

  const handleLoadColumns = useCallback(async (table: string, view: string) => {
    if (!table) return;
    setLoading("Loading columns...");
    const res = await loadColumns(connection, table, view || undefined);
    setLoading("");
    if (!res.success || !res.columns) {
      alert(res.error || "Failed to load columns");
      return;
    }
    return res.columns;
  }, [connection]);

  // Build fields from SQL columns
  const buildFieldsFromColumns = useCallback((columns: SqlColumn[]): FieldConfigV4[] => {
    const meta = new Map<string, { sqlType: string; isPK: boolean; isComputed: boolean; isIdentity: boolean; notInDb: boolean }>();
    const fields: FieldConfigV4[] = [];

    for (const col of columns) {
      meta.set(col.name, {
        sqlType: col.sqlType,
        isPK: col.isPK,
        isComputed: col.isComputed,
        isIdentity: col.isIdentity,
        notInDb: col.notInDb,
      });

      const f = createEmptyField(col.name);
      f.inputType = sqlTypeToInputType(col.sqlType);
      f.required = !col.isNullable && !col.isIdentity && !col.isComputed;

      // Auto titles
      const known = getKnownTitle(col.name);
      const res = resources[col.name];
      if (res) { f.titleAr = res.ar; f.titleEn = res.en; }
      else if (known) { f.titleAr = known.ar; f.titleEn = known.en; }
      else { f.titleAr = col.name; f.titleEn = col.name; }

      // Auto values
      const auto = detectAutoValue(col.name);
      if (auto) {
        f.auto = auto;
        f.inGrid = false;
        f.inForm = false;
      }

      // Default values
      f.defaultValue = detectDefaultValue(col.name, col.sqlType, col.isNullable);

      // Identity/computed: read-only
      if (col.isIdentity || col.isComputed) {
        f.inForm = false;
      }
      if (col.notInDb) {
        f.inForm = false;
      }

      f.order = fields.length + 1;
      fields.push(f);
    }

    setColumnMeta(meta);
    return fields;
  }, [resources]);

  // Main column load handler
  const handleColumnsLoaded = useCallback((columns: SqlColumn[], table: string, view: string) => {
    const fields = buildFieldsFromColumns(columns);
    const keyCol = columns.find(c => c.isIdentity)?.name || columns.find(c => c.isPK)?.name || columns[0]?.name || "";

    store.updateScreen({ table, view, keyColumn: keyCol });
    // Replace fields
    const state = useScreenBuilder.getState();
    const newConfig = { ...state.config, fields, table, view, keyColumn: keyCol };
    store.loadConfig(newConfig);
    setActiveTab("fields");
  }, [buildFieldsFromColumns]);

  // Screen load from scanned
  const handleScreenLoaded = useCallback((settingsJson: string) => {
    try {
      const parsed = JSON.parse(settingsJson);
      if (parsed.version === 4) {
        store.loadConfig(parsed);
      } else {
        const v4 = convertV3toV4(parsed);
        store.loadConfig(v4);
      }
      setActiveTab("setup");
    } catch {
      alert("Failed to parse screen settings");
    }
  }, []);

  const handleNewScreen = useCallback((type: "Grid" | "MasterDetail") => {
    if (store.isDirty && !confirm(IsLangEN ? "Unsaved changes will be lost. Continue?" : "التغييرات هتضيع. متأكد؟")) return;
    const cfg = createEmptyScreen(type);
    store.loadConfig(cfg);
    setActiveTab("setup");
  }, [store.isDirty, IsLangEN]);

  const handleImportFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ts,.tsx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const { v4 } = parseSettingsFromTs(text);
      if (v4) {
        store.loadConfig(v4);
        setActiveTab("setup");
      } else {
        alert(IsLangEN ? "No settings found in file" : "مفيش إعدادات في الملف");
      }
    };
    input.click();
  }, [IsLangEN]);

  const handleExport = useCallback(() => {
    const cfg = store.config;
    const name = cfg.module || "NewScreen";
    downloadFile(`${name}.ts`, generateHookFile(cfg));
    downloadFile(`page.tsx`, generatePageFile(cfg));
  }, [store.config]);

  const handleSaveAll = useCallback(() => {
    const cfg = store.config;
    const name = cfg.module || "NewScreen";
    downloadFile(`${name}.ts`, generateHookFile(cfg));
    downloadFile(`page.tsx`, generatePageFile(cfg));
    if (connection.database) {
      downloadFile(`Add_${name}_Module.sql`, generateSqlScript(cfg, connection.database));
    }
  }, [store.config, connection.database]);

  // Load project search functions
  const handleLoadProject = useCallback(async () => {
    if (!projectPath) return;
    const res = await loadSearchFunctions(projectPath);
    if (res.success && res.functions) setSearchFunctions(res.functions);
  }, [projectPath]);

  // Detail columns load
  const handleDetailColumnsLoaded = useCallback((detailIdx: number, columns: SqlColumn[]) => {
    const fields = buildFieldsFromColumns(columns);
    const state = useScreenBuilder.getState();
    const details = [...state.config.details];
    if (details[detailIdx]) {
      details[detailIdx] = { ...details[detailIdx], fields };
      const keyCol = columns.find(c => c.isIdentity)?.name || columns.find(c => c.isPK)?.name || "";
      if (!details[detailIdx].keyColumn && keyCol) details[detailIdx].keyColumn = keyCol;
      store.loadConfig({ ...state.config, details });
    }
  }, [buildFieldsFromColumns]);

  return {
    IsLangEN, IsDark, store,
    connection, setConnection, isConnected, setIsConnected,
    databases, setDatabases, tables, setTables,
    searchFunctions, setSearchFunctions,
    resources, columnMeta,
    projectPath, setProjectPath,
    activeTab, setActiveTab,
    showHelp, setShowHelp,
    showSidebar, setShowSidebar,
    loading,
    handleConnect, handleDatabaseChange, handleLoadColumns,
    handleColumnsLoaded, handleScreenLoaded,
    handleNewScreen, handleImportFile, handleExport, handleSaveAll,
    handleLoadProject, handleDetailColumnsLoaded,
    buildFieldsFromColumns,
  };
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
