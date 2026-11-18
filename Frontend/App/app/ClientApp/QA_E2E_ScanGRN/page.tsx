"use client";

import { QA_E2E_ScanGRN } from "./QA_E2E_ScanGRN";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import ScanTask from "../Shared/Components/Import/Patterns/ScanTask";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_ScanGRN();
  return <QA_E2E_ScanGRNPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_ScanGRN> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_ScanGRNPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <ScanTask config={p.Config} onComplete={p.OnComplete} />
    </div>
  );
}
