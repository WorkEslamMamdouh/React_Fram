"use client";

import { Demo_FloorPlan } from "./Demo_FloorPlan";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import FloorPlan from "../Shared/Components/Import/Patterns/FloorPlan";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_FloorPlan();
  return <Demo_FloorPlanPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_FloorPlan> & { Lang: ReturnType<typeof useTranslate> };

function Demo_FloorPlanPage(p: Props) {
  return (
    <div className="p-2 md:p-4 space-y-2">
      <label className="inline-flex items-center gap-2 text-[13px] text-erp-text min-h-[40px]">
        <input type="checkbox" className="size-5" checked={p.EditMode} onChange={(e) => p.setEditMode(e.target.checked)} />
        {p.t("Layout edit mode (drag tables)", "وضع تعديل المخطط (اسحب الترابيزات)")}
      </label>
      <FloorPlan
        config={p.Config}
        rows={p.Tables}
        editable={p.EditMode}
        onAction={p.OnAction}
        onMove={p.OnMove}
        height="calc(100vh - 160px)"
      />
    </div>
  );
}
