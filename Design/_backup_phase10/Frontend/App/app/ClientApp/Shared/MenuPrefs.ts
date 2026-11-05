// Shared/MenuPrefs.ts
// Phase 3: per-user menu order (Sys_UserMenu), favorites (Sys_Favorites), recent screens (localStorage).
// Every DB call here is wrapped so that a missing table / failed query NEVER breaks the menu.
import { useEffect, useState } from "react";
import { SQL } from "./CallDataBase";
import type { MenuItemType, MenuItemWithState } from "./Entities";

// =======================
// Types
// =======================
export type UserMenuRow = {
  Id?: number;
  UserID: number;
  CompCode: number;
  MODULE_CODE: string;
  ParentCode: string | null;
  SortOrder: number;
  IsHidden: boolean;
};

export type FavRow = {
  FavoriteId: number;
  MODULE_CODE: string;
  SortOrder: number | null;
  CreatedAt: string;
};

export type FavDisplay = {
  FavoriteId: number;
  code: string;
  title: string;
  parentTitle: string;
  iconPath: string;
  path: string;
};

const noop = () => { };
const isObj = (x: any) => !!x && typeof x === "object";
const normParent = (p: any): string | null => {
  const s = (p ?? "").toString().trim();
  return s === "" ? null : s;
};
const toInt = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

// =======================
// Menu items from privileges (shared by SideMenu + Navbar)
// =======================
const DEFAULT_SCREEN_ICON =
  "M1.5 7.125c0-1.036.84-1.875 1.875-1.875h6c1.036 0 1.875.84 1.875 1.875v3.75c0 1.036-.84 1.875-1.875 1.875h-6A1.875 1.875 0 0 1 1.5 10.875v-3.75Zm12 1.5c0-1.036.84-1.875 1.875-1.875h5.25c1.035 0 1.875.84 1.875 1.875v8.25c0 1.035-.84 1.875-1.875 1.875h-5.25a1.875 1.875 0 0 1-1.875-1.875v-8.25ZM3 16.125c0-1.036.84-1.875 1.875-1.875h5.25c1.036 0 1.875.84 1.875 1.875v2.25c0 1.035-.84 1.875-1.875 1.875h-5.25A1.875 1.875 0 0 1 3 18.375v-2.25Z";
const DEFAULT_GROUP_ICON =
  "M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z";

/** Same rules as the old SideMenu: IS_Show = 1 and EXECUTE = true. Duplicated module rows are collapsed (first wins). */
export function buildMenuItems(privileges: any[], openPage: (code: string) => void): MenuItemType[] {
  const out: MenuItemType[] = [];
  const seen = new Set<string>();
  const list = (privileges ?? []).filter((x: any) => x && x.IS_Show == 1 && x.EXECUTE == true);
  for (const p of list) {
    const code = (p.MODULE_CODE ?? "").toString();
    if (code === "" || seen.has(code)) continue;
    seen.add(code);
    const it: MenuItemType = {
      MODULE_CODE: code,
      PARENT_MODULE_CODE: normParent(p.MODULE_MENU),
      TITLE_EN: p.MODULE_DESCE,
      TITLE_AR: p.MODULE_DESCA,
      order: p.MODULE_SORT,
      MODULE_TYPE: (p.MODULE_TYPE ?? "").toString().trim().toLowerCase() === "m" ? "menu" : "screen",
      ICON_PATH: "",
      PATH: code,
    };
    const color = (p.Icon_Color ?? "").toString().trim();
    if (it.MODULE_TYPE === "screen") {
      it.onClick = () => openPage(code);
      it.COLOR = "text-" + (color === "" ? "yellow" : color) + "-500";
    } else {
      it.COLOR = "text-" + (color === "" ? "blue" : color) + "-500";
    }
    it.ICON_PATH = (p.Url_Image ?? "").toString().trim() === ""
      ? (it.MODULE_TYPE === "screen" ? DEFAULT_SCREEN_ICON : DEFAULT_GROUP_ICON)
      : p.Url_Image;
    out.push(it);
  }
  return out;
}

