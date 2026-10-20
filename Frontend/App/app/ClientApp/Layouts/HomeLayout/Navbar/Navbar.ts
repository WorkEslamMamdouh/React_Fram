"use client"
import { Sys } from "../../../Shared/SystemTools";
import { useEffect, useRef, useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { } from "../../../Shared/Entities_DataBase";
import { } from "../../../Shared/Entities";
import { OpenPage } from "../../../Shared/App";
import { useRouter } from "next/navigation";
import { Language } from "../../../Language/Language";
import { SQL } from "@/app/ClientApp/Shared/CallDataBase";
import { Console } from "console";


// =======================
// Navbar Page  
// =======================
export function Navbar() {
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


    InitializeEvents()

  }

  function InitializeEvents() {

    //if (email.current) {
    //email.current.onchange = showWebsite;
    //}

  }


  // =======================
  // #region Events Elements Html
  // =======================



  const _Lang = useSys((s) => s.lang);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isYearsOpen, setIsYearsOpen] = useState(false);
  const [isBranchesOpen, setIsBranchesOpen] = useState(false);

  const yearsData = useSys((s) => s.DataYearControl);
  const SetDataYearControl = useSys((s) => s.SetDataYearControl);
  const branchesData = useSys((s) => s.DataBranch);
  const setBranchesData = useSys((s) => s.SetDataBranch);
  const Session = useSys((s) => s.Session);
  const SetSession = useSys((s) => s.SetSession);


  const toggleSideMenu = useSys((s) => s.toggleSideMenu);
  const toggleModDark = useSys((s) => s.toggleModDark);
  const IsDark = useSys((s) => s.IsDark);
  const IsNotifications = useSys((s) => s.IsNotifications);
  const IsMessages = useSys((s) => s.IsMessages);
  const IsFavorites = useSys((s) => s.IsFavorites);
  const IsLangEN = useSys((s) => s.IsLangEN);
  const lang = useSys((s) => s.lang);
  const language = Language();
  const setToken = useSys((s) => s.setToken);
  // State for responsive
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Refs for click outside detection
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const bookmarksRef = useRef<HTMLDivElement>(null);
  const yearsRef = useRef<HTMLDivElement>(null);
  const branchesRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const messagesButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarksButtonRef = useRef<HTMLButtonElement>(null);
  const yearsButtonRef = useRef<HTMLButtonElement>(null);
  const branchesButtonRef = useRef<HTMLButtonElement>(null);

  // بيانات السنوات التجريبية (ثابتة - لا تحتاج ترجمة)
  // const yearsData = [
  //   { id: 1, name: "2024", status: "active", count: 156 },
  //   { id: 2, name: "2023", status: "completed", count: 245 },
  //   { id: 3, name: "2022", status: "completed", count: 198 },
  //   { id: 4, name: "2021", status: "archived", count: 134 },
  //   { id: 5, name: "2020", status: "archived", count: 89 }
  // ];



 

  function ChangeModDark(_IsDark: boolean) {
    debugger
    toggleModDark(_IsDark)


    var Data = {
      IDSettingsUser: Session.CurrentEnvironment.Sys_SettingsUserProfile.IDSettingsUser,
      IsDarkMode: _IsDark
    }
    debugger
    let Res = SQL.Update("Sys_SettingsUserProfile", "IDSettingsUser", Data, ShowLoader, CloseLoader)
    debugger
    console.log(Res);

  }

 
 

  function OpenHome() {
     OpenPage("Home", Router)
  }

 


  // State for selected values (default first item)
  const [selectedYear, setSelectedYear] = useState(yearsData[0]);
  const [selectedBranch, setSelectedBranch] = useState(branchesData[0]);


    useEffect(() => {
    debugger
          Session.CurrentEnvironment.BranchCode = selectedBranch.BranchCode;
      Session.CurrentEnvironment.Sys_Branch = selectedBranch;
      SetSession(Session)

  }, [selectedBranch]);


    useEffect(() => {
    debugger

          Session.CurrentEnvironment.FinYear = selectedYear.FinYear;
      Session.CurrentEnvironment.Sys_Control = selectedYear;
      SetSession(Session)

  }, [selectedYear]);


  // **تحديث selectedBranch عندما تتغير branchesData**
  useEffect(() => {
    debugger
    if (branchesData.length > 0 && selectedBranch.BranchCode) {
      const updatedBranch = branchesData.find(b => b.BranchCode === selectedBranch.BranchCode);
      if (updatedBranch) {
        setSelectedBranch(updatedBranch);

   

      } else if (branchesData[0]) {
        setSelectedBranch(branchesData[0]);

          Session.CurrentEnvironment.BranchCode = branchesData[0].BranchCode;
      Session.CurrentEnvironment.Sys_Branch = branchesData[0];
      SetSession(Session)

      }
    } else if (branchesData.length > 0) {
      setSelectedBranch(branchesData[0]);

      Session.CurrentEnvironment.BranchCode = branchesData[0].BranchCode;
      Session.CurrentEnvironment.Sys_Branch = branchesData[0];
      SetSession(Session)
    }
  }, [branchesData]);


  useEffect(() => {
    debugger

    if (!branchesData || branchesData.length === 0) return;

    const branchCode = Session?.CurrentEnvironment?.BranchCode;

    if (!branchCode) return;

    const selected = branchesData.find(
      (b) => b.BranchCode === branchCode
    );

    if (selected) {
      setSelectedBranch(selected);
    }

    // *******************************************

        if (!yearsData || yearsData.length === 0) return;

    const FinYear = Session?.CurrentEnvironment?.FinYear;

    if (!FinYear) return;

    const SelectedYear = yearsData.find(
      (b) => b.FinYear === FinYear
    );

    if (SelectedYear) {
      setSelectedYear(SelectedYear);
    }


  }, [ Session]);


 
  // **تحديث أسماء الفروع عند تغيير اللغة**
  useEffect(() => {
    // updateBranchesNames();
  }, [IsLangEN]);

  // بيانات الصفحات المفضلة - تحتاج أيضاً إلى تحديث عند تغيير اللغة
  const [favoritePages, setFavoritePages] = useState([
    {
      id: 1,
      title: "",
      path: "/dashboard/analytics",
      icon: "📊",
      lastVisited: "2024-01-15"
    },
    {
      id: 2,
      title: "",
      path: "/users/manage",
      icon: "👥",
      lastVisited: "2024-01-14"
    },
    {
      id: 3,
      title: "",
      path: "/reports",
      icon: "📈",
      lastVisited: "2024-01-13"
    },
    {
      id: 4,
      title: "",
      path: "/settings",
      icon: "⚙️",
      lastVisited: "2024-01-12"
    },
    {
      id: 5,
      title: "",
      path: "/help",
      icon: "❓",
      lastVisited: "2024-01-10"
    }
  ]);

  // **تحديث أسماء الصفحات المفضلة عند تغيير اللغة**
  const updateFavoritePages = () => {
    setFavoritePages([
      {
        id: 1,
        title: IsLangEN ? "Dashboard Analytics" : "لوحة التحليلات",
        path: "/dashboard/analytics",
        icon: "📊",
        lastVisited: "2024-01-15"
      },
      {
        id: 2,
        title: IsLangEN ? "User Management" : "إدارة المستخدمين",
        path: "/users/manage",
        icon: "👥",
        lastVisited: "2024-01-14"
      },
      {
        id: 3,
        title: IsLangEN ? "Reports Center" : "مركز التقارير",
        path: "/reports",
        icon: "📈",
        lastVisited: "2024-01-13"
      },
      {
        id: 4,
        title: IsLangEN ? "Settings & Preferences" : "الإعدادات والتفضيلات",
        path: "/settings",
        icon: "⚙️",
        lastVisited: "2024-01-12"
      },
      {
        id: 5,
        title: IsLangEN ? "Help & Support" : "المساعدة والدعم",
        path: "/help",
        icon: "❓",
        lastVisited: "2024-01-10"
      }
    ]);
  };

  // **تحديث الصفحات المفضلة عند تغيير اللغة**
  useEffect(() => {
    updateFavoritePages();
  }, [IsLangEN]);

  useEffect(() => {
    if (IsDark === true) {
      document.documentElement.classList.add("dark");
    }

    // Check screen size
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);

      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // تحديث حالة الـ Sidebar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: isSidebarOpen }));
  }, [isSidebarOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node) &&
        profileButtonRef.current && !profileButtonRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node) &&
        notificationsButtonRef.current && !notificationsButtonRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node) &&
        messagesButtonRef.current && !messagesButtonRef.current.contains(event.target as Node)) {
        setIsMessagesOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node) &&
        moreMenuButtonRef.current && !moreMenuButtonRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (bookmarksRef.current && !bookmarksRef.current.contains(event.target as Node) &&
        bookmarksButtonRef.current && !bookmarksButtonRef.current.contains(event.target as Node)) {
        setIsBookmarksOpen(false);
      }
      if (yearsRef.current && !yearsRef.current.contains(event.target as Node) &&
        yearsButtonRef.current && !yearsButtonRef.current.contains(event.target as Node)) {
        setIsYearsOpen(false);
      }
      if (branchesRef.current && !branchesRef.current.contains(event.target as Node) &&
        branchesButtonRef.current && !branchesButtonRef.current.contains(event.target as Node)) {
        setIsBranchesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // تحديد اتجاه اللغة (RTL أو LTR)
  const isRTL = !IsLangEN;

  // دالة تغيير اللغة
  const handleLanguageSwitch = async () => {
    setIsMoreMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsMessagesOpen(false);
    setIsDropdownOpen(false);
    setIsBookmarksOpen(false);
    setIsYearsOpen(false);
    setIsBranchesOpen(false);

    setTimeout(() => {
      language.LangSwitcher();
 
        var Data = {
          IDSettingsUser: Session.CurrentEnvironment.Sys_SettingsUserProfile.IDSettingsUser,
          Language: IsLangEN == true ? 'ar' : 'en'
        }

        let Res = SQL.Update("Sys_SettingsUserProfile", "IDSettingsUser", Data, ShowLoader, CloseLoader)

        console.log(Res);
 

    }, 50);


  };

  // دالة إزالة صفحة من المفضلة
  const removeFromFavorites = (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setFavoritePages(favoritePages.filter(page => page.id !== id));
  };

  // دالة إضافة صفحة جديدة للمفضلة
  const addCurrentPageToFavorites = () => {
    const newPage = {
      id: Date.now(),
      title: IsLangEN ? "Current Page" : "الصفحة الحالية",
      path: window.location.pathname,
      icon: "📍",
      lastVisited: new Date().toISOString().split('T')[0]
    };
    setFavoritePages([newPage, ...favoritePages]);
    setIsBookmarksOpen(false);
  };

  // دالة تبديل الـ Sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    toggleSideMenu();
  };

  // بيانات المستخدم
  const user = {
    name: Session.CurrentEnvironment.Sys_CompanyAndUser.USER_NAME,
    email: Session.CurrentEnvironment.Sys_CompanyAndUser.USER_Email,
    avatar: "https://images.unsplash.com/photo-1659482633369-9fe69af50bfb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=3&w=320&h=320&q=80"
  };
  // const user = {
  //   name: "James Collison",
  //   email: "jamescollison@site.com",
  //   avatar: "https://images.unsplash.com/photo-1659482633369-9fe69af50bfb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=3&w=320&h=320&q=80"
  // };

  // بيانات الإشعارات والرسائل - تحتاج أيضاً إلى تحديث عند تغيير اللغة
  const [notifications, setNotifications] = useState([
    { id: 1, title: "", time: "5 min ago", read: false, icon: "💬" },
    { id: 2, title: "", time: "1 hour ago", read: false, icon: "📊" },
    { id: 3, title: "", time: "3 hours ago", read: true, icon: "⚡" },
    { id: 4, title: "", time: "Yesterday", read: true, icon: "💭" }
  ]);

  const [messages, setMessages] = useState([
    { id: 1, name: "Sarah Johnson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop", message: "", time: "2 min ago", read: false },
    { id: 2, name: "Michael Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop", message: "", time: "30 min ago", read: false },
    { id: 3, name: "Emily Davis", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop", message: "", time: "2 hours ago", read: true }
  ]);

  // **تحديث الإشعارات عند تغيير اللغة**
  const updateNotifications = () => {
    setNotifications([
      { id: 1, title: IsLangEN ? "New message from John" : "رسالة جديدة من جون", time: "5 min ago", read: false, icon: "💬" },
      { id: 2, title: IsLangEN ? "Your report is ready" : "التقرير جاهز", time: "1 hour ago", read: false, icon: "📊" },
      { id: 3, title: IsLangEN ? "System update completed" : "تحديث النظام اكتمل", time: "3 hours ago", read: true, icon: "⚡" },
      { id: 4, title: IsLangEN ? "New comment on your post" : "تعليق جديد على منشورك", time: "Yesterday", read: true, icon: "💭" }
    ]);
  };

  // **تحديث الرسائل عند تغيير اللغة**
  const updateMessages = () => {
    setMessages([
      { id: 1, name: "Sarah Johnson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop", message: IsLangEN ? "Hey! How are you doing?" : "مرحباً! كيف حالك؟", time: "2 min ago", read: false },
      { id: 2, name: "Michael Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop", message: IsLangEN ? "The meeting is at 3 PM" : "الاجتماع في الساعة 3", time: "30 min ago", read: false },
      { id: 3, name: "Emily Davis", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop", message: IsLangEN ? "Thanks for your help!" : "شكراً لمساعدتك!", time: "2 hours ago", read: true }
    ]);
  };

  // **تحديث جميع النصوص عند تغيير اللغة**
  useEffect(() => {
    updateNotifications();
    updateMessages();
  }, [IsLangEN]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const unreadMessagesCount = messages.filter(m => !m.read).length;

  // #endregion





  function Logout() {
    console.log("Logout clicked");
    localStorage.clear();
    localStorage.setItem("logout-event", Date.now().toString());
    setToken("");
    Sys.ShowMessage("Logout successful!", "تم تسجيل الخروج بنجاح!", "success");
    OpenPage("Login", Router)

  }



  // =======================
  // UI
  // =======================
  // value
  const state = {
    unreadNotificationsCount,
    unreadMessagesCount,
    isRTL,
    favoritePages,
    selectedBranch,
    selectedYear,
    _Lang,
    isDropdownOpen,
    isNotificationsOpen,
    isMessagesOpen,
    isMoreMenuOpen,
    isBookmarksOpen,
    isYearsOpen,
    isBranchesOpen,
    isMobile,
    isSidebarOpen,
    IsLangEN,
    branchesData,
IsFavorites,
IsMessages,
IsNotifications,
    IsDark,
    user,
    messages,
    yearsData,
  };

  //function
  const actions = {
    setIsYearsOpen,
    setBranchesData,
    setSelectedYear,
    setIsBranchesOpen,
    setSelectedBranch,
    setIsDropdownOpen,
    setIsNotificationsOpen,
    setIsMessagesOpen,
    setIsMoreMenuOpen,
    setIsBookmarksOpen,
    handleLanguageSwitch,
    removeFromFavorites,
    addCurrentPageToFavorites,
    toggleSidebar,
    updateNotifications,
    updateMessages,
    updateFavoritePages,
    ChangeModDark,
    Logout,
    OpenHome,
  };

  // Element
  const elements = {
    profileRef,
    profileButtonRef,
    notificationsRef,
    messagesRef,
    moreMenuRef,
    bookmarksRef,
    yearsRef,
    branchesRef,
    notificationsButtonRef,
    messagesButtonRef,
    moreMenuButtonRef,
    bookmarksButtonRef,
    yearsButtonRef,
    branchesButtonRef,
    notifications,
  };


  return {
    ...state,
    ...actions,
    ...elements

  };

};
