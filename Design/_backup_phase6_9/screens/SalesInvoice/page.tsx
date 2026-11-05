"use client";

// =====================================================================================
//  ðŸ“„ page.tsx   â†  Ù…Ù„Ù Ø§Ù„Ø´ÙƒÙ„ (HTML) Ø¨Ø³ â€” Ø´Ø§Ø´Ø© ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª
//  Ø§ØªØ¹Ù…Ù„ Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒ Ù…Ù† Ø¨Ø±Ù†Ø§Ù…Ø¬ CreatePageReact â€” ÙƒÙ„ Ø­Ø§Ø¬Ø© Ø¬Ø§ÙŠØ© Ù…Ù† SalesInvoice.ts Ø¹Ù† Ø·Ø±ÙŠÙ‚ p.
//  ÙˆØ§Ù„Ø´ØºÙ„ ÙƒÙ„Ù‡ (Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© + Ø§Ù„ÙÙˆØ±Ù… + Ø§Ù„ØªÙØ§ØµÙŠÙ„ + Ø§Ù„Ø­ÙØ¸) ÙÙŠ <MasterDetail />
// =====================================================================================

import { SalesInvoice } from "./SalesInvoice";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import MasterDetail from "../Shared/Components/Import/MasterDetail";

// =======================
// Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© (Ù†ÙØ³ Ø´Ø§Ø´Ø© Login)
// =======================
export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_SalesInvoice" rel="stylesheet" href="/StyleDesign/Pages/SalesInvoice/SalesInvoiceEN.css" />
  ) : (
    <link id="lang-style_SalesInvoice" rel="stylesheet" href="/StyleDesign/Pages/SalesInvoice/SalesInvoiceAR.css" />
  );

  const page = SalesInvoice();

  return <SalesInvoicePage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof SalesInvoice>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

// =======================
// Ø§Ù„Ø´Ø§Ø´Ø©
// =======================
function SalesInvoicePage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;

  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";

  return (
    <>
      {p.stylesheet}

      <div className="p-2 md:p-4 space-y-4">


        <MasterDetail config={p.Config} />
      </div>
    </>
  );
}
