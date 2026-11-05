"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
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
import { FieldConfigV4, createEmptyField, createEmptyScreen, ScreenType, TreeSettingsV4, ScreenConfigV5, normalizeConfig, autoLayout, deriveFilterArea, pruneLayout } from "./types/ScreenConfig";
import { SERVER_CONNECTION, projectInfo } from "./utils/sqlApi";
import { useDbMeta } from "./utils/dbMeta";

// بيخمّن أعمدة الشجرة من أسماء الأعمدة (CC_CODE / PARENT_ACC / CC_DESCA ...)
export function detectTreeColumns(names: string[], keyColumn: string): Partial<TreeSettingsV4> {
  const find = (...res: RegExp[]) => {
    for (const re of res) {
      const hit = names.find((n) => re.test(n) && n !== keyColumn);
      if (hit) return hit;
    }
    return "";
  };
  const parentColumn = find(/^parent/i, /_parent$/i, /parent/i);
  const codeColumn = find(/^(?!.*parent).*_CODE$/i, /^(?!.*parent).*Code$/, /^Code$/i, /^(?!.*parent).*(No|Num)$/i);
  return {
    parentColumn,
    codeColumn: codeColumn && !/^(CompCode|BranchCode)$/i.test(codeColumn) ? codeColumn : find(/^(?!Comp|Branch|.*parent).*code/i),
    titleColumn: find(/DESCA$/i, /NameA$/i, /_AR$/i, /DescA/i, /Name$/i, /Desc/i),
    titleColumnEn: find(/DESCL$/i, /DESCE$/i, /NameE$/i, /NameL$/i, /_EN$/i),
    levelColumn: find(/level/i, /lvl/i),
    leafColumn: find(/^DETAIL$/i, /IsDetail/i, /IsLeaf/i, /_DETAIL$/i),
    activeColumn: find(/ACTIVE$/i, /^IsActive$/i),
  };
}

const LS_KEY = "screenbuilder_connection";
const LS_PROJECT = "screenbuilder_projectpath";

