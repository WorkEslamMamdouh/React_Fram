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

function SideMenuPage(p: Props) {

 
    
  const renderMenuItem = (item: MenuItemWithState, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isMenuType = item.MODULE_TYPE === 'menu';
    const title = p.getTitle(item);
    const isOpen = p.openMenus[item.MODULE_CODE] || false; 
    
    if (isMenuType) {
      return (
        <div key={item.MODULE_CODE} className="mt-2 flex flex-col">
          <button
            onClick={() => p.IsOpenMenu && p.toggleMenu(item.MODULE_CODE)}
            className={`menu-item w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-all duration-200 group ${
              isOpen ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30' : 'hover:bg-gray-100 dark:hover:bg-neutral-800'
            } ${!p.IsOpenMenu ? 'lg:justify-center' : ''}`}
            title={!p.IsOpenMenu ? title : ""}
          >
            <div className="flex items-center gap-x-3">
              <svg className={`shrink-0 size-5 ${item.COLOR}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.ICON_PATH} />
              </svg>
              <span className={`font-medium text-sm transition-opacity duration-300 ${!p.IsOpenMenu ? 'lg:hidden' : ''} text-gray-700 dark:text-neutral-200`}>
                {title}
              </span>
            </div>
            {p.IsOpenMenu && hasChildren && (
              <svg 
                className={`shrink-0 size-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {p.IsOpenMenu && isOpen && hasChildren && (
            <div className="collapsible-content overflow-hidden mt-1 mr-2">
              <div className="space-y-1 border-l-2 border-gray-200 dark:border-neutral-700 pl-3 ml-2">
                {item.children?.map(child => renderMenuItem(child, level + 1))}
              </div>
            </div>
          )}

          {!p.IsOpenMenu && hasChildren && (
            <div className="flex flex-col items-center gap-y-2 mt-2">
              {item.children?.map(child => (
                <div key={child.MODULE_CODE} className="relative group">
                  {renderIconOnlyItem(child)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div key={item.MODULE_CODE} className="relative group">
          {renderScreenItem(item)}
          {p.IsOpenMenu && item.PATH && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (item.PATH) {
                  debugger
                  p.safeOpenUrl(item.PATH, '_blank');
                }
              }}
              className={`absolute top-1/2 -translate-y-1/2 p-1 rounded opacity-0 
group-hover:opacity-100 transition-opacity hover:bg-gray-200 
dark:hover:bg-neutral-700 ${
  p.isRTL ? 'left-2' : 'right-2'
}`}
              title={p.isRTL ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
            >
              <svg className="size-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
        </div>
      );
    }
  };

    

    const renderScreenItem = (item: MenuItemWithState) => {
    const title = p.getTitle(item);
    
    if (item.onClick) {
      return (
        <button
          onClick={() => p.handleItemClick(item)}
          className="menu-item w-full flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 dark:hover:bg-neutral-800 group"
        >
          <svg className={`shrink-0 size-4 ${item.COLOR}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.ICON_PATH} />
          </svg>
          <span className="text-gray-600 dark:text-neutral-300 group-hover:text-gray-900 dark:group-hover:text-white">
            {title}
          </span>
        </button>
      );
    }
    
    return (
      <a
        href={item.PATH || "#"}
        className="menu-item flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 dark:hover:bg-neutral-800 group"
      >
        <svg className={`shrink-0 size-4 ${item.COLOR}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.ICON_PATH} />
        </svg>
        <span className="text-gray-600 dark:text-neutral-300 group-hover:text-gray-900 dark:group-hover:text-white">
          {title}
        </span>
      </a>
    );
  };

 const renderIconOnlyItem = (item: MenuItemWithState) => {
    const title = p.getTitle(item);
    
    if (item.onClick) {
      return (
        <button
          onClick={() => p.handleItemClick(item)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-200"
          title={title}
        >
          <svg className={`shrink-0 size-5 ${item.COLOR}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.ICON_PATH} />
          </svg>
        </button>
      );
    }
    
    return (
      
      <div className="relative">
        <a
          href={item.PATH || "#"}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-200"
          title={title}
        >
          <svg className={`shrink-0 size-5 ${item.COLOR}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.ICON_PATH} />
          </svg>
        </a>
        {item.PATH && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (item.PATH) {
                p.safeOpenUrl(item.PATH, '_blank');
              }
            }}
            className={`absolute -top-1 p-0.5 rounded-full bg-gray-200 
dark:bg-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity ${
  p.isRTL ? '-left-1' : '-right-1'
}`}
            title={p.isRTL ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
          >
            <svg className="size-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
      </div>
    );
  };
 
   
 return (
    <>
 

    {p.stylesheet}  


      {/* Search Modal */}
      {p.isSearchOpen && (
        <div className="search-modal-overlay" onClick={p.closeSearch}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-wrapper" dir={p.isRTL ? "rtl" : "ltr"}>
              <input
                ref={p.searchInputRef}
                type="text"
                placeholder={p.isRTL ? "ابحث عن صفحات..." : "Search pages..."}
                className="search-input"
                value={p.searchTerm}
                onChange={(e) => p.handleSearch(e.target.value)}
                autoFocus
              />
              <button
                onClick={p.closeSearch}
                className="search-close-btn"
                aria-label="Close search"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="search-results">
              {p.searchTerm && (
                <>
                  {p.searchResults.length > 0 ? (
                    <>
                      <div className="search-result-category">
                        {p.searchResults.length} {p.isRTL ? "نتيجة" : "results found"}
                      </div>
                      {p.searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="search-result-item"
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
                          <svg className={`shrink-0 size-5 ${result.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={result.icon} />
                          </svg>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {result.title}
                            </div>
                            {result.parentTitle && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
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
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              title={p.isRTL ? "فتح في علامة تبويب جديدة" : "Open in new tab"}
                            >
                              <svg className="size-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <svg className="size-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>{p.isRTL ? "لا توجد نتائج مطابقة" : "No matching results"}</p>
                      <p className="text-sm mt-1">{p.isRTL ? "جرب كلمات بحث مختلفة" : "Try different search terms"}</p>
                    </div>
                  )}
                </>
              )}
              {!p.searchTerm && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="size-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* MAIN SIDEBAR */}
      <div 
        id="hs-pro-sidebar" 
        className={`hs-overlay [--body-scroll:true] lg:[--overlay-backdrop:false] [--is-layout-affect:true] transition-all duration-300 transform fixed top-[60px] bottom-0 z-40 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 shadow-xl ${
          p.IsOpenMenu 
            ? 'w-64 translate-x-0' 
            : p.isRTL 
              ? 'w-16 translate-x-full lg:translate-x-0' 
              : 'w-16 -translate-x-full lg:translate-x-0'
        }`} 
        role="dialog" 
        aria-label="Sidebar"
      >
        <div className="relative flex flex-col h-full max-h-full pt-2">
          {!p.IsOpenMenu && (
            <div className="hidden lg:flex items-center justify-center py-4 border-b border-gray-200 dark:border-neutral-800">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">M</span>
              </div>
            </div>
          )}

          <nav className="p-3 size-full flex flex-col overflow-y-auto sidebar-scroll">
            <div className="mb-4">
              <button
                onClick={p.openSearch}
                className={`w-full flex items-center gap-x-3 py-2.5 px-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-800/80 hover:from-gray-200 hover:to-gray-100 dark:hover:from-neutral-700 dark:hover:to-neutral-700 transition-all duration-200 group ${!p.IsOpenMenu ? 'lg:justify-center' : ''}`}
                title={!p.IsOpenMenu ? (p.isRTL ? "بحث" : "Search") : ""}
              >
                <svg className="shrink-0 size-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {p.IsOpenMenu && (
                  <>
                    <span className="flex-1 text-left text-sm text-gray-600 dark:text-gray-400">
                      {p.isRTL ? "بحث..." : "Search..."}
                    </span>
                    <kbd className="search-shortcut hidden sm:inline-block">
                      ⌘K
                    </kbd>
                  </>
                )}
              </button>
            </div>

            {p.menuTree.map(item => renderMenuItem(item))}
          </nav>
        </div>
      </div>
    </>
  );
 }
