"use client";

// خصائص العنصر المختار (Phase 5)
import React, { useEffect, useState } from "react";
import { useSys } from "../../../Shared/SystemUsing";
import { useScreenBuilder } from "../../store/useScreenBuilder";
import {
  ScreenConfigV5, CellV5, FieldConfigV4, FilterControlV5, ActionV5, ParamMapV5, RuleV5, RuleOp, ControlKind,
  FilterKind, FilterOperator, DropdownSourceV5, filterKindOfField,
} from "../../types/ScreenConfig";
import { DbMeta } from "../../utils/dbMeta";
import { findCell, removeCell, removeSection, setSpan, syncOrderFromLayout } from "../../utils/layoutOps";
import { validateCondition, distinctValues } from "../../utils/sqlApi";
import { FORM_CONTROLS, FILTER_CONTROLS, kindToInputType } from "./catalog";

const inp = "w-full h-8 rounded-md border border-erp-border-strong bg-erp-surface px-2 text-[12px] text-erp-text focus:outline-none focus:border-erp-accent";
const area = "w-full rounded-md border border-erp-border-strong bg-erp-surface px-2 py-1 text-[12px] text-erp-text focus:outline-none focus:border-erp-accent";
const SESSION_LIST = ["CompCode", "BranchCode", "UserID", "UserName", "FinYear", "Today"];
const ICON_COLORS = ["indigo", "blue", "emerald", "teal", "amber", "orange", "rose", "purple", "slate"];

function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-erp-text-muted mb-0.5">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-erp-text-subtle mt-0.5">{hint}</span>}
    </label>
  );
}
function Chk({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-erp-text cursor-pointer">
      <input type="checkbox" className="accent-[var(--erp-accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-erp-border px-3 py-3 space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-erp-text-subtle">{title}</div>
      {children}
    </div>
  );
}

type TFn = (en: string, ar: string) => string;
type Mut = (fn: (cfg: ScreenConfigV5) => ScreenConfigV5, select?: any) => void;

function ConditionBox({ db, t, table, value, onChange, extras }: { db: DbMeta; t: TFn; table: string; value: string; onChange: (v: string) => void; extras: { label: string; token: string }[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="space-y-1">
      <textarea className={area} rows={2} value={value} onChange={(e) => { onChange(e.target.value); setMsg(null); }} placeholder="IsActive = 1 AND CompCode = {session.CompCode}" dir="ltr" />
      <div className="flex flex-wrap gap-1">
        {extras.map((x) => (
          <button key={x.token} type="button" className="px-1.5 h-6 rounded border border-erp-border text-[10px] text-erp-text-muted hover:border-erp-accent hover:text-erp-accent" onClick={() => onChange((value ? value + " " : "") + x.token)}>{x.label}</button>
        ))}
      </div>
      <button type="button" disabled={!table || !db.connected} className="h-7 px-2 rounded-md border border-erp-border-strong text-[11px] hover:border-erp-accent disabled:opacity-40"
        onClick={async () => {
          const r = await validateCondition(db.connection, table, value).catch((e) => ({ success: false, error: String(e) }));
          setMsg({ ok: !!r.success, text: r.success ? t("Condition is valid", "الشرط سليم") : (r as any).error || "error" });
        }}>
        <i className="fa-solid fa-circle-check me-1" />{t("Validate (TOP 1)", "تحقق من الشرط (TOP 1)")}
      </button>
      {msg && <div className={`text-[11px] ${msg.ok ? "text-erp-success" : "text-erp-danger"}`}>{msg.text}</div>}
    </div>
  );
}

function ColumnSelect({ db, table, value, onChange, allowEmpty = true }: { db: DbMeta; table: string; value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  useEffect(() => { if (table) db.ensureColumns(table); }, [table]);
  const cols = (table && db.columns(table)) || [];
  return (
    <select className={inp} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">—</option>}
      {value && !cols.some((c) => c.name === value) && <option value={value}>{value}</option>}
      {cols.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.sqlType})</option>)}
    </select>
  );
}

