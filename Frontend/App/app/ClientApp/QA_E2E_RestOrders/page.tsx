"use client";

import { QA_E2E_RestOrders } from "./QA_E2E_RestOrders";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_RestOrders();
  return <QA_E2E_RestOrdersPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_RestOrders> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_RestOrdersPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-2 md:p-3 space-y-2">
      <DynamicGrid
        key={p.gridKey}
        tableName={p.grid.TableName}
        viewName={p.grid.ViewName}
        keyColumn={p.grid.KeyColumn}
        columns={p.grid.Columns}
        condition={p.grid.Condition}
        orderBy="OrderID"
        orderType="DESC"
        pageSize={25}
        pagingMode="pages"
        compCode={p.grid.CompCode}
        branchCode={p.grid.BranchCode}
        keyTrType={p.grid.TrType}
        runProcessTrans={p.grid.RunProcessTrans}
        height="calc(100vh - 80px)"
        enableInsert={false}
        enableUpdate={true}
        enableDelete={true}
        enableSearch={true}
        enableExport={true}
        enableSort={true}
        moduleCode={p.grid.ModuleCode}
        report={p.grid.Report}
      />
    </div>
  );
}
