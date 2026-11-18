"use client";

// =====================================================================================
//  Admin/page.tsx  -  لوحة الأدمن (AdminLayout + توكن الأدمن)
//  كروت وروابط لكل أدوات صاحب النظام: بناء الشاشات، التقارير وتصميمها، المستخدمين والصلاحيات (كل الشركات)، الخدمات الخارجية.
// =====================================================================================

import Link from "next/link";
import AdminShell from "../Layouts/AdminShell";
import { useSys } from "../Shared/SystemUsing";

interface Card { href: string; icon: string; en: string; ar: string; descEn: string; descAr: string }

const GROUPS: { en: string; ar: string; cards: Card[] }[] = [
  {
    en: "Screens & reports", ar: "الشاشات والتقارير",
    cards: [
      { href: "/ClientApp/ScreenBuilder", icon: "fa-wand-magic-sparkles", en: "ScreenBuilder", ar: "بناء الشاشات",
        descEn: "Design and generate screens. Report design buttons are in the Print & Excel tab.", descAr: "صمّم وولّد الشاشات. أزرار تصميم التقارير في تاب الطباعة والإكسل." },
      { href: "/ClientApp/AdminReports", icon: "fa-print", en: "Reports & report designer", ar: "التقارير ومصمم التقارير",
        descEn: "All reports, their layouts per company / branch, and the Stimulsoft designer.", descAr: "كل التقارير وتصاميمها لكل شركة / فرع، ومصمم Stimulsoft." },
    ],
  },
  {
    en: "Users & permissions (all companies)", ar: "المستخدمين والصلاحيات (كل الشركات)",
    cards: [
      { href: "/ClientApp/AdminUsers", icon: "fa-users", en: "Users", ar: "المستخدمين",
        descEn: "Add / edit / deactivate users, reset passwords, assign company, branch and role.", descAr: "إضافة وتعديل وتعطيل المستخدمين، تغيير كلمة السر، إسناد الشركة والفرع والدور." },
      { href: "/ClientApp/AdminRoles", icon: "fa-user-shield", en: "Roles & permission matrix", ar: "الأدوار وجدول الصلاحيات",
        descEn: "Create roles and set what each role can do on every screen.", descAr: "إنشاء الأدوار وتحديد ما يقدر كل دور يعمله في كل شاشة." },
      { href: "/ClientApp/AdminUserPerms", icon: "fa-user-lock", en: "Per-user overrides", ar: "صلاحيات خاصة بمستخدم",
        descEn: "Override role permissions for one user in a company / branch.", descAr: "استثناء من صلاحيات الدور لمستخدم واحد في شركة / فرع." },
    ],
  },
  {
    en: "Integrations", ar: "التكاملات",
    cards: [
      { href: "/ClientApp/AdminExternalApis", icon: "fa-plug", en: "External APIs", ar: "الخدمات الخارجية",
        descEn: "Enable services, save API keys and test the connection.", descAr: "تفعيل الخدمات وحفظ مفاتيح الـ API وتجربة الاتصال." },
    ],
  },
];

export default function InitalizeComponent() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  return (
    <AdminShell>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-[22px] font-bold text-erp-text md:text-[28px]">{t("Admin dashboard", "لوحة الأدمن")}</h1>
          <p className="text-[13px] text-erp-text-muted">
            {t("You manage screens, reports and every user in every company and branch from here.", "من هنا بتتحكم في الشاشات والتقارير وكل المستخدمين في كل الشركات والفروع.")}
          </p>
        </div>

        {GROUPS.map((g) => (
          <section key={g.en} aria-label={IsLangEN ? g.en : g.ar} className="space-y-3">
            <h2 className="text-[18px] font-semibold text-erp-text">{IsLangEN ? g.en : g.ar}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {g.cards.map((c) => (
                <Link key={c.href} href={c.href}
                  className="group flex min-h-[44px] items-start gap-3 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-sm transition-colors hover:border-erp-accent hover:bg-erp-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-erp-accent">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-accent-soft text-erp-accent"><i className={`fa-solid ${c.icon}`} aria-hidden="true" /></span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-erp-text">{IsLangEN ? c.en : c.ar}</span>
                    <span className="mt-1 block text-[13px] text-erp-text-muted">{IsLangEN ? c.descEn : c.descAr}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
