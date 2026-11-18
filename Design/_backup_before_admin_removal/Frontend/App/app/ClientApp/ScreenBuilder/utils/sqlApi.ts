import { adminSessionExpired } from "../../Shared/AdminHttp";
import { API_BASE_URL } from "../../../../CallAPI/api";
const API_BASE = `${API_BASE_URL}screenbuilder`;

export interface SqlConnection {
  server: string;
  user: string;
  password: string;
  database: string;
}

export interface SqlColumn {
  name: string;
  sqlType: string;
  maxLength: number;
  isNullable: boolean;
  isIdentity: boolean;
  isComputed: boolean;
  isPK: boolean;
  notInDb: boolean;
}

export interface ScannedScreen {
  name: string;
  screenType: string;
  table: string;
  hasSettings: boolean;
  settingsJson: string;
}

function adminToken(): string {
  try { return localStorage.getItem("admin_token") || ""; } catch { return ""; }
}

async function post<T>(endpoint: string, body: any): Promise<T> {
  const res = await fetch(API_BASE + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken() },
    body: JSON.stringify(body ?? {}),
  });
  if (res.status === 401) adminSessionExpired();     // التوكن في ذاكرة السيرفر: بعد إعادة التشغيل لازم دخول جديد
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
export async function testConnection(conn: SqlConnection): Promise<{ success: boolean; databases?: string[]; currentDatabase?: string; error?: string }> {
  return post("/connect", conn);
}

export async function loadTables(conn: SqlConnection): Promise<{ success: boolean; tables?: { name: string }[]; views?: { name: string }[]; error?: string }> {
  return post("/tables", conn);
}

export async function loadColumns(conn: SqlConnection, table: string, view?: string): Promise<{ success: boolean; columns?: SqlColumn[]; error?: string }> {
  return post("/columns", { ...conn, table, view });
}

export async function loadResources(conn: SqlConnection): Promise<{ success: boolean; resources?: Record<string, { ar: string; en: string }>; error?: string }> {
  return post("/resources", conn);
}

export async function executeSql(conn: SqlConnection, sql: string): Promise<{ success: boolean; messages?: string[]; error?: string }> {
  return post("/execute-sql", { ...conn, sql });
}

export interface SaveFilesInput {
  projectPath: string;
  dbScriptsPath?: string;
  module: string;
  tsCode: string;
  tsxCode: string;
  sqlCode?: string;
  resources: { key: string; en: string; ar: string }[];
}

export async function saveFiles(input: SaveFilesInput): Promise<{ success: boolean; existed?: boolean; messages?: string[]; error?: string }> {
  return post("/save-files", input);
}

export async function scanScreens(projectPath: string): Promise<{ success: boolean; screens?: ScannedScreen[]; error?: string }> {
  return post("/scan-screens", { projectPath });
}

export async function loadSearchFunctions(projectPath: string): Promise<{ success: boolean; functions?: string[]; error?: string }> {
  return post("/search-functions", { projectPath });
}

export interface SearchFunctionDto {
  name: string;
  title: string;
  tableName: string;
  keyColumn: string;
  returnField: string;
  displayField: string;
  columns: { field: string; title: string; width: number; IsVisible: boolean }[];
  searchColumns: string[];
  pageSize: number;
  orderBy: string;
  orderType: "ASC" | "DESC";
}

export async function listSearchFunctions(projectPath: string): Promise<{ success: boolean; functions?: SearchFunctionDto[]; error?: string }> {
  return post("/list-search-functions", { projectPath });
}

export async function saveSearchFunction(input: SearchFunctionDto & { projectPath: string; originalName?: string }): Promise<{ success: boolean; name?: string; updated?: boolean; error?: string }> {
  return post("/save-search-function", input);
}

export async function deleteSearchFunction(projectPath: string, name: string): Promise<{ success: boolean; error?: string }> {
  return post("/delete-search-function", { projectPath, name });
}

// Auto-detect input type from SQL type
export function sqlTypeToInputType(sqlType: string): string {
  switch (sqlType) {
    case "bit": return "checkbox";
    case "int": case "bigint": case "smallint": case "tinyint":
    case "decimal": case "numeric": case "money": case "smallmoney":
    case "float": case "real": return "number";
    case "date": case "datetime": case "smalldatetime":
    case "datetime2": case "datetimeoffset": return "date";
    default: return "text";
  }
}

