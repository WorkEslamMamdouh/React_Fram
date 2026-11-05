# خطة اختبار ScreenBuilder والتقارير (على كائنات TST_)

> كل الكائنات في `Database/Test_ScreenBuilder_Schema.sql` (الحذف: `Test_ScreenBuilder_Drop.sql`).
> البيانات: شركة 1، فرع 1 و 2. سجّل دخول بشركة 1 (فرع 1 وبعدين فرع 2) عشان تجرّب النطاقات.
> **مهم:** مفيش فرع `TST` جوه `G_ProcessTrans` ومش مسموح نعدّله، فكل شاشات الماستر ديتيل لازم تتبني بـ `processTrans = false`. عشان كده `TrNo` مابيتولّدش لوحده: بيتملى لما تدوس زر "ترحيل" (`TST_Proc_PostOrder`).

## الكائنات
| النوع | الأسماء |
|---|---|
| جداول مساعدة | `TST_Category` (شجرة)، `TST_Unit`، `TST_Warehouse`، `TST_Customer`، `TST_Item` |
| جريد | `TST_Expense` + فيو `IQ_TST_Expense` |
| ماستر ديتيل | `TST_Order` + `TST_OrderLine` + `TST_OrderPayment` + فيوهات `IQ_TST_Order` / `IQ_TST_OrderLine` / `IQ_TST_OrderPayment` |
| رصيد أول المدة | `TST_OpeningStock` + `TST_OpeningStockLine` + فيوهات `IQ_TST_OpeningStock` / `IQ_TST_OpeningStockLine` (فاضيين عن قصد) |
| تقارير | `TST_Rpt_OrderList`، `TST_Rpt_SalesByCategory`، `TST_Rpt_CustomerStatement`، `TST_Rpt_OrderPrint`، `TST_Rpt_ItemsBarcode`، `TST_Rpt_Dashboard` |
| أزرار | `TST_Proc_PostOrder`، `TST_Proc_CancelOrder`، `TST_Proc_RecalcOrder` |

حجم البيانات: 12 تصنيف، 4 وحدات، 3 مخازن، 40 عميل، 200 صنف، 1500 مصروف، 600 طلب (1 إلى 8 أصناف، 0 إلى 2 دفعة)، من 2025-01 لـ 2026-10.
حالات الطلب: 0 مسودة (بدون TrNo) / 1 مرحّل / 2 ملغي. نوع الدفع: 0 نقدي / 1 آجل / 2 بطاقة.

---
## أولًا: الشاشات

### 1) جريد المصروفات `TstExpense`
- النوع: جريد. الجدول `TST_Expense`، الفيو `IQ_TST_Expense`، المفتاح `ExpenseID`. `processTrans = false`.
- الحقول: `ExpenseDate` تاريخ (افتراضي اليوم)، `Amount` عشري، `CategoryID` دروب داون من `TST_Category` (قيمة `CategoryID`، عرض `NameA`/`NameE`، شرط `CompCode = {session.CompCode} AND IsActive = 1`)، `ItemID` دروب داون **متسلسل** من `TST_Item` (قيمة `ItemID`، عرض `NameA`/`NameE`، شرط `CompCode = {session.CompCode} AND CategoryID = {row.CategoryID}`)، `CustomerID` دروب داون من `TST_Customer` (شرط `CompCode = {session.CompCode} AND IsActive = 1`)، `Notes` نص طويل، `Status` اختيار ثابت `0:معلّق|1:معتمد|2:مرفوض`.
- `CompCode` و `BranchCode` = من الجلسة (مش ظاهرين). `CreatedBy` = UserName من الجلسة.
- القايمة بتعرض أعمدة الفيو: `CategoryNameA`, `ItemNameA`, `CustomerNameA`, `StatusTextA` (الأعمدة دي `noSave`).
- الفلاتر:
  - مدى تاريخ `ExpenseDate` (افتراضي `monthStart|today`).
  - `CategoryID` دروب داون، و`ItemID` متسلسل: `CategoryID = {filter.CategoryID}` (لو التصنيف فاضي الصنف بيبقى `1 = 0`).
  - `CustomerID` دروب داون.
  - `Status` اختيار (شيبس: معلّق / معتمد / مرفوض).
  - `Notes` يحتوي.
