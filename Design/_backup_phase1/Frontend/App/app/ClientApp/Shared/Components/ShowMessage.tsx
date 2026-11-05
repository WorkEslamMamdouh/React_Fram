"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSys } from "../SystemUsing";

export type MessageType = 'success' | 'error' | 'warning' | 'info';

interface Message {
  id: string;
  type: MessageType;
  messageEn: string;
  messageAr: string;
  duration: number;
}

// Store خارجي
let messagesStore: Message[] = [];
let listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const addMessage = (message: Message) => {
  messagesStore = [...messagesStore, message];
  notifyListeners();
  
  // Auto remove بعد المدة
  setTimeout(() => {
    messagesStore = messagesStore.filter(m => m.id !== message.id);
    notifyListeners();
  }, message.duration + 300);
};

// الدالة الرئيسية
export function ShowMessage(
  messageEn: string,
  messageAr: string,
  type: MessageType = 'info',
  duration: number = 5000
) {
  const id = Math.random().toString(36).substring(7);
  addMessage({ id, type, messageEn, messageAr, duration });
  
  // للـ debugging
  console.log(`[ShowMessage] ${type}: ${messageEn} / ${messageAr}`);
}

// مكون Toast الفردي
function ToastItem({ message, onClose }: { message: Message; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false); 
     const lang = useSys((s) => s.lang); 

  useEffect(() => { 
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const displayText = lang === 'ar' ? message.messageAr : message.messageEn;
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div
      className={`
        fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}
      `}
    >
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        text-white min-w-[280px] max-w-md
        ${colors[message.type]}
      `}>
        <span className="text-xl font-bold">{icons[message.type]}</span>
        <p className="flex-1 text-sm font-medium">{displayText}</p>
        <button
          onClick={onClose}
          className="hover:opacity-80 text-white font-bold text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}

 export function MessageContainer() {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMounted(true);

    const listener = () => {
      setMessages([...messagesStore]);
    };

    listeners.push(listener);
    listener();

    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const removeMessage = (id: string) => {
    messagesStore = messagesStore.filter(m => m.id !== id);
    notifyListeners();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2147483647,
        pointerEvents: "none"
      }}
    >
      <div className="flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} style={{ pointerEvents: "auto" }}>
            <ToastItem
              message={msg}
              onClose={() => removeMessage(msg.id)}
            />
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}