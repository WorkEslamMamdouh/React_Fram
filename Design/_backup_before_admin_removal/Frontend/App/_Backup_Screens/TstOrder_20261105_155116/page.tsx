"use client";

import { TstOrder } from "./TstOrder";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import MasterDetail from "../Shared/Components/Import/MasterDetail";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_TstOrder" rel="stylesheet" href="/StyleDesign/Pages/TstOrder/TstOrderEN.css" />
  ) : (
    <link id="lang-style_TstOrder" rel="stylesheet" href="/StyleDesign/Pages/TstOrder/TstOrderAR.css" />
  );

  const page = TstOrder();
  return <TstOrderPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof TstOrder>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function TstOrderPage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  void p.IsLangEN;
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";



  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-3 space-y-2">


        {p.filterReady && <MasterDetail key={p.gridKey} config={p.Config} />}
      </div>
    </>
  );
}
