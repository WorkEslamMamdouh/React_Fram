
// ============================================================
// TYPES
// ============================================================

export type ColumnType = "text" | "number" | "select" | "checkbox" | "date";
export type SortDirection = "ASC" | "DESC";
export type InputControlType = "text" | "number" | "select" | "search" | "date" | "textarea" | "checkbox";

export interface SelectOption {
  value: any;
  label: string;
}

export interface SearchModalConfig {
  title: string;
  tableName: string;
  keyColumn: string;
  columns: Array<{ field: string; title: string; width?: number; type?: ColumnType , IsSorTable? : boolean , IsVisible? : boolean  }>;
  searchColumns?: string[];
  returnField: string;
  displayField?: string;
  condition?: string;
  pageSize?: number;
  orderBy?: string;
  orderType?: SortDirection;
}

export interface DynamicSelectConfig {
  tableName: string;
  displayField: string;
  valueField: string;
  condition?: string;
  attributes?: string[];
  orderBy?: string;
  orderType?: SortDirection;
  placeholder?: { en: string; ar: string };
}

export type ColumnMode = "create" | "edit" | "view";

export interface DynamicGridColumn {
  field: string;
  NameDataBase?: string;
  title: string;
  type?: ColumnType;
  editable?: boolean;
  insertable?: boolean;
  sortable?: boolean;
  IsSave?: boolean;
  IsVisibleDisplayInGrid?: boolean;
  IsDigits?: boolean;
  IsSearchColumn?: boolean;
  IsDisabledInEdit?: boolean;
  IsDisabledInAdd?: boolean;
  SortFieldInEditAndAdd?: number;
  width?: number | string;
  options?: SelectOption[];
  IsRequired?: boolean;
  IsValid?: (value: any, row?: any) => boolean;
  validationMessage?: string;
  inputType?: InputControlType;
  selectOptions?: SelectOption[];
  searchModal?: SearchModalConfig;
  dynamicSelect?: DynamicSelectConfig;
  placeholder?: string;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  DefaultValue?: any;
  itemTemplate?: (value: any, row: any, index: number, onChange: (newValue: any) => void) => React.ReactNode;
  EditTemplate?: (value: any, row: any, onChange: (newValue: any) => void, isEdit: boolean) => React.ReactNode;
  InsertTemplate?: (value: any, onChange: (newValue: any) => void) => React.ReactNode;
  visibleInCreate?: boolean;
  visibleInEdit?: boolean;
  visibleInView?: boolean;
  dateDisplayFormat?: string;
  dateStorageFormat?: string;
  dateMode?: "date" | "datetime";
  visibleWhen?: (row: Record<string, any>, mode: ColumnMode) => boolean;
  enabledWhen?: (row: Record<string, any>, mode: ColumnMode) => boolean;
  align?: "left" | "center" | "right";
  // DynamicSelect configuration when inputType === "selectSearch"
  selectConfig?: {
    tableName: string;
    displayField: string;
    valueField: string;
    condition?: string;
  };
  // Inline checkbox in the data row that fires ProcessTrans on toggle
  inlineToggle?: {
    approveTrType: string;
    unapproveTrType: string;
    approvePermission?: string;
    unapprovePermission?: string;
    confirmBeforeChange?: boolean;
  };
}

export interface DynamicGridProps {
  tableName: string;
  keyColumn: string;
  columns: DynamicGridColumn[];
  condition?: string;
  orderBy?: string;
  orderType?: SortDirection;
  pageSize?: number;
  enableInsert?: boolean;
  enableUpdate?: boolean;
  enableDelete?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  enableSort?: boolean;
  enableSelection?: boolean;
  searchColumns?: string[];
  height?: number | string;
  onRowDoubleClick?: (row: any) => void;
  onRowSelect?: (row: any) => void;
  isModalMode?: boolean;
}