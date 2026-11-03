"use client";

import { useEffect, useCallback, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { useScreenBuilder } from "./store/useScreenBuilder";
import { parseSettingsFromTs } from "./utils/configConverter";
import { generateHookFile, generatePageFile } from "./utils/codeGenerator";
import { ScreenConfigV4 } from "./types/ScreenConfig";

export function ScreenBuilder() {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);

  const store = useScreenBuilder();
  const [wizardType, setWizardType] = useState<"Grid" | "MasterDetail" | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        store.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNewScreen = useCallback((type: "Grid" | "MasterDetail") => {
    if (store.isDirty && !confirm(IsLangEN ? "Unsaved changes will be lost. Continue?" : "التغييرات هتضيع. متأكد؟")) return;
    setWizardType(type);
  }, [store.isDirty, IsLangEN]);

  const handleWizardComplete = useCallback((config: ScreenConfigV4) => {
    store.loadConfig(config);
    setWizardType(null);
  }, []);

  const handleWizardCancel = useCallback(() => {
    setWizardType(null);
  }, []);

  const handleLoadTemplate = useCallback((config: ScreenConfigV4) => {
    if (store.isDirty && !confirm(IsLangEN ? "Unsaved changes will be lost. Continue?" : "التغييرات هتضيع. متأكد؟")) return;
    store.loadConfig(config);
  }, [store.isDirty, IsLangEN]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ts,.tsx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const { v4 } = parseSettingsFromTs(text);
      if (v4) {
        store.loadConfig(v4);
      } else {
        try {
          const { Sys } = require("../Shared/SystemTools");
          Sys.ShowMessage("No settings found in file", "مفيش إعدادات في الملف", "warning");
        } catch {}
      }
    };
    input.click();
  }, []);

  const handleExport = useCallback(() => {
    const tsCode = generateHookFile(store.config);
    const pageCode = generatePageFile(store.config);
    const name = store.config.module || "NewScreen";

    downloadFile(`${name}.ts`, tsCode);
    downloadFile(`page.tsx`, pageCode);
  }, [store.config]);

  const handleSave = useCallback(() => {
    const tsCode = generateHookFile(store.config);
    const pageCode = generatePageFile(store.config);

    navigator.clipboard.writeText(tsCode);
    try {
      const { Sys } = require("../Shared/SystemTools");
      Sys.ShowMessage(
        "Code copied to clipboard! Also exported files.",
        "الكود اتنسخ! والملفات اتصدرت.",
        "success"
      );
    } catch {}

    downloadFile(`${store.config.module || "NewScreen"}.ts`, tsCode);
    downloadFile(`page.tsx`, pageCode);
  }, [store.config]);

  const handleGoBack = useCallback(() => {
    if (store.isDirty && !confirm(IsLangEN ? "Unsaved changes will be lost. Go back?" : "التغييرات هتضيع. ترجع؟")) return;
    store.goToWelcome();
  }, [store.isDirty, IsLangEN]);

  return {
    IsLangEN,
    IsDark,
    store,
    wizardType,
    handleNewScreen,
    handleWizardComplete,
    handleWizardCancel,
    handleLoadTemplate,
    handleImport,
    handleExport,
    handleSave,
    handleGoBack,
  };
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
