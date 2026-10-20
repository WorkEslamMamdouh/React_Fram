"use client"

import { useEffect, useRef, useState } from "react";
import _Styles from "./Dashboard.module.css"; 
import { Dashboard } from "./Dashboard";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import {  } from "antd";
import { useSys } from "../Shared/SystemUsing";  


export default function InitalizeComponent() {
const Lang = useTranslate();
const  IsLangEN  = useSys((s)=> s.IsLangEN);



const stylesheet = IsLangEN ? (
<link id="lang-style_Dashboard" rel="stylesheet" href="/StyleDesign/Pages/Dashboard/DashboardEN.css" />
) :  (
<link id="lang-style_Dashboard" rel="stylesheet" href="/StyleDesign/Pages/Dashboard/DashboardAR.css" />
) ;



const dashboard = Dashboard();
return <DashboardPage {...dashboard} Lang={Lang} stylesheet ={stylesheet}/>;
}
type _ReturnType = ReturnType<typeof Dashboard>;
type Props = _ReturnType & {
Lang: ReturnType<typeof useTranslate>;
stylesheet : any
};

function DashboardPage(p: Props) {

return ( 
<>
{p.stylesheet} 

{/* Card */}
<div className="p-4 md:p-5 min-h-102.5 flex flex-col bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-2xs rounded-xl">
  {/* Header */}
  <div className="flex flex-wrap justify-between items-center gap-2">
    <div>
      <h2 className="text-sm text-gray-500 dark:text-neutral-400">
        Visitors
      </h2>
      <p className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-neutral-200">
        80.3k
      </p>
    </div>

    <div>
      <span className="py-[5px] px-1.5 inline-flex items-center gap-x-1 text-xs font-medium rounded-md bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500">
        <svg className="inline-block size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        2%
      </span>
    </div>
  </div>
  {/* End Header */}

  <div id="hs-single-area-chart"></div>
</div>
{/* End Card */}


</>
 ); 
 }
