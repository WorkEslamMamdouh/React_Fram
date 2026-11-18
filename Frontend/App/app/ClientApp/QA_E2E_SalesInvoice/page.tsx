"use client";

import { QA_E2E_SalesInvoice } from "./QA_E2E_SalesInvoice";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import MasterDetail from "../Shared/Components/Import/MasterDetail";
import CascadingFilterBar from "../Shared/Components/Import/Patterns/CascadingFilterBar";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = QA_E2E_SalesInvoice();
  return <QA_E2E_SalesInvoicePage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof QA_E2E_SalesInvoice> & { Lang: ReturnType<typeof useTranslate> };

function QA_E2E_SalesInvoicePage(p: Props) {
  void p.Lang;
  return (
    <div className="p-2 md:p-3 space-y-2">
      <CascadingFilterBar state={p.Filters} />
      <MasterDetail config={p.Config} />
    </div>
  );
}
