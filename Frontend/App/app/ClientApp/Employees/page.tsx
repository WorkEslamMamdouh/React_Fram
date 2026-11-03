"use client";

// =====================================================================================
//  ðŸ“„ page.tsx   â†  Ù…Ù„Ù Ø§Ù„Ø´ÙƒÙ„ (HTML) Ø¨Ø³ â€” Ø´Ø§Ø´Ø© Employees
//  Ø§ØªØ¹Ù…Ù„ Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒ Ù…Ù† Ø¨Ø±Ù†Ø§Ù…Ø¬ CreatePageReact â€” ÙƒÙ„ Ø­Ø§Ø¬Ø© Ø¬Ø§ÙŠØ© Ù…Ù† Employees.ts Ø¹Ù† Ø·Ø±ÙŠÙ‚ p.
// =====================================================================================

import { useMemo } from "react";
import { Employees } from "./Employees";
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
    <link id="lang-style_Employees" rel="stylesheet" href="/StyleDesign/Pages/Employees/EmployeesEN.css" />
  ) : (
    <link id="lang-style_Employees" rel="stylesheet" href="/StyleDesign/Pages/Employees/EmployeesAR.css" />
  );

  const page = Employees();

  return <EmployeesPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof Employees>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// Ø§Ù„Ø´Ø§Ø´Ø©
// =======================
function EmployeesPage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  const card = d
    ? "bg-gray-900/80 border-gray-700/60 text-gray-100"
    : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d
    ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500"
    : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  // ðŸ‘‡ Ø£ÙŠ Ø¹Ù…ÙˆØ¯ Ù†ÙˆØ¹Ù‡ select Ø¨ÙŠØ¸Ù‡Ø± ÙÙŠ Ø§Ù„Ø¬Ø¯ÙˆÙ„ ÙƒØ´Ø§Ø±Ø© ÙÙŠÙ‡Ø§ Ø§Ø³Ù… Ø§Ù„Ø§Ø®ØªÙŠØ§Ø±
  //    Ù„Ø§Ø²Ù… useMemo Ø¹Ø´Ø§Ù† Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ù…ÙŠØ¹ÙŠØ¯Ø´ Ø§Ù„ØªØ­Ù…ÙŠÙ„ Ø¹Ù„Ù‰ Ø·ÙˆÙ„
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
        {/* ============ Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ============ */}
        {/* ============ Ø§Ù„Ø¬Ø¯ÙˆÙ„ ============ */}
        <DynamicGrid
          key={p.gridKey}
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={columns}
          condition={p.grid.Condition}
          orderBy={p.grid.OrderBy}
          orderType={p.grid.OrderType}
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
//  Ø´Ø§Ø±Ø© Ø§Ù„Ø§Ø®ØªÙŠØ§Ø± Ø¬ÙˆÙ‡ Ø§Ù„Ø¬Ø¯ÙˆÙ„ (Ù„Ù„Ø£Ø¹Ù…Ø¯Ø© Ø§Ù„Ù„ÙŠ Ù†ÙˆØ¹Ù‡Ø§ select)
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
