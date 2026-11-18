"use client";

import { QA_E2E_Customer360 } from "./QA_E2E_Customer360";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Profile360 from "../Shared/Components/Import/Patterns/Profile360";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Customer360();
  return <QA_E2E_Customer360Page {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Customer360> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_Customer360Page(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <Profile360 config={p.Config} recordKey={p.RecordKey} onAction={p.OnAction} />
    </div>
  );
}
