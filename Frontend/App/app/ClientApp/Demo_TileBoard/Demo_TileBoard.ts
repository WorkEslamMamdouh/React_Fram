/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { SessionCharge, TileBoardConfig } from "../Shared/Components/Import/Patterns/ModelTileBoard";
import { fmtNumber } from "../Shared/Components/Import/Patterns/patternKit";

// =======================
// #region بيانات وهمية — صالة بلايستيشن
// =======================
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
function seedDevices() {
  const rows: any[] = [];
  const types = ["PS5", "PS5", "PS4", "PS4", "PS5", "Billiard"];
  for (let i = 0; i < 16; i++) {
    const type = i >= 14 ? "Billiard" : types[i % 5];
    const status = i % 5 === 0 ? "free" : i % 7 === 0 ? "paused" : i === 11 ? "maintenance" : "running";
    const running = status === "running" || status === "paused";
    rows.push({
      DeviceID: i + 1, Name: type === "Billiard" ? `B${i - 13}` : `${type}-${i + 1}`, Type: type,
      Room: i < 8 ? "Room A" : i < 14 ? "VIP" : "Billiard",
      Status: status, Mode: i % 3 === 0 ? "multi" : "single",
      StartedAt: running ? ago(5 + i * 9) : null, PausedMs: 0, PausedAt: status === "paused" ? ago(2) : null,
      PrepaidMinutes: i === 3 ? 60 : i === 6 ? 45 : null, ItemsAmount: i % 4 === 0 && running ? 35 : 0,
      Customer: running ? ["Omar", "Ziad", "Team X", ""][i % 4] : "", Segments: null,
    });
  }
  return rows;
}
// #endregion

