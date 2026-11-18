"use client";

// =====================================================================================
//  AdminUsers/page.tsx  -  منطقة الأدمن (AdminLayout + توكن الأدمن X-Admin-Token)
//  بيعيد استخدام شاشة Sys_UsersAdmin بنفس الشكل واللوجيك (mode="admin"): كل الشركات والفروع، من غير صلاحيات الشاشة.
// =====================================================================================

import AdminShell from "../Layouts/AdminShell";
import View from "../Sys_UsersAdmin/UsersAdminView";

export default function InitalizeComponent() {
  return (
    <AdminShell>
      <View mode="admin" />
    </AdminShell>
  );
}