"use client";

// =====================================================================================
//  useScreenPerm.ts  -  صلاحيات الشاشة حسب نمط الدخول
//   "jwt"   : صلاحيات المستخدم الفعلية (usePermissions) — زي ما كانت
//   "admin" : الأدمن (توكن) = كل الصلاحيات (السيرفر برضه بيتحقق من التوكن)
// =====================================================================================

import { usePermissions, ResolvedPermissions } from "../Shared/Permissions";
import type { AuthMode } from "../Shared/AdminHttp";

export function useScreenPerm(moduleCode: string, mode: AuthMode): ResolvedPermissions {
  const real = usePermissions(moduleCode);
  if (mode !== "admin") return real;
  return {
    found: true,
    moduleCode,
    can: { execute: true, create: true, edit: true, delete: true, print: true, view: true },
    custom: () => true,
    row: null,
  };
}