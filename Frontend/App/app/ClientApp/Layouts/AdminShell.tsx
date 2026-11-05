"use client";

// =====================================================================================
//  AdminShell.tsx  -  إطار صفحات منطقة الأدمن (داخل AdminLayout، بتوكن الأدمن)
//  شريط علوي (روابط الأدمن + اللغة + الوضع الغامق + خروج) + منطقة محتوى بتسكرول لوحدها.
//  بيستخدم erp-* tokens بس (DESIGN.md).
// =====================================================================================

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSys } from "../Shared/SystemUsing";
import { adminLogout } from "../Shared/AdminHttp";

export interface AdminNavItem { href: string; icon: string; en: string; ar: string }

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/ClientApp/Admin", icon: "fa-gauge-high", en: "Admin home", ar: "لوحة الأدمن" },
  { href: "/ClientApp/ScreenBuilder", icon: "fa-wand-magic-sparkles", en: "ScreenBuilder", ar: "بناء الشاشات" },
  { href: "/ClientApp/AdminReports", icon: "fa-print", en: "Reports", ar: "التقارير" },
  { href: "/ClientApp/AdminUsers", icon: "fa-users", en: "Users", ar: "المستخدمين" },
  { href: "/ClientApp/AdminRoles", icon: "fa-user-shield", en: "Roles & permissions", ar: "الأدوار والصلاحيات" },
  { href: "/ClientApp/AdminUserPerms", icon: "fa-user-lock", en: "User overrides", ar: "صلاحيات خاصة" },
  { href: "/ClientApp/AdminExternalApis", icon: "fa-plug", en: "External APIs", ar: "الخدمات الخارجية" },
];

export default function AdminShell({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const toggleLang = useSys((s) => s.toggleLang);
  const toggleModDark = useSys((s) => s.toggleModDark);
  const pathname = usePathname() || "";
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  // الوضع الغامق (الـ Navbar بتاع الـ ERP مش موجود هنا)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", !!IsDark);
  }, [IsDark]);

  const isActive = (href: string) => pathname.replace(/\/$/, "") === href;

  return (
    <div className="flex h-full w-full flex-col bg-erp-canvas text-erp-text" dir={IsLangEN ? "ltr" : "rtl"}>
      <header className="shrink-0 border-b border-erp-border bg-erp-surface">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 md:px-6">
          <Link href="/ClientApp/Admin" className="flex items-center gap-2 text-[15px] font-semibold text-erp-text">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-accent text-white"><i className="fa-solid fa-user-shield" aria-hidden="true" /></span>
            {t("Admin area", "منطقة الأدمن")}
          </Link>
          <div className="ms-auto flex items-center gap-1">
            <button type="button" onClick={() => toggleLang()} className="h-9 rounded-lg px-3 text-[13px] text-erp-text-muted hover:bg-erp-surface-2 max-md:h-11" aria-label={t("Switch language", "تغيير اللغة")}>
              {IsLangEN ? "عربي" : "EN"}
            </button>
            <button type="button" onClick={() => toggleModDark()} className="flex h-9 w-9 items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-2 max-md:h-11 max-md:w-11" aria-label={t("Dark mode", "الوضع الغامق")}>
              <i className={IsDark ? "fa-solid fa-sun" : "fa-solid fa-moon"} aria-hidden="true" />
            </button>
            <button type="button" onClick={adminLogout} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-erp-danger-text hover:bg-erp-danger-bg max-md:h-11" aria-label={t("Logout", "خروج")}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> <span className="max-md:hidden">{t("Logout", "خروج")}</span>
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:px-6" aria-label={t("Admin navigation", "تنقل الأدمن")}>
          {ADMIN_NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors max-md:h-11 ${isActive(n.href) ? "bg-erp-accent-soft text-erp-accent" : "text-erp-text-muted hover:bg-erp-surface-2"}`}>
              <i className={`fa-solid ${n.icon}`} aria-hidden="true" /> {IsLangEN ? n.en : n.ar}
            </Link>
          ))}
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {(title || subtitle) && (
          <div className="px-4 pt-4 md:px-6">
            {title && <h1 className="text-[22px] font-bold md:text-[28px]">{title}</h1>}
            {subtitle && <p className="text-[13px] text-erp-text-muted">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
