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

const lcField =
    "w-full h-12 ps-10 pe-3 bg-erp-surface border border-erp-border-strong rounded-lg text-[14px] text-erp-text focus:outline-none focus:border-erp-accent focus:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition disabled:opacity-50 disabled:cursor-not-allowed";

function LoginCompanyPage(p: Props) {
    return (
        <>
            {p.stylesheet}
            <div className="relative min-h-screen bg-erp-canvas text-erp-text flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-32 -end-32 size-96 rounded-full bg-erp-accent opacity-[0.07] blur-3xl"></div>
                    <div className="absolute -bottom-32 -start-32 size-96 rounded-full bg-erp-info opacity-[0.06] blur-3xl"></div>
                </div>

                {/* Main Card */}
                <div className="relative w-full max-w-2xl">
                    <div className="rounded-xl bg-erp-surface border border-erp-border shadow-erp-3 p-6 sm:p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="inline-flex items-center justify-center size-12 bg-erp-primary text-erp-on-primary rounded-xl mb-4">
                                <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                                </svg>
                            </div>
                            <h2 className="text-[22px] sm:text-[28px] leading-9 font-bold text-erp-text mb-1">
                                {p.Lang.welcome || "Welcome"}
                            </h2>
                            <p className="text-erp-text-muted text-[13px]">
                                {p.Lang.pleaseSelectYourOrganizationData || "Please select your organization data to continue"}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={(e) => { e.preventDefault(); p.confirmCompanySelection(); }} className="space-y-5">
                            {/* Company Dropdown */}
                            <div className="space-y-1.5">
                                <label className="block text-[13px] font-medium text-erp-text">
                                    <i className="fas fa-building me-2 text-erp-text-subtle"></i>
                                    {p.Lang.company || "Company"}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none z-10">
                                        <svg className="size-5 text-erp-text-subtle group-focus-within:text-erp-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className={lcField}
                                    />
                                </div>
                            </div>

                            {/* Branch Dropdown */}
                            <div className="space-y-1.5">
                                <label className="block text-[13px] font-medium text-erp-text">
                                    <i className="fas fa-code-branch me-2 text-erp-text-subtle"></i>
                                    {p.Lang.branch || "Branch"}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none z-10">
                                        <svg className="size-5 text-erp-text-subtle group-focus-within:text-erp-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className={lcField}
                                        disabled={!p.selectedCompany}
                                    />
                                </div>
                            </div>

                            {/* Year Dropdown */}
                            <div className="space-y-1.5">
                                <label className="block text-[13px] font-medium text-erp-text">
                                    <i className="fas fa-calendar-alt me-2 text-erp-text-subtle"></i>
                                    {p.Lang.fiscalYear || "Fiscal Year"}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none z-10">
                                        <svg className="size-5 text-erp-text-subtle group-focus-within:text-erp-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className={lcField}
                                        disabled={!p.selectedCompany}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={p.backToLoginFromCompany}
                                    id="backToLoginCompanyBtn"
                                    className="erp-focus flex-1 h-12 bg-erp-surface border border-erp-border text-erp-text font-semibold rounded-lg hover:bg-erp-surface-2 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="size-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span>{p.Lang.backToLogin || "Back to Login"}</span>
                                </button>

                                <button
                                    ref={p.confirmCompanyBtn}
                                    type="submit"
                                    id="confirmCompanyBtn"
                                    disabled={!p.selectedCompany || !p.selectedBranch || !p.selectedYear}
                                    className="erp-focus flex-1 h-12 bg-erp-accent text-white font-semibold rounded-lg hover:bg-erp-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <span>{p.Lang.confirmAndStartWorking || "Confirm & Continue"}</span>
                                    <svg className="size-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6">
                        <p className="text-xs text-erp-text-subtle">
                            &copy; 2026 ESSA. {p.Lang.allRightsReserved || "All rights reserved."}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