- اختبر: ترقيم الصفحات والتمرير مع 1500 صف، الفرز، الفلاتر مع بعض، صلاحيات الإضافة/التعديل/الحذف.

### 2) ماستر ديتيل الطلبات `TstOrder` (التفاصيل 2)
- النوع: MasterDetail. الماستر `TST_Order` (المفتاح `OrderID`) والقايمة من `IQ_TST_Order`. `processTrans = false`.
- ماستر: `TrNo` (قراءة فقط)، `TrDate`، `CustomerID` (دروب داون)، `WarehouseID` دروب داون **متسلسل على الفرع**: شرط `CompCode = {session.CompCode} AND BranchCode = {session.BranchCode}`، `Status` اختيار ثابت (قراءة فقط)، `PaymentType` `0:نقدي|1:آجل|2:بطاقة`، `Notes`، `Total` و`Net` (قراءة فقط)، `Discount`.
- التفصيلة 1 `TST_OrderLine` (قايمة `IQ_TST_OrderLine`، الربط `OrderID`): `ItemID` دروب داون من `TST_Item` أو نافذة بحث، `Qty`، `UnitPrice` (يتملى من `Price` الصنف)، `DiscountPrc`، `Notes`.
  - **`LineTotal` عمود محسوب** → `IsSave: false` وقراءة فقط (علامة 🔒). لازم ماينحفظش وإلا الحفظ يفشل.
  - حساب تلقائي: `Total = sum(LineTotal)` و`Net = Total - Discount`.
- التفصيلة 2 `TST_OrderPayment` (قايمة `IQ_TST_OrderPayment`): `PayDate`، `Method` `0:نقدي|1:بطاقة|2:تحويل|3:شيك`، `Amount`، `Notes`.
- التحققات: عميل إجباري، سطر واحد على الأقل، `Qty > 0`، مجموع الدفعات لا يزيد عن `Net`.
- الأزرار (مكانهم toolbar وكمان row):
  | الزر | الإجراء | الباراميترات |
  |---|---|---|
  | ترحيل | `TST_Proc_PostOrder` | `OrderID` ← row `OrderID`، `UserID` ← session `UserID` |
  | إلغاء | `TST_Proc_CancelOrder` | `OrderID` ← row `OrderID`، `UserID` ← session `UserID`، `Reason` ← ثابت (مثلًا `إلغاء من الشاشة`) |
  | إعادة حساب | `TST_Proc_RecalcOrder` | `OrderID` ← row `OrderID`، `UserID` ← session `UserID` |
  - الإجراءات بترجّع صف فيه `Ok` (1 نجاح / 0 فشل) و`MsgA`/`MsgE`. بعد التنفيذ: تحديث. تأكيد قبل الترحيل والإلغاء.
  - اختبر الفشل: ترحيل طلب مرحّل، ترحيل طلب فاضي، إلغاء طلب عليه دفعات، إعادة حساب طلب مرحّل، ترحيل آجل يعدّي حد الائتمان.
- إكسل:
  - `multiTransaction`: ماستر `CustomerID`, `TrDate`, `WarehouseID`, `PaymentType`, `Discount`؛ سطور `ItemID`, `Qty`, `UnitPrice`, `DiscountPrc`؛ `lookups.CustomerID` = `TST_Customer` / مفتاح `CustomerID` / كود `Code` / اسم `NameA` / شرط `CompCode = {session.CompCode}`؛ `detailLookups.ItemID` = `TST_Item` / مفتاح `ItemID` / كود `Code` / اسم `NameA` / `fill: { UnitPrice: "Price" }`.
  - `detailsOnly` على فاتورة مفتوحة: `detailIndex: 0`, `detailColumns: ["ItemID","Qty","UnitPrice","DiscountPrc"]`.
  - جرّب: ملف فيه 3 معاملات وسطر غلط في واحدة (لازم الباقي يتحفظ)، وعميل مش موجود، وكمية سالبة.

### 3) شجرة التصنيفات `TstCategory`
- النوع: Tree. الجدول `TST_Category`، المفتاح `CategoryID`، الأب `ParentID`، المستوى `Level`، الكود `Code`، الاسم `NameA`/`NameE`، `IsActive`، `CompCode` من الجلسة.
- اختبر: إضافة فرع جديد، نقل عقدة، حذف عقدة ليها أبناء (لازم يرفض بسبب الـ FK)، 3 مستويات.