/** Privilege items -> tree (sorted by MODULE_SORT). Pure version of the old buildMenuTree. */
export function buildTree(items: MenuItemType[]): MenuItemWithState[] {
  const sorted = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
  const map = new Map<string, MenuItemWithState>();
  const roots: MenuItemWithState[] = [];
  sorted.forEach((it) => map.set(it.MODULE_CODE, { ...it, children: [], isOpen: false, level: 0 }));
  sorted.forEach((it) => {
    const node = map.get(it.MODULE_CODE);
    if (!node) return;
    if (it.PARENT_MODULE_CODE && map.has(it.PARENT_MODULE_CODE)) {
      const parent = map.get(it.PARENT_MODULE_CODE)!;
      parent.children!.push(node);
      node.level = (parent.level || 0) + 1;
    } else if (!it.PARENT_MODULE_CODE) {
      roots.push(node);
    }
  });
  return roots;
}

// =======================
// Per-user order: pure helpers
// =======================
/** Apply saved rows on top of the default tree. Saved first (by SortOrder), unsaved keep default order after them. */
export function applyUserMenu(tree: MenuItemWithState[], rows: UserMenuRow[]): { tree: MenuItemWithState[]; hidden: Set<string> } {
  const map = new Map<string, UserMenuRow>();
  rows.forEach((r) => map.set(r.MODULE_CODE, r));
  const hidden = new Set<string>();
  const level = (nodes: MenuItemWithState[], parent: string | null): MenuItemWithState[] => {
    const dec = nodes.map((n, i) => {
      const r = map.get(n.MODULE_CODE);
      return { n, i, r: r && normParent(r.ParentCode) === parent ? r : undefined };
    });
    dec.sort((a, b) => (a.r && b.r) ? (a.r.SortOrder - b.r.SortOrder || a.i - b.i) : a.r ? -1 : b.r ? 1 : a.i - b.i);
    return dec.map((d) => {
      if (d.r && d.r.IsHidden) hidden.add(d.n.MODULE_CODE);
      return { ...d.n, children: d.n.children ? level(d.n.children, d.n.MODULE_CODE) : d.n.children };
    });
  };
  return { tree: level(tree, null), hidden };
}

/** Remove hidden nodes (and groups that became empty because all their children are hidden). */
export function removeHidden(tree: MenuItemWithState[], hidden: Set<string>): MenuItemWithState[] {
  if (hidden.size === 0) return tree;
  const out: MenuItemWithState[] = [];
  tree.forEach((n) => {
    if (hidden.has(n.MODULE_CODE)) return;
    if (n.children && n.children.length > 0) {
      const kids = removeHidden(n.children, hidden);
      if (kids.length === 0) return;
      out.push({ ...n, children: kids });
    } else {
      out.push(n);
    }
  });
  return out;
}

function mapSiblings(nodes: MenuItemWithState[], code: string, fn: (s: MenuItemWithState[]) => MenuItemWithState[]): MenuItemWithState[] | null {
  if (nodes.some((n) => n.MODULE_CODE === code)) return fn(nodes);
  for (let i = 0; i < nodes.length; i++) {
    const kids = nodes[i].children;
    if (kids && kids.length > 0) {
      const r = mapSiblings(kids, code, fn);
      if (r) {
        const copy = [...nodes];
        copy[i] = { ...nodes[i], children: r };
        return copy;
      }
    }
  }
  return null;
}

export function moveSibling(tree: MenuItemWithState[], code: string, delta: number): MenuItemWithState[] {
  const r = mapSiblings(tree, code, (sib) => {
    const i = sib.findIndex((n) => n.MODULE_CODE === code);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= sib.length) return sib;
    const copy = [...sib];
    const [it] = copy.splice(i, 1);
    copy.splice(j, 0, it);
    return copy;
  });
  return r ?? tree;
}