function SourceEditor({ db, t, src, onChange, extras }: { db: DbMeta; t: TFn; src: DropdownSourceV5; onChange: (s: DropdownSourceV5) => void; extras: { label: string; token: string }[] }) {
  return (
    <div className="space-y-2">
      <F label={t("Table / view", "الجدول / الفيو")}>
        <input className={inp} list="sb-objs" value={src.table} onChange={(e) => onChange({ ...src, table: e.target.value })} dir="ltr" />
      </F>
      <div className="grid grid-cols-2 gap-2">
        <F label={t("Value column", "عمود القيمة")}><ColumnSelect db={db} table={src.table} value={src.valueField} onChange={(v) => onChange({ ...src, valueField: v })} /></F>
        <F label={t("Display (AR)", "العرض (عربي)")}><ColumnSelect db={db} table={src.table} value={src.displayField} onChange={(v) => onChange({ ...src, displayField: v })} /></F>
        <F label={t("Display (EN)", "العرض (إنجليزي)")}><ColumnSelect db={db} table={src.table} value={src.displayFieldEn} onChange={(v) => onChange({ ...src, displayFieldEn: v })} /></F>
        <F label={t("Order by", "ترتيب")}><ColumnSelect db={db} table={src.table} value={src.orderBy} onChange={(v) => onChange({ ...src, orderBy: v })} /></F>
      </div>
      <F label={t("Condition", "الشرط")}>
        <ConditionBox db={db} t={t} table={src.table} value={src.condition} onChange={(v) => onChange({ ...src, condition: v })} extras={extras} />
      </F>
    </div>
  );
}

