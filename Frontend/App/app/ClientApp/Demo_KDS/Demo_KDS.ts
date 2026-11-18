/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import type { KitchenDisplayConfig } from "../Shared/Components/Import/Patterns/ModelKitchenDisplay";

// =======================
// #region بيانات وهمية — تذاكر مطبخ (وكل 25 ثانية بتوصل تذكرة جديدة)
// =======================
const Menu = [
  { name: "Burger", station: "grill" }, { name: "Grilled chicken", station: "grill" }, { name: "Steak", station: "grill" },
  { name: "Caesar salad", station: "cold" }, { name: "Greek salad", station: "cold" },
  { name: "Lemon mint", station: "bar" }, { name: "Latte", station: "bar" },
];
let seq = 1040;
function makeTicket(minutesAgo: number) {
  seq++;
  const n = 2 + (seq % 3);
  const items = Array.from({ length: n }, (_, i) => {
    const m = Menu[(seq + i * 3) % Menu.length];
    return { id: `${seq}-${i}`, name: m.name, station: m.station, qty: 1 + ((seq + i) % 2), course: m.station === "cold" ? 1 : 2,
      modifiers: m.name === "Burger" ? ["No onion", "Extra cheese"] : m.name === "Steak" ? ["Medium well"] : [], note: i === 0 && seq % 4 === 0 ? "Allergy: nuts" : "", done: false };
  });
  return { TicketID: seq, OrderNo: seq, Table: seq % 3 === 0 ? "" : `T${seq % 12}`, OrderType: seq % 3 === 0 ? "take" : "dine",
    CreatedAt: new Date(Date.now() - minutesAgo * 60000).toISOString(), Status: "new", Notes: seq % 5 === 0 ? "VIP table" : "", BumpedAt: null, Items: items };
}
// #endregion

// =======================
// Demo_KDS  (P18)
// =======================
export function Demo_KDS() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [Tickets, setTickets] = useState<any[]>(() => [makeTicket(17), makeTicket(11), makeTicket(6), makeTicket(2), makeTicket(0.5)]);
  const [Station, setStation] = useState("expo");

  // محاكاة طلبات جديدة (في الحقيقة: SignalR)
  useEffect(() => {
    const h = setInterval(() => setTickets((l) => [...l, makeTicket(0)]), 25000);
    return () => clearInterval(h);
  }, []);

  const Config = useMemo<KitchenDisplayConfig>(() => ({
    fields: { idField: "TicketID", numberField: "OrderNo", tableField: "Table", typeField: "OrderType", createdAtField: "CreatedAt", statusField: "Status", notesField: "Notes", bumpedAtField: "BumpedAt", itemsField: "Items" },
    stations: [
      { id: "expo", label: { en: "Expo (all)", ar: "التجميع (الكل)" } },
      { id: "grill", label: { en: "Grill", ar: "الشواية" }, accepts: ["grill"] },
      { id: "cold", label: { en: "Cold", ar: "البارد" }, accepts: ["cold"] },
      { id: "bar", label: { en: "Bar", ar: "البار" }, accepts: ["bar"] },
    ],
    statusValues: { new: "new", started: "started", done: "done" },
    thresholds: [{ fromMinutes: 0, color: "#10B981" }, { fromMinutes: 8, color: "#F59E0B" }, { fromMinutes: 15, color: "#F43F5E" }],
    showAllDay: true, recallCount: 8, soundOnNew: true, layout: "rail",
    typeLabels: { dine: { en: "Dine-in", ar: "صالة" }, take: { en: "Takeaway", ar: "تيك أواي" } },
  }), []);

  function Patch(id: any, fn: (r: any) => any) { setTickets((l) => l.map((r) => (r.TicketID === id ? { ...r, ...fn(r) } : r))); }
  function OnStart(tk: Record<string, any>) { Patch(tk.TicketID, () => ({ Status: "started" })); }
  function OnBumpItem(tk: Record<string, any>, itemId: string | number, done: boolean) {
    Patch(tk.TicketID, (r) => ({ Items: r.Items.map((it: any) => (it.id === itemId ? { ...it, done } : it)) }));
  }
  function OnBumpTicket(tk: Record<string, any>) {
    // محطة واحدة: بتعلّم أصنافها بس. Expo: بتقفل التذكرة كلها
    if (Station === "expo") Patch(tk.TicketID, () => ({ Status: "done", BumpedAt: new Date().toISOString() }));
    else {
      const st = Config.stations!.find((s) => s.id === Station);
      Patch(tk.TicketID, (r) => ({ Items: r.Items.map((it: any) => (st?.accepts?.includes(it.station) ? { ...it, done: true } : it)) }));
    }
  }
  function OnRecall(tk: Record<string, any>) { Patch(tk.TicketID, () => ({ Status: "started", BumpedAt: null })); }

  const state = { IsLangEN, Config, Tickets, Station };
  const actions = { t, setStation, OnStart, OnBumpItem, OnBumpTicket, OnRecall };
  return { ...state, ...actions };
}