/** Drag `dragCode` onto `targetCode` (same level only): it takes the target's slot. */
export function moveBefore(tree: MenuItemWithState[], dragCode: string, targetCode: string): MenuItemWithState[] {
  if (dragCode === targetCode) return tree;
  const r = mapSiblings(tree, dragCode, (sib) => {
    const from = sib.findIndex((n) => n.MODULE_CODE === dragCode);
    const to = sib.findIndex((n) => n.MODULE_CODE === targetCode);
    if (from < 0 || to < 0) return sib;
    const copy = [...sib];
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    return copy;
  });
  return r ?? tree;
}

export function flattenToRows(tree: MenuItemWithState[], hidden: Set<string>, userId: number, compCode: number): UserMenuRow[] {
  const rows: UserMenuRow[] = [];
  const walk = (nodes: MenuItemWithState[], parent: string | null) => {
    nodes.forEach((n, i) => {
      rows.push({
        UserID: userId,
        CompCode: compCode,
        MODULE_CODE: n.MODULE_CODE,
        ParentCode: parent,
        SortOrder: i + 1,
        IsHidden: hidden.has(n.MODULE_CODE),
      });
      if (n.children && n.children.length > 0) walk(n.children, n.MODULE_CODE);
    });
  };
  walk(tree, null);
  return rows;
}

// =======================
// Sys_UserMenu (DB)
// =======================
/** Returns null when the table is missing / the query failed (menu then uses the default order). */
export async function loadUserMenu(userId: number, compCode: number): Promise<UserMenuRow[] | null> {
  try {
    if (!(userId > 0)) return null;
    const res = await SQL.Select("Sys_UserMenu", `UserID = ${toInt(userId)} AND CompCode = ${toInt(compCode)}`, null, noop, noop, 0, "1", "ASC", 0);
    const data = (res?.data ?? []) as any[];
    // a failed query comes back as garbage (error text), so only accept real rows
    const rows = data.filter((r) => isObj(r) && typeof r.MODULE_CODE === "string");
    if (data.length > 0 && rows.length === 0) return null;
    return rows.map((r) => ({
      Id: r.Id,
      UserID: toInt(r.UserID),
      CompCode: toInt(r.CompCode),
      MODULE_CODE: r.MODULE_CODE,
      ParentCode: normParent(r.ParentCode),
      SortOrder: toInt(r.SortOrder),
      IsHidden: r.IsHidden === true || r.IsHidden === 1 || r.IsHidden === "1",
    }));
  } catch {
    return null;
  }
}

async function deleteUserMenuRows(userId: number, compCode: number): Promise<boolean> {
  try {
    const res = await SQL.Select("Sys_UserMenu", `UserID = ${toInt(userId)} AND CompCode = ${toInt(compCode)}`, null, noop, noop, 0, "1", "ASC", 0);
    const ids = ((res?.data ?? []) as any[]).filter((r) => isObj(r) && r.Id != null).map((r) => Number(r.Id));
    if (ids.length === 0) return true;
    const del = await SQL.Delete("Sys_UserMenu", "Id", ids, noop, noop);
    return !!del?.IsSuccess;
  } catch {
    return false;
  }
}

