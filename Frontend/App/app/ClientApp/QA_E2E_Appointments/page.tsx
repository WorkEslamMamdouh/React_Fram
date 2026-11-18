"use client";

import { QA_E2E_Appointments } from "./QA_E2E_Appointments";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Scheduler from "../Shared/Components/Import/Patterns/Scheduler";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Appointments();
  return <QA_E2E_AppointmentsPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Appointments> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_AppointmentsPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <Scheduler config={p.Config} reloadKey={p.ReloadKey} onSlotClick={p.OnSlotClick} onEventClick={p.OnEventClick} onEventMove={p.OnEventMove} height="calc(100vh - 120px)" />
    </div>
  );
}
