// =====================================================================================
//  📄 Shared/Components/Excel/ExcelTemplate.ts  —  بناء ملف التمبلت وقراءة الملف المرفوع (exceljs)
// -------------------------------------------------------------------------------------
//  • مكتبة exceljs بتتحمّل بـ import() لما اليوزر يدوس الزرار بس (مش بتتقل الصفحة).
//  • الملف نقي (من غير React / قاعدة بيانات) عشان يتجرّب في Node.
//
//  شكل الملف:
//    شيت "Data"          : الصف الأول عناوين (سطر 1 = الاسم، سطر 2 = اسم الحقل التقني)، وبعده الصفوف.
//    شيت "Instructions"  : تعليمات عربي + إنجليزي وجدول الأعمدة.
//    شيت "Lists" (مخفي)  : القيم المسموحة للقوائم المنسدلة.
//
//  أوضاع التمبلت:
//    grid    : كل صف = سجل واحد.
//    multi   : معاملات كتير. أول عمود GroupNo (رقم المعاملة). الصفوف اللي ليها نفس الرقم = معاملة واحدة.
//              ✅ بيانات الماستر بتتكتب في أول صف للمعاملة بس (الصفوف اللي بعده بتسيب أعمدة الماستر فاضية).
//              لو اتكتبت في صف تاني ومختلفة عن الأول بتتعتبر خطأ.
//    details : سطور تفاصيل بس (بتتضاف للفاتورة المفتوحة) — من غير GroupNo.
// =====================================================================================

import {
  ERROR_HEADERS, GROUP_HEADERS, isBlank, isoFromSerial, makeLabel, normText,
} from "./ExcelCore";
import {
  ExcelColumnSpec, ExcelErrorRow, ExcelTemplateSpec, ParsedSheet, RawExcelRow, colKey,
} from "./ExcelTypes";

export const SHEET_DATA = "Data";
export const SHEET_HELP = "Instructions";
export const SHEET_LISTS = "Lists";

async function loadExcelJS(): Promise<any> {
  const mod: any = await import("exceljs");
  return mod.default ?? mod;
}

const COLORS = {
  master: "FF1F3A5F",
  detail: "FF2E7D32",
  group: "FF616161",
  error: "FFB3261E",
  helpBg: "FFF3F6FA",
  border: "FFB0BEC5",
};

function widthOf(c: ExcelColumnSpec): number {
  if (c.width) return Math.max(10, Math.min(60, Math.round(c.width / 7)));
  if (c.lookup || c.options) return 30;
  switch (c.type) {
    case "date": return 14;
    case "number": case "decimal": return 14;
    case "bool": return 10;
    default: return 26;
  }
}

function numFmtOf(c: ExcelColumnSpec): string | undefined {
  if (c.lookup || c.options) return "@";
  switch (c.type) {
    case "text": return "@";
    case "date": return "yyyy-mm-dd";
    case "decimal": return "#,##0.00##";
    case "number": return "General";
    default: return undefined;
  }
}

export function columnHeader(c: ExcelColumnSpec): string {
  return `${c.title}${c.required ? " *" : ""}\n${c.field}`;
}

function typeLabel(c: ExcelColumnSpec, ar: boolean): string {
  if (c.options || c.lookup) return ar ? "اختار من القائمة" : "Pick from list";
  switch (c.type) {
    case "number": return ar ? "رقم" : "Number";
    case "decimal": return ar ? "رقم عشري" : "Decimal";
    case "date": return ar ? "تاريخ (yyyy-mm-dd)" : "Date (yyyy-mm-dd)";
    case "bool": return ar ? "نعم / لا" : "Yes / No";
    default: return ar ? "نص" : "Text";
  }
}

const YES_NO = (ar: boolean) => (ar ? ["نعم", "لا"] : ["Yes", "No"]);

