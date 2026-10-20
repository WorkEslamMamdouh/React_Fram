"use client";

import { useEffect } from "react";
import { useSys } from "../Shared/SystemUsing";
import "../../StyleDesign/StyleGlobals.css";
import "../../StyleDesign/loader.css";
import Routes from "../../ClientApp/Routes";
import { Sys } from "../Shared/SystemTools";
import { OpenPage } from "../Shared/App";
import { useRouter } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const token = useSys((s) => s.Token);
  const hydrated = useSys((s) => s.hydrated);
  const lang = useSys((s) => s.lang);
  const IsLangEN = lang === "en";
  const router = useRouter();

  // ✅ redirect بس (بدون رسالة)
  useEffect(() => {
    if (!hydrated) return;

    if (!token || token.trim() === "") {
      OpenPage("Login", router);
    }
  }, [token, hydrated, router]);

  // 🔥 👇 ده المهم (يسمع طول الوقت)
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === "logout-event" && e.newValue) {

      const currentPath = window.location.pathname;

      // 👇 لو مش في login بس
      if (!currentPath.includes("Login")) {
        OpenPage("Login", router);
      }

      Sys.ShowMessage(
        "Your session has expired. Please log in again.",
        "تم تسجيل خروجك لأن الجلسة انتهت. برجاء تسجيل الدخول مرة أخرى.",
        "warning"
      );

      // 👇 أهم سطر 🔥
      useSys.getState().CloseLoader();
    }
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}, []);

  if (!hydrated) return null;

  return (
    <>
      <link
        id="lang-style_Style"
        rel="stylesheet"
        href={IsLangEN ? "/StyleDesign/StyleEN.css" : "/StyleDesign/StyleAR.css"}
      />

      <div style={{ direction: IsLangEN ? "ltr" : "rtl" }}>
        <Routes>
          <div>
            {children}
            <Sys.MessageContainer />
          </div>
        </Routes>
      </div>
    </>
  );
}