"use client";

import React from "react";
import { useSys } from "../../Shared/SystemUsing";

interface HelpPanelProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
}

const HELP_CONTENT: Record<string, { titleEn: string; titleAr: string; contentEn: string[]; contentAr: string[] }> = {
  start: {
    titleEn: "Getting started (A to Z)",
    titleAr: "البداية من الألف للياء",
    contentEn: [
      "1) Sidebar: type Server, User, Password → Connect. Settings are remembered next time.",
      "2) Pick the database, then the Table (where data is saved) and optionally a View (for display) → Load Columns.",
      "3) Top bar: choose Grid, M/D (Master Detail) or Tree. Not sure? Press Examples and load a ready one.",
      "4) Setup tab: module code (= folder name), titles, icon. For Tree: check the tree columns.",
      "5) Fields tab: titles, what shows in the grid/form, required, input types, defaults.",
      "6) Preview & Save: review the code → Save to project (writes the files) → Execute SQL (adds menu + permissions).",
      "7) Open the app and refresh: the screen appears in the menu.",
    ],
    contentAr: [
      "1) من الجنب: اكتب السيرفر واليوزر والباسورد ← اتصال. الإعدادات بتتحفظ للمرة الجاية.",
      "2) اختار القاعدة، وبعدين الجدول (اللي بيتحفظ فيه) و View لو عايز (للعرض) ← تحميل الأعمدة.",
      "3) من فوق: اختار جريد أو ماستر ديتيل أو شجرة. مش متأكد؟ دوس أمثلة وحمّل واحد جاهز.",
      "4) تاب الإعداد: كود الشاشة (= اسم الفولدر)، العناوين، الأيقونة. في الشجرة: راجع أعمدة الشجرة.",
      "5) تاب الحقول: العناوين، إيه اللي يظهر في الجدول والفورم، الإجباري، نوع الإدخال، القيم الافتراضية.",
      "6) المعاينة والحفظ: راجع الكود ← حفظ في المشروع (بيكتب الملفات) ← تنفيذ SQL (بيضيف القايمة والصلاحيات).",
      "7) افتح البرنامج واعمل تحديث: الشاشة هتظهر في القايمة.",
    ],
  },
  tree: {
    titleEn: "Tree screens (chart of accounts / cost centers)",
    titleAr: "شاشة الشجرة (شجرة الحسابات / مراكز التكلفة)",
    contentEn: [
      "Every row is a node. A child points to its parent: Parent column (child) = Code column (parent). Empty parent = root.",
      "Code column: unique code (e.g. CC_CODE). Parent column: e.g. PARENT_ACC. Name: e.g. CC_DESCA / CC_DESCL.",
      "Level column: filled automatically = parent level + 1. Leaf (DETAIL) column: final node with no children.",
      "Auto code: a new child gets parent code + serial. With 2 digits: parent 01 → children 0101, 0102 …",
      "Big trees: only opened levels load, more nodes load while you scroll (infinite scroll), and only visible rows are drawn.",
      "The search box searches the server (code + name by default). Click a result to open its parents and jump to it.",
      "Keyboard: ↑↓ move, → open, ← close / go to parent, Enter edit. Hover a node for + (child), ✎ (edit), 🗑 (delete).",
      "Safety: a parent with children can't be deleted and its code is locked. Duplicate codes are refused.",
      "Node Details tab: optional child tables per node (same as Master Detail details).",
      "Example: press Examples → Cost Centers Tree (A_Cost_Center).",
    ],
    contentAr: [
      "كل صف = عقدة. الابن بيشاور على أبوه: عمود الأب (في الابن) = عمود الكود (في الأب). الأب فاضي = جذر.",
      "عمود الكود: كود ميتكررش (مثلاً CC_CODE). عمود الأب: مثلاً PARENT_ACC. الاسم: مثلاً CC_DESCA / CC_DESCL.",
      "عمود المستوى: بيتملي لوحده = مستوى الأب + 1. عمود النهائي (DETAIL): عقدة مالهاش أبناء.",
      "الكود التلقائي: الابن الجديد بياخد كود الأب + مسلسل. بخانتين: الأب 01 ← الأبناء 0101، 0102 …",
      "الشجر الكبيرة: بيتحمل المستوى اللي بتفتحه بس، والباقي بيتحمل وانت بتنزل (Infinite Scroll)، وبيترسم اللي قدامك بس.",
      "البحث بيدور في السيرفر (الكود والاسم). دوس على النتيجة وهيفتح آباءها ويوديك عندها.",
      "الكيبورد: ↑↓ تنقل، → فتح، ← قفل / روح للأب، Enter تعديل. عدّي بالماوس على العقدة: + ابن، ✎ تعديل، 🗑 حذف.",
      "أمان: الأب اللي ليه أبناء مينفعش يتمسح وكوده بيتقفل. والكود المكرر بيترفض.",
      "تاب تفاصيل العقدة: جداول فرعية اختيارية لكل عقدة (زي تفاصيل الماستر ديتيل).",
      "مثال: دوس أمثلة ← شجرة مراكز التكلفة (A_Cost_Center).",
    ],
  },
  setup: {
    titleEn: "Setup Tab",
    titleAr: "تاب الإعداد",
    contentEn: [
      "Screen Type: Grid for simple tables, Master Detail for invoices (header + rows), Tree for parent/child data like a chart of accounts.",
      "Module Code: Must match the folder name in ClientApp. Used for routing and permissions.",
      "Icon: Font Awesome class (e.g., fa-table-list, fa-file-invoice). Preview shows on the left.",
      "FilterComp/FilterBranch: Adds CompCode/BranchCode to the WHERE clause automatically.",
      "ProcessTrans: Enables G_ProcessTrans stored procedure after save/delete. TrType identifies your branch.",
      "Permissions: Generates SQL to add the module to Sys_Modules and assign roles.",
    ],
    contentAr: [
      "نوع الشاشة: جريد للجداول البسيطة، ماستر ديتيل للفواتير (رأس + صفوف)، شجرة للبيانات اللي ليها أب وأبناء زي شجرة الحسابات.",
      "كود الشاشة: لازم يكون نفس اسم الفولدر في ClientApp. بيتستخدم للمسارات والصلاحيات.",
      "الأيقونة: كلاس Font Awesome (زي fa-table-list, fa-file-invoice). المعاينة على الشمال.",
      "فلتر الشركة/الفرع: بيضيف CompCode/BranchCode للشرط تلقائي.",
      "معالجة العملية: بيشغل G_ProcessTrans بعد الحفظ/الحذف. TrType بيحدد الفرع بتاعك.",
      "الصلاحيات: بيولد SQL يضيف الموديول في Sys_Modules ويعين الأدوار.",
    ],
  },
  fields: {
    titleEn: "Fields Tab",
    titleAr: "تاب الحقول",
    contentEn: [
      "Green row = Primary Key / Identity column (auto-detected).",
      "Yellow row = Computed column or View-only (won't be saved).",
      "Gray row = Auto-value column (CompCode, BranchCode, etc.).",
      "Purple row = Formula column (calculated from other fields).",
      "Input Types: text, number, textarea, checkbox, date, select (dropdown), search (modal lookup).",
      "Select options: 0=نقدي=Cash;1=آجل=Credit (value=Arabic=English) or the short form 0:No|1:Yes.",
      "SearchFn: Name of a search function from G_SearchFrom.ts.",
      "FillFrom: Maps returned fields. Format: LocalCol=ReturnCol;LocalCol2=ReturnCol2.",
      "Formula: JavaScript expression using field names (e.g., Qty * UnitPrice).",
      "Auto: Automatically fills from session (CompCode, BranchCode, UserID, FinYear).",
      "Default: GetDateNow() (today), GetDateTimeNow(), UserName, UserID, CompCode, BranchCode, FinYear, true/false, or any value.",
    ],
    contentAr: [
      "صف أخضر = مفتاح أساسي / عمود هوية (بيتكشف تلقائي).",
      "صف أصفر = عمود محسوب أو من العرض بس (مش هيتحفظ).",
      "صف رمادي = عمود قيمة تلقائية (CompCode, BranchCode, إلخ).",
      "صف بنفسجي = عمود معادلة (بيتحسب من حقول تانية).",
      "أنواع الإدخال: text, number, textarea, checkbox, date, select (قائمة), search (نافذة بحث).",
      "خيارات select: 0=نقدي=Cash;1=آجل=Credit (قيمة=عربي=انجليزي) أو المختصر 0:لا|1:نعم.",
      "SearchFn: اسم دالة بحث من G_SearchFrom.ts.",
      "FillFrom: ربط الحقول المرجعة. الصيغة: حقل محلي=حقل مرجع;حقل2=حقل مرجع2.",
      "Formula: تعبير جافاسكريبت باستخدام أسماء الحقول (مثال: Qty * UnitPrice).",
      "Auto: ملء تلقائي من الجلسة (CompCode, BranchCode, UserID, FinYear).",
      "Default: GetDateNow() (النهارده)، GetDateTimeNow()، UserName، UserID، CompCode، BranchCode، FinYear، true/false، أو أي قيمة.",
    ],
  },
  details: {
    titleEn: "Details Tab",
    titleAr: "تاب التفاصيل",
    contentEn: [
      "Up to 5 detail tables can be linked to the master.",
      "Table: The save table for this detail (e.g., I_TR_SaleDetails).",
      "View: Optional display view for reading (e.g., IQ_TR_SaleDetails).",
      "Foreign Key: Column in detail table that links to master's key column.",
      "Totals: sum detail values into master fields. Format: ItemsTotal=LineTotal;ItemsCount=count (or ItemsTotal:LineTotal:sum).",
      "Load Detail Columns: Reads columns from the detail table to configure fields.",
    ],
    contentAr: [
      "ممكن تربط لحد 5 جداول تفاصيل بالماستر.",
      "الجدول: جدول الحفظ للتفصيل (مثال: I_TR_SaleDetails).",
      "العرض: عرض اختياري للقراءة (مثال: IQ_TR_SaleDetails).",
      "المفتاح الأجنبي: العمود في جدول التفصيل اللي بيربط بمفتاح الماستر.",
      "المجاميع: جمع قيم التفصيل في حقول الماستر. الصيغة: ItemsTotal=LineTotal;ItemsCount=count (أو ItemsTotal:LineTotal:sum).",
      "تحميل الأعمدة: بيقرا الأعمدة من جدول التفصيل.",
    ],
  },
  validations: {
    titleEn: "Validations Tab",
    titleAr: "تاب التحقق",
    contentEn: [
      "required: Field must have a value.",
      "compare: Compare field to another field or literal value.",
      "range: Value must be between min and max.",
      "regex: Value must match a regular expression pattern.",
      "unique: No duplicate values in the grid column.",
      "exists: Value must exist in another table.",
      "notExists: Value must NOT exist in another table.",
      "noDuplicate: No duplicate rows based on this field.",
      "minRows: Minimum number of detail rows required.",
      "custom: JavaScript code returning error message or null.",
      "When: 'both' = insert+update, 'insert' = only on new, 'update' = only on edit.",
    ],
    contentAr: [
      "required: الحقل لازم يكون فيه قيمة.",
      "compare: مقارنة الحقل بحقل تاني أو قيمة ثابتة.",
      "range: القيمة لازم تكون بين الحد الأدنى والأقصى.",
      "regex: القيمة لازم تطابق نمط تعبير منتظم.",
      "unique: مفيش قيم مكررة في العمود.",
      "exists: القيمة لازم تكون موجودة في جدول تاني.",
      "notExists: القيمة لازم ماتكونش موجودة في جدول تاني.",
      "noDuplicate: مفيش صفوف مكررة بناءً على الحقل ده.",
      "minRows: حد أدنى لعدد صفوف التفصيل المطلوبة.",
      "custom: كود جافاسكريبت بيرجع رسالة خطأ أو null.",
      "متى: 'both' = إضافة+تعديل، 'insert' = إضافة بس، 'update' = تعديل بس.",
    ],
  },
  preview: {
    titleEn: "Preview & Save Tab",
    titleAr: "تاب المعاينة والحفظ",
    contentEn: [
      "Module.ts: The main hook file with columns, validations, and configuration.",
      "page.tsx: The UI component that renders the screen.",
      "Resources: Translation entries to add to Resources.ts.",
      "Routes: The entry to add to Routes.tsx for navigation.",
      "SQL Script: Permissions script to add the module and assign roles.",
      "Execute SQL: Runs the permissions script directly on the connected database.",
      "Download All: Downloads .ts, page.tsx, and SQL as separate files.",
      "Save to project: writes the folder, .ts, page.tsx, CSS, and adds Routes + Resources entries (old files are backed up first).",
    ],
    contentAr: [
      "Module.ts: ملف الـ hook الرئيسي فيه الأعمدة والتحققات والإعدادات.",
      "page.tsx: مكون الواجهة اللي بيعرض الشاشة.",
      "Resources: إدخالات الترجمة لإضافتها في Resources.ts.",
      "Routes: الإدخال لإضافته في Routes.tsx للتنقل.",
      "SQL Script: سكريبت الصلاحيات لإضافة الموديول وتعيين الأدوار.",
      "Execute SQL: بيشغل سكريبت الصلاحيات مباشرة على قاعدة البيانات المتصلة.",
      "تحميل الكل: بينزل .ts, page.tsx, و SQL كملفات منفصلة.",
      "حفظ في المشروع: بيكتب الفولدر و .ts و page.tsx و CSS وبيضيف Routes و Resources (والملفات القديمة بتتاخد نسخة احتياطي الأول).",
    ],
  },
};

