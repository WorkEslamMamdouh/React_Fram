// ============================================================
// Code Generator — ScreenConfigV5 → .ts + page.tsx
// ============================================================

import {
  ScreenConfigV5, FieldConfigV4, DetailConfigV4, ValidationConfigV4,
  RuleV5, FilterControlV5, ActionV5, ParamMapV5,
} from "../types/ScreenConfig";
import { convertV4toV3 } from "./configConverter";

// ---------- Phase 5 helpers ----------
const SESSION_NAMES = ["CompCode", "BranchCode", "UserID", "FinYear", "UserName", "Today", "Now"];

/** شرط نصي → تعبير JS. {session.X} بتتحول لقيمة الجلسة (template literal). {row.X}/{filter.X} بتتحل وقت التشغيل. */
function condJs(cond: string): string {
  if (!/\{session\.[A-Za-z]+\}/.test(cond)) return q(cond);
  const body = cond.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
    .replace(/\{session\.([A-Za-z]+)\}/g, (_m, n) => (SESSION_NAMES.includes(n) ? "${" + n + "}" : "{session." + n + "}"));
  return "`" + body + "`";
}

/** شرط بسيط على حقل تاني → تعبير JS على r */
function ruleJs(r: RuleV5): string {
  const v = `r[${q(r.field)}]`;
  const isBool = r.value === "true" || r.value === "false";
  switch (r.op) {
    case "empty": return `(${v} === null || ${v} === undefined || ${v} === "")`;
    case "notEmpty": return `!(${v} === null || ${v} === undefined || ${v} === "")`;
    case ">": case "<": case ">=": case "<=": return `Number(${v}) ${r.op} ${Number(r.value) || 0}`;
    default: {
      const eq = isBool
        ? (r.value === "true" ? `(${v} === true || ${v} === 1 || ${v} === "1")` : `!(${v} === true || ${v} === 1 || ${v} === "1")`)
        : `String(${v} ?? "") === ${q(r.value)}`;
      return r.op === "!=" ? `!(${eq})` : eq;
    }
  }
}

function paramValueJs(p: ParamMapV5): string {
  switch (p.source) {
    case "session": return SESSION_NAMES.includes(p.value) ? p.value : q(p.value);
    case "filter": return `(filterVals[${q(p.value)}] ?? null)`;
    case "row": return `(row?.[${q(p.value)}] ?? null)`;
    default: return p.value !== "" && !isNaN(Number(p.value)) ? p.value : q(p.value);
  }
}

function dateTokenJs(tok: string): string {
  switch (tok.trim()) {
    case "today": return "Today";
    case "monthStart": return `Today.substring(0, 8) + "01"`;
    case "yearStart": return `String(FinYear) + "-01-01"`;
    case "yearEnd": return `String(FinYear) + "-12-31"`;
    default: return q(tok.trim());
  }
}

function filterKindToType(k: string): string { return k; }

interface Extras {
  reactImports: string[];
  imports: string[];
  filterItems: string;      // محتوى مصفوفة FilterFields
  filterDeps: string;
  block: string;            // state + effects + functions (قبل الـ useMemo بتاعة الأعمدة)
  formLayoutCode: string;   // "" لو مفيش تخطيط
  hasTx: boolean;
  hasToolbar: boolean;
  hasExcel: boolean;        // Phase 6: الشاشة بتبعت excel لـ DynamicGrid / MasterDetail
  hasRowActions: boolean;
  needsGridKey: boolean;
}

/** FormLayout المسطّح من الأقسام/الصفوف/الخلايا */
export function layoutToFormLayout(cfg: ScreenConfigV5): { kind: string; field?: string; textAr?: string; textEn?: string; span: number; spanMd: number; newRow: boolean }[] {
  const out: any[] = [];
  for (const s of cfg.layout.sections) {
    let first = true;
    if (s.titleAr || s.titleEn) {
      out.push({ kind: "heading", textAr: s.titleAr, textEn: s.titleEn || s.titleAr, span: 12, spanMd: 12, newRow: true });
      first = false;
    }
    for (const r of s.rows) {
      let newRow = true;
      for (const c of r.cells) {
        if (c.kind === "button") continue;
        if (c.field && !cfg.fields.some((f) => f.field === c.field && f.inForm)) continue;
        const base: any = { span: c.span.lg, spanMd: c.span.md, newRow };
        if (c.field) out.push({ kind: "field", field: c.field, ...base });
        else if (c.kind === "divider") out.push({ kind: "divider", ...base });
        else if (c.kind === "label" || c.kind === "heading") out.push({ kind: c.kind, textAr: c.textAr || "", textEn: c.textEn || c.textAr || "", ...base });
        else continue;   // كنترول لسه مش مربوط بعمود
        newRow = false;
      }
    }
    void first;
  }
  return out;
}

/** إعدادات الإكسل (Phase 6) كـ كود بيتحط في الـ hook — بيتبعت `excel={...}` لـ DynamicGrid / MasterDetail */
function excelConfigCode(cfg: ScreenConfigV5): string {
  const ex = cfg.excel;
  const isGrid = cfg.screenType === "Grid";
  const lookupsOf = (scope: "master" | "detail") => {
    const list = ex.keyLookups.filter((l) => (l.scope || "master") === scope && l.table && l.valueField);
    if (!list.length) return "";
    return "{\n" + list.map((l) => {
      const parts = [`table: ${q(l.table)}`, `keyColumn: ${q(l.valueField)}`];
      if (l.codeField) parts.push(`codeColumn: ${q(l.codeField)}`);
      if (l.displayField) parts.push(`nameColumn: ${q(l.displayField)}`);
      if (l.condition && l.condition.trim()) parts.push(`condition: ${condJs(l.condition.trim())}`);
      return `      ${q(l.column)}: { ${parts.join(", ")} },`;
    }).join("\n") + "\n    }";
  };
  const known = (names: string[], fields: FieldConfigV4[]) => names.filter((n) => fields.some((f) => f.field === n));
  const props: string[] = ["enabled: true", `templateName: ${q(ex.templateName || cfg.module || "Template")}`];
  const cols = known(ex.columns || [], cfg.fields);
  if (isGrid) {
    if (cols.length) props.push(`columns: ${JSON.stringify(cols)}`);
    const lk = lookupsOf("master");
    if (lk) props.push(`lookups: ${lk}`);
    if (ex.allOrNothing) props.push("allOrNothing: true");
    return `  // ===== Excel: تحميل نموذج / استيراد (Phase 6) — بيتبعت لـ DynamicGrid (excel={...}) =====
  const ExcelCfg = useMemo<ExcelGridConfig>(
    () => ({
${props.map((p) => "      " + p + ",").join("\n")}
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CompCode, BranchCode]
  );`;
  }
  const di = Math.min(Math.max(0, ex.detailIndex ?? 0), Math.max(0, cfg.details.length - 1));
  props.push(`mode: ${q(ex.mode || "both")}`);
  if (di > 0) props.push(`detailIndex: ${di}`);
  if (cols.length) props.push(`masterColumns: ${JSON.stringify(cols)}`);
  const dcols = cfg.details[di] ? known(ex.detailColumns || [], cfg.details[di].fields) : [];
  if (dcols.length) props.push(`detailColumns: ${JSON.stringify(dcols)}`);
  const lk = lookupsOf("master");
  if (lk) props.push(`lookups: ${lk}`);
  const dlk = lookupsOf("detail");
  if (dlk) props.push(`detailLookups: ${dlk}`);
  return `  // ===== Excel: معاملات كتير / أصناف في الفاتورة (Phase 6) — بيتحط في Config.excel =====
  const ExcelCfg = useMemo<ExcelMasterDetailConfig>(
    () => ({
${props.map((p) => "      " + p + ",").join("\n")}
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CompCode, BranchCode]
  );`;
}

