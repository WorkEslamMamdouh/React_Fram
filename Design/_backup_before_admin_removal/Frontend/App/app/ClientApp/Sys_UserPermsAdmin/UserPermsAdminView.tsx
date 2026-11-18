"use client";

import type { AuthMode } from "../Shared/AdminHttp";

// =====================================================================================
//  UserPermsAdminView.tsx  -  الشكل بس (اللوجيك في Sys_UserPermsAdmin.ts)
// =====================================================================================

import { Sys_UserPermsAdmin } from "./Sys_UserPermsAdmin";
import PermissionMatrix from "../Sys_RolesAdmin/PermissionMatrix";
import { Badge, btnAccent, btnOutline, inputCls } from "../Sys_UsersAdmin/AdminUi";

/** mode: "jwt" = داخل الـ ERP (HomeLayout + صلاحيات المستخدم) | "admin" = منطقة الأدمن (AdminLayout + توكن الأدمن) */
export default function UserPermsAdminView({ mode = "jwt" }: { mode?: AuthMode }) {
  const p = Sys_UserPermsAdmin(mode);
  return <Sys_UserPermsAdminPage {...p} />;
}

type Props = ReturnType<typeof Sys_UserPermsAdmin>;

function Sys_UserPermsAdminPage(p: Props) {
  const t = p.t;
  const roleName = (r: { DescA: string; DescE: string }) => (p.IsLangEN ? r.DescE || r.DescA : r.DescA || r.DescE);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-[22px] font-bold text-erp-text md:text-[28px]">{t("User permission overrides", "صلاحيات خاصة بمستخدم")}</h1>
        <p className="text-[13px] text-erp-text-muted">
          {t("Role permissions apply by default. Change a cell to create an override for this user only; remove the override to go back to the role.",
            "صلاحيات الدور هي الأساس. غيّر أي خانة عشان تعمل استثناء للمستخدم ده بس، وامسح الاستثناء للرجوع لصلاحية الدور.")}
        </p>
      </div>

      {/* اختيار المستخدم والشركة/الفرع */}
      <div className="grid gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 md:grid-cols-2">
        <div className="relative">
          <span className="mb-1 block text-[13px] font-medium text-erp-text">{t("User", "المستخدم")}</span>
          <input className={inputCls} value={p.userQuery} placeholder={p.user ? `${p.user.USER_NAME || ""} (${p.user.USER_CODE})` : t("Search user by code or name...", "ابحث عن مستخدم بالكود أو الاسم...")}
            onFocus={() => p.setShowResults(true)} onChange={(e) => { p.setUserQuery(e.target.value); p.setShowResults(true); }}
            onBlur={() => setTimeout(() => p.setShowResults(false), 200)} aria-label={t("Search user", "بحث المستخدم")} autoComplete="off" />
          {p.showResults && (
            <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-erp-border bg-erp-surface shadow-lg">
              {p.userResults.map((u) => (
                <li key={u.UserID}>
                  <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-[13px] hover:bg-erp-surface-2" onMouseDown={() => p.PickUser(u)}>
                    <span className="truncate text-erp-text">{u.USER_NAME || u.USER_CODE}</span>
                    <span className="text-[11px] text-erp-text-muted" dir="ltr">{u.USER_CODE}</span>
                  </button>
                </li>
              ))}
              {p.userResults.length === 0 && <li className="px-3 py-2 text-[13px] text-erp-text-muted">{t("No users", "مفيش نتايج")}</li>}
            </ul>
          )}
        </div>
        <div>
          <span className="mb-1 block text-[13px] font-medium text-erp-text">{t("Company / branch", "الشركة / الفرع")}</span>
          <select className={inputCls} value={p.scope} disabled={!p.user} onChange={(e) => p.ChangeScope(e.target.value)} aria-label={t("Company / branch", "الشركة / الفرع")}>
            {p.scopeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {p.user && (
          <div className="flex flex-wrap items-center gap-2 text-[13px] md:col-span-2">
            <span className="font-semibold text-erp-text">{p.user.USER_NAME || p.user.USER_CODE}</span>
            <span className="text-erp-text-muted">{t("Roles in this company:", "الأدوار في الشركة دي:")}</span>
            {p.roles.length === 0 ? <Badge tone="warning">{t("none", "مفيش")}</Badge> : p.roles.map((r) => <Badge key={r.RoleId} tone="info">{roleName(r)}</Badge>)}
          </div>
        )}
      </div>

      {!p.user && (
        <div className="rounded-xl border border-dashed border-erp-border-strong bg-erp-surface p-10 text-center text-erp-text-muted">
          {t("Pick a user to see and edit their permissions.", "اختار مستخدم عشان تشوف وتعدّل صلاحياته.")}
        </div>
      )}

      {p.user && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-erp-border bg-erp-surface p-3">
            <div className="min-w-[160px] flex-1 text-[12px] text-erp-text-muted">
              <Badge tone="warning">{t("Override", "استثناء")}</Badge> {p.overridden.size} {t("screens", "شاشة")}
              {p.changes > 0 && <span className="ms-2 text-erp-warning-text">· {p.changes} {t("unsaved changes", "تعديل لسه ما اتحفظش")}</span>}
            </div>
            <input className={inputCls + " md:max-w-[220px]"} value={p.search} onChange={(e) => p.setSearch(e.target.value)} placeholder={t("Search screens...", "ابحث في الشاشات...")} aria-label={t("Search screens", "بحث الشاشات")} />
            {p.perm.can.edit && (
              <>
                <button type="button" className={btnOutline} disabled={p.changes === 0} onClick={p.Undo}>{t("Undo changes", "تراجع")}</button>
                <button type="button" className={btnAccent} disabled={!p.canSave || p.saving} onClick={p.Save}>
                  <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {p.saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
                </button>
              </>
            )}
          </div>

          <div className={p.loading ? "opacity-60" : ""} aria-busy={p.loading}>
            <PermissionMatrix
              IsLangEN={p.IsLangEN} mode="user" modules={p.modules} values={p.values} dirty={p.dirty} overridden={p.overridden} search={p.search}
              readOnly={!p.perm.can.edit}
              onCell={p.setCell} onRow={p.setRow} onColumn={p.setColumn} onGroup={p.setGroup} onRemoveOverride={p.RemoveOverride}
            />
          </div>
        </>
      )}
    </div>
  );
}
