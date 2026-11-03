"use client";

// =====================================================================================
//  ðŸ“„ page.tsx   â†  Ù…Ù„Ù Ø§Ù„Ø´ÙƒÙ„ (HTML) Ø¨Ø³ â€” Ø´Ø§Ø´Ø© Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ù…Ø§Ù„ÙŠØ§Øª
//  ÙƒÙ„ Ø­Ø§Ø¬Ø© Ø¬Ø§ÙŠØ© Ù…Ù†  CashTypes.ts  Ø¹Ù† Ø·Ø±ÙŠÙ‚  p.
// =====================================================================================

import { CashTypes } from "./CashTypes";
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
    <link id="lang-style_CashTypes" rel="stylesheet" href="/StyleDesign/Pages/CashTypes/CashTypesEN.css" />
  ) : (
    <link id="lang-style_CashTypes" rel="stylesheet" href="/StyleDesign/Pages/CashTypes/CashTypesAR.css" />
  );

  const page = CashTypes();

  return <CashTypesPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof CashTypes>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// Ø§Ù„Ø´Ø§Ø´Ø©
// =======================
function CashTypesPage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  const card = d
    ? "bg-gray-900/80 border-gray-700/60 text-gray-100"
    : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d
    ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500"
    : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

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
          columns={p.grid.Columns}
          condition={p.grid.Condition}
          orderBy={p.grid.KeyColumn}
          orderType="DESC"
          pageSize={10}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}               // 'CashBox'
          runProcessTrans={p.grid.RunProcessTrans} // Ø´ØºÙ‘Ù„ G_ProcessTrans
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
