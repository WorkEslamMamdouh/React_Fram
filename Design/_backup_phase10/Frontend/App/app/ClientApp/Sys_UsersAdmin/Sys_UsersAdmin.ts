"use client";

// =====================================================================================
//  Sys_UsersAdmin.ts  -  لوجيك شاشة "المستخدمين"
// -------------------------------------------------------------------------------------
//  - قايمة المستخدمين: صفحات من السيرفر + بحث فوري (300ms) + فلتر فعّال/معطّل
//  - إضافة / تعديل مستخدم (كود فريد) + تعطيل (مفيش حذف نهائي) + تغيير كلمة السر
//  - إسناد المستخدم لشركات وفروع وأدوار (Sys_RoleUsers) — الدور 0 بيتضاف تلقائي من الباك
//  الباك: api/AdminUsers/{ListUsers, GetUser, SaveUser, SetPassword, SetUserActive, Lookups}
//  كلمة السر نص عادي في Sys_Users.USER_Password (نفس نظام الدخول الحالي) — أقصى طول 20.
//  الصلاحية على الشاشة: MODULE_CODE = Sys_UsersAdmin
// =====================================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSys } from "../Shared/SystemUsing";
import { Sys } from "../Shared/SystemTools";
import { usePermissions } from "../Shared/Permissions";
import { adminCall, showError, LookupBranch, LookupCompany, LookupRole, UserRow } from "./AdminApi";

const MODULE_CODE = "Sys_UsersAdmin";

export interface AssignmentRow { key: string; RoleId: number; CompCode: number; BranchCode: number }
export interface UserForm { UserID: number; USER_CODE: string; USER_NAME: string; USER_Email: string; Active: boolean; Password: string }

const emptyForm = (): UserForm => ({ UserID: 0, USER_CODE: "", USER_NAME: "", USER_Email: "", Active: true, Password: "" });
let keySeq = 1;
const newKey = () => "a" + keySeq++;

