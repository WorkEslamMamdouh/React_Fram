// ============================================================
// ScreenConfig v4 — Web Screen Builder
// ============================================================

import { FilterFieldType } from "../../Shared/Components/Import/AdvancedFilter";

export interface ScreenConfigV4 {
  version: 4;
  screenType: "Grid" | "MasterDetail";
  module: string;
  table: string;
  view: string;
  keyColumn: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  icon: string;
  iconColor: string;
  pageSize: number;
  orderBy: string;
  orderType: "ASC" | "DESC";
  extraCondition: string;
  processTrans: boolean;
  trType: string;
  permissions: PermissionsConfig;
  fields: FieldConfigV4[];
  listFields: FieldConfigV4[];
  details: DetailConfigV4[];
  validations: ValidationConfigV4[];
  gridFilter: GridFilterConfigV4 | null;
  meta: ScreenMeta;
}

export interface PermissionsConfig {
  insert: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  usePermissions: boolean;
  parentMenu: string;
  roles: string;
}

export interface FieldConfigV4 {
  field: string;
  titleAr: string;
  titleEn: string;
  inGrid: boolean;
  inForm: boolean;
  required: boolean;
  search: boolean;
  inFilter: boolean;
  inputType: string;
  options: string;
  searchFn: string;
  searchCond: string;
  fillFrom: string;
  formula: string;
  auto: string;
  defaultValue: string;
  width: number;
  order: number;
  visibleInCreate?: boolean;
  visibleInEdit?: boolean;
  visibleInView?: boolean;
  dateDisplayFormat?: string;
  dateMode?: "date" | "datetime";
  align?: "left" | "center" | "right";
}

export interface DetailConfigV4 {
  titleAr: string;
  titleEn: string;
  table: string;
  view: string;
  keyColumn: string;
  foreignKey: string;
  totals: string;
  orderBy: string;
  fields: FieldConfigV4[];
}

export interface ValidationConfigV4 {
  detail: number;
  type: string;
  field: string;
  when: "insert" | "update" | "both";
  operator: string;
  compareTo: string;
  value: string;
  min: string;
  max: string;
  pattern: string;
  table: string;
  condition: string;
  code: string;
  messageAr: string;
  messageEn: string;
}

export interface GridFilterConfigV4 {
  fields: GridFilterFieldV4[];
  visible: boolean;
  applyOnInit: boolean;
  applyOnChange: boolean;
  layout: "inline" | "stacked";
  columns: number;
}

export interface GridFilterFieldV4 {
  field: string;
  label: string;
  type: FilterFieldType;
  required: boolean;
  defaultValue: string;
  defaultRange: { from: string; to: string };
  options: string;
  searchFn: string;
  sortOrder: number;
}

export interface ScreenMeta {
  lastModified: string;
  modifiedBy: string;
  source: "web" | "desktop";
}

// ============================================================
// Defaults
// ============================================================

export function createEmptyField(fieldName: string = ""): FieldConfigV4 {
  return {
    field: fieldName,
    titleAr: fieldName,
    titleEn: fieldName,
    inGrid: true,
    inForm: true,
    required: false,
    search: true,
    inFilter: true,
    inputType: "text",
    options: "",
    searchFn: "",
    searchCond: "",
    fillFrom: "",
    formula: "",
    auto: "",
    defaultValue: "",
    width: 150,
    order: 99,
  };
}

export function createEmptyScreen(type: "Grid" | "MasterDetail" = "Grid"): ScreenConfigV4 {
  return {
    version: 4,
    screenType: type,
    module: "",
    table: "",
    view: "",
    keyColumn: "",
    titleAr: "",
    titleEn: "",
    subAr: "",
    subEn: "",
    icon: "fa-table-list",
    iconColor: "indigo",
    pageSize: 10,
    orderBy: "",
    orderType: "DESC",
    extraCondition: "",
    processTrans: false,
    trType: "",
    permissions: {
      insert: true, edit: true, delete: true, export: true,
      usePermissions: true, parentMenu: "", roles: "",
    },
    fields: [],
    listFields: [],
    details: [],
    validations: [],
    gridFilter: null,
    meta: { lastModified: new Date().toISOString(), modifiedBy: "", source: "web" },
  };
}

export function createEmptyDetail(): DetailConfigV4 {
  return {
    titleAr: "", titleEn: "", table: "", view: "",
    keyColumn: "", foreignKey: "", totals: "", orderBy: "",
    fields: [],
  };
}

export function createEmptyValidation(): ValidationConfigV4 {
  return {
    detail: 0, type: "required", field: "", when: "both",
    operator: "", compareTo: "", value: "", min: "", max: "",
    pattern: "", table: "", condition: "", code: "",
    messageAr: "", messageEn: "",
  };
}

export const INPUT_TYPES = ["text", "number", "textarea", "checkbox", "date", "select", "search"] as const;
export const AUTO_VALUES = ["", "CompCode", "BranchCode", "UserID", "FinYear"] as const;
export const VALIDATION_TYPES = ["required", "compare", "range", "regex", "unique", "exists", "notExists", "noDuplicate", "minRows", "custom"] as const;
