/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// =====================================================================================
//  Wizard — P15 معالج خطوات
//  - شريط خطوات (أرقام) فوق، وعلى الموبايل "خطوة 2 من 5" + شريط تقدم
//  - تحقق قبل "التالي": إجباري / min / max / pattern + قواعد Validation.ts (RunValidations)
//  - تخطي خطوات بشرط (skipWhen)، إظهار حقول بشرط (visibleWhen)
//  - مسودة تلقائية في localStorage (allowDraft) واستكمال
//  - خطوة ملخص بتعرض كل القيم، وخطوة custom للأب يرسم فيها أي نمط تاني
// =====================================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WizardCondition, WizardConfig, WizardField, WizardStep } from "./ModelWizard";
import { RunValidations } from "../../../Validation";
import { btnClass, cardClass, useLangKit } from "./patternKit";

export function wizardCond(c: WizardCondition | undefined, values: Record<string, any>): boolean {
  if (!c) return true;
  const v = values[c.field];
  let r = true;
  if (c.notEmpty) r = v !== null && v !== undefined && v !== "" && v !== false;
  if (c.equals !== undefined) r = r && String(v) === String(c.equals);
  if (c.in) r = r && c.in.map(String).includes(String(v));
  return c.not ? !r : r;
}

export interface WizardProps {
  config: WizardConfig;
  initialValues?: Record<string, any>;
  /** الحفظ النهائي — رجّع false لو فشل */
  onFinish: (values: Record<string, any>) => Promise<boolean | void> | boolean | void;
  onCancel?: () => void;
  renderCustomStep?: (stepId: string, values: Record<string, any>, setValue: (field: string, v: any) => void) => React.ReactNode;
  onStepChange?: (stepId: string, values: Record<string, any>) => void;
}

const draftKey = (id?: string) => (id ? `wizard-draft:${id}` : "");

