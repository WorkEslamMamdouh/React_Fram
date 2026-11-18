"use client";

import { QA_E2E_Floor } from "./QA_E2E_Floor";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import FloorPlan from "../Shared/Components/Import/Patterns/FloorPlan";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_Floor();
  return <QA_E2E_FloorPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_Floor> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_FloorPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <label className="inline-flex items-center gap-2 text-[13px] text-erp-text min-h-[40px]">
        <input type="checkbox" className="size-5" checked={p.EditMode} onChange={(e) => p.setEditMode(e.target.checked)} />
        {p.t("Layout edit mode", "وضع تعديل المخطط")}
      </label>
      <FloorPlan config={p.Config} editable={p.EditMode} onAction={p.OnAction} onMove={p.OnMove} height="calc(100vh - 160px)" />
    </div>
  );
}
