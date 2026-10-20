"use client";

import React, { useState, useRef, InputHTMLAttributes, FocusEvent, ChangeEvent } from "react";
import { ShowMessage } from "./ShowMessage";

// خيارات الـ ErrorInput
interface ErrorInputOptions {
  messageEn?: string;
  messageAr?: string;
  duration?: number; // مدة الـ shake والـ border
  scrollToElement?: boolean; // هل يتم التمرير للعنصر
}

// كلاس خاص للـ border الأحمر والـ shake
const errorInputStyles = `
  @keyframes shakeX {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  
  .input-error-shake {
    animation: shakeX 0.5s ease-in-out;
  }
  
  .input-error-border {
    border: 2px solid #ef4444 !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    transition: all 0.2s ease;
  }
  
  .dark .input-error-border {
    border: 2px solid #f87171 !important;
    box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.2) !important;
  }
`;

// إضافة الـ styles إلى الـ document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = errorInputStyles;
  document.head.appendChild(styleSheet);
}

// ============================================
// Helper function لجلب اللغة من localStorage
// ============================================
const getLanguage = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('language') || 'en';
  }
  return 'en';
};

// ============================================
// الدالة الرئيسية ErrorInput (معدلة - بدون Hooks)
// ============================================
export function ErrorInput(
  input: HTMLElement | string | any,
  options?: ErrorInputOptions,
  lang?: string
): void {
  
  // جلب العنصر المناسب
  let element: HTMLElement | null = null;
  let isSelect2 = false;

  // تحديد العنصر بناءً على نوع الـ input
  if (typeof input === 'string') {
    // إذا كان selector
    element = document.querySelector(input) as HTMLElement;
  } else if (input?.selector) {
    // إذا كان object مع selector
    element = document.querySelector(input.selector) as HTMLElement;
  } else if (input?.getAttribute) {
    // إذا كان عنصر DOM عادي
    element = input;
  } else if (input?.[0]?.id) {
    // إذا كان jQuery object
    element = document.getElementById(input[0].id);
  } else if (typeof input === 'object' && input?.id) {
    // إذا كان object مع id
    element = document.getElementById(input.id);
  } else if (input?.current) {
    // إذا كان ref object
    element = input.current;
  }

  // إذا لم يتم العثور على العنصر
  if (!element) {
    console.error('ErrorInput: Element not found', input);
    return;
  }

  // التحقق من وجود Select2
  const select2Container = document.querySelector(`#select2-${element.id}-container`);
  if (select2Container) {
    isSelect2 = true;
  }

  // عرض الرسالة إذا وجدت
  const messageEn = options?.messageEn?.trim();
  const messageAr = options?.messageAr?.trim();
  
  if (messageEn || messageAr) {
    // استخدام اللغة المرسلة أو من localStorage
    const currentLang = lang || getLanguage();
    
    if (currentLang === 'ar' && messageAr) {
      ShowMessage(messageEn || '', messageAr, 'error', options?.duration || 5000);
    } else if (messageEn) {
      ShowMessage(messageEn, messageAr || '', 'error', options?.duration || 5000);
    }
  }

  // دالة إزالة الـ error classes
  const removeErrorClasses = () => {
    element?.classList.remove('input-error-shake', 'input-error-border');
    if (select2Container) {
      select2Container.classList.remove('input-error-shake', 'input-error-border');
    }
  };

  // إضافة الـ error classes
  const addErrorClasses = () => {
    element?.classList.add('input-error-shake', 'input-error-border');
    if (select2Container) {
      select2Container.classList.add('input-error-shake', 'input-error-border');
    }
  };

  // إزالة أي classes موجودة مسبقاً
  removeErrorClasses();
  
  // إضافة الـ classes الجديدة
  addErrorClasses();

  // التركيز على العنصر
  setTimeout(() => {
    element?.focus();
    if (select2Container) {
      (select2Container as HTMLElement).focus();
    }
    
    // التمرير للعنصر إذا كان مطلوباً
    if (options?.scrollToElement !== false) {
      element?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, 100);

  // إزالة الـ classes بعد المدة المحددة
  setTimeout(() => {
    removeErrorClasses();
  }, options?.duration || 5000);
}

// ============================================
// Hook مخصص للاستخدام مع Form (يستخدم useSys)
// ============================================

interface ErrorInputHookOptions {
  messageEn?: string;
  messageAr?: string;
  duration?: number;
}

// ✅ Custom Hook - يمكنه استخدام useSys
export function useErrorInputWithLang() {
  // ملاحظة: هذا الـ Hook يجب استخدامه داخل مكون React
  // وسيتم توفير اللغة من الـ store
  
  const triggerError = (
    element: HTMLElement | string | any,
    options?: ErrorInputHookOptions,
    lang?: string
  ) => {
    ErrorInput(element, options, lang);
  };

  const clearError = (element: HTMLElement | null) => {
    if (element) {
      element.classList.remove('input-error-shake', 'input-error-border');
    }
  };

  return { triggerError, clearError };
}

// ============================================
// Hook مبسط للاستخدام مع Form
// ============================================
export function useErrorInput() {
  const [errorElement, setErrorElement] = useState<HTMLElement | null>(null);

  const triggerError = (
    element: HTMLElement | string | any,
    options?: ErrorInputHookOptions
  ) => {
    const lang = getLanguage();
    ErrorInput(element, options, lang);
    if (typeof element !== 'string' && element?.getAttribute) {
      setErrorElement(element);
    } else if (element?.current) {
      setErrorElement(element.current);
    }
  };

  const clearError = () => {
    if (errorElement) {
      errorElement.classList.remove('input-error-shake', 'input-error-border');
      setErrorElement(null);
    }
  };

  return { triggerError, clearError };
}

// ============================================
// مكون Input مع Error مدمج
// ============================================

interface ErrorInputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onError'> {
  errorMessageEn?: string;
  errorMessageAr?: string;
  onError?: (hasError: boolean) => void;
}

export function ErrorInputField({
  errorMessageEn,
  errorMessageAr,
  onError,
  onChange,
  onBlur,
  className = '',
  required,
  ...props
}: ErrorInputFieldProps) {
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (required && !e.target.value) {
      setHasError(true);
      ErrorInput(e.target, {
        messageEn: errorMessageEn || 'This field is required',
        messageAr: errorMessageAr || 'هذا الحقل مطلوب',
      });
      onError?.(true);
    } else {
      if (hasError) {
        setHasError(false);
        onError?.(false);
      }
    }
    onBlur?.(e);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (hasError && e.target.value) {
      setHasError(false);
      onError?.(false);
      if (inputRef.current) {
        inputRef.current.classList.remove('input-error-border');
      }
    }
    onChange?.(e);
  };

  return (
    <input
      ref={inputRef}
      required={required}
      className={`
        w-full px-3 py-2 border rounded-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500
        dark:bg-neutral-800 dark:border-neutral-600
        transition-all duration-200
        ${hasError ? 'input-error-border' : ''}
        ${className}
      `}
      onBlur={handleBlur}
      onChange={handleChange}
      {...props}
    />
  );
}

