"use client";

import { QA_E2E_POS } from "./QA_E2E_POS";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import TouchPOS from "../Shared/Components/Import/Patterns/TouchPOS";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_POS();
  return <QA_E2E_POSPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_POS> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_POSPage(p: Props) {
  void p.Lang;
  return (
    <div className="p-1 md:p-3 space-y-2">
      <TouchPOS config={p.Config} onCheckout={p.OnCheckout} onDiscountOverLimit={p.OnDiscountOverLimit} height="calc(100vh - 100px)" />
    </div>
  );
}
