import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LayoutType, SysSession } from "../Shared/Entities";
import { IQ_Sys_ControlYear, IQ_Sys_RoleUsersBranch, IQ_Sys_RoleUsersComp, Sys_ControlYear } from "./Entities_DataBase";

type SystemUsing = {

    // ***********************************Session************************ 
    Session: SysSession;
    SetSession: (Data: SysSession) => void;

    // ******************************************************************* 

    // ===================
    // Loader
    // ===================
    isLoading: boolean;
    ShowLoader: () => void;
    CloseLoader: () => void;

    // ===================
    // Language
    // ===================
    lang: "en" | "ar";
    IsLangEN: true | false;
    toggleLang: () => void;
    SetLanguage: (val?: string) => void;


    IsOpenMenu: true | false;
    toggleSideMenu: () => void;
    SetIsOpenMenu: (val?: boolean) => void;

    IsDark: false | true;
    toggleModDark: (val?: boolean) => void;

    IsNotifications: false | true;
    toggleNotifications: (val?: boolean) => void;

    
    IsMessages: false | true;
    toggleMessages: (val?: boolean) => void;

    
    IsFavorites: false | true;
    toggleFavorites: (val?: boolean) => void;

    // ===================
    // Auth
    // ===================
    Token: string | null;
    setToken: (t: string) => void;

    // 🔥 hydration fix
    hydrated: boolean;
    setHydrated: (v: boolean) => void;

    // ***********************************SendDataInPages************************
    DataCompany: Array<IQ_Sys_RoleUsersComp>;
    SetDataCompany: (Data: Array<IQ_Sys_RoleUsersComp>) => void;

    DataBranch: Array<IQ_Sys_RoleUsersBranch>;
    SetDataBranch: (Data: Array<IQ_Sys_RoleUsersBranch>) => void;

    DataYearControl: Array<IQ_Sys_ControlYear>;
    SetDataYearControl: (Data: Array<IQ_Sys_ControlYear>) => void;

};

// =================== BroadcastChannel للتواصل بين التابات ===================
const channel = new BroadcastChannel("sys-channel");

// ✅ تحديد الحاجات اللي نسمح لها بالتزامن بين التابات
// 🔥 غير القائمة دي لو عايز تزيد أو تقلل الحاجات المتزامنة
const SYNC_KEYS = [
    "Session",
    "Token",
    "DataCompany",
    "DataBranch",
    "DataYearControl",
    "lang",
    "IsLangEN",      // ✅ إضافة IsLangEN
    "IsDark",
    "IsNotifications",
    "IsMessages",
    "IsFavorites",
    "IsOpenMenu",    // ✅ إضافة IsOpenMenu
] as const;

// تابع للاستماع من التابات التانية
if (typeof window !== "undefined") {
    channel.onmessage = (event) => {
        const { type, payload, key, value } = event.data;

        if (type === "SYNC_UPDATE" && key && SYNC_KEYS.includes(key as any)) {
            // ✅ تحديث الحالة من تاب تاني
            useSys.setState({ [key]: value });
            
            // تطبيقات إضافية حسب المفتاح
            if (key === "IsDark") {
                document.documentElement.classList.toggle("dark", value);
            }
            if (key === "lang") {
                document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
                document.documentElement.lang = value;
            }
            if (key === "IsOpenMenu") {
                // ✅ تأثيرات إضافية عند تغيير القائمة من تاب تاني
                // مثلاً: تحديث أي class أو style على مستوى الـ body
                if (value === false) {
                    document.body.style.overflow = "auto";
                } else {
                    document.body.style.overflow = "";
                }
            }
            if (key === "IsLangEN") {
                // ✅ تأثيرات إضافية عند تغيير اللغة
                console.log("Language changed, IsLangEN:", value);
                // ممكن تضيف أي تأثيرات تانية هنا
            }
        }
    };
}