/** يبني ملف الإكسل (بيرجّع بايتات .xlsx). errorRows = ملف أخطاء بنفس الأعمدة + عمود رسالة الخطأ */
export async function buildTemplateBytes(spec: ExcelTemplateSpec, errorRows?: ExcelErrorRow[]): Promise<Uint8Array> {
  const ExcelJS = await loadExcelJS();
  const ar = spec.lang === "ar";
  const wb = new ExcelJS.Workbook();
  wb.creator = "ERP";
  wb.created = new Date();

  const ws = wb.addWorksheet(SHEET_DATA, {
    views: [{ state: "frozen", ySplit: 1, xSplit: spec.mode === "multi" ? 1 : 0, rightToLeft: ar }],
  });
  const help = wb.addWorksheet(SHEET_HELP, { views: [{ rightToLeft: ar, showGridLines: false }] });
  const lists = wb.addWorksheet(SHEET_LISTS, { state: "hidden" });

  const hasGroup = spec.mode === "multi";
  const cols = spec.columns;
  const offset = hasGroup ? 1 : 0;
  const rowsN = Math.max(50, spec.validationRows ?? 1000);

  // ---------- شيت القوائم ----------
  let listCol = 0;
  const listRef: Record<string, string> = {};
  const addList = (id: string, values: string[]) => {
    if (!values.length) return;
    listCol++;
    const col = lists.getColumn(listCol);
    lists.getCell(1, listCol).value = id;
    values.forEach((v, i) => { lists.getCell(i + 2, listCol).value = v; });
    listRef[id] = `${SHEET_LISTS}!$${col.letter}$2:$${col.letter}$${values.length + 1}`;
  };
  for (const c of cols) {
    const k = colKey(c);
    if (c.options && c.options.length) addList(k, c.options.map((o) => o.label));
    else if (c.lookup) {
      const d = spec.lookups[k];
      if (d && d.items.length) addList(k, d.items.map((i) => i.label || makeLabel(i.code, i.name, i.key)));
    } else if (c.type === "bool") addList(k, YES_NO(ar));
  }

  // ---------- العناوين ----------
  const headers: { text: string; color: string; col?: ExcelColumnSpec }[] = [];
  if (hasGroup) headers.push({ text: `${ar ? "رقم المعاملة" : "Transaction No"} *\nGroupNo`, color: COLORS.group });
  for (const c of cols) headers.push({ text: columnHeader(c), color: c.scope === "detail" && hasGroup ? COLORS.detail : c.scope === "detail" ? COLORS.detail : COLORS.master, col: c });
  if (errorRows) headers.push({ text: `${ar ? "رسالة الخطأ" : "Error message"}\nError`, color: COLORS.error });

  headers.forEach((h, i) => {
    const cell = ws.getCell(1, i + 1);
    cell.value = h.text;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: h.color } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    const column = ws.getColumn(i + 1);
    const c = h.col;
    column.width = c ? widthOf(c) : h.text.includes("Error") ? 50 : 16;
    const nf = c ? numFmtOf(c) : h.text.includes("Error") ? "@" : "@";
    if (nf) column.numFmt = nf;
  });
  ws.getRow(1).height = 38;

  // ---------- قوائم الاختيار وحدود الأرقام/التواريخ ----------
  const letterOf = (idx1: number) => ws.getColumn(idx1).letter;
  cols.forEach((c, i) => {
    const L = letterOf(i + 1 + offset);
    const range = `${L}2:${L}${rowsN + 1}`;
    const k = colKey(c);
    if (listRef[k]) {
      ws.dataValidations.add(range, {
        type: "list", allowBlank: true, formulae: [listRef[k]],
        showErrorMessage: true, errorStyle: "warning",
        errorTitle: ar ? "قيمة غير موجودة" : "Value not in list",
        error: ar ? "القيمة دي مش في القائمة. هيتم مراجعتها وقت الاستيراد." : "This value is not in the list. It will be checked on import.",
      });
    } else if (c.type === "number" || c.type === "decimal") {
      ws.dataValidations.add(range, {
        type: "decimal", operator: "between", allowBlank: true, formulae: [-1e15, 1e15],
        showErrorMessage: true, errorStyle: "warning", errorTitle: ar ? "رقم" : "Number", error: ar ? "اكتب رقم" : "Enter a number",
      });
    } else if (c.type === "date") {
      ws.dataValidations.add(range, {
        type: "date", operator: "greaterThan", allowBlank: true, formulae: [new Date(Date.UTC(1900, 0, 2))],
        showErrorMessage: true, errorStyle: "warning", errorTitle: ar ? "تاريخ" : "Date", error: ar ? "اكتب تاريخ بصيغة yyyy-mm-dd" : "Enter a date as yyyy-mm-dd",
      });
    }
  });

  // ---------- صفوف المثال / صفوف الأخطاء ----------
  const putCell = (r: number, ci: number, c: ExcelColumnSpec | undefined, v: any) => {
    if (isBlank(v)) return;
    const cell = ws.getCell(r, ci);
    if (c && c.type === "date" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      const [y, m, d] = v.substring(0, 10).split("-").map(Number);
      cell.value = new Date(Date.UTC(y, m - 1, d));
    } else if (c && (c.type === "number" || c.type === "decimal") && !c.lookup && !c.options && !isNaN(Number(v))) {
      cell.value = Number(v);
    } else if (typeof v === "boolean") {
      cell.value = v ? YES_NO(ar)[0] : YES_NO(ar)[1];
    } else {
      cell.value = String(v);
    }
  };
  if (errorRows && errorRows.length) {
    errorRows.forEach((er, ri) => {
      const r = ri + 2;
      let ci = 1;
      if (hasGroup) { ws.getCell(r, ci).value = er.group ?? ""; ci++; }
      for (const c of cols) { putCell(r, ci, c, er.raw[colKey(c)]); ci++; }
      const ec = ws.getCell(r, ci);
      ec.value = er.message;
      ec.font = { color: { argb: COLORS.error } };
    });
  } else if (spec.sampleRows) {
    spec.sampleRows.forEach((row, ri) => {
      const r = ri + 2;
      let ci = 1;
      if (hasGroup) { ws.getCell(r, ci).value = row.__group ?? ri + 1; ci++; }
      for (const c of cols) { putCell(r, ci, c, row[colKey(c)]); ci++; }
    });
  }

  // ---------- شيت التعليمات ----------
  help.getColumn(1).width = 28;
  help.getColumn(2).width = 14;
  help.getColumn(3).width = 28;
  help.getColumn(4).width = 60;
  let hr = 1;
  const line = (text: string, opt?: { bold?: boolean; size?: number; color?: string; merge?: boolean }) => {
    const cell = help.getCell(hr, 1);
    cell.value = text;
    cell.font = { bold: !!opt?.bold, size: opt?.size ?? 11, color: { argb: opt?.color ?? "FF212121" } };
    cell.alignment = { wrapText: true, vertical: "top", horizontal: ar ? "right" : "left" };
    if (opt?.merge !== false) help.mergeCells(hr, 1, hr, 4);
    help.getRow(hr).height = Math.max(18, Math.ceil(text.length / 95) * 17);
    hr++;
  };
  line(`${spec.screenTitle || spec.name} — ${ar ? "تعليمات تعبئة الملف" : "How to fill this file"}`, { bold: true, size: 15, color: COLORS.master });
  hr++;
  const modeText: Record<string, [string, string]> = {
    grid: ["كل صف في شيت Data = سجل واحد جديد.", "Each row in the Data sheet = one new record."],
    multi: [
      "كل معاملة ليها رقم في عمود GroupNo (1، 2، 3 ...). الصفوف اللي ليها نفس الرقم بتتحفظ كمعاملة واحدة. اكتب بيانات الرأس (الأعمدة الزرقاء) في أول صف للمعاملة بس، وسيب باقي صفوف نفس المعاملة فاضية في الأعمدة دي، واكتب سطور التفاصيل (الأعمدة الخضرا) في كل صف.",
      "Each transaction has a number in the GroupNo column (1, 2, 3 ...). Rows with the same number are saved as ONE transaction. Fill the header data (blue columns) on the first row of the transaction only, leave the other rows of the same transaction empty in those columns, and fill the line data (green columns) on every row.",
    ],
    details: [
      "كل صف = سطر واحد يتضاف للفاتورة المفتوحة. مفيش حفظ لحد ما تدوس حفظ على الفاتورة.",
      "Each row = one line added to the currently open document. Nothing is saved until you save the document.",
    ],
  };
  line(modeText[spec.mode][0], {});
  line(modeText[spec.mode][1], {});
  hr++;
  const tips: [string, string][] = [
    ["الأعمدة اللي عليها * إجبارية.", "Columns marked * are required."],
    ["القوائم المنسدلة: اختار من القائمة أو اكتب الكود أو الاسم بالظبط.", "Dropdown columns: pick from the list or type the exact code or name."],
    ["التواريخ بصيغة yyyy-mm-dd (مثال 2026-01-31). الأرقام من غير رموز عملة.", "Dates as yyyy-mm-dd (e.g. 2026-01-31). Numbers without currency symbols."],
    ["نعم / لا (أو 1 / 0) للأعمدة المنطقية.", "Yes / No (or 1 / 0) for yes-no columns."],
    ["ممكن تغيّر ترتيب الأعمدة، بس ماتغيرش عناوينها (السطر التاني = اسم الحقل).", "You may reorder the columns, but do not change their headers (line 2 = field name)."],
    ["الصفوف الفاضية بتتجاهل. هتشوف معاينة بالأخطاء قبل أي حفظ.", "Empty rows are ignored. You will see a preview with errors before anything is saved."],
  ];
  for (const [a, e] of tips) line("• " + (ar ? a : e));
  hr++;
  // جدول الأعمدة
  const th = ["Column / العمود", "Required / إجباري", "Type / النوع", "Notes / ملاحظات"];
  th.forEach((txt, i) => {
    const cell = help.getCell(hr, i + 1);
    cell.value = txt;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.master } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  hr++;
  const addRow = (a: string, b: string, c: string, d: string, color?: string) => {
    [a, b, c, d].forEach((txt, i) => {
      const cell = help.getCell(hr, i + 1);
      cell.value = txt;
      cell.alignment = { wrapText: true, vertical: "top", horizontal: ar ? "right" : "left" };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } };
      if (color && i === 0) cell.font = { bold: true, color: { argb: color } };
    });
    hr++;
  };
  if (hasGroup) addRow("GroupNo", ar ? "نعم" : "Yes", ar ? "رقم أو نص" : "Number/Text", ar ? "رقم المعاملة. نفس الرقم = نفس المعاملة." : "Transaction number. Same value = same transaction.", COLORS.group);
  for (const c of cols) {
    const k = colKey(c);
    const notes: string[] = [];
    const lk = spec.lookups[k];
    if (c.lookup) {
      notes.push(ar ? `من جدول ${c.lookup.table}` : `From ${c.lookup.table}`);
      if (c.lookup.codeColumn && c.lookup.nameColumn) notes.push(ar ? "ممكن تكتب الكود أو الاسم" : "Code or name accepted");
      if (lk?.truncated) notes.push(ar ? `القائمة المنسدلة فيها أول ${lk.items.length} قيمة بس، لكن أي قيمة صحيحة بتتقبل` : `Dropdown shows the first ${lk.items.length} values only; any valid value is accepted`);
    }
    if (c.options) notes.push(c.options.map((o) => `${o.label}`).join(" / "));
    if (!isBlank(c.defaultValue)) notes.push((ar ? "الافتراضي: " : "Default: ") + String(c.defaultValue));
    if (!isBlank(c.example)) notes.push((ar ? "مثال: " : "Example: ") + String(c.example));
    addRow(`${c.title}  (${c.field})`, c.required ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No", typeLabel(c, ar), notes.join(" — "), c.scope === "detail" ? COLORS.detail : COLORS.master);
  }

  const out = await wb.xlsx.writeBuffer();
  return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
}

