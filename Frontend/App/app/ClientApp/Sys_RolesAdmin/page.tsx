"use client";

// =====================================================================================
//  Sys_RolesAdmin/page.tsx  -  شاشة الـ ERP (JWT + صلاحيات المستخدم). الشكل واللوجيك في RolesAdminView.tsx
//  نفس الشكل متاح لمنطقة الأدمن (توكن الأدمن) عن طريق mode="admin" من صفحات Admin*.
// =====================================================================================

import RolesAdminView from "./RolesAdminView";

export default function InitalizeComponent() {
  return <RolesAdminView mode="jwt" />;
}
