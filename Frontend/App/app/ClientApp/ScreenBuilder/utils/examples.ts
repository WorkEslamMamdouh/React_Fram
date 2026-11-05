// =====================================================================================
//  أمثلة جاهزة في ScreenBuilder — دوس على مثال وهيتحمّل بكل إعداداته
// =====================================================================================

import { createEmptyField, createEmptyScreen, FieldConfigV4, ScreenConfigV5 } from "../types/ScreenConfig";

function f(field: string, titleAr: string, titleEn: string, extra: Partial<FieldConfigV4> = {}): FieldConfigV4 {
  return { ...createEmptyField(field), titleAr, titleEn, ...extra };
}

const hidden = { inGrid: false, inForm: false, search: false, inFilter: false };

export interface ScreenExample {
  id: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  stepsEn: string[];
  stepsAr: string[];
  build: () => ScreenConfigV5;
}

export const EXAMPLES: ScreenExample[] = [
  {
    id: "costcenter-tree",
    icon: "fa-sitemap",
    titleEn: "Cost Centers Tree",
    titleAr: "شجرة مراكز التكلفة",
    descEn: "Tree screen on A_Cost_Center: parent/child by CC_CODE ↔ PARENT_ACC, auto code, level and search.",
    descAr: "شاشة شجرة على A_Cost_Center: الأب والابن بـ CC_CODE ↔ PARENT_ACC، كود تلقائي، مستوى، وبحث.",
    stepsEn: [
      "Connect and pick database ESSA_React",
      "Load the example, then choose table A_Cost_Center and press Load Columns (tree columns fill themselves)",
      "Preview & Save → Save to project → Execute SQL",
    ],
    stepsAr: [
      "اتصل واختار قاعدة ESSA_React",
      "حمّل المثال، وبعدين اختار جدول A_Cost_Center ودوس تحميل الأعمدة (أعمدة الشجرة بتتملي لوحدها)",
      "المعاينة والحفظ → حفظ في المشروع → تنفيذ SQL",
    ],
    build: () => {
      const c = createEmptyScreen("Tree");
      c.module = "CostCenterTree";
      c.table = "A_Cost_Center";
      c.view = "A_Cost_Center";
      c.keyColumn = "CostCenterID";
      c.titleAr = "مراكز التكلفة";
      c.titleEn = "Cost Centers";
      c.subAr = "شجرة مراكز التكلفة";
      c.subEn = "Cost centers tree";
      c.icon = "fa-sitemap";
      c.orderBy = "CC_CODE";
      c.orderType = "ASC";
      c.tree = {
        ...c.tree,
        codeColumn: "CC_CODE",
        parentColumn: "PARENT_ACC",
        titleColumn: "CC_DESCA",
        titleColumnEn: "CC_DESCL",
        levelColumn: "CC_LEVEL",
        leafColumn: "DETAIL",
        activeColumn: "CC_ACTIVE",
        autoCode: true,
        codeDigits: 2,
      };
      c.fields = [
        f("CostCenterID", "المسلسل", "ID", { ...hidden, inputType: "number" }),
        f("CompCode", "كود الشركة", "Company", { ...hidden, inputType: "number", auto: "CompCode" }),
        f("BranchCode", "كود الفرع", "Branch", { ...hidden, inputType: "number", auto: "BranchCode" }),
        f("CC_CODE", "الكود", "Code", { required: true, order: 1 }),
        f("CC_DESCA", "الاسم عربي", "Arabic name", { required: true, order: 2 }),
        f("CC_DESCL", "الاسم انجليزي", "English name", { order: 3 }),
        f("PARENT_ACC", "الأب", "Parent", { order: 4 }),
        f("CC_LEVEL", "المستوى", "Level", { inputType: "number", order: 5 }),
        f("DETAIL", "نهائي", "Detail", { inputType: "checkbox", order: 6 }),
        f("CC_ACTIVE", "فعال", "Active", { inputType: "checkbox", defaultValue: "true", order: 7 }),
        f("REMARKS", "ملاحظات", "Remarks", { inputType: "textarea", order: 8 }),
        f("CREATED_BY", "بواسطة", "Created by", { ...hidden, defaultValue: "UserName" }),
        f("CREATED_AT", "تاريخ الإنشاء", "Created at", { ...hidden, inputType: "date", defaultValue: "GetDateNow()" }),
      ];
      return c;
    },
  },
  {
    id: "cashtypes-grid",
    icon: "fa-table-list",
    titleEn: "Cash Types (Grid)",
    titleAr: "أنواع النقدية (جريد)",
    descEn: "Simple grid on D_A_CashTypes with auto CompCode/BranchCode, required description and an active checkbox.",
    descAr: "جريد بسيط على D_A_CashTypes: كود الشركة والفرع تلقائي، الوصف إجباري، وخانة فعال.",
    stepsEn: ["Load the example", "Load Columns for D_A_CashTypes to merge with the database", "Preview & Save"],
    stepsAr: ["حمّل المثال", "حمّل أعمدة D_A_CashTypes عشان تتطابق مع القاعدة", "المعاينة والحفظ"],
    build: () => {
      const c = createEmptyScreen("Grid");
      c.module = "CashTypesBuilderDemo";   // اسم مختلف عن شاشة CashTypesDemo الحقيقية
      c.table = "D_A_CashTypes";
      c.view = "D_A_CashTypes";
      c.keyColumn = "CashTypeID";
      c.titleAr = "أنواع النقدية";
      c.titleEn = "Cash Types";
      c.fields = [
        f("CashTypeID", "المسلسل", "ID", { inputType: "number", inForm: false }),
        f("CompCode", "الشركة", "Company", { ...hidden, auto: "CompCode" }),
        f("BranchCode", "الفرع", "Branch", { ...hidden, auto: "BranchCode" }),
        f("Description", "الوصف", "Description", { required: true }),
        f("ChargePrc", "نسبة العمولة", "Charge %", { inputType: "number", defaultValue: "0" }),
        f("CashAccCode", "حساب النقدية", "Cash account"),
        f("IsActive", "فعال", "Active", { inputType: "checkbox", defaultValue: "true" }),
      ];
      // Phase 5: منطقة فلتر — دروب داون الفرع من Sys_Branch بشرط الشركة الحالية + فلتر فعال/غير فعال
      c.filterArea = [
        { id: "flt_branch", field: "BranchCode", kind: "select", labelAr: "الفرع", labelEn: "Branch", required: false, defaultValue: "", options: "",
          source: { table: "Sys_Branch", valueField: "BranchCode", displayField: "BranchDescA", displayFieldEn: "BranchDescE", condition: "CompCode = {session.CompCode}", orderBy: "BranchCode" },
          span: { base: 12, md: 6, lg: 4 } },
        { id: "flt_active", field: "IsActive", kind: "select", labelAr: "الحالة", labelEn: "Status", required: false, defaultValue: "", options: "1=فعال=Active;0=غير فعال=Inactive", span: { base: 12, md: 6, lg: 4 } },
        { id: "flt_desc", field: "Description", kind: "text", labelAr: "الوصف", labelEn: "Description", required: false, defaultValue: "", options: "", span: { base: 12, md: 6, lg: 4 } },
      ];
      return c;
    },
  },
  {
    id: "sales-md",
    icon: "fa-layer-group",
    titleEn: "Sales Invoice (Master Detail)",
    titleAr: "فاتورة مبيعات (ماستر ديتيل)",
    descEn: "Header in I_TR_Sales + items in I_TR_SaleDetails, with a formula (Quantity × Price) summed into ItemsTotal.",
    descAr: "الرأس في I_TR_Sales والأصناف في I_TR_SaleDetails، مع معادلة (الكمية × السعر) بتتجمع في إجمالي الأصناف.",
    stepsEn: ["Load the example", "Details tab: review the formula and totals", "Validations tab: at least one row", "Preview & Save"],
    stepsAr: ["حمّل المثال", "تاب التفاصيل: راجع المعادلة والمجاميع", "تاب التحققات: صف واحد على الأقل", "المعاينة والحفظ"],
    build: () => {
      const c = createEmptyScreen("MasterDetail");
      c.module = "SalesInvoiceDemo";
      c.table = "I_TR_Sales";
      c.view = "IQ_TR_Sales";
      c.keyColumn = "SaleID";
      c.titleAr = "فاتورة مبيعات";
      c.titleEn = "Sales Invoice";
      c.fields = [
        f("SaleID", "رقم الفاتورة", "Invoice No", { inputType: "number", inForm: false }),
        f("CompCode", "الشركة", "Company", { ...hidden, auto: "CompCode" }),
        f("SaleDate", "التاريخ", "Date", { inputType: "date", defaultValue: "GetDateNow()", required: true }),
        f("CustomerName", "العميل", "Customer", { required: true }),
        f("ItemsTotal", "إجمالي الأصناف", "Items total", { inputType: "number", inForm: false }),
        f("Discount", "الخصم", "Discount", { inputType: "number", defaultValue: "0" }),
        f("TotalAmount", "الإجمالي", "Total", { inputType: "number", formula: "ItemsTotal - Discount" }),
        f("NetAmount", "الصافي", "Net", { inputType: "number", inForm: false, noSave: true }),
        f("Remarks", "ملاحظات", "Remarks", { inputType: "textarea" }),
        f("CreatedBy", "بواسطة", "Created by", { ...hidden, defaultValue: "UserName" }),
      ];
      c.details = [
        {
          titleAr: "الأصناف",
          titleEn: "Items",
          table: "I_TR_SaleDetails",
          view: "IQ_TR_SaleDetails",
          keyColumn: "SaleDetailID",
          foreignKey: "SaleID",
          totals: "ItemsTotal:LineTotal:sum",
          orderBy: "SaleDetailID",
          fields: [
            f("SaleDetailID", "م", "#", { ...hidden }),
            f("SaleID", "الفاتورة", "Invoice", { ...hidden }),
            f("NameItem", "الصنف", "Item", { required: true }),
            f("Quantity", "الكمية", "Qty", { inputType: "number", defaultValue: "1", required: true }),
            f("UnitPrice", "السعر", "Price", { inputType: "number", required: true }),
            f("LineTotal", "الإجمالي", "Total", { inputType: "number", formula: "Quantity * UnitPrice", noSave: true }),
          ],
        },
      ];
      c.validations = [
        { detail: 1, type: "minRows", field: "", when: "both", operator: "", compareTo: "", value: "", min: "1", max: "", pattern: "", table: "", condition: "", code: "", messageAr: "لازم صنف واحد على الأقل", messageEn: "Add at least one item" },
      ];
      return c;
    },
  },
];
