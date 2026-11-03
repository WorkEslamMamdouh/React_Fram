"use client";

// =====================================================================================
//  DialogModal.tsx — بديل alert / confirm بمودال شكله حلو
//    await Sys.Alert("Saved", "تم الحفظ", "success");
//    if (!(await Sys.Confirm("Delete?", "حذف؟", { danger: true }))) return;
//  المودال بيركّب نفسه لوحده لو DialogContainer مش موجود في الصفحة.
// =====================================================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { useSys } from "../SystemUsing";

export type DialogType = "success" | "error" | "warning" | "info" | "question";

export interface ConfirmOptions {
  type?: DialogType;
  danger?: boolean;
  okEn?: string;
  okAr?: string;
  cancelEn?: string;
  cancelAr?: string;
  titleEn?: string;
  titleAr?: string;
}

interface DialogItem {
  id: number;
  kind: "alert" | "confirm";
  messageEn: string;
  messageAr: string;
  options: ConfirmOptions;
  resolve: (v: boolean) => void;
}

let queue: DialogItem[] = [];
let listeners: (() => void)[] = [];
let seq = 0;
let autoMounted = false;

const notify = () => listeners.forEach((l) => l());

function ensureContainer() {
  if (listeners.length > 0 || autoMounted || typeof document === "undefined") return;
  autoMounted = true;
  const host = document.createElement("div");
  host.id = "sys-dialog-root";
  document.body.appendChild(host);
  createRoot(host).render(<DialogContainer />);
}

function push(item: Omit<DialogItem, "id" | "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    queue = [...queue, { ...item, id: ++seq, resolve }];
    ensureContainer();
    notify();
  });
}

export function ShowAlert(messageEn: string, messageAr: string, type: DialogType = "info", options: ConfirmOptions = {}): Promise<void> {
  return push({ kind: "alert", messageEn, messageAr, options: { ...options, type } }).then(() => undefined);
}

export function ShowConfirm(messageEn: string, messageAr: string, options: ConfirmOptions = {}): Promise<boolean> {
  return push({ kind: "confirm", messageEn, messageAr, options: { type: options.danger ? "warning" : "question", ...options } });
}

const STYLE: Record<DialogType, { icon: string; ring: string; grad: string; titleEn: string; titleAr: string }> = {
  success: { icon: "fa-circle-check", ring: "ring-emerald-500/30", grad: "from-emerald-500 to-green-600", titleEn: "Success", titleAr: "تم بنجاح" },
  error: { icon: "fa-circle-xmark", ring: "ring-red-500/30", grad: "from-red-500 to-rose-600", titleEn: "Error", titleAr: "خطأ" },
  warning: { icon: "fa-triangle-exclamation", ring: "ring-amber-500/30", grad: "from-amber-500 to-orange-600", titleEn: "Warning", titleAr: "تنبيه" },
  info: { icon: "fa-circle-info", ring: "ring-blue-500/30", grad: "from-blue-500 to-indigo-600", titleEn: "Information", titleAr: "معلومة" },
  question: { icon: "fa-circle-question", ring: "ring-indigo-500/30", grad: "from-indigo-500 to-purple-600", titleEn: "Confirm", titleAr: "تأكيد" },
};

function DialogBox({ item, onClose }: { item: DialogItem; onClose: (v: boolean) => void }) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const ar = lang === "ar";
  const [show, setShow] = useState(false);
  const okRef = useRef<HTMLButtonElement>(null);
  const o = item.options;
  const st = STYLE[o.type || "info"];

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 10);
    okRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", key);
    return () => { clearTimeout(t); window.removeEventListener("keydown", key); };
  }, []);

  const close = (v: boolean) => {
    setShow(false);
    setTimeout(() => onClose(item.kind === "alert" ? true : v), 150);
  };

  const title = ar ? o.titleAr || st.titleAr : o.titleEn || st.titleEn;
  const okText = ar ? o.okAr || (item.kind === "confirm" ? "تأكيد" : "حسناً") : o.okEn || (item.kind === "confirm" ? "Confirm" : "OK");
  const cancelText = ar ? o.cancelAr || "إلغاء" : o.cancelEn || "Cancel";
  const okCls = o.danger ? "bg-gradient-to-r from-red-500 to-rose-600" : `bg-gradient-to-r ${st.grad}`;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-150 ${show ? "bg-black/50 backdrop-blur-sm" : "bg-black/0"}`}
      style={{ zIndex: 2147483646 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && item.kind === "confirm") close(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-sm rounded-2xl shadow-2xl ring-4 ${st.ring} overflow-hidden transition-all duration-150 ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"} ${isDark ? "bg-gray-900 text-gray-100" : "bg-white text-gray-800"}`}
      >
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br ${st.grad} flex items-center justify-center text-white text-3xl shadow-lg`}>
            <i className={`fa-solid ${st.icon}`} />
          </div>
          <h3 className="text-lg font-bold mb-2">{title}</h3>
          <p className={`text-sm whitespace-pre-line ${isDark ? "text-gray-300" : "text-gray-600"}`}>{ar ? item.messageAr : item.messageEn}</p>
        </div>
        <div className={`flex gap-2 px-6 pb-6 ${item.kind === "confirm" ? "" : "justify-center"}`}>
          {item.kind === "confirm" && (
            <button
              onClick={() => close(false)}
              className={`flex-1 py-2.5 rounded-xl font-medium border transition ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
            >
              {cancelText}
            </button>
          )}
          <button
            ref={okRef}
            onClick={() => close(true)}
            className={`${item.kind === "confirm" ? "flex-1" : "min-w-[120px]"} py-2.5 rounded-xl font-medium text-white shadow-md hover:opacity-90 transition ${okCls}`}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogContainer() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<DialogItem[]>([]);

  useEffect(() => {
    setMounted(true);
    const l = () => setItems([...queue]);
    listeners.push(l);
    l();
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);

  if (!mounted || items.length === 0) return null;
  const current = items[0];

  return createPortal(
    <DialogBox
      key={current.id}
      item={current}
      onClose={(v) => {
        queue = queue.filter((q) => q.id !== current.id);
        current.resolve(v);
        notify();
      }}
    />,
    document.body
  );
}
