"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "../Shared/AdminHttp";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const verified = useRef(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!token) {
      router.replace("/ClientApp/AdminLogin");
      return;
    }
    setOk(true);
    // التوكن محفوظ في ذاكرة السيرفر: لو السيرفر اتعمله إعادة تشغيل التوكن بيتقفل → رجوع لصفحة الدخول برسالة واضحة
    if (!verified.current) {
      verified.current = true;
      adminFetch("Reports", "config").catch(() => { /* 401 بيحوّل لصفحة الدخول جوه adminFetch */ });
    }
  }, [pathname, router]);

  if (!ok) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 text-gray-400">
        <i className="fa-solid fa-spinner fa-spin mr-2" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", zIndex: 1 }}>
      {children}
    </div>
  );
}
