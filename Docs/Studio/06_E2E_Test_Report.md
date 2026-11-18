# 06 — End-to-end test: ERP Studio → framework screens & reports (تقرير الاختبار الكامل)

> Date: 2026-11-12. Everything below was actually run on this machine (SQL Server `ESSA_React`, Studio on `studio.localhost:3000/5080`, framework on `localhost:3001/49475`, QA login `qa_test_user`).
> Dev-mode timings (`next dev`, first compile of a page included where noted) — production (`next build` static export) is faster.

**بالمختصر:** اتعملت جداول وبيانات اختبار كلها باسم `QA_E2E_`، واتبنى من الاستوديو 17 شاشة (كل أنواع الشاشات الجاهزة) و4 تقارير، واتجربوا في الفريم ورك عربي/إنجليزي وعلى 375/768/1366. اتصلح 5 أخطاء في مولّد الاستوديو و9 أخطاء في الفريم ورك. اللي فاضل مكتوب في §6.

---

## 1. Test data — `Database/QA_E2E_Schema.sql`

Idempotent (create-if-missing, seed-if-empty, views/procs `CREATE OR ALTER`; ran twice + drop/re-create once, ~2.5 s). Every object starts with `QA_E2E_`.

| Area | Objects | Rows |
|---|---|---|
| Catalog (cascade) | `QA_E2E_Category` (6 retail + 5 menu), `QA_E2E_ItemType` (24), `QA_E2E_Item` (1,200, valid EAN-13), view `QA_E2E_IQ_Item` | |
| Customers / 360 | `QA_E2E_Customer` (60), `QA_E2E_CustomerNote`, `QA_E2E_CustomerEvent`, view `QA_E2E_IQ_Customer360` | |
| Sales | `QA_E2E_SalesHeader` (400, `NetAmount` computed), `QA_E2E_SalesDetail` (1,200, `LineTotal` computed), views `QA_E2E_IQ_Sales` (totals), `QA_E2E_IQ_SalesDetail` | |
| Tree | `QA_E2E_CostCenter` (93 nodes, 3 levels) | |
| Restaurant | `QA_E2E_RestArea`, `QA_E2E_RestTable` (16, statuses), `QA_E2E_MenuItem` (21), `QA_E2E_RestOrder` (70), `QA_E2E_RestOrderLine`; views `QA_E2E_MenuCategory`, `QA_E2E_IQ_TableStatus`, `QA_E2E_IQ_RestOrder`, `QA_E2E_IQ_RestOrderLine`, `QA_E2E_IQ_KitchenTickets` (items as JSON) | |
| Gaming | `QA_E2E_GameDevice` (14 live), `QA_E2E_GameSession` (200) | |
| Clinic | `QA_E2E_Doctor` (3), `QA_E2E_Appointment` (420, ±14 days) | |
| Kanban / Wizard | `QA_E2E_Task` (120), `QA_E2E_Member` | |
| Warehouse | `QA_E2E_Stock`, `QA_E2E_ScanTask`, `QA_E2E_ScanTaskLine`, view `QA_E2E_IQ_ScanLines` | |
| KPI | `QA_E2E_VW_KpiSales`, `_SalesByDay`, `_SalesByCategory`, `_TopItems`, `_Alerts` (one row set per Period 7/30/90) | |
| Paging | `QA_E2E_BigLog` | **200,000** |
| Reports | procs `QA_E2E_Rpt_SalesInvoice`, `_RestReceipt`, `_ItemLabels`, `_SalesByCustomer` | |

## 2. Studio — project, access, screens, reports

