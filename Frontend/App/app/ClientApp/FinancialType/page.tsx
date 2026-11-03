"use client";

// =====================================================================================
//  ðŸ“„ page.tsx   â†  Ù…Ù„Ù Ø§Ù„Ø´ÙƒÙ„ (HTML) Ø¨Ø³ â€” Ø´Ø§Ø´Ø© Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©
//  ÙƒÙ„ Ø­Ø§Ø¬Ø© Ø¬Ø§ÙŠØ© Ù…Ù†  FinancialType.ts  Ø¹Ù† Ø·Ø±ÙŠÙ‚  p.
// =====================================================================================

import { useMemo } from "react";
import { FinancialType, TrTypes } from "./FinancialType";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";

// =======================
// Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© (Ù†ÙØ³ Ø´Ø§Ø´Ø© Login)
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
// Ø§Ù„Ø´Ø§Ø´Ø©
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

  // ðŸ‘‡ Ø´ÙƒÙ„ Ø¹Ù…ÙˆØ¯ Ø§Ù„Ù†ÙˆØ¹ Ø¬ÙˆÙ‡ Ø§Ù„Ø¬Ø¯ÙˆÙ„ (Ù‚Ø¨Ø¶ Ø£Ø®Ø¶Ø± / ØµØ±Ù Ø£Ø­Ù…Ø±)
  //    Ù„Ø§Ø²Ù… useMemo Ø¹Ø´Ø§Ù† Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ù…ÙŠØ¹ÙŠØ¯Ø´ Ø§Ù„ØªØ­Ù…ÙŠÙ„ Ø¹Ù„Ù‰ Ø·ÙˆÙ„
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
        {/* ============ Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ============ */}
        {/* ============ Ø§Ù„Ø¬Ø¯ÙˆÙ„ ============ */}
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
          runProcessTrans={p.grid.RunProcessTrans}   // false = Ù…Ù† ØºÙŠØ± G_ProcessTrans
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
//  Ø´Ø§Ø±Ø© Ù†ÙˆØ¹ Ø§Ù„Ø­Ø±ÙƒØ© Ø¬ÙˆÙ‡ Ø§Ù„Ø¬Ø¯ÙˆÙ„
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
