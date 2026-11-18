"use client";

import { Demo_Scheduler } from "./Demo_Scheduler";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Scheduler from "../Shared/Components/Import/Patterns/Scheduler";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_Scheduler();
  return <Demo_SchedulerPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_Scheduler> & { Lang: ReturnType<typeof useTranslate> };

function Demo_SchedulerPage(p: Props) {
  return (
    <div className="p-2 md:p-4">
      <Scheduler
        config={p.Config}
        provider={p.provider}
        reloadKey={p.ReloadKey}
        onSlotClick={p.OnSlotClick}
        onEventClick={p.OnEventClick}
        onEventMove={p.OnEventMove}
        height="calc(100vh - 120px)"
      />
    </div>
  );
}
