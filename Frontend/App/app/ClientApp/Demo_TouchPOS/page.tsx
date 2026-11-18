"use client";

import { Demo_TouchPOS } from "./Demo_TouchPOS";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import TouchPOS from "../Shared/Components/Import/Patterns/TouchPOS";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_TouchPOS();
  return <Demo_TouchPOSPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_TouchPOS> & { Lang: ReturnType<typeof useTranslate> };

function Demo_TouchPOSPage(p: Props) {
  return (
    <div className="p-1 md:p-3">
      <TouchPOS
        config={p.Config}
        provider={p.provider}
        onCheckout={p.OnCheckout}
        onDiscountOverLimit={p.OnDiscountOverLimit}
        cartHeader={<div className="text-[12px] text-erp-text-muted">{p.t("Scan barcode 6220000000001, or scale barcode 2112345012507 (1.25 kg cheese)", "امسح باركود 6220000000001، أو باركود ميزان 2112345012507 (1.25 كيلو جبنة)")}</div>}
        height="calc(100vh - 100px)"
      />
    </div>
  );
}
