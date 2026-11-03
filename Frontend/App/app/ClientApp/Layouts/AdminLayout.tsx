"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!token) {
      router.replace("/ClientApp/AdminLogin");
      return;
    }
    setOk(true);
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
