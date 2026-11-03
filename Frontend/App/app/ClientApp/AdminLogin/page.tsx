"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:49475/api/admin";

export default function AdminLoginPage() {
  const router = useRouter();
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(API_BASE + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          User: userRef.current?.value ?? "",
          Pass: passRef.current?.value ?? "",
        }),
      });
      const text = await res.text();
      let body: any = null;
      try { body = JSON.parse(text); } catch { body = text; }
      if (typeof body === "string") { try { body = JSON.parse(body); } catch {} }

      if (body?.IsSuccess && body?.Response?.Token) {
        localStorage.setItem("admin_token", body.Response.Token);
        router.push("/ClientApp/ScreenBuilder");
      } else {
        setErr(body?.ErrorMessage || "فشل تسجيل الدخول");
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-black p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600 rounded-full blur-3xl opacity-20" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-20" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl mb-4">
              <i className="fa-solid fa-user-shield text-white text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">دخول لوحة الإدارة</h2>
            <p className="text-gray-400 text-sm">ScreenBuilder — Admin Area</p>
          </div>

          <form onSubmit={submit} className="space-y-4" dir="ltr">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">User</label>
              <input
                ref={userRef}
                type="text"
                autoFocus
                defaultValue="admin"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  ref={passRef}
                  type={showPass ? "text" : "password"}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            {err && (
              <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
                <i className="fa-solid fa-circle-exclamation mr-2" />
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-right-to-bracket" />}
              {loading ? "..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <a href="/ClientApp/Login" className="text-sm text-gray-400 hover:text-gray-200 transition">
              <i className="fa-solid fa-arrow-left mr-1" /> رجوع لتسجيل الدخول العادي
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