export function Sys_UsersAdmin() {
  const didRun = useRef(false);
  const router = useRouter();

  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const myUserId = useSys((s) => s.Session?.CurrentEnvironment?.UserID);
  const perm = usePermissions(MODULE_CODE);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  // ---------- القايمة ----------
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ Total: 0, Active: 0, Inactive: 0 });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reqId = useRef(0);

  // ---------- Lookups ----------
  const [companies, setCompanies] = useState<LookupCompany[]>([]);
  const [branches, setBranches] = useState<LookupBranch[]>([]);
  const [roles, setRoles] = useState<LookupRole[]>([]);

  // ---------- نافذة المستخدم ----------
  const [editor, setEditor] = useState({ open: false, saving: false, form: emptyForm(), assignments: [] as AssignmentRow[], errors: {} as Record<string, string>, serverError: "" });
  // ---------- نافذة كلمة السر ----------
  const [pwd, setPwd] = useState({ open: false, userId: 0, name: "", value: "", confirm: "", show: false, error: "", saving: false });

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    (async () => {
      try {
        const res = await adminCall<{ companies: LookupCompany[]; branches: LookupBranch[]; roles: LookupRole[] }>("Lookups");
        setCompanies(res.companies);
        setBranches(res.branches);
        setRoles(res.roles);
      } catch (e) { showError(e, IsLangEN); }
    })();
  }, []);

  useEffect(() => {
    const h = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(h);
  }, [search]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    adminCall<{ rows: UserRow[]; total: number; counts: any }>("ListUsers", { search: debounced, active: activeFilter, page, pageSize })
      .then((res) => {
        if (id !== reqId.current) return;     // نتيجة قديمة
        setRows(res.rows);
        setTotal(res.total);
        setCounts({ Total: res.counts?.Total ?? 0, Active: res.counts?.Active ?? 0, Inactive: res.counts?.Inactive ?? 0 });
      })
      .catch((e) => { if (id === reqId.current) showError(e, IsLangEN); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [debounced, activeFilter, page, pageSize, reloadKey]);

  const Reload = () => setReloadKey((k) => k + 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function SetFilter(v: number | null) { setActiveFilter(v); setPage(1); }
  function SetPageSize(n: number) { setPageSize(n); setPage(1); }

  // ---------- المحرر ----------
  const activeRoles = () => roles.filter((r) => r.RoleId !== 0 && r.IsAvailable);
  const branchesOf = (comp: number) => branches.filter((b) => b.CompCode === comp && b.IsActive);

  function blankAssignment(): AssignmentRow | null {
    const role = activeRoles()[0];
    const comp = companies.find((c) => c.IsActive && branchesOf(c.CompCode).length > 0);
    if (!role || !comp) return null;
    return { key: newKey(), RoleId: role.RoleId, CompCode: comp.CompCode, BranchCode: branchesOf(comp.CompCode)[0].BranchCode };
  }

  function OpenNew() {
    const a = blankAssignment();
    setEditor({ open: true, saving: false, form: emptyForm(), assignments: a ? [a] : [], errors: {}, serverError: "" });
  }

  async function OpenEdit(u: UserRow) {
    try {
      const res = await adminCall<{ user: any; assignments: { RoleId: number; CompCode: number; BranchCode: number }[] }>("GetUser", { userId: u.UserID });
      setEditor({
        open: true, saving: false, errors: {}, serverError: "",
        form: { UserID: res.user.UserID, USER_CODE: res.user.USER_CODE || "", USER_NAME: res.user.USER_NAME || "", USER_Email: res.user.USER_Email || "", Active: !!res.user.USER_ACTIVE, Password: "" },
        assignments: res.assignments.map((a) => ({ key: newKey(), ...a })),
      });
    } catch (e) { showError(e, IsLangEN); }
  }

  function CloseEditor() { setEditor((s) => ({ ...s, open: false })); }
  function SetForm(patch: Partial<UserForm>) { setEditor((s) => ({ ...s, serverError: "", errors: {}, form: { ...s.form, ...patch } })); }

  function AddAssignment() {
    const a = blankAssignment();
    if (a) setEditor((s) => ({ ...s, assignments: [...s.assignments, a] }));
  }
  function RemoveAssignment(key: string) { setEditor((s) => ({ ...s, assignments: s.assignments.filter((a) => a.key !== key) })); }
  function SetAssignment(key: string, field: "RoleId" | "CompCode" | "BranchCode" | "AllBranches", value: number) {
    setEditor((s) => {
      let list = s.assignments.slice();
      const i = list.findIndex((a) => a.key === key);
      if (i < 0) return s;
      const cur = { ...list[i] };
      if (field === "CompCode") {
        cur.CompCode = value;
        cur.BranchCode = branchesOf(value)[0]?.BranchCode ?? 0;
        list[i] = cur;
      } else if (field === "AllBranches") {
        const all = branchesOf(cur.CompCode);
        const extra = all.slice(1).map((b) => ({ key: newKey(), RoleId: cur.RoleId, CompCode: cur.CompCode, BranchCode: b.BranchCode }));
        cur.BranchCode = all[0]?.BranchCode ?? cur.BranchCode;
        list.splice(i, 1, cur, ...extra);
      } else {
        (cur as any)[field] = value;
        list[i] = cur;
      }
      return { ...s, assignments: list };
    });
  }

  function Validate(): Record<string, string> {
    const f = editor.form;
    const e: Record<string, string> = {};
    if (!f.USER_CODE.trim()) e.USER_CODE = t("User code is required", "كود المستخدم مطلوب");
    else if (f.USER_CODE.trim().length > 50) e.USER_CODE = t("Max 50 characters", "50 حرف بالكتير");
    if (!f.USER_NAME.trim()) e.USER_NAME = t("Name is required", "الاسم مطلوب");
    if (f.USER_Email.trim()) {
      if (f.USER_Email.length > 30) e.USER_Email = t("Max 30 characters", "30 حرف بالكتير");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.USER_Email.trim())) e.USER_Email = t("Invalid email", "إيميل غير صحيح");
    }
    if (f.UserID === 0 && f.Password.length < 4) e.Password = t("Password min 4 characters", "كلمة السر 4 حروف على الأقل");
    if (f.Password.length > 20) e.Password = t("Password max 20 characters", "كلمة السر 20 حرف بالكتير");
    if (f.UserID === myUserId && !f.Active) e.Active = t("You cannot deactivate your own account", "مينفعش تعطّل حسابك");
    const seen = new Set<string>();
    for (const a of editor.assignments) {
      const k = `${a.RoleId}|${a.CompCode}|${a.BranchCode}`;
      if (seen.has(k)) { e.assignments = t("Duplicate access rows", "في صفوف وصول مكررة"); break; }
      seen.add(k);
    }
    if (f.Active && editor.assignments.length === 0) e.assignments = t("Add at least one company / branch / role", "ضيف شركة / فرع / دور على الأقل");
    return e;
  }

  async function SaveUser() {
    const errors = Validate();
    if (Object.keys(errors).length > 0) { setEditor((s) => ({ ...s, errors })); return; }
    const f = editor.form;
    setEditor((s) => ({ ...s, saving: true, serverError: "" }));
    try {
      await adminCall("SaveUser", {
        userId: f.UserID, userCode: f.USER_CODE.trim(), userName: f.USER_NAME.trim(), email: f.USER_Email.trim(), active: f.Active,
        password: f.Password || null,
        assignments: editor.assignments.map((a) => ({ roleId: a.RoleId, compCode: a.CompCode, branchCode: a.BranchCode })),
      });
      Sys.ShowMessage("User saved", "اتحفظ المستخدم", "success");
      CloseEditor();
      Reload();
    } catch (e: any) {
      setEditor((s) => ({ ...s, saving: false, serverError: e?.message || String(e) }));
    }
  }

  // ---------- تعطيل / تفعيل ----------
  async function ToggleActive(u: UserRow) {
    const makeActive = !u.USER_ACTIVE;
    const ok = await Sys.Confirm(
      makeActive ? `Activate user "${u.USER_CODE}"?` : `Deactivate user "${u.USER_CODE}"? They will not be able to log in. Data is kept.`,
      makeActive ? `تفعيل المستخدم "${u.USER_CODE}"؟` : `تعطيل المستخدم "${u.USER_CODE}"؟ مش هيقدر يدخل. البيانات محفوظة.`,
      { danger: !makeActive }
    );
    if (!ok) return;
    try {
      await adminCall("SetUserActive", { userId: u.UserID, active: makeActive });
      Sys.ShowMessage(makeActive ? "User activated" : "User deactivated", makeActive ? "اتفعّل المستخدم" : "اتعطّل المستخدم", "success");
      Reload();
    } catch (e) { showError(e, IsLangEN); }
  }

  // ---------- كلمة السر ----------
  function OpenPassword(u: UserRow) {
    setPwd({ open: true, userId: u.UserID, name: u.USER_NAME || u.USER_CODE, value: "", confirm: "", show: false, error: "", saving: false });
  }
  function ClosePassword() { setPwd((s) => ({ ...s, open: false })); }
  function SetPwd(patch: Partial<typeof pwd>) { setPwd((s) => ({ ...s, error: "", ...patch })); }
  async function SavePassword() {
    if (pwd.value.length < 4) return setPwd((s) => ({ ...s, error: t("Password min 4 characters", "كلمة السر 4 حروف على الأقل") }));
    if (pwd.value.length > 20) return setPwd((s) => ({ ...s, error: t("Password max 20 characters", "كلمة السر 20 حرف بالكتير") }));
    if (pwd.value !== pwd.confirm) return setPwd((s) => ({ ...s, error: t("Passwords do not match", "كلمتين السر مش متطابقين") }));
    setPwd((s) => ({ ...s, saving: true }));
    try {
      await adminCall("SetPassword", { userId: pwd.userId, newPassword: pwd.value });
      Sys.ShowMessage("Password changed", "اتغيّرت كلمة السر", "success");
      ClosePassword();
    } catch (e: any) {
      setPwd((s) => ({ ...s, saving: false, error: e?.message || String(e) }));
    }
  }

  function OpenOverrides(u: UserRow) { router.push(`/ClientApp/Sys_UserPermsAdmin?userId=${u.UserID}`); }

  return {
    IsLangEN, IsDark, t, perm, myUserId,
    rows, total, counts, search, setSearch, activeFilter, SetFilter, page, setPage, pageSize, SetPageSize, totalPages, loading,
    companies, branches, roles, activeRoles, branchesOf,
    editor, OpenNew, OpenEdit, CloseEditor, SetForm, AddAssignment, RemoveAssignment, SetAssignment, SaveUser,
    ToggleActive, pwd, OpenPassword, ClosePassword, SetPwd, SavePassword, OpenOverrides, Reload,
  };
}