export type TabId = "design" | "setup" | "fields" | "list" | "details" | "validations" | "print" | "preview";
const LS_DRAFT = "screenbuilder_draft_v5";

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
    // server فاضي = الباك إند يستخدم ConnectionStrings:cs (نفس قاعدة البرنامج)
    return { server: "", user: "", password: "", database: "" };
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
  const [activeTab, setActiveTab] = useState<TabId>("design");
  const [dbScriptsPath, setDbScriptsPath] = useState("");
  const [showOpen, setShowOpen] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [showHelp, setShowHelp] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showSearchBuilder, setShowSearchBuilder] = useState(false);
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
      Sys.Alert("Connection failed:\n" + (res.error || ""), "فشل الاتصال:\n" + (res.error || ""), "error");
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
      Sys.Alert("Failed to load columns:\n" + (res.error || ""), "فشل تحميل الأعمدة:\n" + (res.error || ""), "error");
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
      if (col.isComputed || col.notInDb) {
        f.inForm = false;
        f.noSave = true;
      }

      f.order = fields.length + 1;
      fields.push(f);
    }

    setColumnMeta(meta);
    return fields;
  }, [resources]);

  // Main column load handler
  const handleColumnsLoaded = useCallback((columns: SqlColumn[], table: string, view: string) => {
    const built = buildFieldsFromColumns(columns);
    // دمج زي الديسك توب: الحقول المحفوظة بتفضل بإعداداتها، الجديدة بتتضاف مقفولة
    const prev = useScreenBuilder.getState().config;
    let fields = built;
    if (prev.fields.length > 0 && prev.table.toLowerCase() === table.toLowerCase()) {
      const byName = new Map(built.map((b) => [b.field.toLowerCase(), b]));
      const kept = prev.fields.filter((e) => byName.has(e.field.toLowerCase()) || !!e.formula).map((e) => ({ ...e, noSave: byName.get(e.field.toLowerCase())?.noSave || e.noSave || (!byName.has(e.field.toLowerCase()) && !!e.formula) }));
      const keptNames = new Set(kept.map((k) => k.field.toLowerCase()));
      const added = built.filter((b) => !keptNames.has(b.field.toLowerCase())).map((b) => ({ ...b, inGrid: false, inForm: false, search: false, inFilter: false }));
      fields = [...kept, ...added];
      const missing = prev.fields.filter((e) => !byName.has(e.field.toLowerCase()) && !e.formula && !e.noSave).map((e) => e.field);
      Sys.ShowMessage(
        `Merged with saved settings: ${added.length} new column(s)` + (missing.length ? `, not in table: ${missing.join(", ")}` : ""),
        `اتدمجت مع الإعدادات المحفوظة: ${added.length} عمود جديد` + (missing.length ? `، مش موجودين في الجدول: ${missing.join("، ")}` : ""),
        missing.length ? "warning" : "info"
      );
    }
    const keyCol = columns.find(c => c.isIdentity)?.name || columns.find(c => c.isPK)?.name || columns[0]?.name || "";

    const state = useScreenBuilder.getState();
    const newConfig = { ...state.config, fields, table, view, keyColumn: keyCol };
    if (newConfig.screenType === "Tree") {
      const guess = detectTreeColumns(columns.map((c) => c.name), keyCol);
      const tree = { ...newConfig.tree };
      for (const [k, v] of Object.entries(guess)) if (v && !(tree as any)[k]) (tree as any)[k] = v;
      newConfig.tree = tree;
      if (!newConfig.orderBy && tree.codeColumn) { newConfig.orderBy = tree.codeColumn; newConfig.orderType = "ASC"; }
    }
    // Phase 5: تخطيط الفورم والفلاتر
    const sameTable = prev.table.toLowerCase() === table.toLowerCase() && prev.layout.sections.length > 0;
    if (sameTable) {
      newConfig.layout = pruneLayout(prev.layout, new Set(fields.map((f) => f.field)));
      newConfig.filterArea = (prev.filterArea || []).filter((x) => !x.field || fields.some((f) => f.field === x.field));
    } else {
      newConfig.layout = autoLayout({ fields });
      newConfig.filterArea = deriveFilterArea({ screenType: newConfig.screenType, fields, listFields: newConfig.listFields });
    }
    store.loadConfig(newConfig);
    setActiveTab("design");
  }, [buildFieldsFromColumns]);

  // Screen load from scanned
  const handleScreenLoaded = useCallback((settingsJson: string) => {
    try {
      const parsed = JSON.parse(settingsJson);
      store.loadConfig(parsed.version === 4 || parsed.version === 5 ? normalizeConfig(parsed) : normalizeConfig(convertV3toV4(parsed)));
      setActiveTab("design");
    } catch {
      Sys.Alert("Failed to read the screen settings", "مقدرتش أقرا إعدادات الشاشة", "error");
    }
  }, []);

  const handleNewScreen = useCallback(async (type: ScreenType) => {
    if (store.isDirty && !(await Sys.Confirm("Unsaved changes will be lost. Continue?", "التغييرات اللي ما اتحفظتش هتضيع. متأكد؟", { danger: true }))) return;
    const cfg = createEmptyScreen(type);
    store.loadConfig(cfg);
    setActiveTab("design");
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
        setActiveTab("design");
      } else {
        Sys.Alert("No ScreenBuilder settings found in this file", "مفيش إعدادات ScreenBuilder في الملف ده", "warning");
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

  // تحميل مثال جاهز
  const handleLoadExample = useCallback(async (cfg: ScreenConfigV5) => {
    if (store.isDirty && !(await Sys.Confirm("Unsaved changes will be lost. Continue?", "التغييرات اللي ما اتحفظتش هتضيع. متأكد؟", { danger: true }))) return;
    store.loadConfig(cfg);
    setShowExamples(false);
    setActiveTab("design");
    Sys.ShowMessage("Example loaded — check each tab, then Preview & Save", "المثال اتحمّل — لف على التابات وبعدين المعاينة والحفظ", "success");
  }, [store.isDirty]);

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

  // ===== Phase 5 =====
  const db = useDbMeta(connection, isConnected, tables);

  // اتصال بإعدادات السيرفر نفسه (من غير باسورد في المتصفح)
  const handleConnectServer = useCallback(async () => {
    setLoading("Connecting...");
    try {
      const res = await testConnection(SERVER_CONNECTION);
      if (!res.success) { Sys.Alert("Connection failed:\n" + (res.error || ""), "فشل الاتصال:\n" + (res.error || ""), "error"); return; }
      const newConn = { ...SERVER_CONNECTION, database: res.currentDatabase || "" };
      setConnection(newConn);
      setDatabases(res.databases || []);
      setIsConnected(true);
      const [tRes, rRes] = await Promise.all([loadTables(newConn), loadResources(newConn)]);
      if (tRes.success) setTables([...(tRes.tables || []).map((x) => ({ name: x.name, type: "U" })), ...(tRes.views || []).map((v) => ({ name: v.name, type: "V" }))]);
      if (rRes.success && rRes.resources) setResources(rRes.resources);
    } catch (e: any) {
      Sys.Alert("Connection failed:\n" + String(e?.message || e), "فشل الاتصال:\n" + String(e?.message || e), "error");
    } finally { setLoading(""); }
  }, []);

  // تحميل أعمدة جدول (من لوحة الخصائص)
  const loadTableColumns = useCallback(async (table: string, view: string) => {
    const cols = await handleLoadColumns(table, view);
    if (cols) handleColumnsLoaded(cols, table, view);
  }, [handleLoadColumns, handleColumnsLoaded]);

  // مسار المشروع تلقائي (لو مش متحدد)
  useEffect(() => {
    projectInfo().then((r) => {
      if (r.success) {
        if (r.projectPath) setProjectPath((cur) => cur || r.projectPath!);
        if (r.dbScriptsPath) setDbScriptsPath(r.dbScriptsPath);
      }
    }).catch(() => { });
  }, []);

  // مسودة تلقائية في localStorage (كل ثانيتين بعد آخر تعديل)
  useEffect(() => {
    try { const d = localStorage.getItem(LS_DRAFT); if (d) setDraft(d); } catch { }
    let timer: any;
    const unsub = useScreenBuilder.subscribe((state, prev) => {
      if (state.config === prev.config || !state.isDirty) return;
      clearTimeout(timer);
      timer = setTimeout(() => { try { localStorage.setItem(LS_DRAFT, JSON.stringify(state.config)); } catch { } }, 2000);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, []);
  const restoreDraft = useCallback(() => {
    try { const cfg = normalizeConfig(JSON.parse(draft)); store.loadConfig(cfg); setDraft(""); } catch { Sys.Alert("Draft is corrupted", "المسودة تالفة", "error"); }
  }, [draft]);
  const discardDraft = useCallback(() => { try { localStorage.removeItem(LS_DRAFT); } catch { } setDraft(""); }, []);

  return {
    db, dbScriptsPath, showOpen, setShowOpen, showSave, setShowSave, draft, restoreDraft, discardDraft,
    handleConnectServer, loadTableColumns,
    IsLangEN, IsDark, store,
    connection, setConnection, isConnected, setIsConnected,
    databases, setDatabases, tables, setTables,
    searchFunctions, setSearchFunctions,
    resources, setResources, columnMeta,
    projectPath, setProjectPath,
    activeTab, setActiveTab,
    showHelp, setShowHelp,
    showExamples, setShowExamples, handleLoadExample,
    showSearchBuilder, setShowSearchBuilder,
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
