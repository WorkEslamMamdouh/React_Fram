/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { WizardConfig } from "../Shared/Components/Import/Patterns/ModelWizard";

// =======================
// Demo_Wizard  (P15) — اشتراك جديد في جيم
// =======================
export function Demo_Wizard() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const Config = useMemo<WizardConfig>(() => ({
    id: "Demo_Wizard_GymSignup",
    allowDraft: true,
    allowJumpBack: true,
    finishLabel: { en: "Create membership", ar: "إنشاء الاشتراك" },
    steps: [
      {
        id: "personal", icon: "👤", title: { en: "Member", ar: "بيانات العضو" },
        description: { en: "Basic contact information", ar: "البيانات الأساسية للتواصل" },
        fields: [
          { field: "FullName", label: { en: "Full name", ar: "الاسم بالكامل" }, required: true, span: 2 },
          { field: "Phone", label: { en: "Mobile", ar: "الموبايل" }, type: "phone", required: true, pattern: "^01[0125][0-9]{8}$", patternMessage: { en: "Egyptian mobile: 11 digits", ar: "موبايل مصري 11 رقم" } },
          { field: "Email", label: { en: "Email", ar: "الإيميل" }, type: "email" },
          { field: "Gender", label: { en: "Gender", ar: "النوع" }, type: "radio", required: true, options: [{ value: "M", label: { en: "Male", ar: "ذكر" } }, { value: "F", label: { en: "Female", ar: "أنثى" } }] },
          { field: "BirthDate", label: { en: "Birth date", ar: "تاريخ الميلاد" }, type: "date" },
        ],
      },
      {
        id: "plan", icon: "🏋", title: { en: "Plan", ar: "الباقة" },
        fields: [
          { field: "Plan", label: { en: "Plan", ar: "الباقة" }, type: "select", required: true, options: [
            { value: "day", label: { en: "Day pass", ar: "يوم واحد" } }, { value: "m1", label: { en: "1 month", ar: "شهر" } },
            { value: "m3", label: { en: "3 months", ar: "3 شهور" } }, { value: "y1", label: { en: "1 year", ar: "سنة" } },
          ] },
          { field: "StartDate", label: { en: "Start date", ar: "تاريخ البداية" }, type: "date", required: true },
          { field: "HasTrainer", label: { en: "Personal trainer", ar: "مدرب خاص" }, type: "checkbox", placeholder: { en: "Add a personal trainer", ar: "إضافة مدرب خاص" } },
          { field: "Trainer", label: { en: "Trainer", ar: "المدرب" }, type: "select", required: true, visibleWhen: { field: "HasTrainer", equals: true },
            options: [{ value: 1, label: { en: "Coach Hany", ar: "كابتن هاني" } }, { value: 2, label: { en: "Coach Rana", ar: "كابتن رنا" } }] },
        ],
      },
      {
        id: "health", icon: "❤", title: { en: "Health", ar: "الصحة" },
        description: { en: "Skipped for day passes", ar: "بتتخطى في اشتراك اليوم الواحد" },
        skipWhen: { field: "Plan", equals: "day" },
        fields: [
          { field: "Weight", label: { en: "Weight (kg)", ar: "الوزن (كجم)" }, type: "number", min: 30, max: 250 },
          { field: "Height", label: { en: "Height (cm)", ar: "الطول (سم)" }, type: "number", min: 100, max: 230 },
          { field: "Conditions", label: { en: "Medical conditions", ar: "أمراض مزمنة" }, type: "textarea" },
        ],
        validations: [
          { type: "compare", field: "Height", operator: ">", compareTo: "Weight", messageEn: "Height must be greater than weight (check units)", messageAr: "الطول لازم يكون أكبر من الوزن (راجع الوحدات)" },
        ],
      },
      {
        id: "payment", icon: "💳", title: { en: "Payment", ar: "الدفع" },
        fields: [
          { field: "PayMethod", label: { en: "Method", ar: "طريقة الدفع" }, type: "radio", required: true, options: [
            { value: "cash", label: { en: "Cash", ar: "كاش" } }, { value: "card", label: { en: "Card", ar: "فيزا" } }, { value: "inst", label: { en: "Installments", ar: "تقسيط" } },
          ] },
          { field: "Installments", label: { en: "Installments", ar: "عدد الأقساط" }, type: "select", required: true, visibleWhen: { field: "PayMethod", equals: "inst" },
            options: [{ value: 2, label: "2" }, { value: 3, label: "3" }, { value: 6, label: "6" }] },
          { field: "Agree", label: { en: "Terms", ar: "الشروط" }, type: "checkbox", required: true, placeholder: { en: "I agree to the gym rules", ar: "موافق على قواعد الجيم" }, span: 2 },
        ],
      },
      { id: "summary", icon: "✔", kind: "summary", title: { en: "Review", ar: "مراجعة" } },
    ],
  }), []);

  async function OnFinish(values: Record<string, any>) {
    // في الحقيقة: SQL.Insert / InsertMasterDetail + G_ProcessTrans ثم طباعة كارت العضوية
    Sys.ShowMessage(`Membership created for ${values.FullName}`, `تم إنشاء اشتراك ${values.FullName}`, "success");
    return true;
  }

  const state = { IsLangEN, Config };
  const actions = { t, OnFinish };
  return { ...state, ...actions };
}
