"use client";

import { ScreenBuilder, TabId } from "./ScreenBuilder";
import { useSys } from "../Shared/SystemUsing";
import ConnectionPanel from "./components/ConnectionPanel";
import SetupTab from "./components/SetupTab";
import FieldsTab from "./components/FieldsTab";
import DetailsTab from "./components/DetailsTab";
import ValidationsTab from "./components/ValidationsTab";
import PreviewTab from "./components/PreviewTab";
import HelpPanel from "./components/HelpPanel";

export default function InitalizeComponent() {
  const p = ScreenBuilder();
  const d = p.IsDark;
  const t = (en: string, ar: string) => p.IsLangEN ? en : ar;

  const bg = d ? "bg-gray-950" : "bg-gray-50";
  const card = d ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const tabBase = d ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100";
  const tabActive = d ? "text-blue-400 bg-gray-800 border-b-2 border-blue-400" : "text-blue-600 bg-blue-50 border-b-2 border-blue-600";

  const isMD = p.store.config.screenType === "MasterDetail";

  const tabs: { id: TabId; icon: string; en: string; ar: string; show: boolean }[] = [
    { id: "setup", icon: "fa-gear", en: "Setup", ar: "الإعداد", show: true },
    { id: "fields", icon: "fa-table-columns", en: "Fields", ar: "الحقول", show: true },
    { id: "list", icon: "fa-list", en: "List", ar: "القائمة", show: isMD },
    { id: "details", icon: "fa-layer-group", en: "Details", ar: "التفاصيل", show: isMD },
    { id: "validations", icon: "fa-shield-check", en: "Validations", ar: "التحققات", show: true },
    { id: "preview", icon: "fa-code", en: "Preview & Save", ar: "المعاينة والحفظ", show: true },
  ];

  const allFields: { name: string; detail: number }[] = [
    ...p.store.config.fields.map(f => ({ name: f.field, detail: 0 })),
    ...p.store.config.details.flatMap((det, di) => det.fields.map(f => ({ name: f.field, detail: di + 1 }))),
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${bg}`}>
      {/* Help Panel */}
      <HelpPanel activeTab={p.activeTab} isOpen={p.showHelp} onClose={() => p.setShowHelp(false)} />

      {/* Sidebar */}
      {p.showSidebar && (
        <div className={`w-80 flex-shrink-0 border-r overflow-y-auto ${card}`}>
          <ConnectionPanel
            onColumnsLoaded={p.handleColumnsLoaded}
            onScreenLoaded={p.handleScreenLoaded}
            onResourcesLoaded={() => {}}
            onSearchFunctionsLoaded={p.setSearchFunctions}
            connection={p.connection}
            setConnection={p.setConnection}
            isConnected={p.isConnected}
            setIsConnected={p.setIsConnected}
            databases={p.databases}
            setDatabases={p.setDatabases}
            tables={p.tables}
            setTables={p.setTables}
          />
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className={`flex items-center gap-2 px-3 py-2 border-b ${card}`}>
          <button
            onClick={() => p.setShowSidebar(!p.showSidebar)}
            className={`p-2 rounded-lg transition ${d ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
            title={t("Toggle sidebar", "إظهار/إخفاء القائمة")}
          >
            <i className={`fa-solid ${p.showSidebar ? "fa-chevron-left" : "fa-chevron-right"}`} />
          </button>

          {/* Screen Type Badge */}
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            isMD
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
          }`}>
            {p.store.config.screenType}
          </span>

          {/* Screen Name */}
          <span className={`font-semibold text-sm ${d ? "text-gray-200" : "text-gray-700"}`}>
            {p.store.config.module || t("New Screen", "شاشة جديدة")}
          </span>
          {p.store.isDirty && <span className="text-amber-500 text-xs">*</span>}

          <div className="flex-1" />

          {/* Actions */}
          <button onClick={() => p.handleNewScreen("Grid")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${d ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"}`}>
            <i className="fa-solid fa-plus mr-1" />{t("Grid", "جريد")}
          </button>
          <button onClick={() => p.handleNewScreen("MasterDetail")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${d ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"}`}>
            <i className="fa-solid fa-layer-group mr-1" />{t("M/D", "م/ت")}
          </button>

          <div className={`w-px h-5 ${d ? "bg-gray-700" : "bg-gray-300"}`} />

          {/* Undo/Redo */}
          <button onClick={p.store.undo} disabled={!p.store.canUndo()} className={`p-1.5 rounded-lg transition ${!p.store.canUndo() ? "opacity-30" : d ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <i className="fa-solid fa-rotate-left text-xs" />
          </button>
          <button onClick={p.store.redo} disabled={!p.store.canRedo()} className={`p-1.5 rounded-lg transition ${!p.store.canRedo() ? "opacity-30" : d ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <i className="fa-solid fa-rotate-right text-xs" />
          </button>

          <div className={`w-px h-5 ${d ? "bg-gray-700" : "bg-gray-300"}`} />

          <button onClick={p.handleImportFile} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${d ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"}`}>
            <i className="fa-solid fa-file-import mr-1" />{t("Import", "استيراد")}
          </button>
          <button onClick={p.handleSaveAll} className="px-3 py-1.5 rounded-lg text-xs font-medium transition bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-sm">
            <i className="fa-solid fa-download mr-1" />{t("Save All", "حفظ الكل")}
          </button>

          <button onClick={() => p.setShowHelp(true)} className={`p-1.5 rounded-lg transition ${d ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`} title={t("Help", "مساعدة")}>
            <i className="fa-solid fa-circle-question" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className={`flex border-b ${d ? "border-gray-800" : "border-gray-200"}`}>
          {tabs.filter(tab => tab.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => p.setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition flex items-center gap-1.5 ${
                p.activeTab === tab.id ? tabActive : tabBase
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs`} />
              {t(tab.en, tab.ar)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {p.activeTab === "setup" && (
            <SetupTab fields={p.store.config.fields.map(f => f.field)} />
          )}
          {p.activeTab === "fields" && (
            <FieldsTab
              target="fields"
              searchFunctions={p.searchFunctions}
              columnMeta={p.columnMeta}
            />
          )}
          {p.activeTab === "list" && isMD && (
            <FieldsTab
              target="listFields"
              searchFunctions={p.searchFunctions}
              columnMeta={p.columnMeta}
            />
          )}
          {p.activeTab === "details" && isMD && (
            <DetailsTab
              connection={p.connection}
              tables={p.tables}
              searchFunctions={p.searchFunctions}
              columnMeta={p.columnMeta}
              onDetailColumnsLoaded={p.handleDetailColumnsLoaded}
            />
          )}
          {p.activeTab === "validations" && (
            <ValidationsTab allFields={allFields} />
          )}
          {p.activeTab === "preview" && (
            <PreviewTab connection={p.connection} database={p.connection.database} />
          )}
        </div>

        {/* Loading Overlay */}
        {p.loading && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${d ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
              <i className="fa-solid fa-spinner fa-spin text-blue-500" />
              <span className="text-sm font-medium">{p.loading}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
