"use client";

// =====================================================================================
//  Sys_UserPermsAdmin.ts  -  لوجيك شاشة "صلاحيات خاصة بمستخدم" (استثناءات فوق الدور)
// -------------------------------------------------------------------------------------
//  - اختار مستخدم + شركة/فرع (أو "كل الشركات والفروع" = 0/0) فتظهر صلاحيات الأدوار (من الدور)
//    وأي تعديل بيعمل صف استثناء في Sys_UserModule. "إلغاء الاستثناء" بيمسح الصف ويرجّع لقيمة الدور.
//  - صف المستخدم بيغلب صف الدور في الفرونت (LoginCompany) بغض النظر عن Prc_Preference.
//  - عشان أكتر من مستخدم يبقى ليه استثناء: لازم تشغّل القسم B في Database/Phase4_Permissions.sql
//    (تغيير مفتاح Sys_UserModule) — لو لسه ما اتشغّلش الباك هيرجّع رسالة واضحة.
//  الباك: api/AdminUsers/{ListUsers, GetUser, GetUserMatrix, SaveUserMatrix, Lookups}
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import { useScreenPerm } from "../Sys_UsersAdmin/useScreenPerm";
import { adminCall as adminCallBase, AuthMode, showError, ALL_PERM_KEYS, emptyPerms, LookupBranch, LookupCompany, MatrixModule, PermKey, PermMap, UserRow } from "../Sys_UsersAdmin/AdminApi";

const MODULE_CODE = "Sys_UserPermsAdmin";

export interface PickedUser { UserID: number; USER_CODE: string; USER_NAME: string }
export interface RoleChip { RoleId: number; DescA: string; DescE: string }

