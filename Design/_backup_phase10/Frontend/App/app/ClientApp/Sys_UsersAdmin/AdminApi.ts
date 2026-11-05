"use client";

// =====================================================================================
//  AdminApi.ts  -  نداءات AdminUsersController (api/AdminUsers/*) + الأنواع
//  مشترك بين شاشات: Sys_UsersAdmin / Sys_RolesAdmin / Sys_UserPermsAdmin
//  النداءات بتروح بـ JWT (Sys.CallApi بيحط Authorization). مفيش تشفير XOR هنا:
//  الباك مابيفكهوش للـ actions دي. لازم الموقع يشتغل HTTPS في الإنتاج عشان كلمات السر.
// =====================================================================================

import { Sys } from "../Shared/SystemTools";
import { BaseResponse } from "../Shared/Entities";

export type PermKey =
  | "EXECUTE" | "CREATE" | "EDIT" | "DELETE" | "PRINT" | "VIEW"
  | "CUSTOM1" | "CUSTOM2" | "CUSTOM3" | "CUSTOM4" | "CUSTOM5"
  | "CUSTOM6" | "CUSTOM7" | "CUSTOM8" | "CUSTOM9";

export const ALL_PERM_KEYS: PermKey[] = [
  "EXECUTE", "CREATE", "EDIT", "DELETE", "PRINT", "VIEW",
  "CUSTOM1", "CUSTOM2", "CUSTOM3", "CUSTOM4", "CUSTOM5", "CUSTOM6", "CUSTOM7", "CUSTOM8", "CUSTOM9",
];

export type PermMap = Record<PermKey, boolean>;

export interface MatrixModule {
  code: string;
  menu: string;
  descA: string;
  descE: string;
  type: string;
  sort: number | null;
  allow: PermMap;                       // الشاشة نفسها بتسمح بإيه
  desc: Record<string, string>;         // CUSTOMn_DESC
  value: PermMap | null;                // القيمة المحفوظة (دور أو استثناء يوزر)
  hasRow: boolean;
  inherited: PermMap | null;            // (للمستخدم بس) من الأدوار
}

export interface LookupCompany { CompCode: number; NameA: string; NameE: string; IsActive: boolean }
export interface LookupBranch { CompCode: number; BranchCode: number; BranchDescA: string; BranchDescE: string; IsActive: boolean }
export interface LookupRole { RoleId: number; DescA: string; DescE: string; IsAvailable: boolean }

export interface UserRow {
  UserID: number; USER_CODE: string; USER_NAME: string | null; USER_Email: string | null;
  USER_ACTIVE: boolean | number; EmpID: number | null; LastLogin: string | null; CreatedAt: string | null;
  Companies: number; Branches: number; RolesA: string | null; RolesE: string | null;
}

export interface RoleRow {
  RoleId: number; DescA: string; DescE: string; Remarks: string | null; IsAvailable: boolean | number;
  CompCode: number | null; IsAdmin: boolean | number; Users: number; Modules: number;
}

export function emptyPerms(): PermMap {
  const o: any = {};
  ALL_PERM_KEYS.forEach((k) => (o[k] = false));
  return o as PermMap;
}

/** ينده على الباك. بيرجّع Response أو بيرمي Error برسالة واضحة (ثنائية اللغة من السيرفر). */
export async function adminCall<T = any>(action: string, data?: any): Promise<T> {
  let res: BaseResponse<any>;
  try {
    res = await Sys.CallApi<BaseResponse<any>>({ method: "POST", controller: "AdminUsers", action, data: data ?? {} });
  } catch (e: any) {
    throw new Error(typeof e === "string" ? e : e?.message || "Request failed");
  }
  if (!res || res.IsSuccess === false) {
    throw new Error((res as any)?.ErrorMessage || "Request failed");
  }
  return (res as any).Response as T;
}

export function showError(e: any, IsLangEN: boolean) {
  const msg = e?.message || String(e);
  Sys.ShowMessage(msg, msg, "error");
  void IsLangEN;
}
