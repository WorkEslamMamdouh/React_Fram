"use client";

import { useState, useEffect } from "react"; 
import { Language } from "./Language";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const language = Language();

  return <LanguagePage {...language} Lang={Lang} />;
}

type _ReturnType = ReturnType<typeof Language>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
};

function LanguagePage(p: Props) {
  const [isDark, setIsDark] = useState(false);
  const isEnglish = p.IsLangEN;
  
  // Optional: Detect dark mode for better styling
  // useEffect(() => {
  //   const checkDarkMode = () => {
  //     const darkMode = document.documentElement.classList.contains('dark') || 
  //                      document.body.classList.contains('dark');
  //     // setIsDark(darkMode);
  //   };
  //   checkDarkMode();
  //   const observer = new MutationObserver(checkDarkMode);
  //   observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  //   observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  //   return () => observer.disconnect();
  // }, []);

  return (
    <div className="lang-btn-wrapper">
      <button
        onClick={p.LangSwitcher}
        id="globeBtn"
        className={`
          lang-globe
          flex items-center justify-center
          w-10 h-10 rounded-full
          transition-all duration-300
          cursor-pointer
          ${isDark 
            ? 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:text-white border border-gray-700' 
            : 'bg-white/80 text-gray-600 hover:bg-white hover:text-blue-600 border border-gray-200'
          }
          shadow-sm hover:shadow-md
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
        `}
        aria-label={isEnglish ? "Switch to Arabic" : "Switch to English"}
        title={isEnglish ? "العربية" : "English"}
      >
        {/* Globe Icon - Font Awesome */}
        <i className="fas fa-globe-asia text-lg"></i>
        
        {/* Optional: Show language indicator */}
        <span className="absolute -top-1 -right-1 text-[10px] font-bold">
          {isEnglish ? 'EN' : 'AR'}
        </span>
      </button>
    </div>
  );
}