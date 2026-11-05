"use client";

import { TstCustomer } from "./TstCustomer";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_TstCustomer" rel="stylesheet" href="/StyleDesign/Pages/TstCustomer/TstCustomerEN.css" />
  ) : (
    <link id="lang-style_TstCustomer" rel="stylesheet" href="/StyleDesign/Pages/TstCustomer/TstCustomerAR.css" />
  );

  const page = TstCustomer();
  return <TstCustomerPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof TstCustomer>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function TstCustomerPage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  void p.IsLangEN;
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500" : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";


  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-3 space-y-2">


        {p.filterReady && (
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
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}
          height="calc(100vh - 80px)"
          enableInsert={true}
          enableUpdate={true}
          enableDelete={true}
          enableSearch={true}
          enableExport={true}
          enableSort={true}
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}
          moduleCode={p.grid.ModuleCode}
          formLayout={p.grid.FormLayoutCells}
          onGridFilterChange={p.onFilterChange}
          excel={p.grid.Excel}
        />
        )}
      </div>
    </>
  );
}
