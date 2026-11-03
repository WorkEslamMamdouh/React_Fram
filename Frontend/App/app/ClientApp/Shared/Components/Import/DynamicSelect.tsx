"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DynamicSelectConfig } from "./ModelGrid";
import { SQL } from "../../CallDataBase";
import { useSys } from "../../SystemUsing";

export interface DynamicSelectProps {
  config: DynamicSelectConfig;
  value?: any;
  onChange?: (value: any, attributes: Record<string, any>) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export default function DynamicSelect({
  config,
  value,
  onChange,
  disabled = false,
  error = false,
  className = "",
}: DynamicSelectProps) {
  const lang = useSys((s) => s.lang);
  const isDark = useSys((s) => s.IsDark);

  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const configRef = useRef<string>("");

  const configKey = `${config.tableName}|${config.displayField}|${config.valueField}|${config.condition || ""}|${(config.attributes || []).join(",")}|${config.orderBy || ""}|${config.orderType || ""}`;

  const t = useCallback(
    (en: string, ar: string) => (lang === "ar" ? ar : en),
    [lang]
  );

  const validAttributes = useMemo(() => {
    const attrs = config.attributes || [];
    if (attrs.length > 5) {
      console.warn(`DynamicSelect: attributes limited to 5 (got ${attrs.length})`);
    }
    return attrs.slice(0, 5);
  }, [config.attributes]);

  const selectedColumns = useMemo(
    () =>
      [config.valueField, config.displayField, ...validAttributes].filter(
        (col, i, arr) => arr.indexOf(col) === i
      ),
    [config.valueField, config.displayField, validAttributes]
  );

  useEffect(() => {
    if (fetchedRef.current && configRef.current === configKey) return;
    configRef.current = configKey;
    fetchedRef.current = true;

    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await SQL.Select(
          config.tableName,
          config.condition || "",
          selectedColumns,
          null,
          null,
          0,
          config.orderBy || config.valueField,
          config.orderType || "ASC"
        );
        if (!cancelled) {
          setOptions(result.data || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || err?.toString() || "Error");
          setOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOptions();
    return () => { cancelled = true; };
  }, [configKey]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === "") {
      onChange?.("", {});
      return;
    }

    const row = options.find(
      (r) => String(r[config.valueField]) === selectedValue
    );

    const attrs: Record<string, any> = {};
    if (row) {
      for (const attr of validAttributes) {
        attrs[attr] = row[attr] ?? null;
      }
    }

    onChange?.(row ? row[config.valueField] : selectedValue, attrs);
  };

  const baseClass =
    "w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";
  const themeClass = isDark
    ? "bg-gray-800 border-gray-600 text-gray-100"
    : "bg-white border-gray-300 text-gray-900";
  const errorClass = error ? "border-red-500 ring-1 ring-red-500" : "";
  const disabledClass = disabled
    ? "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800/40"
    : "";
  const rtlClass = lang === "ar" ? "text-right" : "text-left";

  const placeholderText = config.placeholder
    ? t(config.placeholder.en, config.placeholder.ar)
    : t("Select...", "اختر...");

  if (loadError) {
    return (
      <select
        className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass} ${rtlClass} ${className}`}
        disabled
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <option>{t("Error loading data", "خطأ في تحميل البيانات")}</option>
      </select>
    );
  }

  return (
    <select
      className={`${baseClass} ${themeClass} ${errorClass} ${disabledClass} ${rtlClass} ${className}`}
      value={value != null ? String(value) : ""}
      onChange={handleChange}
      disabled={disabled || loading}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <option value="">
        {loading ? t("Loading...", "جاري التحميل...") : placeholderText}
      </option>
      {options.map((row, idx) => (
        <option key={`${row[config.valueField]}-${idx}`} value={String(row[config.valueField])}>
          {row[config.displayField] ?? ""}
        </option>
      ))}
    </select>
  );
}
