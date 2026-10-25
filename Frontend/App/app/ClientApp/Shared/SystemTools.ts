// Shared/SystemTools.ts

import api from "../../../CallAPI/api";
import { BaseResponse } from "./Entities";

// =======================
// Components (lazy imports for client-side only)
// =======================
import { ShowMessage, MessageContainer, MessageType } from './Components/ShowMessage';
import { ErrorInput, ErrorInputField, useErrorInput, ErrorTextArea, ErrorSelect } from './Components/ErrorInput';

// =======================
// TOKEN MANAGEMENT
// =======================

let authToken: string | null = null;

// تعيين الـ Token
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined' && token) {
    localStorage.setItem('auth_token', token);
  } else if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// جلب الـ Token
export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth_token');
    if (stored) authToken = stored;
    return stored;
  }
  return null;
};

// إضافة Token لـ headers
const addTokenToHeaders = (config: any) => {
  const token = getAuthToken();
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
};

// =======================
// API CORE
// =======================

/**
 * يطلع رسالة الخطأ الحقيقية من رد الخادم
 * (الخادم بيرجّع BaseResponse كنص JSON جواه ErrorMessage)
 */
export const GetErrorMessage = (error: any): string => {
  if (typeof error === "string") return error;
  let data = error?.response?.data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return data || error?.message || "Server Error"; }
  }
  return data?.ErrorMessage || data?.message || data?.title || error?.ErrorMessage || error?.message || "Server Error";
};

async function PostApi<T>(
  controller: string,
  action: string,
  data?: any
): Promise<T> {
  try {
    let config: any = {};
    addTokenToHeaders(config);
    const res = await api.post(`${controller}/${action}`, data, config);
    return res.data;
  } catch (error: any) {
    console.error("POST ERROR:", error);
    if (error?.response?.status === 401) {
      handleUnauthorized();
    }
    throw GetErrorMessage(error);
  }
}

async function GetApi<T>(
  controller: string,
  action: string,
  params?: any
): Promise<T> {
  try {
    let config: any = { params };
    addTokenToHeaders(config);
    const res = await api.get(`${controller}/${action}`, config);
    return res.data;
  } catch (error: any) {
    console.error("GET ERROR:", error);
    if (error?.response?.status === 401) {
      handleUnauthorized();
    }
    throw GetErrorMessage(error);
  }
}

// معالجة عدم التصريح (Unauthorized)
const handleUnauthorized = () => {
  setAuthToken(null);
  if (typeof window !== 'undefined') {
    ShowMessage(
      "Your session has expired. Please login again.",
      "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
      "warning"
    );
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }
};

// =======================
// TYPES
// =======================

type ApiOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  controller: string;
  action: string;
  data?: any;
  onSuccess?: (res: BaseResponse) => void;
  onError?: (err: any) => void;
  onFinally?: () => void;
};

type LoaderType = {
  show?: () => void;
  hide?: () => void;
};

// =======================
// CALL API
// =======================
const pendingRequests = new Map<string, Promise<any>>();

