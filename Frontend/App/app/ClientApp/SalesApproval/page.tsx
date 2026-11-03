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
  const [fromDate, setFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0,10));
  const headerFilterClause = (fromDate && toDate)
    ? ` AND SaleDate >= '${fromDate}' AND SaleDate <= '${toDate}'`
    : "";

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          
          <button onClick={p.RefreshGrid} className={`px-4 py-2 rounded-xl border-2 font-medium transition ${btnSecondary}`}>
            <i className="fa-solid fa-rotate mx-1"></i> {L.salesApproval_refresh}
          </button>
        </div>
  );
}
