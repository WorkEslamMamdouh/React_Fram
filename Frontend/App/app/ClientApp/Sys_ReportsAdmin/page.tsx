"use client";

// Sys_ReportsAdmin/page.tsx - شاشة الـ ERP (JWT). الشكل واللوجيك في ReportsAdminView.tsx (ونفسه بيتستخدم في AdminReports بتوكن الأدمن)

import ReportsAdminView from "./ReportsAdminView";

export default function InitalizeComponent() {
  return <ReportsAdminView mode="jwt" />;
}
