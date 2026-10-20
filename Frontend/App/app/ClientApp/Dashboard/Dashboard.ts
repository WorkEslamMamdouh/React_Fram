"use client"
import { Sys } from "../Shared/SystemTools";
import { useEffect, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { } from "../Shared/Entities_DataBase";
import { } from "../Shared/Entities";
import { OpenPage } from "../Shared/App";
import { useRouter } from "next/navigation"; 
import ApexCharts from "apexcharts";

// =======================
// Dashboard Page  
// =======================
export function Dashboard() {
const Router = useRouter();


const didRun = useRef(false);
useEffect(() => {
  if (didRun.current) return; 
 didRun.current = true;
InitalizeComponent();
}, [])

// =======================
// #region UsingSystem Glopal
// =======================
const ShowLoader = useSys((s) => s.ShowLoader);
const CloseLoader = useSys((s) => s.CloseLoader); 

// #endregion


// =======================
// #region Glopal Varebil
// =======================
// var CountGrid = 0;

// #endregion


// =======================
// #region  InitalizeControls  
// ======================= 
// const email = useRef<HTMLInputElement>(null)


// #endregion


function InitalizeComponent() {

DisplayDashboard();
InitializeEvents()  

   debugger
  // عرض رسالة نجاح
     // ✅ استخدام Sys مباشرة
    // Sys.ShowMessage("Operation completed successfully!", "تمت العملية بنجاح!", "success");
    // Sys.ShowMessage("Error occurred!", "حدث خطأ!", "error");
    // Sys.ShowMessage("Please check your input!", "الرجاء التحقق من الإدخال!", "warning");
    // Sys.ShowMessage("New update available!", "تحديث جديد متاح!", "info");
    
    // Sys.log("Dashboard initialized");

 

}

function InitializeEvents() {

//if (email.current) {
//email.current.onchange = showWebsite;
//}

}



function DisplayDashboard (){

 
    const el = document.querySelector("#hs-single-area-chart") as HTMLElement;

    if (!el) return;

    const chart = new ApexCharts(el , {
      chart: {
        height: 300,
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      series: [
        {
          name: "Visitors",
          data: [180, 51, 60, 38, 88, 50, 40, 52, 88, 80, 60, 70],
        },
      ],
      stroke: {
        curve: "straight",
        width: 2,
      },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.1,
          opacityTo: 0.8,
        },
      },
      xaxis: {
        categories: [
          "25 Jan",
          "26 Jan",
          "27 Jan",
          "28 Jan",
          "29 Jan",
          "30 Jan",
          "31 Jan",
          "1 Feb",
          "2 Feb",
          "3 Feb",
          "4 Feb",
          "5 Feb",
        ],
      },
yaxis: {
  labels: {
    formatter: (value: number) =>
      value >= 1000 ? `${value / 1000}k` : `${value}`
  }
}
    });

    chart.render();

    return () => {
      chart.destroy(); // مهم علشان memory leak
    }; 
 
}

// =======================
// #region Events Elements Html
// =======================




// #endregion









// =======================
// UI
// =======================
// value
const state = {
};

//function
const actions = {
DisplayDashboard,
};

// Element
const elements = {
//email,
};


return {
...state,
...actions,
...elements

};

};
