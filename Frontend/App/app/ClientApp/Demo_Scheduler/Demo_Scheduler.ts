/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { SchedulerConfig, SchedulerEvent } from "../Shared/Components/Import/Patterns/ModelScheduler";
import { createLocalProvider } from "../Shared/Components/Import/Patterns/patternKit";
import { toLocalStr } from "../Shared/Components/Import/Patterns/Scheduler";

// =======================
// #region بيانات وهمية — مواعيد عيادة (3 دكاترة، ±30 يوم من النهارده)
// =======================
const Patients = ["أحمد", "منى", "كريم", "سارة", "يوسف", "ليلى", "عمر", "هبة"];
function seed() {
  const out: any[] = [];
  const base = new Date();
  let id = 1;
  for (let d = -30; d <= 30; d++) {
    for (let k = 0; k < 6; k++) {
      if ((d + k) % 3 === 0) continue;
      const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d, 9 + k * 2, (k % 2) * 30);
      out.push({
        AppID: id++, DoctorID: (k % 3) + 1, StartAt: toLocalStr(start), Duration: k % 2 ? 30 : 45,
        Patient: Patients[(id + d + 40) % Patients.length], Type: ["Consultation", "Follow-up", "Procedure"][k % 3],
        Status: d < 0 ? (k % 4 === 0 ? "noshow" : "done") : k % 3 === 0 ? "arrived" : "booked",
      });
    }
  }
  return out;
}
const Appointments: any[] = seed();
const provider = createLocalProvider({ Appointments }, 60);
// #endregion

// =======================
// Demo_Scheduler  (P07)
// =======================
export function Demo_Scheduler() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [ReloadKey, setReloadKey] = useState(0);

  const Config = useMemo<SchedulerConfig>(() => ({
    events: {
      source: { tableName: "Appointments", keyField: "AppID", orderBy: "StartAt" },
      idField: "AppID", startField: "StartAt", durationField: "Duration",
      titleField: "Patient", subtitleField: "Type", resourceField: "DoctorID", statusField: "Status",
    },
    resources: [
      { id: 1, label: { en: "Dr. Sami", ar: "د. سامي" }, color: "#0D9488", workStart: "09:00", workEnd: "17:00" },
      { id: 2, label: { en: "Dr. Hala", ar: "د. هالة" }, color: "#8B5CF6", workStart: "10:00", workEnd: "20:00" },
      { id: 3, label: { en: "Dr. Karim", ar: "د. كريم" }, color: "#F59E0B" },
    ],
    statuses: [
      { value: "booked", label: { en: "Booked", ar: "محجوز" }, color: "#3B82F6" },
      { value: "arrived", label: { en: "Arrived", ar: "وصل" }, color: "#10B981" },
      { value: "done", label: { en: "Done", ar: "تم" }, color: "#64748B" },
      { value: "noshow", label: { en: "No-show", ar: "لم يحضر" }, color: "#F43F5E" },
    ],
    views: ["resource", "day", "week", "month", "agenda"],
    defaultView: "resource",
    mobileView: "agenda",
    slotMinutes: 30, dayStart: "08:00", dayEnd: "21:00", weekStartsOn: 6,
    overlap: "warn", capacity: 1, allowDrag: true, defaultDuration: 30,
  }), []);

  function OnSlotClick(start: string, _end: string, resourceId?: any) {
    Appointments.push({ AppID: Appointments.length + 1000, DoctorID: resourceId ?? 1, StartAt: start, Duration: 30, Patient: IsLangEN ? "New patient" : "مريض جديد", Type: "Consultation", Status: "booked" });
    setReloadKey((k) => k + 1);
    Sys.ShowMessage(`Booked at ${start.replace("T", " ")}`, `تم الحجز ${start.replace("T", " ")}`, "success");
  }
  function OnEventClick(ev: SchedulerEvent) {
    Sys.ShowMessage(`${ev.title} — ${ev.subtitle}`, `${ev.title} — ${ev.subtitle}`, "info");
  }
  function OnEventMove(ev: SchedulerEvent, newStart: string, _newEnd: string, newResource?: any) {
    const row = Appointments.find((a) => a.AppID === ev.id);
    if (!row) return false;
    row.StartAt = newStart;
    if (newResource !== undefined) row.DoctorID = newResource;
    Sys.ShowMessage("Appointment moved", "تم نقل الموعد", "success");
    return true;
  }

  const state = { IsLangEN, Config, ReloadKey, provider };
  const actions = { t, OnSlotClick, OnEventClick, OnEventMove };
  return { ...state, ...actions };
}
