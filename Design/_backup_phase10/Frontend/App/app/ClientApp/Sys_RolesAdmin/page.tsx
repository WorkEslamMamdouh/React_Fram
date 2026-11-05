"use client";

// =====================================================================================
//  Sys_RolesAdmin/page.tsx  -  الشكل بس (اللوجيك في Sys_RolesAdmin.ts)
//  المرجع: Design/Stitch/export/.../users_permissions
// =====================================================================================

import { Sys_RolesAdmin } from "./Sys_RolesAdmin";
import PermissionMatrix from "./PermissionMatrix";
import { Badge, Field, Modal, btnAccent, btnOutline, inputCls, Check } from "../Sys_UsersAdmin/AdminUi";

export default function InitalizeComponent() {
  const p = Sys_RolesAdmin();
  return <Sys_RolesAdminPage {...p} />;
}

type Props = ReturnType<typeof Sys_RolesAdmin>;

function Sys_RolesAdminPage(p: Props) {
  const t = p.t;
  const roleName = (r: { DescA: string; DescE: string }) => (p.IsLangEN ? r.DescE || r.DescA : r.DescA || r.DescE);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* العنوان */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-erp-text md:text-[28px]">{t("Roles & Permissions", "الأدوار والصلاحيات")}</h1>
          <p className="text-[13px] text-erp-text-muted">
            {t("Choose a role then set what each screen allows. Changes reach users at their next login.", "اختار دور وحدد كل شاشة تسمح بإيه. التغيير بيوصل للمستخدمين عند الدخول الجاي.")}
          </p>
        </div>
        {p.perm.can.create && (
          <button type="button" className={btnAccent} onClick={() => p.OpenRoleModal()}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> {t("New role", "دور جديد")}
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* قايمة الأدوار */}
        <aside className="space-y-2 rounded-xl border border-erp-border bg-erp-surface p-3">
          <input className={inputCls} value={p.roleSearch} onChange={(e) => p.setRoleSearch(e.target.value)} placeholder={t("Search roles...", "ابحث في الأدوار...")} aria-label={t("Search roles", "بحث الأدوار")} />
          <ul className="max-h-[320px] space-y-1 overflow-y-auto lg:max-h-[70vh]">
            {p.roles.map((r) => {
              const active = r.RoleId === p.selectedRoleId;
              return (
                <li key={r.RoleId}>
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${active ? "border-erp-accent bg-erp-accent-soft" : "border-transparent hover:bg-erp-surface-2"}`}>
                    <button type="button" onClick={() => p.SelectRole(r.RoleId)} className="min-w-0 flex-1 text-start">
                      <div className="truncate text-[13px] font-semibold text-erp-text">
                        {r.RoleId === 0 ? t("General settings (all users)", "إعدادات عامة (كل المستخدمين)") : roleName(r)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-erp-text-muted">
                        <span className="num">#{r.RoleId}</span>
                        <span>· {r.Users} {t("users", "مستخدم")}</span>
                        <span>· {r.Modules} {t("screens", "شاشة")}</span>
                        {!r.IsAvailable && <Badge tone="danger">{t("Inactive", "معطّل")}</Badge>}
                        {!!r.IsAdmin && <Badge tone="info">{t("Admin", "أدمن")}</Badge>}
                      </div>
                    </button>
                    {p.perm.can.edit && r.RoleId !== 0 && (
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-erp-text-muted hover:bg-erp-surface-3" aria-label={t("Edit role", "تعديل الدور")} onClick={() => p.OpenRoleModal(r)}>
                        <i className="fa-solid fa-pen" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* الجدول */}
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-erp-border bg-erp-surface p-3">
            <div className="min-w-[160px] flex-1">
              <div className="text-[15px] font-semibold text-erp-text">{p.selectedRole ? (p.selectedRole.RoleId === 0 ? t("General settings (all users)", "إعدادات عامة (كل المستخدمين)") : roleName(p.selectedRole)) : "—"}</div>
              {p.dirty.size > 0 && <div className="text-[12px] text-erp-warning-text">{p.dirty.size} {t("screens changed - not saved", "شاشة اتغيّرت - لسه ما اتحفظتش")}</div>}
            </div>
            <input className={inputCls + " md:max-w-[220px]"} value={p.search} onChange={(e) => p.setSearch(e.target.value)} placeholder={t("Search screens...", "ابحث في الشاشات...")} aria-label={t("Search screens", "بحث الشاشات")} />
            {p.perm.can.edit && (
              <>
                <select className={inputCls + " md:max-w-[190px]"} value={p.copyFrom} onChange={(e) => p.setCopyFrom(e.target.value)} aria-label={t("Copy permissions from role", "نسخ الصلاحيات من دور")}>
                  <option value="">{t("Copy from role...", "نسخ من دور...")}</option>
                  {p.allRoles.filter((r) => r.RoleId !== p.selectedRoleId).map((r) => <option key={r.RoleId} value={r.RoleId}>{r.RoleId === 0 ? t("General settings", "إعدادات عامة") : roleName(r)}</option>)}
                </select>
                <button type="button" className={btnOutline} disabled={!p.copyFrom} onClick={p.CopyFromRole}>
                  <i className="fa-regular fa-copy" aria-hidden="true" /> {t("Copy", "نسخ")}
                </button>
                <button type="button" className={btnOutline} disabled={p.dirty.size === 0} onClick={p.ResetChanges}>{t("Undo changes", "تراجع")}</button>
                <button type="button" className={btnAccent} disabled={!p.canSave || p.saving} onClick={p.SaveMatrix}>
                  <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {p.saving ? t("Saving...", "جاري الحفظ...") : t("Save", "حفظ")}
                </button>
              </>
            )}
          </div>

          <div className={p.loading ? "opacity-60" : ""} aria-busy={p.loading}>
            <PermissionMatrix
              IsLangEN={p.IsLangEN} mode="role" modules={p.modules} values={p.values} dirty={p.dirty} search={p.search}
              readOnly={!p.perm.can.edit}
              onCell={p.setCell} onRow={p.setRow} onColumn={p.setColumn} onGroup={p.setGroup}
            />
          </div>
        </section>
      </div>

      {/* نافذة الدور */}
      <Modal
        open={p.roleModal.open}
        onClose={p.CloseRoleModal}
        title={p.roleModal.form.RoleId < 0 ? t("New role", "دور جديد") : t("Edit role", "تعديل دور")}
        footer={<>
          <button type="button" className={btnOutline} onClick={p.CloseRoleModal}>{t("Cancel", "إلغاء")}</button>
          <button type="button" className={btnAccent} onClick={p.SaveRole}>{t("Save", "حفظ")}</button>
        </>}
      >
        <div className="space-y-3">
          <Field label={t("Name (Arabic)", "الاسم (عربي)")} required>
            <input className={inputCls} value={p.roleModal.form.DescA} onChange={(e) => p.SetRoleForm({ DescA: e.target.value })} maxLength={100} dir="rtl" />
          </Field>
          <Field label={t("Name (English)", "الاسم (إنجليزي)")} required>
            <input className={inputCls} value={p.roleModal.form.DescE} onChange={(e) => p.SetRoleForm({ DescE: e.target.value })} maxLength={100} dir="ltr" />
          </Field>
          <Field label={t("Notes", "ملاحظات")}>
            <input className={inputCls} value={p.roleModal.form.Remarks} onChange={(e) => p.SetRoleForm({ Remarks: e.target.value })} maxLength={100} />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-erp-text">
            <Check checked={p.roleModal.form.IsAvailable} onChange={(v) => p.SetRoleForm({ IsAvailable: v })} label={t("Active", "فعّال")} /> {t("Active (can be assigned to users)", "فعّال (ينفع يتحط لمستخدمين)")}
          </label>
          {p.hasIsAdmin && (
            <label className="flex items-center gap-2 text-[13px] text-erp-text">
              <Check checked={p.roleModal.form.IsAdmin} onChange={(v) => p.SetRoleForm({ IsAdmin: v })} label="Admin" />
              {t("Admin role (gets full permissions on every newly registered screen)", "دور أدمن (بياخد كل الصلاحيات على أي شاشة جديدة بتتسجّل)")}
            </label>
          )}
          {p.roleModal.error && <div role="alert" className="rounded-lg border border-erp-danger-border bg-erp-danger-bg px-3 py-2 text-[13px] text-erp-danger-text">{p.roleModal.error}</div>}
        </div>
      </Modal>
    </div>
  );
}