export const useSys = create<SystemUsing>()(persist(
    (set, get) => ({

        Session: new SysSession(),
        SetSession: (SystemSession) => {
            set({ Session: SystemSession });
            // ✅ بث التغيير للتابات التانية
            if (SYNC_KEYS.includes("Session")) {
                channel.postMessage({ type: "SYNC_UPDATE", key: "Session", value: SystemSession });
            }
        },

        // ===================
        // Loader
        // ===================
        isLoading: true,
        ShowLoader: () => set({ isLoading: true }),
        CloseLoader: () => set({ isLoading: false }),

        // ===================
        // Language
        // ===================
        lang: "en",
        IsLangEN: true,
        toggleLang: () => {
            const newLang = get().lang === "en" ? "ar" : "en";
            const newIsLangEN = newLang === "en";
            
            set({
                lang: newLang,
                IsLangEN: newIsLangEN,
            });
            
            // ✅ بث تغيير اللغة
            if (SYNC_KEYS.includes("lang")) {
                channel.postMessage({ type: "SYNC_UPDATE", key: "lang", value: newLang });
            }
            
            // ✅ بث تغيير IsLangEN
            if (SYNC_KEYS.includes("IsLangEN")) {
                channel.postMessage({ type: "SYNC_UPDATE", key: "IsLangEN", value: newIsLangEN });
            }
        },
        SetLanguage: (val?: string) =>  {
                const newLang = val !== undefined ? val : 'en' ;
                const _IsLangEN =  newLang == 'en' ? true : false ; 
            set({
                lang: _IsLangEN == true ? 'en' :'ar',
                IsLangEN: _IsLangEN,
            });
            
            // ✅ بث تغيير اللغة
            if (SYNC_KEYS.includes("lang")) {
                channel.postMessage({ type: "SYNC_UPDATE", key: "lang", value: newLang });
            }
            
            // ✅ بث تغيير IsLangEN
            if (SYNC_KEYS.includes("IsLangEN")) {
                channel.postMessage({ type: "SYNC_UPDATE", key: "IsLangEN", value: _IsLangEN });
            }
          },


        IsOpenMenu: true,
        toggleSideMenu: () => {
            const newValue = get().IsOpenMenu === true ? false : true;
            
            set({
                IsOpenMenu: newValue,
            });
            
            // ✅ بث تغيير القائمة للتابات التانية
            if (SYNC_KEYS.includes("IsOpenMenu")) {
                channel.postMessage({ type: "SYNC_UPDATE", key: "IsOpenMenu", value: newValue });
            }
            
            // ✅ تأثيرات إضافية عند تغيير القائمة محلياً
            if (!newValue) {
                // القائمة مقفولة
                document.body.style.overflow = "auto";
            } else {
                // القائمة مفتوحة
                document.body.style.overflow = "";
            }
        },
      SetIsOpenMenu: (val?: boolean) =>
            set((state) => {
                const newVal = val !== undefined ? val : !state.IsOpenMenu;
                document.documentElement.classList.toggle("IsOpenMenu", newVal);
                
                // ✅ بث تغيير الوضع المظلم (لو مسموح)
                if (SYNC_KEYS.includes("IsOpenMenu")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "IsOpenMenu", value: newVal });
                }
                
                return { IsOpenMenu: newVal };
            }),

        IsDark: true,
        toggleModDark: (val?: boolean) =>
            set((state) => {
                const newVal = val !== undefined ? val : !state.IsDark;
                document.documentElement.classList.toggle("dark", newVal);
                
                // ✅ بث تغيير الوضع المظلم (لو مسموح)
                if (SYNC_KEYS.includes("IsDark")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "IsDark", value: newVal });
                }
                
                return { IsDark: newVal };
            }),

        IsNotifications: true,
        toggleNotifications: (val?: boolean) =>
            set((state) => {
                const newVal = val !== undefined ? val : !state.IsNotifications;
                document.documentElement.classList.toggle("notifications", newVal);
                
                // ✅ بث تغيير الوضع المظلم (لو مسموح)
                if (SYNC_KEYS.includes("IsNotifications")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "IsNotifications", value: newVal });
                }
                
                return { IsNotifications: newVal };
            }),

        IsMessages: true,
        toggleMessages: (val?: boolean) =>
            set((state) => {
                const newVal = val !== undefined ? val : !state.IsMessages;
                document.documentElement.classList.toggle("messages", newVal);
                
                // ✅ بث تغيير الوضع المظلم (لو مسموح)
                if (SYNC_KEYS.includes("IsMessages")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "IsMessages", value: newVal });
                }
                
                return { IsMessages: newVal };
            }),

        IsFavorites: true,
        toggleFavorites: (val?: boolean) =>
            set((state) => {
                const newVal = val !== undefined ? val : !state.IsFavorites;
                document.documentElement.classList.toggle("favorites", newVal);
                
                // ✅ بث تغيير الوضع المظلم (لو مسموح)
                if (SYNC_KEYS.includes("IsFavorites")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "IsFavorites", value: newVal });
                }
                
                return { IsFavorites: newVal };
            }),

        // ===================
        // Auth
        // ===================
        Token: null,
        setToken: (t) => {
            set({ Token: t });
            // ✅ بث التغيير للتابات التانية
            if (SYNC_KEYS.includes("Token")) {
                channel.postMessage({ type: "SYNC_UPDATE", key: "Token", value: t });
            }
        },

        // 🔥 hydration
        hydrated: false,
        setHydrated: (v) => set({ hydrated: v }),

        // ***********************************SendDataInPages************************
        DataCompany: new Array<any>(),
        SetDataCompany: (Data: Array<any>) =>
            set((state) => {
                const newData = Data !== undefined ? Data : state.DataCompany;
                
                // ✅ بث التغيير للتابات التانية
                if (SYNC_KEYS.includes("DataCompany")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "DataCompany", value: newData });
                }
                
                return { DataCompany: newData };
            }),

        DataBranch: new Array<any>(),
        SetDataBranch: (Data: Array<any>) =>
            set((state) => {
                const newData = Data !== undefined ? Data : state.DataBranch;
                
                if (SYNC_KEYS.includes("DataBranch")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "DataBranch", value: newData });
                }
                
                return { DataBranch: newData };
            }),

        DataYearControl: new Array<any>(),
        SetDataYearControl: (Data: Array<any>) =>
            set((state) => {
                const newData = Data !== undefined ? Data : state.DataYearControl;
                
                if (SYNC_KEYS.includes("DataYearControl")) {
                    channel.postMessage({ type: "SYNC_UPDATE", key: "DataYearControl", value: newData });
                }
                
                return { DataYearControl: newData };
            }),

    }),
    {
        name: "sys-storage",
        onRehydrateStorage: () => (state) => {
            state?.setHydrated(true);
        },
    }
)
);