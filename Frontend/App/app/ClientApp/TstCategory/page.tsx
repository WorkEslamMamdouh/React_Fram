"use client";

import { TstCategory } from "./TstCategory";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import TreeScreen from "../Shared/Components/Import/TreeScreen";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_TstCategory" rel="stylesheet" href="/StyleDesign/Pages/TstCategory/TstCategoryEN.css" />
  ) : (
    <link id="lang-style_TstCategory" rel="stylesheet" href="/StyleDesign/Pages/TstCategory/TstCategoryAR.css" />
  );

  const page = TstCategory();
  return <TstCategoryPage {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof TstCategory>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function TstCategoryPage(p: Props) {
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
