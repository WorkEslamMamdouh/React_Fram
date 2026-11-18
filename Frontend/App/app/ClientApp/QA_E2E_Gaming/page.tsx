"use client";

import { QA_E2E_Gaming } from "./QA_E2E_Gaming";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import TileBoard from "../Shared/Components/Import/Patterns/TileBoard";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Gaming();
  return <QA_E2E_GamingPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Gaming> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_GamingPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <TileBoard config={p.Config} onAction={p.OnAction} onAlert={p.OnAlert} height="calc(100vh - 120px)" />
    </div>
  );
}
