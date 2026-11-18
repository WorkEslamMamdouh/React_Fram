"use client";

import { QA_E2E_CostCenters } from "./QA_E2E_CostCenters";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import TreeScreen from "../Shared/Components/Import/TreeScreen";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_CostCenters();
  return <QA_E2E_CostCentersPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_CostCenters> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_CostCentersPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-2 md:p-3">
      <TreeScreen config={p.Config} />
    </div>
  );
}