export default function Wizard({ config, initialValues, onFinish, onCancel, renderCustomStep, onStepChange }: WizardProps) {
  const { t, lt, dir, isAr } = useLangKit();
  const defaults = useMemo(() => {
    const v: Record<string, any> = {};
    for (const s of config.steps) for (const f of s.fields || []) if (f.defaultValue !== undefined) v[f.field] = f.defaultValue;
    return { ...v, ...(initialValues || {}) };
  }, [config.steps, initialValues]);

  const [values, setValues] = useState<Record<string, any>>(defaults);
  const [idx, setIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [maxReached, setMaxReached] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);

  const visibleSteps = useMemo(() => config.steps.filter((s) => !(s.skipWhen && wizardCond(s.skipWhen, values))), [config.steps, values]);
  const step: WizardStep | undefined = visibleSteps[Math.min(idx, visibleSteps.length - 1)];
  const isLast = idx >= visibleSteps.length - 1;

  // ---------- مسودة ----------
  const key = config.allowDraft ? draftKey(config.id) : "";
  // الحفظ التلقائي مستني (draftChecked) ومتوقف طول ما فيه مسودة قديمة لسه ماتقررش (hasDraft)؛
  // قبل كده أول حفظ كان بيكتب القيم الفاضية فوق المسودة فـ"استكمال" كان بيرجع فاضي
  const [draftChecked, setDraftChecked] = useState(false);
  const draftRef = useRef<any>(null);
  useEffect(() => {
    if (!key) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) { draftRef.current = JSON.parse(raw); setHasDraft(true); }
    } catch { /* */ }
    setDraftChecked(true);
  }, [key]);
  useEffect(() => {
    if (!key || done || !draftChecked || hasDraft) return;
    try { window.localStorage.setItem(key, JSON.stringify({ v: values, i: idx })); } catch { /* */ }
  }, [key, values, idx, done, draftChecked, hasDraft]);
  const resumeDraft = () => {
    try {
      const d = draftRef.current || JSON.parse(window.localStorage.getItem(key) || "null");
      if (d?.v) { setValues(d.v); setIdx(d.i || 0); setMaxReached(d.i || 0); }
    } catch { /* */ }
    setHasDraft(false);
  };
  const discardDraft = () => { try { window.localStorage.removeItem(key); } catch { /* */ } setHasDraft(false); };

  useEffect(() => { if (step) onStepChange?.(step.id, values); }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setValue = useCallback((f: string, v: any) => {
    setValues((s) => ({ ...s, [f]: v }));
    setErrors((e) => { if (!e[f]) return e; const n = { ...e }; delete n[f]; return n; });
  }, []);

  const fieldVisible = (f: WizardField) => wizardCond(f.visibleWhen, values);

  const validateStep = async (s: WizardStep): Promise<boolean> => {
    const errs: Record<string, string> = {};
    for (const f of s.fields || []) {
      if (!fieldVisible(f)) continue;
      const v = values[f.field];
      const empty = v === null || v === undefined || v === "" || (f.type === "checkbox" && f.required && v !== true);
      if (f.required && empty) { errs[f.field] = t("Required", "مطلوب"); continue; }
      if (empty) continue;
      if (f.type === "number" || f.min !== undefined || f.max !== undefined) {
        const n = Number(v);
        if (f.min !== undefined && n < f.min) errs[f.field] = t(`Min ${f.min}`, `أقل قيمة ${f.min}`);
        if (f.max !== undefined && n > f.max) errs[f.field] = t(`Max ${f.max}`, `أكبر قيمة ${f.max}`);
      }
      const pat = f.pattern || (f.type === "email" ? "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" : f.type === "phone" ? "^[+0-9 ()-]{6,20}$" : "");
      if (pat && !new RegExp(pat).test(String(v))) errs[f.field] = lt(f.patternMessage) || t("Invalid format", "صيغة غير صحيحة");
    }
    setErrors(errs);
    if (Object.keys(errs).length) { setFormError(""); return false; }
    if (s.validations && s.validations.length) {
      const err = await RunValidations(s.validations, values, [], {
        isInsert: true, isLangEN: !isAr, tableName: config.tableName || "", keyColumn: config.keyColumn || "",
      });
      if (err) { setFormError(err.message); if (err.field) setErrors({ [err.field]: err.message }); return false; }
    }
    setFormError("");
    return true;
  };

  const next = async () => {
    if (!step) return;
    setBusy(true);
    try {
      if (!(await validateStep(step))) return;
      if (isLast) {
        const ok = await onFinish(values);
        if (ok === false) return;
        setDone(true);
        if (key) try { window.localStorage.removeItem(key); } catch { /* */ }
        return;
      }
      const ni = idx + 1;
      setIdx(ni);
      setMaxReached((m) => Math.max(m, ni));
    } finally { setBusy(false); }
  };
  const back = () => { setErrors({}); setFormError(""); setIdx((i) => Math.max(0, i - 1)); };

  const inputCls = (f: WizardField) =>
    `w-full min-h-[44px] border rounded-lg px-3 text-[14px] bg-erp-surface text-erp-text focus:outline-none focus:border-erp-accent ${errors[f.field] ? "border-erp-danger" : "border-erp-border-strong"}`;

  const renderField = (f: WizardField) => {
    const v = values[f.field];
    const ph = lt(f.placeholder);
    switch (f.type) {
      case "textarea": return <textarea rows={3} className={`${inputCls(f)} py-2`} value={v ?? ""} placeholder={ph} onChange={(e) => setValue(f.field, e.target.value)} />;
      case "number": return <input type="number" inputMode="decimal" className={`${inputCls(f)} num`} value={v ?? ""} min={f.min} max={f.max} placeholder={ph} onChange={(e) => setValue(f.field, e.target.value === "" ? null : Number(e.target.value))} />;
      case "date": return <input type="date" className={inputCls(f)} value={v ?? ""} onChange={(e) => setValue(f.field, e.target.value || null)} />;
      case "select": return (
        <select className={inputCls(f)} value={v ?? ""} onChange={(e) => { const o = f.options?.find((x) => String(x.value) === e.target.value); setValue(f.field, o ? o.value : null); }}>
          <option value="">{ph || t("Select...", "اختر...")}</option>
          {(f.options || []).map((o) => <option key={String(o.value)} value={String(o.value)}>{lt(o.label)}</option>)}
        </select>
      );
      case "radio": return (
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {(f.options || []).map((o) => {
            const on = String(v) === String(o.value);
            return <button key={String(o.value)} type="button" role="radio" aria-checked={on} onClick={() => setValue(f.field, o.value)}
              className={`min-h-[44px] px-4 rounded-lg border-2 text-[13px] ${on ? "border-erp-accent bg-erp-accent-soft text-erp-accent font-semibold" : "border-erp-border"}`}>{lt(o.label)}</button>;
          })}
        </div>
      );
      case "checkbox": return (
        <label className="inline-flex items-center gap-2 min-h-[44px] text-[14px]">
          <input type="checkbox" className="size-5" checked={v === true} onChange={(e) => setValue(f.field, e.target.checked)} />{ph || lt(f.label)}
        </label>
      );
      default: return <input type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"} dir={f.type === "phone" || f.type === "email" ? "ltr" : undefined}
        className={inputCls(f)} value={v ?? ""} placeholder={ph} onChange={(e) => setValue(f.field, e.target.value)} />;
    }
  };

  const display = (f: WizardField) => {
    const v = values[f.field];
    if (v === null || v === undefined || v === "") return "—";
    if (f.options) return lt(f.options.find((o) => String(o.value) === String(v))?.label) || String(v);
    if (f.type === "checkbox") return v ? t("Yes", "نعم") : t("No", "لا");
    return String(v);
  };

  if (done) {
    return (
      <div className={`${cardClass} p-8 text-center space-y-3 text-erp-text`} dir={dir}>
        <div className="text-5xl">✅</div>
        <div className="text-lg font-semibold">{t("Completed successfully", "تم بنجاح")}</div>
        <button type="button" className={btnClass("primary", "lg")} onClick={() => { setValues(defaults); setIdx(0); setMaxReached(0); setDone(false); }}>{t("Start again", "ابدأ من جديد")}</button>
      </div>
    );
  }
  if (!step) return null;

  return (
    <div className={`${cardClass} flex flex-col text-erp-text overflow-hidden`} dir={dir}>
      {hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-erp-warning-bg text-erp-warning-text text-[13px]">
          <span>{t("You have an unfinished draft.", "عندك مسودة لسه ماخلصتش.")}</span>
          <span className="flex gap-2">
            <button type="button" className={btnClass("primary")} onClick={resumeDraft}>{t("Resume", "استكمال")}</button>
            <button type="button" className={btnClass("gray")} onClick={discardDraft}>{t("Discard", "تجاهل")}</button>
          </span>
        </div>
      )}

      {/* شريط الخطوات */}
      <div className="px-4 pt-4">
        <div className="hidden md:flex items-center gap-2">
          {visibleSteps.map((s, i) => {
            const state = i < idx ? "done" : i === idx ? "cur" : "todo";
            const canJump = (config.allowJumpBack ?? true) && i <= maxReached && i !== idx;
            return (
              <React.Fragment key={s.id}>
                <button type="button" disabled={!canJump} onClick={() => canJump && setIdx(i)} className="flex items-center gap-2 min-w-0 disabled:cursor-default">
                  <span className={`size-8 shrink-0 rounded-full inline-flex items-center justify-center text-[13px] font-bold num ${state === "done" ? "bg-erp-success text-white" : state === "cur" ? "bg-erp-accent text-white" : "bg-erp-surface-2 text-erp-text-muted"}`}>
                    {state === "done" ? "✓" : s.icon || i + 1}
                  </span>
                  <span className={`text-[13px] truncate ${state === "cur" ? "font-semibold" : "text-erp-text-muted"}`}>{lt(s.title)}</span>
                </button>
                {i < visibleSteps.length - 1 && <span className={`flex-1 h-0.5 min-w-4 ${i < idx ? "bg-erp-success" : "bg-erp-border"}`} />}
              </React.Fragment>
            );
          })}
        </div>
        <div className="md:hidden space-y-1.5">
          <div className="text-[12px] text-erp-text-muted">{t("Step", "خطوة")} <span className="num">{idx + 1}</span> {t("of", "من")} <span className="num">{visibleSteps.length}</span></div>
          <div className="h-1.5 rounded-full bg-erp-surface-2 overflow-hidden"><div className="h-full bg-erp-accent transition-all" style={{ width: `${((idx + 1) / visibleSteps.length) * 100}%` }} /></div>
        </div>
      </div>

      {/* محتوى الخطوة */}
      <div className="flex-1 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold">{step.icon} {lt(step.title)}</h2>
          {step.description && <p className="text-[13px] text-erp-text-muted">{lt(step.description)}</p>}
        </div>
        {(step.kind || "form") === "form" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(step.fields || []).filter(fieldVisible).map((f) => (
              <div key={f.field} className={f.span === 2 || f.type === "textarea" ? "md:col-span-2" : ""}>
                {f.type !== "checkbox" && <label className="block text-[13px] font-medium mb-1">{lt(f.label)}{f.required && <span className="text-erp-danger mx-0.5">*</span>}</label>}
                {renderField(f)}
                {errors[f.field] ? <div className="text-[12px] text-erp-danger mt-1">{errors[f.field]}</div> : f.hint ? <div className="text-[12px] text-erp-text-subtle mt-1">{lt(f.hint)}</div> : null}
              </div>
            ))}
          </div>
        )}
        {step.kind === "custom" && renderCustomStep?.(step.id, values, setValue)}
        {step.kind === "summary" && (
          <div className="space-y-3">
            {visibleSteps.filter((s) => (s.kind || "form") === "form").map((s) => (
              <div key={s.id} className="rounded-lg border border-erp-border">
                <div className="flex items-center justify-between px-3 py-2 bg-erp-surface-2 rounded-t-lg">
                  <span className="font-semibold text-[13px]">{lt(s.title)}</span>
                  <button type="button" className="text-[12px] text-erp-accent min-h-[32px]" onClick={() => setIdx(visibleSteps.indexOf(s))}>{t("Edit", "تعديل")}</button>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 p-3 text-[13px]">
                  {(s.fields || []).filter(fieldVisible).map((f) => (
                    <div key={f.field} className="flex justify-between gap-2"><dt className="text-erp-text-muted">{lt(f.label)}</dt><dd className="font-medium text-end">{display(f)}</dd></div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
        {formError && <div className="rounded-lg bg-erp-danger-bg border border-erp-danger-border text-erp-danger-text px-3 py-2 text-[13px]">{formError}</div>}
      </div>

      {/* الأزرار — ثابتة تحت على الموبايل */}
      <div className="sticky bottom-0 flex items-center justify-between gap-2 p-3 border-t border-erp-border bg-erp-surface">
        <div className="flex gap-2">
          {onCancel && <button type="button" className={btnClass("gray", "lg")} onClick={onCancel}>{t("Cancel", "إلغاء")}</button>}
        </div>
        <div className="flex gap-2">
          {idx > 0 && <button type="button" className={btnClass("gray", "lg")} onClick={back}>{isAr ? "→" : "←"} {t("Back", "السابق")}</button>}
          <button type="button" className={btnClass(isLast ? "success" : "primary", "lg")} disabled={busy} onClick={next}>
            {isLast ? lt(config.finishLabel) || t("Finish", "إنهاء") : <>{t("Next", "التالي")} {isAr ? "←" : "→"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
