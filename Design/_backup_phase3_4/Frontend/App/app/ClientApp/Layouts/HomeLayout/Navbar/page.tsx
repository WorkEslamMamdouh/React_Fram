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

// ===== أيقونات صغيرة =====
const I = {
  Check: <svg className="size-4 text-erp-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  Close: <svg className="size-5 text-erp-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>,
  Chevron: <svg className="shrink-0 size-3.5 text-erp-text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>,
  Calendar: <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Building: <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1" /></svg>,
  Search: <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Globe: <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></svg>,
  Sun: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 3v1M12 20v1M3 12h1M20 12h1M18.36 5.64l-.7.7M6.34 17.66l-.7.7M5.64 5.64l.7.7M17.66 17.66l.7.7" /></svg>,
  Moon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>,
  Help: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5a2.5 2.5 0 114.2 1.8c-.8.7-1.7 1.2-1.7 2.2M12 17h.01" /></svg>,
  Bell: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  Chat: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Star: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  More: <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>,
  Menu: <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Trash: <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
};

// أزرار أيقونة الشريط العلوي (36×36، 44 على الموبايل)
const iconBtn = "erp-focus relative size-11 md:size-9 inline-flex items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-2 hover:text-erp-text transition-colors";
// حاوية الـ dropdown
const panel = "bg-erp-surface border border-erp-border shadow-erp-3 overflow-hidden z-50";
const badgeDot = "absolute top-1 end-1 min-w-[16px] h-4 px-1 inline-flex items-center justify-center text-[10px] font-bold leading-none text-white bg-erp-danger rounded-full";

