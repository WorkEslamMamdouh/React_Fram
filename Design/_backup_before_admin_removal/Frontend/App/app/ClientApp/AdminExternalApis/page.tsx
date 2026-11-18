"use client";

// =====================================================================================
//  AdminExternalApis/page.tsx  -  منطقة الأدمن (AdminLayout + توكن الأدمن X-Admin-Token)
//  بيعيد استخدام شاشة Sys_ExternalApisAdmin بنفس الشكل واللوجيك (mode="admin"): كل الشركات والفروع، من غير صلاحيات الشاشة.
// =====================================================================================

import AdminShell from "../Layouts/AdminShell";
import View from "../Sys_ExternalApisAdmin/ExternalApisAdminView";

export default function InitalizeComponent() {
  return (
    <AdminShell>
      <View mode="admin" />
    </AdminShell>
  );
}