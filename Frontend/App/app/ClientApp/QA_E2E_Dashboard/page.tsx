"use client";

import { QA_E2E_Dashboard } from "./QA_E2E_Dashboard";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Dashboard from "../Shared/Components/Import/Patterns/Dashboard";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Dashboard();
  return <QA_E2E_DashboardPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Dashboard> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_DashboardPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <Dashboard config={p.Config} onDrill={p.OnDrill} />
    </div>
  );
}
