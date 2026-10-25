"use client";

// =====================================================================================
//  📄 page.tsx   ←  ملف الشكل (HTML) بس — شاشة أنواع الحسابات المالية
//  كل حاجة جاية من  FinancialType.ts  عن طريق  p.
// =====================================================================================

import { useMemo } from "react";
import { FinancialType, TrTypes } from "./FinancialType";
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
    <link id="lang-style_FinancialType" rel="stylesheet" href="/StyleDesign/Pages/FinancialType/FinancialTypeEN.css" />
  ) : (
    <link id="lang-style_FinancialType" rel="stylesheet" href="/StyleDesign/Pages/FinancialType/FinancialTypeAR.css" />
  );

  const page = FinancialType();

  return <FinancialTypePage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof FinancialType>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// الشاشة
// =======================
function FinancialTypePage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  const card = d
    ? "bg-gray-900/80 border-gray-700/60 text-gray-100"
    : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d
    ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500"
    : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  // 👇 شكل عمود النوع جوه الجدول (قبض أخضر / صرف أحمر)
  //    لازم useMemo عشان الجدول ميعيدش التحميل على طول
  const columns = useMemo(
    () =>
      p.grid.Columns.map((col) =>
        col.field === "TrType"
          ? { ...col, itemTemplate: (value: any) => <TrTypeBadge value={value} L={L} /> }
          : col
      ),
    [p.grid.Columns, L]
  );

  return (
    <>
      {p.stylesheet}

      <div className="p-2 md:p-4 space-y-4">
        {/* ============ العنوان ============ */}
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${card}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{L.ft_title}</h1>
              <p className={`text-sm ${muted}`}>{L.ft_subtitle}</p>
            </div>
          </div>

          <button onClick={p.RefreshGrid} className={`px-4 py-2 rounded-xl border-2 font-medium transition ${btnSecondary}`}>
            <i className="fa-solid fa-rotate mx-1"></i> {L.ft_refresh}
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
          pageSize={10}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}   // false = من غير G_ProcessTrans
          height="calc(100vh - 140px)"
          enableInsert={true}
          enableUpdate={true}
          enableDelete={true}
          enableSearch={true}
          enableExport={true}
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
//  شارة نوع الحركة جوه الجدول
// =====================================================================================
function TrTypeBadge({ value, L }: { value: any; L: any }) {
  if (value === null || value === undefined || value === "") return <span>-</span>;

  const isReceipt = Number(value) === TrTypes.Receipt;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isReceipt ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
      <i className={`fa-solid ${isReceipt ? "fa-arrow-down" : "fa-arrow-up"}`}></i>
      {isReceipt ? L.ft_receipt : L.ft_payment}
    </span>
  );
}
