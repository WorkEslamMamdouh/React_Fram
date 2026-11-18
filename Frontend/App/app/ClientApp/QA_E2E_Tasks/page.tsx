"use client";

import { QA_E2E_Tasks } from "./QA_E2E_Tasks";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Kanban from "../Shared/Components/Import/Patterns/Kanban";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Tasks();
  return <QA_E2E_TasksPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Tasks> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_TasksPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <Kanban config={p.Config} onMove={p.OnMove} height="calc(100vh - 120px)" />
    </div>
  );
}
