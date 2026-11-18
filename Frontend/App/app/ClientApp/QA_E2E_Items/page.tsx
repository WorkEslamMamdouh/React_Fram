"use client";

import { QA_E2E_Items } from "./QA_E2E_Items";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";
import CascadingFilterBar from "../Shared/Components/Import/Patterns/CascadingFilterBar";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Items();
  return <QA_E2E_ItemsPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Items> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_ItemsPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-2 md:p-3 space-y-2">
      <CascadingFilterBar state={p.Filters} />
      <DynamicGrid
        key={p.gridKey}
        tableName={p.grid.TableName}
        viewName={p.grid.ViewName}
        keyColumn={p.grid.KeyColumn}
        columns={p.grid.Columns}
        condition={p.grid.Condition}
        orderBy="ItemID"
        orderType="DESC"
        pageSize={40}
        pagingMode="infinite"
        compCode={p.grid.CompCode}
        branchCode={p.grid.BranchCode}
        keyTrType={p.grid.TrType}
        runProcessTrans={p.grid.RunProcessTrans}
        height="calc(100vh - 160px)"
        enableInsert={true}
        enableUpdate={true}
        enableDelete={true}
        enableSearch={true}
        enableExport={true}
        enableSort={true}
        moduleCode={p.grid.ModuleCode}
        report={p.grid.Report}
        reportFilters={p.Filters.values}
      />
    </div>
  );
}
