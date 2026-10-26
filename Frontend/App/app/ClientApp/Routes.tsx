"use client";

import { usePathname } from "next/navigation";
import LoginLayout from "./Layouts/LoginLayout";
import HomeLayout from "./Layouts/HomeLayout/HomeLayout";
import AdminLayout from "./Layouts/AdminLayout";
import NotLayout from "./Layouts/NotLayout";
import { useSys } from "./Shared/SystemUsing";
import { useEffect } from "react";

export default function Routes({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoading = useSys((s) => s.isLoading);
  const ShowLoader = useSys((s) => s.ShowLoader);
  const CloseLoader = useSys((s) => s.CloseLoader);

  // 🔥 شغل loader عند تغيير الصفحة
useEffect(() => {
  const isLogin = pathname.includes("Login");

  const { ShowLoader, CloseLoader } = useSys.getState();

  // 👇 لو Login → اقفل loader فورًا
  if (isLogin) {
    CloseLoader();
    return;
  }

  // 👇 باقي الصفحات
  ShowLoader();

  const timer = setTimeout(() => {
    CloseLoader();
  }, 200);

  return () => clearTimeout(timer);
}, [pathname]);



  const segments = pathname.split("/");
  const page = segments[2] ?? "";

  const routes: Record<string, any> = {
    // **************NotLayout 
    "": NotLayout,
    Website: NotLayout,
    // **************

    // **************LoginLayout   
    Login: LoginLayout,
    Register: LoginLayout,
    LoginCompany:LoginLayout,
    // **************

    // **************AdminLayout   
    Admin: AdminLayout,
    Home: HomeLayout,
    Employees: HomeLayout,
    FinTrans_Expenses: HomeLayout,
    TestPage: HomeLayout,
    CashTypes: HomeLayout,
    FinancialType: HomeLayout,
    Dashboard: HomeLayout,
    Salse: HomeLayout,
    Pur: HomeLayout,
    // **************

  };

  const Layout = routes[page] || NotLayout;

  return (
    <>
 {isLoading && !pathname.includes("Login") && (
  <div className="loader-overlay">
    <div className="loader"></div>
  </div>
)}

      <Layout>{children}</Layout>
    </>
  );
}