/** Replace this user's rows (delete then insert). */
export async function saveUserMenu(userId: number, compCode: number, rows: UserMenuRow[]): Promise<boolean> {
  try {
    if (!(userId > 0)) return false;
    if (!(await deleteUserMenuRows(userId, compCode))) return false;
    const chunk = 8;
    for (let i = 0; i < rows.length; i += chunk) {
      const part = rows.slice(i, i + chunk);
      const results = await Promise.all(part.map((r) =>
        SQL.Insert("Sys_UserMenu", {
          UserID: toInt(r.UserID),
          CompCode: toInt(r.CompCode),
          MODULE_CODE: r.MODULE_CODE,
          ParentCode: r.ParentCode,
          SortOrder: r.SortOrder,
          IsHidden: r.IsHidden ? 1 : 0,
        }, noop, noop).catch(() => null)
      ));
      if (results.some((x: any) => !x || !x.IsSuccess)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function resetUserMenu(userId: number, compCode: number): Promise<boolean> {
  if (!(userId > 0)) return false;
  return deleteUserMenuRows(userId, compCode);
}

// =======================
// Favorites store (shared by SideMenu + Navbar)
// =======================
type FavState = { userId: number; rows: FavRow[] };
let favState: FavState = { userId: -1, rows: [] };
let sortSupported: boolean | null = null; // Sys_Favorites.SortOrder column exists?
let loadingPromise: Promise<void> | null = null;
let loadingFor = -1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => { try { l(); } catch { /* ignore */ } });

const sortFavs = (rows: FavRow[]) =>
  [...rows].sort((a, b) => {
    const as = a.SortOrder ?? Number.MAX_SAFE_INTEGER;
    const bs = b.SortOrder ?? Number.MAX_SAFE_INTEGER;
    if (as !== bs) return as - bs;
    const ac = a.CreatedAt || "";
    const bc = b.CreatedAt || "";
    if (ac !== bc) return ac < bc ? -1 : 1;
    return a.FavoriteId - b.FavoriteId;
  });

export function loadFavorites(userId: number, force = false): Promise<void> {
  const uid = toInt(userId);
  if (!(uid > 0)) return Promise.resolve();
  if (!force && favState.userId === uid) return Promise.resolve();
  if (loadingPromise && loadingFor === uid && !force) return loadingPromise;
  loadingFor = uid;
  const p = (async () => {
    try {
      const res = await SQL.Select("Sys_Favorites", `UserId = ${uid}`, null, noop, noop, 0, "1", "ASC", 0);
      const data = (res?.data ?? []) as any[];
      const good = data.filter((r) => isObj(r) && typeof r.MODULE_CODE === "string" && r.FavoriteId != null);
      if (data.length > 0 && good.length === 0) throw new Error("bad rows");
      if (good.length > 0) sortSupported = "SortOrder" in good[0] ? (sortSupported ?? true) : false;
      favState = {
        userId: uid,
        rows: sortFavs(good.map((r) => ({
          FavoriteId: Number(r.FavoriteId),
          MODULE_CODE: r.MODULE_CODE,
          SortOrder: r.SortOrder == null ? null : toInt(r.SortOrder),
          CreatedAt: r.CreatedAt ? String(r.CreatedAt) : "",
        }))),
      };
    } catch {
      favState = { userId: uid, rows: [] };
    }
    emit();
  })().finally(() => { if (loadingFor === uid) loadingPromise = null; });
  loadingPromise = p;
  return p;
}

export function useFavoriteRows(userId: number): FavRow[] {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    void loadFavorites(userId);
    return () => { listeners.delete(l); };
  }, [userId]);
  return favState.userId === toInt(userId) ? favState.rows : [];
}

const nowIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** Add/remove a favorite. Optimistic; reloads from DB afterwards; silent on failure. */
export async function toggleFavorite(
  userId: number, compCode: number, branchCode: number,
  code: string, title: string
): Promise<void> {
  const uid = toInt(userId);
  if (!(uid > 0) || !code || code.length > 50) return; // Sys_Favorites.MODULE_CODE is nvarchar(50)
  const existing = favState.userId === uid ? favState.rows.find((r) => r.MODULE_CODE === code) : undefined;
  try {
    if (existing) {
      favState = { userId: uid, rows: favState.rows.filter((r) => r.MODULE_CODE !== code) };
      emit();
      if (existing.FavoriteId > 0) await SQL.Delete("Sys_Favorites", "FavoriteId", [existing.FavoriteId], noop, noop);
    } else {
      const base = favState.userId === uid ? favState.rows : [];
      const maxSort = base.reduce((m, r) => Math.max(m, r.SortOrder ?? 0), base.length);
      favState = { userId: uid, rows: [...base, { FavoriteId: -Date.now(), MODULE_CODE: code, SortOrder: maxSort + 1, CreatedAt: nowIso() }] };
      emit();
      const payload: any = {
        UserId: uid,
        MODULE_CODE: code,
        PageName: (title ?? "").slice(0, 200),
        PageUrl: `/ClientApp/${code}`.slice(0, 300),
        Icon: "",
        CreatedAt: nowIso(),
        CompCode: toInt(compCode),
        BranchCode: toInt(branchCode),
      };
      let ok = false;
      if (sortSupported !== false) {
        const r: any = await SQL.Insert("Sys_Favorites", { ...payload, SortOrder: maxSort + 1 }, noop, noop).catch(() => null);
        ok = !!r?.IsSuccess;
        if (!ok) sortSupported = false; // column probably missing (script not run yet) - retry without it
      }
      if (!ok) {
        const r: any = await SQL.Insert("Sys_Favorites", payload, noop, noop).catch(() => null);
        ok = !!r?.IsSuccess;
      }
    }
  } catch { /* silent */ }
  await loadFavorites(uid, true);
}

/** Persist a new favorites order (array of MODULE_CODEs). */
export async function reorderFavorites(userId: number, orderedCodes: string[]): Promise<void> {
  const uid = toInt(userId);
  if (!(uid > 0) || favState.userId !== uid) return;
  const byCode = new Map(favState.rows.map((r) => [r.MODULE_CODE, r]));
  const next: FavRow[] = [];
  orderedCodes.forEach((c, i) => {
    const r = byCode.get(c);
    if (r) next.push({ ...r, SortOrder: i + 1 });
  });
  favState.rows.forEach((r) => { if (!orderedCodes.includes(r.MODULE_CODE)) next.push(r); });
  favState = { userId: uid, rows: next };
  emit();
  if (sortSupported === false) return;
  try {
    const results = await Promise.all(next.filter((r) => r.FavoriteId > 0).map((r) =>
      SQL.Update("Sys_Favorites", "FavoriteId", { FavoriteId: r.FavoriteId, SortOrder: r.SortOrder }, noop, noop).catch(() => null)
    ));
    if (results.some((x: any) => !x || !x.IsSuccess)) sortSupported = false;
  } catch { /* silent: order stays for this session only */ }
}

/** Resolve favorite rows to displayable permitted screens (drops modules the user lost access to). */
export function resolveFavorites(items: MenuItemType[], rows: FavRow[], isEN: boolean): FavDisplay[] {
  const byCode = new Map(items.map((i) => [i.MODULE_CODE, i]));
  const out: FavDisplay[] = [];
  rows.forEach((r) => {
    const it = byCode.get(r.MODULE_CODE);
    if (!it || it.MODULE_TYPE !== "screen") return;
    const parent = it.PARENT_MODULE_CODE ? byCode.get(it.PARENT_MODULE_CODE) : undefined;
    out.push({
      FavoriteId: r.FavoriteId,
      code: it.MODULE_CODE,
      title: (isEN ? it.TITLE_EN : it.TITLE_AR) || it.TITLE_EN || it.TITLE_AR || it.MODULE_CODE,
      parentTitle: parent ? ((isEN ? parent.TITLE_EN : parent.TITLE_AR) || "") : "",
      iconPath: it.ICON_PATH,
      path: `/ClientApp/${it.MODULE_CODE}`,
    });
  });
  return out;
}

// =======================
// Recently opened (localStorage, last 8 per user + company)
// =======================
const RECENT_MAX = 8;
const recentKey = (userId: number, compCode: number) => `erp.menu.recent.v1:${userId}:${compCode}`;

export function getRecent(userId: number, compCode: number): string[] {
  try {
    const raw = window.localStorage.getItem(recentKey(userId, compCode));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(userId: number, compCode: number, code: string) {
  try {
    if (!code) return;
    const next = [code, ...getRecent(userId, compCode).filter((c) => c !== code)].slice(0, RECENT_MAX);
    window.localStorage.setItem(recentKey(userId, compCode), JSON.stringify(next));
  } catch { /* ignore */ }
}