// Known field titles for auto-detection
const KNOWN_TITLES: Record<string, { ar: string; en: string }> = {
  Description: { ar: "الوصف", en: "Description" },
  DescriptionA: { ar: "الوصف عربي", en: "Description AR" },
  DescriptionE: { ar: "الوصف انجليزي", en: "Description EN" },
  NameA: { ar: "الاسم عربي", en: "Name AR" },
  NameE: { ar: "الاسم انجليزي", en: "Name EN" },
  Amount: { ar: "المبلغ", en: "Amount" },
  Qty: { ar: "الكمية", en: "Quantity" },
  UnitPrice: { ar: "سعر الوحدة", en: "Unit Price" },
  NetAmount: { ar: "الصافي", en: "Net Amount" },
  TotalAmount: { ar: "الإجمالي", en: "Total Amount" },
  Discount: { ar: "الخصم", en: "Discount" },
  Tax: { ar: "الضريبة", en: "Tax" },
  Notes: { ar: "ملاحظات", en: "Notes" },
  Remark: { ar: "ملاحظات", en: "Remark" },
  TransDate: { ar: "تاريخ المعاملة", en: "Transaction Date" },
  DocDate: { ar: "تاريخ المستند", en: "Document Date" },
  DocNo: { ar: "رقم المستند", en: "Document No" },
  RefNo: { ar: "رقم المرجع", en: "Reference No" },
  CompCode: { ar: "كود الشركة", en: "Company Code" },
  BranchCode: { ar: "كود الفرع", en: "Branch Code" },
  UserID: { ar: "رقم المستخدم", en: "User ID" },
  FinYear: { ar: "السنة المالية", en: "Fiscal Year" },
  Status: { ar: "الحالة", en: "Status" },
  IsActive: { ar: "فعال", en: "Active" },
  CreatedBy: { ar: "بواسطة", en: "Created By" },
  CreatedDate: { ar: "تاريخ الإنشاء", en: "Created Date" },
  ModifiedBy: { ar: "معدل بواسطة", en: "Modified By" },
  ModifiedDate: { ar: "تاريخ التعديل", en: "Modified Date" },
  ItemCode: { ar: "كود الصنف", en: "Item Code" },
  ItemName: { ar: "اسم الصنف", en: "Item Name" },
  CustomerCode: { ar: "كود العميل", en: "Customer Code" },
  CustomerName: { ar: "اسم العميل", en: "Customer Name" },
  VendorCode: { ar: "كود المورد", en: "Vendor Code" },
  VendorName: { ar: "اسم المورد", en: "Vendor Name" },
  AccountCode: { ar: "كود الحساب", en: "Account Code" },
  AccountName: { ar: "اسم الحساب", en: "Account Name" },
  CurrencyCode: { ar: "كود العملة", en: "Currency Code" },
  ExchangeRate: { ar: "سعر الصرف", en: "Exchange Rate" },
  WarehouseCode: { ar: "كود المخزن", en: "Warehouse Code" },
  Serial: { ar: "المسلسل", en: "Serial" },
};

export function getKnownTitle(fieldName: string): { ar: string; en: string } | null {
  return KNOWN_TITLES[fieldName] || null;
}

// Auto-detect field settings
const AUTO_FIELDS = ["CompCode", "BranchCode", "UserID", "FinYear"];
// حقول المستخدم اللي بتسجل مين ضاف/عدّل  →  UserName
const USERNAME_FIELDS = new Set([
  "CreatedBy", "ModifiedBy", "UpdatedBy",
  "CREATED_BY", "UPDATED_BY", "MODIFIED_BY",
  "CreatedUser", "ModifiedUser",
]);
// حقول تواريخ الإنشاء/التعديل  →  Now
const DATETIME_FIELDS = new Set([
  "CreatedAt", "UpdatedAt", "ModifiedAt",
  "CREATED_AT", "UPDATED_AT", "LAST_UPDATE",
  "ModifiedDate", "CreatedDate",
]);

export function detectAutoValue(fieldName: string): string {
  if (AUTO_FIELDS.includes(fieldName)) return fieldName;
  if (USERNAME_FIELDS.has(fieldName)) return "UserName";
  if (DATETIME_FIELDS.has(fieldName)) return "Now";
  return "";
}

export function detectDefaultValue(fieldName: string, sqlType: string, isNullable: boolean): string {
  if (["date", "datetime", "smalldatetime", "datetime2"].includes(sqlType) && !isNullable) return "today";
  return "";
}


// ============================================================
// Phase 5 - database helpers & save/register
// ============================================================

/** اتصال بإعدادات السيرفر نفسه (من غير باسورد في المتصفح) */
export const SERVER_CONNECTION: SqlConnection = { server: "", user: "", password: "", database: "" };

export interface ProcParam { name: string; sqlType: string; maxLength: number; isOutput: boolean; hasDefault: boolean }
export interface ProcColumn { name: string; sqlType: string }

export async function projectInfo(): Promise<{ success: boolean; projectPath?: string; dbScriptsPath?: string; error?: string }> {
  return post("/project-info", {});
}
export async function loadProcs(conn: SqlConnection): Promise<{ success: boolean; procs?: { schema: string; name: string }[]; error?: string }> {
  return post("/procs", conn);
}
export async function loadProcParams(conn: SqlConnection, name: string): Promise<{ success: boolean; parameters?: ProcParam[]; columns?: ProcColumn[]; columnsWarning?: string; error?: string }> {
  return post("/proc-params", { ...conn, name });
}
export async function distinctValues(conn: SqlConnection, table: string, column: string, condition = "", top = 50): Promise<{ success: boolean; values?: string[]; error?: string }> {
  return post("/distinct-values", { ...conn, table, column, condition, top });
}
export async function validateCondition(conn: SqlConnection, table: string, condition: string): Promise<{ success: boolean; error?: string }> {
  return post("/validate-condition", { ...conn, table, condition });
}
export interface RegisterInput { module: string; descA: string; descE: string; menu: string; type: "S" | "M"; sort: number; icon: string; color: string }
export async function registerModule(conn: SqlConnection, r: RegisterInput): Promise<{ success: boolean; sort?: number; error?: string; messages?: string[] }> {
  return post("/register-module", { ...conn, ...r });
}
export async function saveConfigJson(conn: SqlConnection, module: string, json: string): Promise<{ success: boolean; missingTable?: boolean; error?: string }> {
  return post("/config-save", { ...conn, module, json, version: 5 });
}
export async function listConfigs(conn: SqlConnection): Promise<{ success: boolean; missingTable?: boolean; configs?: { module: string; version: number; updatedAt: string; json: string }[]; error?: string }> {
  return post("/config-list", conn);
}
export async function readScreen(projectPath: string, module: string): Promise<{ success: boolean; text?: string; error?: string }> {
  return post("/read-screen", { projectPath, module });
}