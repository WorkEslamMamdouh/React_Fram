"use client";

// =====================================================================================
//  PermissionMatrix.tsx  -  جدول الصلاحيات (شاشات × صلاحيات) — مشترك للأدوار واستثناءات المستخدم
//  - الصفوف متجمعة بـ MODULE_MENU، والبحث بالاسم/الكود
//  - اختيار الكل للصف / للعمود (للصفوف الظاهرة) / للمجموعة
//  - الخانة بتتقفل لو Sys_Modules نفسها مابتسمحش بالصلاحية دي (الفيو بيتجاهلها)
//  - وضع "user": الصف اللي مش مستثنى بيظهر بقيم الدور (inherited)، وأي تعديل بيعمل استثناء
// =====================================================================================

import React, { useMemo } from "react";
import { MatrixModule, PermKey, PermMap, ALL_PERM_KEYS } from "../Sys_UsersAdmin/AdminApi";
import { Check, Badge } from "../Sys_UsersAdmin/AdminUi";

const BASE_COLS: { key: PermKey; en: string; ar: string }[] = [
  { key: "EXECUTE", en: "Access", ar: "دخول" },
  { key: "CREATE", en: "Create", ar: "إضافة" },
  { key: "EDIT", en: "Edit", ar: "تعديل" },
  { key: "DELETE", en: "Delete", ar: "حذف" },
  { key: "PRINT", en: "Print", ar: "طباعة" },
  { key: "VIEW", en: "View", ar: "عرض" },
];

export interface MatrixProps {
  IsLangEN: boolean;
  mode: "role" | "user";
  modules: MatrixModule[];
  values: Record<string, PermMap>;
  dirty: Set<string>;
  overridden?: Set<string>;
  readOnly?: boolean;
  search: string;
  onCell: (code: string, key: PermKey, v: boolean) => void;
  onRow: (code: string, v: boolean) => void;
  onColumn: (key: PermKey, v: boolean, codes: string[]) => void;
  onGroup: (codes: string[], v: boolean) => void;
  onRemoveOverride?: (code: string) => void;
}

interface Group { id: string; title: string; header: MatrixModule | null; items: MatrixModule[] }

