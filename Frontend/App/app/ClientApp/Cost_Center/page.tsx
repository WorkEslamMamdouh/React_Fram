"use client";

import { Cost_Center } from "./Cost_Center";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import TreeScreen from "../Shared/Components/Import/TreeScreen";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_Cost_Center" rel="stylesheet" href="/StyleDesign/Pages/Cost_Center/Cost_CenterEN.css" />
  ) : (
    <link id="lang-style_Cost_Center" rel="stylesheet" href="/StyleDesign/Pages/Cost_Center/Cost_CenterAR.css" />
  );

  const page = Cost_Center();
  return <Cost_CenterPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof Cost_Center>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function Cost_CenterPage(p: Props) {
  void p.Lang; void p.IsDark;
  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-3">
        <TreeScreen config={p.Config} />
      </div>
    </>
  );
}