function buildExtras(cfg: ScreenConfigV5): Extras {
  const isGrid = cfg.screenType === "Grid";
  const isTree = cfg.screenType === "Tree";
  const react = new Set<string>(["useMemo"]);
  const imports: string[] = [];
  const lines: string[] = [];
  if (isGrid) react.add("useState");

  // ---------- الفلاتر ----------
  const fcs: FilterControlV5[] = isTree ? [] : (cfg.filterArea || []);
  const sourced = fcs.map((fc, i) => ({ fc, i })).filter((x) => x.fc.source && x.fc.source.table && x.fc.source.valueField && x.fc.source.displayField);
  const needFV = isGrid && fcs.length > 0;
  if (!isTree) imports.push(`import { FilterFieldConfig, FilterOption, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";`);
  if (needFV) {
    react.add("useCallback");
    lines.push(`  // قيم الفلاتر الحالية (بتتحدّث لما اليوزر يغيّر الفلتر) — بتستخدم في الدروب داون المتسلسل والأزرار
  const [filterVals, setFilterVals] = useState<Record<string, any>>({});
  void filterVals;
  const onFilterChange = useCallback((filters: ActiveFilter[]) => {
    const m: Record<string, any> = {};
    for (const f of filters) m[f.field] = f.type === "dateRange" ? { from: f.fromValue, to: f.toValue } : f.value;
    setFilterVals((prev) => (JSON.stringify(prev) === JSON.stringify(m) ? prev : m));
  }, []);`);
  } else {
    lines.push(`  const filterVals: Record<string, any> = {};   // الفلاتر المتسلسلة / بارامترات الفلتر متاحة في شاشات الجريد بس
  void filterVals;`);
  }
  if (sourced.length) {
    react.add("useEffect");
    imports.push(`import { SQL } from "../Shared/CallDataBase";`);
    lines.push(`  const SqlLit = (v: any) => (v === null || v === undefined || v === "" ? "NULL" : typeof v === "number" ? String(v) : "N'" + String(v).replace(/'/g, "''") + "'");
  void SqlLit;`);
    if (!react.has("useState")) react.add("useState");
  }
  const readyParts: string[] = [];
  const filterDepsArr = ["IsLangEN"];
  for (const { fc, i } of sourced) {
    const s = fc.source!;
    const refs = Array.from(new Set(Array.from(s.condition.matchAll(/\{filter\.([A-Za-z_][A-Za-z0-9_]*)\}/g)).map((m) => m[1])));
    const baseCond = s.condition.replace(/\{filter\.([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, n) => "${SqlLit(filterVals[" + q(n) + "])}");
    const tmpl = (() => {
      const body = baseCond.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{(?!SqlLit)/g, "\\${")
        .replace(/\{session\.([A-Za-z]+)\}/g, (_m, n) => (SESSION_NAMES.includes(n) ? "${" + n + "}" : "{session." + n + "}"));
      return "`" + body + "`";
    })();
    const missing = refs.map((r) => `filterVals[${q(r)}] == null || filterVals[${q(r)}] === ""`).join(" || ");
    const condExpr = refs.length ? `(${missing}) ? "1 = 0" : ${tmpl}` : tmpl;
    const cols = Array.from(new Set([s.valueField, s.displayField, s.displayFieldEn].filter(Boolean)));
    const dispExpr = s.displayFieldEn && s.displayFieldEn !== s.displayField ? `IsLangEN ? ${q(s.displayFieldEn)} : ${q(s.displayField)}` : q(s.displayField);
    lines.push(`  // دروب داون الفلتر "${fc.field}" من ${s.table}${refs.length ? " (متسلسل مع: " + refs.join(", ") + ")" : ""}
  const [opt_${i}, setOpt_${i}] = useState<FilterOption[]>([]);
  const [loaded_${i}, setLoaded_${i}] = useState(false);
  useEffect(() => {
    let off = false;
    SQL.Select(${q(s.table)}, ${condExpr}, ${JSON.stringify(cols)}, null, null, 0, ${q(s.orderBy || s.displayField)}, "ASC", 0, "", null, null, 1, 500, false)
      .then((r) => {
        if (off) return;
        const dispField: string = ${dispExpr};
        setOpt_${i}((r.data || []).map((x: any) => ({ value: x[${q(s.valueField)}], label: String(x[dispField] ?? "") })));
        setLoaded_${i}(true);
      })
      .catch(() => { if (!off) setLoaded_${i}(true); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IsLangEN, CompCode, BranchCode${refs.map((r) => `, filterVals[${q(r)}]`).join("")}]);`);
    filterDepsArr.push(`opt_${i}`);
    if (!refs.length) readyParts.push(`loaded_${i}`);
  }
  lines.push(`  const filterReady = ${readyParts.length ? readyParts.join(" && ") : "true"};   // الجريد مابيتعرضش قبل ما اختيارات الفلاتر تتحمل`);

  const items = fcs.map((fc, n) => {
    const parts = [`field: ${q(fc.field)}`, `label: t(${q(fc.labelEn || fc.field)}, ${q(fc.labelAr || fc.field)})`, `type: ${q(filterKindToType(fc.kind))}`];
    if (fc.operator) parts.push(`operator: ${q(fc.operator)}`);
    if (fc.required) parts.push("required: true");
    if (sourced.some((x) => x.i === n)) parts.push(`options: opt_${n}`);
    else if (fc.options && (fc.kind === "select" || fc.kind === "multiselect")) parts.push(`options: [${parseSelectOptions(fc.options)}]`);
    const dv = (fc.defaultValue || "").trim();
    if (dv) {
      if (fc.kind === "dateRange") {
        const [a, b] = dv.split("|");
        parts.push(`defaultRange: { from: ${dateTokenJs(a)}, to: ${dateTokenJs(b || "today")} }`);
      } else if (fc.kind === "date") parts.push(`defaultValue: ${dateTokenJs(dv)}`);
      else if (SESSION_NAMES.includes(dv)) parts.push(`defaultValue: ${dv}`);
      else parts.push(`defaultValue: ${!isNaN(Number(dv)) && fc.kind === "number" ? dv : q(dv)}`);
    }
    parts.push(`sortOrder: ${n + 1}`);
    return `{ ${parts.join(", ")} },`;
  }).join("\n");

  // ---------- الإجراءات (أزرار تشغّل Stored Procedure) ----------
  const toolbar: string[] = [];
  const rowActs: string[] = [];
  const acts = isTree ? [] : cfg.actions.filter((a) => a.proc);
  if (acts.length) {
    imports.push(`import { RunProc } from "../Shared/RunProc";`);
    imports.push(`import { Sys } from "../Shared/SystemTools";`);
  }
  acts.forEach((a: ActionV5, i) => {
    const params = a.params.map((p) => `${q(p.name)}: ${paramValueJs(p)}`).join(", ");
    lines.push(`  async function RunAction_${i}(row?: any) {
    void row;${a.confirm ? `
    if (!(await Sys.Confirm(${q("Run: " + (a.labelEn || a.labelAr) + "?")}, ${q("تنفيذ: " + (a.labelAr || a.labelEn) + "؟")}))) return;` : ""}
    const res = await RunProc(${q(a.proc)}, { ${params} });
    if (!res.ok) { Sys.ShowMessage(res.error || "Failed", res.error || "فشل التنفيذ", "error"); return; }${a.after === "message" ? `
    Sys.ShowMessage(${q(a.messageEn || "Done")}, ${q(a.messageAr || "تم")}, "success");` : ""}${a.after === "refresh" ? `
    RefreshGrid();` : ""}
  }`);
    if (a.scope === "row" && isGrid) rowActs.push(`{ key: ${q("act_" + i)}, label: t(${q(a.labelEn || a.proc)}, ${q(a.labelAr || a.labelEn || a.proc)}), onClick: (row: any) => { void RunAction_${i}(row); } },`);
    else toolbar.push(`{ key: ${q("act_" + i)}, label: t(${q(a.labelEn || a.proc)}, ${q(a.labelAr || a.labelEn || a.proc)}), icon: ${q(a.icon || "fa-bolt")}, onClick: () => { void RunAction_${i}(); } },`);
  });

  // ---------- الطباعة (Hooks للمرحلة 7) ----------
  const lp = cfg.print.listPrint, tp = cfg.print.transactionPrint, ex = cfg.excel;
  const hasList = lp.enabled && !isTree, hasTx = tp.enabled && !isTree;
  if (hasList || hasTx) {
    imports.push(`import { Sys } from "../Shared/SystemTools";`);
    lines.push(`  // ===== Hooks للطباعة (التشغيل الفعلي في المرحلة 7) — الإعدادات اتخزنت من الـ ScreenBuilder =====
  const PrintConfig = ${JSON.stringify({ listPrint: lp, transactionPrint: tp })};
  void PrintConfig;
  const ComingSoon = () => Sys.ShowMessage("This feature will be available soon", "الميزة دي هتبقى متاحة قريب", "info");`);
    if (hasList) {
      lines.push(`  function onPrintList() { ComingSoon(); }   // Phase 7: PrintConfig.listPrint (proc + params من الفلاتر)`);
      toolbar.push(`{ key: "printList", label: t("Print list", "طباعة القائمة"), icon: "fa-print", onClick: () => onPrintList() },`);
    }
    if (hasTx) lines.push(`  function onPrintTransaction(row?: Record<string, any>) { void row; ComingSoon(); }   // Phase 7: PrintConfig.transactionPrint (CompCode, BranchCode, TrID)`);
  }

  // ---------- الإكسل (Phase 6): إعدادات بتتبعت لـ DynamicGrid / MasterDetail (الأزرار والاستيراد جوّاهم) ----------
  const hasExcel = ex.enabled && !isTree;
  if (hasExcel) {
    lines.push(excelConfigCode(cfg));
    imports.push(isGrid
      ? `import type { ExcelGridConfig } from "../Shared/Components/Excel/ExcelTypes";`
      : `import type { ExcelMasterDetailConfig } from "../Shared/Components/Excel/ExcelTypes";`);
  }
  if (toolbar.length) lines.push(`  const ToolbarButtons: { key: string; label: string; icon?: string; onClick: () => void }[] = [\n${indent(toolbar.join("\n"), 4)}\n  ];`);
  if (rowActs.length) {
    imports.push(`import type { ActionButtonConfig } from "../Shared/Components/Import/DynamicGrid";`);
    lines.push(`  const RowActions: ActionButtonConfig[] = [\n${indent(rowActs.join("\n"), 4)}\n  ];`);
  }

  const fl = layoutToFormLayout(cfg);
  let formLayoutCode = "";
  if (!isTree && fl.some((c) => c.kind === "field")) {
    imports.push(`import { FormLayout } from "../Shared/Components/Import/FormLayout";`);
    formLayoutCode = `  const FormLayoutCells: FormLayout = [\n${fl.map((c) => "    " + JSON.stringify(c) + ",").join("\n")}\n  ];`;
  }

  return {
    reactImports: Array.from(react),
    imports: Array.from(new Set(imports)),
    filterItems: items,
    filterDeps: filterDepsArr.join(", "),
    block: lines.join("\n\n"),
    formLayoutCode,
    hasTx,
    hasToolbar: toolbar.length > 0,
    hasExcel,
    hasRowActions: rowActs.length > 0,
    needsGridKey: acts.length > 0 || toolbar.length > 0,
  };
}

// ============================================================
// Helpers
// ============================================================

function q(s: string): string { return JSON.stringify(s); }
function camel(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text.split("\n").map(l => l ? pad + l : l).join("\n");
}

// متغيرات الجلسة اللي ممكن تتكتب في القيمة الافتراضية
const SESSION_VARS: Record<string, string> = {
  CompCode: "CompCode", BranchCode: "BranchCode", UserID: "UserID", FinYear: "FinYear", UserName: "UserName",
  Today: "Today", today: "Today", "GetDateNow()": "Today", "GetDateTimeNow()": "Now",
};

// "Qty * UnitPrice"  →  (r, n) => n(r.Qty) * n(r.UnitPrice)
export function formulaToJs(formula: string): string {
  const body = formula.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (m) => (/^(Math|round|abs|min|max)$/.test(m) ? m : `n(r.${m})`));
  return `(r, n) => ${body}`;
}

// "ItemName=NameA;UnitPrice=SalePrice"  →  { ItemName: "NameA", UnitPrice: "SalePrice" }
export function fillFromToJs(fill: string): string {
  const pairs = fill.split(/[;|]/).map((x) => x.trim()).filter(Boolean).map((x) => {
    const [k, v] = x.split(/[=:]/).map((y) => (y || "").trim());
    return `${k}: ${q(v || k)}`;
  });
  return `{ ${pairs.join(", ")} }`;
}

// يدعم الشكلين:
//   "0=نقدي=Cash;1=آجل=Credit"   (شكل الديسك توب)
//   "0:Cash|1:Credit"            (الشكل المختصر)
function parseSelectOptions(opts: string): string {
  if (!opts) return "";
  if (opts.includes("=")) {
    return opts.split(";").map((o) => o.trim()).filter(Boolean).map((o) => {
      const [val, ar, en] = o.split("=");
      const v = isNaN(Number(val)) ? q(val) : val;
      return `{ value: ${v}, label: t(${q(en || ar || val)}, ${q(ar || en || val)}) }`;
    }).join(", ");
  }
  return opts.split("|").filter(Boolean).map((o) => {
    const [val, lab] = o.split(":");
    const v = isNaN(Number(val)) ? q(val) : val;
    return `{ value: ${v}, label: ${q(lab || val || "")} }`;
  }).join(", ");
}

function defaultValueJs(f: FieldConfigV4): string | null {
  const dv = (f.defaultValue || "").trim();
  if (!dv) return null;
  if (SESSION_VARS[dv]) return SESSION_VARS[dv];
  if (dv === "true" || dv === "false") return dv;
  if (f.inputType === "checkbox") return dv === "1" ? "true" : "false";
  if (!isNaN(Number(dv)) && f.inputType !== "text" && f.inputType !== "textarea") return dv;
  return q(dv);
}

// الأعمدة اللي بتستخدم نوافذ بحث (عشان الـ import)
export function usedSearchFns(cfg: ScreenConfigV5): string[] {
  const all = [...cfg.fields, ...cfg.listFields, ...cfg.details.flatMap((d) => d.fields)];
  return Array.from(new Set(all.map((f) => f.searchFn).filter(Boolean)));
}

function fieldToColumnCode(f: FieldConfigV4, md: boolean = false, cfg?: ScreenConfigV5): string {
  const props: [string, string][] = [];
  const set = (k: string, v: string) => {
    const i = props.findIndex((p) => p[0] === k);
    if (i >= 0) props[i] = [k, v];
    else props.push([k, v]);
  };

  const input = f.searchFn ? "search" : f.inputType || "text";
  set("field", q(f.field));
  set("title", `t(${q(f.titleEn || f.field)}, ${q(f.titleAr || f.titleEn || f.field)})`);
  if (input === "number" || input === "date" || input === "checkbox" || input === "select") set("type", q(input));
  if (input !== "text") set("inputType", q(input));
  if (input === "select" && f.options) set("selectOptions", `[${parseSelectOptions(f.options)}]`);
  if (input === "selectSearch" && (f.selectTable || f.selectValue)) {
    const parts: string[] = [];
    parts.push(`tableName: ${q(f.selectTable || "")}`);
    const ar = f.selectDisplay || "";
    const en = f.selectDisplayEn || "";
    const displayExpr = en && en !== ar
      ? `IsLangEN ? ${q(en)} : ${q(ar)}`
      : q(ar);
    parts.push(`displayField: ${displayExpr}`);
    parts.push(`valueField: ${q(f.selectValue || "")}`);
    if (f.selectCondition) parts.push(`condition: ${condJs(f.selectCondition)}`);
    set("selectConfig", `{ ${parts.join(", ")} }`);
  }
  if (f.searchFn) set("searchModal", `${f.searchFn}(${f.searchCond ? q(f.searchCond) : ""})`);
  if (md && f.fillFrom) set("fillFrom", fillFromToJs(f.fillFrom));
  if (md && f.formula) set("formula", formulaToJs(f.formula));
  if (f.width && f.width !== 150) set("width", String(f.width));

  if (!f.inGrid) set("IsVisibleDisplayInGrid", "false");
  if (!f.inForm || f.formula) {
    set("editable", "false");
    set("insertable", "false");
  }
  if (f.readOnly) {
    set("editable", "false");
    set("insertable", "false");
  }
  if (f.visibleWhen && f.visibleWhen.field) set("visibleWhen", `(r) => ${ruleJs(f.visibleWhen)}`);
  if (f.enabledWhen && f.enabledWhen.field) set("enabledWhen", `(r) => ${ruleJs(f.enabledWhen)}`);
  if (f.required) set("IsRequired", "true");
  if (!f.search) set("IsSearchColumn", "false");

  const dv = defaultValueJs(f);
  if (dv) set("DefaultValue", dv);
  if (f.auto && SESSION_VARS[f.auto]) {
    set("DefaultValue", SESSION_VARS[f.auto]);
    set("IsVisibleDisplayInGrid", "false");
    set("editable", "false");
    set("insertable", "false");
    set("visibleInView", "false");
  }

  // بيتحفظ إلا لو محسوب في القاعدة / موجود في الـ View بس / Formula في الجريد
  if (f.noSave || (!md && f.formula)) set("IsSave", "false");

  if (f.order && f.order !== 99) set("SortFieldInEditAndAdd", String(f.order));
  if (f.dateDisplayFormat) set("dateDisplayFormat", q(f.dateDisplayFormat));
  if (f.dateMode === "datetime") set("dateMode", q("datetime"));
  if (f.align && f.align !== "left") set("align", q(f.align));
  if (f.visibleInCreate === false) set("visibleInCreate", "false");
  if (f.visibleInEdit === false) set("visibleInEdit", "false");
  if (f.visibleInView === false) set("visibleInView", "false");

  // Inline status checkbox — بيضيف inlineToggle للعمود المحدد في إعدادات الشاشة
  if (cfg && cfg.inlineStatus?.enabled && cfg.inlineStatus.field && f.field === cfg.inlineStatus.field) {
    const s = cfg.inlineStatus;
    const parts: string[] = [];
    parts.push(`approveTrType: ${q(s.approveTrType || "")}`);
    parts.push(`unapproveTrType: ${q(s.unapproveTrType || "")}`);
    if (s.approvePermission) parts.push(`approvePermission: ${q(s.approvePermission)}`);
    if (s.unapprovePermission) parts.push(`unapprovePermission: ${q(s.unapprovePermission)}`);
    parts.push(`confirmBeforeChange: ${s.confirmBeforeChange !== false}`);
    set("inlineToggle", `{ ${parts.join(", ")} }`);
    set("type", q("checkbox"));
  }

  return "{\n" + props.map(([k, v]) => `  ${k}: ${v},`).join("\n") + "\n},";
}

// كود متغيرات الجلسة اللي في أول كل hook
function sessionBlock(): string {
  return `  const IsLangEN = useSys((s) => s.IsLangEN);
  const IsDark = useSys((s) => s.IsDark);
  const Session = useSys((s) => s.Session);

  const Env = Session?.CurrentEnvironment;
  const CompCode = Env?.CompCode || 1;
  const BranchCode = Env?.BranchCode || 1;
  const UserID = Env?.UserID || 0;
  const FinYear = Env?.FinYear || new Date().getFullYear();
  const UserName = Env?.Sys_CompanyAndUser?.USER_NAME || "";
  const Today = new Date().toISOString().substring(0, 10);
  const Now = new Date().toISOString().substring(0, 19);
  void UserID; void FinYear; void UserName; void Today; void Now;`;
}

function validationToCode(v: ValidationConfigV4): string {
  const parts: string[] = ["{"];
  if (v.detail > 0) parts.push(`  detail: ${v.detail},`);
  parts.push(`  type: ${q(v.type)},`);
  parts.push(`  field: ${q(v.field)},`);
  if (v.when !== "both") parts.push(`  when: ${q(v.when)},`);
  if (v.operator) parts.push(`  operator: ${q(v.operator)},`);
  if (v.compareTo) parts.push(`  compareTo: ${q(v.compareTo)},`);
  if (v.value) parts.push(`  value: ${q(v.value)},`);
  const numOrStr = (x: string) => (x.trim() !== "" && !isNaN(Number(x)) ? String(Number(x)) : q(x));
  if (v.min) parts.push(`  min: ${numOrStr(v.min)},`);
  if (v.max) parts.push(`  max: ${numOrStr(v.max)},`);
  if (v.pattern) parts.push(`  pattern: ${q(v.pattern)},`);
  if (v.table) parts.push(`  table: ${q(v.table)},`);
  if (v.condition) parts.push(`  condition: ${q(v.condition)},`);
  if (v.code) parts.push(`  check: (ctx) => { ${v.code} },`);
  parts.push(`  messageAr: ${q(v.messageAr)},`);
  parts.push(`  messageEn: ${q(v.messageEn)},`);
  parts.push("},");
  return parts.join("\n");
}

// ============================================================
// Generate .ts (logic hook)
// ============================================================

export function generateHookFile(cfg: ScreenConfigV5): string {
  const name = cfg.module || "NewScreen";
  const type = cfg.screenType;
  const isGrid = type === "Grid";
  const isTree = type === "Tree";
  const md = !isGrid; // ماستر ديتيل والشجرة بيستخدموا نفس نوع العمود
  const colType = md ? "MasterDetailColumn" : "DynamicGridColumn";
  const searchFns = usedSearchFns(cfg);
  const hasValidations = cfg.validations.length > 0;

  const extras = buildExtras(cfg);
  const needKey = isGrid || (type === "MasterDetail" && extras.needsGridKey);
  if (needKey && !extras.reactImports.includes("useState")) extras.reactImports.push("useState");

  // ---------- imports ----------
  const imports: string[] = [
    `import { ${extras.reactImports.join(", ")} } from "react";`,
    `import { useSys } from "../Shared/SystemUsing";`,
  ];
  if (isGrid) imports.push(`import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";`);
  if (type === "MasterDetail") {
    imports.push(`import { MasterDetailColumn, MasterDetailConfig } from "../Shared/Components/Import/ModelMasterDetail";`);
    imports.push(`import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";`);
  }
  if (isTree) {
    imports.push(`import { MasterDetailColumn } from "../Shared/Components/Import/ModelMasterDetail";`);
    imports.push(`import { TreeScreenConfig } from "../Shared/Components/Import/ModelTree";`);
  }
  if (hasValidations) imports.push(`import { ValidationRule } from "../Shared/Validation";`);
  extras.imports.forEach((i) => imports.push(i));
  if (searchFns.length) imports.push(`import { ${searchFns.join(", ")} } from "../Shared/G_SearchFrom";`);

  // ---------- ثوابت ----------
  const constants = [
    `const TableName = ${q(cfg.table)};`,
    `const ViewName = ${q(cfg.view || cfg.table)};`,
    `const KeyColumn = ${q(cfg.keyColumn)};`,
    `const TrType = ${q(cfg.processTrans ? cfg.trType : "")};`,
    `const RunProcessTrans = ${cfg.processTrans};`,
    `const ModuleCode = ${q(cfg.permissions.usePermissions ? cfg.module : "")};   // MODULE_CODE للصلاحيات (فاضي = من غير صلاحيات)`,
  ];

  // ---------- الشرط ----------
  const hasField = (f: string) => cfg.fields.some((x) => x.field.toLowerCase() === f.toLowerCase());
  const condParts: string[] = [];
  if (hasField("CompCode")) condParts.push("CompCode = ${CompCode}");
  if (cfg.extraCondition.trim()) condParts.push(`(${cfg.extraCondition.trim().replace(/`/g, "\\`")})`);
  const conditionJs = "`" + condParts.join(" AND ") + "`";

  const memo = (varName: string, typeName: string, body: string, deps: string) =>
    `  const ${varName} = useMemo<${typeName}[]>(\n    () => [\n${indent(body, 6)}\n    ],\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n    [${deps}]\n  );`;

  const sections: string[] = [];
  sections.push(memo(isGrid ? "Columns" : "MasterColumns", colType, cfg.fields.map((f) => fieldToColumnCode(f, md, cfg)).join("\n"), "IsLangEN, CompCode, BranchCode"));

  if (type === "MasterDetail") {
    const list = cfg.listFields.length ? cfg.listFields : cfg.fields.filter((f) => f.inGrid);
    sections.push(memo("ListColumns", "DynamicGridColumn", list.map((f) => fieldToColumnCode(f, false, cfg)).join("\n"), "IsLangEN, CompCode, BranchCode"));
  }

  const detailNames: string[] = [];
  cfg.details.forEach((d, i) => {
    const dn = `Detail${i + 1}Columns`;
    detailNames.push(dn);
    sections.push(memo(dn, "MasterDetailColumn", d.fields.map((f) => fieldToColumnCode(f, true, cfg)).join("\n"), "IsLangEN, CompCode, BranchCode"));
  });

  if (!isTree) sections.push(memo("FilterFields", "FilterFieldConfig", extras.filterItems, extras.filterDeps));

  if (hasValidations) sections.push(memo("Validations", "ValidationRule", cfg.validations.map(validationToCode).join("\n"), "IsLangEN"));

  const detailsArr = cfg.details
    .map((d, i) => `        {
          title: t(${q(d.titleEn || d.table)}, ${q(d.titleAr || d.titleEn || d.table)}),
          tableName: ${q(d.table)},
          viewName: ${q(d.view || d.table)},
          keyColumn: ${q(d.keyColumn)},
          foreignKeyColumn: ${q(d.foreignKey)},
          columns: Detail${i + 1}Columns,
          totals: ${d.totals ? parseTotals(d.totals) : "[]"},
          orderBy: ${q(d.orderBy || d.keyColumn)},
        },`)
    .join("\n");

  const commonSave = `      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,${hasValidations ? "\n      validations: Validations," : ""}
      enableInsert: ${cfg.permissions.insert},
      enableUpdate: ${cfg.permissions.edit},
      enableDelete: ${cfg.permissions.delete},`;

  let configCode = "";
  let returnObj = "";
  if (isGrid) {
    const hasFV = cfg.filterArea.length > 0;
    returnObj = `  return {
    IsLangEN,
    IsDark,
    gridKey,
    RefreshGrid,
    filterReady,${hasFV ? "\n    onFilterChange," : ""}${extras.hasToolbar ? "\n    ToolbarButtons," : ""}${extras.hasRowActions ? "\n    RowActions," : ""}${extras.hasTx ? "\n    onPrintTransaction," : ""}
    grid: { TableName, ViewName, KeyColumn, TrType, RunProcessTrans, Condition, CompCode, BranchCode, Columns, FilterFields, ModuleCode${extras.formLayoutCode ? ", FormLayoutCells" : ""}${extras.hasExcel ? ", Excel: ExcelCfg" : ""} },
  };`;
  } else if (type === "MasterDetail") {
    configCode = `  const Config = useMemo<MasterDetailConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      columns: MasterColumns,
      listColumns: ListColumns,
      details: [
${detailsArr}
      ],
      condition: Condition,
      orderBy: ${q(cfg.orderBy || cfg.keyColumn)},
      orderType: ${q(cfg.orderType)},
      pageSize: ${cfg.pageSize},
      filterFields: FilterFields,${extras.formLayoutCode ? "\n      formLayout: FormLayoutCells," : ""}${cfg.permissions.usePermissions ? "\n      moduleCode: ModuleCode," : ""}${extras.hasTx ? "\n      onPrint: onPrintTransaction," : ""}${extras.hasExcel ? "\n      excel: ExcelCfg," : ""}
