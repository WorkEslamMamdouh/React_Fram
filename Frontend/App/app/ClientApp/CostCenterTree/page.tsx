"use client";

import { CostCenterTree } from "./CostCenterTree";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import TreeScreen from "../Shared/Components/Import/TreeScreen";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_CostCenterTree" rel="stylesheet" href="/StyleDesign/Pages/CostCenterTree/CostCenterTreeEN.css" />
  ) : (
    <link id="lang-style_CostCenterTree" rel="stylesheet" href="/StyleDesign/Pages/CostCenterTree/CostCenterTreeAR.css" />
  );

  const page = CostCenterTree();
  return <CostCenterTreePage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof CostCenterTree>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function CostCenterTreePage(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-4 space-y-4">
        <div className={`rounded-2xl border shadow-xl backdrop-blur-xl p-4 md:p-5 flex items-center gap-3 ${card}`}>
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
            <i className="fa-solid fa-sitemap"></i>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold truncate">{L.costCenterTree_title}</h1>
            <p className={`text-sm ${muted}`}>{L.costCenterTree_subtitle}</p>
          </div>
        </div>

        <TreeScreen config={p.Config} />
      </div>
    </>
  );
}