function NavbarPage(p: Props) {

  const closeAll = () => {
    p.setIsNotificationsOpen(false);
    p.setIsMessagesOpen(false);
    p.setIsDropdownOpen(false);
    p.setIsMoreMenuOpen(false);
    p.setIsBookmarksOpen(false);
  };

  const branchName = (b: any) => (b ? (p.IsLangEN == true ? b.BranchDescE : b.BranchDescA) : "") ?? "";
  const yearOpen = p.selectedYear?.Status === 0;
  const headerPos = "fixed sm:absolute top-16 sm:top-full mt-0 sm:mt-2 inset-x-0 sm:inset-x-auto sm:end-0 w-full";

  return (
    <>
  {p.stylesheet}
      <header className="fixed top-0 inset-x-0 z-[100] h-16 bg-erp-surface border-b border-erp-border text-sm">
        <nav className="h-full px-3 md:px-4 flex items-center justify-between gap-2">

          {/* ===== START: menu toggle + logo + company/branch + year ===== */}
          <div className="flex items-center gap-1 md:gap-2 min-w-0">
            <button type="button" onClick={p.toggleSidebar} className={iconBtn} aria-label={p.Lang.sidebarToggle}>
              {I.Menu}
              <span className="sr-only">{p.Lang.sidebarToggle}</span>
            </button>

            <a
              className="cursor-pointer shrink-0 flex items-center gap-2 pe-2"
              aria-label="Home"
              onClick={() => p.OpenHome()}
            >
              <span className="inline-flex justify-center items-center bg-erp-primary text-erp-on-primary size-9 rounded-lg">
                <svg className="shrink-0 size-5" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.0835 3.23358C9.88316 3.23358 3.23548 9.8771 3.23548 18.0723V35.5832H0.583496V18.0723C0.583496 8.41337 8.41851 0.583252 18.0835 0.583252C27.7485 0.583252 35.5835 8.41337 35.5835 18.0723C35.5835 27.7312 27.7485 35.5614 18.0835 35.5614H16.7357V32.911H18.0835C26.2838 32.911 32.9315 26.2675 32.9315 18.0723C32.9315 9.8771 26.2838 3.23358 18.0835 3.23358Z" fill="currentColor" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.0833 8.62162C12.8852 8.62162 8.62666 12.9245 8.62666 18.2879V35.5833H5.97468V18.2879C5.97468 11.5105 11.3713 5.97129 18.0833 5.97129C24.7954 5.97129 30.192 11.5105 30.192 18.2879C30.192 25.0653 24.7954 30.6045 18.0833 30.6045H16.7355V27.9542H18.0833C23.2815 27.9542 27.54 23.6513 27.54 18.2879C27.54 12.9245 23.2815 8.62162 18.0833 8.62162Z" fill="currentColor" />
                  <path d="M24.8225 18.1012C24.8225 21.8208 21.8053 24.8361 18.0833 24.8361C14.3614 24.8361 11.3442 21.8208 11.3442 18.1012C11.3442 14.3815 14.3614 11.3662 18.0833 11.3662C21.8053 11.3662 24.8225 14.3815 24.8225 18.1012Z" fill="currentColor" />
                </svg>
              </span>
              <span className="hidden lg:block font-bold text-[15px] text-erp-text whitespace-nowrap">React_Fram ERP</span>
            </a>

            {/* الشركة (عرض) */}
            {p.companyName && (
              <span className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-erp-border text-[13px] text-erp-text-muted max-w-[200px]">
                {I.Building}
                <span className="truncate">{p.companyName}</span>
              </span>
            )}

            {/* Branch Dropdown - Desktop */}
            <div className="hidden sm:block relative min-w-[110px]">
              <button
                ref={p.branchesButtonRef}
                onClick={() => p.setIsBranchesOpen(!p.isBranchesOpen)}
                className="erp-focus h-9 px-3 flex items-center gap-x-2 font-medium text-[13px] text-erp-text rounded-lg border border-erp-border hover:bg-erp-surface-2 transition-colors max-w-[220px] w-full"
              >
                <span className="text-erp-text-muted">{I.Building}</span>
                <span className="truncate">{branchName(p.selectedBranch)}</span>
                {I.Chevron}
              </button>

              {p.isBranchesOpen && (
                <div ref={p.branchesRef} className={`${panel} absolute top-full mt-2 w-72 rounded-xl start-0`}>
                  <div className="px-3 py-2 border-b border-erp-border bg-erp-surface-2">
                    <h3 className="text-[11px] font-semibold tracking-[.04em] text-erp-text-muted">
                      {p.IsLangEN ? "Select Branch" : "اختر الفرع"}
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {p.branchesData.map((branch) => (
                      <button
                        key={branch.BranchCode}
                        onClick={() => {
                          p.setSelectedBranch(branch);
                          p.setIsBranchesOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 text-start hover:bg-erp-surface-2 transition-colors border-b border-erp-border last:border-0 ${
                          p.selectedBranch?.BranchCode === branch.BranchCode ? 'bg-erp-accent-soft' : ''
                        }`}
                      >
                        <span className="text-erp-text-muted">{I.Building}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium truncate ${p.selectedBranch?.BranchCode === branch.BranchCode ? 'text-erp-accent' : 'text-erp-text'}`}>{branchName(branch)}</p>
                          <p className="text-xs text-erp-text-muted truncate">{branch.Address_City}</p>
                          <p className="text-xs text-erp-text-subtle truncate">{branch.BranchManager} • <span className="num">{branch.Tel}</span> {p.IsLangEN ? "Phone" : "تليفون"}</p>
                        </div>
                        {p.selectedBranch?.BranchCode === branch.BranchCode && I.Check}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fiscal year badge - Desktop */}
            <div className="hidden sm:block relative shrink-0">
              <button
                ref={p.yearsButtonRef}
                onClick={() => p.setIsYearsOpen(!p.isYearsOpen)}
                className={`erp-focus h-7 px-2.5 flex items-center gap-1.5 rounded-md border text-[11px] font-semibold ${
                  yearOpen
                    ? 'bg-erp-success-bg border-erp-success-border text-erp-success-text'
                    : 'bg-erp-surface-2 border-erp-border text-erp-text-muted'
                }`}
              >
                {I.Calendar}
                <span className="num">{p.selectedYear?.FinYear}</span>
                {I.Chevron}
              </button>

              {p.isYearsOpen && (
                <div ref={p.yearsRef} className={`${panel} absolute top-full mt-2 w-56 rounded-xl start-0`}>
                  <div className="px-3 py-2 border-b border-erp-border bg-erp-surface-2">
                    <h3 className="text-[11px] font-semibold tracking-[.04em] text-erp-text-muted">
                      {p.IsLangEN ? "Select Year" : "اختر السنة"}
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {p.yearsData.map((year) => (
                      <button
                        key={year.FinYear}
                        onClick={() => {
                          p.setSelectedYear(year);
                          p.setIsYearsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 hover:bg-erp-surface-2 transition-colors border-b border-erp-border last:border-0 ${
                          p.selectedYear?.FinYear === year.FinYear ? 'bg-erp-accent-soft' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${year.Status === 0 ? 'bg-erp-success' : year.Status === 1 ? 'bg-erp-info' : 'bg-erp-text-subtle'}`} />
                          <span className={`num text-[13px] font-medium ${p.selectedYear?.FinYear === year.FinYear ? 'text-erp-accent' : 'text-erp-text'}`}>{year.FinYear}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-erp-text-muted">{p.IsLangEN ? "Fiscal year" : "السنه الماليه"}</span>
                          {p.selectedYear?.FinYear === year.FinYear && I.Check}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== END: search + actions ===== */}
          <div className="flex items-center gap-x-0.5 md:gap-x-1 shrink-0">

            {/* Ctrl+K search (desktop) */}
            <button
              onClick={p.openGlobalSearch}
              className="erp-focus hidden md:flex items-center gap-2 h-9 w-36 xl:w-64 px-3 me-1 rounded-lg bg-erp-surface-2 border border-transparent hover:border-erp-border-strong text-erp-text-subtle text-[13px] transition-colors"
            >
              {I.Search}
              <span className="flex-1 text-start truncate">{p.IsLangEN ? "Search..." : "بحث..."}</span>
              <kbd className="num text-[11px] px-1.5 py-0.5 rounded bg-erp-surface text-erp-text-muted border border-erp-border">Ctrl K</kbd>
            </button>
            <button onClick={p.openGlobalSearch} className={`${iconBtn} md:hidden`} aria-label={p.IsLangEN ? "Search" : "بحث"}>
              {I.Search}
            </button>

            {/* Language toggle */}
            <button onClick={p.handleLanguageSwitch} className={`${iconBtn} hidden sm:inline-flex w-auto px-2 gap-1 text-[12px] font-semibold`} title={p.IsLangEN ? "العربية" : "English"}>
              {I.Globe}
              <span>{p.IsLangEN ? "عربي" : "EN"}</span>
            </button>

            {/* Dark toggle */}
            <button onClick={() => p.ChangeModDark(!p.IsDark)} className={`${iconBtn} hidden sm:inline-flex`} aria-label={p.Lang.theme} title={p.Lang.theme}>
              {p.IsDark ? I.Sun : I.Moon}
            </button>

            {/* Help */}
            <button className={`${iconBtn} hidden md:inline-flex`} aria-label={p.IsLangEN ? "Help" : "مساعدة"} title={p.IsLangEN ? "Help" : "مساعدة"}>
              {I.Help}
            </button>

            {/* BOOKMARKS */}
            <div className={`relative ${p.IsFavorites ? "" : "display_none"}`}>
              <button
                ref={p.bookmarksButtonRef}
                onClick={() => {
                  closeAll();
                  p.setIsBookmarksOpen(!p.isBookmarksOpen);
                }}
                className={iconBtn}
                aria-label={p.IsLangEN ? "Bookmarks" : "المفضلة"}
              >
                <span className={p.isBookmarksOpen ? 'text-erp-warning' : ''}>{I.Star}</span>
                {p.favoritePages.length > 0 && (
                  <span className={`${badgeDot} !bg-erp-warning !text-slate-900 num`}>{p.favoritePages.length}</span>
                )}
              </button>

              {p.isBookmarksOpen && (
                <div ref={p.bookmarksRef} className={`${panel} ${headerPos} sm:w-80 max-h-[80vh] sm:max-h-[500px] rounded-none sm:rounded-xl`}>
                  <div className="sticky top-0 flex items-center justify-between p-4 border-b border-erp-border bg-erp-surface">
                    <h3 className="font-semibold text-erp-text">{p.IsLangEN ? "Bookmarks" : "المفضلة"}</h3>
                    <button onClick={p.addCurrentPageToFavorites} className="text-xs text-erp-accent hover:underline flex items-center gap-1">
                      <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      {p.IsLangEN ? "Add current page" : "أضف الصفحة الحالية"}
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(80vh-120px)] sm:max-h-96">
                    {p.favoritePages.map((page) => (
                      <a key={page.id} href={page.path} className="flex items-center gap-3 p-4 hover:bg-erp-surface-2 transition-colors cursor-pointer border-b border-erp-border group" onClick={() => p.setIsBookmarksOpen(false)}>
                        <div className="text-2xl">{page.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-erp-text truncate">{page.title}</p>
                          <p className="num text-xs text-erp-text-muted mt-0.5">{page.lastVisited}</p>
                        </div>
                        <button onClick={(e) => p.removeFromFavorites(page.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-erp-surface-3 rounded-lg text-erp-text-subtle hover:text-erp-danger">
                          {I.Trash}
                        </button>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* NOTIFICATIONS */}
            <div className={`relative ${p.IsNotifications ? "" : "display_none"}`}>
              <button
                ref={p.notificationsButtonRef}
                onClick={() => {
                  closeAll();
                  p.setIsNotificationsOpen(!p.isNotificationsOpen);
                }}
                className={iconBtn}
                aria-label={p.IsLangEN ? "Notifications" : "الإشعارات"}
              >
                {I.Bell}
                {p.unreadNotificationsCount > 0 && <span className={`${badgeDot} num`}>{p.unreadNotificationsCount}</span>}
              </button>

              {p.isNotificationsOpen && (
                <div ref={p.notificationsRef} className={`${panel} ${headerPos} sm:w-96 max-h-[80vh] sm:max-h-96 rounded-none sm:rounded-xl`}>
                  <div className="sticky top-0 flex items-center justify-between p-4 border-b border-erp-border bg-erp-surface">
                    <h3 className="font-semibold text-erp-text">{p.IsLangEN ? "Notifications" : "الإشعارات"}</h3>
                    <button className="text-xs text-erp-accent hover:underline">{p.IsLangEN ? "Mark all as read" : "تحديد الكل كمقروء"}</button>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(80vh-120px)] sm:max-h-80">
                    {p.notifications.map((notif) => (
                      <div key={notif.id} className={`flex items-start gap-3 p-4 hover:bg-erp-surface-2 transition-colors cursor-pointer border-b border-erp-border ${!notif.read ? 'bg-erp-accent-soft' : ''}`}>
                        <div className="text-2xl">{notif.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] ${!notif.read ? 'font-semibold text-erp-text' : 'text-erp-text-muted'}`}>{notif.title}</p>
                          <p className="text-xs text-erp-text-subtle mt-1">{notif.time}</p>
                        </div>
                        {!notif.read && <div className="size-2 bg-erp-accent rounded-full shrink-0 mt-1.5"></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MESSAGES */}
            <div className={`relative ${p.IsMessages ? "" : "display_none"}`}>
              <button
                ref={p.messagesButtonRef}
                onClick={() => {
                  closeAll();
                  p.setIsMessagesOpen(!p.isMessagesOpen);
                }}
                className={iconBtn}
                aria-label={p.IsLangEN ? "Messages" : "الرسائل"}
              >
                {I.Chat}
                {p.unreadMessagesCount > 0 && <span className={`${badgeDot} num`}>{p.unreadMessagesCount}</span>}
              </button>

              {p.isMessagesOpen && (
                <div ref={p.messagesRef} className={`${panel} ${headerPos} sm:w-96 max-h-[80vh] sm:max-h-96 rounded-none sm:rounded-xl`}>
                  <div className="sticky top-0 flex items-center justify-between p-4 border-b border-erp-border bg-erp-surface">
                    <h3 className="font-semibold text-erp-text">{p.IsLangEN ? "Messages" : "الرسائل"}</h3>
                    <button className="text-xs text-erp-accent hover:underline">{p.IsLangEN ? "New message" : "رسالة جديدة"}</button>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(80vh-120px)] sm:max-h-80">
                    {p.messages.map((msg) => (
                      <div key={msg.id} className={`flex items-center gap-3 p-4 hover:bg-erp-surface-2 transition-colors cursor-pointer border-b border-erp-border ${!msg.read ? 'bg-erp-accent-soft' : ''}`}>
                        <img src={msg.avatar} alt={msg.name} className="size-10 rounded-full object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-[13px] truncate ${!msg.read ? 'font-semibold text-erp-text' : 'text-erp-text-muted'}`}>{msg.name}</p>
                            <p className="text-xs text-erp-text-subtle shrink-0">{msg.time}</p>
                          </div>
                          <p className="text-[13px] text-erp-text-muted truncate">{msg.message}</p>
                        </div>
                        {!msg.read && <div className="size-2 bg-erp-accent rounded-full shrink-0"></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MORE MENU (Mobile Only) */}
            <div className="sm:hidden relative">
              <button
                ref={p.moreMenuButtonRef}
                onClick={() => p.setIsMoreMenuOpen(!p.isMoreMenuOpen)}
                className={iconBtn}
                aria-label={p.IsLangEN ? "More options" : "خيارات إضافية"}
              >
                {I.More}
              </button>

              {p.isMoreMenuOpen && (
                <div ref={p.moreMenuRef} className={`${panel} fixed top-16 inset-x-0 w-full rounded-none`}>
                  <div className="sticky top-0 bg-erp-surface p-3 border-b border-erp-border">
                    <h3 className="font-semibold text-erp-text text-center">{p.IsLangEN ? "More Options" : "خيارات إضافية"}</h3>
                  </div>

                  <button
                    className="w-full min-h-[56px] flex items-center justify-between p-4 hover:bg-erp-surface-2 transition-colors border-b border-erp-border"
                    onClick={() => { p.setIsYearsOpen(!p.isYearsOpen); p.setIsMoreMenuOpen(false); }}
                  >
                    <div className="flex items-center gap-3 text-erp-text-muted">
                      {I.Calendar}
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-erp-text-subtle">{p.IsLangEN ? "Selected Year" : "السنة المختارة"}</span>
                        <span className="num text-erp-text font-medium">{p.selectedYear?.FinYear}</span>
                      </div>
                    </div>
                  </button>

                  <button
                    className="w-full min-h-[56px] flex items-center justify-between p-4 hover:bg-erp-surface-2 transition-colors border-b border-erp-border"
                    onClick={() => { p.setIsBranchesOpen(!p.isBranchesOpen); p.setIsMoreMenuOpen(false); }}
                  >
                    <div className="flex items-center gap-3 text-erp-text-muted">
                      {I.Building}
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-erp-text-subtle">{p.IsLangEN ? "Selected Branch" : "الفرع المختار"}</span>
                        <span className="text-erp-text font-medium">{branchName(p.selectedBranch)}</span>
                      </div>
                    </div>
                  </button>

                  <button
                    className="w-full min-h-[56px] flex items-center gap-3 p-4 hover:bg-erp-surface-2 transition-colors border-b border-erp-border text-erp-text"
                    onClick={p.handleLanguageSwitch}
                  >
                    <span className="text-erp-text-muted">{I.Globe}</span>
                    <span className="font-medium">{p.IsLangEN ? "العربية (AR)" : "English (EN)"}</span>
                  </button>

                  <button
                    className="w-full min-h-[56px] flex items-center gap-3 p-4 hover:bg-erp-surface-2 transition-colors text-erp-text"
                    onClick={() => { p.ChangeModDark(!p.IsDark); p.setIsMoreMenuOpen(false); }}
                  >
                    <span className="text-erp-text-muted">{p.IsDark ? I.Sun : I.Moon}</span>
                    <span className="font-medium">{p.Lang.theme}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Years bottom sheet (mobile) */}
            {p.isYearsOpen && p.isMobile && (
              <div className="fixed inset-0 z-[110] bg-erp-overlay flex items-end justify-center" onClick={() => p.setIsYearsOpen(false)}>
                <div className="bg-erp-surface rounded-t-2xl w-full max-h-[80vh] overflow-hidden shadow-erp-4" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 flex items-center justify-between p-4 border-b border-erp-border bg-erp-surface">
                    <h3 className="font-semibold text-erp-text">{p.IsLangEN ? "Select Year" : "اختر السنة"}</h3>
                    <button onClick={() => p.setIsYearsOpen(false)} className="size-11 flex items-center justify-center rounded-lg hover:bg-erp-surface-2">{I.Close}</button>
                  </div>
                  <div className="overflow-y-auto max-h-[70vh]">
                    {p.yearsData.map((year) => (
                      <button
                        key={year.FinYear}
                        onClick={() => { p.setSelectedYear(year); p.setIsYearsOpen(false); }}
                        className={`w-full min-h-[56px] flex items-center justify-between p-4 hover:bg-erp-surface-2 transition-colors border-b border-erp-border ${
                          p.selectedYear?.FinYear === year.FinYear ? 'bg-erp-accent-soft' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`size-2 rounded-full ${year.Status === 0 ? 'bg-erp-success' : year.Status === 1 ? 'bg-erp-info' : 'bg-erp-text-subtle'}`} />
                          <span className={`num ${p.selectedYear?.FinYear === year.FinYear ? 'text-erp-accent font-semibold' : 'text-erp-text'}`}>{year.FinYear}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-erp-text-muted">{p.IsLangEN ? "Fiscal year" : "السنه الماليه"}</span>
                          {p.selectedYear?.FinYear === year.FinYear && I.Check}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Branches bottom sheet (mobile) */}
            {p.isBranchesOpen && p.isMobile && (
              <div className="fixed inset-0 z-[110] bg-erp-overlay flex items-end justify-center" onClick={() => p.setIsBranchesOpen(false)}>
                <div className="bg-erp-surface rounded-t-2xl w-full max-h-[80vh] overflow-hidden shadow-erp-4" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 flex items-center justify-between p-4 border-b border-erp-border bg-erp-surface">
                    <h3 className="font-semibold text-erp-text">{p.IsLangEN ? "Select Branch" : "اختر الفرع"}</h3>
                    <button onClick={() => p.setIsBranchesOpen(false)} className="size-11 flex items-center justify-center rounded-lg hover:bg-erp-surface-2">{I.Close}</button>
                  </div>
                  <div className="overflow-y-auto max-h-[70vh]">
                    {p.branchesData.map((branch) => (
                      <button
                        key={branch.BranchCode}
                        onClick={() => { p.setSelectedBranch(branch); p.setIsBranchesOpen(false); }}
                        className={`w-full min-h-[56px] flex items-center gap-3 p-4 text-start hover:bg-erp-surface-2 transition-colors border-b border-erp-border ${
                          p.selectedBranch?.BranchCode === branch.BranchCode ? 'bg-erp-accent-soft' : ''
                        }`}
                      >
                        <span className="text-erp-text-muted">{I.Building}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium ${p.selectedBranch?.BranchCode === branch.BranchCode ? 'text-erp-accent' : 'text-erp-text'}`}>{branchName(branch)}</p>
                          <p className="text-xs text-erp-text-muted">{branch.Address_City}</p>
                          <p className="text-xs text-erp-text-subtle mt-0.5">{branch.BranchManager} • <span className="num">{branch.Tel}</span> {p.IsLangEN ? "Phone" : "تليفون"}</p>
                        </div>
                        {p.selectedBranch?.BranchCode === branch.BranchCode && I.Check}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* USER PROFILE */}
            <div className="relative ms-1">
              <button
                ref={p.profileButtonRef}
                onClick={() => {
                  closeAll();
                  p.setIsDropdownOpen(!p.isDropdownOpen);
                }}
                className="erp-focus group p-1 inline-flex shrink-0 items-center gap-2 text-start rounded-lg hover:bg-erp-surface-2 transition-colors"
              >
                <img className="size-8 rounded-full object-cover ring-2 ring-erp-border" src={p.user.avatar} alt={p.user.name} />
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-[13px] font-medium text-erp-text leading-tight">{p.user.name.split(' ')[0]}</span>
                  <span className="text-[11px] text-erp-text-muted leading-tight">{p.user.email.split('@')[0]}</span>
                </div>
                <span className={`hidden lg:block transition-transform duration-200 ${p.isDropdownOpen ? 'rotate-180' : ''}`}>{I.Chevron}</span>
              </button>

              {p.isDropdownOpen && (
                <div ref={p.profileRef} className={`${panel} ${headerPos} sm:w-60 rounded-none sm:rounded-xl`}>
                  <div className="py-3 px-4 border-b border-erp-border">
                    <div className="flex items-center gap-3">
                      <img className="size-10 rounded-full object-cover ring-2 ring-erp-border" src={p.user.avatar} alt={p.user.name} />
                      <div className="flex-1 min-w-0">
                        <span className="block font-medium text-erp-text truncate">{p.user.name}</span>
                        <p className="text-xs text-erp-text-muted truncate">{p.user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b border-erp-border">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="flex-1 text-[13px] text-erp-text">{p.Lang.theme}</span>
                      <div className="flex items-center p-0.5 bg-erp-surface-2 rounded-full">
                        <button onClick={() => p.ChangeModDark(false)} className={`size-8 flex justify-center items-center rounded-full ${!p.IsDark ? 'bg-erp-surface shadow-erp-1 text-erp-warning' : 'text-erp-text-muted'}`}>
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 3v1M12 20v1M3 12h1M20 12h1M18.36 5.64l-.7.7M6.34 17.66l-.7.7M5.64 5.64l.7.7M17.66 17.66l.7.7" /></svg>
                        </button>
                        <button onClick={() => p.ChangeModDark(true)} className={`size-8 flex justify-center items-center rounded-full ${p.IsDark ? 'bg-erp-surface-3 text-erp-text' : 'text-erp-text-muted'}`}>
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-1">
                    <button onClick={p.handleLanguageSwitch} className="w-full min-h-[44px] sm:min-h-[36px] flex items-center gap-x-3 px-3 rounded-lg text-[13px] text-erp-text hover:bg-erp-surface-2 transition-colors">
                      <i className="fas fa-globe text-sm opacity-80 w-4"></i>
                      <span className="flex-1 text-start">{p.IsLangEN ? "العربية (AR)" : "English (EN)"}</span>
                    </button>
                    <a className="min-h-[44px] sm:min-h-[36px] flex items-center gap-x-3 px-3 rounded-lg text-[13px] text-erp-text hover:bg-erp-surface-2 transition-colors" href="#">
                      <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      Profile
                    </a>
                    <a className="min-h-[44px] sm:min-h-[36px] flex items-center gap-x-3 px-3 rounded-lg text-[13px] text-erp-text hover:bg-erp-surface-2 transition-colors" href="#">
                      <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                      Settings
                    </a>
                    <a onClick={p.Logout} className="min-h-[44px] sm:min-h-[36px] flex items-center gap-x-3 px-3 rounded-lg text-[13px] text-erp-danger hover:bg-erp-danger-bg transition-colors" href="#">
                      <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></svg>
                      Log out
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
 }
