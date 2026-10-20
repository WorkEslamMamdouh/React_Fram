// ملف: LoginCompanyPage.tsx (المعدل بالكامل بتصميم احترافي)
"use client";

import { useEffect, useRef, useState } from "react";
import { LoginCompany } from "./LoginCompany";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import { SmartDropdown } from "../Shared/Components/SmartDropdown";

export default function InitalizeComponent() {
    const Lang = useTranslate();
    const IsLangEN = useSys((s) => s.IsLangEN);

    const stylesheet = IsLangEN ? (
        <link id="lang-style_LoginCompany" rel="stylesheet" href="/StyleDesign/Pages/LoginCompany/LoginCompanyEN.css" />
    ) : (
        <link id="lang-style_LoginCompany" rel="stylesheet" href="/StyleDesign/Pages/LoginCompany/LoginCompanyAR.css" />
    );

    const loginCompany = LoginCompany();
    return <LoginCompanyPage {...loginCompany} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof LoginCompany>;
type Props = _ReturnType & {
    Lang: ReturnType<typeof useTranslate>;
    stylesheet: any;
};

function LoginCompanyPage(p: Props) {
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

                {/* Main Card */}
                <div className="relative w-full max-w-2xl">
                    {/* Decorative elements */}
                    <div className="absolute -top-5 -left-5 w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-60 blur-xl"></div>
                    <div className="absolute -bottom-5 -right-5 w-20 h-20 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full opacity-60 blur-xl"></div>

                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-3xl">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4 transform transition-transform hover:scale-110 duration-300">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                    <path d="M17 21v-4H7v4" />
                                    <path d="M12 7v6" />
                                    <path d="M9 10h6" />
                                </svg>
                            </div>
                            <h2 className="text-2xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                                {p.Lang.welcome || "Welcome"}
                            </h2>
                            <p className="text-gray-500 text-sm sm:text-base">
                                {p.Lang.pleaseSelectYourOrganizationData || "Please select your organization data to continue"}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={(e) => { e.preventDefault(); p.confirmCompanySelection(); }} className="space-y-6">
                            {/* Company Dropdown */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    <i className="fas fa-building ml-2"></i>
                                    {p.Lang.company || "Company"}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <SmartDropdown
                                        datasource={p.DataCompany || []}
                                        valueField="CompCode"
                                        textField={p.IsLangEN ? "CompNameE" : "CompNameA"}
                                        defaultText={p.Lang.selectCompany || "Select Company"}
                                        isLangEN={p.IsLangEN}
                                        selectedValue={p.selectedCompany.toString()}
                                        onChange={p.handleCompanyChange}
                                        inputRef={p.companyRef}
                                        screenName="LoginCompany"
                                        dropdownId="CompanySelect"
                                        sortDesc={false}
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                                    />
                                </div>
                            </div>

                            {/* Branch Dropdown */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    <i className="fas fa-code-branch ml-2"></i>
                                    {p.Lang.branch || "Branch"}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    </div>
                                    <SmartDropdown
                                        datasource={p.filteredBranches || []}
                                        valueField="BranchCode"
                                        textField={p.IsLangEN ? "BranchDescE" : "BranchDescA"}
                                        defaultText={p.Lang.selectedBranch || "Select Branch"}
                                        isLangEN={p.IsLangEN}
                                        selectedValue={p.selectedBranch.toString()}
                                        onChange={p.handleBranchChange}
                                        inputRef={p.branchRef}
                                        screenName="LoginCompany"
                                        dropdownId="BranchSelect"
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!p.selectedCompany}
                                    />
                                </div>
                            </div>

                            {/* Year Dropdown */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    <i className="fas fa-calendar-alt ml-2"></i>
                                    {p.Lang.fiscalYear || "Fiscal Year"}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <SmartDropdown
                                        datasource={p.filteredYears || []}
                                        valueField="FinYear"
                                        textField="FinYear"
                                        defaultText={p.Lang.selectYear || "Select Year"}
                                        isLangEN={p.IsLangEN}
                                        selectedValue={p.selectedYear.toString()}
                                        onChange={p.handleYearChange}
                                        inputRef={p.yearRef}
                                        screenName="LoginCompany"
                                        dropdownId="YearSelect" 
                                        sortDesc={true}
                                        sortField="FinYear"
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!p.selectedCompany}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={p.backToLoginFromCompany}
                                    id="backToLoginCompanyBtn"
                                    className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all duration-300 flex items-center justify-center space-x-2 group"
                                >
                                    <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span>{p.Lang.backToLogin || "Back to Login"}</span>
                                </button>
                                
                                <button
                                    ref={p.confirmCompanyBtn}
                                    type="submit"
                                    id="confirmCompanyBtn"
                                    disabled={!p.selectedCompany || !p.selectedBranch || !p.selectedYear}
                                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
                                >
                                    <span>{p.Lang.confirmAndStartWorking || "Confirm & Continue"}</span>
                                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
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
                
                [dir="rtl"] .space-x-2 > :not([hidden]) ~ :not([hidden]) {
                    --tw-space-x-reverse: 1;
                    margin-right: calc(0.5rem * var(--tw-space-x-reverse));
                    margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
                }
                
                [dir="rtl"] .group-hover\\:-translate-x-1:hover {
                    transform: translateX(0.25rem);
                }
                
                [dir="rtl"] .group-hover\\:translate-x-1:hover {
                    transform: translateX(-0.25rem);
                }
            `}</style>
        </>
    );
}