/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { FloorPlanConfig } from "../Shared/Components/Import/Patterns/ModelFloorPlan";

// =======================
// #region بيانات وهمية — صالة مطعم (منطقتين)
// =======================
const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
function seedTables() {
  const st = ["free", "occupied", "reserved", "served", "bill", "cleaning", "free", "occupied", "oos", "free", "occupied", "free"];
  const rows: any[] = [];
  for (let i = 0; i < 12; i++) {
    const s = st[i];
    rows.push({
      TableID: i + 1, AreaID: 1, TableNo: `T${i + 1}`, X: 40 + (i % 4) * 230, Y: 40 + Math.floor(i / 4) * 190,
      W: i % 3 === 0 ? 110 : 140, H: i % 3 === 0 ? 110 : 100, Shape: i % 3 === 0 ? "round" : "rect", Seats: i % 3 === 0 ? 4 : 6,
      Status: s, Guests: ["occupied", "served", "bill"].includes(s) ? 2 + (i % 4) : 0,
      OpenedAt: ["occupied", "served", "bill"].includes(s) ? minutesAgo(10 + i * 7) : null,
      Amount: ["occupied", "served", "bill"].includes(s) ? 150 + i * 45 : 0, Waiter: ["سعيد", "مها", "علي"][i % 3],
    });
  }
  for (let i = 0; i < 6; i++) {
    rows.push({
      TableID: 100 + i, AreaID: 2, TableNo: `G${i + 1}`, X: 60 + (i % 3) * 300, Y: 80 + Math.floor(i / 3) * 260,
      W: 160, H: 120, Shape: "rect", Seats: 8, Status: i % 2 ? "free" : "occupied", Guests: i % 2 ? 0 : 5,
      OpenedAt: i % 2 ? null : minutesAgo(25 + i * 3), Amount: i % 2 ? 0 : 640, Waiter: "علي",
    });
  }
  return rows;
}
// #endregion

// =======================
// Demo_FloorPlan  (P09)
// =======================
export function Demo_FloorPlan() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [Tables, setTables] = useState<any[]>(() => seedTables());
  const [EditMode, setEditMode] = useState(false);

  const Config = useMemo<FloorPlanConfig>(() => ({
    areas: [
      { id: 1, label: { en: "Main hall", ar: "الصالة الرئيسية" } },
      { id: 2, label: { en: "Garden", ar: "الجنينة" }, width: 1000, height: 560 },
    ],
    canvas: { width: 960, height: 600, grid: 10 },
    objects: {
      idField: "TableID", areaField: "AreaID", labelField: "TableNo", xField: "X", yField: "Y", wField: "W", hField: "H",
      shapeField: "Shape", seatsField: "Seats", statusField: "Status", openedAtField: "OpenedAt", guestsField: "Guests",
      amountField: "Amount", waiterField: "Waiter",
    },
    statuses: [
      { value: "free", label: { en: "Free", ar: "فاضية" }, color: "#10B981" },
      { value: "reserved", label: { en: "Reserved", ar: "محجوزة" }, color: "#3B82F6" },
      { value: "occupied", label: { en: "Occupied", ar: "مشغولة" }, color: "#F97316" },
      { value: "served", label: { en: "Served", ar: "تم التقديم" }, color: "#F59E0B" },
      { value: "bill", label: { en: "Bill requested", ar: "طلب الحساب" }, color: "#8B5CF6", blink: true },
      { value: "cleaning", label: { en: "Cleaning", ar: "تحتاج تنظيف" }, color: "#64748B" },
      { value: "oos", label: { en: "Out of service", ar: "خارج الخدمة" }, color: "#334155", icon: "⛔" },
    ],
    clickAction: { free: "openOrder" },
    actions: [
      { id: "openOrder", label: { en: "Open order", ar: "فتح طلب" }, icon: "🧾", variant: "primary", showForStatus: ["free"] },
      { id: "reserve", label: { en: "Reserve", ar: "حجز" }, icon: "📅", showForStatus: ["free"] },
      { id: "seat", label: { en: "Seat guests", ar: "إجلاس الضيوف" }, icon: "🪑", variant: "primary", showForStatus: ["reserved"] },
      { id: "served", label: { en: "Mark served", ar: "تم التقديم" }, icon: "🍽", showForStatus: ["occupied"] },
      { id: "bill", label: { en: "Print bill", ar: "طباعة الحساب" }, icon: "🖨", variant: "warning", showForStatus: ["occupied", "served"] },
      { id: "pay", label: { en: "Pay & close", ar: "دفع وإغلاق" }, icon: "💵", variant: "success", showForStatus: ["bill"] },
      { id: "clear", label: { en: "Cleared", ar: "تم التنظيف" }, icon: "🧽", showForStatus: ["cleaning"] },
      { id: "oos", label: { en: "Out of service", ar: "خارج الخدمة" }, icon: "⛔", variant: "danger", showForStatus: ["free", "cleaning"], confirm: { en: "Mark table out of service?", ar: "تخلي الترابيزة خارج الخدمة؟" } },
      { id: "back", label: { en: "Back in service", ar: "رجوع للخدمة" }, icon: "✅", showForStatus: ["oos"] },
    ],
    phoneLayout: "tiles",
  }), []);

  // تحديث حالة ترابيزة (في الحقيقة: Update + تحديث لحظي SignalR)
  function Patch(id: any, patch: Record<string, any>) {
    setTables((list) => list.map((x) => (x.TableID === id ? { ...x, ...patch } : x)));
  }

  function OnAction(actionId: string, obj: Record<string, any>) {
    const id = obj.TableID;
    switch (actionId) {
      case "openOrder": Patch(id, { Status: "occupied", Guests: 2, OpenedAt: new Date().toISOString(), Amount: 0 }); break;
      case "reserve": Patch(id, { Status: "reserved" }); break;
      case "seat": Patch(id, { Status: "occupied", Guests: obj.Seats, OpenedAt: new Date().toISOString() }); break;
      case "served": Patch(id, { Status: "served" }); break;
      case "bill": Patch(id, { Status: "bill" }); break;
      case "pay": Patch(id, { Status: "cleaning", Guests: 0, OpenedAt: null, Amount: 0 }); break;
      case "clear": Patch(id, { Status: "free" }); break;
      case "oos": Patch(id, { Status: "oos" }); break;
      case "back": Patch(id, { Status: "free" }); break;
    }
    Sys.ShowMessage(`${obj.TableNo}: ${actionId}`, `${obj.TableNo}: ${actionId}`, "success");
  }

  function OnMove(obj: Record<string, any>, x: number, y: number) {
    Patch(obj.TableID, { X: x, Y: y });
  }

  const state = { IsLangEN, Config, Tables, EditMode };
  const actions = { t, OnAction, OnMove, setEditMode };
  return { ...state, ...actions };
}
