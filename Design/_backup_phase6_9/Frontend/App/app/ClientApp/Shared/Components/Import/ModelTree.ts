// =====================================================================================
//  📄 ModelTree.ts  —  أنواع إعدادات شاشة الشجرة (زي شجرة الحسابات / مراكز التكلفة)
// -------------------------------------------------------------------------------------
//  كل صف في الجدول = عقدة. العقدة بتتربط بأبوها عن طريق:
//      parentColumn (في الابن)  =  codeColumn (في الأب)
//  العقدة اللي parentColumn بتاعها فاضي (أو rootValue) = جذر.
//  الشجرة بتتحمل على مراحل (كل مستوى لما تفتحه) + تحميل تلقائي وانت بتنزل (Infinite Scroll)
//  وفيها بحث من السيرفر، فتنفع مع شجرة فيها مئات الآلاف من العقد.
// =====================================================================================

import { ValidationRule } from "../../Validation";
import { MasterDetailColumn, MasterDetailDetailConfig } from "./ModelMasterDetail";

export interface TreeNodeConfig {
  tableName: string;             // الجدول اللي بيتحفظ فيه
  viewName?: string;             // القالب اللي الشجرة بتتقري منه (لو مختلف)
  keyColumn: string;             // المفتاح (Identity) — مثلاً CostCenterID
  codeColumn: string;            // كود العقدة اللي الأبناء بيشاوروا عليه — مثلاً CC_CODE
  parentColumn: string;          // عمود الأب — مثلاً PARENT_ACC
  titleColumn: string;           // اسم العقدة بالعربي — مثلاً CC_DESCA
  titleColumnEn?: string;        // اسم العقدة بالإنجليزي — مثلاً CC_DESCL
  levelColumn?: string;          // المستوى (بيتحسب لوحده = مستوى الأب + 1)
  leafColumn?: string;           // عمود "حساب نهائي/تفصيلي" (bit): لو 1 العقدة مالهاش أبناء
  activeColumn?: string;         // عمود فعال (bit): العقدة الموقوفة بتظهر باهتة
  rootValue?: string | number | null; // قيمة الأب للجذور (الافتراضي فاضي/NULL)
  autoCode?: boolean;            // كود الابن الجديد = كود الأب + مسلسل (الافتراضي true)
  codeSeparator?: string;        // فاصل بين كود الأب والمسلسل (الافتراضي "")
  codeDigits?: number;           // عدد خانات المسلسل (الافتراضي 2 → 01، 02 ...)
}

export interface TreeScreenConfig extends TreeNodeConfig {
  // ===== الفورم =====
  columns: MasterDetailColumn[];           // حقول العقدة
  details?: MasterDetailDetailConfig[];    // تفاصيل اختيارية للعقدة (لحد 5)

  // ===== التحميل =====
  condition?: string;            // شرط ثابت (مثلاً CompCode = 1)
  orderBy?: string;              // ترتيب الأبناء (الافتراضي codeColumn)
  pageSize?: number;             // عدد العقد في كل تحميل (الافتراضي 50)
  searchColumns?: string[];      // الأعمدة اللي البحث بيدور فيها (الافتراضي الكود والاسم)

  // ===== الحفظ =====
  compCode: number;
  branchCode: number;
  keyTrType?: string;
  runProcessTrans?: boolean;
  validations?: ValidationRule[];

  // ===== الأزرار =====
  enableInsert?: boolean;
  enableUpdate?: boolean;
  enableDelete?: boolean;
  allowDeleteWithChildren?: boolean; // الافتراضي false: ممنوع تحذف أب ليه أبناء

  // نصوص
  treeTitle?: string;
  newRootTitle?: string;
  newChildTitle?: string;
}

// عقدة محمّلة في الذاكرة
export interface TreeNode {
  key: any;                      // قيمة keyColumn
  code: string;                  // قيمة codeColumn
  parent: string;                // قيمة parentColumn
  title: string;
  level: number;                 // عمق العقدة في الشجرة المعروضة (0 = جذر)
  isLeaf: boolean | null;        // null = لسه مش معروف
  inactive: boolean;
  row: Record<string, any>;
}
