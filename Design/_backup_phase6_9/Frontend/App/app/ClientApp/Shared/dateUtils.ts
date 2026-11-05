// ============================================================
// Date Utilities
// ============================================================

export interface ProjectDateConfig {
  defaultDisplayFormat: string;
  storageFormat: "ISO8601";
  timezone: "local" | "utc";
  firstDayOfWeek: 0 | 1 | 6;
}

export const DEFAULT_DATE_CONFIG: ProjectDateConfig = {
  defaultDisplayFormat: "DD/MM/YYYY",
  storageFormat: "ISO8601",
  timezone: "local",
  firstDayOfWeek: 6,
};

/** أول يوم في الشهر الحالي بتنسيق YYYY-MM-DD */
export function firstDayOfMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** التاريخ الحالي بتنسيق YYYY-MM-DD */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** آخر يوم في الشهر الحالي */
export function lastDayOfMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, "0");
  const day = String(last.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const FORMAT_TOKENS: Record<string, (d: Date) => string> = {
  YYYY: (d) => String(d.getFullYear()),
  MM: (d) => String(d.getMonth() + 1).padStart(2, "0"),
  DD: (d) => String(d.getDate()).padStart(2, "0"),
  HH: (d) => String(d.getHours()).padStart(2, "0"),
  mm: (d) => String(d.getMinutes()).padStart(2, "0"),
  ss: (d) => String(d.getSeconds()).padStart(2, "0"),
};

/** تحويل ISO string لتنسيق عرض معين */
export function formatDate(iso: string | null | undefined, format: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  let result = format;
  for (const [token, fn] of Object.entries(FORMAT_TOKENS)) {
    result = result.replace(token, fn(d));
  }
  return result;
}

/** تحويل تاريخ معروض لـ ISO (YYYY-MM-DD) بدون timezone shift */
export function toISODate(input: string, format: string): string {
  if (!input) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.split("T")[0];

  let year = "", month = "", day = "";
  const yearIdx = format.indexOf("YYYY");
  const monthIdx = format.indexOf("MM");
  const dayIdx = format.indexOf("DD");

  if (yearIdx >= 0) year = input.substring(yearIdx, yearIdx + 4);
  if (monthIdx >= 0) month = input.substring(monthIdx, monthIdx + 2);
  if (dayIdx >= 0) day = input.substring(dayIdx, dayIdx + 2);

  if (year && month && day) return `${year}-${month}-${day}`;
  return input;
}

/** تحويل قيمة تاريخ للعرض في الجريد */
export function displayDate(
  value: any,
  displayFormat?: string,
  fallbackFormat: string = DEFAULT_DATE_CONFIG.defaultDisplayFormat
): string {
  if (value == null || value === "") return "";
  return formatDate(String(value), displayFormat || fallbackFormat);
}
