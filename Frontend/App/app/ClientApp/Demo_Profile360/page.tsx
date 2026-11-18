"use client";

import { Demo_Profile360 } from "./Demo_Profile360";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Profile360 from "../Shared/Components/Import/Patterns/Profile360";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_Profile360();
  return <Demo_Profile360Page {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_Profile360> & { Lang: ReturnType<typeof useTranslate> };

function Demo_Profile360Page(p: Props) {
  return (
    <div className="p-2 md:p-4 space-y-3">
      <div className="flex items-center gap-2 text-[13px] text-erp-text">
        <span className="text-erp-text-muted">{p.t("Patient:", "المريض:")}</span>
        {p.Patients.map((x) => (
          <button key={x.PatientID} type="button" onClick={() => p.setPatientID(x.PatientID)}
            className={`min-h-[36px] px-3 rounded-lg border ${p.PatientID === x.PatientID ? "bg-erp-accent text-white border-erp-accent" : "bg-erp-surface border-erp-border"}`}>
            {p.IsLangEN ? x.NameEn : x.NameAr}
          </button>
        ))}
      </div>
      <Profile360
        key={p.PatientID}
        config={p.Config}
        recordKey={p.PatientID}
        provider={p.provider}
        onAction={p.OnAction}
        onRowClick={p.OnRowClick}
        onAddNote={p.OnAddNote}
      />
    </div>
  );
}
