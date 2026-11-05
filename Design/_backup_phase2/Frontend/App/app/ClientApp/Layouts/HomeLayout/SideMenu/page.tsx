"use client"

import { useEffect, useRef, useState } from "react";
import _Styles from "./SideMenu.module.css";
import { SideMenu } from "./SideMenu";
import { useTranslate } from "../../../../ClientApp/Shared/Resources";
import {  } from "antd";
import { useSys } from "../../../Shared/SystemUsing";
import { MenuItemWithState } from "@/app/ClientApp/Shared/Entities";



export default function InitalizeComponent() {
const Lang = useTranslate();
const  IsLangEN  = useSys((s)=> s.IsLangEN);



const stylesheet = IsLangEN ? (
<link id="lang-style_SideMenu" rel="stylesheet" href="/StyleDesign/Layouts/SideMenuEN.css" />
) :  (
<link id="lang-style_SideMenu" rel="stylesheet" href="/StyleDesign/Layouts/SideMenuAR.css" />
) ;



const sidemenu = SideMenu();
return <SideMenuPage {...sidemenu} Lang={Lang} stylesheet ={stylesheet}/>;
}
type _ReturnType = ReturnType<typeof SideMenu>;
type Props = _ReturnType & {
Lang: ReturnType<typeof useTranslate>;
stylesheet : any
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`shrink-0 size-4 text-erp-text-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

const ExternalIcon = () => (
  <svg className="size-3 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

function SideMenuPage(p: Props) {

  const isActive = (item: MenuItemWithState) => !!p.activeModule && item.MODULE_CODE === p.activeModule;

  const Icon = ({ item, size = "size-5" }: { item: MenuItemWithState; size?: string }) => (
    <svg className={`shrink-0 ${size}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.ICON_PATH} />
    </svg>
  );

  // عنصر شاشة (رابط) — expanded = شكل كامل، غير كده أيقونة بس
  const renderScreenItem = (item: MenuItemWithState, expanded: boolean) => {
    const title = p.getTitle(item);
    const active = isActive(item);
    const cls = `erp-focus group relative flex items-center gap-x-3 rounded-lg text-[13px] transition-colors duration-150 ${
      expanded ? "w-full min-h-[40px] md:min-h-[36px] px-3" : "size-10 justify-center"
    } ${
      active
        ? "bg-erp-accent-soft text-erp-accent font-semibold"
        : "text-erp-text-muted hover:bg-erp-surface-2 hover:text-erp-text"
    }`;

    const inner = (
      <>
        <Icon item={item} size={expanded ? "size-4" : "size-5"} />
        {expanded && <span className="flex-1 truncate text-start">{title}</span>}
      </>
    );

    const newTabBtn = expanded && item.PATH ? (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (item.PATH) p.safeOpenUrl(item.PATH, "_blank");
        }}
        className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-erp-surface-3"
        title={p.isRTL ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
      >
        <ExternalIcon />
      </button>
    ) : null;

    if (item.onClick) {
      return (
        <div key={item.MODULE_CODE} className="relative group">
          <button
            onClick={() => { p.handleItemClick(item); p.closeDrawer(); }}
            className={cls}
            title={expanded ? undefined : title}
            aria-current={active ? "page" : undefined}
          >
            {inner}
          </button>
          {newTabBtn}
        </div>
      );
    }

    return (
      <div key={item.MODULE_CODE} className="relative group">
        <a href={item.PATH || "#"} className={cls} title={expanded ? undefined : title} aria-current={active ? "page" : undefined}>
          {inner}
        </a>
        {newTabBtn}
      </div>
    );
  };

  const renderMenuItem = (item: MenuItemWithState, expanded: boolean) => {
    const hasChildren = item.children && item.children.length > 0;
    const isMenuType = item.MODULE_TYPE === "menu";
    if (!isMenuType) return renderScreenItem(item, expanded);

    const title = p.getTitle(item);
    // لو فيه فلتر نفتح كل المجموعات
    const isOpen = p.menuFilter.trim() !== "" || p.openMenus[item.MODULE_CODE] || false;
    const hasActiveChild = !!item.children?.some((c) => isActive(c));

    return (
      <div key={item.MODULE_CODE} className="mt-1 flex flex-col">
        <button
          onClick={() => expanded && p.toggleMenu(item.MODULE_CODE)}
          className={`erp-focus w-full flex items-center justify-between rounded-lg transition-colors duration-150 ${
            expanded ? "min-h-[40px] md:min-h-[36px] px-3" : "size-10 mx-auto justify-center"
          } ${
            hasActiveChild && !isOpen ? "text-erp-accent" : "text-erp-text"
          } hover:bg-erp-surface-2`}
          title={!expanded ? title : undefined}
          aria-expanded={expanded ? isOpen : undefined}
        >
          <span className="flex items-center gap-x-3 min-w-0">
            <Icon item={item} />
            {expanded && <span className="font-semibold text-[13px] truncate">{title}</span>}
          </span>
          {expanded && hasChildren && <ChevronIcon open={isOpen} />}
        </button>

        {expanded && isOpen && hasChildren && (
          <div className="mt-1 ms-4 ps-2 border-s border-erp-border space-y-0.5">
            {item.children?.map((child) => renderMenuItem(child, true))}
          </div>
        )}

        {!expanded && hasChildren && (
          <div className="flex flex-col items-center gap-y-1 mt-1">
            {item.children?.map((child) => renderScreenItem(child, false))}
          </div>
        )}
      </div>
    );
  };

  const SearchIcon = (
    <svg className="shrink-0 size-4 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  // محتوى القايمة (بيتعمل مرتين: مرة للديسكتوب ومرة للدرج)
  const renderBody = (expanded: boolean) => {
    const tree = p.filterTree(p.menuTree, p.menuFilter);
    return (
      <nav className="flex flex-col h-full min-h-0">
        {/* بحث في القوايم */}
        <div className="p-3 pb-2 shrink-0">
          {expanded ? (
            <label className="flex items-center gap-2 h-10 md:h-9 px-3 rounded-lg bg-erp-surface-2 border border-transparent focus-within:border-erp-accent focus-within:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition">
              {SearchIcon}
              <input
                type="text"
                value={p.menuFilter}
                onChange={(e) => p.setMenuFilter(e.target.value)}
                placeholder={p.isRTL ? "بحث في القوائم..." : "Search menus..."}
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-erp-text placeholder:text-erp-text-subtle"
              />
            </label>
          ) : (
            <button
              onClick={p.openSearch}
              className="erp-focus size-10 mx-auto flex items-center justify-center rounded-lg bg-erp-surface-2 hover:bg-erp-surface-3"
              title={p.isRTL ? "بحث" : "Search"}
            >
              {SearchIcon}
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll px-3 pb-3">
          {/* المفضلة — بتظهر بس لو فيه داتا (المرحلة 3) */}
          {expanded && p.favorites.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.04em] text-erp-text-subtle">
                <svg className="size-3.5 text-erp-warning" viewBox="0 0 24 24" fill="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                {p.isRTL ? "المفضلة" : "Favorites"}
              </div>
              <div className="space-y-0.5">
                {p.favorites.map((f) => renderScreenItem(f, true))}
              </div>
              <div className="my-2 border-t border-erp-border" />
            </div>
          )}

          {tree.map((item) => renderMenuItem(item, expanded))}

          {expanded && p.menuFilter.trim() !== "" && tree.length === 0 && (
            <p className="text-center text-[13px] text-erp-text-subtle py-6">
              {p.isRTL ? "لا توجد نتائج" : "No results"}
            </p>
          )}
        </div>
      </nav>
    );
  };

  // شريط التنقل السفلي للموبايل
  const NavBtn = ({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium ${active ? "text-erp-accent" : "text-erp-text-muted"}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );

 return (
    <>
    {p.stylesheet}

      {/* Search Modal (Ctrl+K) */}
      {p.isSearchOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-erp-overlay backdrop-blur-[2px] flex items-start justify-center pt-[12vh] px-4"
          onClick={p.closeSearch}
        >
          <div
            className="w-full max-w-[600px] max-h-[70vh] overflow-hidden rounded-xl bg-erp-surface border border-erp-border shadow-erp-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-erp-border" dir={p.isRTL ? "rtl" : "ltr"}>
              <span className="absolute start-4 top-1/2 -translate-y-1/2">{SearchIcon}</span>
              <input
                ref={p.searchInputRef}
                type="text"
                placeholder={p.isRTL ? "ابحث عن صفحات..." : "Search pages..."}
                className="w-full h-14 ps-11 pe-12 bg-transparent outline-none text-[15px] text-erp-text placeholder:text-erp-text-subtle"
                value={p.searchTerm}
                onChange={(e) => p.handleSearch(e.target.value)}
                autoFocus
              />
              <button
                onClick={p.closeSearch}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-erp-text-subtle hover:bg-erp-surface-2 hover:text-erp-text"
                aria-label="Close search"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {p.searchTerm && (
                <>
                  {p.searchResults.length > 0 ? (
                    <>
                      <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-erp-text-subtle">
                        <span className="num">{p.searchResults.length}</span> {p.isRTL ? "نتيجة" : "results found"}
                      </div>
                      {p.searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-erp-surface-2 transition-colors"
                          onClick={() => {
                            if (result.onClick) {
                              result.onClick();
                              p.closeSearch();
                            } else if (result.path) {
                              const target = result.openInNewTab ? '_blank' : '_self';
                              p.safeOpenUrl(result.path, target);
                              p.closeSearch();
                            }
                          }}
                        >
                          <svg className="shrink-0 size-5 text-erp-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={result.icon} />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-erp-text truncate">
                              {result.title}
                            </div>
                            {result.parentTitle && (
                              <div className="text-xs text-erp-text-muted truncate">
                                {result.parentTitle}
                              </div>
                            )}
                          </div>
                          {result.path && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                p.safeOpenUrl(result.path, '_blank');
                                p.closeSearch();
                              }}
                              className="p-1 hover:bg-erp-surface-3 rounded transition-colors"
                              title={p.isRTL ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
                            >
                              <ExternalIcon />
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 text-erp-text-muted">
                      <svg className="size-12 mx-auto mb-3 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>{p.isRTL ? "لا توجد نتائج مطابقة" : "No matching results"}</p>
                      <p className="text-sm mt-1">{p.isRTL ? "جرب كلمات بحث مختلفة" : "Try different search terms"}</p>
                    </div>
                  )}
                </>
              )}
              {!p.searchTerm && (
                <div className="text-center py-8 text-erp-text-muted">
                  <svg className="size-12 mx-auto mb-3 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>{p.isRTL ? "ابحث عن الصفحات باستخدام Ctrl+K" : "Search pages using Ctrl+K"}</p>
                  <p className="text-sm mt-2">{p.isRTL ? "اكتب للبدء في البحث" : "Type to start searching"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR (md+) : 260px أو 72px */}
      <aside
        id="hs-pro-sidebar"
        aria-label="Sidebar"
        className={`hidden md:flex flex-col fixed top-16 bottom-0 start-0 z-40 bg-erp-surface border-e border-erp-border transition-[width] duration-300 ${
          p.IsOpenMenu ? "w-[260px]" : "w-[72px]"
        }`}
      >
        {renderBody(p.IsOpenMenu)}
        <div className="shrink-0 border-t border-erp-border px-4 py-2 text-[11px] text-erp-text-subtle truncate">
          {p.IsOpenMenu ? "React_Fram ERP" : "ERP"}
        </div>
      </aside>

      {/* MOBILE DRAWER (<md) */}
      {p.isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[90]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-erp-overlay" onClick={p.closeDrawer} />
          <aside
            className={`erp-drawer-in absolute top-0 bottom-0 start-0 w-[280px] max-w-[85vw] bg-erp-surface border-e border-erp-border shadow-erp-4 flex flex-col`}
            style={{ ["--erp-slide-from" as any]: p.isRTL ? "100%" : "-100%" }}
          >
            <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-erp-border">
              <span className="font-bold text-erp-text">{p.isRTL ? "القائمة" : "Menu"}</span>
              <button onClick={p.closeDrawer} className="size-11 flex items-center justify-center rounded-lg hover:bg-erp-surface-2 text-erp-text-muted" aria-label="Close menu">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0">{renderBody(true)}</div>
          </aside>
        </div>
      )}

      {/* MOBILE BOTTOM NAV (<md) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-[80] flex bg-erp-surface border-t border-erp-border pb-[env(safe-area-inset-bottom)]">
        <NavBtn label={p.isRTL ? "الرئيسية" : "Home"} onClick={p.openHome} active={p.activeModule === "Home"}>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </NavBtn>
        <NavBtn label={p.isRTL ? "المفضلة" : "Favorites"} onClick={() => p.setIsDrawerOpen(true)}>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
        </NavBtn>
        <NavBtn label={p.isRTL ? "بحث" : "Search"} onClick={p.openSearch}>
          {SearchIcon && <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        </NavBtn>
        <NavBtn label={p.isRTL ? "القائمة" : "Menu"} onClick={() => p.setIsDrawerOpen(true)}>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </NavBtn>
      </div>
    </>
  );
 }