export default function PermissionMatrix(p: MatrixProps) {
  const t = (en: string, ar: string) => (p.IsLangEN ? en : ar);
  const nameOf = (m: MatrixModule) => (p.IsLangEN ? m.descE || m.descA || m.code : m.descA || m.descE || m.code);

  // ---------- التجميع + البحث ----------
  const groups = useMemo<Group[]>(() => {
    const q = p.search.trim().toLowerCase();
    const headers = new Map<string, MatrixModule>();
    p.modules.filter((m) => m.type === "M").forEach((m) => headers.set(m.code.toLowerCase(), m));

    const byGroup = new Map<string, Group>();
    const ensure = (id: string): Group => {
      let g = byGroup.get(id);
      if (!g) {
        const h = id ? headers.get(id.toLowerCase()) || null : null;
        g = { id, title: h ? nameOf(h) : id || t("Top level", "المستوى الأول"), header: h, items: [] };
        byGroup.set(id, g);
      }
      return g;
    };

    p.modules.filter((m) => m.type !== "M").forEach((m) => {
      const gid = (m.menu || "").trim();
      ensure(headers.has(gid.toLowerCase()) ? headers.get(gid.toLowerCase())!.code : gid).items.push(m);
    });
    // المجموعات اللي ملهاش عناصر بتظهر كمان (لازم تتفتح قايمتها)
    headers.forEach((h) => ensure(h.code));

    const match = (m: MatrixModule) =>
      !q || m.code.toLowerCase().includes(q) || m.descA.toLowerCase().includes(q) || m.descE.toLowerCase().includes(q);

    return Array.from(byGroup.values())
      .map((g) => {
        const groupMatches = g.header ? match(g.header) || g.title.toLowerCase().includes(q) : false;
        const items = (groupMatches || !q ? g.items : g.items.filter(match)).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.code.localeCompare(b.code));
        return { ...g, items };
      })
      .filter((g) => !q || g.items.length > 0 || (g.header && match(g.header)))
      .sort((a, b) => (a.header?.sort ?? 999999) - (b.header?.sort ?? 999999) || a.title.localeCompare(b.title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.modules, p.search, p.IsLangEN]);

  const visibleModules = useMemo(() => groups.flatMap((g) => (g.header ? [g.header, ...g.items] : g.items)), [groups]);

  // ---------- الأعمدة ----------
  const columns = useMemo(() => {
    const cols: { key: PermKey; label: string; tip: string }[] = BASE_COLS.map((c) => ({ key: c.key, label: p.IsLangEN ? c.en : c.ar, tip: "" }));
    for (let i = 1; i <= 9; i++) {
      const key = ("CUSTOM" + i) as PermKey;
      const used = p.modules.filter((m) => m.allow[key]);
      if (used.length === 0) continue;
      const descs = Array.from(new Set(used.map((m) => (m.desc[key] || "").trim()).filter(Boolean)));
      cols.push({ key, label: descs.length === 1 ? descs[0] : (p.IsLangEN ? "Custom " : "خاص ") + i, tip: descs.join(" / ") });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.modules, p.IsLangEN]);

  const cellVal = (code: string, key: PermKey) => !!p.values[code]?.[key];
  const editable = (m: MatrixModule, key: PermKey) => !p.readOnly && m.allow[key];

  const colState = (key: PermKey) => {
    const cells = visibleModules.filter((m) => editable(m, key));
    const on = cells.filter((m) => cellVal(m.code, key)).length;
    return { codes: cells.map((m) => m.code), all: cells.length > 0 && on === cells.length, some: on > 0 && on < cells.length, none: cells.length === 0 };
  };
  const rowState = (m: MatrixModule) => {
    const keys = columns.map((c) => c.key).filter((k) => editable(m, k));
    const on = keys.filter((k) => cellVal(m.code, k)).length;
    return { all: keys.length > 0 && on === keys.length, some: on > 0 && on < keys.length, none: keys.length === 0 };
  };

  const renderRow = (m: MatrixModule, isHeader: boolean) => {
    const rs = rowState(m);
    const isOv = p.mode === "user" ? p.overridden?.has(m.code) : false;
    const inheritedLook = p.mode === "user" && !isOv;
    return (
      <tr key={m.code} className={`border-t border-erp-border ${isHeader ? "bg-erp-surface-2" : "hover:bg-erp-accent-soft"} ${p.dirty.has(m.code) ? "outline outline-1 -outline-offset-1 outline-erp-warning" : ""}`}>
        <td className={`sticky start-0 z-10 min-w-[220px] max-w-[320px] px-3 py-2 ${isHeader ? "bg-erp-surface-2" : "bg-erp-surface"}`}>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className={`truncate text-[13px] ${isHeader ? "font-semibold" : "font-medium"} text-erp-text`}>{nameOf(m)}</div>
              <div className="truncate text-[11px] text-erp-text-muted" dir="ltr">{m.code}</div>
            </div>
            {p.mode === "user" && (
              isOv ? (
                <div className="flex items-center gap-1">
                  <Badge tone="warning">{t("Override", "استثناء")}</Badge>
                  {!p.readOnly && (
                    <button type="button" className="rounded-md p-1 text-[11px] text-erp-danger-text hover:bg-erp-danger-bg" title={t("Remove override (back to role)", "إلغاء الاستثناء (الرجوع للدور)")}
                      onClick={() => p.onRemoveOverride?.(m.code)}>
                      <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ) : <Badge tone="muted">{t("From role", "من الدور")}</Badge>
            )}
          </div>
        </td>
        <td className="px-2 py-2 text-center">
          <Check checked={rs.all} indeterminate={rs.some} disabled={rs.none} label={t("Select row", "اختيار الصف")} title={t("Select all for this screen", "اختيار الكل للشاشة")} onChange={(v) => p.onRow(m.code, v)} />
        </td>
        {columns.map((c) => {
          const allowed = m.allow[c.key];
          const tip = c.key.startsWith("CUSTOM") ? m.desc[c.key] || c.tip : "";
          return (
            <td key={c.key} className={`px-2 py-2 text-center ${inheritedLook ? "opacity-60" : ""}`} title={!allowed ? t("Not allowed by the screen itself", "الشاشة نفسها مابتسمحش بالصلاحية دي") : tip}>
              <Check checked={allowed && cellVal(m.code, c.key)} disabled={!editable(m, c.key)} label={`${nameOf(m)} - ${c.label}`} onChange={(v) => p.onCell(m.code, c.key, v)} />
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-erp-border bg-erp-surface">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-erp-surface-2 text-erp-text-muted">
            <th className="sticky start-0 z-20 bg-erp-surface-2 px-3 py-2 text-start text-[11px] font-semibold tracking-wide">{t("Screen", "الشاشة")}</th>
            <th className="px-2 py-2 text-center text-[11px] font-semibold">{t("All", "الكل")}</th>
            {columns.map((c) => {
              const s = colState(c.key);
              return (
                <th key={c.key} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide" title={c.tip}>
                  <div className="flex flex-col items-center gap-1">
                    <span>{c.label}</span>
                    <Check checked={s.all} indeterminate={s.some} disabled={s.none || p.readOnly} label={t("Select column", "اختيار العمود") + " " + c.label}
                      title={t("Select all visible", "اختيار كل الظاهر")} onChange={(v) => p.onColumn(c.key, v, s.codes)} />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const codes = (g.header ? [g.header, ...g.items] : g.items).map((m) => m.code);
            const gCells = (g.header ? [g.header, ...g.items] : g.items).flatMap((m) => columns.map((c) => ({ m, k: c.key }))).filter(({ m, k }) => editable(m, k));
            const gOn = gCells.filter(({ m, k }) => cellVal(m.code, k)).length;
            return (
              <React.Fragment key={g.id || "__root"}>
                <tr className="border-t border-erp-border-strong bg-erp-surface-3">
                  <td colSpan={columns.length + 2} className="px-3 py-1.5">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-erp-text">
                      <Check checked={gCells.length > 0 && gOn === gCells.length} indeterminate={gOn > 0 && gOn < gCells.length} disabled={gCells.length === 0}
                        label={t("Select group", "اختيار المجموعة")} title={t("Select the whole group", "اختيار المجموعة كلها")} onChange={(v) => p.onGroup(codes, v)} />
                      <i className="fa-solid fa-folder-open text-erp-text-muted" aria-hidden="true" />
                      <span>{g.title}</span>
                      <span className="text-[11px] font-normal text-erp-text-muted">({g.items.length} {t("screens", "شاشة")})</span>
                    </div>
                  </td>
                </tr>
                {g.header && renderRow(g.header, true)}
                {g.items.map((m) => renderRow(m, false))}
              </React.Fragment>
            );
          })}
          {groups.length === 0 && (
            <tr><td colSpan={columns.length + 2} className="px-3 py-8 text-center text-erp-text-muted">{t("No screens match the search", "مفيش شاشات مطابقة للبحث")}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export { ALL_PERM_KEYS };