export default function HelpPanel({ activeTab, isOpen, onClose }: HelpPanelProps) {
  const isDark = useSys((s) => s.IsDark);
  const lang = useSys((s) => s.lang);
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const isAr = lang === "ar";

  if (!isOpen) return null;

  const KEY_MAP: Record<string, string> = { list: "fields" };
  const currentKey = KEY_MAP[activeTab] || activeTab;
  const help = HELP_CONTENT[currentKey] || HELP_CONTENT.start;
  const fullKeys = ["start", "tree"];
  const allHelp = Object.entries(HELP_CONTENT);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className={`w-96 max-w-full shadow-2xl flex flex-col ${isDark ? "bg-gray-900" : "bg-white"}`} dir={isAr ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-question text-blue-400" />
            <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t("Help", "المساعدة")}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><i className="fa-solid fa-xmark" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current tab help */}
          <div className={`rounded-xl border p-4 ${isDark ? "border-blue-800 bg-blue-900/20" : "border-blue-200 bg-blue-50"}`}>
            <h3 className={`text-sm font-bold mb-2 ${isDark ? "text-blue-300" : "text-blue-700"}`}>
              <i className="fa-solid fa-bookmark mr-1" />
              {isAr ? help.titleAr : help.titleEn}
            </h3>
            <ul className="space-y-1.5">
              {(isAr ? help.contentAr : help.contentEn).map((item, i) => (
                <li key={i} className={`text-xs leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <span className="text-blue-400 mr-1">•</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* All tabs reference */}
          {allHelp.filter(([key]) => key !== currentKey).map(([key, h]) => (
            <div key={key} className={`rounded-xl border p-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <h4 className={`text-xs font-semibold mb-1.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {isAr ? h.titleAr : h.titleEn}
              </h4>
              <ul className="space-y-1">
                {(isAr ? h.contentAr : h.contentEn).slice(0, fullKeys.includes(key) ? 99 : 3).map((item, i) => (
                  <li key={i} className={`text-[11px] leading-relaxed ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    <span className="mr-1">•</span> {item}
                  </li>
                ))}
                {!fullKeys.includes(key) && (isAr ? h.contentAr : h.contentEn).length > 3 && (
                  <li className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-300"}`}>
                    +{(isAr ? h.contentAr : h.contentEn).length - 3} {t("more...", "المزيد...")}
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