function RuleBox({ t, rule, onChange, fieldNames }: { t: TFn; rule?: RuleV5; onChange: (r?: RuleV5) => void; fieldNames: string[] }) {
  const r = rule || { field: "", op: "=" as RuleOp, value: "" };
  const needsValue = r.op !== "empty" && r.op !== "notEmpty";
  return (
    <div className="grid grid-cols-3 gap-1">
      <select className={inp} value={r.field} onChange={(e) => onChange(e.target.value ? { ...r, field: e.target.value } : undefined)}>
        <option value="">—</option>{fieldNames.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <select className={inp} value={r.op} onChange={(e) => onChange({ ...r, op: e.target.value as RuleOp })}>
        {["=", "!=", ">", "<", ">=", "<=", "empty", "notEmpty"].map((o) => <option key={o} value={o}>{o === "empty" ? t("is empty", "فاضي") : o === "notEmpty" ? t("not empty", "مش فاضي") : o}</option>)}
      </select>
      <input className={inp} value={needsValue ? r.value : ""} disabled={!needsValue} onChange={(e) => onChange({ ...r, value: e.target.value })} placeholder={t("value", "القيمة")} />
    </div>
  );
}

function SampleValues({ db, t, table, column, onPick }: { db: DbMeta; t: TFn; table: string; column: string; onPick: (v: string) => void }) {
  const [vals, setVals] = useState<string[] | null>(null);
  if (!table || !column || !db.connected) return null;
  return (
    <div>
      <button type="button" className="text-[11px] text-erp-accent hover:underline" onClick={async () => { const r = await distinctValues(db.connection, table, column).catch(() => null); setVals(r?.values || []); }}>
        {t("Show sample values of the column", "اعرض عينة من قيم العمود")}
      </button>
      {vals && <div className="mt-1 flex flex-wrap gap-1">{vals.slice(0, 30).map((v) => <button key={v} type="button" className="px-1.5 h-5 rounded border border-erp-border text-[10px]" onClick={() => onPick(v)}>{v}</button>)}</div>}
    </div>
  );
}

function ActionPanel({ a, cfg, db, t, mutate, header }: { a: ActionV5; cfg: ScreenConfigV5; db: DbMeta; t: TFn; mutate: Mut; header: (icon: string, title: string, onDelete?: () => void) => React.ReactNode }) {
  const up = (patch: Partial<ActionV5>) => mutate((c) => { const x = c.actions.find((y) => y.id === a.id); if (x) Object.assign(x, patch); return c; });
  const [info, setInfo] = useState<string>("");
  async function onProc(name: string) {
    up({ proc: name, params: [] });
    if (!name) return;
    const r = await db.procInfo(name);
    if (r.error) { setInfo(r.error); }
    const params: ParamMapV5[] = r.params.filter((p) => !p.isOutput).map((p) => {
      const sn = SESSION_LIST.find((s) => s.toLowerCase() === p.name.toLowerCase());
      return sn ? { name: p.name, source: "session", value: sn } : { name: p.name, source: "const", value: "" };
    });
    up({ proc: name, params });
    setInfo(`${params.length} ${t("parameter(s) loaded", "باراميتر اتحمّل")}`);
  }
  const setParam = (i: number, patch: Partial<ParamMapV5>) => up({ params: a.params.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  return (
    <div>
      {header("fa-bolt", a.labelAr || a.proc, () => mutate((c) => { c.actions = c.actions.filter((x) => x.id !== a.id); return c; }, null))}
      <Sec title={t("Button", "الزر")}>
        <F label={t("Label (AR)", "الاسم (عربي)")}><input className={inp} value={a.labelAr} onChange={(e) => up({ labelAr: e.target.value })} /></F>
        <F label={t("Label (EN)", "الاسم (إنجليزي)")}><input className={inp} dir="ltr" value={a.labelEn} onChange={(e) => up({ labelEn: e.target.value })} /></F>
        <F label={t("Icon (fa-…)", "الأيقونة (fa-…)")}><input className={inp} dir="ltr" value={a.icon} onChange={(e) => up({ icon: e.target.value })} /></F>
        <F label={t("Where", "مكانه")}>
          <select className={inp} value={a.scope} onChange={(e) => up({ scope: e.target.value as any })}>
            <option value="toolbar">{t("Above the list", "فوق القايمة")}</option>
            <option value="row" disabled={cfg.screenType !== "Grid"}>{t("On each row (Grid)", "على كل صف (جريد)")}</option>
          </select>
        </F>
      </Sec>
      <Sec title={t("Stored procedure", "الإجراء المخزن")}>
        <F label={t("Procedure", "الإجراء")}>
          <input className={inp} list="sb-procs" dir="ltr" value={a.proc} onChange={(e) => { const v = e.target.value; up({ proc: v }); if (db.procs.includes(v)) void onProc(v); }} />
        </F>
        {info && <div className="text-[11px] text-erp-text-muted">{info}</div>}
        {a.params.map((p, i) => (
          <div key={p.name} className="grid grid-cols-[80px_1fr] gap-1 items-center">
            <span className="text-[11px] font-mono truncate" title={p.name}>@{p.name}</span>
            <div className="flex gap-1">
              <select className={`${inp} !w-20`} value={p.source} onChange={(e) => setParam(i, { source: e.target.value as any, value: "" })}>
                <option value="const">{t("value", "ثابت")}</option><option value="session">{t("session", "جلسة")}</option>
                <option value="filter" disabled={cfg.screenType !== "Grid"}>{t("filter", "فلتر")}</option><option value="row" disabled={a.scope !== "row"}>{t("row", "صف")}</option>
              </select>
              {p.source === "session" ? (
                <select className={inp} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })}><option value="">—</option>{SESSION_LIST.map((s) => <option key={s}>{s}</option>)}</select>
              ) : p.source === "filter" ? (
                <select className={inp} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })}><option value="">—</option>{cfg.filterArea.map((x) => <option key={x.id} value={x.field}>{x.field}</option>)}</select>
              ) : p.source === "row" ? (
                <select className={inp} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })}><option value="">—</option>{cfg.fields.map((x) => <option key={x.field}>{x.field}</option>)}</select>
              ) : (
                <input className={inp} value={p.value} onChange={(e) => setParam(i, { value: e.target.value })} />
              )}
            </div>
          </div>
        ))}
      </Sec>
      <Sec title={t("After running", "بعد التنفيذ")}>
        <Chk label={t("Ask for confirmation", "اطلب تأكيد")} checked={a.confirm} onChange={(v) => up({ confirm: v })} />
        <select className={inp} value={a.after} onChange={(e) => up({ after: e.target.value as any })}>
          <option value="refresh">{t("Refresh the list", "حدّث القايمة")}</option><option value="message">{t("Show a message", "اعرض رسالة")}</option><option value="none">{t("Nothing", "ولا حاجة")}</option>
        </select>
        {a.after === "message" && (<>
          <input className={inp} placeholder="AR" value={a.messageAr} onChange={(e) => up({ messageAr: e.target.value })} />
          <input className={inp} dir="ltr" placeholder="EN" value={a.messageEn} onChange={(e) => up({ messageEn: e.target.value })} />
        </>)}
      </Sec>
    </div>
  );
}

interface Props {
  db: DbMeta;
  onLoadColumns: (table: string, view: string) => void;
  onGoTab: (tab: "details" | "list" | "validations" | "print") => void;
}

