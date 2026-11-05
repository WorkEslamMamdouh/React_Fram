"use client";



import { useEffect } from "react"; 
import "@fortawesome/fontawesome-free/css/all.min.css"; 
import LanguageLoginPage from "../../ClientApp/Language/LanguageLoginPage";
import { useSys } from "../../ClientApp/Shared/SystemUsing"; 
import { useTranslate } from "../../ClientApp/Shared/Resources";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const IsLangEN = useSys((s) => s.IsLangEN);  
 
     // 🔥 stylesheet Component
  const stylesheet = IsLangEN ? (
  <link id="lang-style_LoginLayout" rel="stylesheet" href="/StyleDesign/Layouts/LoginLayoutEN.css" />
  ) :  (
  <link id="lang-style_LoginLayout" rel="stylesheet" href="/StyleDesign/Layouts/LoginLayoutAR.css" />
  ) ;


  return (
    <>

      <div className=""  > 
        <LanguageLoginPage />
         {stylesheet}
        {children}

      </div>

    </>
  );
}