* Project `QA_E2E` (id 5) → repo `WorkEslamMamdouh/React_Fram`, **no GitHub token**, one read-only environment to `ESSA_React` (connection string from `Backend/appsettings.json`). `studio_test` got a grant `dbo.QA_E2E_*` (see/source/save/execute).
* Wizard in the browser: Type → Data → Fields → Filters (3-level cascade built by hand) → Name & menu → Review: "Everything looks fine" + 4 files listed. Because saving needs a token, all 17 screens were then generated through `POST api/projects/5/screens/generate` with the same settings JSON (script kept the wizard's suggestions from `GET …/screens/suggest`) and written to `Frontend/App/app/ClientApp/QA_E2E_*`. All 17 `Add_QA_E2E_*_Module.sql` ran OK (roles 1 Developer, 2 Administrator).
* Reports: built from the designer's own starters (A4 invoice, 80 mm receipt, A4 labels, grouped list), checked with `POST …/reports/validate` (0 issues), files from `POST …/reports/files` → `ClientApp/Reports/QA_E2E_*.layout.json` + `Database/Report_QA_E2E_*_Layout.sql` (ran OK, rows in `Sys_Reports`/`Sys_ReportParams`/`Sys_ReportLayouts`). All 4 open in the Studio designer from "in the project database".

## 3. Results per screen type

| Screen (`QA_E2E_…`) | Pattern | Load / first rows | Functional result |
|---|---|---|---|
| `Customers` | P01 grid (pages) | ~2.8 s | **PASS** insert / update / delete, unique + range rules, CSV export |
| `Items` | P01 + cascade Category→Type→Item(server search) | 2.5 s (warm) | **PASS** 1200→200→50→1, auto-select, label print uses the cascade (after fix) |
| `SalesInvoice` | P02 master-detail | 2.9 s | **PASS** insert (formula + total), edit (keeps CreatedAt), delete, A4 print, grouped list print |
| `CostCenters` | P03 tree | <3 s | **PASS** add child (auto code 107, level 2), delete |
| `RestOrders` | P01 + transaction report | 3.4 s | **PASS** 80 mm receipt (0.3 s to render) |
| `BigLogPages` | P01 pages, 200k | 2.8 s (query 21–65 ms) | **PASS** last page (4000) in 0.4 s, filter 33,333 rows in 0.4 s |
| `BigLogInfinite` | P01 infinite, 200k | 7.9 s incl. first compile | **PASS** 1,050 rows after ~23 s of scrolling, only ~33 `<tr>` in the DOM (windowing). Frame timings not measurable (pane not focused → rAF throttled to 1 Hz) |
| `Customer360` | P05 (`?id=7`) | <6 s | **PASS** header/badges/stats, 4 tabs lazy |
| `Appointments` | P07 | | **PASS after fix** (was empty) — resource/agenda views |
| `Floor` | P09 | | **PASS** 16 tables, live timers, legend counts |
| `Gaming` | P10 | | **PASS** 14 tiles, running/paused charges, "time is up" |
| `POS` | P11 | | **PASS** add items, service+VAT, exact cash, "Sale saved" (TODO stub — no DB write) |
| `Tasks` | P06 | | **PASS** 4 columns with totals |
| `MemberWizard` | P15 | | **PASS** DB unique check on phone |
| `Dashboard` | P14 | | **PASS after fix** KPIs ▲▼, area/donut, top-5, alerts, Period filter |
| `ScanGRN` | P21 | | **PASS** location → item scan, 1/3 progress |
| `Kitchen` | P18 | | **PASS** 8 tickets oldest first, stations |

Responsive / language: all 17 screens at 375 / 768 / 1366 in EN and AR (102 loads in same-origin iframes): **horizontal page overflow 0 everywhere**, RTL in AR. Report viewer at 375 AR: all toolbar buttons inside the screen.

Reports: **A4 invoice PASS** (header boxes, lines, totals, ZATCA QR, amount in words) · **80 mm receipt PASS** · **labels PASS** (EAN-13, copies, 17 pages for Clothing) · **grouped list PASS** (City → Customer groups, group/report totals, 24 pages). Viewer **Excel PASS** (`.xlsx` produced). Print/PDF buttons open the browser print dialog — not clicked in automation.

## 4. Bugs fixed — ERP Studio (generator side; golden tests kept green)

| # | Problem found | Fix |
|---|---|---|
| S1 | Detail link column (e.g. `SaleID`, NOT NULL) was "required but hidden" → master-detail could not be generated at all | `ScreenValidator`: the detail's `ForeignKey` column may be hidden (MasterDetail fills it) |
| S2 | Generated grids / master-detail had **no way to print designed reports** | New `report` settings (`listCode`, `transactionCode`, titles) → `report` prop / `MasterDetailConfig.report`; validated codes |
| S3 | List report ignored the cascading-filter bar (printed all items) | Generator passes `reportFilters={Filters.values}` (needs framework F1) |
| S4 | Master-detail ignored "Pages / infinite" chosen in the wizard | Emits `pagingMode` (needs framework F2); golden `master_detail` updated deliberately (+1 line) |
| S5 | NOT NULL columns with a DEFAULT (Discount 0, Status 'active') were "required" and empty | Column metadata reads `default_object_id`/definition; plain number/text defaults become the form default and not required |

Files: `Studio.Application/Screens/{ScreenCodeGenerator,ScreenValidator,StudioScreen,FieldSuggester}.cs`, `Studio.Domain/Entities.cs`, `Studio.Infrastructure/TargetDb/TargetDbGateway.cs`, tests `ScreenLogicTests.cs` (+13 tests), golden `master_detail`. `dotnet test` 94/94.

## 5. Bugs fixed — framework (minimal)

| # | File | Problem | Fix |
|---|---|---|---|
| F1 | `DynamicGrid.tsx`, `ModelMasterDetail.ts`, `MasterDetail.tsx` | no way to send outside filter values to the list report | optional `reportFilters` prop / config |
| F2 | same | master-detail list paging mode not configurable | optional `pagingMode` |
| F3 | `MasterDetail.tsx` `buildSaveRow` | insert sent NULL for hidden `CreatedAt` → "Cannot insert NULL" | read-only column with no value is left out (DB default applies) |
| F4 | `MasterDetail.tsx` `toDbValue` | every update cut `datetime` to the date (16:58 → 00:00) | keeps time when `dateMode: "datetime"` |
| F5 | `SearchableSelect.tsx` | edit form showed the item **ID** instead of its name (label query sent `ORDER BY  ASC` → SQL error) | order by the value field |
| F6 | `DynamicGrid.tsx` | select columns showed stored codes (`take`, `0`); mobile cards showed raw ISO dates | label of the option / formatted date in table and cards |
| F7 | `DynamicGrid.tsx` | pages mode: changing a filter while on page 4000 → "Total: 0" | a page past the end reloads page 1 |
| F8 | `Patterns/Scheduler.tsx` | calendar always empty on SQL Server (`'yyyy-MM-ddTHH:mm'` → conversion failed, error swallowed) | range sent with seconds |
| F9 | `Patterns/patternKit.tsx` | unpaged pattern queries ignored ORDER BY (dashboard "Top items" random) | ordered "all" loads use `TOP 10000` (`ALL_MODE_CAP`) |

No C# file of the framework changed. `tsc --noEmit` 0 · `npm run build` 0 · `dotnet build ERP.csproj` 0 errors / 0 warnings.

## 6. What remains (not fixed)

1. **Studio UI**: the "Add project" wizard makes the GitHub token mandatory (the API allows none — project was created through the API). Table pickers in the Filters step are too narrow (`QA_E2E_Item` and `QA_E2E_ItemType` both show "Q."). The builder UI has no field yet for the new `report` settings (JSON / API only). View suggestion only finds `IQ_<table>`, not `<prefix>_IQ_<name>`. Arabic labels keep English words ("تاريخ الإنشاء At", "الإجمالي المبلغ").
2. **Studio secrets**: a machine-level `STUDIO_MASTER_KEY` appeared during the run; the dev Studio then could not decrypt connection strings saved before (projects 2–4 of the old QA run will need their connection re-entered). Project 5's was re-entered.
3. **Pattern screens save nothing**: POS checkout, kanban move, floor/tile/KDS actions, wizard finish, scan finish are generated as `TODO` stubs (by design) — need a developer or a future Studio "save mapping".
4. P05 opened from the menu has no record picker (needs `?id=`); notes "add" not wired (`onAddNote`). Scanning a wrong location cannot be re-scanned without Undo/reload. Lookup → price auto-fill (`fillFrom`) is not offered by the Studio.
5. Backend: `ManageDataSQL` ignores `ORDER BY` without paging/TOP (worked around in F9); `[Authorize]` still commented out (see 04 report).
6. Grid export is CSV (Excel opens it); real `.xlsx` only in the report viewer.

## 7. How to remove everything

1. Run `Database/QA_E2E_Drop.sql` on `ESSA_React` (removes `Sys_Modules`/`Sys_RoleModule`/`Sys_UserModule`/`Sys_UserMenu` rows `QA_E2E_%`, `Sys_Reports*`/`Sys_ReportLayouts` rows `QA_E2E_%`, then every `QA_E2E_` view/proc/function/table; prints "Remaining QA_E2E_ objects: 0").
2. Delete folders `Frontend/App/app/ClientApp/QA_E2E_*` (17), files `Frontend/App/app/ClientApp/Reports/QA_E2E_*.layout.json` (4), `Database/Add_QA_E2E_*_Module.sql` (17), `Database/Report_QA_E2E_*_Layout.sql` (4).
3. Optional (Studio DB): deactivate project `QA_E2E` (id 5) from the Studio projects page. `studio_test` is already deactivated without a password.
