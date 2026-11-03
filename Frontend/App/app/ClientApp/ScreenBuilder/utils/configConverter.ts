// ============================================================
// Config Converter — v3 (CreatePageReact) ↔ v4 (Web Builder)
// ============================================================

import {
  ScreenConfigV4, FieldConfigV4, DetailConfigV4,
  ValidationConfigV4, createEmptyScreen,
} from "../types/ScreenConfig";

// ============================================================
// GridScreenSettings v3 (desktop tool format)
// ============================================================

export interface GridScreenSettingsV3 {
  Version: number;
  ScreenType: string;
  Module: string;
  Table: string;
  View: string;
  KeyColumn: string;
  TitleAr: string;
  TitleEn: string;
  SubAr: string;
  SubEn: string;
  Icon: string;
  IconColor: string;
  PageSize: number;
  OrderBy: string;
  OrderType: string;
  ExtraCondition: string;
  ProcessTrans: boolean;
  TrType: string;
  Insert: boolean;
  Edit: boolean;
  Delete: boolean;
  Export: boolean;
  Permissions: boolean;
  ParentMenu: string;
  Roles: string;
  Fields: GridFieldSettingsV3[];
  ListFields: GridFieldSettingsV3[];
  Details: MdDetailSettingsV3[];
  Validations: ValidationSettingsV3[];
}

export interface GridFieldSettingsV3 {
  Field: string;
  TitleAr: string;
  TitleEn: string;
  InGrid: boolean;
  InForm: boolean;
  Required: boolean;
  Search: boolean;
  InFilter: boolean;
  InputType: string;
  Options: string;
  SearchFn: string;
  SearchCond: string;
  FillFrom: string;
  Formula: string;
  Auto: string;
  DefaultValue: string;
  Width: number;
  Order: number;
}

export interface MdDetailSettingsV3 {
  TitleAr: string;
  TitleEn: string;
  Table: string;
  View: string;
  KeyColumn: string;
  ForeignKey: string;
  Totals: string;
  OrderBy: string;
  Fields: GridFieldSettingsV3[];
}

export interface ValidationSettingsV3 {
  Detail: number;
  Type: string;
  Field: string;
  When: string;
  Operator: string;
  CompareTo: string;
  Value: string;
  Min: string;
  Max: string;
  Pattern: string;
  Table: string;
  Condition: string;
  Code: string;
  MessageAr: string;
  MessageEn: string;
}

// ============================================================
// v3 → v4
// ============================================================

function fieldV3toV4(f: GridFieldSettingsV3): FieldConfigV4 {
  return {
    field: f.Field,
    titleAr: f.TitleAr,
    titleEn: f.TitleEn,
    inGrid: f.InGrid,
    inForm: f.InForm,
    required: f.Required,
    search: f.Search,
    inFilter: f.InFilter ?? true,
    inputType: f.InputType || "text",
    options: f.Options || "",
    searchFn: f.SearchFn || "",
    searchCond: f.SearchCond || "",
    fillFrom: f.FillFrom || "",
    formula: f.Formula || "",
    auto: f.Auto || "",
    defaultValue: f.DefaultValue || "",
    width: f.Width || 150,
    order: f.Order || 99,
  };
}

function detailV3toV4(d: MdDetailSettingsV3): DetailConfigV4 {
  return {
    titleAr: d.TitleAr,
    titleEn: d.TitleEn,
    table: d.Table,
    view: d.View || "",
    keyColumn: d.KeyColumn,
    foreignKey: d.ForeignKey,
    totals: d.Totals || "",
    orderBy: d.OrderBy || "",
    fields: (d.Fields || []).map(fieldV3toV4),
  };
}

function validationV3toV4(v: ValidationSettingsV3): ValidationConfigV4 {
  return {
    detail: v.Detail,
    type: v.Type || "required",
    field: v.Field,
    when: (v.When as any) || "both",
    operator: v.Operator || "",
    compareTo: v.CompareTo || "",
    value: v.Value || "",
    min: v.Min || "",
    max: v.Max || "",
    pattern: v.Pattern || "",
    table: v.Table || "",
    condition: v.Condition || "",
    code: v.Code || "",
    messageAr: v.MessageAr || "",
    messageEn: v.MessageEn || "",
  };
}

