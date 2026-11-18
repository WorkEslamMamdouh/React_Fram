"use client";

import { Demo_Wizard } from "./Demo_Wizard";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import Wizard from "../Shared/Components/Import/Patterns/Wizard";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_Wizard();
  return <Demo_WizardPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_Wizard> & { Lang: ReturnType<typeof useTranslate> };

function Demo_WizardPage(p: Props) {
  return (
    <div className="p-2 md:p-4 max-w-4xl mx-auto">
      <Wizard config={p.Config} onFinish={p.OnFinish} initialValues={{ StartDate: new Date().toISOString().substring(0, 10) }} />
    </div>
  );
}
