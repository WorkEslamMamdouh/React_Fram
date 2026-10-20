"use client"; 
import { useRouter } from "next/router";
import { OpenPage } from "../Shared/App";
import { useSys } from "../Shared/SystemUsing";

 
// =======================
// Language Page  
// =======================
export function Language() {  
    const ShowLoader = useSys((s) => s.ShowLoader);
    const CloseLoader = useSys((s) => s.CloseLoader);
    const IsLangEN = useSys((s) => s.IsLangEN);
    const toggleLang = useSys((s) => s.toggleLang);
    const ISlang = useSys((s) => s.lang); 
  
 
  // =======================
  // Events
  // ======================= 



  const LangSwitcher = () => {
      
      ShowLoader()
      setTimeout(() => {
         toggleLang()
         CloseLoader()

      }, 100)
  };
 
  // value
const state = {  
};

//function
const actions = { 
  LangSwitcher,
  ISlang,
  IsLangEN
};

  
return {
  ...state,
  ...actions
};


}



  