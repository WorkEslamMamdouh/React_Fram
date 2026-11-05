"use client";

// =====================================================================================
//  Permissions.ts  -  قراءة صلاحيات الشاشة من Session.CurrentPrivileges
// -------------------------------------------------------------------------------------
//  نفس منطق LoginCompany (اللي بيجهّز CurrentPrivileges):
//    1) صفوف اليوزر (UserID > 0) الأول، الأعلى Prc_Preference
//    2) وإلا صفوف الدور (UserID = 0)، الأعلى Prc_Preference
//    3) وإلا أول صف
//  CurrentPrivileges بعد الدخول فيها صف واحد لكل شاشة، بس الدالة هنا بتتعامل مع
//  القايمة لو فيها أكتر من صف للشاشة (احتياط).
//
//  الاستخدام:
//    const perm = usePermissions("SalesInvoice");   // أو usePermissions() = من اسم الفولدر في الـ URL
//    perm.can.create / perm.can.edit / perm.can.delete / perm.can.print / perm.can.view
//    perm.custom(1)  -> CUSTOM1
// =====================================================================================

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSys } from "./SystemUsing";

export type PermissionKey =
  | "EXECUTE" | "CREATE" | "EDIT" | "DELETE" | "PRINT" | "VIEW"
  | "CUSTOM1" | "CUSTOM2" | "CUSTOM3" | "CUSTOM4" | "CUSTOM5"
  | "CUSTOM6" | "CUSTOM7" | "CUSTOM8" | "CUSTOM9";

export const PermissionKeys: PermissionKey[] = [
  "EXECUTE", "CREATE", "EDIT", "DELETE", "PRINT", "VIEW",
  "CUSTOM1", "CUSTOM2", "CUSTOM3", "CUSTOM4", "CUSTOM5",
  "CUSTOM6", "CUSTOM7", "CUSTOM8", "CUSTOM9",
];

/** صلاحيات جاهزة ممكن تتبعت للجريد/الماستر ديتيل مباشرة (permissions prop) */
export interface ModulePermissions {
  execute?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  print?: boolean;
  view?: boolean;
}

export interface ResolvedPermissions {
  /** لقينا صف صلاحيات للشاشة دي؟ */
  found: boolean;
  moduleCode: string;
  can: {
    execute: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    print: boolean;
    view: boolean;
  };
  /** CUSTOM1..9 */
  custom: (n: number) => boolean;
  /** الصف الأصلي */
  row: any | null;
}

const toBool = (v: any): boolean => v === true || v === 1 || v === "1" || v === "true" || v === "True";

/** يختار صف الصلاحيات للشاشة: اليوزر الأول وإلا الدور، الأعلى Prc_Preference */
export function resolvePrivilege(privileges: any[] | undefined | null, moduleCode: string): any | null {
  if (!privileges || !moduleCode) return null;
  const code = moduleCode.toLowerCase();
  const rows = privileges.filter((x) => (x?.MODULE_CODE || "").toLowerCase() === code);
  if (rows.length === 0) return null;

  const best = (list: any[]) =>
    list.reduce((max, cur) => ((cur.Prc_Preference || 0) > (max.Prc_Preference || 0) ? cur : max));

  const userRows = rows.filter((x) => (x.UserID || 0) > 0);
  if (userRows.length > 0) return best(userRows);
  const defaultRows = rows.filter((x) => (x.UserID || 0) === 0);
  if (defaultRows.length > 0) return best(defaultRows);
  return rows[0];
}

export function buildPermissions(row: any | null, moduleCode: string): ResolvedPermissions {
  return {
    found: !!row,
    moduleCode,
    row,
    can: {
      execute: !!row && toBool(row.EXECUTE),
      create: !!row && toBool(row.CREATE),
      edit: !!row && toBool(row.EDIT),
      delete: !!row && toBool(row.DELETE),
      print: !!row && toBool(row.PRINT),
      view: !!row && toBool(row.VIEW),
    },
    custom: (n: number) => !!row && toBool(row["CUSTOM" + n]),
  };
}

/** اسم الشاشة من الـ URL: /ClientApp/<MODULE_CODE> */
export function moduleCodeFromPath(pathname: string | null | undefined): string {
  const seg = (pathname || "").split("/");
  return seg[2] || "";
}

/**
 * صلاحيات شاشة.
 *  - moduleCode: اسم الشاشة (= MODULE_CODE). لو مش متحدد بيتاخد من الـ URL.
 */
export function usePermissions(moduleCode?: string): ResolvedPermissions {
  const privileges = useSys((s) => s.Session?.CurrentPrivileges);
  const pathname = usePathname();
  const code = moduleCode || moduleCodeFromPath(pathname);

  return useMemo(() => buildPermissions(resolvePrivilege(privileges as any[], code), code), [privileges, code]);
}

/**
 * للمكونات اللي بتاخد (moduleCode?, permissions?) اختياريين:
 *   - مفيش واحد منهم = null يعني "ماتغيّرش حاجة" (السلوك القديم).
 *   - permissions متحددة = بتتطبق زي ما هي.
 *   - moduleCode متحدد = بيتقرا من الجلسة (لو الشاشة مالهاش صف = ممنوع).
 */
export function useEffectiveModulePermissions(
  moduleCode?: string,
  permissions?: ModulePermissions
): ResolvedPermissions["can"] | null {
  const privileges = useSys((s) => s.Session?.CurrentPrivileges);
  return useMemo(() => {
    if (permissions) {
      const base = moduleCode ? buildPermissions(resolvePrivilege(privileges as any[], moduleCode), moduleCode).can : null;
      const pick = (k: keyof ModulePermissions) =>
        permissions[k] !== undefined ? !!permissions[k] : base ? base[k as keyof typeof base] : true;
      return {
        execute: pick("execute"), create: pick("create"), edit: pick("edit"),
        delete: pick("delete"), print: pick("print"), view: pick("view"),
      };
    }
    if (moduleCode) return buildPermissions(resolvePrivilege(privileges as any[], moduleCode), moduleCode).can;
    return null;
  }, [privileges, moduleCode, permissions]);
}