// ============================================
// مكون TextArea مع Error مدمج
// ============================================

interface ErrorTextAreaProps extends Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'onError'> {
  errorMessageEn?: string;
  errorMessageAr?: string;
  onError?: (hasError: boolean) => void;
}

export function ErrorTextArea({
  errorMessageEn,
  errorMessageAr,
  onError,
  onChange,
  onBlur,
  className = '',
  required,
  ...props
}: ErrorTextAreaProps) {
  const [hasError, setHasError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    if (required && !e.target.value) {
      setHasError(true);
      ErrorInput(e.target, {
        messageEn: errorMessageEn || 'This field is required',
        messageAr: errorMessageAr || 'هذا الحقل مطلوب',
      });
      onError?.(true);
    } else {
      if (hasError) {
        setHasError(false);
        onError?.(false);
      }
    }
    onBlur?.(e);
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (hasError && e.target.value) {
      setHasError(false);
      onError?.(false);
      if (textareaRef.current) {
        textareaRef.current.classList.remove('input-error-border');
      }
    }
    onChange?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      required={required}
      className={`
        w-full px-3 py-2 border rounded-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500
        dark:bg-neutral-800 dark:border-neutral-600
        transition-all duration-200
        ${hasError ? 'input-error-border' : ''}
        ${className}
      `}
      onBlur={handleBlur}
      onChange={handleChange}
      {...props}
    />
  );
}

// ============================================
// مكون Select مع Error مدمج
// ============================================

interface ErrorSelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, 'onError'> {
  errorMessageEn?: string;
  errorMessageAr?: string;
  onError?: (hasError: boolean) => void;
  options?: Array<{ value: string; label: string }>;
}

export function ErrorSelect({
  errorMessageEn,
  errorMessageAr,
  onError,
  onChange,
  onBlur,
  className = '',
  required,
  options = [],
  children,
  ...props
}: ErrorSelectProps) {
  const [hasError, setHasError] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleBlur = (e: FocusEvent<HTMLSelectElement>) => {
    if (required && !e.target.value) {
      setHasError(true);
      ErrorInput(e.target, {
        messageEn: errorMessageEn || 'Please select an option',
        messageAr: errorMessageAr || 'الرجاء اختيار قيمة',
      });
      onError?.(true);
    } else {
      if (hasError) {
        setHasError(false);
        onError?.(false);
      }
    }
    onBlur?.(e);
  };

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (hasError && e.target.value) {
      setHasError(false);
      onError?.(false);
      if (selectRef.current) {
        selectRef.current.classList.remove('input-error-border');
      }
    }
    onChange?.(e);
  };

  return (
    <select
      ref={selectRef}
      required={required}
      className={`
        w-full px-3 py-2 border rounded-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500
        dark:bg-neutral-800 dark:border-neutral-600
        transition-all duration-200
        ${hasError ? 'input-error-border' : ''}
        ${className}
      `}
      onBlur={handleBlur}
      onChange={handleChange}
      {...props}
    >
      {children || options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}