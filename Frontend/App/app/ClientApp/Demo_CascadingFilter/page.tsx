/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Demo_CascadingFilter } from "./Demo_CascadingFilter";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import CascadingFilterBar from "../Shared/Components/Import/Patterns/CascadingFilterBar";
import { InfiniteSentinel, PagerBar, VirtualList, cardClass, fmtNumber } from "../Shared/Components/Import/Patterns/patternKit";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const page = Demo_CascadingFilter();
  return <Demo_CascadingFilterPage {...page} Lang={Lang} />;
}

type Props = ReturnType<typeof Demo_CascadingFilter> & { Lang: ReturnType<typeof useTranslate> };

function Demo_CascadingFilterPage(p: Props) {
  const { t, List } = p;
  return (
    <div className="p-2 md:p-4 space-y-3 text-erp-text" dir={p.IsLangEN ? "ltr" : "rtl"}>
      <div className={`${cardClass} overflow-hidden`}>
        <div className="px-4 pt-3 font-semibold">{t("Cascading filters (Category → Type → Item)", "فلاتر متتالية (الفئة ← النوع ← الصنف)")}</div>
        <CascadingFilterBar state={p.Filters} resultCount={List.total} />
        <div className="px-4 py-2 text-[12px] text-erp-text-muted break-all">
          {t("Condition sent to DynamicGrid:", "الشرط اللي بيتبعت لـ DynamicGrid:")} <code className="num">{p.GridCondition}</code>
        </div>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-erp-border">
          <span className="text-sm font-medium">{t("Items", "الأصناف")}</span>
          <div className="inline-flex rounded-lg border border-erp-border overflow-hidden text-[12px]" role="group">
            {(["infinite", "pages"] as const).map((m) => (
              <button key={m} type="button" onClick={() => p.setMode(m)} aria-pressed={p.Mode === m}
                className={`px-3 min-h-[36px] ${p.Mode === m ? "bg-erp-accent text-white" : "bg-erp-surface text-erp-text-muted"}`}>
                {m === "infinite" ? t("Infinite scroll", "تحميل مع السكرول") : t("Pages", "صفحات")}
              </button>
            ))}
          </div>
        </div>
        <VirtualList
          items={List.rows as any[]}
          itemHeight={52}
          height="calc(100vh - 360px)"
          onEndReached={p.Mode === "infinite" ? List.loadMore : undefined}
          renderItem={(r: any) => (
            <div className="h-full flex items-center justify-between gap-2 px-3 border-b border-erp-border text-[13px]">
              <span className="truncate"><span className="num text-erp-text-subtle me-2">#{r.ItemID}</span>{p.IsLangEN ? r.NameEn : r.NameAr}</span>
              <span className="flex items-center gap-2 shrink-0">
                {!r.IsActive && <span className="text-[11px] text-erp-danger">{t("Inactive", "موقوف")}</span>}
                <span className="num font-semibold">{fmtNumber(r.Price)}</span>
              </span>
            </div>
          )}
          footer={<InfiniteSentinel data={List} />}
        />
        {List.loading && <div className="py-2 text-center text-xs text-erp-text-muted">{t("Loading...", "جاري التحميل...")}</div>}
        <PagerBar data={List} />
      </div>
    </div>
  );
}
