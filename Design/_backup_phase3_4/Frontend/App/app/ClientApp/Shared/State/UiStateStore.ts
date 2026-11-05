// ملف: ClientApp/Shared/State/UiStateStore.ts
"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =======================
// أنواع البيانات (Types)
// =======================

interface ScreenState {
    values: Record<string, any>;      // حفظ قيم الحقول (Inputs)
    selections: Record<string, string>; // حفظ اختيارات الـ Dropdowns
    originalLanguage: string;          // اللغة الأصلية عند الحفظ
    lastUpdated: number;               // تاريخ آخر تحديث
}

interface ChangeListener {
    id: string;
    callback: (value: string) => void;
}

interface UiStateStore {
    // البيانات
    screens: Record<string, ScreenState>;
    listeners: Record<string, ChangeListener[]>;
    
    // =======================
    // دوال الـ Values (للـ Inputs)
    // =======================
    
    // حفظ قيمة عنصر معين في شاشة معينة
    setValue: (screenName: string, elementId: string, value: any) => void;
    
    // جلب قيمة عنصر معين
    getValue: (screenName: string, elementId: string) => any;
    
    // جلب قيمة مع دعم اللغة
    getValueByLanguage: (screenName: string, elementId: string, currentLang: boolean) => any;
    
    // حفظ قيمة مع اللغة
    saveWithLanguage: (screenName: string, elementId: string, value: any, isLangEN: boolean) => void;
    
    // =======================
    // دوال الـ Selections (لـ Dropdowns)
    // =======================
    
    // حفظ اختيار Dropdown
    setSelection: (screenName: string, dropdownId: string, value: string) => void;
    
    // جلب اختيار Dropdown
    getSelection: (screenName: string, dropdownId: string) => string;
    
    // جلب كل اختيارات شاشة معينة
    getAllSelections: (screenName: string) => Record<string, string>;
    
    // =======================
    // دوال الـ Listeners
    // =======================
    
    // الاشتراك في تغييرات عنصر معين
    subscribeToChange: (
        screenName: string, 
        elementId: string, 
        callback: (value: string) => void,
        listenerId?: string
    ) => () => void;
    
    // إلغاء الاشتراك
    unsubscribe: (screenName: string, elementId: string, listenerId: string) => void;
    
    // =======================
    // دوال مساعدة
    // =======================
    
    // استعادة كل بيانات شاشة معينة
    restoreScreenState: (screenName: string) => ScreenState | null;
    
    // مسح بيانات شاشة
    clearScreenState: (screenName: string) => void;
    
    // مسح كل البيانات
    clearAllStates: () => void;
    
    // الحصول على حجم البيانات
    getStorageSize: () => number;
}

// =======================
// إنشاء الـ Store
// =======================

