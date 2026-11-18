"use client";

import { Demo_TileBoard } from "./Demo_TileBoard";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import TileBoard from "../Shared/Components/Import/Patterns/TileBoard";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_TileBoard();
  return <Demo_TileBoardPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_TileBoard> & { Lang: ReturnType<typeof useTranslate> };

function Demo_TileBoardPage(p: Props) {
  return (
    <div className="p-2 md:p-4">
      <TileBoard config={p.Config} rows={p.Devices} onAction={p.OnAction} onAlert={p.OnAlert} height="calc(100vh - 120px)" />
    </div>
  );
}
