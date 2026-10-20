"use client";



import { useEffect } from "react"; 
import "@fortawesome/fontawesome-free/css/all.min.css";
 
import { useSys } from "../../ClientApp/Shared/SystemUsing";  

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const IsLangEN = useSys((s) => s.IsLangEN);  
 

  return (
    <> 
      <div className="" style={{ direction: IsLangEN ? "ltr" : "rtl" }}>  
        {children} 
      </div>

    </>
  );
}

