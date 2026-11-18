"use client";

import type { AuthMode } from "../Shared/AdminHttp";

// =====================================================================================
//  ExternalApisAdminView.tsx  -  الشكل بس (اللوجيك في Sys_ExternalApisAdmin.ts)
//  كروت لكل API: تفعيل/إيقاف بضغطة، مفتاح، تجربة اتصال. erp-* tokens، عربي/إنجليزي، موبايل.
// =====================================================================================

import { Sys_ExternalApisAdmin, ApiCard, CATEGORIES } from "./Sys_ExternalApisAdmin";
import { Badge, btnAccent, btnOutline, btnDanger, inputCls } from "../Sys_UsersAdmin/AdminUi";

/** mode: "jwt" = داخل الـ ERP (HomeLayout + صلاحيات المستخدم) | "admin" = منطقة الأدمن (AdminLayout + توكن الأدمن) */
export default function ExternalApisAdminView({ mode = "jwt" }: { mode?: AuthMode }) {
  const p = Sys_ExternalApisAdmin(mode);
  return <Sys_ExternalApisAdminPage {...p} />;
}

type Props = ReturnType<typeof Sys_ExternalApisAdmin>;

function fmtTime(s: string | null, en: boolean) {
  if (!s) return "";
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");
  return isNaN(d.getTime()) ? "" : d.toLocaleString(en ? "en-GB" : "ar-EG");
}

function Switch({ on, disabled, busy, label, onClick }: { on: boolean; disabled?: boolean; busy?: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={label} disabled={disabled || busy} onClick={onClick}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-erp-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-md:h-8 max-md:w-14 ${on ? "justify-end border-erp-accent bg-erp-accent" : "justify-start border-erp-border-strong bg-erp-surface-3"}`}>
      <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow max-md:h-6 max-md:w-6 ${busy ? "animate-pulse" : ""}`} />
    </button>
  );
}