export default function PropsPanel({ db, onLoadColumns, onGoTab }: Props) {
  const IsLangEN = useSys((s) => s.IsLangEN);
  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
  const cfg = useScreenBuilder((s) => s.config);
  const sel = useScreenBuilder((s) => s.selectedElement);
  const mutate = useScreenBuilder((s) => s.mutate);
  const select = useScreenBuilder((s) => s.selectElement);

  const tables = db.objects.filter((o) => o.type === "U").map((o) => o.name);
  const views = db.objects.filter((o) => o.type === "V").map((o) => o.name);
  const allObjs = [...tables, ...views];

  const upField = (name: string, patch: Partial<FieldConfigV4>) => mutate((c) => { const f = c.fields.find((x) => x.field === name); if (f) Object.assign(f, patch); return c; });
  const upCfg = (patch: Partial<ScreenConfigV5>) => mutate((c) => Object.assign(c, patch));

  const header = (icon: string, title: string, onDelete?: () => void) => (
    <div className="flex items-center gap-2 px-3 h-11 border-b border-erp-border sticky top-0 bg-erp-surface z-10">
      <i className={`fa-solid ${icon} text-erp-accent`} />
      <span className="text-[13px] font-semibold text-erp-text truncate">{title}</span>
      {onDelete && <button className="ms-auto text-erp-text-muted hover:text-erp-danger" onClick={onDelete} title={t("Delete", "حذف")}><i className="fa-solid fa-trash" /></button>}
      {sel && <button className={`${onDelete ? "" : "ms-auto"} text-erp-text-muted hover:text-erp-text`} onClick={() => select(null)} title={t("Screen settings", "إعدادات الشاشة")}><i className="fa-solid fa-gear" /></button>}
    </div>
  );

  // ---------- مساعد: شرط + تحقق ----------



  // ---------- Rule builder ----------

  // ====================== cell ======================
  if (sel?.type === "cell" && sel.id) {
    const found = findCell(cfg, sel.id);
    if (found) {
      const cell: CellV5 = found.cell;
      const f = cell.field ? cfg.fields.find((x) => x.field === cell.field) : undefined;
      const isInput = !["label", "heading", "divider"].includes(cell.kind);
      const setCell = (patch: Partial<CellV5>) => mutate((c) => { const x = findCell(c, cell.id); if (x) Object.assign(x.cell, patch); return c; });
      const otherFields = cfg.fields.filter((x) => x.field !== cell.field).map((x) => x.field);
      const kindList = FORM_CONTROLS.filter((k) => !["label", "heading", "divider", "file", "image"].includes(k.kind));
      return (
        <div>
          {header(isInput ? "fa-pen-to-square" : "fa-font", f ? f.field : t("Control", "عنصر"), () => { mutate((c) => { removeCell(c, cell.id); return c; }, null); })}
          {isInput && (
            <Sec title={t("Data binding", "الربط بالقاعدة")}>
              <F label={t("Database column", "العمود في القاعدة")} hint={f?.noSave ? t("Computed / view-only column: shown, never saved", "عمود محسوب/من الفيو: بيظهر وما بيتحفظش") : undefined}>
                <select className={inp} value={cell.field || ""} onChange={(e) => {
                  const nf = e.target.value;
                  mutate((c) => {
                    const x = findCell(c, cell.id); if (!x) return c;
                    const old = x.cell.field;
                    x.cell.field = nf || undefined;
                    if (old) { const of = c.fields.find((y) => y.field === old); if (of) of.inForm = false; }
                    const n = c.fields.find((y) => y.field === nf);
                    if (n) { n.inForm = true; n.inputType = kindToInputType(x.cell.kind); }
                    syncOrderFromLayout(c);
                    return c;
                  });
                }}>
                  <option value="">{t("(not bound)", "(مش مربوط)")}</option>
                  {cfg.fields.filter((x) => x.field === cell.field || !cfg.layout.sections.some((s) => s.rows.some((r) => r.cells.some((cc) => cc.field === x.field)))).map((x) => (
                    <option key={x.field} value={x.field}>{x.field}{x.noSave ? " 🔒" : ""}</option>
                  ))}
                </select>
              </F>
              <F label={t("Control type", "نوع العنصر")}>
                <select className={inp} value={cell.kind} onChange={(e) => {
                  const k = e.target.value as ControlKind;
                  setCell({ kind: k });
                  if (cell.field) upField(cell.field, { inputType: kindToInputType(k) });
                }}>
                  {kindList.map((k) => <option key={k.kind} value={k.kind}>{IsLangEN ? k.en : k.ar}</option>)}
                </select>
              </F>
            </Sec>
          )}
          {!isInput && (
            <Sec title={t("Text", "النص")}>
              <F label={t("Arabic", "عربي")}><input className={inp} value={cell.textAr || ""} onChange={(e) => setCell({ textAr: e.target.value })} /></F>
              <F label={t("English", "إنجليزي")}><input className={inp} value={cell.textEn || ""} onChange={(e) => setCell({ textEn: e.target.value })} dir="ltr" /></F>
            </Sec>
          )}
          {f && isInput && (
            <>
              <Sec title={t("Label & rules", "العنوان والقواعد")}>
                <F label={t("Label (AR)", "العنوان (عربي)")}><input className={inp} value={f.titleAr} onChange={(e) => upField(f.field, { titleAr: e.target.value })} /></F>
                <F label={t("Label (EN)", "العنوان (إنجليزي)")}><input className={inp} value={f.titleEn} onChange={(e) => upField(f.field, { titleEn: e.target.value })} dir="ltr" /></F>
                <Chk label={t("Required", "إجباري")} checked={f.required} onChange={(v) => upField(f.field, { required: v })} />
                <Chk label={t("Read-only (shown, not editable)", "قراءة فقط")} checked={!!f.readOnly || !!f.noSave} onChange={(v) => upField(f.field, { readOnly: v })} />
                <Chk label={t("Searchable in the grid", "داخل البحث")} checked={f.search} onChange={(v) => upField(f.field, { search: v })} />
              </Sec>
              <Sec title={t("Default value", "القيمة الافتراضية")}>
                <div className="flex gap-1">
                  <select className={`${inp} !w-28`} value={SESSION_LIST.includes(f.defaultValue) ? f.defaultValue : f.defaultValue ? "__const" : ""} onChange={(e) => upField(f.field, { defaultValue: e.target.value === "__const" ? "0" : e.target.value })}>
                    <option value="">{t("none", "بدون")}</option>
                    {SESSION_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value="__const">{t("constant…", "قيمة ثابتة…")}</option>
                  </select>
                  {!SESSION_LIST.includes(f.defaultValue) && f.defaultValue !== "" && <input className={inp} value={f.defaultValue} onChange={(e) => upField(f.field, { defaultValue: e.target.value })} />}
                </div>
              </Sec>
              {cell.kind === "select" && (
                <Sec title={t("Fixed options", "الاختيارات")}>
                  <textarea className={area} rows={3} dir="ltr" value={f.options} onChange={(e) => upField(f.field, { options: e.target.value })} placeholder="1:Cash|2:Credit   or   1=نقدي=Cash;2=آجل=Credit" />
                </Sec>
              )}
              {cell.kind === "selectSearch" && (
                <Sec title={t("Dropdown source (table)", "مصدر الدروب داون (جدول)")}>
                  <SourceEditor db={db} t={t}
                    src={{ table: f.selectTable || "", valueField: f.selectValue || "", displayField: f.selectDisplay || "", displayFieldEn: f.selectDisplayEn || "", condition: f.selectCondition || "", orderBy: f.selectOrderBy || "" }}
                    onChange={(s) => upField(f.field, { selectTable: s.table, selectValue: s.valueField, selectDisplay: s.displayField, selectDisplayEn: s.displayFieldEn, selectCondition: s.condition, selectOrderBy: s.orderBy })}
                    extras={[
                      ...otherFields.slice(0, 12).map((n) => ({ label: `{row.${n}}`, token: `{row.${n}}` })),
                      ...SESSION_LIST.slice(0, 3).map((n) => ({ label: `{session.${n}}`, token: `{session.${n}}` })),
                    ]}
                  />
                  <p className="text-[10px] text-erp-text-subtle">{t("{row.X} = value of another field in the same form (cascading dropdown).", "{row.X} = قيمة حقل تاني في نفس الفورم (دروب داون متسلسل).")}</p>
                </Sec>
              )}
              {cell.kind === "search" && (
                <Sec title={t("Search popup", "نافذة البحث")}>
                  <F label={t("Search function (G_SearchFrom)", "دالة البحث (G_SearchFrom)")}><input className={inp} dir="ltr" value={f.searchFn} onChange={(e) => upField(f.field, { searchFn: e.target.value })} placeholder="Search_Customers" /></F>
                  <F label={t("Condition", "الشرط")}><input className={inp} dir="ltr" value={f.searchCond} onChange={(e) => upField(f.field, { searchCond: e.target.value })} /></F>
                </Sec>
              )}
              <Sec title={t("Visible when", "يظهر لما")}>
                <RuleBox t={t} rule={f.visibleWhen} onChange={(r) => upField(f.field, { visibleWhen: r })} fieldNames={otherFields} />
              </Sec>
              <Sec title={t("Enabled when (Grid)", "يتفعّل لما (جريد)")}>
                <RuleBox t={t} rule={f.enabledWhen} onChange={(r) => upField(f.field, { enabledWhen: r })} fieldNames={otherFields} />
              </Sec>
            </>
          )}
          <Sec title={t("Width (out of 12 columns)", "العرض (من 12 عمود)")}>
            <div className="grid grid-cols-3 gap-2">
              {([["base", t("Mobile", "موبايل")], ["md", t("Tablet", "تابلت")], ["lg", t("Desktop", "كمبيوتر")]] as const).map(([k, lbl]) => (
                <F key={k} label={lbl}>
                  <input type="number" min={1} max={12} className={inp} value={cell.span[k]} onChange={(e) => mutate((c) => { setSpan(c, cell.id, { [k]: Number(e.target.value) } as any); return c; })} />
                </F>
              ))}
            </div>
          </Sec>
        </div>
      );
    }
  }

  // ====================== filter control ======================
  if (sel?.type === "filterCtl" && sel.id) {
    const fc = cfg.filterArea.find((x) => x.id === sel.id);
    if (fc) {
      const up = (patch: Partial<FilterControlV5>) => mutate((c) => { const x = c.filterArea.find((y) => y.id === fc.id); if (x) Object.assign(x, patch); return c; });
      const others = cfg.filterArea.filter((x) => x.id !== fc.id && x.field).map((x) => x.field);
      const srcTable = cfg.view || cfg.table;
      return (
        <div>
          {header("fa-filter", fc.labelAr || fc.field, () => mutate((c) => { c.filterArea = c.filterArea.filter((x) => x.id !== fc.id); return c; }, null))}
          <Sec title={t("Target column", "العمود المستهدف")}>
            <F label={t("Filter on column", "فلتر على العمود")}>
              <select className={inp} value={fc.field} onChange={(e) => {
                const f = cfg.fields.find((x) => x.field === e.target.value);
                up({ field: e.target.value, ...(f && !fc.labelAr ? { labelAr: f.titleAr, labelEn: f.titleEn } : {}) , ...(f && fc.kind === "text" ? { kind: filterKindOfField(f) } : {}) });
              }}>
                <option value="">—</option>
                {cfg.fields.map((x) => <option key={x.field} value={x.field}>{x.field}</option>)}
              </select>
            </F>
            <F label={t("Control", "العنصر")}>
              <select className={inp} value={fc.kind} onChange={(e) => up({ kind: e.target.value as FilterKind })}>
                {FILTER_CONTROLS.map((k) => <option key={k.kind} value={k.kind}>{IsLangEN ? k.en : k.ar}</option>)}
              </select>
            </F>
            <F label={t("Operator", "العملية")} hint={t("Default: text = contains, number/select = equals", "الافتراضي: نص = يحتوي، رقم/قائمة = يساوي")}>
              <select className={inp} value={fc.operator || ""} onChange={(e) => up({ operator: (e.target.value || undefined) as FilterOperator | undefined })}>
                <option value="">{t("(default)", "(افتراضي)")}</option>
                {[["=", t("equals", "يساوي")], ["contains", t("contains", "يحتوي")], ["starts", t("starts with", "يبدأ بـ")], [">=", ">="], ["<=", "<="], ["<>", t("not equal", "لا يساوي")]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </F>
          </Sec>
          <Sec title={t("Label & default", "العنوان والقيمة")}>
            <F label={t("Label (AR)", "العنوان (عربي)")}><input className={inp} value={fc.labelAr} onChange={(e) => up({ labelAr: e.target.value })} /></F>
            <F label={t("Label (EN)", "العنوان (إنجليزي)")}><input className={inp} dir="ltr" value={fc.labelEn} onChange={(e) => up({ labelEn: e.target.value })} /></F>
            <Chk label={t("Required (grid waits for it)", "إجباري (الجريد مايحمّلش قبله)")} checked={fc.required} onChange={(v) => up({ required: v })} />
            <F label={t("Default value", "القيمة الافتراضية")} hint={fc.kind === "dateRange" ? "monthStart|today" : fc.kind === "date" ? "today / monthStart / yearStart" : "CompCode / BranchCode / 1"}>
              <input className={inp} dir="ltr" value={fc.defaultValue} onChange={(e) => up({ defaultValue: e.target.value })} />
            </F>
          </Sec>
          {(fc.kind === "select" || fc.kind === "multiselect") && (
            <Sec title={t("Options source", "مصدر الاختيارات")}>
              <Chk label={t("Load options from a table", "اختيارات من جدول")} checked={!!fc.source} onChange={(v) => up({ source: v ? { table: "", valueField: "", displayField: "", displayFieldEn: "", condition: "", orderBy: "" } : undefined })} />
              {fc.source ? (
                <SourceEditor db={db} t={t} src={fc.source} onChange={(s) => up({ source: s })}
                  extras={[...others.map((n) => ({ label: `{filter.${n}}`, token: `{filter.${n}}` })), ...SESSION_LIST.slice(0, 3).map((n) => ({ label: `{session.${n}}`, token: `{session.${n}}` }))]} />
              ) : (
                <textarea className={area} rows={3} dir="ltr" value={fc.options} onChange={(e) => up({ options: e.target.value })} placeholder="1:Active|0:Inactive" />
              )}
              {fc.source && /\{filter\./.test(fc.source.condition) && <p className="text-[10px] text-erp-text-subtle">{t("Cascading: reloads when the other filter changes (Grid screens).", "متسلسل: بيتحمل من جديد لما الفلتر التاني يتغير (شاشات الجريد).")}</p>}
              <SampleValues db={db} t={t} table={srcTable} column={fc.field} onPick={(v) => up({ options: (fc.options ? fc.options + "|" : "") + `${v}:${v}` })} />
            </Sec>
          )}
        </div>
      );
    }
  }

  // ====================== action ======================
  if (sel?.type === "action" && sel.id) {
    const a = cfg.actions.find((x) => x.id === sel.id);
    if (a) return <ActionPanel a={a} cfg={cfg} db={db} t={t} mutate={mutate} header={header} />;
  }



  // ====================== section ======================
  if (sel?.type === "section" && sel.id) {
    const sec = cfg.layout.sections.find((s) => s.id === sel.id);
    if (sec) {
      const up = (patch: Partial<typeof sec>) => mutate((c) => { const x = c.layout.sections.find((s) => s.id === sec.id); if (x) Object.assign(x, patch); return c; });
      return (
        <div>
          {header("fa-layer-group", t("Section", "قسم"), () => mutate((c) => { removeSection(c, sec.id); return c; }, null))}
          <Sec title={t("Title", "العنوان")}>
            <F label={t("Arabic", "عربي")}><input className={inp} value={sec.titleAr} onChange={(e) => up({ titleAr: e.target.value })} /></F>
            <F label={t("English", "إنجليزي")}><input className={inp} dir="ltr" value={sec.titleEn} onChange={(e) => up({ titleEn: e.target.value })} /></F>
          </Sec>
        </div>
      );
    }
  }

  // ====================== screen (default) ======================
  return (
    <div>
      {header("fa-sliders", t("Screen settings", "إعدادات الشاشة"))}
      <datalist id="sb-objs">{allObjs.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id="sb-procs">{db.procs.map((n) => <option key={n} value={n} />)}</datalist>
      <Sec title={t("Screen info", "بيانات الشاشة")}>
        <F label={t("Screen code (= folder name)", "كود الشاشة (= اسم الفولدر)")}><input className={inp} dir="ltr" value={cfg.module} onChange={(e) => upCfg({ module: e.target.value.replace(/[^A-Za-z0-9_]/g, "") })} placeholder="MyScreen" /></F>
        <F label={t("Title (AR)", "العنوان (عربي)")}><input className={inp} value={cfg.titleAr} onChange={(e) => upCfg({ titleAr: e.target.value })} /></F>
        <F label={t("Title (EN)", "العنوان (إنجليزي)")}><input className={inp} dir="ltr" value={cfg.titleEn} onChange={(e) => upCfg({ titleEn: e.target.value })} /></F>
        <div className="grid grid-cols-2 gap-2">
          <F label={t("Menu group code", "كود مجموعة القايمة")}><input className={inp} dir="ltr" value={cfg.permissions.parentMenu} onChange={(e) => mutate((c) => { c.permissions.parentMenu = e.target.value; return c; })} placeholder="Menu_Sales" /></F>
          <F label={t("Sort (0 = auto)", "الترتيب (0 = تلقائي)")}><input type="number" className={inp} value={cfg.menuSort} onChange={(e) => upCfg({ menuSort: Number(e.target.value) || 0 })} /></F>
          <F label={t("Icon", "الأيقونة")}><input className={inp} dir="ltr" value={cfg.icon} onChange={(e) => upCfg({ icon: e.target.value })} /></F>
          <F label={t("Color", "اللون")}>
            <select className={inp} value={cfg.iconColor} onChange={(e) => upCfg({ iconColor: e.target.value })}>{ICON_COLORS.map((c) => <option key={c}>{c}</option>)}</select>
          </F>
        </div>
      </Sec>
      <Sec title={t("Data source", "مصدر البيانات")}>
        <F label={t("Save table", "جدول الحفظ")}><input className={inp} list="sb-objs" dir="ltr" value={cfg.table} onChange={(e) => upCfg({ table: e.target.value })} /></F>
        <F label={t("List view / table", "فيو / جدول القايمة")}><input className={inp} list="sb-objs" dir="ltr" value={cfg.view} onChange={(e) => upCfg({ view: e.target.value })} /></F>
        <button disabled={!cfg.table || !db.connected} onClick={() => onLoadColumns(cfg.table, cfg.view)}
          className="w-full h-8 rounded-md bg-erp-accent text-white text-[12px] font-medium hover:bg-erp-accent-hover disabled:opacity-40">
          <i className="fa-solid fa-download me-1" />{t("Load columns", "حمّل الأعمدة")}
        </button>
        {!db.connected && <p className="text-[11px] text-amber-600">{t("Connect to the database first (top bar).", "اتصل بالقاعدة الأول (الشريط العلوي).")}</p>}
        <F label={t("Key column", "عمود المفتاح")}>
          <select className={inp} value={cfg.keyColumn} onChange={(e) => upCfg({ keyColumn: e.target.value })}>
            <option value="">—</option>{cfg.fields.map((f) => <option key={f.field}>{f.field}</option>)}
          </select>
        </F>
        <F label={t("Default condition", "الشرط الافتراضي")}>
          <ConditionBox db={db} t={t} table={cfg.view || cfg.table} value={cfg.extraCondition} onChange={(v) => upCfg({ extraCondition: v })} extras={[]} />
        </F>
        <div className="grid grid-cols-2 gap-2">
          <F label={t("Order by", "ترتيب")}>
            <select className={inp} value={cfg.orderBy} onChange={(e) => upCfg({ orderBy: e.target.value })}><option value="">—</option>{cfg.fields.map((f) => <option key={f.field}>{f.field}</option>)}</select>
          </F>
          <F label={t("Direction", "الاتجاه")}>
            <select className={inp} value={cfg.orderType} onChange={(e) => upCfg({ orderType: e.target.value as any })}><option>DESC</option><option>ASC</option></select>
          </F>
        </div>
        <Chk label={t("Run G_ProcessTrans after save/delete", "شغّل G_ProcessTrans بعد الحفظ/الحذف")} checked={cfg.processTrans} onChange={(v) => upCfg({ processTrans: v })} />
        {cfg.processTrans && <F label="TrType"><input className={inp} dir="ltr" value={cfg.trType} onChange={(e) => upCfg({ trType: e.target.value })} /></F>}
      </Sec>
      <Sec title={t("Permissions & buttons", "الصلاحيات والأزرار")}>
        <Chk label={t("Use role permissions (MODULE_CODE)", "استخدم صلاحيات الأدوار")} checked={cfg.permissions.usePermissions} onChange={(v) => mutate((c) => { c.permissions.usePermissions = v; return c; })} />
        {(["insert", "edit", "delete", "export"] as const).map((k) => (
          <Chk key={k} label={k} checked={cfg.permissions[k]} onChange={(v) => mutate((c) => { c.permissions[k] = v; return c; })} />
        ))}
      </Sec>
      <Sec title={t("More", "تفاصيل أكتر")}>
        <button className="w-full h-8 rounded-md border border-erp-border-strong text-[12px] hover:border-erp-accent" onClick={() => onGoTab("validations")}><i className="fa-solid fa-shield-halved me-1" />{t("Validations", "التحققات")}</button>
        <button className="w-full h-8 rounded-md border border-erp-border-strong text-[12px] hover:border-erp-accent" onClick={() => onGoTab("print")}><i className="fa-solid fa-print me-1" />{t("Print & Excel settings", "إعدادات الطباعة والإكسل")}</button>
      </Sec>
    </div>
  );
}
