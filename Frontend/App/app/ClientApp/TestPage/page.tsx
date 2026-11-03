"use client";

// =====================================================================================
//  ðŸ“„ page.tsx   â†  Ù…Ù„Ù Ø§Ù„Ø´ÙƒÙ„ (HTML) Ø¨Ø³
// -------------------------------------------------------------------------------------
//  Ù‡Ù†Ø§ Ù…ÙÙŠØ´ Ø£ÙŠ Ø¨ÙŠØ²Ù†Ø³. ÙƒÙ„ Ø§Ù„Ø¯ÙˆØ§Ù„ ÙˆØ§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¬Ø§ÙŠØ© Ù…Ù†  TestPage.ts  Ø¹Ù† Ø·Ø±ÙŠÙ‚  p.
//  Ù…Ø«Ø§Ù„:  p.RefreshAll   p.stats.total   p.grid.Columns
// =====================================================================================

import { useMemo } from "react";
import { TestPage } from "./TestPage";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";
import SearchModal from "../Shared/Components/Import/SearchModal";

// =======================
// Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© (Ù†ÙØ³ Ø´Ø§Ø´Ø© Login)
// =======================
export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_TestPage" rel="stylesheet" href="/StyleDesign/Pages/TestPage/TestPageEN.css" />
  ) : (
    <link id="lang-style_TestPage" rel="stylesheet" href="/StyleDesign/Pages/TestPage/TestPageAR.css" />
  );

  const page = TestPage();

  return <TestPagePage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof TestPage>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// Ø§Ù„Ø´Ø§Ø´Ø©
