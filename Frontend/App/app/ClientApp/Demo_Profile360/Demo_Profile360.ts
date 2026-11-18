/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { Profile360Config } from "../Shared/Components/Import/Patterns/ModelProfile360";
import { createLocalProvider } from "../Shared/Components/Import/Patterns/patternKit";

// =======================
// #region بيانات وهمية — ملف مريض
// =======================
const Patients = [
  { PatientID: 1, NameAr: "أحمد محمد علي", NameEn: "Ahmed Mohamed Ali", MRN: "MRN-000123", Phone: "01001234567", Gender: "M", BirthDate: "1985-03-14",
    Insurance: "AXA", Status: "active", Balance: 1250.5, VisitsCount: 240, LastVisit: "2026-11-02", Allergies: "Penicillin", BloodType: "O+" },
  { PatientID: 2, NameAr: "منى حسن", NameEn: "Mona Hassan", MRN: "MRN-000124", Phone: "01111111111", Gender: "F", BirthDate: "1992-07-01",
    Insurance: "", Status: "blocked", Balance: 0, VisitsCount: 3, LastVisit: "2026-10-12", Allergies: "", BloodType: "A-" },
];
const Visits = Array.from({ length: 240 }, (_, i) => ({
  VisitID: i + 1, PatientID: 1,
  VisitDate: new Date(Date.UTC(2026, 10, 2) - i * 86400000 * 3).toISOString().substring(0, 10),
  Doctor: ["د. سامي", "د. هالة", "د. كريم"][i % 3], Diagnosis: ["Flu", "Check-up", "Hypertension", "Back pain"][i % 4],
  Amount: 150 + (i % 5) * 50, Status: ["done", "done", "noshow", "booked"][i % 4],
})).concat([{ VisitID: 999, PatientID: 2, VisitDate: "2026-10-12", Doctor: "د. هالة", Diagnosis: "Check-up", Amount: 200, Status: "done" }]);
const Events = Array.from({ length: 40 }, (_, i) => ({
  EventID: i + 1, PatientID: 1, EventTime: new Date(Date.UTC(2026, 10, 2, 10) - i * 3600000 * 20).toISOString().substring(0, 16),
  Title: ["Registered", "Lab order", "Result released", "Invoice paid", "Appointment booked"][i % 5],
  Note: i % 2 ? "CBC + Lipid profile" : "", User: ["reception", "lab", "cashier"][i % 3], Kind: ["info", "lab", "ok", "money", "info"][i % 5],
}));
const Notes: any[] = [
  { NoteID: 1, PatientID: 1, Text: "المريض يفضل المواعيد الصباحية", User: "reception", CreatedAt: "2026-10-01T09:00" },
];
const provider = createLocalProvider({ Patients, Visits, Events, Notes }, 100);
// #endregion

