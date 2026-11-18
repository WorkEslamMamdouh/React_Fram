"use client";

// =====================================================================================
//  Sys_UsersAdmin/page.tsx  -  شاشة الـ ERP (JWT + صلاحيات المستخدم). الشكل واللوجيك في UsersAdminView.tsx
//  نفس الشكل متاح لمنطقة الأدمن (توكن الأدمن) عن طريق mode="admin" من صفحات Admin*.
// =====================================================================================

import UsersAdminView from "./UsersAdminView";

export default function InitalizeComponent() {
  return <UsersAdminView mode="jwt" />;
}
