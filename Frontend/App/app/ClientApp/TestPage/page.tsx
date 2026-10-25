"use client";

// =====================================================================================
//  📄 page.tsx   ←  ملف الشكل (HTML) بس
// -------------------------------------------------------------------------------------
//  هنا مفيش أي بيزنس. كل الدوال والبيانات جاية من  TestPage.ts  عن طريق  p.
//  مثال:  p.RefreshAll   p.stats.total   p.grid.Columns
// =====================================================================================

import { useMemo } from "react";
import { TestPage } from "./TestPage";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";
import SearchModal from "../Shared/Components/Import/SearchModal";

// =======================
// نقطة البداية (نفس شاشة Login)
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
// الشاشة
// =======================
function TestPagePage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  // ألوان بتتغير مع الوضع الداكن
  const card = d
    ? "bg-gray-900/80 border-gray-700/60 text-gray-100"
    : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d
    ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500"
    : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  // 👇 شكل عمود الحالة جوه الجدول (HTML) — بنضيفه على الأعمدة اللي جاية من TestPage.ts
  //    لازم useMemo عشان الجدول ميعيدش التحميل على طول
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
        {/* ============ العنوان والأزرار ============ */}
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 ${card}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
              <i className="fa-solid fa-layer-group"></i>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{L.tp_title}</h1>
              <p className={`text-sm ${muted}`}>{L.tp_subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* ② يفتح نافذة بحث المستخدمين */}
            <button
              onClick={p.OpenUserSearch}
              className="px-4 py-2 rounded-xl text-white font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-md transition"
            >
              <i className="fa-solid fa-magnifying-glass mx-1"></i> {L.tp_pickUser}
            </button>

            <button onClick={p.RefreshAll} className={`px-4 py-2 rounded-xl border-2 font-medium transition ${btnSecondary}`}>
              <i className="fa-solid fa-rotate mx-1"></i> {L.tp_refresh}
            </button>

            <button onClick={p.ToggleHelp} className={`px-4 py-2 rounded-xl border-2 font-medium transition ${btnSecondary}`}>
              <i className="fa-solid fa-circle-question mx-1"></i> {L.tp_help}
            </button>
          </div>
        </div>

        {/* ============ شرح الشاشة ============ */}
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

        {/* ============ ① كروت الإحصائيات (دوس عشان تفلتر) ============ */}
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

        {/* ============ المستخدم المختار + الصف المختار ============ */}
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

        {/* ============ ③ الجدول ============ */}
        <DynamicGrid
          key={p.gridKey}                         // لما يتغير الجدول بيتحمل من جديد
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={columns}
          condition={p.grid.Condition}            // شرط الكروت
          orderBy={p.grid.KeyColumn}
          orderType="DESC"
          pageSize={10}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType=""
          runProcessTrans={false}
          height="calc(100vh - 140px)"
          // الأزرار الأساسية
          enableInsert={true}
          enableUpdate={true}
          enableDelete={true}
          enableSearch={true}
          enableExport={true}
          enableSort={true}
          // الفلتر المتقدم
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}
          defaultFilters={p.grid.DefaultFilters}
          // أزرار إضافية جنب كل صف
          enablePrint={true}
          onPrint={p.OnPrint}
          enableCopy={true}
          onCopy={p.OnCopy}
          extraActions={p.grid.ExtraActions}
          // ④ دبل كليك
          onRowDoubleClick={p.ShowRowDetails}
        />
      </div>

      {/* ============ ② نافذة بحث المستخدمين (G_SearchFrom) ============ */}
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
//  مكونات صغيرة للشكل بس
// =====================================================================================

// شارة الحالة جوه الجدول
function StatusBadge({ value, L }: { value: any; L: any }) {
  const active = value == 1;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`}></span>
      {active ? L.tp_active : L.tp_stopped}
    </span>
  );
}

// كارت إحصائية
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
        <div className="text-2xl font-bold">{x.loading ? "…" : x.value}</div>
        <div className={`text-xs ${x.muted}`}>{x.hint}</div>
      </div>
    </button>
  );
}

// كارت بيعرض بيانات (المستخدم أو الصف)
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

// بند في الشرح
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