// =======================
// Demo_Profile360  (P05)
// =======================
export function Demo_Profile360() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [PatientID, setPatientID] = useState(1);

  const Config = useMemo<Profile360Config>(() => ({
    entity: { tableName: "Patients", keyField: "PatientID" },
    header: {
      titleField: "NameAr", titleFieldEn: "NameEn", subtitleField: "MRN",
      badges: [
        { field: "Status", statuses: [
          { value: "active", label: { en: "Active", ar: "فعال" }, color: "#10B981" },
          { value: "blocked", label: { en: "Blocked", ar: "موقوف" }, color: "#F43F5E", icon: "⛔" },
        ] },
        { field: "Insurance", prefix: { en: "Insurance:", ar: "تأمين:" } },
        { field: "BloodType", prefix: "🩸" },
      ],
      infoFields: [
        { field: "Phone", label: { en: "Phone", ar: "تليفون" } },
        { field: "BirthDate", label: { en: "Birth date", ar: "تاريخ الميلاد" }, format: "date" },
      ],
      stats: [
        { field: "Balance", label: { en: "Balance", ar: "الرصيد" }, format: "money", color: "#F43F5E" },
        { field: "VisitsCount", label: { en: "Visits", ar: "الزيارات" }, format: "number" },
        { field: "LastVisit", label: { en: "Last visit", ar: "آخر زيارة" }, format: "date" },
        { field: "Allergies", label: { en: "Allergies", ar: "حساسية" } },
      ],
    },
    quickActions: [
      { id: "newAppointment", label: { en: "New appointment", ar: "موعد جديد" }, icon: "📅", variant: "primary" },
      { id: "newInvoice", label: { en: "New invoice", ar: "فاتورة جديدة" }, icon: "🧾" },
    ],
    tabs: [
      { id: "info", kind: "fields", label: { en: "Info", ar: "البيانات" }, icon: "📇", fields: [
        { field: "MRN", label: { en: "MRN", ar: "رقم الملف" } },
        { field: "Gender", label: { en: "Gender", ar: "النوع" } },
        { field: "BirthDate", label: { en: "Birth date", ar: "تاريخ الميلاد" }, format: "date" },
        { field: "Insurance", label: { en: "Insurance", ar: "التأمين" } },
        { field: "Allergies", label: { en: "Allergies", ar: "الحساسية" }, span: 2 },
      ] },
      { id: "visits", kind: "list", label: { en: "Visits", ar: "الزيارات" }, icon: "🩺", countField: "VisitsCount",
        source: { tableName: "Visits", keyField: "VisitID", orderBy: "VisitDate", orderType: "DESC" }, foreignKey: "PatientID",
        loadMode: "pages", pageSize: 15, searchFields: ["Doctor", "Diagnosis"],
        columns: [
          { field: "VisitDate", label: { en: "Date", ar: "التاريخ" }, format: "date", mobile: true },
          { field: "Doctor", label: { en: "Doctor", ar: "الطبيب" }, mobile: true },
          { field: "Diagnosis", label: { en: "Diagnosis", ar: "التشخيص" } },
          { field: "Amount", label: { en: "Amount", ar: "المبلغ" }, format: "money", mobile: true },
        ],
        statusField: "Status", statuses: [
          { value: "done", label: { en: "Done", ar: "تمت" }, color: "#10B981" },
          { value: "booked", label: { en: "Booked", ar: "محجوز" }, color: "#3B82F6" },
          { value: "noshow", label: { en: "No-show", ar: "لم يحضر" }, color: "#F59E0B" },
        ] },
      { id: "timeline", kind: "timeline", label: { en: "Timeline", ar: "الخط الزمني" }, icon: "🕒",
        source: { tableName: "Events", keyField: "EventID" }, foreignKey: "PatientID", timeField: "EventTime", titleField: "Title",
        noteField: "Note", userField: "User", statusField: "Kind", statuses: [
          { value: "info", label: { en: "Info", ar: "معلومة" }, color: "#06B6D4" },
          { value: "lab", label: { en: "Lab", ar: "معمل" }, color: "#8B5CF6" },
          { value: "ok", label: { en: "Done", ar: "تم" }, color: "#10B981" },
          { value: "money", label: { en: "Payment", ar: "دفع" }, color: "#F59E0B" },
        ] },
      { id: "notes", kind: "notes", label: { en: "Notes", ar: "ملاحظات" }, icon: "📝",
        source: { tableName: "Notes", keyField: "NoteID" }, foreignKey: "PatientID", textField: "Text", userField: "User", timeField: "CreatedAt", allowAdd: true },
      { id: "kpi", kind: "kpis", label: { en: "Summary", ar: "ملخص" }, icon: "📊", items: [
        { field: "VisitsCount", label: { en: "Visits", ar: "الزيارات" }, format: "number" },
        { field: "Balance", label: { en: "Balance", ar: "الرصيد" }, format: "money", color: "#F43F5E" },
      ] },
    ],
  }), []);

  function OnAction(id: string, rec: Record<string, any>) {
    Sys.ShowMessage(`Action "${id}" for ${rec.NameEn}`, `الإجراء "${id}" للمريض ${rec.NameAr}`, "info");
  }
  function OnRowClick(tabId: string, row: Record<string, any>) {
    Sys.ShowMessage(`Open ${tabId} #${row.VisitID ?? ""}`, `فتح ${tabId} رقم ${row.VisitID ?? ""}`, "info");
  }
  async function OnAddNote(_tabId: string, text: string, rec: Record<string, any>) {
    Notes.push({ NoteID: Notes.length + 1, PatientID: rec.PatientID, Text: text, User: "me", CreatedAt: new Date().toISOString().substring(0, 16) });
    Sys.ShowMessage("Note added", "تمت إضافة الملاحظة", "success");
  }

  const state = { IsLangEN, Config, PatientID, provider, Patients };
  const actions = { t, setPatientID, OnAction, OnRowClick, OnAddNote };
  return { ...state, ...actions };
}
