"use client";

import { useMemo, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import type { ScanEvent, ScanParsed, ScanTaskConfig } from "../Shared/Components/Import/Patterns/ModelScanTask";

// =======================
// #region بيانات وهمية — استلام بضاعة (GRN) بقايمة متوقعة + ماستر أصناف للجرد الأعمى
// =======================
const GrnLines = [
  { LineID: 1, ItemID: 101, Name: "Panadol 500mg (box)", Barcode: "6221234567890", Expected: 6, Bin: "A-01" },
  { LineID: 2, ItemID: 102, Name: "Vitamin C 1000 (box)", Barcode: "6221234567906", Expected: 4, Bin: "A-01" },
  { LineID: 3, ItemID: 103, Name: "Bandage 10cm", Barcode: "6221234567913,123", Expected: 10, Bin: "B-07" },
];
const ItemMaster = [...GrnLines.map((l) => ({ ...l, Expected: 0 })), { LineID: 4, ItemID: 104, Name: "Hand gel 250ml", Barcode: "6221234567920", Expected: 0, Bin: "" }];
// #endregion

// =======================
// Demo_ScanTask  (P21)
// =======================
export function Demo_ScanTask() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const [Mode, setMode] = useState<"expected" | "blind">("expected");

  const Config = useMemo<ScanTaskConfig>(() => ({
    id: `Demo_ScanTask_${Mode}`,
    title: Mode === "expected" ? { en: "Receive PO #1045", ar: "استلام أمر شراء 1045" } : { en: "Blind stock count — Bin A-01", ar: "جرد أعمى — رف A-01" },
    mode: Mode,
    steps: Mode === "expected" ? ["location", "item"] : ["item", "qty"],
    lines: { keyField: "LineID", itemField: "ItemID", nameField: "Name", barcodeField: "Barcode", expectedQtyField: "Expected", locationField: Mode === "expected" ? "Bin" : undefined },
    qtyMode: Mode === "expected" ? "perScan" : "ask",
    tolerance: { overPercent: 0, rule: "warn" },
    gs1: true,
    blockExpired: true,
    feedback: { sound: true, vibrate: true },
    allowCamera: true,
  }), [Mode]);

  const Lines = Mode === "expected" ? GrnLines : [];

  function OnLookup(parsed: ScanParsed) {
    return ItemMaster.find((i) => i.Barcode.split(",").includes(parsed.lookup)) || null;
  }

  function OnComplete(events: ScanEvent[], totals: Record<string, number>) {
    // في الحقيقة: SQL.InsertMasterDetail (المسحات كسطور) أو bulk ثم G_ProcessTrans
    const n = Object.values(totals).reduce((a, b) => a + b, 0);
    Sys.ShowMessage(`Saved ${events.length} scans (${n} units)`, `تم حفظ ${events.length} مسحة (${n} وحدة)`, "success");
    return true;
  }

  const Samples = [
    "A-01", "6221234567890", "(01)06221234567906(10)LOT77(17)301231", "(01)06221234567906(17)200101", "123", "6221234567920",
  ];

  const state = { IsLangEN, Config, Lines, Mode, Samples };
  const actions = { t, setMode, OnLookup, OnComplete };
  return { ...state, ...actions };
}
