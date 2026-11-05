"use client";

// =====================================================================================
//  Sys_RolesAdmin.ts  -  لوجيك شاشة "الأدوار والصلاحيات"
// -------------------------------------------------------------------------------------
//  - قايمة الأدوار (إضافة/تعديل دور، مفيش حذف: التعطيل بـ IsAvailable)
//  - جدول الصلاحيات للدور المختار (Sys_RoleModule) + نسخ من دور تاني + حفظ في ترانزاكشن واحد
//  الباك: api/AdminUsers/{ListRoles, SaveRole, GetRoleMatrix, SaveRoleMatrix}
//  الصلاحية على الشاشة: MODULE_CODE = Sys_RolesAdmin
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import { usePermissions } from "../Shared/Permissions";
import { adminCall, showError, ALL_PERM_KEYS, emptyPerms, MatrixModule, PermKey, PermMap, RoleRow } from "../Sys_UsersAdmin/AdminApi";

const MODULE_CODE = "Sys_RolesAdmin";

export interface RoleForm {
  RoleId: number;       // -1 = جديد
  DescA: string;
  DescE: string;
  Remarks: string;
  IsAvailable: boolean;
  IsAdmin: boolean;
}

export function Sys_RolesAdmin() {
  const didRun = useRef(false);

  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);
  const perm = usePermissions(MODULE_CODE);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  // ---------- State ----------
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [hasIsAdmin, setHasIsAdmin] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [modules, setModules] = useState<MatrixModule[]>([]);
  const [values, setValues] = useState<Record<string, PermMap>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [roleModal, setRoleModal] = useState<{ open: boolean; form: RoleForm; error: string }>({
    open: false, error: "", form: { RoleId: -1, DescA: "", DescE: "", Remarks: "", IsAvailable: true, IsAdmin: false },
  });

  const moduleByCode = useMemo(() => {
    const m = new Map<string, MatrixModule>();
    modules.forEach((x) => m.set(x.code, x));
    return m;
  }, [modules]);

  const selectedRole = roles.find((r) => r.RoleId === selectedRoleId) || null;
  const canSave = perm.can.edit && dirty.size > 0 && selectedRoleId !== null;

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    LoadRoles();
  }, []);

  // ---------- تحميل ----------
  async function LoadRoles(selectId?: number) {
    try {
      const res = await adminCall<{ rows: RoleRow[]; hasIsAdmin: boolean }>("ListRoles");
      setRoles(res.rows);
      setHasIsAdmin(res.hasIsAdmin);
      const pick = selectId ?? selectedRoleId ?? (res.rows.find((r) => r.RoleId !== 0)?.RoleId ?? res.rows[0]?.RoleId ?? null);
      if (pick !== null && pick !== undefined) await LoadMatrix(pick);
    } catch (e) { showError(e, IsLangEN); }
  }

  async function LoadMatrix(roleId: number) {
    setLoading(true);
    try {
      const res = await adminCall<{ modules: MatrixModule[] }>("GetRoleMatrix", { roleId });
      const vals: Record<string, PermMap> = {};
      res.modules.forEach((m) => (vals[m.code] = mask(m, m.value ?? emptyPerms())));
      setModules(res.modules);
      setValues(vals);
      setDirty(new Set());
      setSelectedRoleId(roleId);
      setCopyFrom("");
    } catch (e) { showError(e, IsLangEN); }
    finally { setLoading(false); }
  }

  /** الخانات اللي الشاشة نفسها مابتسمحش بيها بتتصفّر */
  function mask(m: MatrixModule, v: PermMap): PermMap {
    const o = { ...emptyPerms() };
    ALL_PERM_KEYS.forEach((k) => (o[k] = !!v[k] && !!m.allow[k]));
    return o;
  }

  async function SelectRole(roleId: number) {
    if (roleId === selectedRoleId) return;
    if (dirty.size > 0) {
      const ok = await Sys.Confirm("There are unsaved changes. Discard them?", "في تعديلات ما اتحفظتش. تتجاهلها؟", { danger: true });
      if (!ok) return;
    }
    await LoadMatrix(roleId);
  }

  // ---------- تعديل الخانات ----------
  function mutate(fn: (draft: Record<string, PermMap>, mark: (code: string) => void) => void) {
    const next: Record<string, PermMap> = {};
    Object.keys(values).forEach((k) => (next[k] = { ...values[k] }));
    const d = new Set(dirty);
    fn(next, (code) => d.add(code));
    setValues(next);
    setDirty(d);
  }

  function setCell(code: string, key: PermKey, v: boolean) {
    const m = moduleByCode.get(code);
    if (!m || !m.allow[key]) return;
    mutate((draft, mark) => { draft[code][key] = v; mark(code); });
  }
  function setRow(code: string, v: boolean) {
    const m = moduleByCode.get(code);
    if (!m) return;
    mutate((draft, mark) => { ALL_PERM_KEYS.forEach((k) => { if (m.allow[k]) draft[code][k] = v; }); mark(code); });
  }
  function setColumn(key: PermKey, v: boolean, codes: string[]) {
    mutate((draft, mark) => codes.forEach((c) => { if (moduleByCode.get(c)?.allow[key]) { draft[c][key] = v; mark(c); } }));
  }
  function setGroup(codes: string[], v: boolean) {
    mutate((draft, mark) => codes.forEach((c) => {
      const m = moduleByCode.get(c);
      if (!m) return;
      ALL_PERM_KEYS.forEach((k) => { if (m.allow[k]) draft[c][k] = v; });
      mark(c);
    }));
  }

  // ---------- نسخ من دور ----------
  async function CopyFromRole() {
    const src = Number(copyFrom);
    if (!copyFrom || isNaN(src) || selectedRoleId === null) return;
    const srcName = roles.find((r) => r.RoleId === src);
    const ok = await Sys.Confirm(
      `Replace ALL permissions of this role with those of "${srcName?.DescE}"? (not saved until you press Save)`,
      `استبدال كل صلاحيات الدور بصلاحيات "${srcName?.DescA}"؟ (مش هتتحفظ غير لما تدوس حفظ)`,
      { danger: true }
    );
    if (!ok) return;
    try {
      const res = await adminCall<{ modules: MatrixModule[] }>("GetRoleMatrix", { roleId: src });
      const srcVals = new Map(res.modules.map((m) => [m.code, m.value ?? emptyPerms()]));
      mutate((draft, mark) => {
        modules.forEach((m) => {
          const nv = mask(m, srcVals.get(m.code) ?? emptyPerms());
          if (ALL_PERM_KEYS.some((k) => nv[k] !== draft[m.code][k])) { draft[m.code] = nv; mark(m.code); }
        });
      });
      Sys.ShowMessage("Permissions copied. Review then press Save.", "اتنسخت الصلاحيات. راجع وبعدين دوس حفظ.", "info");
    } catch (e) { showError(e, IsLangEN); }
  }

  // ---------- حفظ ----------
  async function SaveMatrix() {
    if (!canSave || selectedRoleId === null) return;
    setSaving(true);
    try {
      const rows = Array.from(dirty).map((code) => ({ moduleCode: code, perms: values[code] }));
      await adminCall("SaveRoleMatrix", { roleId: selectedRoleId, rows });
      Sys.ShowMessage("Permissions saved. Users see changes at next login.", "اتحفظت الصلاحيات. المستخدمين هيشوفوها عند الدخول الجاي.", "success");
      await LoadRoles(selectedRoleId);
    } catch (e) { showError(e, IsLangEN); }
    finally { setSaving(false); }
  }

  async function ResetChanges() {
    if (selectedRoleId !== null) await LoadMatrix(selectedRoleId);
  }

  // ---------- الدور نفسه ----------
  function OpenRoleModal(r?: RoleRow) {
    setRoleModal({
      open: true, error: "",
      form: r
        ? { RoleId: r.RoleId, DescA: r.DescA || "", DescE: r.DescE || "", Remarks: r.Remarks || "", IsAvailable: !!r.IsAvailable, IsAdmin: !!r.IsAdmin }
        : { RoleId: -1, DescA: "", DescE: "", Remarks: "", IsAvailable: true, IsAdmin: false },
    });
  }
  function CloseRoleModal() { setRoleModal((s) => ({ ...s, open: false })); }
  function SetRoleForm(patch: Partial<RoleForm>) { setRoleModal((s) => ({ ...s, error: "", form: { ...s.form, ...patch } })); }

  async function SaveRole() {
    const f = roleModal.form;
    if (!f.DescA.trim() || !f.DescE.trim()) {
      setRoleModal((s) => ({ ...s, error: t("Arabic and English names are required", "الاسم العربي والإنجليزي مطلوبين") }));
      return;
    }
    try {
      const res = await adminCall<{ roleId: number }>("SaveRole", {
        roleId: f.RoleId, descA: f.DescA, descE: f.DescE, remarks: f.Remarks, isAvailable: f.IsAvailable,
        compCode: Session?.CurrentEnvironment?.CompCode || 1, isAdmin: hasIsAdmin ? f.IsAdmin : null,
      });
      CloseRoleModal();
      Sys.ShowMessage("Role saved", "اتحفظ الدور", "success");
      await LoadRoles(res.roleId);
    } catch (e: any) {
      setRoleModal((s) => ({ ...s, error: e?.message || String(e) }));
    }
  }

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return roles.filter((r) => !q || (r.DescA || "").toLowerCase().includes(q) || (r.DescE || "").toLowerCase().includes(q) || String(r.RoleId) === q);
  }, [roles, roleSearch]);

  return {
    IsLangEN, IsDark, t, perm,
    roles: filteredRoles, allRoles: roles, hasIsAdmin, roleSearch, setRoleSearch,
    selectedRoleId, selectedRole, modules, values, dirty, search, setSearch, loading, saving, canSave,
    copyFrom, setCopyFrom, roleModal,
    SelectRole, setCell, setRow, setColumn, setGroup, CopyFromRole, SaveMatrix, ResetChanges,
    OpenRoleModal, CloseRoleModal, SetRoleForm, SaveRole,
  };
}
