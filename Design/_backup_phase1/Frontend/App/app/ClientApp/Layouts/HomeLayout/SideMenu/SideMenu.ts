"use client"
import { Sys } from "../../../Shared/SystemTools";
import { useEffect, useRef, useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { IQ_Sys_RoleModule } from "../../../Shared/Entities_DataBase";
import { MenuItemType, MenuItemWithState, SearchResultType, TableModel } from "../../../Shared/Entities";
import { OpenPage } from "../../../Shared/App";
import { useRouter } from "next/navigation";
import { SQL } from "../../../Shared/CallDataBase";

// =======================
// SideMenu Page  
// =======================
export function SideMenu() {
  const Router = useRouter();


  const didRun = useRef(false);
  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    InitalizeComponent();
  }, [])

  // =======================
  // #region UsingSystem Glopal
  // =======================
  const ShowLoader = useSys((s) => s.ShowLoader);
  const CloseLoader = useSys((s) => s.CloseLoader);
  const Session = useSys((s) => s.Session);
  const MENU_ITEMS_LIST: Array<MenuItemType> = new Array<MenuItemType>();
  // #endregion


  // =======================
  // #region Glopal Varebil
  // =======================
  // var CountGrid = 0;

  // #endregion


  // =======================
  // #region  InitalizeControls  
  // ======================= 
  // const email = useRef<HTMLInputElement>(null)


  // #endregion


  function InitalizeComponent() {
    SetRoleModuleInMenu();
    RunbuildMenuTree();
    InitializeEvents();
  }

  function InitializeEvents() {

    //if (email.current) {
    //email.current.onchange = showWebsite;
    //}
    // testdataSql();
    // GetAllDataLayout();
  }


  function SetRoleModuleInMenu() {

    //   {
    //     MODULE_CODE: "dashboard",
    //     MODULE_TYPE: "menu",
    //     TITLE_AR: "لوحة التحكم",
    //     TITLE_EN: "Dashboard",
    //     ICON_PATH: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    //     PARENT_MODULE_CODE: null,
    //     COLOR: "text-blue-500 dark:text-blue-400",
    //     order: 1
    //   },
    //   {
    //     MODULE_CODE: "overview",
    //     MODULE_TYPE: "screen",
    //     TITLE_AR: "نظرة عامة",
    //     TITLE_EN: "Overview",
    //     ICON_PATH: "M4 6h16M4 12h16M4 18h16",
    //     PARENT_MODULE_CODE: "dashboard",
    //     PATH: "/dashboard/overview",
    //     COLOR: "text-sky-500",
    //     order: 1
    //   },

    debugger
 



    let ListModelPrivileges = Session.CurrentPrivileges.filter(x => x.IS_Show == 1 && x.EXECUTE == true )

    console.log(ListModelPrivileges)
    for (let i = 0; i < ListModelPrivileges.length; i++) {
 
      let ModelMENU_ITEMS: MenuItemType = new MenuItemType();
      ModelMENU_ITEMS.MODULE_CODE = ListModelPrivileges[i].MODULE_CODE
      ModelMENU_ITEMS.PARENT_MODULE_CODE = (ListModelPrivileges[i].MODULE_MENU ?? null).trim() == "" ? null : (ListModelPrivileges[i].MODULE_MENU ?? null)
      ModelMENU_ITEMS.TITLE_EN = ListModelPrivileges[i].MODULE_DESCE
      ModelMENU_ITEMS.TITLE_AR = ListModelPrivileges[i].MODULE_DESCA
      ModelMENU_ITEMS.order = ListModelPrivileges[i].MODULE_SORT
      ModelMENU_ITEMS.MODULE_TYPE = (ListModelPrivileges[i].MODULE_TYPE ?? "").trim().toLowerCase() == "m" ? "menu" : "screen"
      if (ModelMENU_ITEMS.MODULE_TYPE == "screen") {
        ModelMENU_ITEMS.onClick = () => { debugger
           OpenPage(ModelMENU_ITEMS.MODULE_CODE, Router) }

        ModelMENU_ITEMS.COLOR = "text-" + ((ListModelPrivileges[i].Icon_Color ?? "").trim() == "" ? "yellow" : (ListModelPrivileges[i].Icon_Color ?? "")) + "-500"

      }
      else {

        ModelMENU_ITEMS.COLOR = "text-" + ((ListModelPrivileges[i].Icon_Color ?? "").trim() == "" ? "blue" : (ListModelPrivileges[i].Icon_Color ?? "")) + "-500"

      }


      if ((ListModelPrivileges[i].Url_Image ?? "").trim() == "") {
        if (ModelMENU_ITEMS.MODULE_TYPE == "screen") {
          ModelMENU_ITEMS.ICON_PATH = "M1.5 7.125c0-1.036.84-1.875 1.875-1.875h6c1.036 0 1.875.84 1.875 1.875v3.75c0 1.036-.84 1.875-1.875 1.875h-6A1.875 1.875 0 0 1 1.5 10.875v-3.75Zm12 1.5c0-1.036.84-1.875 1.875-1.875h5.25c1.035 0 1.875.84 1.875 1.875v8.25c0 1.035-.84 1.875-1.875 1.875h-5.25a1.875 1.875 0 0 1-1.875-1.875v-8.25ZM3 16.125c0-1.036.84-1.875 1.875-1.875h5.25c1.036 0 1.875.84 1.875 1.875v2.25c0 1.035-.84 1.875-1.875 1.875h-5.25A1.875 1.875 0 0 1 3 18.375v-2.25Z"
        }
        else {
          ModelMENU_ITEMS.ICON_PATH = "M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z"

        }
      }
      else {
        ModelMENU_ITEMS.ICON_PATH = ListModelPrivileges[i].Url_Image

      }

      ModelMENU_ITEMS.PATH = ListModelPrivileges[i].MODULE_CODE
      // ModelMENU_ITEMS.PATH = null;


      MENU_ITEMS_LIST.push(ModelMENU_ITEMS)
    }



  }


  const _Lang = useSys((s) => s.lang);


  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultType[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const IsOpenMenu = useSys((s) => s.IsOpenMenu);
  const IsLangEN = useSys((s) => s.IsLangEN);
  
  const isRTL = IsLangEN === false;
  const [menuTree, setMenuTree] = useState<MenuItemWithState[]>([]);
  const SetIsOpenMenu = useSys((s) => s.SetIsOpenMenu);


  useEffect(() => {

  const handleResize = () => {

    // Mobile
    if (window.innerWidth < 768) {

      SetIsOpenMenu(false);

    }

  };

  // أول تحميل
  handleResize();

  // أثناء تغيير الحجم
  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };

}, []);

  
  const toggleMenu = (moduleCode: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [moduleCode]: !prev[moduleCode]
    }));
  };

  const getTitle = (item: MenuItemType | MenuItemWithState): string => {
    return IsLangEN ? item.TITLE_EN : item.TITLE_AR;
  };

  const handleItemClick = (item: MenuItemType | MenuItemWithState) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.PATH) {
      if (item.openInNewTab) {
        window.open(item.PATH, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = item.PATH;
      }
    }
  };

  const getAllMenuItemsForSearch = (): SearchResultType[] => {
    const allItems: SearchResultType[] = [];

    const flattenTree = (items: MenuItemWithState[], parentTitle?: string) => {
      items.forEach(item => {
        allItems.push({
          title: getTitle(item),
          icon: item.ICON_PATH,
          color: item.COLOR || "text-gray-500",
          path: item.PATH || null,
          moduleCode: item.MODULE_CODE,
          parentTitle: parentTitle,
          onClick: item.onClick,
          openInNewTab: item.openInNewTab
        });

        if (item.children && item.children.length > 0) {
          flattenTree(item.children, getTitle(item));
        }
      });
    };

    flattenTree(menuTree);
    return allItems;
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === "") {
      setSearchResults([]);
      return;
    }

    const allItems = getAllMenuItemsForSearch();
    const results = allItems.filter(item =>
      item.title.toLowerCase().includes(term.toLowerCase())
    );
    setSearchResults(results);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Helper function to safely open URL
  const safeOpenUrl = (url: string | null | undefined, target: string = '_self') => {
    if (url && url.trim() !== '') {
      debugger 
       const fullUrl = `/ClientApp/${url}`;
      window.open(fullUrl, target, 'noopener,noreferrer');
      return true;
    }
    return false;
  };


  // ====================== دالة بناء هيكل المنيو ======================
  const buildMenuTree = (items: MenuItemType[]): MenuItemWithState[] => {
    debugger
    const sortedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
    const menuMap = new Map<string, MenuItemWithState>();
    const roots: MenuItemWithState[] = [];
    debugger

    sortedItems.forEach(item => {
      menuMap.set(item.MODULE_CODE, { ...item, children: [], isOpen: false, level: 0 });
    });
    debugger

    sortedItems.forEach(item => {
      debugger
      const node = menuMap.get(item.MODULE_CODE);
      if (node) {
        if (item.PARENT_MODULE_CODE && menuMap.has(item.PARENT_MODULE_CODE)) {
          const parent = menuMap.get(item.PARENT_MODULE_CODE);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(node);
            node.level = (parent.level || 0) + 1;
          }
        } else if (!item.PARENT_MODULE_CODE) {
          roots.push(node);
        }
      }
    });
    debugger

    return roots;
  };





  function RunbuildMenuTree() {
    debugger
    const tree = buildMenuTree(MENU_ITEMS_LIST);
    setMenuTree(tree);

    const initialOpenState: Record<string, boolean> = {};
    tree.forEach(item => {
      if (item.MODULE_TYPE === 'menu') {
        initialOpenState[item.MODULE_CODE] = item.MODULE_CODE === 'dashboard';
      }
    });
    setOpenMenus(initialOpenState);


  }





  // ====================== بيانات المنيو الديناميكية ======================
  // const MENU_ITEMS_LIST: MenuItemType[] = [
  //   {
  //     MODULE_CODE: "dashboard",
  //     MODULE_TYPE: "menu",
  //     TITLE_AR: "لوحة التحكم",
  //     TITLE_EN: "Dashboard",
  //     ICON_PATH: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  //     PARENT_MODULE_CODE: null,
  //     COLOR: "text-blue-500 dark:text-blue-400",
  //     order: 1
  //   },
  //   {
  //     MODULE_CODE: "overview",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "نظرة عامة",
  //     TITLE_EN: "Overview",
  //     ICON_PATH: "M4 6h16M4 12h16M4 18h16",
  //     PARENT_MODULE_CODE: "dashboard",
  //     PATH: "/dashboard/overview",
  //     COLOR: "text-sky-500",
  //     order: 1
  //   },
  //   {
  //     MODULE_CODE: "statistics",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "الإحصائيات",
  //     TITLE_EN: "Statistics",
  //     ICON_PATH: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  //     PARENT_MODULE_CODE: "dashboard",
  //     PATH: "/dashboard/statistics",
  //     COLOR: "text-emerald-500",
  //     order: 2
  //   },
  //   {
  //     MODULE_CODE: "reports",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "التقارير",
  //     TITLE_EN: "Reports",
  //     ICON_PATH: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  //     PARENT_MODULE_CODE: "dashboard",
  //     PATH: "/dashboard/reports",
  //     COLOR: "text-purple-500",
  //     order: 3
  //   },
  //   {
  //     MODULE_CODE: "pages",
  //     MODULE_TYPE: "menu",
  //     TITLE_AR: "الصفحات",
  //     TITLE_EN: "Pages",
  //     ICON_PATH: "M4 6h16M4 12h16M4 18h7",
  //     PARENT_MODULE_CODE: null,
  //     COLOR: "text-emerald-500 dark:text-emerald-400",
  //     order: 2
  //   },
  //   {
  //     MODULE_CODE: "all_pages",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "جميع الصفحات",
  //     TITLE_EN: "All Pages",
  //     ICON_PATH: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  //     PARENT_MODULE_CODE: "pages",
  //     PATH: "/pages/all",
  //     COLOR: "text-cyan-500",
  //     order: 1
  //   },
  //   {
  //     MODULE_CODE: "home_pages",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "الصفحات الرئيسية",
  //     TITLE_EN: "Home Pages",
  //     ICON_PATH: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  //     PARENT_MODULE_CODE: "pages",
  //     PATH: "/pages/home",
  //     COLOR: "text-blue-500",
  //     order: 2
  //   },
  //   {
  //     MODULE_CODE: "landing_pages",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "صفحات الهبوط",
  //     TITLE_EN: "Landing Pages",
  //     ICON_PATH: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  //     PARENT_MODULE_CODE: "pages",
  //     PATH: "/pages/landing",
  //     COLOR: "text-indigo-500",
  //     order: 3
  //   },
  //   {
  //     MODULE_CODE: "posts",
  //     MODULE_TYPE: "menu",
  //     TITLE_AR: "المشاركات",
  //     TITLE_EN: "Posts",
  //     ICON_PATH: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  //     PARENT_MODULE_CODE: null,
  //     COLOR: "text-amber-500 dark:text-amber-400",
  //     order: 3
  //   },
  //   {
  //     MODULE_CODE: "create_post",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "إنشاء مشاركة",
  //     TITLE_EN: "Create Post",
  //     ICON_PATH: "M12 4v16m8-8H4",
  //     PARENT_MODULE_CODE: "posts",
  //     PATH: "/posts/create",
  //     COLOR: "text-green-500",
  //     order: 1
  //   },
  //   {
  //     MODULE_CODE: "drafts",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "المسودات",
  //     TITLE_EN: "Drafts",
  //     ICON_PATH: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  //     PARENT_MODULE_CODE: "posts",
  //     PATH: "/posts/drafts",
  //     COLOR: "text-yellow-500",
  //     order: 2
  //   },
  //   {
  //     MODULE_CODE: "published",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "المنشورة",
  //     TITLE_EN: "Published",
  //     ICON_PATH: "M5 13l4 4L19 7",
  //     PARENT_MODULE_CODE: "posts",
  //     PATH: "/posts/published",
  //     COLOR: "text-emerald-500",
  //     order: 3
  //   },
  //   {
  //     MODULE_CODE: "archive",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "الأرشيف",
  //     TITLE_EN: "Archive",
  //     ICON_PATH: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  //     PARENT_MODULE_CODE: "posts",
  //     PATH: "/posts/archive",
  //     COLOR: "text-gray-500",
  //     order: 4
  //   },
  //   {
  //     MODULE_CODE: "settings",
  //     MODULE_TYPE: "menu",
  //     TITLE_AR: "الإعدادات",
  //     TITLE_EN: "Settings",
  //     ICON_PATH: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  //     PARENT_MODULE_CODE: null,
  //     COLOR: "text-gray-500 dark:text-gray-400",
  //     order: 4
  //   },
  //   {
  //     MODULE_CODE: "profile",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "الملف الشخصي",
  //     TITLE_EN: "Profile",
  //     ICON_PATH: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  //     PARENT_MODULE_CODE: "settings",
  //     PATH: "/settings/profile",
  //     COLOR: "text-blue-500",
  //     order: 1
  //   },
  //   {
  //     MODULE_CODE: "security",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "الأمان",
  //     TITLE_EN: "Security",
  //     ICON_PATH: "M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5",
  //     PARENT_MODULE_CODE: "settings",
  //     PATH: "/settings/security",
  //     COLOR: "text-red-500",
  //     order: 2
  //   },
  //   {
  //     MODULE_CODE: "notifications",
  //     MODULE_TYPE: "screen",
  //     TITLE_AR: "الإشعارات",
  //     TITLE_EN: "Notifications",
  //     ICON_PATH: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  //     PARENT_MODULE_CODE: "settings",
  //     PATH: "/settings/notifications",
  //     COLOR: "text-purple-500",
  //     order: 3
  //   },
  //   // {
  //   //   MODULE_CODE: "logout",
  //   //   MODULE_TYPE: "screen",
  //   //   TITLE_AR: "تسجيل الخروج",
  //   //   TITLE_EN: "Logout",
  //   //   ICON_PATH: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  //   //   PARENT_MODULE_CODE: null,
  //   //   COLOR: "text-red-500 dark:text-red-400",
  //   //   onClick: () => {
  //   //     console.log("Logout clicked");
  //   //     localStorage.clear(); 
  //   //     OpenPage("Dashboard",Router)
  //   //   },
  //   //   order: 99
  //   // }
  // ];







  // =======================
  // UI
  // =======================
  // value
  const state = {
    isRTL,
    menuTree,
    IsLangEN,
    IsOpenMenu,
    isSearchOpen,
    searchResults,
    searchTerm,
    openMenus,
    _Lang,
    MENU_ITEMS_LIST,
  };

  //function
  const actions = {
    safeOpenUrl,
    closeSearch,
    openSearch,
    handleSearch,
    getAllMenuItemsForSearch,
    handleItemClick,
    getTitle,
    toggleMenu,
    buildMenuTree,
  };

  // Element
  const elements = {
    searchInputRef,
  };


  return {
    ...state,
    ...actions,
    ...elements

  };

};