${commonSave}
      newTitle: t(${q("New " + (cfg.titleEn || name))}, ${q("إضافة " + (cfg.titleAr || name))}),
      editTitle: t(${q(cfg.titleEn || name)}, ${q(cfg.titleAr || name)}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode, MasterColumns, ListColumns${detailNames.map((d) => ", " + d).join("")}, FilterFields${hasValidations ? ", Validations" : ""}${extras.hasExcel ? ", ExcelCfg" : ""}]
  );`;
    returnObj = `  return { IsLangEN, IsDark, Config, filterReady${needKey ? ", gridKey" : ""}${extras.hasToolbar ? ", ToolbarButtons" : ""} };`;
  } else {
    const tr = cfg.tree;
    const opt = (k: string, v: string) => (v ? `\n      ${k}: ${q(v)},` : "");
    const searchCols = tr.searchColumns.split(",").map((x) => x.trim()).filter(Boolean);
    configCode = `  const Config = useMemo<TreeScreenConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      codeColumn: ${q(tr.codeColumn)},
      parentColumn: ${q(tr.parentColumn)},
      titleColumn: ${q(tr.titleColumn)},${opt("titleColumnEn", tr.titleColumnEn)}${opt("levelColumn", tr.levelColumn)}${opt("leafColumn", tr.leafColumn)}${opt("activeColumn", tr.activeColumn)}
      autoCode: ${tr.autoCode},
      codeDigits: ${tr.codeDigits || 2},
      codeSeparator: ${q(tr.codeSeparator || "")},
      columns: MasterColumns,
      details: [
${detailsArr}
      ],
      condition: Condition,
      orderBy: ${q(cfg.orderBy || tr.codeColumn)},
      pageSize: ${tr.treePageSize || 50},${searchCols.length ? `\n      searchColumns: [${searchCols.map(q).join(", ")}],` : ""}
