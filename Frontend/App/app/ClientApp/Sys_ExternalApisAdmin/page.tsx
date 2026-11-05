"use client";

// =====================================================================================
//  Sys_ExternalApisAdmin/page.tsx  -  شاشة الـ ERP (JWT + صلاحيات المستخدم). الشكل واللوجيك في ExternalApisAdminView.tsx
//  نفس الشكل متاح لمنطقة الأدمن (توكن الأدمن) عن طريق mode="admin" من صفحات Admin*.
// =====================================================================================

import ExternalApisAdminView from "./ExternalApisAdminView";

export default function InitalizeComponent() {
  return <ExternalApisAdminView mode="jwt" />;
}
