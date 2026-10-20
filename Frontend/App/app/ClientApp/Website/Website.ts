"use client"
import { Sys } from "../Shared/SystemTools";
import { useEffect, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { } from "../Shared/Entities_DataBase";
import { } from "../Shared/Entities";
import { OpenPage } from "../Shared/App";
import { useRouter } from "next/navigation";

// =======================
// Website Page  
// =======================
export function Website() {
const Router = useRouter();

const didRun = useRef(false);

useEffect(() => {
  if (didRun.current) return;
  didRun.current = true;

  InitalizeComponent();
}, []);

 
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


InitializeEvents()  

}

function InitializeEvents() {

//if (email.current) {
//email.current.onchange = showWebsite;
//}

}


// =======================
// #region Events Elements Html
// =======================


function OpenPageLogin() {
    OpenPage("Login", Router); 
};

// #endregion









// =======================
// UI
// =======================
// value
const state = {
};

//function
const actions = {
//showWebsite,
OpenPageLogin,
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
 


}