${commonSave}
      treeTitle: t(${q(cfg.titleEn || name)}, ${q(cfg.titleAr || name)}),
      newRootTitle: t("New root", "جذر جديد"),
      newChildTitle: t("New child", "إضافة ابن"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode, MasterColumns${detailNames.map((d) => ", " + d).join("")}${hasValidations ? ", Validations" : ""}]
  );`;
    returnObj = `  return { IsLangEN, IsDark, Config };`;
  }

  const v3json = JSON.stringify(convertV4toV3(cfg));
  const v4json = JSON.stringify(cfg);

  return `"use client";

${imports.join("\n")}

// =======================
// #region ثوابت الشاشة
// =======================
${constants.join("\n")}
// #endregion

// =======================
// ${name}  (${type})
// =======================
export function ${name}() {
  // =======================
  // #region UsingSystem
  // =======================
${sessionBlock()}
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);
${needKey ? `
  const [gridKey, setGridKey] = useState(0);
  function RefreshGrid() { setGridKey((k) => k + 1); }
` : ""}
  const Condition = ${conditionJs};
${isTree ? "" : "\n" + extras.block + "\n"}${extras.formLayoutCode ? "\n" + extras.formLayoutCode + "\n" : ""}
  // =======================
  // #region الأعمدة
  // =======================
