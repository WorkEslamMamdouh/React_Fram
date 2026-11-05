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
        className={`pt-[60px] px-2 pb-3 bg-gray-50 dark:bg-neutral-900 h-screen overflow-hidden transition-all duration-300 ${
          IsLangEN
            ? IsOpenMenu
              ? "lg:pl-60"
              : "lg:pl-16"
            : IsOpenMenu
            ? "lg:pr-60"
            : "lg:pr-16"
        }`}
      
      >
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 shadow-sm rounded-xl h-full flex flex-col">
          
          {/* Content - Added an ID for easier selection */}
          <div 
            id="main-content-scrollable"
            className= {IsOpenMenu ? "p-4 overflow-y-auto flex-1 scroll-smooth" : "p-1 overflow-y-auto flex-1 scroll-smooth"} 
          >
            {children}  

          </div>

        </div>
      </main>

      {/* ========== SCROLL TO TOP BUTTON - Moved outside the relative div ========== */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 z-50 p-3 rounded-full bg-blue-600 dark:bg-blue-500 text-white shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 ${
          IsLangEN ? 'right-6' : 'left-6'
        } ${
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