### 4) جريد العملاء `TstCustomer` + إكسل جريد
- النوع: جريد على `TST_Customer`. فلاتر: `Code` يبدأ بـ، `NameA` يحتوي، `City` اختيار، `IsActive`.
- إكسل `grid`: `columns: ["Code","NameA","NameE","Phone","Email","CreditLimit","City","IsActive"]`، `allOrNothing: false` (وجرّب `true`).
- اختبر: كود مكرر (الفهرس الفريد `CompCode, Code` لازم يفشل الصف)، `CreditLimit` نص، تحميل ملف الأخطاء.

### 5) رصيد أول المدة `TstOpeningStock` (multi-transaction)
- ماستر ديتيل: ماستر `TST_OpeningStock` (قايمة `IQ_TST_OpeningStock`، `WarehouseID` دروب داون شرطه `CompCode = {session.CompCode} AND BranchCode = {session.BranchCode}`)، تفاصيل `TST_OpeningStockLine` (`ItemID`, `Qty`, `Cost`؛ `TotalCost` محسوب `IsSave: false`).
- إكسل `both`: `GroupNo` = رقم الإذن. الرأس في أول صف بس: `WarehouseID` (كود `WH01`)، `TrDate`، `Notes`. السطور: `ItemID` (كود `IT0001`...)، `Qty`، `Cost`.
- الجداول فاضية عن قصد: بعد الاستيراد راجع إن الأعداد صح من `IQ_TST_OpeningStockLine`.

---
## ثانيًا: التقارير
كل تقرير نعمله بنسختين تصميم: **نطاق شركة** (بلوجو الشركة 1) و**نطاق فرع** (فرع 2 بعنوان مختلف) ونتأكد إن الفرع بيكسب. وكل تقرير نجرّبه على A4 وإيصال 80 مم حسب الجدول.

| # | كود التقرير (مقترح) | الإجراء | النوع | ورق |
|---|---|---|---|---|
| 1 | `TstOrder_List` | `TST_Rpt_OrderList` | قائمة بدون جروبات | A4 عرضي |
| 2 | `TstSalesByCategory` | `TST_Rpt_SalesByCategory` | جروبات + مجاميع فرعية + شارت | A4 طولي |
| 3 | `TstCustomerStatement` | `TST_Rpt_CustomerStatement` | كشف حساب (جروب بالعميل) | A4 طولي |
| 4 | `TstOrder_Print` | `TST_Rpt_OrderPrint` | طباعة مستند (3 مصادر) | A4 طولي + نسخة إيصال 80 مم |
| 5 | `TstItemsBarcode` | `TST_Rpt_ItemsBarcode` | ملصقات باركود | مقاس مخصص (مثلًا 6 × 4 سم) أو A4 بأعمدة |
| 6 | `TstDashboard` | `TST_Rpt_Dashboard` | شارت فقط | A4 عرضي |

### 1) قائمة الطلبات (بدون جروبات) — تتربط بشاشة `TstOrder`
| الباراميتر | المصدر |
|---|---|
| `CompCode` | جلسة `CompCode` |
| `BranchCode` | جلسة `BranchCode` (أو فلتر لو عايز "كل الفروع" → سيبه فاضي) |
| `FromDate` | فلتر `TrDate.from` |
| `ToDate` | فلتر `TrDate.to` |
| `CustomerID` | فلتر `CustomerID` |
| `Status` | فلتر `Status` |

أعمدة التصميم: `TrNo, TrDate, CustomerNameA, WarehouseNameA, StatusTextA, PaymentTypeTextA, Total, Discount, Net, PaidAmount, RemainAmount`. مجموع كلي في التذييل لـ `Net` و`RemainAmount`. ترقيم صفحات ولوجو الشركة في الرأس.

### 2) مبيعات بالتصنيف (جروبات + شارت)
| الباراميتر | المصدر |
|---|---|
| `CompCode` | جلسة |
| `FromDate` | ثابت/فلتر `from` (من "عرض تقرير" في `Sys_ReportsAdmin`) |
| `ToDate` | فلتر `to` |

