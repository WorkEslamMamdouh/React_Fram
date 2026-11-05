"use client";

import { useMemo } from "react";
import { useSys } from "../Shared/SystemUsing";
import { MasterDetailColumn, MasterDetailConfig } from "../Shared/Components/Import/ModelMasterDetail";
import { DynamicGridColumn } from "../Shared/Components/Import/ModelGrid";
import { FilterFieldConfig, FilterOption, ActiveFilter } from "../Shared/Components/Import/AdvancedFilter";
import type { ExcelMasterDetailConfig } from "../Shared/Components/Excel/ExcelTypes";
import { FormLayout } from "../Shared/Components/Import/FormLayout";

// =======================
// #region ثوابت الشاشة
// =======================
const TableName = "TST_OpeningStock";
const ViewName = "IQ_TST_OpeningStock";
const KeyColumn = "OpeningID";
const TrType = "";
const RunProcessTrans = false;
const ModuleCode = "TstOpeningStock";   // MODULE_CODE للصلاحيات (فاضي = من غير صلاحيات)
// #endregion

// =======================
// TstOpeningStock  (MasterDetail)
// =======================
export function TstOpeningStock() {
  // =======================
  // #region UsingSystem
  // =======================
  const IsLangEN = useSys((s) => s.IsLangEN);
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
  void UserID; void FinYear; void UserName; void Today; void Now;
  // #endregion

  const t = (en: string, ar: string) => (IsLangEN ? en : ar);

  const Condition = `CompCode = ${CompCode}`;

  const filterVals: Record<string, any> = {};   // الفلاتر المتسلسلة / بارامترات الفلتر متاحة في شاشات الجريد بس
  void filterVals;

  const filterReady = true;   // الجريد مابيتعرضش قبل ما اختيارات الفلاتر تتحمل

  // ===== Excel: معاملات كتير / أصناف في الفاتورة (Phase 6) — بيتحط في Config.excel =====
  const ExcelCfg = useMemo<ExcelMasterDetailConfig>(
    () => ({
      enabled: true,
      templateName: "TstOpening_Template",
      mode: "multiTransaction",
      masterColumns: ["WarehouseID","TrDate","Notes"],
      detailColumns: ["ItemID","Qty","Cost"],
      lookups: {
      "WarehouseID": { table: "TST_Warehouse", keyColumn: "WarehouseID", codeColumn: "Code", nameColumn: "NameA", condition: `CompCode = ${CompCode}` },
    },
      detailLookups: {
      "ItemID": { table: "TST_Item", keyColumn: "ItemID", codeColumn: "Code", nameColumn: "NameA", condition: `CompCode = ${CompCode}` },
    },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CompCode, BranchCode]
  );

  const FormLayoutCells: FormLayout = [
    {"kind":"field","field":"WarehouseID","span":4,"spanMd":6,"newRow":true},
    {"kind":"field","field":"TrNo","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"TrDate","span":4,"spanMd":6,"newRow":false},
    {"kind":"field","field":"Notes","span":4,"spanMd":6,"newRow":true},
  ];

  // =======================
  // #region الأعمدة
  // =======================
  const MasterColumns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "OpeningID",
        title: t("Opening", "Opening"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "CompCode",
        title: t("Company Code", "كود الشركة"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: CompCode,
        visibleInView: false,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "BranchCode",
        title: t("Branch Code", "كود الفرع"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: BranchCode,
        visibleInView: false,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "WarehouseID",
        title: t("Warehouse", "Warehouse"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Warehouse", displayField: IsLangEN ? "NameE" : "NameA", valueField: "WarehouseID", condition: `CompCode = ${CompCode} AND BranchCode = ${BranchCode}` },
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "TrNo",
        title: t("Tr No", "Tr No"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "TrDate",
        title: t("Tr Date", "Tr Date"),
        type: "date",
        inputType: "date",
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "Notes",
        title: t("Notes", "ملاحظات"),
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "CreatedBy",
        title: t("Created By", "بواسطة"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        DefaultValue: UserName,
        visibleInView: false,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "CreatedAt",
        title: t("Created At", "Created At"),
        type: "date",
        inputType: "date",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "WarehouseCode",
        title: t("Warehouse Code", "كود المخزن"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "WarehouseNameA",
        title: t("Warehouse Name A", "Warehouse Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "WarehouseNameE",
        title: t("Warehouse Name E", "Warehouse Name E"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 12,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const ListColumns = useMemo<DynamicGridColumn[]>(
    () => [
      {
        field: "OpeningID",
        title: t("Opening", "Opening"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "WarehouseID",
        title: t("Warehouse", "Warehouse"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Warehouse", displayField: IsLangEN ? "NameE" : "NameA", valueField: "WarehouseID", condition: `CompCode = ${CompCode} AND BranchCode = ${BranchCode}` },
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "TrNo",
        title: t("Tr No", "Tr No"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "TrDate",
        title: t("Tr Date", "Tr Date"),
        type: "date",
        inputType: "date",
        IsRequired: true,
        DefaultValue: Today,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "Notes",
        title: t("Notes", "ملاحظات"),
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "WarehouseCode",
        title: t("Warehouse Code", "كود المخزن"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "WarehouseNameA",
        title: t("Warehouse Name A", "Warehouse Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 11,
      },
      {
        field: "WarehouseNameE",
        title: t("Warehouse Name E", "Warehouse Name E"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 12,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const Detail1Columns = useMemo<MasterDetailColumn[]>(
    () => [
      {
        field: "LineID",
        title: t("Line", "Line"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        SortFieldInEditAndAdd: 1,
      },
      {
        field: "OpeningID",
        title: t("Opening", "Opening"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        SortFieldInEditAndAdd: 2,
      },
      {
        field: "ItemID",
        title: t("Item", "Item"),
        inputType: "selectSearch",
        selectConfig: { tableName: "TST_Item", displayField: IsLangEN ? "NameE" : "NameA", valueField: "ItemID", condition: `CompCode = ${CompCode} AND IsActive = 1` },
        IsRequired: true,
        SortFieldInEditAndAdd: 3,
      },
      {
        field: "Qty",
        title: t("Quantity", "الكمية"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 4,
      },
      {
        field: "Cost",
        title: t("Cost", "Cost"),
        type: "number",
        inputType: "number",
        IsRequired: true,
        SortFieldInEditAndAdd: 5,
      },
      {
        field: "TotalCost",
        title: t("Total Cost", "Total Cost"),
        type: "number",
        inputType: "number",
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 6,
      },
      {
        field: "CompCode",
        title: t("Company Code", "كود الشركة"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: CompCode,
        visibleInView: false,
        IsSave: false,
        SortFieldInEditAndAdd: 7,
      },
      {
        field: "BranchCode",
        title: t("Branch Code", "كود الفرع"),
        type: "number",
        inputType: "number",
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsRequired: true,
        DefaultValue: BranchCode,
        visibleInView: false,
        IsSave: false,
        SortFieldInEditAndAdd: 8,
      },
      {
        field: "ItemCode",
        title: t("Item Code", "كود الصنف"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 9,
      },
      {
        field: "ItemNameA",
        title: t("Item Name A", "Item Name A"),
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 10,
      },
      {
        field: "ItemNameE",
        title: t("Item Name E", "Item Name E"),
        IsVisibleDisplayInGrid: false,
        editable: false,
        insertable: false,
        IsSave: false,
        SortFieldInEditAndAdd: 11,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode]
  );

  const FilterFields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "OpeningID", label: t("Opening", "Opening"), type: "number", sortOrder: 1 },
      { field: "WarehouseID", label: t("Warehouse", "Warehouse"), type: "number", sortOrder: 2 },
      { field: "TrNo", label: t("Tr No", "Tr No"), type: "number", sortOrder: 3 },
      { field: "TrDate", label: t("Tr Date", "Tr Date"), type: "date", sortOrder: 4 },
      { field: "Notes", label: t("Notes", "ملاحظات"), type: "text", sortOrder: 5 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN]
  );
  // #endregion

  const Config = useMemo<MasterDetailConfig>(
    () => ({
      tableName: TableName,
      viewName: ViewName,
      keyColumn: KeyColumn,
      columns: MasterColumns,
      listColumns: ListColumns,
      details: [
        {
          title: t("Lines", "السطور"),
          tableName: "TST_OpeningStockLine",
          viewName: "IQ_TST_OpeningStockLine",
          keyColumn: "LineID",
          foreignKeyColumn: "OpeningID",
          columns: Detail1Columns,
          totals: [],
          orderBy: "LineID",
        },
      ],
      condition: Condition,
      orderBy: "OpeningID",
      orderType: "DESC",
      pageSize: 10,
      filterFields: FilterFields,
      formLayout: FormLayoutCells,
      moduleCode: ModuleCode,
      excel: ExcelCfg,
      compCode: CompCode,
      branchCode: BranchCode,
      keyTrType: TrType,
      runProcessTrans: RunProcessTrans,
      enableInsert: true,
      enableUpdate: true,
      enableDelete: true,
      newTitle: t("New Test Opening Stock", "إضافة رصيد أول المدة اختبار"),
      editTitle: t("Test Opening Stock", "رصيد أول المدة اختبار"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [IsLangEN, CompCode, BranchCode, MasterColumns, ListColumns, Detail1Columns, FilterFields, ExcelCfg]
  );

  return { IsLangEN, IsDark, Config, filterReady };
}
// @CreatePageReact-Settings: {"Version":3,"ScreenType":"MasterDetail","Module":"TstOpeningStock","Table":"TST_OpeningStock","View":"IQ_TST_OpeningStock","KeyColumn":"OpeningID","TitleAr":"رصيد أول المدة اختبار","TitleEn":"Test Opening Stock","SubAr":"","SubEn":"","Icon":"fa-table-list","IconColor":"indigo","PageSize":10,"OrderBy":"","OrderType":"DESC","ExtraCondition":"","ProcessTrans":false,"TrType":"","Insert":true,"Edit":true,"Delete":true,"Export":true,"Permissions":true,"ParentMenu":"","Roles":"","Fields":[{"Field":"OpeningID","TitleAr":"Opening","TitleEn":"Opening","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":2},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":3},{"Field":"WarehouseID","TitleAr":"Warehouse","TitleEn":"Warehouse","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"TrNo","TitleAr":"Tr No","TitleEn":"Tr No","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"TrDate","TitleAr":"Tr Date","TitleEn":"Tr Date","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"Today","Width":150,"Order":6},{"Field":"Notes","TitleAr":"ملاحظات","TitleEn":"Notes","InGrid":true,"InForm":true,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":7},{"Field":"CreatedBy","TitleAr":"بواسطة","TitleEn":"Created By","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"UserName","DefaultValue":"","Width":150,"Order":8},{"Field":"CreatedAt","TitleAr":"Created At","TitleEn":"Created At","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"date","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"Now","DefaultValue":"today","Width":150,"Order":9},{"Field":"WarehouseCode","TitleAr":"كود المخزن","TitleEn":"Warehouse Code","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10},{"Field":"WarehouseNameA","TitleAr":"Warehouse Name A","TitleEn":"Warehouse Name A","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":11},{"Field":"WarehouseNameE","TitleAr":"Warehouse Name E","TitleEn":"Warehouse Name E","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":12}],"ListFields":[],"Details":[{"TitleAr":"السطور","TitleEn":"Lines","Table":"TST_OpeningStockLine","View":"IQ_TST_OpeningStockLine","KeyColumn":"LineID","ForeignKey":"OpeningID","Totals":"","OrderBy":"","Fields":[{"Field":"LineID","TitleAr":"Line","TitleEn":"Line","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":1},{"Field":"OpeningID","TitleAr":"Opening","TitleEn":"Opening","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":2},{"Field":"ItemID","TitleAr":"Item","TitleEn":"Item","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"selectSearch","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":3},{"Field":"Qty","TitleAr":"الكمية","TitleEn":"Quantity","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":4},{"Field":"Cost","TitleAr":"Cost","TitleEn":"Cost","InGrid":true,"InForm":true,"Required":true,"Search":true,"InFilter":true,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":5},{"Field":"TotalCost","TitleAr":"Total Cost","TitleEn":"Total Cost","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":6},{"Field":"CompCode","TitleAr":"كود الشركة","TitleEn":"Company Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"CompCode","DefaultValue":"","Width":150,"Order":7},{"Field":"BranchCode","TitleAr":"كود الفرع","TitleEn":"Branch Code","InGrid":false,"InForm":false,"Required":true,"Search":true,"InFilter":false,"InputType":"number","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"BranchCode","DefaultValue":"","Width":150,"Order":8},{"Field":"ItemCode","TitleAr":"كود الصنف","TitleEn":"Item Code","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":9},{"Field":"ItemNameA","TitleAr":"Item Name A","TitleEn":"Item Name A","InGrid":true,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":10},{"Field":"ItemNameE","TitleAr":"Item Name E","TitleEn":"Item Name E","InGrid":false,"InForm":false,"Required":false,"Search":true,"InFilter":false,"InputType":"text","Options":"","SearchFn":"","SearchCond":"","FillFrom":"","Formula":"","Auto":"","DefaultValue":"","Width":150,"Order":11}]}],"Validations":[]}
// @ScreenBuilder-Settings: {"version":5,"screenType":"MasterDetail","module":"TstOpeningStock","table":"TST_OpeningStock","view":"IQ_TST_OpeningStock","keyColumn":"OpeningID","titleAr":"رصيد أول المدة اختبار","titleEn":"Test Opening Stock","subAr":"","subEn":"","icon":"fa-table-list","iconColor":"indigo","pageSize":10,"orderBy":"","orderType":"DESC","extraCondition":"","processTrans":false,"trType":"","permissions":{"insert":true,"edit":true,"delete":true,"export":true,"usePermissions":true,"parentMenu":"","roles":""},"fields":[{"field":"OpeningID","titleAr":"Opening","titleEn":"Opening","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":2},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":3},{"field":"WarehouseID","titleAr":"Warehouse","titleEn":"Warehouse","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4,"selectTable":"TST_Warehouse","selectValue":"WarehouseID","selectDisplay":"NameA","selectDisplayEn":"NameE","selectCondition":"CompCode = {session.CompCode} AND BranchCode = {session.BranchCode}","selectOrderBy":"NameA"},{"field":"TrNo","titleAr":"Tr No","titleEn":"Tr No","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5,"readOnly":true},{"field":"TrDate","titleAr":"Tr Date","titleEn":"Tr Date","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"Today","width":150,"order":6},{"field":"Notes","titleAr":"ملاحظات","titleEn":"Notes","inGrid":true,"inForm":true,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":7},{"field":"CreatedBy","titleAr":"بواسطة","titleEn":"Created By","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"UserName","defaultValue":"","width":150,"order":8},{"field":"CreatedAt","titleAr":"Created At","titleEn":"Created At","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"date","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"Now","defaultValue":"today","width":150,"order":9},{"field":"WarehouseCode","titleAr":"كود المخزن","titleEn":"Warehouse Code","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10,"noSave":true},{"field":"WarehouseNameA","titleAr":"Warehouse Name A","titleEn":"Warehouse Name A","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":11,"noSave":true},{"field":"WarehouseNameE","titleAr":"Warehouse Name E","titleEn":"Warehouse Name E","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":12,"noSave":true}],"listFields":[],"details":[{"titleAr":"السطور","titleEn":"Lines","table":"TST_OpeningStockLine","view":"IQ_TST_OpeningStockLine","keyColumn":"LineID","foreignKey":"OpeningID","totals":"","orderBy":"","fields":[{"field":"LineID","titleAr":"Line","titleEn":"Line","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":1},{"field":"OpeningID","titleAr":"Opening","titleEn":"Opening","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":2},{"field":"ItemID","titleAr":"Item","titleEn":"Item","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"selectSearch","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":3,"selectTable":"TST_Item","selectDisplay":"NameA","selectDisplayEn":"NameE","selectValue":"ItemID","selectCondition":"CompCode = {session.CompCode} AND IsActive = 1"},{"field":"Qty","titleAr":"الكمية","titleEn":"Quantity","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":4},{"field":"Cost","titleAr":"Cost","titleEn":"Cost","inGrid":true,"inForm":true,"required":true,"search":true,"inFilter":true,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":5},{"field":"TotalCost","titleAr":"Total Cost","titleEn":"Total Cost","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":6,"noSave":true},{"field":"CompCode","titleAr":"كود الشركة","titleEn":"Company Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"CompCode","defaultValue":"","width":150,"order":7,"noSave":true},{"field":"BranchCode","titleAr":"كود الفرع","titleEn":"Branch Code","inGrid":false,"inForm":false,"required":true,"search":true,"inFilter":false,"inputType":"number","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"BranchCode","defaultValue":"","width":150,"order":8,"noSave":true},{"field":"ItemCode","titleAr":"كود الصنف","titleEn":"Item Code","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":9,"noSave":true},{"field":"ItemNameA","titleAr":"Item Name A","titleEn":"Item Name A","inGrid":true,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":10,"noSave":true},{"field":"ItemNameE","titleAr":"Item Name E","titleEn":"Item Name E","inGrid":false,"inForm":false,"required":false,"search":true,"inFilter":false,"inputType":"text","options":"","searchFn":"","searchCond":"","fillFrom":"","formula":"","auto":"","defaultValue":"","width":150,"order":11,"noSave":true}]}],"validations":[],"gridFilter":null,"tree":{"codeColumn":"","parentColumn":"","titleColumn":"","titleColumnEn":"","levelColumn":"","leafColumn":"","activeColumn":"","autoCode":true,"codeDigits":2,"codeSeparator":"","searchColumns":"","treePageSize":50},"headerFilter":{"enabled":false,"field":"","labelAr":"","labelEn":"","type":"dateRange","fromDefault":"monthStart","toDefault":"today"},"inlineStatus":{"enabled":false,"field":"","approveTrType":"","unapproveTrType":"","approvePermission":"","unapprovePermission":"","confirmBeforeChange":true},"meta":{"lastModified":"2026-11-05T10:14:22.893Z","modifiedBy":"","source":"web"},"menuSort":0,"layout":{"sections":[{"id":"sec_mw3e2aez1upk","titleAr":"","titleEn":"","rows":[{"id":"row_mw3e2aez1r33","cells":[{"id":"cell_mw3e2aez1opg","kind":"selectSearch","field":"WarehouseID","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3e2aez1pod","kind":"number","field":"TrNo","span":{"base":12,"md":6,"lg":4}},{"id":"cell_mw3e2aez1qj1","kind":"date","field":"TrDate","span":{"base":12,"md":6,"lg":4}}]},{"id":"row_mw3e2aez1t18","cells":[{"id":"cell_mw3e2aez1s2v","kind":"text","field":"Notes","span":{"base":12,"md":6,"lg":4}}]}]}]},"filterArea":[{"id":"flt_mw3e2aez1vce","field":"OpeningID","kind":"number","labelAr":"Opening","labelEn":"Opening","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3e2aez1wbt","field":"WarehouseID","kind":"number","labelAr":"Warehouse","labelEn":"Warehouse","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3e2aez1xti","field":"TrNo","kind":"number","labelAr":"Tr No","labelEn":"Tr No","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3e2aez1yzx","field":"TrDate","kind":"date","labelAr":"Tr Date","labelEn":"Tr Date","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}},{"id":"flt_mw3e2aez1z3b","field":"Notes","kind":"text","labelAr":"ملاحظات","labelEn":"Notes","required":false,"defaultValue":"","options":"","span":{"base":12,"md":6,"lg":4}}],"actions":[],"print":{"listPrint":{"enabled":false,"proc":"","params":[],"paper":"A4","orientation":"portrait"},"transactionPrint":{"enabled":false,"proc":"","params":[{"name":"CompCode","source":"session","value":"CompCode"},{"name":"BranchCode","source":"session","value":"BranchCode"},{"name":"TrID","source":"row","value":""}],"paper":"A4","orientation":"portrait"}},"excel":{"enabled":true,"templateName":"TstOpening_Template","columns":["WarehouseID","TrDate","Notes"],"keyLookups":[{"column":"WarehouseID","scope":"master","table":"TST_Warehouse","valueField":"WarehouseID","displayField":"NameA","codeField":"Code","condition":"CompCode = {session.CompCode}"},{"column":"ItemID","scope":"detail","table":"TST_Item","valueField":"ItemID","displayField":"NameA","codeField":"Code","condition":"CompCode = {session.CompCode}"}],"mode":"multiTransaction","detailColumns":["ItemID","Qty","Cost"]},"importedBestEffort":false}
