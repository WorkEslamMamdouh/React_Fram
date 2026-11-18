"use client";

import { Demo_KDS } from "./Demo_KDS";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import KitchenDisplay from "../Shared/Components/Import/Patterns/KitchenDisplay";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_KDS();
  return <Demo_KDSPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_KDS> & { Lang: ReturnType<typeof useTranslate> };

function Demo_KDSPage(p: Props) {
  return (
    <div className="p-2 md:p-4">
      <KitchenDisplay
        config={p.Config}
        tickets={p.Tickets}
        station={p.Station}
        onStationChange={p.setStation}
        onStart={p.OnStart}
        onBumpItem={p.OnBumpItem}
        onBumpTicket={p.OnBumpTicket}
        onRecall={p.OnRecall}
        height="calc(100vh - 110px)"
      />
    </div>
  );
}
