"use client";

import { Sys } from "../Shared/SystemTools";
import { useEffect, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { } from "../Shared/Entities_DataBase";
import { BaseResponse } from "../Shared/Entities";
import { Event_key, OpenPage } from "../Shared/App";
import { useRouter } from "next/navigation";

// =======================
// Login Page  
// =======================
export function Login() {
  const Router = useRouter();
  const didRun = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    InitalizeComponent();
    
    // Check for saved credentials
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail && email.current) {
      email.current.value = savedEmail;
      setRememberMe(true);
    }
  }, []);

  // =======================
  // #region UsingSystem Glopal
  // =======================
  const ShowLoader = useSys((s) => s.ShowLoader);
  const CloseLoader = useSys((s) => s.CloseLoader);
  const SetDataCompany = useSys((s) => s.SetDataCompany);
  const SetDataBranch = useSys((s) => s.SetDataBranch);
  const SetDataYearControl = useSys((s) => s.SetDataYearControl);
  const setToken = useSys((s) => s.setToken);
  const IsLangEN = useSys((s) => s.IsLangEN);
  // #endregion

  // =======================
  // #region Glopal Varebil
  // =======================
  var CountGrid = 0;
  // #endregion

  // =======================
  // #region InitalizeControls  
  // ======================= 
  const email = useRef<HTMLInputElement>(null)
  const Password = useRef<HTMLInputElement>(null)

  // #endregion

  function InitalizeComponent() {
    email.current?.focus();
    InitializeEvents()
  }

  function InitializeEvents() {
    if (email.current) {
      email.current.onchange = showWebsite;
    }
    Event_key('Enter', 'loginEmail', 'loginBtn');
    Event_key('Enter', 'loginPassword', 'loginBtn');
  }

  // =======================
  // #region Events Elements Html
  // =======================

  function OpenWebsite() {
    OpenPage("Website", Router);
  }

  function Login() {
    // ✅ التحقق من البريد الإلكتروني
    if ((email.current?.value.trim() ?? "") == "") {
      Sys.ErrorInput(email.current, {
        messageEn: "Email is required",
        messageAr: "البريد الإلكتروني مطلوب"
      });
      return;
    }

 

    // ✅ التحقق من كلمة المرور
    if ((Password.current?.value.trim() ?? "") == "") {
      Sys.ErrorInput(Password.current, {
        messageEn: "Password is required",
        messageAr: "كلمة المرور مطلوبة"
      });
      return;
    }

    // Save email if remember me is checked
    if (rememberMe && email.current?.value) {
      localStorage.setItem('rememberedEmail', email.current.value);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    CallAPI_Login(email.current?.value, Password.current?.value);
  }

  function showRegister() {
    OpenPage("Register", Router);
  }

  function showWebsite() {
    // alert("Back Website");
  }

  function togglePasswordVisibility() {
    setShowPassword(!showPassword);
  }

  // #endregion

  // =======================
  // #region functions
  // =======================
  async function CallAPI_Login(username?: string, password?: string) {
    setIsLoading(true);
    
    await Sys.CallApi<BaseResponse<{ Model: any }>>({
      method: "GET",
      controller: "auth",
      action: "login",
      data: { Username: username, Password: password },

      onSuccess: (res) => {
        if (res.IsSuccess) {
          const Reslt = res.Response
          
          Sys.setAuthToken(Reslt.Token);
          setToken(Reslt.Token);
          SetDataCompany(Reslt.Sys_Company);
          SetDataBranch(Reslt.Sys_Branch);
          SetDataYearControl(Reslt.Sys_ControlYear);

          Sys.ShowMessage(
            "Login successful!",
            "تم تسجيل الدخول بنجاح!",
            "success"
          );
          OpenPage("LoginCompany", Router);
        } else {
          const errorMsg = res.ErrorMessage || "Login failed";
          Sys.ShowMessage(
            errorMsg,
            "فشل تسجيل الدخول",
            "error"
          );
        }
        setIsLoading(false);
      },

      onError: (err) => {
        console.error("Login error:", err);
        Sys.ShowMessage(
          "Connection error. Please try again.",
          "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
          "error"
        );
        setIsLoading(false);
      }
    }, {
      show: ShowLoader,
      hide: CloseLoader
    });
  }
  // #endregion

  // =======================
  // UI
  // =======================
  const state = {
    showPassword,
    rememberMe,
    isLoading,
    IsLangEN
  };

  const actions = {
    Login,
    OpenWebsite,
    showRegister,
    showWebsite,
    togglePasswordVisibility,
    setRememberMe
  };

  const elements = {
    email,
    Password,
  };

  return {
    ...state,
    ...actions,
    ...elements
  };
}