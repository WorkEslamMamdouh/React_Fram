"use client";

import { QA_E2E_Kitchen } from "./QA_E2E_Kitchen";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import KitchenDisplay from "../Shared/Components/Import/Patterns/KitchenDisplay";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Kitchen();
  return <QA_E2E_KitchenPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Kitchen> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_KitchenPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <KitchenDisplay config={p.Config} station={p.Station || undefined} onStationChange={p.setStation} onStart={p.OnStart} onBumpItem={p.OnBumpItem} onBumpTicket={p.OnBumpTicket} onRecall={p.OnRecall} height="calc(100vh - 100px)" />
    </div>
  );
}