${sections.join("\n\n")}
  // #endregion
${configCode ? "\n" + configCode + "\n" : ""}
${returnObj}
}
// @CreatePageReact-Settings: ${v3json}
// @ScreenBuilder-Settings: ${v4json}
`;
}

// ============================================================
// Generate page.tsx
// ============================================================

function toolbarJsx(ex: Extras): string {
  if (!ex.hasToolbar) return "";
  return `        <div className="flex flex-wrap items-center gap-2">
          {p.ToolbarButtons.map((b) => (
            <button key={b.key} onClick={b.onClick} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-erp-border-strong bg-erp-surface text-erp-text text-[13px] font-medium hover:bg-erp-surface-2 transition">
              {b.icon && <i className={\`fa-solid \${b.icon}\`} />}
              {b.label}
            </button>
          ))}
        </div>`;
}

function gridExtraProps(cfg: ScreenConfigV5, ex: Extras): string {
  const out: string[] = [];
  if (cfg.permissions.usePermissions) out.push("moduleCode={p.grid.ModuleCode}");
  if (ex.formLayoutCode) out.push("formLayout={p.grid.FormLayoutCells}");
  if (cfg.filterArea.length > 0) out.push("onGridFilterChange={p.onFilterChange}");
  if (cfg.filterArea.some((f) => f.required)) out.push("deferLoadUntilFilter");
  if (ex.hasRowActions) out.push("extraActions={p.RowActions}");
  if (ex.hasTx) out.push("enablePrint", "onPrint={(row) => p.onPrintTransaction(row)}");
  if (ex.hasExcel) out.push("excel={p.grid.Excel}");
  return out.length ? "\n          " + out.join("\n          ") : "";
}

// Helpers for the header date-range filter in page.tsx
function headerFilterSessionBlock(cfg: ScreenConfigV5): string {
  if (!cfg.headerFilter?.enabled) return "";
  const hf = cfg.headerFilter;
  const fromExpr = hf.fromDefault === "yearStart"
    ? "`${FinYear}-01-01`"
    : "new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10)";
  const toExpr = hf.toDefault === "yearEnd"
    ? "`${FinYear}-12-31`"
    : "new Date().toISOString().slice(0,10)";
  return `
  const Session = useSys((s) => s.Session);
  const FinYear = Session?.CurrentEnvironment?.FinYear || new Date().getFullYear();
  const [fromDate, setFromDate] = useState<string>(${fromExpr});
  const [toDate, setToDate] = useState<string>(${toExpr});
  const headerFilterClause = (fromDate && toDate)
    ? \` AND ${hf.field} >= '\${fromDate}' AND ${hf.field} <= '\${toDate}'\`
    : "";`;
}

function headerFilterUI(cfg: ScreenConfigV5): string {
  if (!cfg.headerFilter?.enabled) return "";
  const hf = cfg.headerFilter;
  return `
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className={\`text-[11px] block \${muted}\`}>{IsLangEN ? "${(hf.labelEn || "From").replace(/"/g, '\\"')}" : "${(hf.labelAr || "من").replace(/"/g, '\\"')}"} ({IsLangEN ? "From" : "من"})</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={\`px-2 py-1.5 rounded-lg border text-sm \${d ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}\`} />
            </div>
            <div>
              <label className={\`text-[11px] block \${muted}\`}>{IsLangEN ? "${(hf.labelEn || "To").replace(/"/g, '\\"')}" : "${(hf.labelAr || "إلى").replace(/"/g, '\\"')}"} ({IsLangEN ? "To" : "إلى"})</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={\`px-2 py-1.5 rounded-lg border text-sm \${d ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}\`} />
            </div>
            {(!fromDate || !toDate) && (
              <span className="text-[11px] text-amber-500 self-center">{IsLangEN ? "Filter required" : "الفلتر مطلوب"}</span>
            )}
          </div>`;
}

export function generatePageFile(cfg: ScreenConfigV5): string {
  const ex = buildExtras(cfg);
  const name = cfg.module || "NewScreen";
  const isGrid = cfg.screenType === "Grid";
  const icon = cfg.icon || "fa-table-list";
  if (cfg.screenType === "Tree") return generateTreePageFile(cfg);
  const hfEnabled = !!cfg.headerFilter?.enabled;

  if (isGrid) {
    return `"use client";

import { ${name} } from "./${name}";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import DynamicGrid from "../Shared/Components/Import/DynamicGrid";${hfEnabled ? '\nimport { useState } from "react";' : ""}

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}EN.css" />
  ) : (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}AR.css" />
  );

  const page = ${name}();
  return <${name}Page {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof ${name}>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function ${name}Page(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  ${hfEnabled ? "const IsLangEN = p.IsLangEN;" : "void p.IsLangEN;"}
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
  const btnSecondary = d ? "bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500" : "bg-white border-gray-300 text-gray-700 hover:border-blue-600";
${headerFilterSessionBlock(cfg)}

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-3 space-y-2">${hfEnabled ? `
        <div className="flex items-center justify-between gap-2 flex-wrap">${headerFilterUI(cfg)}
          <button onClick={p.RefreshGrid} className={\`px-3 py-1.5 rounded-lg border font-medium text-sm transition \${btnSecondary}\`}>
            <i className="fa-solid fa-rotate mx-1"></i> {L.${camel(name)}_refresh}
          </button>
        </div>` : ""}

${toolbarJsx(ex)}
        {p.filterReady && (
        <DynamicGrid
          key={p.gridKey}
          tableName={p.grid.TableName}
          keyColumn={p.grid.KeyColumn}
          columns={p.grid.Columns}
          condition={${hfEnabled ? "p.grid.Condition + headerFilterClause" : "p.grid.Condition"}}
          orderBy={p.grid.KeyColumn}
          orderType="${cfg.orderType}"
          pageSize={${cfg.pageSize}}
          compCode={p.grid.CompCode}
          branchCode={p.grid.BranchCode}
          keyTrType={p.grid.TrType}
          runProcessTrans={p.grid.RunProcessTrans}
          height="calc(100vh - 80px)"
          enableInsert={${cfg.permissions.insert}}
          enableUpdate={${cfg.permissions.edit}}
          enableDelete={${cfg.permissions.delete}}
          enableSearch={true}
          enableExport={${cfg.permissions.export}}
          enableSort={true}
          enableAdvancedFilter={true}
          filterFields={p.grid.FilterFields}${gridExtraProps(cfg, ex)}
        />
        )}
      </div>
    </>
  );
}
`;
  }

  // MasterDetail page
  return `"use client";

import { ${name} } from "./${name}";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import MasterDetail from "../Shared/Components/Import/MasterDetail";${hfEnabled ? '\nimport { useMemo, useState } from "react";' : ""}

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}EN.css" />
  ) : (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}AR.css" />
  );

  const page = ${name}();
  return <${name}Page {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof ${name}>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function ${name}Page(p: Props) {
  const L = p.Lang;
  const d = p.IsDark;
  ${hfEnabled ? "const IsLangEN = p.IsLangEN;" : "void p.IsLangEN;"}
  const card = d ? "bg-gray-900/80 border-gray-700/60 text-gray-100" : "bg-white/90 border-gray-200 text-gray-800";
  const muted = d ? "text-gray-400" : "text-gray-500";
${headerFilterSessionBlock(cfg)}
${hfEnabled ? `  const FilteredConfig = useMemo(() => ({ ...p.Config, condition: (p.Config.condition || "") + headerFilterClause }), [p.Config, fromDate, toDate]);` : ""}

  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-3 space-y-2">${hfEnabled ? `
        <div className="flex items-center gap-2 flex-wrap">${headerFilterUI(cfg)}
        </div>` : ""}

${toolbarJsx(ex)}
        {p.filterReady && <MasterDetail${ex.needsGridKey ? " key={p.gridKey}" : ""} config={${hfEnabled ? "FilteredConfig" : "p.Config"}} />}
      </div>
    </>
  );
}
`;
}

// ============================================================
// page.tsx — شاشة شجرة
// ============================================================

export function generateTreePageFile(cfg: ScreenConfigV5): string {
  const name = cfg.module || "NewScreen";
  const icon = cfg.icon || "fa-sitemap";
  return `"use client";

import { ${name} } from "./${name}";
import { useTranslate } from "../../ClientApp/Shared/Resources";
import { useSys } from "../Shared/SystemUsing";
import TreeScreen from "../Shared/Components/Import/TreeScreen";

export default function InitalizeComponent() {
  const Lang = useTranslate();
  const IsLangEN = useSys((s) => s.IsLangEN);

  const stylesheet = IsLangEN ? (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}EN.css" />
  ) : (
    <link id="lang-style_${name}" rel="stylesheet" href="/StyleDesign/Pages/${name}/${name}AR.css" />
  );

  const page = ${name}();
  return <${name}Page {...page} Lang={Lang} stylesheet={stylesheet} />;
}

type _ReturnType = ReturnType<typeof ${name}>;
type Props = _ReturnType & { Lang: ReturnType<typeof useTranslate>; stylesheet: any };

function ${name}Page(p: Props) {
  void p.Lang; void p.IsDark;
  return (
    <>
      {p.stylesheet}
      <div className="p-2 md:p-3">
        <TreeScreen config={p.Config} />
      </div>
    </>
  );
}
`;
}

// ============================================================
// Utility
// ============================================================

function guessFilterType(f: FieldConfigV4): string {
  if (f.inputType === "date") return "date";
  if (f.inputType === "number") return "number";
  if (f.inputType === "checkbox") return "boolean";
  if (f.inputType === "select") return "select";
  return "text";
}

function parseTotals(totals: string): string {
  if (!totals) return "[]";
  // "ItemsTotal=LineTotal;ItemsCount=count"  أو  "ItemsTotal:LineTotal:sum|ItemsCount::count"
  return "[" + totals.split(/[;|]/).map(x => x.trim()).filter(Boolean).map(t => {
    const parts = t.split(/[=:]/).map(x => x.trim());
    const mf = parts[0] || "";
    let df = parts[1] || "";
    let tp = parts[2] || "sum";
    if (df.toLowerCase() === "count") { df = ""; tp = "count"; }
    return tp === "count"
      ? `{ masterField: ${q(mf)}, type: "count" }`
      : `{ masterField: ${q(mf)}, detailField: ${q(df)}, type: "sum" }`;
  }).join(", ") + "]";
}

// ============================================================
// Generate SQL Permissions Script
// ============================================================

export function generateSqlScript(cfg: ScreenConfigV5, database: string): string {
  const p = cfg.permissions;
  const module = cfg.module || "NewScreen";
  const s = (v: string) => (v || "").replace(/'/g, "''");
  const ids = Array.from(new Set((p.roles || "").split(/[,; ]+/).map((x) => parseInt(x, 10)).filter((x) => !isNaN(x))));
  const roles = ids.length === 0
    ? "INSERT INTO @Roles (RoleId) SELECT DISTINCT RoleId FROM dbo.Sys_RoleUsers WHERE ISActive = 1;   -- كل دور عليه مستخدمين فعالين"
    : "INSERT INTO @Roles (RoleId) VALUES " + ids.map((x) => `(${x})`).join(", ") + ";";

  let sql = `-- =====================================================================================
--  إضافة شاشة "${s(cfg.titleAr || module)}" (${module}) في Sys_Modules و Sys_RoleModule
--  اتعمل أوتوماتيك من ScreenBuilder (نفس سكريبت أداة CreatePageReact)
--  السكريبت ينفع يتشغل أكتر من مرة من غير ما يكرر حاجة
-- =====================================================================================
USE [${database}];
GO

SET NOCOUNT ON;

DECLARE @ModuleCode NVARCHAR(100) = N'${module}';      -- لازم = اسم الفولدر في ClientApp
DECLARE @DescA      NVARCHAR(200) = N'${s(cfg.titleAr || module)}';
DECLARE @DescE      NVARCHAR(200) = N'${s(cfg.titleEn || module)}';
DECLARE @ParentMenu NVARCHAR(100) = N'${s(p.parentMenu)}';      -- '' = تظهر في أول القائمة
DECLARE @IconColor  NVARCHAR(50)  = N'${s(cfg.iconColor || "indigo")}';

DECLARE @Roles TABLE (RoleId INT PRIMARY KEY);
${roles}

DECLARE @Sort INT = ISNULL((SELECT MAX(MODULE_SORT) FROM dbo.Sys_Modules
                            WHERE ISNULL(MODULE_MENU, N'') = @ParentMenu), 0) + 1;

BEGIN TRY
    BEGIN TRAN;

    -- 1) Sys_Modules
    IF NOT EXISTS (SELECT 1 FROM dbo.Sys_Modules WHERE MODULE_CODE = @ModuleCode)
    BEGIN
        INSERT INTO dbo.Sys_Modules
            (MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,
             MODULE_TYPE, MODULE_SORT, IS_Show,
             [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
             CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
             AVAILABLE, Images_Enabled)
        VALUES
            (@ModuleCode, @ParentMenu, @DescE, @DescA, N'', @IconColor,
             N'S', @Sort, 1,
             1, 1, 1, 1, 1,
             0, 0, 0, 0, 0, 0, 0, 0, 0,
             1, 0);
        PRINT N'✅ اتضافت في Sys_Modules';
    END
    ELSE
        PRINT N'ℹ️ موجودة بالفعل في Sys_Modules';

    -- 2) Sys_RoleModule (صلاحيات كاملة)
    INSERT INTO dbo.Sys_RoleModule
        (RoleId, MODULE_CODE, MODULE_MENU, MODULE_DESCE, MODULE_DESCA, Url_Image, Icon_Color,
         MODULE_TYPE, MODULE_SORT, IS_Show,
         [EXECUTE], [CREATE], EDIT, [DELETE], [PRINT], [VIEW],
         CUSTOM1, CUSTOM2, CUSTOM3, CUSTOM4, CUSTOM5, CUSTOM6, CUSTOM7, CUSTOM8, CUSTOM9,
         ViewImages, EditImages, Prc_Preference)
    SELECT
         r.RoleId, m.MODULE_CODE, m.MODULE_MENU, m.MODULE_DESCE, m.MODULE_DESCA, m.Url_Image, m.Icon_Color,
         m.MODULE_TYPE, m.MODULE_SORT, 1,
         1, 1, 1, 1, 1, 1,
         0, 0, 0, 0, 0, 0, 0, 0, 0,
         0, 0, 1
    FROM @Roles r
    CROSS JOIN dbo.Sys_Modules m
    WHERE m.MODULE_CODE = @ModuleCode
      AND NOT EXISTS (SELECT 1 FROM dbo.Sys_RoleModule x
                      WHERE x.RoleId = r.RoleId AND x.MODULE_CODE = @ModuleCode);

    PRINT N'✅ اتضافت لـ ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + N' دور في Sys_RoleModule';

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT N'❌ حصل خطأ ومفيش حاجة اتحفظت';
    THROW;
END CATCH;
GO
`;

  if (cfg.processTrans) {
    const tr = s(cfg.trType);
    sql += `
-- =====================================================================
-- ⚠️ G_ProcessTrans: لازم يكون فيه جزء للنوع '${tr}' وإلا الحفظ هيفشل
-- انسخ ده جوه الإجراء (مكان التعليق ➕) لو مش موجود:
-- =====================================================================
/*
		if @TrType = '${tr}'
		begin
			Set @TrNo = 1
			-- اكتب هنا اللي محتاج يحصل بعد الإضافة / التعديل / الحذف (@OpMode)
			set @r = 0
		END
*/
`;
  }
  return sql;
}

// ============================================================
// Generate Resources.ts entries
// ============================================================

export function generateResourcesEntries(cfg: ScreenConfigV5): { en: string; ar: string } {
  const name = camel(cfg.module || "newScreen");
  const en = [
    `  ${name}_title: "${cfg.titleEn || cfg.module}",`,
    `  ${name}_subtitle: "${cfg.subEn || ""}",`,
    `  ${name}_refresh: "Refresh",`,
  ].join("\n");
  const ar = [
    `  ${name}_title: "${cfg.titleAr || cfg.module}",`,
    `  ${name}_subtitle: "${cfg.subAr || ""}",`,
    `  ${name}_refresh: "تحديث",`,
  ].join("\n");
  return { en, ar };
}

// ============================================================
// Generate Routes.tsx entry
// ============================================================

export function generateRoutesEntry(module: string): string {
  return `  ${module}: HomeLayout,`;
}
