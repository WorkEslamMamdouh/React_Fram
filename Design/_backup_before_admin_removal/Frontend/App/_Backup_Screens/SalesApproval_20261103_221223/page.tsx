"use client";

import { SalesApproval } from "./SalesApproval";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";
import { useState } from "react";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_SalesApproval" rel="stylesheet" href="/StyleDesign/Pages/SalesApproval/SalesApprovalEN.css" />
  ) : (
    <link id="lang-style_SalesApproval" rel="stylesheet" href="/StyleDesign/Pages/SalesApproval/SalesApprovalAR.css" />
  );

  const page = SalesApproval();
  return <SalesApprovalPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof SalesApproval>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function SalesApprovalPage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  const IsLangEN = p.IsLangEN;
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500" : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  const Session = useSys((s) => s.Session);
  const FinYear = Session?.CurrentEnvironment?.FinYear || new Date().getFullYear();
  const [fromDate, setFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const headerFilterClause = (fromDate && toDate)
    ? ` AND TrDate >= '${fromDate}' AND TrDate <= '${toDate}'`
    : "";
  void FinYear;

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-4 space-y-4">
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${card}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
              <i className="fa-solid fa-check-double"></i>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{L.salesApproval_title}</h1>
              <p className={`text-sm ${muted}`}>{L.salesApproval_subtitle}</p>
            </div>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className={`text-[11px] block ${muted}`}>{IsLangEN ? "Date" : "تاريخ"} ({IsLangEN ? "From" : "من"})</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`px-2 py-1.5 rounded-lg border text-sm ${d ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`} />
            </div>
            <div>
              <label className={`text-[11px] block ${muted}`}>{IsLangEN ? "Date" : "تاريخ"} ({IsLangEN ? "To" : "إلى"})</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={`px-2 py-1.5 rounded-lg border text-sm ${d ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`} />
            </div>
            {(!fromDate || !toDate) && (
              <span className="text-[11px] text-amber-500 self-center">{IsLangEN ? "Filter required" : "الفلتر مطلوب"}</span>
            )}
          </div>
          <button onClick={p.RefreshGrid} className={`px-4 py-2 rounded-xl border-2 font-medium transition ${btnSecondary}`}>
            <i className="fa-solid fa-rotate mx-1"></i> {L.salesApproval_refresh}
          </button>
        </div>

        <DynamicGrid
          key={p.gridKey}
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={p.grid.Columns}
          condition={p.grid.Condition + headerFilterClause}
          orderBy={p.grid.KeyColumn}
          orderType="DESC"
          pageSize={15}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}
          height="calc(100vh - 140px)"
          enableInsert={false}
          enableUpdate={false}
          enableDelete={false}
          enableSearch={true}
          enableExport={true}
          enableSort={true}
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}
        />
      </div>
    </>
  );
}
