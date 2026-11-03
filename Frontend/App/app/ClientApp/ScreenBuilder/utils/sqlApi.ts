const API_BASE = "http://localhost:49475/api/screenbuilder";

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

async function post<T>(endpoint: string, body: any): Promise<T> {
  const res = await fetch(API_BASE + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function testConnection(conn: SqlConnection): Promise<{ success: boolean; databases?: string[]; error?: string }> {
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

export function detectAutoValue(fieldName: string): string {
  return AUTO_FIELDS.includes(fieldName) ? fieldName : "";
}

export function detectDefaultValue(fieldName: string, sqlType: string, isNullable: boolean): string {
  if (["date", "datetime", "smalldatetime", "datetime2"].includes(sqlType) && !isNullable) return "today";
  return "";
}
