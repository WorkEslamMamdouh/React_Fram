/* eslint-disable @typescript-eslint/no-explicit-any */
// =====================================================================================
//  ModelWizard — P15 معالج خطوات (تسجيل مريض، تشيك إن فندق، اشتراك جيم، إعداد أول مرة ...)
//  كل خطوة = حقول (أو خطوة مخصصة/ملخص). تحقق لكل خطوة، تخطي بشرط، حفظ مسودة واستكمال.
// =====================================================================================

import type { LText } from "./ModelPatterns";
import type { ValidationRule } from "../../../Validation";

/** شرط بسيط JSON-able: الحقل = قيمة / ضمن قيم / مش فاضي */
export interface WizardCondition {
  field: string;
  equals?: any;
  in?: any[];
  notEmpty?: boolean;
  /** عكس الشرط */
  not?: boolean;
}

export interface WizardField {
  field: string;
  label: LText;
  type?: "text" | "number" | "date" | "select" | "radio" | "textarea" | "checkbox" | "phone" | "email";
  required?: boolean;
  options?: Array<{ value: string | number; label: LText }>;
  placeholder?: LText;
  /** 1 = نص العرض، 2 = العرض كله (على الكمبيوتر) */
  span?: 1 | 2;
  min?: number;
  max?: number;
  /** regex */
  pattern?: string;
  patternMessage?: LText;
  defaultValue?: any;
  visibleWhen?: WizardCondition;
  hint?: LText;
}

export interface WizardStep {
  id: string;
  title: LText;
  description?: LText;
  icon?: string;
  /** form (الافتراضي) | summary (مراجعة كل اللي اتكتب) | custom (renderCustomStep) */
  kind?: "form" | "summary" | "custom";
  fields?: WizardField[];
  /** قواعد Validation.ts (required / compare / regex / exists ...) على قيم المعالج */
  validations?: ValidationRule[];
  /** تخطي الخطوة لو الشرط اتحقق */
  skipWhen?: WizardCondition;
}

export interface WizardConfig {
  /** id للمسودة في localStorage */
  id?: string;
  steps: WizardStep[];
  /** حفظ مسودة تلقائي واستكمالها بعدين */
  allowDraft?: boolean;
  /** السماح بالرجوع لأي خطوة خلصت بالدوس عليها */
  allowJumpBack?: boolean;
  finishLabel?: LText;
  /** للـ unique / exists في Validation.ts */
  tableName?: string;
  keyColumn?: string;
}
