// فحص الإعدادات قبل الحفظ + استيراد "أفضل جهد" لشاشة من غير ماركر
import { ScreenConfigV5, createEmptyScreen, createEmptyField, normalizeConfig } from "../types/ScreenConfig";

export interface CheckResult { errors: string[]; warnings: string[] }

export function checkConfig(cfg: ScreenConfigV5, t: (en: string, ar: string) => string): CheckResult {
  const errors: string[] = [], warnings: string[] = [];
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(cfg.module || "")) errors.push(t("Screen code is required (English letters, numbers, _)", "كود الشاشة مطلوب (حروف انجليزي وأرقام و _ بس)"));
  if (!cfg.table) errors.push(t("Choose the save table and load its columns", "اختار جدول الحفظ وحمّل أعمدته"));
  if (!cfg.keyColumn) errors.push(t("Key column is missing", "عمود المفتاح مش متحدد"));
  if (cfg.fields.length === 0) errors.push(t("No columns loaded", "مفيش أعمدة متحمّلة"));
  if (cfg.screenType === "Tree" && (!cfg.tree.codeColumn || !cfg.tree.parentColumn || !cfg.tree.titleColumn))
    errors.push(t("Tree: choose code, parent and name columns", "الشجرة: اختار عمود الكود والأب والاسم"));
  if (!cfg.titleAr && !cfg.titleEn) warnings.push(t("Screen title is empty", "عنوان الشاشة فاضي"));
  for (const f of [...cfg.fields, ...cfg.details.flatMap((d) => d.fields)]) {
    if (f.inputType === "select" && !f.options) errors.push(t(`Fixed list "${f.field}" has no options`, `القايمة الثابتة "${f.field}" مفيهاش اختيارات`));
    if (f.inputType === "selectSearch" && (!f.selectTable || !f.selectValue || !f.selectDisplay)) errors.push(t(`Dropdown "${f.field}": table, value and display columns are required`, `الدروب داون "${f.field}": الجدول وعمود القيمة والعرض مطلوبين`));
    if (f.formula && /[`;]/.test(f.formula)) errors.push(t(`Formula in ${f.field} has a forbidden character`, `المعادلة في ${f.field} فيها علامة مش مسموحة`));
    if (f.selectCondition && /[`;]|--/.test(f.selectCondition)) errors.push(t(`Condition of ${f.field} has a forbidden character`, `شرط ${f.field} فيه علامة مش مسموحة`));
  }
  if (cfg.screenType !== "Tree") {
    for (const c of cfg.layout.sections.flatMap((s) => s.rows.flatMap((r) => r.cells))) {
      if (!["label", "heading", "divider", "button"].includes(c.kind) && !c.field) warnings.push(t("A control on the form is not bound to a column (it will be ignored)", "فيه عنصر في الفورم مش مربوط بعمود (هيتجاهل)"));
    }
    if (cfg.layout.sections.length === 0 || !cfg.layout.sections.some((s) => s.rows.length)) warnings.push(t("The form is empty", "الفورم فاضي"));
    for (const fc of cfg.filterArea) {
      if (!fc.field) errors.push(t("A filter control has no target column", "فيه عنصر فلتر من غير عمود"));
      if (fc.source && (!fc.source.table || !fc.source.valueField || !fc.source.displayField)) errors.push(t(`Filter "${fc.field}": complete the dropdown source`, `الفلتر "${fc.field}": كمّل مصدر الدروب داون`));
      if (fc.source && /[`;]|--/.test(fc.source.condition)) errors.push(t(`Filter "${fc.field}": forbidden character in condition`, `الفلتر "${fc.field}": علامة مش مسموحة في الشرط`));
    }
    for (const a of cfg.actions) {
      if (!a.proc) errors.push(t(`Button "${a.labelEn || a.labelAr}" has no procedure`, `الزر "${a.labelAr || a.labelEn}" من غير إجراء`));
      for (const p of a.params) if (p.source !== "const" && !p.value) warnings.push(t(`Button "${a.labelEn}": parameter @${p.name} is not mapped`, `الزر "${a.labelAr}": الباراميتر @${p.name} مش مربوط`));
    }
  }
  for (const [i, d] of cfg.details.entries()) if (!d.table || !d.foreignKey) errors.push(t(`Detail ${i + 1}: table and foreign key are required`, `التفصيل ${i + 1}: الجدول والمفتاح الأجنبي مطلوبين`));
  if (cfg.print.listPrint.enabled && !cfg.print.listPrint.proc) warnings.push(t("List printing is on but no procedure chosen", "طباعة القايمة شغالة من غير إجراء"));
  if (cfg.print.transactionPrint.enabled && !cfg.print.transactionPrint.proc) warnings.push(t("Transaction printing is on but no procedure chosen", "طباعة المستند شغالة من غير إجراء"));
  if (cfg.importedBestEffort) warnings.push(t("Imported best-effort from code: saving regenerates the whole screen from what you see here", "الشاشة مستوردة بأفضل جهد من الكود: الحفظ هيولّد الشاشة كلها من اللي قدامك"));
  return { errors, warnings };
}

/** استيراد شاشة قديمة من غير ماركر (قراءة بالـ regex: الجدول + الأعمدة وعناوينها) */
export function importFromTs(text: string, module: string): ScreenConfigV5 {
  const isMD = /MasterDetailConfig/.test(text);
  const cfg = createEmptyScreen(isMD ? "MasterDetail" : "Grid");
  cfg.module = module;
  cfg.titleAr = module; cfg.titleEn = module;
  const g = (re: RegExp) => (text.match(re) || [])[1] || "";
  cfg.table = g(/const\s+TableName\s*=\s*"([^"]+)"/);
  cfg.view = g(/const\s+ViewName\s*=\s*"([^"]+)"/) || cfg.table;
  cfg.keyColumn = g(/const\s+KeyColumn\s*=\s*"([^"]+)"/);
  cfg.trType = g(/const\s+TrType\s*=\s*"([^"]*)"/);
  cfg.processTrans = /const\s+RunProcessTrans\s*=\s*true/.test(text);
  const seen = new Set<string>();
  const re = /field:\s*"([A-Za-z_][A-Za-z0-9_]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    if (seen.has(name)) continue;
    const chunk = text.substring(m.index, m.index + 700);
    const end = chunk.indexOf("\n      },");
    const body = end > 0 ? chunk.substring(0, end) : chunk;
    // نقف عند أول فلتر (type: "text" بعد label:) — بنتجاهل تعريفات الفلاتر
    if (/\blabel:/.test(body.split("\n")[0] + (body.split("\n")[1] || "")) && !/title:/.test(body)) continue;
    seen.add(name);
    const f = createEmptyField(name);
    const tt = body.match(/title:\s*t\("([^"]*)",\s*"([^"]*)"\)/);
    if (tt) { f.titleEn = tt[1]; f.titleAr = tt[2]; }
    const ty = body.match(/\btype:\s*"(number|date|checkbox|select)"/);
    if (ty) f.inputType = ty[1];
    if (/IsRequired:\s*true/.test(body)) f.required = true;
    if (/IsVisibleDisplayInGrid:\s*false/.test(body)) { f.inGrid = false; f.inForm = false; f.inFilter = false; }
    if (/IsSave:\s*false/.test(body)) { f.noSave = true; f.inForm = false; }
    f.order = seen.size;
    cfg.fields.push(f);
  }
  cfg.importedBestEffort = true;
  return normalizeConfig(cfg);
}
