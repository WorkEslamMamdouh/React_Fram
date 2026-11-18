"use client";

import { Demo_Dashboard } from "./Demo_Dashboard";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Dashboard from "../Shared/Components/Import/Patterns/Dashboard";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_Dashboard();
  return <Demo_DashboardPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_Dashboard> & { Lang: ReturnType<typeof useTranslate> };

function Demo_DashboardPage(p: Props) {
  return (
    <div className="p-2 md:p-4">
      <Dashboard config={p.Config} provider={p.provider} onDrill={p.OnDrill} />
    </div>
  );
}
