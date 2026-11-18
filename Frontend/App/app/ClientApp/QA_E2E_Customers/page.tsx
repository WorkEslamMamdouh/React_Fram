"use client";

import { QA_E2E_Customers } from "./QA_E2E_Customers";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Customers();
  return <QA_E2E_CustomersPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Customers> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_CustomersPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-2 md:p-3 space-y-2">
      <DynamicGrid
        key={p.gridKey}
        tableName={p.grid.TableName}
        keyColumn={p.grid.KeyColumn}
        columns={p.grid.Columns}
        condition={p.grid.Condition}
        orderBy="CustomerID"
        orderType="ASC"
        pageSize={20}
        pagingMode="pages"
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
        moduleCode={p.grid.ModuleCode}
        beforeSave={p.BeforeSave}
      />
    </div>
  );
}
