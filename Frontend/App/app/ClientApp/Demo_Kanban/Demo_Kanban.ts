/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { KanbanConfig } from "../Shared/Components/Import/Patterns/ModelKanban";
import { createLocalProvider } from "../Shared/Components/Import/Patterns/patternKit";

// =======================
// #region بيانات وهمية — فرص بيع CRM (400 فرصة)
// =======================
const Stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
const Leads: any[] = Array.from({ length: 400 }, (_, i) => ({
  LeadID: i + 1,
  Title: `${["Office furniture", "POS system", "Annual maintenance", "ERP license", "Printers"][i % 5]} — ${["Nile Co.", "Delta Foods", "Cairo Mall", "Alex Pharma", "Giza Steel"][i % 5]}`,
  Customer: ["Nile Co.", "Delta Foods", "Cairo Mall", "Alex Pharma", "Giza Steel"][i % 5],
  Stage: Stages[i % 7 === 0 ? 5 : i % 6 === 0 ? 4 : i % 4],
  Amount: 5000 + (i * 1371) % 95000,
  CloseDate: `2026-${String(11 + (i % 2)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`,
  Owner: ["Ali", "Mona", "Sara", "Omar"][i % 4],
  Priority: ["high", "normal", "low"][i % 3],
}));
const provider = createLocalProvider({ Leads }, 120);
// #endregion

// =======================
// Demo_Kanban  (P06)
// =======================
export function Demo_Kanban() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const Config = useMemo<KanbanConfig>(() => ({
    source: { tableName: "Leads", keyField: "LeadID", orderBy: "LeadID", orderType: "DESC" },
    idField: "LeadID", statusField: "Stage", titleField: "Title", subtitleField: "Customer",
    amountField: "Amount", dateField: "CloseDate", assigneeField: "Owner",
    badges: [{ field: "Priority", statuses: [
      { value: "high", label: { en: "High", ar: "عالية" }, color: "#F43F5E" },
      { value: "normal", label: { en: "Normal", ar: "عادية" }, color: "#3B82F6" },
      { value: "low", label: { en: "Low", ar: "منخفضة" }, color: "#64748B" },
    ] }],
    columns: [
      { value: "new", label: { en: "New", ar: "جديد" }, color: "#06B6D4" },
      { value: "qualified", label: { en: "Qualified", ar: "مؤهل" }, color: "#3B82F6" },
      { value: "proposal", label: { en: "Proposal", ar: "عرض سعر" }, color: "#8B5CF6" },
      { value: "negotiation", label: { en: "Negotiation", ar: "تفاوض" }, color: "#F59E0B", wipLimit: 80 },
      { value: "won", label: { en: "Won", ar: "تم البيع" }, color: "#10B981" },
      { value: "lost", label: { en: "Lost", ar: "خسارة" }, color: "#F43F5E" },
    ],
    transitions: {
      new: ["qualified", "lost"],
      qualified: ["proposal", "lost"],
      proposal: ["negotiation", "won", "lost"],
      negotiation: ["proposal", "won", "lost"],
      won: [],
      lost: ["new"],
    },
    pageSize: 20,
    wipRule: "warn",
  }), []);

  async function OnMove(card: Record<string, any>, _from: string | number, to: string | number) {
    // في الحقيقة: SQL.Update أو G_ProcessTrans (TrType حسب الانتقال)
    const row = Leads.find((l) => l.LeadID === card.LeadID);
    if (row) row.Stage = to;
    return true;
  }
  function OnCardClick(card: Record<string, any>) {
    Sys.ShowMessage(`Open lead #${card.LeadID}`, `فتح الفرصة رقم ${card.LeadID}`, "info");
  }

  const state = { IsLangEN, Config, provider };
  const actions = { t, OnMove, OnCardClick };
  return { ...state, ...actions };
}
