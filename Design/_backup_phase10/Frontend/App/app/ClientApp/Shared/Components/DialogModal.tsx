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
  success: { icon: "fa-circle-check", ring: "ring-erp-success/30", grad: "from-erp-success to-erp-success", titleEn: "Success", titleAr: "تم بنجاح" },
  error: { icon: "fa-circle-xmark", ring: "ring-erp-danger/30", grad: "from-erp-danger to-erp-danger", titleEn: "Error", titleAr: "خطأ" },
  warning: { icon: "fa-triangle-exclamation", ring: "ring-erp-warning/30", grad: "from-erp-warning to-erp-warning", titleEn: "Warning", titleAr: "تنبيه" },
  info: { icon: "fa-circle-info", ring: "ring-erp-info/30", grad: "from-erp-info to-erp-info", titleEn: "Information", titleAr: "معلومة" },
  question: { icon: "fa-circle-question", ring: "ring-erp-accent/30", grad: "from-erp-accent to-erp-accent", titleEn: "Confirm", titleAr: "تأكيد" },
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
  const okCls = o.danger ? "bg-erp-danger" : "bg-erp-accent";

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-150 ${show ? "bg-erp-overlay backdrop-blur-[2px]" : "bg-transparent"}`}
      style={{ zIndex: 2147483646 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && item.kind === "confirm") close(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-sm rounded-xl shadow-erp-4 border border-erp-border ring-4 ${st.ring} overflow-hidden transition-all duration-150 ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"} bg-erp-surface text-erp-text`}
      >
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br ${st.grad} flex items-center justify-center text-white text-3xl`}>
            <i className={`fa-solid ${st.icon}`} />
          </div>
          <h3 className="text-lg font-bold mb-2">{title}</h3>
          <p className={`text-sm whitespace-pre-line text-erp-text-muted`}>{ar ? item.messageAr : item.messageEn}</p>
        </div>
        <div className={`flex gap-2 px-6 pb-6 ${item.kind === "confirm" ? "" : "justify-center"}`}>
          {item.kind === "confirm" && (
            <button
              onClick={() => close(false)}
              className="flex-1 h-11 md:h-10 rounded-lg font-medium border border-erp-border bg-erp-surface text-erp-text hover:bg-erp-surface-2 transition"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={okRef}
            onClick={() => close(true)}
            className={`${item.kind === "confirm" ? "flex-1" : "min-w-[120px]"} h-11 md:h-10 rounded-lg font-medium text-white hover:opacity-90 transition ${okCls}`}
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
