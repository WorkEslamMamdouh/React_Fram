"use client";

import { useEffect, useRef, useState } from "react";
import { Login } from "./Login";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_Login" rel="stylesheet" href="/StyleDesign/Pages/Login/LoginEN.css" />
  ) : (
    <link id="lang-style_Login" rel="stylesheet" href="/StyleDesign/Pages/Login/LoginAR.css" />
  );

  const login = Login();

  return <LoginPage {...login} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof Login>;

type Props = _ReturnType & {
  Lang: ReturnType<typeof useTranslate>;
  stylesheet: any;
};

const fieldCls =
  "w-full h-12 ps-10 pe-3 bg-erp-surface border border-erp-border-strong rounded-lg text-[14px] text-erp-text placeholder:text-erp-text-subtle focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition";

function LoginPage(p: Props) {
  return (
    <>
      {p.stylesheet}
      <div className="relative min-h-screen bg-erp-canvas text-erp-text flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        {/* soft accent glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -end-32 size-96 rounded-full bg-erp-accent opacity-[0.07] blur-3xl"></div>
          <div className="absolute -bottom-32 -start-32 size-96 rounded-full bg-erp-info opacity-[0.06] blur-3xl"></div>
        </div>

        <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-stretch">
          {/* Hero panel (desktop) */}
          <div className="hidden lg:flex flex-col justify-between rounded-xl p-8 bg-erp-primary text-erp-on-primary shadow-erp-3">
            <div className="inline-flex items-center justify-center size-12 rounded-xl bg-white/10">
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[28px] leading-9 font-bold mb-3">React_Fram ERP</h1>
              <p className="text-[15px] opacity-80 leading-6 max-w-sm">
                {p.Lang.loginToYourAccount || "Please enter your details to sign in"}
              </p>
            </div>
            <p className="text-xs opacity-60">&copy; 2026 ESSA. {p.Lang.allRightsReserved || "All rights reserved."}</p>
          </div>

          {/* Main Login Card */}
          <div className="rounded-xl bg-erp-surface border border-erp-border shadow-erp-3 p-6 sm:p-8">
            {/* Logo and Header */}
            <div className="mb-8">
              <div className="lg:hidden inline-flex items-center justify-center size-12 bg-erp-primary text-erp-on-primary rounded-xl mb-4">
                <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className="text-[22px] sm:text-[28px] leading-9 font-bold text-erp-text mb-1">
                {p.Lang.welcomeBack || "Welcome Back"}
              </h2>
              <p className="text-erp-text-muted text-[13px]">
                {p.Lang.loginToYourAccount || "Please enter your details to sign in"}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={(e) => { e.preventDefault(); p.Login(); }} className="space-y-5">
              {/* Message Display */}
              <div id="loginMsg" className="hidden"></div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-erp-text">
                  {p.Lang.email}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    <svg className="size-5 text-erp-text-subtle group-focus-within:text-erp-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    ref={p.email}
                    type="text"
                    id="loginEmail"
                    className={fieldCls}
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-erp-text">
                  {p.Lang.password}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    <svg className="size-5 text-erp-text-subtle group-focus-within:text-erp-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    ref={p.Password}
                    type={p.showPassword ? "text" : "password"}
                    id="loginPassword"
                    className={`${fieldCls} pe-12`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={p.togglePasswordVisibility}
                    className="absolute inset-y-0 end-0 pe-3 flex items-center text-erp-text-subtle hover:text-erp-text transition-colors"
                  >
                    {p.showPassword ? (
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={p.rememberMe}
                    onChange={(e) => p.setRememberMe(e.target.checked)}
                    className="size-4 accent-[var(--erp-accent)] rounded border-erp-border-strong"
                  />
                  <span className="text-[13px] text-erp-text-muted group-hover:text-erp-text transition-colors">
                    {p.Lang.rememberMe || "Remember me"}
                  </span>
                </label>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); }}
                  className="text-[13px] text-erp-accent hover:text-erp-accent-hover font-medium transition-colors"
                >
                  {p.Lang.forgotPassword || "Forgot password?"}
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                id="loginBtn"
                disabled={p.isLoading}
                className="erp-focus w-full h-12 bg-erp-primary text-erp-on-primary font-semibold rounded-lg hover:bg-erp-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {p.isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{p.Lang.loggingIn || "Logging in..."}</span>
                  </div>
                ) : (
                  p.Lang.entrance || "Sign In"
                )}
              </button>

              {/* Register Link */}
              <div className="text-center">
                <p className="text-[13px] text-erp-text-muted">
                  {p.Lang.dontHaveAccount || "Don't have an account?"}{" "}
                  <a
                    href="#"
                    onClick={p.showRegister}
                    id="registerLink"
                    className="text-erp-accent hover:text-erp-accent-hover font-semibold transition-colors"
                  >
                    {p.Lang.createANewAccount || "Create an account"}
                  </a>
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-erp-border"></div>
                </div>
                <div className="relative flex justify-center text-[13px]">
                  <span className="px-2 bg-erp-surface text-erp-text-subtle">{p.Lang.or || "Or"}</span>
                </div>
              </div>

              {/* Back to Website Button */}
              <button
                type="button"
                onClick={p.OpenWebsite}
                id="backToWebsiteBtn"
                className="erp-focus w-full h-12 bg-erp-surface border border-erp-border text-erp-text font-semibold rounded-lg hover:bg-erp-surface-2 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="size-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>{p.Lang.backToTheSite}</span>
              </button>
            </form>

            <p className="lg:hidden text-center text-xs text-erp-text-subtle mt-6">
              &copy; 2026 ESSA. {p.Lang.allRightsReserved || "All rights reserved."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
