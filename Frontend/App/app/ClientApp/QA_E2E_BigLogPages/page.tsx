"use client";

import { QA_E2E_BigLogPages } from "./QA_E2E_BigLogPages";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";
import CascadingFilterBar from "../Shared/Components/Import/Patterns/CascadingFilterBar";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_BigLogPages();
  return <QA_E2E_BigLogPagesPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_BigLogPages> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_BigLogPagesPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-2 md:p-3 space-y-2">
      <CascadingFilterBar state={p.Filters} />
      <DynamicGrid
        key={p.gridKey}
        tableName={p.grid.TableName}
        keyColumn={p.grid.KeyColumn}
        columns={p.grid.Columns}
        condition={p.grid.Condition}
        orderBy="LogID"
        orderType="DESC"
        pageSize={50}
        pagingMode="pages"
        compCode={p.grid.CompCode}
        branchCode={p.grid.BranchCode}
        keyTrType={p.grid.TrType}
        runProcessTrans={p.grid.RunProcessTrans}
        height="calc(100vh - 160px)"
        enableInsert={false}
        enableUpdate={true}
        enableDelete={false}
        enableSearch={true}
        enableExport={true}
        enableSort={true}
        moduleCode={p.grid.ModuleCode}
      />
    </div>
  );
}
