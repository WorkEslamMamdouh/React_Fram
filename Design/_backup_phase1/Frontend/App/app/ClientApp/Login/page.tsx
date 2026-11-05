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

function LoginPage(p: Props) {
  return (
    <>
      {p.stylesheet}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Animated Background Elements - Matching Website Colors */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-mix filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-mix filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300 rounded-full mix-blend-mix filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          
          {/* Aurora effect from Website */}
          <div className="absolute inset-0 [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_0%,var(--indigo-500)_15%,var(--blue-500)_30%,var(--cyan-500)_45%,var(--blue-500)_60%,var(--indigo-500)_100%)] [background-image:var(--aurora)] [background-size:400%] animate-aurora opacity-5"></div>
        </div>

        {/* Main Login Card */}
        <div className="relative w-full max-w-md">
          {/* Decorative elements - Matching Website Style */}
          <div className="absolute -top-5 -left-5 w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-60 blur-xl"></div>
          <div className="absolute -bottom-5 -right-5 w-20 h-20 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full opacity-60 blur-xl"></div>

          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-3xl">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4 transform transition-transform hover:scale-110 duration-300">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className="text-2xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                {p.Lang.welcomeBack || "Welcome Back"}
              </h2>
              <p className="text-gray-500 text-sm sm:text-base">
                {p.Lang.loginToYourAccount || "Please enter your details to sign in"}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={(e) => { e.preventDefault(); p.Login(); }} className="space-y-5">
              {/* Message Display */}
              <div id="loginMsg" className="hidden"></div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {p.Lang.email}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    ref={p.email}
                    type="text"
                    id="loginEmail"
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                    placeholder="admin@company.com" 
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {p.Lang.password}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    ref={p.Password}
                    type={p.showPassword ? "text" : "password"}
                    id="loginPassword"
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={p.togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {p.showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={p.rememberMe}
                    onChange={(e) => p.setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-50 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    {p.Lang.rememberMe || "Remember me"}
                  </span>
                </label>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  {p.Lang.forgotPassword || "Forgot password?"}
                </a>
              </div>

              {/* Login Button - Matching Website Button Style */}
              <button
                type="submit"
                id="loginBtn"
                disabled={p.isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {p.isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                <p className="text-sm text-gray-600">
                  {p.Lang.dontHaveAccount || "Don't have an account?"}{" "}
                  <a
                    href="#"
                    onClick={p.showRegister}
                    id="registerLink"
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                  >
                    {p.Lang.createANewAccount || "Create an account"}
                  </a>
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{p.Lang.or || "Or"}</span>
                </div>
              </div>

              {/* Back to Website Button - Matching Website Secondary Button */}
              <button
                type="button"
                onClick={p.OpenWebsite}
                id="backToWebsiteBtn"
                className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all duration-300 flex items-center justify-center space-x-2 group"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>{p.Lang.backToTheSite}</span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              &copy; 2026 ESSA. {p.Lang.allRightsReserved || "All rights reserved."}
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes aurora { 
          0% { background-position: 0% 50%; } 
          50% { background-position: 100% 50%; } 
          100% { background-position: 0% 50%; } 
        }
        
        .animate-aurora { 
          animation: aurora 8s linear infinite; 
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #4f46e5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #4338ca);
        }
        
        /* RTL Support */
        [dir="rtl"] .pl-10 {
          padding-left: 0.75rem;
          padding-right: 2.5rem;
        }
        
        [dir="rtl"] .pl-3 {
          padding-left: 0;
          padding-right: 0.75rem;
        }
        
        [dir="rtl"] .pr-3 {
          padding-right: 0;
          padding-left: 0.75rem;
        }
        
        [dir="rtl"] .pr-12 {
          padding-right: 0;
          padding-left: 3rem;
        }
        
        [dir="rtl"] .space-x-2 > :not([hidden]) ~ :not([hidden]) {
          --tw-space-x-reverse: 1;
          margin-right: calc(0.5rem * var(--tw-space-x-reverse));
          margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
        }
        
        [dir="rtl"] .group-hover\\:-translate-x-1:hover {
          transform: translateX(0.25rem);
        }
        
        /* Loading animation */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}