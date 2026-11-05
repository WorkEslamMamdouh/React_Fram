"use client"

import _Styles from "./SideMenu.module.css";
import { SideMenu } from "./SideMenu";
import { useTranslate } from "../../../../ClientApp/Shared/Resources";
import { useSys } from "../../../Shared/SystemUsing";
import { MenuItemWithState } from "@/app/ClientApp/Shared/Entities";



export default function InitalizeComponent() {
const Lang = useTranslate();
const  IsLangEN  = useSys((s)=> s.IsLangEN);



const stylesheet = IsLangEN ? (
<link id="lang-style_SideMenu" rel="stylesheet" href="/StyleDesign/Layouts/SideMenuEN.css" />
) :  (
<link id="lang-style_SideMenu" rel="stylesheet" href="/StyleDesign/Layouts/SideMenuAR.css" />
) ;



const sidemenu = SideMenu();
return <SideMenuPage {...sidemenu} Lang={Lang} stylesheet ={stylesheet}/>;
}
type _ReturnType = ReturnType<typeof SideMenu>;
type Props = _ReturnType & {
Lang: ReturnType<typeof useTranslate>;
stylesheet : any
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`shrink-0 size-4 text-erp-text-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

const ExternalIcon = () => (
  <svg className="size-3 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const STAR_PATH = "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z";

const StarIcon = ({ filled, className = "size-4" }: { filled: boolean; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d={STAR_PATH} />
  </svg>
);

const GripIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);

const ArrowIcon = ({ up }: { up: boolean }) => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={up ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
  </svg>
);

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {off ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </>
    )}
  </svg>
);

const PencilIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// زرار أيقونة صغير: 44px على الموبايل، أصغر على الديسكتوب
const iconBtn =
  "erp-focus shrink-0 size-11 md:size-7 flex items-center justify-center rounded-md text-erp-text-subtle hover:bg-erp-surface-3 hover:text-erp-text transition-colors";

function SideMenuPage(p: Props) {

  const isActive = (item: MenuItemWithState) => !!p.activeModule && item.MODULE_CODE === p.activeModule;
  const L = (ar: string, en: string) => (p.isRTL ? ar : en);

  const Icon = ({ item, size = "size-5" }: { item: MenuItemWithState; size?: string }) => (
    <svg className={`shrink-0 ${size}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.ICON_PATH} />
    </svg>
  );

  const dndState = (code: string) =>
    p.dragId === code ? "opacity-40" : p.dragId && p.overId === code ? "ring-2 ring-erp-accent bg-erp-accent-soft" : "";

  // أزرار الترتيب/الإخفاء في وضع التعديل
  const editControls = (item: MenuItemWithState) => {
    const hidden = p.hiddenSet.has(item.MODULE_CODE);
    return (
      <div className="flex items-center ms-auto shrink-0">
        <button type="button" className={iconBtn} onClick={() => p.moveItem(item.MODULE_CODE, -1)} aria-label={L("نقل لفوق", "Move up")} title={L("نقل لفوق", "Move up")}>
          <ArrowIcon up />
        </button>
        <button type="button" className={iconBtn} onClick={() => p.moveItem(item.MODULE_CODE, 1)} aria-label={L("نقل لتحت", "Move down")} title={L("نقل لتحت", "Move down")}>
          <ArrowIcon up={false} />
        </button>
        <button
          type="button"
          className={`${iconBtn} ${hidden ? "text-erp-danger" : ""}`}
          onClick={() => p.toggleHidden(item.MODULE_CODE)}
          aria-pressed={hidden}
          aria-label={hidden ? L("إظهار", "Show") : L("إخفاء", "Hide")}
          title={hidden ? L("إظهار", "Show") : L("إخفاء", "Hide")}
        >
          <EyeIcon off={hidden} />
        </button>
      </div>
    );
  };

  const dragHandle = (code: string, group: string) => (
    <button
      type="button"
      {...p.handleProps(code, group)}
      className={`${iconBtn} cursor-grab active:cursor-grabbing`}
      aria-label={L("اسحب لإعادة الترتيب", "Drag to reorder")}
      title={L("اسحب لإعادة الترتيب", "Drag to reorder")}
    >
      <GripIcon />
    </button>
  );

  // عنصر شاشة (رابط) — expanded = شكل كامل، غير كده أيقونة بس
  const renderScreenItem = (item: MenuItemWithState, expanded: boolean, inFavorites: boolean = false) => {
    const code = item.MODULE_CODE;
    const title = p.getTitle(item);
    const active = isActive(item);
    const isFav = p.isFavorite(code);
    const group = inFavorites ? "fav" : (item.PARENT_MODULE_CODE ?? "root");

    // ---- وضع تعديل ترتيب القايمة ----
    if (expanded && p.editMode && !inFavorites) {
      const hidden = p.hiddenSet.has(code);
      return (
        <div
          key={code}
          {...p.rowProps(code, group)}
          className={`flex flex-wrap items-center gap-x-1 rounded-lg min-h-[44px] md:min-h-[36px] bg-erp-surface-2/50 ${dndState(code)} ${hidden ? "opacity-60" : ""}`}
        >
          {dragHandle(code, group)}
          <Icon item={item} size="size-4" />
          <span className={`flex-1 min-w-[6rem] truncate text-start text-[13px] text-erp-text ${hidden ? "line-through" : ""}`}>{title}</span>
          {editControls(item)}
        </div>
      );
    }

    const cls = `erp-focus group relative flex items-center gap-x-3 rounded-lg text-[13px] transition-colors duration-150 ${
      expanded ? `flex-1 min-w-0 min-h-[44px] md:min-h-[36px] ps-3 ${inFavorites && p.editMode ? "pe-2" : "pe-12 md:pe-16"}` : "size-10 justify-center"
    } ${
      active
        ? "bg-erp-accent-soft text-erp-accent font-semibold"
        : "text-erp-text-muted hover:bg-erp-surface-2 hover:text-erp-text"
    }`;

    const inner = (
      <>
        <Icon item={item} size={expanded ? "size-4" : "size-5"} />
        {expanded && <span className="flex-1 truncate text-start">{title}</span>}
      </>
    );

    const newTabBtn = expanded && item.PATH ? (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (item.PATH) p.safeOpenUrl(item.PATH, "_blank");
        }}
        className="hidden md:block absolute end-9 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-erp-surface-3"
        title={L("فتح في علامة تبويب جديدة", "Open in new tab")}
        aria-label={L("فتح في علامة تبويب جديدة", "Open in new tab")}
      >
        <ExternalIcon />
      </button>
    ) : null;

    const starBtn = expanded ? (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); p.toggleFavCode(code); }}
        className={`erp-focus absolute end-0 md:end-1 top-1/2 -translate-y-1/2 size-11 md:size-7 flex items-center justify-center rounded-md transition-opacity hover:bg-erp-surface-3 ${
          isFav
            ? "text-erp-warning opacity-100"
            : "text-erp-text-subtle opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        }`}
        aria-pressed={isFav}
        aria-label={isFav ? L("إزالة من المفضلة", "Remove from favorites") : L("إضافة للمفضلة", "Add to favorites")}
        title={isFav ? L("إزالة من المفضلة", "Remove from favorites") : L("إضافة للمفضلة", "Add to favorites")}
      >
        <StarIcon filled={isFav} />
      </button>
    ) : null;

    const link = item.onClick ? (
      <button
        onClick={() => { p.handleItemClick(item); p.closeDrawer(); }}
        className={`${cls} ${expanded ? "" : "w-full"}`}
        title={expanded ? undefined : title}
        aria-current={active ? "page" : undefined}
      >
        {inner}
      </button>
    ) : (
      <a href={item.PATH || "#"} draggable={false} className={cls} title={expanded ? undefined : title} aria-current={active ? "page" : undefined}>
        {inner}
      </a>
    );

    // ---- المفضلة: مقبض سحب + (أسهم في وضع التعديل) + نجمة ----
    if (inFavorites && expanded) {
      return (
        <div key={`fav-${code}`} {...p.rowProps(code, "fav")} className={`relative group flex items-center rounded-lg ${p.editMode ? "flex-wrap" : ""} ${dndState(code)}`}>
          {dragHandle(code, "fav")}
          <div className={`relative flex-1 flex items-center ${p.editMode ? "min-w-[6rem]" : "min-w-0"}`}>
            {link}
            {newTabBtn}
            {p.editMode ? null : starBtn}
          </div>
          {p.editMode && (
            <div className="flex items-center shrink-0">
              <button type="button" className={iconBtn} onClick={() => p.moveFavorite(code, -1)} aria-label={L("نقل لفوق", "Move up")}><ArrowIcon up /></button>
              <button type="button" className={iconBtn} onClick={() => p.moveFavorite(code, 1)} aria-label={L("نقل لتحت", "Move down")}><ArrowIcon up={false} /></button>
              <button type="button" className={`${iconBtn} text-erp-warning`} onClick={() => p.toggleFavCode(code)} aria-label={L("إزالة من المفضلة", "Remove from favorites")}><StarIcon filled /></button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={code} className="relative group flex items-center">
        {link}
        {newTabBtn}
        {starBtn}
      </div>
    );
  };

  const renderMenuItem = (item: MenuItemWithState, expanded: boolean) => {
    const hasChildren = item.children && item.children.length > 0;
    const isMenuType = item.MODULE_TYPE === "menu";
    if (!isMenuType) return renderScreenItem(item, expanded);

    const code = item.MODULE_CODE;
    const title = p.getTitle(item);
    // لو فيه فلتر نفتح كل المجموعات
    const isOpen = p.menuFilter.trim() !== "" || p.openMenus[code] || false;
    const hasActiveChild = !!item.children?.some((c) => isActive(c));
    const editing = expanded && p.editMode;
    const group = item.PARENT_MODULE_CODE ?? "root";
    const hidden = p.hiddenSet.has(code);

    return (
      <div key={code} className="mt-1 flex flex-col">
        {editing ? (
          <div
            {...p.rowProps(code, group)}
            className={`flex flex-wrap items-center gap-x-1 rounded-lg min-h-[44px] md:min-h-[36px] bg-erp-surface-2 ${dndState(code)} ${hidden ? "opacity-60" : ""}`}
          >
            {dragHandle(code, group)}
            <button
              type="button"
              onClick={() => p.toggleMenu(code)}
              className="erp-focus flex-1 min-w-[6rem] flex items-center gap-x-2 text-start min-h-[44px] md:min-h-0"
              aria-expanded={isOpen}
            >
              <Icon item={item} size="size-4" />
              <span className={`font-semibold text-[13px] truncate text-erp-text ${hidden ? "line-through" : ""}`}>{title}</span>
              {hasChildren && <ChevronIcon open={isOpen} />}
            </button>
            {editControls(item)}
          </div>
        ) : (
          <button
            onClick={() => expanded && p.toggleMenu(code)}
            className={`erp-focus w-full flex items-center justify-between rounded-lg transition-colors duration-150 ${
              expanded ? "min-h-[44px] md:min-h-[36px] px-3" : "size-10 mx-auto justify-center"
            } ${
              hasActiveChild && !isOpen ? "text-erp-accent" : "text-erp-text"
            } hover:bg-erp-surface-2`}
            title={!expanded ? title : undefined}
            aria-expanded={expanded ? isOpen : undefined}
          >
            <span className="flex items-center gap-x-3 min-w-0">
              <Icon item={item} />
              {expanded && <span className="font-semibold text-[13px] truncate">{title}</span>}
            </span>
            {expanded && hasChildren && <ChevronIcon open={isOpen} />}
          </button>
        )}

        {expanded && isOpen && hasChildren && (
          <div className={`mt-1 border-s border-erp-border space-y-0.5 ${editing ? "ms-2 ps-1" : "ms-4 ps-2"}`}>
            {item.children?.map((child) => renderMenuItem(child, true))}
          </div>
        )}

        {!expanded && hasChildren && (
          <div className="flex flex-col items-center gap-y-1 mt-1">
            {item.children?.map((child) => renderScreenItem(child, false))}
          </div>
        )}
      </div>
    );
  };

  const SearchIcon = (
    <svg className="shrink-0 size-4 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  const btnBase = "erp-focus inline-flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium min-h-[44px] md:min-h-[32px] px-3 transition-colors";

  // شريط تعديل الترتيب
  const renderEditBar = () => {
    if (!p.editMode) {
      return (
        <div className="px-3 pb-1 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={p.startEdit}
            className={`${btnBase} text-erp-text-muted hover:bg-erp-surface-2 hover:text-erp-text`}
            title={L("ترتيب القايمة", "Edit menu")}
          >
            <PencilIcon />
            {L("ترتيب القايمة", "Edit menu")}
          </button>
        </div>
      );
    }
    return (
      <div className="mx-3 mb-2 shrink-0 rounded-lg border border-erp-accent/40 bg-erp-accent-soft p-2">
        <div className="text-[12px] font-semibold text-erp-accent px-1">{L("ترتيب القايمة", "Edit menu")}</div>
        <p className="text-[11px] text-erp-text-muted px-1 mt-0.5">
          {L("اسحب المقبض أو استخدم الأسهم للترتيب، والعين للإخفاء.", "Drag the handle or use the arrows to reorder; use the eye to hide.")}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button type="button" disabled={p.isSavingMenu} onClick={p.saveEdit} className={`${btnBase} bg-erp-accent text-white hover:bg-erp-accent-hover disabled:opacity-60`}>
            {L("حفظ", "Save")}
          </button>
          <button type="button" disabled={p.isSavingMenu} onClick={p.cancelEdit} className={`${btnBase} bg-erp-surface text-erp-text border border-erp-border hover:bg-erp-surface-2`}>
            {L("إلغاء", "Cancel")}
          </button>
          <button
            type="button"
            disabled={p.isSavingMenu}
            onClick={p.resetEdit}
            className={`${btnBase} ${p.confirmReset ? "bg-erp-danger text-white" : "text-erp-danger hover:bg-erp-surface"}`}
          >
            {p.confirmReset ? L("تأكيد الإرجاع؟", "Confirm reset?") : L("رجّع الترتيب الأصلي", "Reset to default")}
          </button>
        </div>
      </div>
    );
  };

  // محتوى القايمة (بيتعمل مرتين: مرة للديسكتوب ومرة للدرج)
  const renderBody = (expanded: boolean, isDrawer: boolean) => {
    const tree = p.filterTree(p.menuTree, p.menuFilter);
    const showFavorites = expanded && p.favorites.length > 0 && p.menuFilter.trim() === "";
    return (
      <nav className="flex flex-col h-full min-h-0">
        {/* بحث في القوايم */}
        <div className="p-3 pb-2 shrink-0">
          {expanded ? (
            <label className="flex items-center gap-2 h-10 md:h-9 px-3 rounded-lg bg-erp-surface-2 border border-transparent focus-within:border-erp-accent focus-within:shadow-[0_0_0_3px_var(--erp-accent-soft)] transition">
              {SearchIcon}
              <input
                type="text"
                value={p.menuFilter}
                onChange={(e) => p.setMenuFilter(e.target.value)}
                placeholder={L("بحث في القوائم...", "Search menus...")}
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-erp-text placeholder:text-erp-text-subtle"
              />
            </label>
          ) : (
            <button
              onClick={p.openSearch}
              className="erp-focus size-10 mx-auto flex items-center justify-center rounded-lg bg-erp-surface-2 hover:bg-erp-surface-3"
              title={L("بحث", "Search")}
            >
              {SearchIcon}
            </button>
          )}
        </div>

        {expanded && renderEditBar()}

        <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll px-3 pb-3">
          {/* تلميح لما تفتح المفضلة من الموبايل والقايمة فاضية */}
          {isDrawer && p.favHint && (
            <div ref={p.favDrawerRef} className="mb-3 rounded-lg border border-erp-border bg-erp-surface-2 p-3 text-[12px] text-erp-text-muted">
              {L("اضغط على النجمة جنب أي شاشة عشان تضيفها هنا.", "Tap the star next to any screen to add it here.")}
            </div>
          )}

          {/* المفضلة — بتظهر بس لو فيه داتا */}
          {showFavorites && (
            <div className="mb-3" ref={isDrawer && !p.favHint ? p.favDrawerRef : undefined}>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.04em] text-erp-text-subtle">
                <StarIcon filled className="size-3.5 text-erp-warning" />
                {L("المفضلة", "Favorites")}
              </div>
              <div className="space-y-0.5">
                {p.favorites.map((f) => renderScreenItem(f, true, true))}
              </div>
              <div className="my-2 border-t border-erp-border" />
            </div>
          )}

          {tree.map((item) => renderMenuItem(item, expanded))}

          {expanded && p.menuFilter.trim() !== "" && tree.length === 0 && (
            <p className="text-center text-[13px] text-erp-text-subtle py-6">
              {L("لا توجد نتائج", "No results")}
            </p>
          )}
        </div>
      </nav>
    );
  };

  // شريط التنقل السفلي للموبايل
  const NavBtn = ({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium ${active ? "text-erp-accent" : "text-erp-text-muted"}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );

  // صف نتيجة في بحث Ctrl+K
  let flatIdx = -1;
  const renderSearchRow = (result: (typeof p.searchFlat)[number]) => {
    flatIdx++;
    const idx = flatIdx;
    const selected = idx === p.searchIndex;
    const fav = p.isFavorite(result.moduleCode);
    return (
      <div
        key={`${result.moduleCode}-${idx}`}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors min-h-[44px] ${selected ? "bg-erp-surface-2" : "hover:bg-erp-surface-2"}`}
        onClick={() => p.openSearchResult(result)}
      >
        <svg className="shrink-0 size-5 text-erp-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={result.icon} />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-erp-text truncate">{result.title}</div>
          {result.parentTitle && (
            <div className="text-xs text-erp-text-muted truncate">{result.parentTitle}</div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); p.toggleFavCode(result.moduleCode); }}
          className={`${iconBtn} ${fav ? "text-erp-warning" : ""}`}
          aria-pressed={fav}
          aria-label={fav ? L("إزالة من المفضلة", "Remove from favorites") : L("إضافة للمفضلة", "Add to favorites")}
          title={fav ? L("إزالة من المفضلة", "Remove from favorites") : L("إضافة للمفضلة", "Add to favorites")}
        >
          <StarIcon filled={fav} />
        </button>
        {result.path && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              p.safeOpenUrl(result.path, '_blank');
              p.closeSearch();
            }}
            className="p-1 hover:bg-erp-surface-3 rounded transition-colors"
            title={L("فتح في علامة تبويب جديدة", "Open in new tab")}
          >
            <ExternalIcon />
          </button>
        )}
      </div>
    );
  };

 return (
    <>
    {p.stylesheet}

      {/* Search Modal (Ctrl+K) */}
      {p.isSearchOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-erp-overlay backdrop-blur-[2px] flex items-start justify-center pt-[12vh] px-4"
          onClick={p.closeSearch}
        >
          <div
            className="w-full max-w-[600px] max-h-[70vh] overflow-hidden rounded-xl bg-erp-surface border border-erp-border shadow-erp-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-erp-border" dir={p.isRTL ? "rtl" : "ltr"}>
              <span className="absolute start-4 top-1/2 -translate-y-1/2">{SearchIcon}</span>
              <input
                ref={p.searchInputRef}
                type="text"
                placeholder={L("ابحث عن صفحات...", "Search pages...")}
                className="w-full h-14 ps-11 pe-12 bg-transparent outline-none text-[15px] text-erp-text placeholder:text-erp-text-subtle"
                value={p.searchTerm}
                onChange={(e) => p.handleSearch(e.target.value)}
                onKeyDown={p.handleSearchKey}
                autoFocus
              />
              <button
                onClick={p.closeSearch}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-erp-text-subtle hover:bg-erp-surface-2 hover:text-erp-text"
                aria-label="Close search"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {p.searchFlat.length > 0 ? (
                <>
                  {p.searchTerm.trim() !== "" && (
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-erp-text-subtle">
                      <span className="num">{p.searchFlat.length}</span> {L("نتيجة", "results found")}
                    </div>
                  )}
                  {p.searchSections.map((s) => (
                    <div key={s.key}>
                      {s.label && (
                        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[11px] font-semibold text-erp-text-subtle">
                          {s.key === "fav" && <StarIcon filled className="size-3.5 text-erp-warning" />}
                          {s.label}
                        </div>
                      )}
                      {s.items.map((r) => renderSearchRow(r))}
                    </div>
                  ))}
                </>
              ) : p.searchTerm.trim() !== "" ? (
                <div className="text-center py-8 text-erp-text-muted">
                  <svg className="size-12 mx-auto mb-3 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>{L("لا توجد نتائج مطابقة", "No matching results")}</p>
                  <p className="text-sm mt-1">{L("جرب كلمات بحث مختلفة", "Try different search terms")}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-erp-text-muted">
                  <svg className="size-12 mx-auto mb-3 text-erp-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>{L("ابحث عن الصفحات باستخدام Ctrl+K", "Search pages using Ctrl+K")}</p>
                  <p className="text-sm mt-2">{L("اكتب للبدء في البحث", "Type to start searching")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR (md+) : 260px أو 72px */}
      <aside
        id="hs-pro-sidebar"
        aria-label="Sidebar"
        className={`hidden lg:flex flex-col fixed top-16 bottom-0 start-0 z-40 bg-erp-surface border-e border-erp-border transition-[width] duration-300 ${
          p.IsOpenMenu ? "w-[260px]" : "w-[72px]"
        }`}
      >
        {renderBody(p.IsOpenMenu, false)}
        <div className="shrink-0 border-t border-erp-border px-4 py-2 text-[11px] text-erp-text-subtle truncate">
          {p.IsOpenMenu ? "React_Fram ERP" : "ERP"}
        </div>
      </aside>

      {/* DRAWER (<lg : موبايل + تابلت) */}
      {p.isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[90]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-erp-overlay" onClick={p.closeDrawer} />
          <aside
            className={`erp-drawer-in absolute top-0 bottom-0 start-0 w-[280px] max-w-[85vw] bg-erp-surface border-e border-erp-border shadow-erp-4 flex flex-col`}
            style={{ ["--erp-slide-from" as any]: p.isRTL ? "100%" : "-100%" }}
          >
            <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-erp-border">
              <span className="font-bold text-erp-text">{L("القائمة", "Menu")}</span>
              <button onClick={p.closeDrawer} className="size-11 flex items-center justify-center rounded-lg hover:bg-erp-surface-2 text-erp-text-muted" aria-label="Close menu">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0">{renderBody(true, true)}</div>
          </aside>
        </div>
      )}

      {/* MOBILE BOTTOM NAV (<md) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-[80] flex bg-erp-surface border-t border-erp-border pb-[env(safe-area-inset-bottom)]">
        <NavBtn label={L("الرئيسية", "Home")} onClick={p.openHome} active={p.activeModule === "Home"}>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </NavBtn>
        <NavBtn label={L("المفضلة", "Favorites")} onClick={p.openFavorites}>
          <StarIcon filled={false} className="size-5" />
        </NavBtn>
        <NavBtn label={L("بحث", "Search")} onClick={p.openSearch}>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </NavBtn>
        <NavBtn label={L("القائمة", "Menu")} onClick={() => p.setIsDrawerOpen(true)}>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </NavBtn>
      </div>
    </>
  );
 }