export const useUiStateStore = create<UiStateStore>()(
    persist(
        (set, get) => ({
            screens: {},
            listeners: {},

            // =======================
            // تنفيذ دوال الـ Values
            // =======================
            
            setValue: (screenName, elementId, value) => {
                set((state) => ({
                    screens: {
                        ...state.screens,
                        [screenName]: {
                            ...state.screens[screenName],
                            values: {
                                ...state.screens[screenName]?.values,
                                [elementId]: value
                            },
                            lastUpdated: Date.now()
                        }
                    }
                }));
            },

            getValue: (screenName, elementId) => {
                const screen = get().screens[screenName];
                return screen?.values?.[elementId];
            },

            getValueByLanguage: (screenName, elementId, currentLang) => {
                const screen = get().screens[screenName];
                const langKey = currentLang ? 'en' : 'ar';
                const originalLangKey = screen?.originalLanguage === 'en' ? 'en' : 'ar';
                const key = `${elementId}_${langKey}`;
                const originalKey = `${elementId}_${originalLangKey}`;
                
                return screen?.values?.[key] || screen?.values?.[originalKey] || "";
            },

            saveWithLanguage: (screenName, elementId, value, isLangEN) => {
                const langKey = isLangEN ? 'en' : 'ar';
                const key = `${elementId}_${langKey}`;
                
                set((state) => ({
                    screens: {
                        ...state.screens,
                        [screenName]: {
                            ...state.screens[screenName],
                            originalLanguage: isLangEN ? 'en' : 'ar',
                            values: {
                                ...state.screens[screenName]?.values,
                                [key]: value
                            },
                            lastUpdated: Date.now()
                        }
                    }
                }));
            },

            // =======================
            // تنفيذ دوال الـ Selections
            // =======================
            
            setSelection: (screenName, dropdownId, value) => {
                set((state) => {
                    const newState = {
                        screens: {
                            ...state.screens,
                            [screenName]: {
                                ...state.screens[screenName],
                                selections: {
                                    ...state.screens[screenName]?.selections,
                                    [dropdownId]: value
                                },
                                lastUpdated: Date.now()
                            }
                        }
                    };
                    
                    // Notify listeners بعد التحديث
                    const key = `${screenName}_${dropdownId}`;
                    const listeners = state.listeners[key] || [];
                    setTimeout(() => {
                        listeners.forEach(listener => {
                            listener.callback(value);
                        });
                    }, 0);
                    
                    return newState;
                });
            },

            getSelection: (screenName, dropdownId) => {
                const screen = get().screens[screenName];
                return screen?.selections?.[dropdownId] || "";
            },

            getAllSelections: (screenName) => {
                const screen = get().screens[screenName];
                return screen?.selections || {};
            },

            // =======================
            // تنفيذ دوال الـ Listeners
            // =======================
            
            subscribeToChange: (screenName, elementId, callback, listenerId) => {
                const key = `${screenName}_${elementId}`;
                const id = listenerId || `${Date.now()}_${Math.random()}`;
                
                set((state) => ({
                    listeners: {
                        ...state.listeners,
                        [key]: [
                            ...(state.listeners[key] || []),
                            { id, callback }
                        ]
                    }
                }));
                
                // إرجاع دالة لإلغاء الاشتراك
                return () => {
                    get().unsubscribe(screenName, elementId, id);
                };
            },

            unsubscribe: (screenName, elementId, listenerId) => {
                const key = `${screenName}_${elementId}`;
                set((state) => ({
                    listeners: {
                        ...state.listeners,
                        [key]: (state.listeners[key] || []).filter(l => l.id !== listenerId)
                    }
                }));
            },

            // =======================
            // تنفيذ الدوال المساعدة
            // =======================
            
            restoreScreenState: (screenName) => {
                const screen = get().screens[screenName];
                return screen || null;
            },

            clearScreenState: (screenName) => {
                set((state) => {
                    const newScreens = { ...state.screens };
                    delete newScreens[screenName];
                    
                    // مسح الـ listeners المرتبطة بالشاشة
                    const newListeners = { ...state.listeners };
                    Object.keys(newListeners).forEach(key => {
                        if (key.startsWith(screenName)) {
                            delete newListeners[key];
                        }
                    });
                    
                    return { 
                        screens: newScreens,
                        listeners: newListeners
                    };
                });
            },

            clearAllStates: () => {
                set({ screens: {}, listeners: {} });
                localStorage.removeItem('ui-state-storage');
            },

            getStorageSize: () => {
                const state = get();
                return Object.keys(state.screens).length;
            }
        }),
        {
            name: 'ui-state-storage', // اسم في localStorage
            partialize: (state) => ({ 
                screens: state.screens 
            }), // حفظ فقط الـ screens
            version: 1, // إصدار الـ store
            migrate: (persistedState: any, version) => {
                if (version === 0) {
                    // ترحيل البيانات من إصدار قديم إذا لزم الأمر
                    return { screens: persistedState.screens || {} };
                }
                return persistedState;
            }
        }
    )
);

// =======================
// Hook مساعد لاستخدام الـ Store بسهولة
// =======================

export function useSelection(screenName: string, dropdownId: string) {
    const selection = useUiStateStore((state) => state.getSelection(screenName, dropdownId));
    const setSelection = useUiStateStore((state) => state.setSelection);
    
    return {
        value: selection,
        setValue: (value: string) => setSelection(screenName, dropdownId, value)
    };
}

export function useScreenState(screenName: string) {
    const screen = useUiStateStore((state) => state.screens[screenName]);
    const setSelection = useUiStateStore((state) => state.setSelection);
    const setValue = useUiStateStore((state) => state.setValue);
    const clearScreen = useUiStateStore((state) => state.clearScreenState);
    
    return {
        selections: screen?.selections || {},
        values: screen?.values || {},
        setSelection: (dropdownId: string, value: string) => setSelection(screenName, dropdownId, value),
        setValue: (elementId: string, value: any) => setValue(screenName, elementId, value),
        clear: () => clearScreen(screenName),
        lastUpdated: screen?.lastUpdated || 0
    };
}

// =======================
// تصدير الـ Store
// =======================
export default useUiStateStore;