export function convertV3toV4(v3: GridScreenSettingsV3): ScreenConfigV4 {
  const cfg = createEmptyScreen(v3.ScreenType as any);
  cfg.module = v3.Module;
  cfg.table = v3.Table;
  cfg.view = v3.View || "";
  cfg.keyColumn = v3.KeyColumn;
  cfg.titleAr = v3.TitleAr;
  cfg.titleEn = v3.TitleEn;
  cfg.subAr = v3.SubAr || "";
  cfg.subEn = v3.SubEn || "";
  cfg.icon = v3.Icon || "fa-table-list";
  cfg.iconColor = v3.IconColor || "indigo";
  cfg.pageSize = v3.PageSize || 10;
  cfg.orderBy = v3.OrderBy || "";
  cfg.orderType = (v3.OrderType as any) || "DESC";
  cfg.extraCondition = v3.ExtraCondition || "";
  cfg.processTrans = v3.ProcessTrans || false;
  cfg.trType = v3.TrType || "";
  cfg.permissions = {
    insert: v3.Insert ?? true,
    edit: v3.Edit ?? true,
    delete: v3.Delete ?? true,
    export: v3.Export ?? true,
    usePermissions: v3.Permissions ?? true,
    parentMenu: v3.ParentMenu || "",
    roles: v3.Roles || "",
  };
  cfg.fields = (v3.Fields || []).map(fieldV3toV4);
  cfg.listFields = (v3.ListFields || []).map(fieldV3toV4);
  cfg.details = (v3.Details || []).map(detailV3toV4);
  cfg.validations = (v3.Validations || []).map(validationV3toV4);
  cfg.meta = { lastModified: new Date().toISOString(), modifiedBy: "", source: "desktop" };
  return cfg;
}

// ============================================================
// v4 → v3
// ============================================================

function fieldV4toV3(f: FieldConfigV4): GridFieldSettingsV3 {
  return {
    Field: f.field,
    TitleAr: f.titleAr,
    TitleEn: f.titleEn,
    InGrid: f.inGrid,
    InForm: f.inForm,
    Required: f.required,
    Search: f.search,
    InFilter: f.inFilter,
    InputType: f.inputType,
    Options: f.options,
    SearchFn: f.searchFn,
    SearchCond: f.searchCond,
    FillFrom: f.fillFrom,
    Formula: f.formula,
    Auto: f.auto,
    DefaultValue: f.defaultValue,
    Width: f.width,
    Order: f.order,
  };
}

function detailV4toV3(d: DetailConfigV4): MdDetailSettingsV3 {
  return {
    TitleAr: d.titleAr,
    TitleEn: d.titleEn,
    Table: d.table,
    View: d.view,
    KeyColumn: d.keyColumn,
    ForeignKey: d.foreignKey,
    Totals: d.totals,
    OrderBy: d.orderBy,
    Fields: d.fields.map(fieldV4toV3),
  };
}

function validationV4toV3(v: ValidationConfigV4): ValidationSettingsV3 {
  return {
    Detail: v.detail,
    Type: v.type,
    Field: v.field,
    When: v.when,
    Operator: v.operator,
    CompareTo: v.compareTo,
    Value: v.value,
    Min: v.min,
    Max: v.max,
    Pattern: v.pattern,
    Table: v.table,
    Condition: v.condition,
    Code: v.code,
    MessageAr: v.messageAr,
    MessageEn: v.messageEn,
  };
}

export function convertV4toV3(v4: ScreenConfigV4): GridScreenSettingsV3 {
  return {
    Version: 3,
    ScreenType: v4.screenType,
    Module: v4.module,
    Table: v4.table,
    View: v4.view,
    KeyColumn: v4.keyColumn,
    TitleAr: v4.titleAr,
    TitleEn: v4.titleEn,
    SubAr: v4.subAr,
    SubEn: v4.subEn,
    Icon: v4.icon,
    IconColor: v4.iconColor,
    PageSize: v4.pageSize,
    OrderBy: v4.orderBy,
    OrderType: v4.orderType,
    ExtraCondition: v4.extraCondition,
    ProcessTrans: v4.processTrans,
    TrType: v4.trType,
    Insert: v4.permissions.insert,
    Edit: v4.permissions.edit,
    Delete: v4.permissions.delete,
    Export: v4.permissions.export,
    Permissions: v4.permissions.usePermissions,
    ParentMenu: v4.permissions.parentMenu,
    Roles: v4.permissions.roles,
    Fields: v4.fields.map(fieldV4toV3),
    ListFields: v4.listFields.map(fieldV4toV3),
    Details: v4.details.map(detailV4toV3),
    Validations: v4.validations.map(validationV4toV3),
  };
}

// ============================================================
// Parse settings from .ts file
// ============================================================

const SETTINGS_MARKER = "// @CreatePageReact-Settings:";
const V4_MARKER = "// @ScreenBuilder-Settings:";

export function parseSettingsFromTs(tsContent: string): { v3: GridScreenSettingsV3 | null; v4: ScreenConfigV4 | null } {
  let v3: GridScreenSettingsV3 | null = null;
  let v4: ScreenConfigV4 | null = null;

  const v4Idx = tsContent.lastIndexOf(V4_MARKER);
  if (v4Idx >= 0) {
    try {
      const json = tsContent.substring(v4Idx + V4_MARKER.length).split("\n")[0].trim();
      v4 = JSON.parse(json);
    } catch { }
  }

  const v3Idx = tsContent.lastIndexOf(SETTINGS_MARKER);
  if (v3Idx >= 0) {
    try {
      const line = tsContent.substring(v3Idx + SETTINGS_MARKER.length);
      const json = line.split("\n")[0].trim();
      v3 = JSON.parse(json);
    } catch { }
  }

  if (!v4 && v3) {
    v4 = convertV3toV4(v3);
  }

  return { v3, v4 };
}
