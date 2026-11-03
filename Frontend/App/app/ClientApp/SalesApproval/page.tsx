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
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500" : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";

  const Session = useSys((s) => s.Session);
  const FinYear = Session?.CurrentEnvironment?.FinYear || new Date().getFullYear();
  void FinYear;
  const [fromDate, setFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const headerFilterClause = (fromDate && toDate)
    ? ` AND SaleDate >= '${fromDate}' AND SaleDate <= '${toDate}'`
    : "";

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className={`text-[11px] block ${muted}`}>{IsLangEN ? "Date (From)" : "تاريخ (من)"}</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`px-2 py-1.5 rounded-lg border text-sm ${d ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`} />
            </div>
            <div>
              <label className={`text-[11px] block ${muted}`}>{IsLangEN ? "Date (To)" : "تاريخ (إلى)"}</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={`px-2 py-1.5 rounded-lg border text-sm ${d ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`} />
            </div>
            {(!fromDate || !toDate) && (
              <span className="text-[11px] text-amber-500 self-center">{IsLangEN ? "Filter required" : "الفلتر مطلوب"}</span>
            )}
          </div>
          <button onClick={p.RefreshGrid} className={`px-3 py-1.5 rounded-lg border font-medium text-sm transition ${btnSecondary}`}>
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
          height="calc(100vh - 100px)"
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
