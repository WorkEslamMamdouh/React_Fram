"use client";

import { QA_E2E_MemberWizard } from "./QA_E2E_MemberWizard";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Wizard from "../Shared/Components/Import/Patterns/Wizard";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_MemberWizard();
  return <QA_E2E_MemberWizardPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_MemberWizard> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_MemberWizardPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <Wizard config={p.Config} onFinish={p.OnFinish} />
    </div>
  );
}
