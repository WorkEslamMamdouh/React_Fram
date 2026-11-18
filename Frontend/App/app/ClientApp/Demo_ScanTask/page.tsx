"use client";

import { Demo_ScanTask } from "./Demo_ScanTask";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import ScanTask from "../Shared/Components/Import/Patterns/ScanTask";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_ScanTask();
  return <Demo_ScanTaskPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_ScanTask> & { Lang: ReturnType<typeof useTranslate> };

function Demo_ScanTaskPage(p: Props) {
  return (
    <div className="p-2 md:p-4 space-y-3">
      <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2 text-[12px] text-erp-text">
        {(["expected", "blind"] as const).map((m) => (
          <button key={m} type="button" onClick={() => p.setMode(m)}
            className={`min-h-[40px] px-3 rounded-lg border ${p.Mode === m ? "bg-erp-accent text-white border-erp-accent" : "bg-erp-surface border-erp-border"}`}>
            {m === "expected" ? p.t("Receiving (expected)", "استلام (بقايمة)") : p.t("Blind count", "جرد أعمى")}
          </button>
        ))}
        <span className="text-erp-text-muted">{p.t("Try typing:", "جرّب تكتب:")}</span>
        {p.Samples.map((s) => <code key={s} className="num px-1.5 py-0.5 rounded bg-erp-surface-2 select-all" dir="ltr">{s}</code>)}
      </div>
      <ScanTask key={p.Mode} config={p.Config} lines={p.Mode === "expected" ? p.Lines : undefined} onLookup={p.OnLookup} onComplete={p.OnComplete} />
    </div>
  );
}
