"use client";

import type { AuthMode } from "../Shared/AdminHttp";

// =====================================================================================
//  UsersAdminView.tsx  -  الشكل بس (اللوجيك في Sys_UsersAdmin.ts)
//  المرجع: Design/Stitch/export/.../users_permissions
// =====================================================================================

import { Sys_UsersAdmin } from "./Sys_UsersAdmin";
import { Badge, Field, Modal, btnAccent, btnDanger, btnOutline, inputCls, Check } from "./AdminUi";
import { UserRow } from "./AdminApi";

/** mode: "jwt" = داخل الـ ERP (HomeLayout + صلاحيات المستخدم) | "admin" = منطقة الأدمن (AdminLayout + توكن الأدمن) */
export default function UsersAdminView({ mode = "jwt" }: { mode?: AuthMode }) {
  const p = Sys_UsersAdmin(mode);
  return <Sys_UsersAdminPage {...p} />;
}

type Props = ReturnType<typeof Sys_UsersAdmin>;

function Sys_UsersAdminPage(p: Props) {
  const t = p.t;
  const compName = (c: { NameA: string; NameE: string }) => (p.IsLangEN ? c.NameE || c.NameA : c.NameA || c.NameE);
  const branchName = (b: { BranchDescA: string; BranchDescE: string }) => (p.IsLangEN ? b.BranchDescE || b.BranchDescA : b.BranchDescA || b.BranchDescE);
  const roleName = (r: { DescA: string; DescE: string }) => (p.IsLangEN ? r.DescE || r.DescA : r.DescA || r.DescE);

  const tabs: { v: number | null; label: string; n: number }[] = [
    { v: null, label: t("All", "الكل"), n: p.counts.Total },
    { v: 1, label: t("Active", "فعّال"), n: p.counts.Active },
    { v: 0, label: t("Inactive", "معطّل"), n: p.counts.Inactive },
  ];

  const statusBadge = (u: UserRow) => (u.USER_ACTIVE ? <Badge tone="success">{t("Active", "فعّال")}</Badge> : <Badge tone="danger">{t("Inactive", "معطّل")}</Badge>);
  const rolesText = (u: UserRow) => (p.IsLangEN ? u.RolesE : u.RolesA) || "—";

  const actions = (u: UserRow) => (
    <div className="flex items-center gap-1">
      {p.perm.can.edit && (
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-3 max-md:h-11 max-md:w-11" title={t("Edit", "تعديل")} aria-label={t("Edit", "تعديل")} onClick={() => p.OpenEdit(u)}>
          <i className="fa-solid fa-pen" aria-hidden="true" />
        </button>
      )}
      {p.perm.can.edit && (
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-3 max-md:h-11 max-md:w-11" title={t("Set password", "تغيير كلمة السر")} aria-label={t("Set password", "تغيير كلمة السر")} onClick={() => p.OpenPassword(u)}>
          <i className="fa-solid fa-key" aria-hidden="true" />
        </button>
      )}
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-3 max-md:h-11 max-md:w-11" title={t("Permission overrides", "صلاحيات خاصة")} aria-label={t("Permission overrides", "صلاحيات خاصة")} onClick={() => p.OpenOverrides(u)}>
        <i className="fa-solid fa-shield-halved" aria-hidden="true" />
      </button>
      {p.perm.can.edit && u.UserID !== p.myUserId && (
        <button type="button" className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-erp-surface-3 max-md:h-11 max-md:w-11 ${u.USER_ACTIVE ? "text-erp-danger-text" : "text-erp-success-text"}`}
          title={u.USER_ACTIVE ? t("Deactivate", "تعطيل") : t("Activate", "تفعيل")} aria-label={u.USER_ACTIVE ? t("Deactivate", "تعطيل") : t("Activate", "تفعيل")} onClick={() => p.ToggleActive(u)}>
          <i className={u.USER_ACTIVE ? "fa-solid fa-user-slash" : "fa-solid fa-user-check"} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  const e = p.editor;
  const f = e.form;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* العنوان */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-erp-text md:text-[28px]">{t("Users", "المستخدمين")}</h1>
          <p className="text-[13px] text-erp-text-muted">{t("Manage users, their passwords and the companies / branches / roles they can use.", "إدارة المستخدمين وكلمات السر والشركات والفروع والأدوار المسموحة لكل واحد.")}</p>
        </div>
        {p.perm.can.create && (
          <button type="button" className={btnAccent} onClick={p.OpenNew}>
            <i className="fa-solid fa-user-plus" aria-hidden="true" /> {t("New user", "مستخدم جديد")}
          </button>
        )}
      </div>

      {/* تابات + بحث */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-3">
        <div className="flex rounded-lg bg-erp-surface-2 p-1" role="tablist">
          {tabs.map((tb) => (
            <button key={String(tb.v)} type="button" role="tab" aria-selected={p.activeFilter === tb.v} onClick={() => p.SetFilter(tb.v)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium max-md:py-2.5 ${p.activeFilter === tb.v ? "bg-erp-surface text-erp-text shadow-sm" : "text-erp-text-muted hover:text-erp-text"}`}>
              {tb.label} <span className="num text-[11px]">({tb.n})</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 -translate-y-1/2 text-erp-text-subtle start-3" aria-hidden="true" />
          <input className={inputCls + " ps-9"} value={p.search} onChange={(ev) => p.setSearch(ev.target.value)} placeholder={t("Search by code, name or email...", "ابحث بالكود أو الاسم أو الإيميل...")} aria-label={t("Search users", "بحث المستخدمين")} />
        </div>
      </div>

      {/* الجدول (ديسكتوب) */}
      <div className={`hidden overflow-x-auto rounded-xl border border-erp-border bg-erp-surface md:block ${p.loading ? "opacity-60" : ""}`} aria-busy={p.loading}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-erp-surface-2 text-[11px] font-semibold tracking-wide text-erp-text-muted">
              <th className="px-3 py-2 text-start">{t("Code", "الكود")}</th>
              <th className="px-3 py-2 text-start">{t("Name", "الاسم")}</th>
              <th className="px-3 py-2 text-start">{t("Email", "الإيميل")}</th>
              <th className="px-3 py-2 text-start">{t("Roles", "الأدوار")}</th>
              <th className="px-3 py-2 text-center">{t("Companies", "الشركات")}</th>
              <th className="px-3 py-2 text-center">{t("Branches", "الفروع")}</th>
              <th className="px-3 py-2 text-start">{t("Status", "الحالة")}</th>
              <th className="px-3 py-2 text-start">{t("Actions", "إجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((u) => (
              <tr key={u.UserID} className="border-t border-erp-border hover:bg-erp-accent-soft">
                <td className="px-3 py-2 font-medium text-erp-text" dir="ltr"><bdi>{u.USER_CODE}</bdi></td>
                <td className="px-3 py-2 text-erp-text">{u.USER_NAME || "—"}</td>
                <td className="px-3 py-2 text-erp-text-muted" dir="ltr"><bdi>{u.USER_Email || "—"}</bdi></td>
                <td className="max-w-[220px] truncate px-3 py-2 text-erp-text-muted" title={rolesText(u)}>{rolesText(u)}</td>
                <td className="num px-3 py-2 text-center">{u.Companies}</td>
                <td className="num px-3 py-2 text-center">{u.Branches}</td>
                <td className="px-3 py-2">{statusBadge(u)}</td>
                <td className="px-3 py-2">{actions(u)}</td>
              </tr>
            ))}
            {p.rows.length === 0 && !p.loading && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-erp-text-muted">{t("No users found", "مفيش مستخدمين")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* كروت (موبايل) */}
      <div className={`space-y-2 md:hidden ${p.loading ? "opacity-60" : ""}`}>
        {p.rows.map((u) => (
          <div key={u.UserID} className="rounded-xl border border-erp-border bg-erp-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-erp-text">{u.USER_NAME || u.USER_CODE}</div>
                <div className="text-[12px] text-erp-text-muted" dir="ltr"><bdi>{u.USER_CODE}</bdi></div>
              </div>
              {statusBadge(u)}
            </div>
            <div className="mt-2 text-[12px] text-erp-text-muted">{rolesText(u)} · <span className="num">{u.Companies}</span> {t("companies", "شركة")} · <span className="num">{u.Branches}</span> {t("branches", "فرع")}</div>
            <div className="mt-2 flex justify-end">{actions(u)}</div>
          </div>
        ))}
        {p.rows.length === 0 && !p.loading && <div className="rounded-xl border border-erp-border bg-erp-surface p-6 text-center text-erp-text-muted">{t("No users found", "مفيش مستخدمين")}</div>}
      </div>

      {/* الصفحات */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-erp-text-muted">
        <div>{t("Showing", "عرض")} <span className="num">{p.rows.length}</span> {t("of", "من")} <span className="num">{p.total}</span></div>
        <div className="flex items-center gap-2">
          <select className={inputCls + " !w-auto"} value={p.pageSize} onChange={(ev) => p.SetPageSize(Number(ev.target.value))} aria-label={t("Page size", "حجم الصفحة")}>
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button type="button" className={btnOutline} disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)} aria-label={t("Previous", "السابق")}><i className="fa-solid fa-chevron-left rtl:rotate-180" aria-hidden="true" /></button>
          <span className="num">{p.page} / {p.totalPages}</span>
          <button type="button" className={btnOutline} disabled={p.page >= p.totalPages} onClick={() => p.setPage(p.page + 1)} aria-label={t("Next", "التالي")}><i className="fa-solid fa-chevron-right rtl:rotate-180" aria-hidden="true" /></button>
        </div>
      </div>

      {/* نافذة المستخدم */}
      <Modal open={e.open} wide onClose={p.CloseEditor} title={f.UserID ? t("Edit user", "تعديل مستخدم") : t("New user", "مستخدم جديد")}
        footer={<>
          <button type="button" className={btnOutline} onClick={p.CloseEditor}>{t("Cancel", "إلغاء")}</button>
          <button type="button" className={btnAccent} disabled={e.saving} onClick={p.SaveUser}>{e.saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}</button>
        </>}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("User code (login)", "كود المستخدم (للدخول)")} required error={e.errors.USER_CODE}>
              <input className={inputCls} value={f.USER_CODE} onChange={(ev) => p.SetForm({ USER_CODE: ev.target.value })} dir="ltr" maxLength={50} autoComplete="off" />
            </Field>
            <Field label={t("Full name", "الاسم")} required error={e.errors.USER_NAME}>
              <input className={inputCls} value={f.USER_NAME} onChange={(ev) => p.SetForm({ USER_NAME: ev.target.value })} />
            </Field>
            <Field label={t("Email", "الإيميل")} error={e.errors.USER_Email}>
              <input className={inputCls} value={f.USER_Email} onChange={(ev) => p.SetForm({ USER_Email: ev.target.value })} dir="ltr" maxLength={30} autoComplete="off" />
            </Field>
            <Field label={f.UserID ? t("New password (leave empty to keep)", "كلمة سر جديدة (سيبها فاضية للإبقاء)") : t("Password", "كلمة السر")} required={!f.UserID} error={e.errors.Password}
              hint={t("4 to 20 characters", "من 4 إلى 20 حرف")}>
              <input className={inputCls} type="password" value={f.Password} onChange={(ev) => p.SetForm({ Password: ev.target.value })} dir="ltr" maxLength={20} autoComplete="new-password" />
            </Field>
          </div>

          <div>
            <label className="flex items-center gap-2 text-[13px] text-erp-text">
              <Check checked={f.Active} onChange={(v) => p.SetForm({ Active: v })} label={t("Active", "فعّال")} />
              {t("Active (can log in)", "فعّال (يقدر يدخل)")}
            </label>
            {e.errors.Active && <div className="mt-1 text-[12px] text-erp-danger">{e.errors.Active}</div>}
          </div>

          {/* الوصول */}
          <div className="rounded-xl border border-erp-border">
            <div className="flex items-center justify-between border-b border-erp-border bg-erp-surface-2 px-3 py-2">
              <div className="text-[13px] font-semibold text-erp-text">{t("Access: company / branch / role", "الوصول: شركة / فرع / دور")}</div>
              <button type="button" className={btnOutline + " !h-8"} onClick={p.AddAssignment}><i className="fa-solid fa-plus" aria-hidden="true" /> {t("Add", "إضافة")}</button>
            </div>
            <div className="space-y-2 p-3">
              {e.assignments.length === 0 && <div className="text-[13px] text-erp-text-muted">{t("No access rows. The user will not be able to choose a company at login.", "مفيش وصول. المستخدم مش هيلاقي شركة يدخل عليها.")}</div>}
              {e.assignments.map((a) => (
                <div key={a.key} className="grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <select className={inputCls} value={a.CompCode} onChange={(ev) => p.SetAssignment(a.key, "CompCode", Number(ev.target.value))} aria-label={t("Company", "الشركة")}>
                    {p.companies.filter((c) => c.IsActive || c.CompCode === a.CompCode).map((c) => <option key={c.CompCode} value={c.CompCode}>{compName(c)}</option>)}
                  </select>
                  <select className={inputCls} value={a.BranchCode}
                    onChange={(ev) => ev.target.value === "*" ? p.SetAssignment(a.key, "AllBranches", 0) : p.SetAssignment(a.key, "BranchCode", Number(ev.target.value))} aria-label={t("Branch", "الفرع")}>
                    {p.branchesOf(a.CompCode).map((b) => <option key={b.BranchCode} value={b.BranchCode}>{branchName(b)}</option>)}
                    {p.branchesOf(a.CompCode).length > 1 && <option value="*">{t("+ add all branches of this company", "+ كل فروع الشركة دي")}</option>}
                  </select>
                  <select className={inputCls} value={a.RoleId} onChange={(ev) => p.SetAssignment(a.key, "RoleId", Number(ev.target.value))} aria-label={t("Role", "الدور")}>
                    {p.roles.filter((r) => r.RoleId !== 0 && (r.IsAvailable || r.RoleId === a.RoleId)).map((r) => <option key={r.RoleId} value={r.RoleId}>{roleName(r)}</option>)}
                  </select>
                  <button type="button" className={btnDanger + " !px-3"} onClick={() => p.RemoveAssignment(a.key)} aria-label={t("Remove", "حذف الصف")}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
                </div>
              ))}
              {e.errors.assignments && <div className="text-[12px] text-erp-danger">{e.errors.assignments}</div>}
            </div>
          </div>

          {e.serverError && <div role="alert" className="rounded-lg border border-erp-danger-border bg-erp-danger-bg px-3 py-2 text-[13px] text-erp-danger-text">{e.serverError}</div>}
        </div>
      </Modal>

      {/* نافذة كلمة السر */}
      <Modal open={p.pwd.open} onClose={p.ClosePassword} title={`${t("Set password", "تغيير كلمة السر")} - ${p.pwd.name}`}
        footer={<>
          <button type="button" className={btnOutline} onClick={p.ClosePassword}>{t("Cancel", "إلغاء")}</button>
          <button type="button" className={btnAccent} disabled={p.pwd.saving} onClick={p.SavePassword}>{t("Save", "حفظ")}</button>
        </>}>
        <div className="space-y-3">
          <Field label={t("New password", "كلمة السر الجديدة")} required hint={t("4 to 20 characters", "من 4 إلى 20 حرف")}>
            <input className={inputCls} type={p.pwd.show ? "text" : "password"} value={p.pwd.value} onChange={(ev) => p.SetPwd({ value: ev.target.value })} dir="ltr" maxLength={20} autoComplete="new-password" />
          </Field>
          <Field label={t("Confirm password", "تأكيد كلمة السر")} required>
            <input className={inputCls} type={p.pwd.show ? "text" : "password"} value={p.pwd.confirm} onChange={(ev) => p.SetPwd({ confirm: ev.target.value })} dir="ltr" maxLength={20} autoComplete="new-password" />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-erp-text">
            <Check checked={p.pwd.show} onChange={(v) => p.SetPwd({ show: v })} label={t("Show", "إظهار")} /> {t("Show password", "إظهار كلمة السر")}
          </label>
          {p.pwd.error && <div role="alert" className="rounded-lg border border-erp-danger-border bg-erp-danger-bg px-3 py-2 text-[13px] text-erp-danger-text">{p.pwd.error}</div>}
        </div>
      </Modal>
    </div>
  );
}