// =====================================================================================
//  القراءة
// =====================================================================================

/** قيمة خلية exceljs ← نص */
export function cellToText(v: any, col?: ExcelColumnSpec): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    const y = v.getUTCFullYear(), m = v.getUTCMonth() + 1, d = v.getUTCDate();
    return `${y}-${m < 10 ? "0" + m : m}-${d < 10 ? "0" + d : d}`;
  }
  if (typeof v === "number") {
    if (col && col.type === "date" && !col.lookup) return isoFromSerial(v) ?? String(v);
    return String(Number(v.toPrecision(15)));
  }
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((x: any) => x.text ?? "").join("");
    if ("result" in v && v.result !== undefined && v.result !== null) return cellToText(v.result, col);
    if ("formula" in v || "sharedFormula" in v) return "";
    if (typeof v.text === "string" || typeof v.text === "object") return cellToText(v.text, col);
    if (typeof v.error === "string") return v.error;
  }
  return String(v);
}

const splitHeader = (s: string): string[] =>
  s.split(/[\n\r|]+/).map((x) => normText(x.replace(/\*+\s*$/, "").replace(/\s*\*\s*$/, ""))).filter(Boolean);

/** يقرأ ملف .xlsx ويرجّع الصفوف الخام (نصوص) مرتبطة بأعمدة المواصفات */
export async function parseWorkbookBytes(data: ArrayBuffer | Uint8Array, spec: ExcelTemplateSpec): Promise<ParsedSheet> {
  const ExcelJS = await loadExcelJS();
  const out: ParsedSheet = { rows: [], found: [], missingRequired: [], ignored: [], errors: [], hasGroupColumn: false };
  const ar = spec.lang === "ar";
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data as any);
  } catch (e: any) {
    out.errors.push((ar ? "الملف مش ملف إكسل (.xlsx) صالح: " : "Not a valid .xlsx file: ") + (e?.message || e));
    return out;
  }

  const skip = new Set([SHEET_HELP, SHEET_LISTS].map(normText).concat(["التعليمات", "القوائم"]));
  let ws: any = wb.getWorksheet(SHEET_DATA);
  if (!ws) ws = wb.worksheets.find((w: any) => w.state !== "hidden" && w.state !== "veryHidden" && !skip.has(normText(w.name)));
  if (!ws) { out.errors.push(ar ? "مفيش شيت بيانات في الملف" : "No data sheet found"); return out; }

  const hasGroup = spec.mode === "multi";
  const cols = spec.columns;
  const names = cols.map((c) => new Set([normText(c.field), normText(c.title), ...(c.titleAlt ? [normText(c.titleAlt)] : [])]));

  // الصف اللي فيه العناوين: أول صف (من أول 15) فيه عنوان واحد على الأقل معروف
  let headerRow = 0;
  const colIdx: Record<string, number> = {};     // colKey → رقم العمود في الملف
  let groupIdx = 0;
  const ignored: string[] = [];
  const maxScan = Math.min(15, ws.rowCount);
  for (let r = 1; r <= maxScan && !headerRow; r++) {
    const row = ws.getRow(r);
    const tmp: Record<string, number> = {};
    let tmpGroup = 0;
    const tmpIgnored: string[] = [];
    const used = new Set<number>();
    row.eachCell({ includeEmpty: false }, (cell: any, cn: number) => {
      const text = cellToText(cell.value);
      if (!text.trim()) return;
      const parts = splitHeader(text);
      if (!parts.length) return;
      if (parts.some((p) => ERROR_HEADERS.map(normText).includes(p))) return;
      if (hasGroup && !tmpGroup && parts.some((p) => GROUP_HEADERS.map(normText).includes(p))) { tmpGroup = cn; return; }
      const ci = cols.findIndex((c, i) => !used.has(i) && names[i] && parts.some((p) => names[i].has(p)));
      if (ci >= 0) { used.add(ci); tmp[colKey(cols[ci])] = cn; } else tmpIgnored.push(text.split(/[\n\r]/)[0].trim());
    });
    if (Object.keys(tmp).length > 0) {
      headerRow = r;
      Object.assign(colIdx, tmp);
      groupIdx = tmpGroup;
      ignored.push(...tmpIgnored);
    }
  }
  if (!headerRow) {
    out.errors.push(ar ? "ماقدرتش ألاقي صف العناوين. استخدم التمبلت اللي نزلته من الشاشة." : "Could not find the header row. Please use the template downloaded from this screen.");
    return out;
  }
  out.ignored = ignored;
  out.found = Object.keys(colIdx);
  out.hasGroupColumn = !!groupIdx;
  for (const c of cols) if (c.required && !colIdx[colKey(c)]) out.missingRequired.push(c.title);
  if (hasGroup && !groupIdx) out.missingRequired.push("GroupNo");

  const colByKey = new Map(cols.map((c) => [colKey(c), c] as const));
  const lastRow = ws.rowCount;
  for (let r = headerRow + 1; r <= lastRow; r++) {
    const row = ws.getRow(r);
    if (!row || !row.hasValues) continue;
    const raw: Record<string, string> = {};
    let any = false;
    for (const k of Object.keys(colIdx)) {
      const t = cellToText(row.getCell(colIdx[k]).value, colByKey.get(k)).trim();
      raw[k] = t;
      if (t) any = true;
    }
    let group: string | undefined;
    if (hasGroup && groupIdx) {
      group = cellToText(row.getCell(groupIdx).value).trim();
      if (group) any = true;
    }
    if (!any) continue;
    const rr: RawExcelRow = { excelRow: r, raw };
    if (hasGroup) rr.group = group ?? "";
    out.rows.push(rr);
  }
  return out;
}