// =======================
function TestPagePage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  // Ø£Ù„ÙˆØ§Ù† Ø¨ØªØªØºÙŠØ± Ù…Ø¹ Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ø¯Ø§ÙƒÙ†
  const card = d
    ? "bg-gray-900/80 border-gray-700/60 text-gray-100"
    : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d
    ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500"
    : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  // ðŸ‘‡ Ø´ÙƒÙ„ Ø¹Ù…ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„Ø© Ø¬ÙˆÙ‡ Ø§Ù„Ø¬Ø¯ÙˆÙ„ (HTML) â€” Ø¨Ù†Ø¶ÙŠÙÙ‡ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø¹Ù…Ø¯Ø© Ø§Ù„Ù„ÙŠ Ø¬Ø§ÙŠØ© Ù…Ù† TestPage.ts
  //    Ù„Ø§Ø²Ù… useMemo Ø¹Ø´Ø§Ù† Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ù…ÙŠØ¹ÙŠØ¯Ø´ Ø§Ù„ØªØ­Ù…ÙŠÙ„ Ø¹Ù„Ù‰ Ø·ÙˆÙ„
  const columns = useMemo(
    () =>
      p.grid.Columns.map((col) =>
        col.field === "Status"
          ? { ...col, itemTemplate: (value: any) => <StatusBadge value={value} L={L} /> }
          : col
      ),
    [p.grid.Columns, L]
  );

  return (
    <>
      {p.stylesheet}

      <div className="p-2 md:p-4 space-y-4">
        {/* ============ Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙˆØ§Ù„Ø£Ø²Ø±Ø§Ø± ============ */}
        {/* ============ Ø´Ø±Ø­ Ø§Ù„Ø´Ø§Ø´Ø© ============ */}
        {p.showHelp && (
          <div className={`rounded-2xl border p-4 md:p-5 ${d ? "bg-indigo-950/40 border-indigo-800/60 text-gray-100" : "bg-blue-50/80 border-blue-200 text-gray-800"}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <HelpItem n={1} title={L.tp_help1Title} body={L.tp_help1Body} d={d} />
              <HelpItem n={2} title={L.tp_help2Title} body={L.tp_help2Body} d={d} />
              <HelpItem n={3} title={L.tp_help3Title} body={L.tp_help3Body} d={d} />
              <HelpItem n={4} title={L.tp_help4Title} body={L.tp_help4Body} d={d} />
              <HelpItem n={5} title={L.tp_help5Title} body={L.tp_help5Body} d={d} />
            </div>
          </div>
        )}

        {/* ============ â‘  ÙƒØ±ÙˆØª Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª (Ø¯ÙˆØ³ Ø¹Ø´Ø§Ù† ØªÙÙ„ØªØ±) ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label={L.tp_total} value={p.stats.total} icon="fa-building" color="from-blue-600 to-indigo-600"
            selected={p.statusFilter === "all"} onClick={() => p.ChangeStatusFilter("all")}
            loading={p.statsLoading} hint={L.tp_clickToFilter} card={card} muted={muted}
          />
          <StatCard
            label={L.tp_active} value={p.stats.active} icon="fa-circle-check" color="from-emerald-500 to-teal-600"
            selected={p.statusFilter === "active"} onClick={() => p.ChangeStatusFilter("active")}
            loading={p.statsLoading} hint={L.tp_clickToFilter} card={card} muted={muted}
          />
          <StatCard
            label={L.tp_stopped} value={p.stats.stopped} icon="fa-circle-pause" color="from-rose-500 to-red-600"
            selected={p.statusFilter === "stopped"} onClick={() => p.ChangeStatusFilter("stopped")}
            loading={p.statsLoading} hint={L.tp_clickToFilter} card={card} muted={muted}
          />
        </div>

        {/* ============ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…Ø®ØªØ§Ø± + Ø§Ù„ØµÙ Ø§Ù„Ù…Ø®ØªØ§Ø± ============ */}
        {(p.selectedUser || p.selectedRow) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {p.selectedUser && (
              <InfoCard title={L.tp_selectedUser} icon="fa-user" onClose={p.ClearSelectedUser} closeText={L.tp_close} card={card} muted={muted}
                data={{
                  USER_NAME: p.selectedUser.USER_NAME,
                  USER_Email: p.selectedUser.USER_Email,
                  UserID: p.selectedUser.UserID,
                }}
              />
            )}
            {p.selectedRow && (
              <InfoCard title={L.tp_selectedRow} icon="fa-table-list" onClose={p.ClearSelectedRow} closeText={L.tp_close} card={card} muted={muted}
                data={p.selectedRow}
              />
            )}
          </div>
        )}

        {/* ============ â‘¢ Ø§Ù„Ø¬Ø¯ÙˆÙ„ ============ */}
        <DynamicGrid
          key={p.gridKey}                         // Ù„Ù…Ø§ ÙŠØªØºÙŠØ± Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø¨ÙŠØªØ­Ù…Ù„ Ù…Ù† Ø¬Ø¯ÙŠØ¯
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={columns}
          condition={p.grid.Condition}            // Ø´Ø±Ø· Ø§Ù„ÙƒØ±ÙˆØª
          orderBy={p.grid.KeyColumn}
          orderType="DESC"
          pageSize={10}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType=""
          runProcessTrans={false}
          height="calc(100vh - 140px)"
          // Ø§Ù„Ø£Ø²Ø±Ø§Ø± Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©
          enableInsert={true}
          enableUpdate={true}
          enableDelete={true}
          enableSearch={true}
          enableExport={true}
          enableSort={true}
          // Ø§Ù„ÙÙ„ØªØ± Ø§Ù„Ù…ØªÙ‚Ø¯Ù…
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}
          defaultFilters={p.grid.DefaultFilters}
          // Ø£Ø²Ø±Ø§Ø± Ø¥Ø¶Ø§ÙÙŠØ© Ø¬Ù†Ø¨ ÙƒÙ„ ØµÙ
          enablePrint={true}
          onPrint={p.OnPrint}
          enableCopy={true}
          onCopy={p.OnCopy}
          extraActions={p.grid.ExtraActions}
          // â‘£ Ø¯Ø¨Ù„ ÙƒÙ„ÙŠÙƒ
          onRowDoubleClick={p.ShowRowDetails}
        />
      </div>

      {/* ============ â‘¡ Ù†Ø§ÙØ°Ø© Ø¨Ø­Ø« Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† (G_SearchFrom) ============ */}
      <SearchModal
        isOpen={p.isUserSearchOpen}
        onClose={p.CloseUserSearch}
        onSelect={p.OnSelectUser}
        config={p.grid.UserSearchConfig}
        lang={p.lang}
        isDark={p.IsDark}
      />
    </>
  );
}

// =====================================================================================
//  Ù…ÙƒÙˆÙ†Ø§Øª ØµØºÙŠØ±Ø© Ù„Ù„Ø´ÙƒÙ„ Ø¨Ø³
// =====================================================================================

// Ø´Ø§Ø±Ø© Ø§Ù„Ø­Ø§Ù„Ø© Ø¬ÙˆÙ‡ Ø§Ù„Ø¬Ø¯ÙˆÙ„
function StatusBadge({ value, L }: { value: any; L: any }) {
  const active = value == 1;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`}></span>
      {active ? L.tp_active : L.tp_stopped}
    </span>
  );
}

// ÙƒØ§Ø±Øª Ø¥Ø­ØµØ§Ø¦ÙŠØ©
function StatCard(x: {
  label: string; value: number; icon: string; color: string; selected: boolean;
  onClick: () => void; loading: boolean; hint: string; card: string; muted: string;
}) {
  return (
    <button
      onClick={x.onClick}
      className={`text-start rounded-2xl border shadow-lg p-4 flex items-center gap-4 transition hover:-translate-y-0.5 ${x.card} ${x.selected ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-r ${x.color} flex items-center justify-center text-white text-lg`}>
        <i className={`fa-solid ${x.icon}`}></i>
      </div>
      <div className="min-w-0">
        <div className={`text-sm ${x.muted}`}>{x.label}</div>
        <div className="text-2xl font-bold">{x.loading ? "â€¦" : x.value}</div>
        <div className={`text-xs ${x.muted}`}>{x.hint}</div>
      </div>
    </button>
  );
}

// ÙƒØ§Ø±Øª Ø¨ÙŠØ¹Ø±Ø¶ Ø¨ÙŠØ§Ù†Ø§Øª (Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø£Ùˆ Ø§Ù„ØµÙ)
function InfoCard(x: {
  title: string; icon: string; data: Record<string, any>; onClose: () => void;
  closeText: string; card: string; muted: string;
}) {
  return (
    <div className={`rounded-2xl border shadow-lg p-4 ${x.card}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <i className={`fa-solid ${x.icon} text-blue-600`}></i> {x.title}
        </h3>
        <button onClick={x.onClose} className={`text-sm ${x.muted} hover:text-rose-600`}>
          <i className="fa-solid fa-xmark mx-1"></i>{x.closeText}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {Object.entries(x.data).map(([k, v]) => (
          <div key={k} className="flex gap-2 min-w-0">
            <span className={`${x.muted} shrink-0`}>{k}:</span>
            <span className="font-medium truncate">{v === null || v === undefined || v === "" ? "-" : String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Ø¨Ù†Ø¯ ÙÙŠ Ø§Ù„Ø´Ø±Ø­
function HelpItem(x: { n: number; title: string; body: string; d: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${x.d ? "bg-gray-900/60" : "bg-white/80"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center">
          {x.n}
        </span>
        <span className="font-semibold text-sm">{x.title}</span>
      </div>
      <p className={`text-xs leading-relaxed ${x.d ? "text-gray-300" : "text-gray-600"}`}>{x.body}</p>
    </div>
  );
}
