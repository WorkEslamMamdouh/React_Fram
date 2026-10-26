"use client";

// =====================================================================================
//  📄 page.tsx   ←  ملف الشكل (HTML) بس — شاشة فواتير المبيعات
//  كل حاجة جاية من SalesInvoice.ts عن طريق p.   والشغل كله في <MasterDetail />
// =====================================================================================

import { SalesInvoice } from "./SalesInvoice";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import MasterDetail from "../Shared/Components/Import/MasterDetail";

// =======================
// نقطة البداية (نفس شاشة Login)
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
// الشاشة
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
        {/* ============ العنوان ============ */}
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex items-center gap-3 ${card}`}>
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold truncate">{L.SalesInvoice_title}</h1>
            <p className={`text-sm ${muted}`}>{L.SalesInvoice_subtitle}</p>
          </div>
        </div>

        {/* ============ الماستر ديتيل (القائمة + الفورم) ============ */}
        <MasterDetail config={p.Config} />
      </div>
    </>
  );
}