export async function CallApi<T extends BaseResponse<any>>(
  options: ApiOptions<T>,
  loader?: LoaderType
): Promise<T> {

  const key = `${options.controller}_${options.action}_${JSON.stringify(options.data)}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const requestPromise = (async (): Promise<T> => {
    try {
      loader?.show?.();

      const url = `${options.controller}/${options.action}`;
      let res: T;
      
      const headers: any = {};
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      switch (options.method) {
        case "GET":
          res = await GetApi<T>(options.controller, options.action, options.data);
          break;
        case "PUT":
          res = (await api.put(url, options.data, { headers })).data;
          break;
        case "DELETE":
          res = (await api.delete(url, { data: options.data, headers })).data;
          break;
        default:
          res = await PostApi<T>(options.controller, options.action, options.data);
          break;
      }

      options.onSuccess?.(res);
      return res;

    } catch (err: any) {
      // ✅ نحوّل أي خطأ لنفس شكل BaseResponse عشان رسالة الخادم الحقيقية توصل للشاشة
      if (err?.response?.status === 401) handleUnauthorized();
      const errRes: any = {
        IsSuccess: false,
        StatusCode: err?.response?.status ?? 0,
        ErrorMessage: GetErrorMessage(err),
        Response: null,
      };
      options.onError?.(errRes);
      throw errRes;

    } finally {
      loader?.hide?.();
      options.onFinally?.();
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, requestPromise);
  return requestPromise;
}

// =======================
// HELPER FUNCTIONS
// =======================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const setLocal = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const getLocal = (key: string) => {
  if (typeof window !== 'undefined') {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
  return null;
};

const removeLocal = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

const getLang = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('language') || 'En';
  }
  return 'En';
};

const setLang = (lang: 'En' | 'Ar') => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang);
    window.location.reload();
  }
};

const log = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

const error = (...args: any[]) => {
  console.error(...args);
};

// =======================
// CRYPTO FUNCTIONS (التشفير)
// =======================

/**
 * تشفير النص باستخدام XOR (متوافق مع Backend)
 */
const encrypt = (text: string): string => {
  if (!text) return text;
  try {
    const key = "QDYxOUA2MTlANjE5QA==";
    const keyBytes = Buffer.from(key, 'base64');
    const textBytes = Buffer.from(text, 'utf-8');
    const result = Buffer.alloc(textBytes.length);
    
    for (let i = 0; i < textBytes.length; i++) {
      result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

/**
 * تشفير كائن كامل (النسخة المصححة)
 */
const encryptObject = <T extends Record<string, any>>(obj: T, fields: string[]): T => {
  const encrypted: any = { ...obj };
  
  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field]);
    }
  }
  
  return encrypted as T;
};

/**
 * تشفير مصفوفة من الكائنات
 */
const encryptArray = <T>(arr: T[], fields: string[]): T[] => {
  return arr.map(item => encryptObject(item as any, fields)) as T[];
};

// الحقول المطلوب تشفيرها (نفس الـ Backend)
const ENCRYPTED_FIELDS = ["TableName","KeyColumn","NameTable", "Condition", "SearchValue", "OrderByID", "Data", "DataList", "Ids"];

// =======================
// ENCRYPTED API CALL
// =======================

/**
 * استدعاء API مع تشفير تلقائي للبيانات
 */
export async function CallApiEncrypted<T extends BaseResponse<any>>(
  options: ApiOptions<T>,
  loader?: LoaderType
): Promise<T> {
  // نسخة من options لتجنب تعديل الأصل
  const encryptedOptions = { ...options };
  
  // تشفير البيانات قبل الإرسال
  if (encryptedOptions.data) {
    if (Array.isArray(encryptedOptions.data)) {
  

      // إذا كانت البيانات مصفوفة
      encryptedOptions.data = encryptArray(encryptedOptions.data, ENCRYPTED_FIELDS);
      console.log(encryptedOptions.data)
    } else if (typeof encryptedOptions.data === 'object') {
  

      // إذا كانت البيانات كائن
      encryptedOptions.data = encryptObject(encryptedOptions.data, ENCRYPTED_FIELDS);
      console.log(encryptedOptions.data)

    }
  }
  
  return CallApi(encryptedOptions, loader);
}

// =======================
// SYSTEM OBJECT (المركز الرئيسي)
// =======================

export const Sys = {
  // API
  CallApi,
  GetErrorMessage,
  CallApiEncrypted,
  
  // Token Management
  setAuthToken,
  getAuthToken,
  
  // Messages
  ShowMessage,
  MessageContainer,
  
  // Error Input
  ErrorInput,
  ErrorInputField,
  ErrorTextArea,
  ErrorSelect,
  useErrorInput,
  
  // Crypto (التشفير)
  Crypto: {
    encrypt,
    encryptObject,
    encryptArray,
    encryptedFields: ENCRYPTED_FIELDS
  },
  
  // Helpers
  sleep,
  setLocal,
  getLocal,
  removeLocal,
  getLang,
  setLang,
  log,
  error,
};

// =======================
// TYPES EXPORT
// =======================
export type { MessageType };



  // عرض رسالة نجاح
     // ✅ استخدام Sys مباشرة
    // Sys.ShowMessage("Operation completed successfully!", "تمت العملية بنجاح!", "success");
    // Sys.ShowMessage("Error occurred!", "حدث خطأ!", "error");
    // Sys.ShowMessage("Please check your input!", "الرجاء التحقق من الإدخال!", "warning");
    // Sys.ShowMessage("New update available!", "تحديث جديد متاح!", "info");
    
    // Sys.log("Dashboard initialized");



// // بعد تسجيل الدخول
// Sys.setAuthToken("your_jwt_token_here");

// // الآن أي API call هيرسل Token تلقائياً
// const users = await SQL.Select("Users", "ID > 10");

// // تسجيل الخروج
// Sys.setAuthToken(null);