export function Sys_UserPermsAdmin(mode: AuthMode = "jwt") {
  const adminCall = <T = any>(action: string, data?: any) => adminCallBase<T>(action, data, mode);
  const didRun = useRef(false);

  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const perm = useScreenPerm(MODULE_CODE, mode);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  // ---------- المستخدم ----------
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState<PickedUser | null>(null);
  const [scope, setScope] = useState("0|0");                       // "comp|branch"
  const [assigned, setAssigned] = useState<{ CompCode: number; BranchCode: number }[]>([]);
  const [companies, setCompanies] = useState<LookupCompany[]>([]);
  const [branches, setBranches] = useState<LookupBranch[]>([]);

  // ---------- المصفوفة ----------
  const [modules, setModules] = useState<MatrixModule[]>([]);
  const [roles, setRoles] = useState<RoleChip[]>([]);
  const [values, setValues] = useState<Record<string, PermMap>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [overridden, setOverridden] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchReq = useRef(0);

  const moduleByCode = useMemo(() => {
    const m = new Map<string, MatrixModule>();
    modules.forEach((x) => m.set(x.code, x));
    return m;
  }, [modules]);

  const changes = dirty.size + removed.size;
  const canSave = perm.can.edit && changes > 0 && !!user;

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    (async () => {
      try {
        const res = await adminCall<{ companies: LookupCompany[]; branches: LookupBranch[] }>("Lookups");
        setCompanies(res.companies);
        setBranches(res.branches);
        const q = new URLSearchParams(window.location.search).get("userId");
        if (q && !isNaN(Number(q))) await PickUserById(Number(q));
      } catch (e) { showError(e, IsLangEN); }
    })();
  }, []);

  // بحث المستخدم (فوري 250ms)
  useEffect(() => {
    if (!showResults) return;
    const id = ++searchReq.current;
    const h = setTimeout(async () => {
      try {
        const res = await adminCall<{ rows: UserRow[] }>("ListUsers", { search: userQuery, active: 1, page: 1, pageSize: 8 });
        if (id === searchReq.current) setUserResults(res.rows);
      } catch (e) { /* تجاهل */ }
    }, 250);
    return () => clearTimeout(h);
  }, [userQuery, showResults]);

  async function ConfirmDiscard(): Promise<boolean> {
    if (changes === 0) return true;
    return await Sys.Confirm("There are unsaved changes. Discard them?", "في تعديلات ما اتحفظتش. تتجاهلها؟", { danger: true });
  }

  async function PickUserById(userId: number) {
    const res = await adminCall<{ user: any; assignments: { CompCode: number; BranchCode: number }[] }>("GetUser", { userId });
    const u: PickedUser = { UserID: res.user.UserID, USER_CODE: res.user.USER_CODE, USER_NAME: res.user.USER_NAME || "" };
    const distinct = Array.from(new Map(res.assignments.map((a) => [`${a.CompCode}|${a.BranchCode}`, { CompCode: a.CompCode, BranchCode: a.BranchCode }])).values());
    setAssigned(distinct);
    setUser(u);
    const first = distinct[0] ? `${distinct[0].CompCode}|${distinct[0].BranchCode}` : "0|0";
    setScope(first);
    setShowResults(false);
    setUserQuery("");
    await LoadMatrix(u.UserID, first);
  }

  async function PickUser(u: UserRow) {
    if (!(await ConfirmDiscard())) return;
    try { await PickUserById(u.UserID); } catch (e) { showError(e, IsLangEN); }
  }

  async function ChangeScope(v: string) {
    if (!user) return;
    if (!(await ConfirmDiscard())) return;
    setScope(v);
    await LoadMatrix(user.UserID, v);
  }

  function mask(m: MatrixModule, v: PermMap): PermMap {
    const o = { ...emptyPerms() };
    ALL_PERM_KEYS.forEach((k) => (o[k] = !!v[k] && !!m.allow[k]));
    return o;
  }

  async function LoadMatrix(userId: number, sc: string) {
    const [c, b] = sc.split("|").map(Number);
    setLoading(true);
    try {
      const res = await adminCall<{ modules: MatrixModule[]; roles: RoleChip[] }>("GetUserMatrix", { userId, compCode: c, branchCode: b });
      const vals: Record<string, PermMap> = {};
      const ov = new Set<string>();
      res.modules.forEach((m) => {
        vals[m.code] = mask(m, m.value ?? m.inherited ?? emptyPerms());
        if (m.hasRow) ov.add(m.code);
      });
      setModules(res.modules);
      setRoles(res.roles);
      setValues(vals);
      setOverridden(ov);
      setDirty(new Set());
      setRemoved(new Set());
    } catch (e) { showError(e, IsLangEN); }
    finally { setLoading(false); }
  }

  // ---------- تعديل ----------
  function mutate(fn: (draft: Record<string, PermMap>, mark: (code: string) => void) => void) {
    const next: Record<string, PermMap> = {};
    Object.keys(values).forEach((k) => (next[k] = { ...values[k] }));
    const d = new Set(dirty), ov = new Set(overridden), rm = new Set(removed);
    fn(next, (code) => { d.add(code); ov.add(code); rm.delete(code); });
    setValues(next); setDirty(d); setOverridden(ov); setRemoved(rm);
  }
  function setCell(code: string, key: PermKey, v: boolean) {
    if (!moduleByCode.get(code)?.allow[key]) return;
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

  function RemoveOverride(code: string) {
    const m = moduleByCode.get(code);
    if (!m) return;
    setValues((s) => ({ ...s, [code]: mask(m, m.inherited ?? emptyPerms()) }));
    setOverridden((s) => { const n = new Set(s); n.delete(code); return n; });
    setDirty((s) => { const n = new Set(s); n.delete(code); return n; });
    setRemoved((s) => { const n = new Set(s); if (m.hasRow) n.add(code); return n; });
  }

  async function Save() {
    if (!canSave || !user) return;
    const [c, b] = scope.split("|").map(Number);
    setSaving(true);
    try {
      await adminCall("SaveUserMatrix", {
        userId: user.UserID, compCode: c, branchCode: b,
        rows: Array.from(dirty).filter((code) => overridden.has(code)).map((code) => ({ moduleCode: code, perms: values[code] })),
        removeModules: Array.from(removed),
      });
      Sys.ShowMessage("Overrides saved. The user sees them at next login.", "اتحفظت الاستثناءات. المستخدم هيشوفها عند الدخول الجاي.", "success");
      await LoadMatrix(user.UserID, scope);
    } catch (e) { showError(e, IsLangEN); }
    finally { setSaving(false); }
  }

  async function Undo() { if (user) await LoadMatrix(user.UserID, scope); }

  // خيارات الشركة/الفرع
  const scopeOptions = useMemo(() => {
    const compName = (cc: number) => { const c = companies.find((x) => x.CompCode === cc); return c ? (IsLangEN ? c.NameE || c.NameA : c.NameA || c.NameE) : String(cc); };
    const brName = (cc: number, bc: number) => { const b = branches.find((x) => x.CompCode === cc && x.BranchCode === bc); return b ? (IsLangEN ? b.BranchDescE || b.BranchDescA : b.BranchDescA || b.BranchDescE) : String(bc); };
    return [
      { value: "0|0", label: IsLangEN ? "All companies and branches (0 / 0)" : "كل الشركات والفروع (0 / 0)" },
      ...assigned.map((a) => ({ value: `${a.CompCode}|${a.BranchCode}`, label: `${compName(a.CompCode)} / ${brName(a.CompCode, a.BranchCode)}` })),
    ];
  }, [assigned, companies, branches, IsLangEN]);

  return {
    IsLangEN, IsDark, t, perm,
    userQuery, setUserQuery, userResults, showResults, setShowResults, user, PickUser,
    scope, scopeOptions, ChangeScope,
    modules, roles, values, dirty, overridden, removed, changes, search, setSearch, loading, saving, canSave,
    setCell, setRow, setColumn, setGroup, RemoveOverride, Save, Undo,
  };
}
