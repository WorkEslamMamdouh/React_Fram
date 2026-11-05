"use client";

// =====================================================================================
//  Sys_UserPermsAdmin/page.tsx  -  شاشة الـ ERP (JWT + صلاحيات المستخدم). الشكل واللوجيك في UserPermsAdminView.tsx
//  نفس الشكل متاح لمنطقة الأدمن (توكن الأدمن) عن طريق mode="admin" من صفحات Admin*.
// =====================================================================================

import UserPermsAdminView from "./UserPermsAdminView";

export default function InitalizeComponent() {
  return <UserPermsAdminView mode="jwt" />;
}
