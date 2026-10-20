import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SysSession } from "../Shared/Entities";

type SystemUsing = {
  // 🔥 Business Data (With Sync)
  Session: SysSession;
  SetSession: (Data: SysSession) => void;

  token: string | null;
  setToken: (t: string) => void;

  DataCompany: Array<any>;
  SetDataCompany: (Data: Array<any>) => void;

  DataBranch: Array<any>;
  SetDataBranch: (Data: Array<any>) => void;

  DataYearControl: Array<any>;
  SetDataYearControl: (Data: Array<any>) => void;

  // 🌍 Language (With Sync)
  lang: "en" | "ar";
  IsLangEN: true | false;
  setLang: (lang: "en" | "ar") => void;

  // 🌙 Dark Mode (With Sync)
  IsDark: boolean;
  setDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;

  // 🚫 UI State (No Sync)
  isLoading: boolean;
  ShowLoader: () => void;
  CloseLoader: () => void;

  IsOpenMenu: true | false;
  toggleSideMenu: () => void;

  hydrated: boolean;
  setHydrated: (v: boolean) => void;
};

// Whitelist للـ Keys اللي نسمح لها بالـ Sync
const SYNC_WHITELIST: Array<keyof SystemUsing> = [
  "Session",
  "token",
  "DataCompany",
  "DataBranch",
  "DataYearControl",
  "lang",
  "IsLangEN",
  "IsDark",
];

const channel = new BroadcastChannel("sys-channel");

const syncState = <T>(type: string, payload: T) => {
  channel.postMessage({ type, payload });
};

const hasChanged = <T>(oldValue: T, newValue: T): boolean => {
  return JSON.stringify(oldValue) !== JSON.stringify(newValue);
};

