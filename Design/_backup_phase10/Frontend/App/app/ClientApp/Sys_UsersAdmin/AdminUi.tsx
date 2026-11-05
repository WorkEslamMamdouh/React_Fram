"use client";

// =====================================================================================
//  AdminUi.tsx  -  عناصر شكل صغيرة مشتركة بين شاشات الإدارة (erp-* tokens بس)
// =====================================================================================

import React, { useEffect } from "react";

export const inputCls =
  "h-9 w-full rounded-lg border border-erp-border-strong bg-erp-surface px-3 text-[13px] text-erp-text placeholder:text-erp-text-subtle " +
  "focus:outline-none focus:border-erp-accent focus:ring-2 focus:ring-erp-accent-soft disabled:bg-erp-surface-2 disabled:text-erp-text-muted";

export const btnBase =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-erp-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed max-md:h-11";

export const btnAccent = btnBase + " bg-erp-accent text-white hover:bg-erp-accent-hover";
export const btnOutline = btnBase + " border border-erp-border bg-erp-surface text-erp-text hover:bg-erp-surface-2";
export const btnDanger = btnBase + " border border-erp-danger-border bg-erp-danger-bg text-erp-danger-text hover:opacity-90";

export function Field({ label, required, error, children, hint }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-erp-text">
        {label} {required && <span className="text-erp-danger">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-erp-text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] text-erp-danger">{error}</span>}
    </label>
  );
}

export function Badge({ tone, children }: { tone: "success" | "danger" | "warning" | "info" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "bg-erp-success-bg text-erp-success-text border-erp-success-border"
    : tone === "danger" ? "bg-erp-danger-bg text-erp-danger-text border-erp-danger-border"
    : tone === "warning" ? "bg-erp-warning-bg text-erp-warning-text border-erp-warning-border"
    : tone === "info" ? "bg-erp-accent-soft text-erp-accent border-erp-border"
    : "bg-erp-surface-2 text-erp-text-muted border-erp-border";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

export function Modal({ open, title, onClose, children, footer, wide }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl border border-erp-border bg-erp-surface text-erp-text shadow-2xl md:rounded-xl ${wide ? "md:max-w-3xl" : "md:max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-erp-border px-4 py-3">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-2">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-erp-border bg-erp-surface-2 px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** صندوق اختيار فيه حالة "بين بين" */
export function Check({ checked, indeterminate, disabled, onChange, title, label }: {
  checked: boolean; indeterminate?: boolean; disabled?: boolean; onChange: (v: boolean) => void; title?: string; label?: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label || title}
      title={title}
      disabled={disabled}
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked; }}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-erp-border-strong accent-[var(--erp-accent)] disabled:cursor-not-allowed disabled:opacity-30"
    />
  );
}
