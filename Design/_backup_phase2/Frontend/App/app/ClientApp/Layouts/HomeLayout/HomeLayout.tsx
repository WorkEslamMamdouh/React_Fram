"use client";

import { useEffect, useState } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import LanguageLoginPage from "../../../ClientApp/Language/LanguageLoginPage";
import { useSys } from "../../../ClientApp/Shared/SystemUsing";
import { useTranslate } from "../../../ClientApp/Shared/Resources";
import '../../../globals.css'
import SideMenu from "./SideMenu/page";
import Navbar from "./Navbar/page";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const Lang = useTranslate();
  const IsOpenMenu = useSys((s) => s.IsOpenMenu);
  
  // State for scroll button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 🔥 stylesheet Component
  const stylesheet = IsLangEN ? (
    <link id="lang-style_HomeLayout" rel="stylesheet" href="/StyleDesign/Layouts/HomeLayoutEN.css" />
  ) : (
    <link id="lang-style_HomeLayout" rel="stylesheet" href="/StyleDesign/Layouts/HomeLayoutAR.css" />
  );

  // Function to scroll to top
  const scrollToTop = () => {
    // Get the scrollable container
    const scrollableContainer = document.querySelector('#main-content-scrollable');
    if (scrollableContainer) {
      scrollableContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Listen for scroll events
  useEffect(() => {
    const scrollableContainer = document.querySelector('#main-content-scrollable');
    
    const handleScroll = () => {
      if (scrollableContainer) {
        // Show button after scrolling down 300px
        setShowScrollTop(scrollableContainer.scrollTop > 300);
      }
    };

    if (scrollableContainer) {
      scrollableContainer.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }

    return () => {
      if (scrollableContainer) {
        scrollableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return (
    <>
      {stylesheet}
      {/* ========== MAIN LAYOUT ========== */}
      {/* Navbar ثابت فوق */}
      <Navbar />

      {/* Sidebar ثابت */}
      <SideMenu />

      {/* ========== MAIN CONTENT ========== */}
      <main
        className={`pt-16 pb-[56px] md:pb-0 bg-erp-canvas text-erp-text h-screen overflow-hidden transition-[padding] duration-300 ${
          IsOpenMenu ? "md:ps-[260px]" : "md:ps-[72px]"
        }`}

      >
        <div className="h-full flex flex-col">

          {/* Content - Added an ID for easier selection */}
          <div
            id="main-content-scrollable"
            className="p-4 md:p-6 xl:p-8 overflow-y-auto flex-1 scroll-smooth"
          >
            {children}  

          </div>

        </div>
      </main>

      {/* ========== SCROLL TO TOP BUTTON - Moved outside the relative div ========== */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-20 md:bottom-6 end-4 md:end-6 z-50 p-3 rounded-full bg-erp-accent text-white shadow-erp-3 hover:bg-erp-accent-hover transition-all duration-300 transform hover:scale-110 erp-focus ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        aria-label="Scroll to top"
        title={IsLangEN ? "Go to top" : "الذهاب للأعلى"}
      >
        <svg
          className="size-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
      {/* ========== END SCROLL TO TOP BUTTON ========== */}
    </>
  );
}