التصميم: جروب 1 بـ `TopCategoryNameA`، جروب 2 بـ `CategoryNameA`، سطور التفاصيل `ItemCode, ItemNameA, Qty, Amount`. مجموع فرعي (`Qty`, `Amount`) لكل جروب + مجموع كلي. شارت أعمدة/دائري على `Amount` حسب `TopCategoryNameA`. نسخة تانية بالإنجليزي (`NameE`) للتأكد من الاتجاه.

### 3) كشف حساب عميل (جروب بالعميل)
| الباراميتر | المصدر |
|---|---|
| `CompCode` | جلسة |
| `CustomerID` | فلتر `CustomerID` (فاضي = كل العملاء، كل عميل في جروب وصفحة لوحده) |
| `FromDate` | فلتر `from` |
| `ToDate` | فلتر `to` |

التصميم: جروب بـ `CustomerCode + CustomerNameA` (page break بعد كل جروب)، الأعمدة `TrDate, DocTypeTextA, DocNo, Debit, Credit, Balance`. الصف `OPEN` هو الرصيد السابق. آخر `Balance` في الجروب = الرصيد الختامي (اعرضه بدالة "آخر قيمة" في تذييل الجروب مش بمجموع). تحقق: لو `FromDate` فاضي مفيش صف رصيد سابق.

### 4) طباعة الطلب (ماستر/ديتيل + باركود/QR + لوجو)
| الباراميتر | المصدر |
|---|---|
| `CompCode` | جلسة |
| `BranchCode` | جلسة |
| `TrID` | عمود المفتاح `OrderID` للصف |

- مصادر البيانات: `Data` = الرأس (صف واحد)، `Data2` = السطور، `Data3` = الدفعات.
- الباندات: رأس التقرير (لوجو من `Company.LogoBase64` + `Company.CompNameA` + `Company.BranchNameA`)، بيانات الرأس من `Data`، باند جدول السطور على `Data2` (`Ser, ItemCode, ItemNameA, Qty, UnitPrice, DiscountPrc, LineTotal`)، باند جدول الدفعات على `Data3`، تذييل `Total / Discount / Net / PaidAmount / RemainAmount` من `Data`.
- باركود Code128 من `Data.BarcodeText`، وQR من `Data.QRText`. جرّب برضه باركود الصنف من `Data2.Barcode`.
- جرّب على طلب مرحّل فيه دفعتين، وطلب مسودة (`TrNo` فاضي → الباركود `0`)، وطلب من فرع تاني (لازم ما يظهرش لو الفرع مش مطابق = تقرير فاضي).
- تحقق من اللوجو: ملف `Backend/App_Data/Reports/logos/comp_1.png` لو عايز لوجو الشركة، أو صورة جوه التصميم نفسه لنسخة الفرع.

### 5) ملصقات الباركود
| الباراميتر | المصدر |
|---|---|
| `CompCode` | جلسة |
| `CategoryID` | فلتر `CategoryID` (لو اخترت أب بيجيب أبناؤه كلهم؛ فاضي = الكل) |

التصميم: ملصق واحد = `ItemNameA` + باركود Code128 من `Barcode` + `Price`. جرّب أعمدة متعددة في الصفحة (Columns) على A4، ومقاس ملصق مخصص.

### 6) الداشبورد (شارت فقط)
| الباراميتر | المصدر |
|---|---|
| `CompCode` | جلسة |
| `Year` | فلتر رقم `Year` أو ثابت (فاضي = السنة الحالية) |

التصميم: بدون جدول. شارت خطي/أعمدة على `MonthNameA` مقابل `SalesNet` و`PaymentsTotal` و`ExpensesTotal` (12 صف دايمًا حتى لو الشهر فاضي). جرّب `Year` = 2025 و2026 و2024 (كله أصفار).

---
## ثالثًا: ترتيب التنفيذ المقترح
1. شغّل `Test_ScreenBuilder_Schema.sql` وراجع جدول الملخص (الأعداد المتوقعة فوق).
2. ابني شاشات: 3 (شجرة) ثم 4 (عملاء) ثم 1 (مصروفات) ثم 2 (طلبات) ثم 5 (أول مدة).
3. صمّم التقارير 1 إلى 6 من ScreenBuilder (ربط الطباعة) أو من `Sys_ReportsAdmin`، واعمل نسخة الشركة ونسخة الفرع.
4. بعد الانتهاء: احذف الشاشات والتقارير من أدوات النظام، وبعدين شغّل `Test_ScreenBuilder_Drop.sql`.
