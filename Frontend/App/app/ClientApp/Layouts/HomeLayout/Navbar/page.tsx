"use client"

import { useEffect, useRef, useState } from "react";
import _Styles from "./Navbar.module.css"; 
import { Navbar } from "./Navbar";
import { useTranslate } from "../../../../ClientApp/Shared/Resources";
import {  } from "antd";
import { useSys } from "../../../Shared/SystemUsing";  



export default function InitalizeComponent() {
const Lang = useTranslate();
const  IsLangEN  = useSys((s)=> s.IsLangEN);



const stylesheet = IsLangEN ? (
<link id="lang-style_Navbar" rel="stylesheet" href="/StyleDesign/Layouts/NavbarEN.css" />
) :  (
<link id="lang-style_Navbar" rel="stylesheet" href="/StyleDesign/Layouts/NavbarAR.css" />
) ;



const navbar = Navbar();
return <NavbarPage {...navbar} Lang={Lang} stylesheet ={stylesheet}/>;
}
type _ReturnType = ReturnType<typeof Navbar>;
type Props = _ReturnType & {
Lang: ReturnType<typeof useTranslate>;
stylesheet : any
};

function NavbarPage(p: Props) {

return (
    <>
  {p.stylesheet}  
      <header className="fixed top-0 inset-x-0 flex flex-wrap md:justify-start md:flex-nowrap z-[100] w-full bg-gray-100 dark:bg-neutral-900 text-sm py-2.5">
        <nav className="px-3 sm:px-5.5 flex basis-full items-center w-full mx-auto">
          <div className="w-full flex items-center justify-between gap-2">
            {/* LEFT SECTION - Logo & Menu */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <a className="shrink-0 inline-flex justify-center items-center bg-blue-600 dark:bg-blue-500 size-8 rounded-md font-semibold focus:outline-hidden focus:opacity-80"   aria-label="Preline"
              
                    onClick={() => p.OpenHome()}
                    >
                <svg className="shrink-0 size-5" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.0835 3.23358C9.88316 3.23358 3.23548 9.8771 3.23548 18.0723V35.5832H0.583496V18.0723C0.583496 8.41337 8.41851 0.583252 18.0835 0.583252C27.7485 0.583252 35.5835 8.41337 35.5835 18.0723C35.5835 27.7312 27.7485 35.5614 18.0835 35.5614H16.7357V32.911H18.0835C26.2838 32.911 32.9315 26.2675 32.9315 18.0723C32.9315 9.8771 26.2838 3.23358 18.0835 3.23358Z" className="fill-white" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.0833 8.62162C12.8852 8.62162 8.62666 12.9245 8.62666 18.2879V35.5833H5.97468V18.2879C5.97468 11.5105 11.3713 5.97129 18.0833 5.97129C24.7954 5.97129 30.192 11.5105 30.192 18.2879C30.192 25.0653 24.7954 30.6045 18.0833 30.6045H16.7355V27.9542H18.0833C23.2815 27.9542 27.54 23.6513 27.54 18.2879C27.54 12.9245 23.2815 8.62162 18.0833 8.62162Z" className="fill-white" fill="currentColor" />
                  <path d="M24.8225 18.1012C24.8225 21.8208 21.8053 24.8361 18.0833 24.8361C14.3614 24.8361 11.3442 21.8208 11.3442 18.1012C11.3442 14.3815 14.3614 11.3662 18.0833 11.3662C21.8053 11.3662 24.8225 14.3815 24.8225 18.1012Z" className="fill-white" fill="currentColor" />
                </svg>
              </a>

              <button type="button" onClick={p.toggleSidebar} className="p-2 size-9 sm:size-10 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all duration-200 shadow-sm">
                <svg className={`size-4 sm:size-5 transition-transform duration-300 ${p.isRTL ? (!p.isSidebarOpen ? 'rotate-0' : 'rotate-180') : (!p.isSidebarOpen ? 'rotate-180' : 'rotate-0')}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M15 3v18" />
                  <path d="m10 15-3-3 3-3" />
                </svg>
                <span className="sr-only">{p.Lang.sidebarToggle}</span>
              </button>

              {/* Years Dropdown - Desktop مع عرض القيمة المختارة */}
              <div className="hidden sm:block relative">
                <button
                  ref={p.yearsButtonRef}
                  onClick={() => p.setIsYearsOpen(!p.isYearsOpen)}
                  className="py-1 px-2 min-h-8 flex items-center gap-x-1 font-medium text-sm text-gray-800 dark:text-neutral-200 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-all duration-200"
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="size-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{p.selectedYear.FinYear}</span>
                  </span>
                  <svg className={`shrink-0 size-3.5 transition-transform duration-200 ${p.isYearsOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m7 15 5 5 5-5" />
                    <path d="m7 9 5-5 5 5" />
                  </svg>
                </button>

                {p.isYearsOpen && (
                  <div
                    ref={p.yearsRef}
                    className={`absolute top-full mt-1 w-56 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden z-50 ${p.isRTL ? 'right-0' : 'left-0'}`}
                  >
                    <div className="p-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
                        {p.IsLangEN ? "Select Year" : "اختر السنة"}
                      </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {p.yearsData.map((year) => (
                        <button
                          key={year.FinYear}
                          onClick={() => {
                            p.setSelectedYear(year);
                            console.log(`Selected year: ${year.FinYear}`);
                            p.setIsYearsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150 border-b border-gray-100 dark:border-neutral-800 last:border-0 ${
                            p.selectedYear.FinYear === year.FinYear ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              year.Status === 0 ? 'bg-green-500' : 
                              year.Status === 1 ? 'bg-blue-500' : 'bg-gray-400'
                            }`} />
                            <span className={`text-sm font-medium ${
                              p.selectedYear.FinYear === year.FinYear ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-neutral-300'
                            }`}>{year.FinYear}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-neutral-500">  {p.IsLangEN ? "Fiscal year" : "السنه الماليه"}</span>
                            {p.selectedYear.FinYear === year.FinYear && (
                              <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Branches Dropdown - Desktop مع عرض القيمة المختارة */}
              <div className="hidden sm:block relative">
                <button
                  ref={p.branchesButtonRef}
                  onClick={() => p.setIsBranchesOpen(!p.isBranchesOpen)}
                  className="py-1 px-2 min-h-8 flex items-center gap-x-1 font-medium text-sm text-gray-800 dark:text-neutral-200 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-all duration-200"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm">🏢</span>
                    <span className="hidden sm:inline">{(p.IsLangEN == true ?  p.selectedBranch.BranchDescE : p.selectedBranch.BranchDescA)}</span>
                    <span className="sm:hidden">{(p.IsLangEN == true ?  (p.selectedBranch.BranchDescE.length > 10 ? p.selectedBranch.BranchDescE.substring(0, 8) + '...' : p.selectedBranch.BranchDescE): (p.selectedBranch.BranchDescA.length > 10 ? p.selectedBranch.BranchDescA.substring(0, 8) + '...' : p.selectedBranch.BranchDescA))}</span>
                  </span>
                  <svg className={`shrink-0 size-3.5 transition-transform duration-200 ${p.isBranchesOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m7 15 5 5 5-5" />
                    <path d="m7 9 5-5 5 5" />
                  </svg>
                </button>

                {p.isBranchesOpen && (
                  <div
                    ref={p.branchesRef}
                    className={`absolute top-full mt-1 w-72 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden z-50 ${p.isRTL ? 'right-0' : 'left-0'}`}
                  >
                    <div className="p-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
                        {p.IsLangEN ? "Select Branch" : "اختر الفرع"}
                      </h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {p.branchesData.map((branch) => (
                        <button
                        
                          key={branch.BranchCode}
                          onClick={() => {
                            p.setSelectedBranch(branch);
                            console.log(`Selected branch: ${(p.IsLangEN == true ?  branch.BranchDescE : branch.BranchDescA)}`);
                            p.setIsBranchesOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150 border-b border-gray-100 dark:border-neutral-800 last:border-0 ${
                            p.selectedBranch.BranchCode === branch.BranchCode ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="text-2xl">🏢</div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${
                                p.selectedBranch.BranchCode === branch.BranchCode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-neutral-200'
                              }`}>{(p.IsLangEN == true ?  branch.BranchDescE : branch.BranchDescA)}</p>
                              {p.selectedBranch.BranchCode === branch.BranchCode && (
                                <svg className="size-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-neutral-400">{branch.Address_City}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">{branch.BranchManager}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-400">{branch.Tel} {p.IsLangEN ? "Phone" : "تليفون"}</span>
                            </div>
                          </div>
                          <svg className="shrink-0 size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SECTION - Actions */}
            <div className="flex items-center gap-x-1 sm:gap-x-2">
              {/* BOOKMARKS BUTTON */}
              <div className={` relative ${p.IsFavorites ? "" : "display_none"} `}>
                <button
                  ref={p.bookmarksButtonRef}
                  onClick={() => {
                    p.setIsBookmarksOpen(!p.isBookmarksOpen);
                    p.setIsNotificationsOpen(false);
                    p.setIsMessagesOpen(false);
                    p.setIsDropdownOpen(false);
                    p.setIsMoreMenuOpen(false);
                  }}
                  className="relative p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all duration-200"
                  aria-label={p.IsLangEN ? "Bookmarks" : "المفضلة"}
                >
                  <svg className={`size-4 sm:size-5 transition-all duration-200 ${p.isBookmarksOpen ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600 dark:text-neutral-300'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {p.favoritePages.length > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] text-[9px] font-bold leading-none text-white bg-yellow-500 rounded-full ring-2 ring-gray-100 dark:ring-neutral-900">
                      {p.favoritePages.length}
                    </span>
                  )}
                </button>

                {p.isBookmarksOpen && (
                  <div ref={p.bookmarksRef} className={`fixed sm:absolute top-[60px] sm:top-full mt-0 sm:mt-2 w-full sm:w-80 max-h-[80vh] sm:max-h-[500px] transition-all duration-200 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-none sm:rounded-xl shadow-xl overflow-hidden ${p.isMobile ? 'animate-slide-up' : ''} ${p.isMobile ? 'left-0 right-0' : (p.isRTL ? 'left-0' : 'right-0')}`}>
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      <h3 className="font-semibold text-gray-800 dark:text-neutral-200">{p.IsLangEN ? "Bookmarks" : "المفضلة"}</h3>
                      <button onClick={p.addCurrentPageToFavorites} className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1">
                        <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        {p.IsLangEN ? "Add current page" : "أضف الصفحة الحالية"}
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(80vh-120px)] sm:max-h-96 custom-scrollbar">
                      {p.favoritePages.map((page) => (
                        <a key={page.id} href={page.path} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer border-b border-gray-100 dark:border-neutral-800 group" onClick={() => p.setIsBookmarksOpen(false)}>
                          <div className="text-2xl">{page.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{page.title}</p>
                            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{page.lastVisited}</p>
                          </div>
                          <button onClick={(e) => p.removeFromFavorites(page.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg">
                            <svg className="size-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* MORE MENU BUTTON (Mobile Only) */}
              <div className="sm:hidden relative">
                <button
                  ref={p.moreMenuButtonRef}
                  onClick={() => p.setIsMoreMenuOpen(!p.isMoreMenuOpen)}
                  className="relative p-1.5 rounded-lg text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all duration-200"
                  aria-label={p.IsLangEN ? "More options" : "خيارات إضافية"}
                >
                  <svg className="size-4 sm:size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                {p.isMoreMenuOpen && (
                  <div ref={p.moreMenuRef} className="fixed top-[60px] left-0 right-0 mt-0 w-full transition-all duration-200 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-none shadow-xl overflow-hidden animate-slide-up">
                    <div className="sticky top-0 bg-white dark:bg-neutral-900 p-3 border-b border-gray-200 dark:border-neutral-700">
                      <h3 className="font-semibold text-gray-800 dark:text-neutral-200 text-center">{p.IsLangEN ? "More Options" : "خيارات إضافية"}</h3>
                    </div>
                    
                    {/* Years Button - Mobile مع عرض القيمة المختارة */}
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 border-b border-gray-100 dark:border-neutral-800"
                      onClick={() => {
                        p.setIsYearsOpen(!p.isYearsOpen);
                        p.setIsMoreMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="size-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">{p.IsLangEN ? "Selected Year" : "السنة المختارة"}</span>
                          <span className="text-gray-700 dark:text-neutral-300 font-medium">{p.selectedYear.FinYear}</span>
                        </div>
                      </div>
                      <svg className="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>

                    {/* Branches Button - Mobile مع عرض القيمة المختارة */}
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150"
                      onClick={() => {
                        p.setIsBranchesOpen(!p.isBranchesOpen);
                        p.setIsMoreMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🏢</span>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">{p.IsLangEN ? "Selected Branch" : "الفرع المختار"}</span>
                          <span className="text-gray-700 dark:text-neutral-300 font-medium">{(p.IsLangEN == true ?  p.selectedBranch.BranchDescE : p.selectedBranch.BranchDescA)}</span>
                        </div>
                      </div>
                      <svg className="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Years Modal for Mobile */}
              {p.isYearsOpen && p.isMobile && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center animate-fade-in" onClick={() => p.setIsYearsOpen(false)}>
                  <div className="bg-white dark:bg-neutral-900 rounded-t-2xl w-full max-h-[80vh] overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      <h3 className="font-semibold text-gray-800 dark:text-neutral-200">{p.IsLangEN ? "Select Year" : "اختر السنة"}</h3>
                      <button onClick={() => p.setIsYearsOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
                        <svg className="size-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-[70vh] custom-scrollbar">
                      {p.yearsData.map((year) => (
                        <button
                          key={year.FinYear}
                          onClick={() => {
                            p.setSelectedYear(year);
                            console.log(`Selected year: ${year.FinYear}`);
                            p.setIsYearsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 border-b border-gray-100 dark:border-neutral-800 ${
                            p.selectedYear.FinYear === year.FinYear ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${year.Status === 0 ? 'bg-green-500' : year.Status === 1 ? 'bg-blue-500' : 'bg-gray-400'}`} />
                            <span className={`${p.selectedYear.FinYear === year.FinYear ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-neutral-300'}`}>{year.FinYear}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-neutral-500">  {p.IsLangEN ? "Fiscal year" : "السنه الماليه"}</span>
                            {p.selectedYear.FinYear === year.FinYear && (
                              <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Branches Modal for Mobile */}
              {p.isBranchesOpen && p.isMobile && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center animate-fade-in" onClick={() => p.setIsBranchesOpen(false)}>
                  <div className="bg-white dark:bg-neutral-900 rounded-t-2xl w-full max-h-[80vh] overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      <h3 className="font-semibold text-gray-800 dark:text-neutral-200">{p.IsLangEN ? "Select Branch" : "اختر الفرع"}</h3>
                      <button onClick={() => p.setIsBranchesOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
                        <svg className="size-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-[70vh] custom-scrollbar">
                      {p.branchesData.map((branch) => (
                        <button
                          key={branch.BranchCode}
                          onClick={() => {
                            p.setSelectedBranch(branch);
                            console.log(`Selected branch: ${(p.IsLangEN == true ?  branch.BranchDescE : branch.BranchDescA)}`);
                            p.setIsBranchesOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 border-b border-gray-100 dark:border-neutral-800 ${
                            p.selectedBranch.BranchCode === branch.BranchCode ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="text-2xl">🏢</div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${
                                p.selectedBranch.BranchCode === branch.BranchCode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-neutral-200'
                              }`}>{(p.IsLangEN == true ?  branch.BranchDescE : branch.BranchDescA)}</p>
                              {p.selectedBranch.BranchCode === branch.BranchCode && (
                                <svg className="size-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-neutral-400">{branch.Address_City}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{branch.BranchManager} • {branch.Tel} {p.IsLangEN ? "Phone" : "تليفون"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS BUTTON */}
              <div className={` relative ${p.IsNotifications ? "" : "display_none"} `}>
                <button
                  ref={p.notificationsButtonRef}
                  onClick={() => {
                    p.setIsNotificationsOpen(!p.isNotificationsOpen);
                    p.setIsMessagesOpen(false);
                    p.setIsDropdownOpen(false);
                    p.setIsMoreMenuOpen(false);
                    p.setIsBookmarksOpen(false);
                  }}
                  className="relative p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all duration-200"
                  aria-label={p.IsLangEN ? "Notifications" : "الإشعارات"}
                >
                  <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {p.unreadNotificationsCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
                      {p.unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {p.isNotificationsOpen && (
                  <div ref={p.notificationsRef} className={`fixed sm:absolute top-[60px] sm:top-full mt-0 sm:mt-2 w-full sm:w-96 max-h-[80vh] sm:max-h-96 transition-all duration-200 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-none sm:rounded-xl shadow-xl overflow-hidden ${p.isMobile ? 'animate-slide-up' : ''} ${p.isMobile ? 'left-0 right-0' : (p.isRTL ? 'left-0' : 'right-0')}`}>
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      <h3 className="font-semibold text-gray-800 dark:text-neutral-200">{p.IsLangEN ? "Notifications" : "الإشعارات"}</h3>
                      <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{p.IsLangEN ? "Mark all as read" : "تحديد الكل كمقروء"}</button>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(80vh-120px)] sm:max-h-80 custom-scrollbar">
                      {p.notifications.map((notif) => (
                        <div key={notif.id} className={`flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer border-b border-gray-100 dark:border-neutral-800 ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <div className="text-2xl">{notif.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'}`}>{notif.title}</p>
                            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">{notif.time}</p>
                          </div>
                          {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* MESSAGES BUTTON */}
              <div className={` relative ${p.IsMessages ? "" : "display_none"} `}>
                <button
                  ref={p.messagesButtonRef}
                  onClick={() => {
                    p.setIsMessagesOpen(!p.isMessagesOpen);
                    p.setIsNotificationsOpen(false);
                    p.setIsDropdownOpen(false);
                    p.setIsMoreMenuOpen(false);
                    p.setIsBookmarksOpen(false);
                  }}
                  className="relative p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all duration-200"
                  aria-label={p.IsLangEN ? "Messages" : "الرسائل"}
                >
                  <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {p.unreadMessagesCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
                      {p.unreadMessagesCount}
                    </span>
                  )}
                </button>

                {p.isMessagesOpen && (
                  <div ref={p.messagesRef} className={`fixed sm:absolute top-[60px] sm:top-full mt-0 sm:mt-2 w-full sm:w-96 max-h-[80vh] sm:max-h-96 transition-all duration-200 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-none sm:rounded-xl shadow-xl overflow-hidden ${p.isMobile ? 'animate-slide-up' : ''} ${p.isMobile ? 'left-0 right-0' : (p.isRTL ? 'left-0' : 'right-0')}`}>
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      <h3 className="font-semibold text-gray-800 dark:text-neutral-200">{p.IsLangEN ? "Messages" : "الرسائل"}</h3>
                      <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{p.IsLangEN ? "New message" : "رسالة جديدة"}</button>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(80vh-120px)] sm:max-h-80 custom-scrollbar">
                      {p.messages.map((msg) => (
                        <div key={msg.id} className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer border-b border-gray-100 dark:border-neutral-800 ${!msg.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <img src={msg.avatar} alt={msg.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm truncate ${!msg.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-neutral-300'}`}>{msg.name}</p>
                              <p className="text-xs text-gray-500 dark:text-neutral-500 flex-shrink-0">{msg.time}</p>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-neutral-400 truncate">{msg.message}</p>
                          </div>
                          {!msg.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* USER PROFILE */}
              <div className="relative">
                <button
                  ref={p.profileButtonRef}
                  onClick={() => {
                    p.setIsDropdownOpen(!p.isDropdownOpen);
                    p.setIsNotificationsOpen(false);
                    p.setIsMessagesOpen(false);
                    p.setIsMoreMenuOpen(false);
                    p.setIsBookmarksOpen(false);
                  }}
                  className="group p-1 inline-flex shrink-0 items-center gap-1 sm:gap-2 text-start rounded-full transition-all duration-200 hover:bg-gray-200/50 dark:hover:bg-neutral-800/50 focus:outline-hidden"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    <img className="relative size-8 sm:size-10 rounded-full object-cover ring-2 ring-white dark:ring-neutral-800 shadow-md hover:shadow-lg transition-shadow duration-200" src={p.user.avatar} alt={p.user.name} />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700 dark:text-neutral-200 leading-tight">{p.user.name.split(' ')[0]}</span>
                    <span className="text-xs text-gray-500 dark:text-neutral-400 leading-tight">{p.user.email.split('@')[0]}</span>
                  </div>
                  <svg className={`hidden sm:block shrink-0 size-3.5 text-gray-500 dark:text-neutral-400 transition-transform duration-200 ${p.isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {p.isDropdownOpen && (
                  <div ref={p.profileRef} className={`fixed sm:absolute top-[60px] sm:top-full mt-0 sm:mt-2 w-full sm:w-60 transition-all duration-200 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-none sm:rounded-xl shadow-xl ${p.isMobile ? 'left-0 right-0' : (p.isRTL ? 'left-0' : 'right-0')}`}>
                    <div className="py-3 px-4 border-b border-gray-200 dark:border-neutral-800">
                      <div className="flex items-center gap-3">
                        <img className="size-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-neutral-700" src={p.user.avatar} alt={p.user.name} />
                        <div className="flex-1 min-w-0">
                          <span className="block font-medium text-gray-800 dark:text-neutral-200 truncate">{p.user.name}</span>
                          <p className="text-sm text-gray-500 dark:text-neutral-400 truncate">{p.user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="flex-1 cursor-pointer text-sm text-gray-800 dark:text-neutral-200">{p.Lang.theme}</span>
                        <div className="relative w-16 p-0.5 flex items-center bg-gray-100 dark:bg-neutral-700 rounded-full cursor-pointer">
                          <span className={`absolute top-0.5 bottom-0.5 w-7 bg-white dark:bg-neutral-800 rounded-full shadow-sm transition-all duration-300 ${p.IsDark ? "right-0.5" : "left-0.5"}`} />
                          <button onClick={() => p.ChangeModDark(false)} className="relative z-10 w-1/2 flex justify-center items-center py-1 text-yellow-500">
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 3v1M12 20v1M3 12h1M20 12h1M18.36 5.64l-.7.7M6.34 17.66l-.7.7M5.64 5.64l.7.7M17.66 17.66l.7.7" /></svg>
                          </button>
                          <button onClick={() => p.ChangeModDark(true)} className="relative z-10 w-1/2 flex justify-center items-center py-1 text-gray-700 dark:text-white">
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-1">
                      <button onClick={p.handleLanguageSwitch} className="w-full flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200">
                        <i className="fas fa-globe text-sm sm:text-base opacity-80 w-4"></i>
                        <span className="flex-1 text-left">{p.IsLangEN ? "العربية (AR)" : "English (EN)"}</span>
                      </button>
                      <a className="flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200" href="#">
                        <svg className="shrink-0 mt-0.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        Profile
                      </a>
                      <a className="flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200" href="#">
                        <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        Settings
                      </a>
                      <a  onClick={p.Logout} className="flex items-center gap-x-3 py-2 px-3 rounded-lg text-sm text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200" href="#">
                        <svg className="shrink-0 mt-0.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></svg>
                        Log out
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>

    
    </>
  );
 }