// =======================
// Demo_TileBoard  (P10)
// =======================
export function Demo_TileBoard() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [Devices, setDevices] = useState<any[]>(() => seedDevices());

  const Config = useMemo<TileBoardConfig>(() => ({
    idField: "DeviceID", labelField: "Name", typeField: "Type", groupField: "Room", statusField: "Status",
    runningStatuses: ["running"], pausedStatuses: ["paused"],
    statuses: [
      { value: "free", label: { en: "Free", ar: "فاضي" }, color: "#10B981", icon: "🎮" },
      { value: "running", label: { en: "Playing", ar: "شغال" }, color: "#F97316" },
      { value: "paused", label: { en: "Paused", ar: "موقوف مؤقت" }, color: "#3B82F6", icon: "⏸" },
      { value: "maintenance", label: { en: "Maintenance", ar: "صيانة" }, color: "#64748B", icon: "🛠" },
    ],
    session: {
      startField: "StartedAt", pausedMsField: "PausedMs", pausedAtField: "PausedAt", modeField: "Mode",
      segmentsField: "Segments", prepaidMinutesField: "PrepaidMinutes", itemsAmountField: "ItemsAmount", customerField: "Customer",
    },
    pricing: {
      currency: { en: "EGP", ar: "ج.م" },
      unit: "block", blockMinutes: 15, rounding: "up", minimumCharge: 10, graceMinutes: 3,
      rates: [
        { type: "PS5", mode: "single", perHour: 40, bands: [{ from: "00:00", to: "06:00", perHour: 30 }, { from: "18:00", to: "23:59", perHour: 50, days: [4, 5] }] },
        { type: "PS5", mode: "multi", perHour: 60 },
        { type: "PS4", mode: "single", perHour: 25 },
        { type: "PS4", mode: "multi", perHour: 35 },
        { type: "Billiard", perHour: 50 },
      ],
    },
    modeLabels: { single: { en: "Single", ar: "فردي" }, multi: { en: "Multi", ar: "زوجي/مالتي" } },
    actions: [
      { id: "start", label: { en: "Start (open)", ar: "بدء (مفتوح)" }, icon: "▶", variant: "primary", showForStatus: ["free"] },
      { id: "start60", label: { en: "Prepaid 1h", ar: "ساعة مدفوعة" }, icon: "⏱", showForStatus: ["free"] },
      { id: "pause", label: { en: "Pause", ar: "إيقاف مؤقت" }, icon: "⏸", showForStatus: ["running"] },
      { id: "resume", label: { en: "Resume", ar: "استكمال" }, icon: "▶", variant: "primary", showForStatus: ["paused"] },
      { id: "mode", label: { en: "Switch single/multi", ar: "تبديل فردي/مالتي" }, icon: "🔁", showForStatus: ["running"] },
      { id: "items", label: { en: "Add snacks (+25)", ar: "إضافة مشروب (+25)" }, icon: "🥤", showForStatus: ["running", "paused"] },
      { id: "end", label: { en: "End & checkout", ar: "إنهاء ومحاسبة" }, icon: "💵", variant: "success", showForStatus: ["running", "paused"], confirm: { en: "End session and checkout?", ar: "إنهاء الجلسة والمحاسبة؟" } },
      { id: "maint", label: { en: "Maintenance", ar: "صيانة" }, icon: "🛠", variant: "danger", showForStatus: ["free"] },
      { id: "ready", label: { en: "Ready", ar: "جاهز" }, icon: "✅", showForStatus: ["maintenance"] },
    ],
    tileSize: "md", alertBeforeEndMinutes: 5,
  }), []);

  function Patch(id: any, fn: (r: any) => any) {
    setDevices((list) => list.map((r) => (r.DeviceID === id ? { ...r, ...fn(r) } : r)));
  }

  function OnAction(actionId: string, row: Record<string, any>, charge: SessionCharge | null) {
    const now = new Date().toISOString();
    switch (actionId) {
      case "start": Patch(row.DeviceID, () => ({ Status: "running", StartedAt: now, PausedMs: 0, PausedAt: null, PrepaidMinutes: null, ItemsAmount: 0, Segments: null })); break;
      case "start60": Patch(row.DeviceID, () => ({ Status: "running", StartedAt: now, PausedMs: 0, PausedAt: null, PrepaidMinutes: 60, ItemsAmount: 0, Segments: null })); break;
      case "pause": Patch(row.DeviceID, () => ({ Status: "paused", PausedAt: now })); break;
      case "resume": Patch(row.DeviceID, (r) => ({ Status: "running", PausedMs: (r.PausedMs || 0) + (Date.now() - new Date(r.PausedAt).getTime()), PausedAt: null })); break;
      case "mode": Patch(row.DeviceID, (r) => {
        const next = r.Mode === "multi" ? "single" : "multi";
        const segs = r.Segments || [{ mode: r.Mode, start: r.StartedAt }];
        return { Mode: next, Segments: [...segs, { mode: next, start: now }] };
      }); break;
      case "items": Patch(row.DeviceID, (r) => ({ ItemsAmount: (r.ItemsAmount || 0) + 25 })); break;
      case "end":
        Sys.ShowMessage(`${row.Name}: total ${fmtNumber(charge?.total || 0)} EGP`, `${row.Name}: الإجمالي ${fmtNumber(charge?.total || 0)} ج.م`, "success");
        Patch(row.DeviceID, () => ({ Status: "free", StartedAt: null, PausedAt: null, PausedMs: 0, PrepaidMinutes: null, ItemsAmount: 0, Customer: "", Segments: null }));
        break;
      case "maint": Patch(row.DeviceID, () => ({ Status: "maintenance" })); break;
      case "ready": Patch(row.DeviceID, () => ({ Status: "free" })); break;
    }
  }

  function OnAlert(row: Record<string, any>, remaining: number) {
    Sys.ShowMessage(`${row.Name}: ${Math.max(0, Math.round(remaining))} min left`, `${row.Name}: باقي ${Math.max(0, Math.round(remaining))} دقيقة`, "warning");
  }

  const state = { IsLangEN, Config, Devices };
  const actions = { t, OnAction, OnAlert };
  return { ...state, ...actions };
}
