"use client";

import { Demo_Kanban } from "./Demo_Kanban";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Kanban from "../Shared/Components/Import/Patterns/Kanban";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_Kanban();
  return <Demo_KanbanPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_Kanban> & { Lang: ReturnType<typeof useTranslate> };

function Demo_KanbanPage(p: Props) {
  return (
    <div className="p-2 md:p-4">
      <Kanban config={p.Config} provider={p.provider} onMove={p.OnMove} onCardClick={p.OnCardClick} height="calc(100vh - 120px)" />
    </div>
  );
}