// ✅ دالة مساعدة لتطبيق الـ Dark Mode على DOM
const applyDarkMode = (isDark: boolean) => {
  if (typeof document !== "undefined") {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
};

export const useSys = create<SystemUsing>()(
  persist(
    (set, get) => ({
      // =================== UI State (No Sync) ===================
      isLoading: true,
      ShowLoader: () => set({ isLoading: true }),
      CloseLoader: () => set({ isLoading: false }),

      // 🌍 Language (With Sync)
      lang: "en",
      IsLangEN: true,
      setLang: (langValue: "en" | "ar") => {
        const currentLang = get().lang;
        const newIsLangEN = langValue === "en";
        
        if (hasChanged(currentLang, langValue)) {
          set({
            lang: langValue,
            IsLangEN: newIsLangEN,
          });
          
          syncState("SET_LANG", { lang: langValue, IsLangEN: newIsLangEN });
        }
      },

      // 🌙 Dark Mode (With Sync)
      IsDark: true,
      setDarkMode: (isDark: boolean) => {
        const current = get().IsDark;
        
        if (hasChanged(current, isDark)) {
          set({ IsDark: isDark });
          applyDarkMode(isDark);
          syncState("SET_DARK_MODE", isDark);
        }
      },
      
      toggleDarkMode: () => {
        const current = get().IsDark;
        get().setDarkMode(!current);
      },

      IsOpenMenu: true,
      toggleSideMenu: () =>
        set((state) => ({
          IsOpenMenu: !state.IsOpenMenu,
        })),

      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      // =================== Business Data (With Sync) ===================
      Session: new SysSession(),
      SetSession: (SystemSession) => {
        const current = get().Session;
        if (hasChanged(current, SystemSession)) {
          set({ Session: SystemSession });
          syncState("SET_SESSION", SystemSession);
        }
      },

      token: null,
      setToken: (t) => {
        const current = get().token;
        if (hasChanged(current, t)) {
          set({ token: t });
          syncState("SET_TOKEN", t);
        }
      },

      DataCompany: [],
      SetDataCompany: (Data: Array<any>) => {
        const current = get().DataCompany;
        if (hasChanged(current, Data)) {
          set({ DataCompany: Data ?? current });
          syncState("SET_DATA_COMPANY", Data);
        }
      },

      DataBranch: [],
      SetDataBranch: (Data: Array<any>) => {
        const current = get().DataBranch;
        if (hasChanged(current, Data)) {
          set({ DataBranch: Data ?? current });
          syncState("SET_DATA_BRANCH", Data);
        }
      },

      DataYearControl: [],
      SetDataYearControl: (Data: Array<any>) => {
        const current = get().DataYearControl;
        if (hasChanged(current, Data)) {
          set({ DataYearControl: Data ?? current });
          syncState("SET_DATA_YEAR_CONTROL", Data);
        }
      },
    }),
    {
      name: "sys-storage",
      onRehydrateStorage: (state) => {
        state?.setHydrated(true);
        // بعد ما نرجع البيانات من localStorage نطبق الـ Dark Mode
        if (state) {
          const isDark = (state as any).IsDark;
          if (isDark !== undefined) {
            applyDarkMode(isDark);
          }
        }
      },
    }
  )
);

// =================== BroadcastChannel Setup ===================
if (typeof window !== "undefined") {
  channel.onmessage = (event) => {
    const { type, payload } = event.data;

    switch (type) {
      case "SET_SESSION":
        useSys.setState({ Session: payload });
        break;

      case "SET_TOKEN":
        useSys.setState({ token: payload });
        break;

      case "SET_DATA_COMPANY":
        useSys.setState({ DataCompany: payload });
        break;

      case "SET_DATA_BRANCH":
        useSys.setState({ DataBranch: payload });
        break;

      case "SET_DATA_YEAR_CONTROL":
        useSys.setState({ DataYearControl: payload });
        break;

      case "SET_LANG": {
        const { lang, IsLangEN } = payload;
        const currentLang = useSys.getState().lang;
        
        if (hasChanged(currentLang, lang)) {
          useSys.setState({ lang, IsLangEN });
          document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
          document.documentElement.lang = lang;
        }
        break;
      }

      case "SET_DARK_MODE": {
        const isDark = payload;
        const currentDark = useSys.getState().IsDark;
        
        if (hasChanged(currentDark, isDark)) {
          useSys.setState({ IsDark: isDark });
          applyDarkMode(isDark);
        }
        break;
      }

      case "REQUEST_STATE": {
        const currentState = useSys.getState();
        // ✅ استخدام Record<string, unknown> لحل مشكلة TypeScript
        const safeState: Record<string, unknown> = {};
        
        SYNC_WHITELIST.forEach((key) => {
          safeState[key as string] = currentState[key];
        });
        
        channel.postMessage({
          type: "FULL_STATE",
          payload: safeState as Partial<SystemUsing>,
        });
        break;
      }

      case "FULL_STATE": {
        const safePayload = payload as Partial<SystemUsing>;
        const currentState = useSys.getState();
        const updates: Partial<SystemUsing> = {};

        SYNC_WHITELIST.forEach((key) => {
          const newValue = safePayload[key];
          const oldValue = currentState[key];
          if (newValue !== undefined && hasChanged(oldValue, newValue)) {
            (updates as any)[key] = newValue;
          }
        });

        if (Object.keys(updates).length > 0) {
          useSys.setState(updates);
          
          // ✅ تطبيق Dark Mode إذا كان في التحديثات
          if (updates.IsDark !== undefined) {
            applyDarkMode(updates.IsDark);
          }
          
          // ✅ تطبيق اللغة إذا كانت في التحديثات
          if (updates.lang) {
            const isRTL = updates.lang === "ar";
            document.documentElement.dir = isRTL ? "rtl" : "ltr";
            document.documentElement.lang = updates.lang;
          }
        }
        break;
      }

      default:
        break;
    }
  };

  setTimeout(() => {
    channel.postMessage({ type: "REQUEST_STATE" });
  }, 100);
}