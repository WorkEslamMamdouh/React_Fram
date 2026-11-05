"use client"
import { Sys } from "../../../Shared/SystemTools";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { MenuItemType, MenuItemWithState, SearchResultType } from "../../../Shared/Entities";
import { OpenPage } from "../../../Shared/App";
import { useRouter, usePathname } from "next/navigation";
import type React from "react";
import {
  applyUserMenu, buildMenuItems, buildTree, flattenToRows, getRecent, loadUserMenu, moveBefore, moveSibling,
  pushRecent, removeHidden, reorderFavorites, resetUserMenu, saveUserMenu, toggleFavorite, useFavoriteRows,
  UserMenuRow,
} from "../../../Shared/MenuPrefs";
import { useDragSort } from "./useDragSort";

export type SearchSection = { key: string; label: string; items: SearchResultType[] };

/** Lower-case + fold Arabic spelling variants (hamza on alef, ya/alef-maqsura, ta marbuta, tashkeel) so "الادوار" finds "الأدوار". */
function foldText(s: string): string {
  return (s ?? "").toString().trim().toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

// =======================
// SideMenu Page
// Menu = privileges (IQ_Sys_RoleModule) + per-user order (Sys_UserMenu) + favorites (Sys_Favorites)
// =======================
export function SideMenu() {
  const Router = useRouter();

  // #region UsingSystem Glopal
  const Session = useSys((s) => s.Session);
  const _Lang = useSys((s) => s.lang);
  const IsOpenMenu = useSys((s) => s.IsOpenMenu);
  const IsLangEN = useSys((s) => s.IsLangEN);
  const isRTL = IsLangEN === false;
  // #endregion

  const env: any = Session?.CurrentEnvironment ?? {};
  const userId: number = Number(env.UserID || env.Sys_CompanyAndUser?.UserID || 0) || 0;
  const compCode: number = Number(env.CompCode || 0) || 0;
  const branchCode: number = Number(env.BranchCode || 0) || 0;

  // ===== privileges -> items -> default tree =====
  const MENU_ITEMS_LIST: MenuItemType[] = useMemo(
    () => buildMenuItems(Session?.CurrentPrivileges ?? [], (code) => OpenPage(code, Router)),
    [Session?.CurrentPrivileges] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const itemByCode = useMemo(() => {
    const m = new Map<string, MenuItemType>();
    MENU_ITEMS_LIST.forEach((i) => m.set(i.MODULE_CODE, i));
    return m;
  }, [MENU_ITEMS_LIST]);

  // ===== per-user order (null = not loaded / table missing -> default order) =====
  const [userRows, setUserRows] = useState<UserMenuRow[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await loadUserMenu(userId, compCode);
      if (alive) setUserRows(rows ?? []);
    })();
    return () => { alive = false; };
  }, [userId, compCode]);

  const base = useMemo(() => applyUserMenu(buildTree(MENU_ITEMS_LIST), userRows), [MENU_ITEMS_LIST, userRows]);
  const visibleTree = useMemo(() => removeHidden(base.tree, base.hidden), [base]);

  // ===== edit mode =====
  const [editMode, setEditMode] = useState(false);
  const [draftTree, setDraftTree] = useState<MenuItemWithState[]>([]);
  const [draftHidden, setDraftHidden] = useState<Set<string>>(new Set());
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // الشجرة اللي بتتعرض: المسودة في وضع التعديل، وإلا الشجرة بعد إخفاء المخفي
  const menuTree: MenuItemWithState[] = editMode ? draftTree : visibleTree;
  const hiddenSet: Set<string> = editMode ? draftHidden : base.hidden;

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const favDrawerRef = useRef<HTMLDivElement>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [menuFilter, setMenuFilter] = useState("");
  const [pendingFavScroll, setPendingFavScroll] = useState(false);
  const [favHint, setFavHint] = useState(false);

  const pathname = usePathname();
  const activeModule = (pathname || "").split("/")[2] ?? "";

  // ===== favorites =====
  const favRows = useFavoriteRows(userId);
  const favorites: MenuItemWithState[] = useMemo(() => {
    const out: MenuItemWithState[] = [];
    favRows.forEach((r) => {
      const it = itemByCode.get(r.MODULE_CODE);
      if (it && it.MODULE_TYPE === "screen") out.push(it as MenuItemWithState); // only screens the user still has access to
    });
    return out;
  }, [favRows, itemByCode]);
  const favSet = useMemo(() => new Set(favorites.map((f) => f.MODULE_CODE)), [favorites]);
  const isFavorite = (code: string) => favSet.has(code);

  const getTitle = (item: MenuItemType | MenuItemWithState): string => {
    return (IsLangEN ? item.TITLE_EN : item.TITLE_AR) || item.TITLE_EN || item.TITLE_AR || item.MODULE_CODE;
  };

  const toggleFav = (item: MenuItemType | MenuItemWithState) => {
    void toggleFavorite(userId, compCode, branchCode, item.MODULE_CODE, item.TITLE_EN || item.TITLE_AR || item.MODULE_CODE);
  };

  const toggleFavCode = (code: string) => {
    const it = itemByCode.get(code);
    if (it) toggleFav(it);
  };

  const moveFavorite = (code: string, delta: number) => {
    const codes = favorites.map((f) => f.MODULE_CODE);
    const i = codes.indexOf(code);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= codes.length) return;
    const [c] = codes.splice(i, 1);
    codes.splice(j, 0, c);
    void reorderFavorites(userId, codes);
  };

  const dropFavorite = (dragCode: string, targetCode: string) => {
    const codes = favorites.map((f) => f.MODULE_CODE);
    const from = codes.indexOf(dragCode);
    const to = codes.indexOf(targetCode);
    if (from < 0 || to < 0 || from === to) return;
    const [c] = codes.splice(from, 1);
    codes.splice(to, 0, c);
    void reorderFavorites(userId, codes);
  };

  // ===== drag & drop =====
  const dnd = useDragSort(
    (group, dragId, targetId) => {
      if (group === "fav") dropFavorite(dragId, targetId);
      else if (editMode) setDraftTree((t) => moveBefore(t, dragId, targetId));
    },
    (group, id, delta) => {
      if (group === "fav") moveFavorite(id, delta);
      else if (editMode) setDraftTree((t) => moveSibling(t, id, delta));
    }
  );

  // ===== edit actions =====
  const openAllGroups = () => {
    const all: Record<string, boolean> = {};
    MENU_ITEMS_LIST.forEach((i) => { if (i.MODULE_TYPE === "menu") all[i.MODULE_CODE] = true; });
    setOpenMenus(all);
  };

  const startEdit = () => {
    setDraftTree(base.tree);
    setDraftHidden(new Set(base.hidden));
    setMenuFilter("");
    setConfirmReset(false);
    openAllGroups();
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setConfirmReset(false);
  };

  const moveItem = (code: string, delta: number) => setDraftTree((t) => moveSibling(t, code, delta));

  const toggleHidden = (code: string) => {
    setDraftHidden((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const saveEdit = async () => {
    if (isSavingMenu) return;
    setIsSavingMenu(true);
    const rows = flattenToRows(draftTree, draftHidden, userId, compCode);
    const ok = await saveUserMenu(userId, compCode, rows);
    if (ok) {
      setUserRows(rows);
      setEditMode(false);
      Sys.ShowMessage("Menu order saved", "تم حفظ ترتيب القايمة", "success");
    } else {
      // رجّع اللي في القاعدة فعلًا (ممكن يكون الحفظ اتعمل جزئيًا)
      const fresh = await loadUserMenu(userId, compCode);
      if (fresh) setUserRows(fresh);
      Sys.ShowMessage(
        "Could not save the menu order. The menu table may not be set up yet.",
        "تعذّر حفظ ترتيب القايمة. ممكن جدول القايمة لسه ماتجهزش.",
        "error"
      );
    }
    setIsSavingMenu(false);
  };

  const resetEdit = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    if (isSavingMenu) return;
    setIsSavingMenu(true);
    const ok = await resetUserMenu(userId, compCode);
    if (ok) {
      setUserRows([]);
      setEditMode(false);
      Sys.ShowMessage("Menu order reset to default", "اتـرجّع ترتيب القايمة الأصلي", "success");
    } else {
      Sys.ShowMessage("Could not reset the menu order", "تعذّر إرجاع الترتيب الأصلي", "error");
    }
    setIsSavingMenu(false);
  };

  // ===== open groups =====
  useEffect(() => {
    // أول تحميل: لوحة التحكم مفتوحة (زي ما كان)
    const init: Record<string, boolean> = {};
    MENU_ITEMS_LIST.forEach((i) => { if (i.MODULE_TYPE === "menu" && !i.PARENT_MODULE_CODE) init[i.MODULE_CODE] = i.MODULE_CODE === "dashboard"; });
    setOpenMenus(init);
  }, [MENU_ITEMS_LIST]);

  useEffect(() => {
    // افتح المجموعة اللي فيها الشاشة الحالية
    let cur = itemByCode.get(activeModule);
    const toOpen: string[] = [];
    let guard = 0;
    while (cur && cur.PARENT_MODULE_CODE && guard++ < 10) {
      toOpen.push(cur.PARENT_MODULE_CODE);
      cur = itemByCode.get(cur.PARENT_MODULE_CODE);
    }
    if (toOpen.length > 0) setOpenMenus((prev) => {
      const next = { ...prev };
      toOpen.forEach((c) => { next[c] = true; });
      return next;
    });
  }, [activeModule, itemByCode]);

  const toggleMenu = (moduleCode: string) => {
    setOpenMenus((prev) => ({ ...prev, [moduleCode]: !prev[moduleCode] }));
  };

  // ===== recently opened =====
  useEffect(() => {
    const it = itemByCode.get(activeModule);
    if (it && it.MODULE_TYPE === "screen") pushRecent(userId, compCode, activeModule);
  }, [activeModule, itemByCode, userId, compCode]);

  // ===== responsive / drawer =====
  useEffect(() => {
    const handleResize = () => {
      // موبايل/تابلت (<1024): القايمة بتتفتح كدرج. ولما الشاشة ترجع كبيرة الدرج بيتقفل.
      if (window.innerWidth >= 1024) setIsDrawerOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeDrawer = () => setIsDrawerOpen(false);

  const openFavorites = () => {
    setFavHint(favorites.length === 0);
    setPendingFavScroll(true);
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    if (!isDrawerOpen || !pendingFavScroll) return;
    const t = setTimeout(() => {
      try {
        favDrawerRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      } catch { /* ignore */ }
      setPendingFavScroll(false);
    }, 60);
    return () => clearTimeout(t);
  }, [isDrawerOpen, pendingFavScroll]);

  useEffect(() => {
    if (!isDrawerOpen) { setFavHint(false); }
  }, [isDrawerOpen]);

  // اقفل الدرج لما الصفحة تتغير
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // ===== menu filter (بتحافظ على الأب لو أي ابن مطابق) =====
  const filterTree = (items: MenuItemWithState[], term: string): MenuItemWithState[] => {
    const q = foldText(term);
    if (q === "") return items;
    const out: MenuItemWithState[] = [];
    items.forEach((item) => {
      const title = foldText((IsLangEN ? item.TITLE_EN : item.TITLE_AR) ?? "");
      const kids = item.children ? filterTree(item.children, term) : [];
      if (title.includes(q)) out.push(item);
      else if (kids.length > 0) out.push({ ...item, children: kids });
    });
    return out;
  };

  const handleItemClick = (item: MenuItemType | MenuItemWithState) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.PATH) {
      if (item.openInNewTab) window.open(item.PATH, "_blank", "noopener,noreferrer");
      else window.location.href = item.PATH;
    }
  };

  // Helper function to safely open URL
  const safeOpenUrl = (url: string | null | undefined, target: string = "_self") => {
    if (url && url.trim() !== "") {
      window.open(`/ClientApp/${url}`, target, "noopener,noreferrer");
      return true;
    }
    return false;
  };

  // ===== Ctrl+K search: all permitted screens (hidden ones included), favorites first, then recent =====
  const toResult = (item: MenuItemType | MenuItemWithState): SearchResultType => {
    const parent = item.PARENT_MODULE_CODE ? itemByCode.get(item.PARENT_MODULE_CODE) : undefined;
    return {
      title: getTitle(item),
      icon: item.ICON_PATH,
      color: item.COLOR || "text-gray-500",
      path: item.PATH || null,
      moduleCode: item.MODULE_CODE,
      parentTitle: parent ? getTitle(parent) : undefined,
      onClick: item.onClick,
      openInNewTab: item.openInNewTab,
    };
  };

  const getAllMenuItemsForSearch = (): SearchResultType[] => {
    const all: SearchResultType[] = [];
    const walk = (nodes: MenuItemWithState[]) => {
      nodes.forEach((n) => {
        if (n.MODULE_TYPE === "screen") all.push(toResult(n));
        if (n.children && n.children.length > 0) walk(n.children);
      });
    };
    walk(base.tree);
    return all;
  };

  const searchSections: SearchSection[] = (() => {
    if (!isSearchOpen) return [];
    const q = foldText(searchTerm);
    if (q === "") {
      const sections: SearchSection[] = [];
      if (favorites.length > 0) {
        sections.push({ key: "fav", label: isRTL ? "المفضلة" : "Favorites", items: favorites.map(toResult) });
      }
      const recent = getRecent(userId, compCode)
        .map((c) => itemByCode.get(c))
        .filter((i): i is MenuItemType => !!i && i.MODULE_TYPE === "screen")
        .map(toResult);
      if (recent.length > 0) {
        sections.push({ key: "recent", label: isRTL ? "فُتحت مؤخرًا" : "Recently opened", items: recent });
      }
      return sections;
    }
    const matches = getAllMenuItemsForSearch().filter((r) => {
      const it = itemByCode.get(r.moduleCode);
      const other = it ? foldText(`${it.TITLE_EN ?? ""} ${it.TITLE_AR ?? ""}`) : "";
      return foldText(r.title).includes(q) || other.includes(q);
    });
    matches.sort((a, b) => Number(favSet.has(b.moduleCode)) - Number(favSet.has(a.moduleCode)));
    return [{ key: "results", label: "", items: matches }];
  })();

  const searchFlat: SearchResultType[] = searchSections.flatMap((s) => s.items);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setSearchIndex(0);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    setSearchIndex(0);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchTerm("");
    setSearchIndex(0);
  };

  const openSearchResult = (r: SearchResultType | undefined) => {
    if (!r) return;
    if (r.onClick) r.onClick();
    else if (r.path) safeOpenUrl(r.path, r.openInNewTab ? "_blank" : "_self");
    closeSearch();
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = searchFlat.length;
      if (n === 0) return;
      setSearchIndex((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === "Enter") {
      e.preventDefault();
      openSearchResult(searchFlat[searchIndex]);
    }
  };

  useEffect(() => {
    const onToggle = () => setIsDrawerOpen((v) => !v);
    const onSearch = () => openSearch();
    window.addEventListener("erp:toggle-drawer", onToggle);
    window.addEventListener("erp:open-search", onSearch);
    return () => {
      window.removeEventListener("erp:toggle-drawer", onToggle);
      window.removeEventListener("erp:open-search", onSearch);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape" && isSearchOpen) closeSearch();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // =======================
  // UI
  // =======================
  const state = {
    isRTL,
    menuTree,
    IsLangEN,
    IsOpenMenu,
    isSearchOpen,
    searchSections,
    searchFlat,
    searchIndex,
    searchTerm,
    openMenus,
    _Lang,
    MENU_ITEMS_LIST,
    isDrawerOpen,
    menuFilter,
    activeModule,
    favorites,
    favHint,
    editMode,
    hiddenSet,
    isSavingMenu,
    confirmReset,
    hasCustomOrder: userRows.length > 0,
    dragId: dnd.dragId,
    overId: dnd.overId,
  };

  const actions = {
    safeOpenUrl,
    closeSearch,
    openSearch,
    handleSearch,
    handleSearchKey,
    openSearchResult,
    getAllMenuItemsForSearch,
    handleItemClick,
    getTitle,
    toggleMenu,
    closeDrawer,
    openHome: () => OpenPage("Home", Router),
    openFavorites,
    setIsDrawerOpen,
    setMenuFilter,
    filterTree,
    isFavorite,
    toggleFav,
    toggleFavCode,
    moveFavorite,
    startEdit,
    cancelEdit,
    saveEdit,
    resetEdit,
    moveItem,
    toggleHidden,
    rowProps: dnd.rowProps,
    handleProps: dnd.handleProps,
  };

  const elements = {
    searchInputRef,
    favDrawerRef,
  };

  return {
    ...state,
    ...actions,
    ...elements,
  };
};
