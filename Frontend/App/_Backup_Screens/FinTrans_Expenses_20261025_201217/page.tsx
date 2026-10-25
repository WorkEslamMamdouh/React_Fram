"use client";

// =====================================================================================
//  📄 page.tsx   ←  ملف الشكل (HTML) بس — شاشة المصروفات
//  اتعمل أوتوماتيك من برنامج CreatePageReact — كل حاجة جاية من FinTrans_Expenses.ts عن طريق p.
// =====================================================================================

import { useMemo } from "react";
import { FinTrans_Expenses } from "./FinTrans_Expenses";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";

// =======================
// نقطة البداية (نفس شاشة Login)
// =======================
export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_FinTrans_Expenses" rel="stylesheet" href="/StyleDesign/Pages/FinTrans_Expenses/FinTrans_ExpensesEN.css" />
  ) : (
    <link id="lang-style_FinTrans_Expenses" rel="stylesheet" href="/StyleDesign/Pages/FinTrans_Expenses/FinTrans_ExpensesAR.css" />
  );

  const page = FinTrans_Expenses();

  return <FinTrans_ExpensesPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof FinTrans_Expenses>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// الشاشة
// =======================
function FinTrans_ExpensesPage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  const card = d
    ? "bg-gray-900/80 border-gray-700/60 text-gray-100"
    : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d
    ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500"
    : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  // 👇 أي عمود نوعه select بيظهر في الجدول كشارة فيها اسم الاختيار
  //    لازم useMemo عشان الجدول ميعيدش التحميل على طول
  const columns = useMemo(
    () =>
      p.grid.Columns.map((col) =>
        col.inputType === "select"
          ? { ...col, itemTemplate: (value: any) => <OptionBadge value={value} options={col.selectOptions ?? []} /> }
          : col
      ),
    [p.grid.Columns]
  );

  return (
    <>
      {p.stylesheet}

      <div className="p-2 md:p-4 space-y-4">
        {/* ============ العنوان ============ */}
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${card}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
              <i className="fa-solid fa-table-list"></i>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{L.FinTrans_Expenses_title}</h1>
              <p className={`text-sm ${muted}`}>{L.FinTrans_Expenses_subtitle}</p>
            </div>
          </div>

          <button onClick={p.RefreshGrid} className={`px-4 py-2 rounded-xl border-2 font-medium transition ${btnSecondary}`}>
            <i className="fa-solid fa-rotate mx-1"></i> {L.FinTrans_Expenses_refresh}
          </button>
        </div>

        {/* ============ الجدول ============ */}
        <DynamicGrid
          key={p.gridKey}
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={columns}
          condition={p.grid.Condition}
          orderBy={p.grid.KeyColumn}
          orderType="DESC"
          pageSize={p.grid.PageSize}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}
          height="calc(100vh - 140px)"
          enableInsert={p.grid.EnableInsert}
          enableUpdate={p.grid.EnableUpdate}
          enableDelete={p.grid.EnableDelete}
          enableSearch={true}
          enableExport={p.grid.EnableExport}
          enableSort={true}
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}
          defaultFilters={p.grid.DefaultFilters}
        />
      </div>
    </>
  );
}

// =====================================================================================
//  شارة الاختيار جوه الجدول (للأعمدة اللي نوعها select)
// =====================================================================================
function OptionBadge({ value, options }: { value: any; options: { value: any; label: string }[] }) {
  if (value === null || value === undefined || value === "") return <span>-</span>;
  const opt = options.find((o) => String(o.value) === String(value));
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
      {opt ? opt.label : String(value)}
    </span>
  );
}