function Sys_ExternalApisAdminPage(p: Props) {
  const t = p.t;
  const name = (a: ApiCard) => (p.IsLangEN ? a.nameE : a.nameA);
  const desc = (a: ApiCard) => (p.IsLangEN ? a.descE : a.descA);
  const note = (a: ApiCard) => (p.IsLangEN ? a.noteE : a.noteA);

  const card = (a: ApiCard) => {
    const b = p.busy[a.code];
    const needKey = a.requiresKey;
    const testBadge = a.lastTestAt
      ? (a.lastTestOk ? <Badge tone="success">{t("Test OK", "التجربة نجحت")} · {a.lastTestMs} ms</Badge> : <Badge tone="danger">{t("Test failed", "التجربة فشلت")}</Badge>)
      : <Badge tone="muted">{t("Not tested", "لم تُجرَّب")}</Badge>;

    return (
      <div key={a.code} className="flex flex-col gap-3 rounded-xl border border-erp-border bg-erp-surface p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-accent-soft text-erp-accent">
            <i className={`fa-solid ${a.icon}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-erp-text">{name(a)}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {a.enabled ? <Badge tone="success">{t("Enabled", "مفعّلة")}</Badge> : <Badge tone="muted">{t("Disabled", "متوقفة")}</Badge>}
              {needKey ? <Badge tone="warning">{t("Needs key", "تحتاج مفتاح")}</Badge> : <Badge tone="info">{t("No key", "بدون مفتاح")}</Badge>}
            </div>
          </div>
          <Switch on={a.enabled} busy={b === "toggle"} disabled={!p.canWrite}
            label={a.enabled ? t("Disable", "إيقاف") : t("Enable", "تفعيل")} onClick={() => p.Toggle(a)} />
        </div>

        <p className="text-[13px] leading-relaxed text-erp-text-muted">{desc(a)}</p>
        {note(a) && <p className="text-[12px] text-erp-warning-text"><i className="fa-solid fa-circle-info me-1" aria-hidden="true" />{note(a)}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-erp-text-subtle">
          <span>{t("Limit", "الحد")}: <span className="num">{a.rateLimitPerMin}</span>/{t("min", "دقيقة")}</span>
          <span>{t("Cache", "كاش")}: <span className="num">{a.cacheMinutes}</span> {t("min", "دقيقة")}</span>
          <span>{t("Operations", "العمليات")}: <span dir="ltr">{a.ops.map((o) => o.name).join(", ")}</span></span>
        </div>

        {needKey && (
          <div className="space-y-2">
            <div className="text-[12px] text-erp-text-muted">
              {t("API key", "مفتاح الـ API")}: {a.hasKey ? <span className="num font-semibold text-erp-text" dir="ltr">{a.keyMasked}</span> : <span className="text-erp-danger-text">{t("not set", "غير محفوظ")}</span>}
            </div>
            {p.canWrite && (
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <input dir="ltr" className={inputCls + " pe-10"} type={p.showKey[a.code] ? "text" : "password"} autoComplete="off" spellCheck={false}
                    value={p.keyInputs[a.code] || ""} placeholder={a.hasKey ? t("Enter a new key to replace", "اكتب مفتاح جديد للاستبدال") : t("Paste the API key", "الصق المفتاح هنا")}
                    aria-label={t("API key", "مفتاح الـ API")}
                    onChange={(e) => p.setKeyInputs((k) => ({ ...k, [a.code]: e.target.value }))} />
                  <button type="button" className="absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-erp-text-muted end-1" aria-label={t("Show / hide", "إظهار / إخفاء")}
                    onClick={() => p.setShowKey((s) => ({ ...s, [a.code]: !s[a.code] }))}>
                    <i className={`fa-solid ${p.showKey[a.code] ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                  </button>
                </div>
                <button type="button" className={btnAccent} disabled={b === "key"} onClick={() => p.SaveKey(a)}>
                  <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {t("Save key", "حفظ المفتاح")}
                </button>
                {a.hasKey && (
                  <button type="button" className={btnDanger} disabled={b === "key"} onClick={() => p.SaveKey(a, true)} title={t("Remove key (also disables)", "مسح المفتاح (وبيوقف الخدمة)")}>
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-erp-border pt-3">
          {testBadge}
          {a.lastTestAt && <span className="text-[11px] text-erp-text-subtle">{fmtTime(a.lastTestAt, p.IsLangEN)}</span>}
          <div className="ms-auto flex items-center gap-2">
            <a href={a.docsUrl} target="_blank" rel="noopener noreferrer" className={btnOutline} title={t("Documentation", "التوثيق")}>
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> {t("Docs", "التوثيق")}
            </a>
            {p.canWrite && (
              <button type="button" className={btnOutline} disabled={b === "test" || (needKey && !a.hasKey)} onClick={() => p.Test(a)}>
                <i className={`fa-solid ${b === "test" ? "fa-spinner fa-spin" : "fa-plug"}`} aria-hidden="true" /> {t("Test connection", "جرّب الاتصال")}
              </button>
            )}
          </div>
        </div>
        {a.lastTestAt && !a.lastTestOk && a.lastTestMsg && (
          <p className="rounded-lg border border-erp-danger-border bg-erp-danger-bg px-3 py-2 text-[12px] text-erp-danger-text">{p.IsLangEN ? a.lastTestMsg.split(" / ")[0] : a.lastTestMsg.split(" / ").slice(-1)[0]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-erp-text md:text-[28px]">{t("External APIs", "الخدمات الخارجية (APIs)")}</h1>
          <p className="text-[13px] text-erp-text-muted">
            {t("Free public services the system can use (exchange rates, holidays, validation, barcode, maps). Enable what you need with one click.",
               "خدمات مجانية يقدر النظام يستخدمها (أسعار الصرف، الإجازات، التحقق، الباركود، الخرائط). فعّل اللي محتاجه بضغطة واحدة.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{t("Enabled", "مفعّلة")}: <span className="num ms-1">{p.counts.enabled}/{p.counts.total}</span></Badge>
          <button type="button" className={btnOutline} onClick={p.Load} disabled={p.loading}>
            <i className={`fa-solid fa-rotate ${p.loading ? "fa-spin" : ""}`} aria-hidden="true" /> {t("Refresh", "تحديث")}
          </button>
        </div>
      </div>

      {!p.loading && !p.loadError && !p.canWrite && (
        <div className="rounded-lg border border-erp-warning-border bg-erp-warning-bg px-3 py-2 text-[13px] text-erp-warning-text">
          {t("Read-only: you can view but not change the settings.", "عرض فقط: تقدر تشوف الإعدادات من غير تعديل.")}
        </div>
      )}
      {p.storage === "json" && !p.loading && !p.loadError && (
        <div className="rounded-lg border border-erp-border bg-erp-surface-2 px-3 py-2 text-[12px] text-erp-text-muted">
          {t("Settings are stored in Backend/App_Data/external-apis.json. Run Database/Phase9_ExternalApis.sql to store them in the database.",
             "الإعدادات محفوظة في ملف Backend/App_Data/external-apis.json. شغّل Database/Phase9_ExternalApis.sql لحفظها في القاعدة.")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-3">
        <div className="relative min-w-[200px] flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 -translate-y-1/2 text-erp-text-subtle start-3" aria-hidden="true" />
          <input className={inputCls + " ps-9"} value={p.search} onChange={(e) => p.setSearch(e.target.value)}
            placeholder={t("Search services...", "ابحث في الخدمات...")} aria-label={t("Search services", "بحث الخدمات")} />
        </div>
        <select className={inputCls + " md:max-w-[240px]"} value={p.category} onChange={(e) => p.setCategory(e.target.value)} aria-label={t("Category", "القسم")}>
          <option value="all">{t("All categories", "كل الأقسام")}</option>
          {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{p.IsLangEN ? c.en : c.ar}</option>)}
        </select>
      </div>

      {p.loadError && (
        <div className="rounded-lg border border-erp-danger-border bg-erp-danger-bg px-3 py-3 text-[13px] text-erp-danger-text">
          {p.loadError} <button type="button" className="ms-2 underline" onClick={p.Load}>{t("Retry", "إعادة المحاولة")}</button>
        </div>
      )}
      {p.loading && !p.apis.length && <div className="py-10 text-center text-erp-text-muted"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {t("Loading...", "جاري التحميل...")}</div>}
      {!p.loading && !p.loadError && p.groups.length === 0 && <div className="py-10 text-center text-erp-text-muted">{t("No services match your search.", "لا توجد خدمات مطابقة للبحث.")}</div>}

      {p.groups.map((g) => (
        <section key={g.code} className="space-y-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-erp-text">
            <i className={`fa-solid ${g.icon} text-erp-accent`} aria-hidden="true" /> {p.IsLangEN ? g.en : g.ar}
            <span className="num text-[12px] font-normal text-erp-text-subtle">({g.items.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">{g.items.map(card)}</div>
        </section>
      ))}
    </div>
  );
}
