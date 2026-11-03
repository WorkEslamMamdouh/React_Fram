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
        <TreeScreen config={p.Config} />
      </div>
    </>
  );
}
