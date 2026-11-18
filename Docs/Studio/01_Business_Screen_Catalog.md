# 01 — Business Screen Catalog (كتالوج الشاشات حسب النشاط)

> Purpose: give the Studio (no-code builder) team a complete inventory of **screen types (UI patterns)** and **typical screens per business vertical**, so that one reusable, configurable component can be built per pattern and every vertical is assembled from those components only.
>
> Status: research / analysis only. No code was changed.
> Date: 2026-11-12. Author: Business analysis pass.

---

## 0. How to read this document

| Section | Content |
|---|---|
| 1 | Current framework baseline (what already exists in React_Fram) |
| 2 | Master list of screen patterns — ID, Arabic name, one-line purpose |
| 3 | Pattern specifications — config the Studio must ask, data needs, mobile, big-data strategy, verticals |
| 4 | Vertical catalogs — screens per business, with pattern IDs, entities, special behaviors |
| 5 | Vertical x Pattern coverage matrix |
| 6 | Cross-cutting requirements (filters, lookups, validation, printing, reports, realtime, offline, AR/EN RTL, devices, permissions) |
| 7 | "Custom business" — inventing a new vertical from generic building blocks |
| 8 | Recommended build order |

Pattern references in the vertical tables use IDs such as `P02` (Master-Detail). Variants are written as `P09/tables`.

---

## 1. Current framework baseline

Found in `Frontend/App/app/ClientApp/Shared/Components/Import/` (verified via Graphify index + file listing):

| Existing component | Covers pattern | Notes |
|---|---|---|
| `DynamicGrid.tsx` (+ `DynamicGridFilter.tsx`, `AdvancedFilter.tsx`) | P01 Simple Grid / CRUD | inline edit, `extraActions`, `onRowDoubleClick`, `beforeSave` |
| `MasterDetail.tsx` + `ModelMasterDetail.ts` | P02 Master-Detail | up to 5 details, view/edit/print/delete, `onPrint` (printing not implemented yet) |
| `TreeView.tsx`, `TreeScreen.tsx` | P03 Tree | chart of accounts, categories |
| `FormLayout.tsx` | P04 Form-only (partial) | |
| `SearchModal.tsx`, `SearchableSelect.tsx`, `DynamicSelect.tsx` | X1 Lookup / Search (cross-cutting) | |
| `Validation.ts` | cross-cutting validation | `RunValidations`, `ValidateRow`, external-table rule |
| `Tools/CreatePageReact` (WinForms) | generator for P01 / P02 | settings JSON embedded as `// @CreatePageReact-Settings` |

Everything else in this catalog (P04 onward, except the partial form) is **new work**.

---

## 2. Master list of screen patterns (deduplicated)

| ID | Pattern (English) | Arabic name | One-line purpose |
|---|---|---|---|
| P01 | Simple Grid / CRUD | شاشة جدول بسيط (إضافة/تعديل/حذف) | Maintain a flat list of records (codes, setup tables) |
| P02 | Master-Detail Document | شاشة رأس وتفاصيل (مستند) | Transaction document with header + line items (invoice, PO, voucher) |
| P03 | Tree / Hierarchy | شاشة شجرية | Parent/child structures (accounts, categories, org chart, locations) |
| P04 | Single Form / Settings | نموذج منفرد / شاشة إعدادات | One record or one configuration page with sections |
| P05 | Record Profile 360 (tabbed file) | ملف السجل الشامل (تبويبات) | Everything about one entity: patient file, customer, employee, asset, vehicle |
| P06 | Kanban Board | لوحة كانبان (أعمدة حالات) | Cards moving across status columns (leads, repair jobs, tasks) |
| P07 | Calendar / Scheduler | التقويم والمواعيد | Time-slot booking per resource (doctor, trainer, chair, room) |
| P08 | Gantt / Planning Timeline | مخطط جانت (خطة زمنية) | Tasks with durations and dependencies (projects, production orders) |
| P09 | Floor Plan / Visual Map | مخطط الصالة / خريطة مرئية | Drag-placed shapes on a background showing live status (tables, beds, bins, seats, parking) |
| P10 | Live Status Tile Board / Session Timer | لوحة الحالة الحية / عداد الجلسات | Grid of tiles each with live status and running timer (PlayStation devices, rooms, machines) |
| P11 | Touch POS | نقطة بيع باللمس | Fast sale entry: item tiles + cart + payment, keyboard/scanner/touch |
| P12 | Card / Tile Catalog | كتالوج بطاقات (صور) | Browse records as image cards with filters (menu, products, properties) |
| P13 | Tracking Timeline | خط التتبع الزمني | Ordered status events of one object (shipment, order, case) |
| P14 | Dashboard / KPI | لوحة المؤشرات | KPIs, charts, alerts, quick links |
| P15 | Wizard / Stepper | معالج خطوات | Multi-step guided process (onboarding, admission, check-in, setup) |
| P16 | Approval Inbox | صندوق الموافقات | Pending items for the current user with approve/reject/return |
| P17 | Queue / TV Display | شاشة عرض الطابور (تلفزيون) | Read-only, full-screen public display (now serving, order ready, flights-style board) |
| P18 | Ticket Rail / KDS | شاشة التذاكر / شاشة المطبخ | Incoming tickets with timers and bump actions (kitchen, lab bench, workshop bay) |
| P19 | Map / Geo Dispatch | الخريطة والتوزيع الجغرافي | Points/routes on a real map: drivers, deliveries, zones |
| P20 | Report / Pivot Viewer | عارض التقارير والجداول المحورية | Parameterised reports, grouping, pivot, export, print |
| P21 | Scan Task Screen (mobile/handheld) | شاشة المسح بالباركود (جهاز محمول) | Barcode/QR/RFID driven step loop (receive, pick, count, check-in) |
| P22 | Activity / Notes / Chat Feed | سجل النشاط والملاحظات والمحادثة | Comments, notes, @mentions, history per record |
| P23 | Document / File Manager | مدير المستندات والملفات | Attachments, folders, preview, versions, scanning |
| P24 | Matrix / Spreadsheet Entry | شبكة إدخال مصفوفية | Rows x columns data entry (attendance sheet, grades, price matrix, size/color grid) |
| P25 | Batch Process Runner | شاشة تشغيل عملية مجمعة | Select parameters -> preview -> run -> post (payroll, depreciation, closing) |
| P26 | Resource Availability Rack | شبكة الإتاحة والحجز (موارد × أيام) | Resources x dates grid (hotel room rack, car rental, equipment) |
| P27 | Self-Service Kiosk | كشك الخدمة الذاتية | Big-button public screen (take queue ticket, gym check-in, self-order) |
| P28 | Device Integration Console | شاشة ربط الأجهزة | Monitor/map messages from devices (lab analyzers, attendance clocks, scales) |
| P29 | Reconciliation / Matching | شاشة المطابقة | Two lists side by side to match (bank rec, 3-way match, COD settlement) |
| P30 | Import / Export Mapper | شاشة استيراد وتصدير البيانات | Upload Excel/CSV, map columns, validate, commit |
| P31 | Interactive Diagram Picker | مخطط تفاعلي للاختيار | Click regions of an image (dental chart, car body damage, body map, seat map) |
| P32 | Visual Designer (Studio-internal) | المصمم المرئي | Drag-drop designers: form, print template, floor plan layout, dashboard |

Cross-cutting building blocks (not screens, but every pattern uses them):

| ID | Block | Arabic |
|---|---|---|
| X1 | Lookup / Search modal / cascading select | نافذة البحث والقوائم المتتالية |
| X2 | Filter bar + saved views | شريط الفلترة والعروض المحفوظة |
| X3 | Print engine (A4, 80mm, labels) | محرك الطباعة |
| X4 | Realtime channel (SignalR) | قناة التحديث اللحظي |
| X5 | Device bridge (local agent) | وسيط الأجهزة المحلي |
| X6 | Attachments + notes side panel | لوحة المرفقات والملاحظات |
| X7 | Workflow / status engine | محرك الحالات وسير العمل |
| X8 | Numbering series | ترقيم المستندات |

---

## 3. Pattern specifications

Legend for big-data strategy:
- **SSP** = server-side pagination (page + total count, sort and filter on server)
- **INF** = infinite scroll (cursor/keyset paging, append)
- **VIRT** = client virtualization (render only visible rows; data already loaded)
- **AGG** = server-side aggregation only (never ship raw rows)
- **WIN** = time-window loading (only the visible date range)
- **PUSH** = initial snapshot + realtime deltas

### P01 — Simple Grid / CRUD (شاشة جدول بسيط)

| Aspect | Specification |
|---|---|
| Purpose | Maintain setup/reference lists and simple transactions. |
| Studio must ask | Source table/view; save table; key column(s); columns (caption AR/EN, type, width, visible, editable, required, default, lookup); edit mode (inline / popup form / side drawer); allowed actions (add/edit/delete/export/import/print); default sort; filters; validations; row color rules; extra actions (buttons calling SQL/proc/screen). |
| Data needs | One table (save) + optional view (read), lookups; company/branch scoping columns. |
| Mobile | Switch to card list (2–4 key fields per card), edit in full-screen form; swipe actions for edit/delete. |
| Big data | SSP default (> 1,000 rows). VIRT for lookups < 5,000 rows. Server filter on indexed columns only; "load all" disabled above threshold. |
| Verticals | All (every vertical has 10–40 setup lists). |

### P02 — Master-Detail Document (شاشة رأس وتفاصيل)

| Aspect | Specification |
|---|---|
| Purpose | Business documents: invoices, orders, receipts, vouchers, transfers, prescriptions, waybills. |
| Studio must ask | Header table/view; up to N detail tabs (table, FK, columns, totals); numbering series (X8); status workflow (draft/posted/cancelled); totals formulas (line: qty x price - discount + tax; footer: sum, round); posting procedure (`G_ProcessTrans` TrType); print templates (A4 / 80mm); lock rules after posting; copy-from (e.g. invoice from order); item lookup with cascading filters. |
| Data needs | Header + details tables, list view (IQ_*), item/price/tax lookups, stock availability query. |
| Mobile | Header as collapsible form; lines as cards with + / - qty; sticky footer with total and Save. |
| Big data | List: SSP. Lines: VIRT when > 200 lines (e.g. stock count). Item lookup: server search-as-you-type (top 50). |
| Verticals | All transactional verticals. |

### P03 — Tree / Hierarchy (شاشة شجرية)

| Aspect | Specification |
|---|---|
| Purpose | Chart of accounts, item categories, org units, warehouse zone->aisle->bin, cost centers, menu groups. |
| Studio must ask | Table; ID / ParentID columns (or level-coded e.g. `1`, `101`, `10101`); display field; max depth; leaf-only posting rule; drag-to-reparent allowed; node icon/color rule; side form fields. |
| Data needs | Self-referencing table; optional `Level`, `IsLeaf`, `Path`. |
| Mobile | Drill-down list (breadcrumb navigation) instead of an expanded tree. |
| Big data | Lazy-load children on expand (per node query); server search returning path to node. |
| Verticals | Accounting, inventory, HR, warehouses, hospitals (departments), schools (grades->classes). |

### P04 — Single Form / Settings (نموذج منفرد / إعدادات)

| Aspect | Specification |
|---|---|
| Purpose | Company settings, POS settings, a single entity create/edit page, a request form (leave request). |
| Studio must ask | Sections/groups, field layout (columns 1–4), field types, conditional visibility (show X when Y = …), defaults, validations, save target, single-record mode (key fixed). |
| Mobile | Single column; sections become accordions. |
| Big data | n/a. |
| Verticals | All. |

### P05 — Record Profile 360 (ملف السجل الشامل)

| Aspect | Specification |
|---|---|
| Purpose | One page about one entity with header card + tabs of related lists: patient EMR, customer, employee, asset, vehicle, student, member, property. |
| Studio must ask | Main entity + header card fields (photo, badges, balance); tabs: each tab is an embedded pattern (P01 list filtered by FK, P13 timeline, P22 notes, P23 files, P14 mini KPIs); quick actions (new invoice for this customer, new appointment for this patient). |
| Data needs | Main record + N related queries filtered by key; summary query (balance, last visit). |
| Mobile | Header collapses; tabs become a horizontal scroll chip bar or a stacked list of sections. |
| Big data | Each tab loads lazily on first open; tab lists SSP/INF. |
| Verticals | Clinics (patient), CRM, HR, assets, schools, gyms, real estate, workshops (vehicle). |

### P06 — Kanban Board (لوحة كانبان)

| Aspect | Specification |
|---|---|
| Purpose | Visual workflow: CRM pipeline, repair jobs, delivery orders, tasks, recruitment candidates, housekeeping. |
| Studio must ask | Source; status column (columns = lookup values, order, color, WIP limit); card title/subtitle/badges/avatar; allowed transitions (from->to) and the action executed on drop (update / procedure); swimlanes (optional group by); card click -> open screen. |
| Data needs | Status lookup, record list, transition rules table. |
| Mobile | One column at a time with swipe between columns; "move to" via action sheet instead of drag. |
| Big data | Per-column paging (load 20 per column, "load more"); counts from AGG query; PUSH for multi-user boards. |
| Verticals | CRM, workshops, logistics, HR recruitment, hotels (housekeeping), manufacturing, projects. |

### P07 — Calendar / Scheduler (التقويم والمواعيد)

| Aspect | Specification |
|---|---|
| Purpose | Appointments, class schedules, staff shifts, room bookings. |
| Studio must ask | Event source; start/end (or start + duration); resource column (doctor, trainer, chair) for resource view; views allowed (day/week/month/agenda/resource-timeline); slot size; working hours per resource (from table); color by (status/type); overlap rule (block / warn / allow up to capacity); recurrence support; create-on-click target screen; reminders (SMS/WhatsApp). |
| Data needs | Events, resources, working-hours/holidays, capacity. |
| Mobile | Agenda (list by day) and single-day view by default; swipe days. |
| Big data | WIN: load only visible date range + resource subset; PUSH for slot taken by another user. |
| Verticals | Clinics, salons, gyms, schools (timetable), HR (shifts), workshops (bays), real estate (viewings). |

### P08 — Gantt / Planning Timeline (مخطط جانت)

| Aspect | Specification |
|---|---|
| Purpose | Project tasks, production order scheduling on machines, construction phases. |
| Studio must ask | Task source; start/end/progress; parent (WBS); dependencies table; resource; zoom levels; drag to reschedule allowed. |
| Mobile | Read-only list grouped by phase with progress bars. |
| Big data | WIN + collapse WBS levels (lazy children). |
| Verticals | Manufacturing, real estate development, projects, maintenance planning. |

### P09 — Floor Plan / Visual Map (مخطط الصالة / خريطة مرئية)

| Aspect | Specification |
|---|---|
| Purpose | Spatial view with live status: restaurant tables, hospital beds/wards, warehouse bins, hotel floors, cinema/bus/event seats, parking, salon chairs. |
| Studio must ask | Areas/floors (each with optional background image); object table (tables/beds/bins) with position x/y, width/height, shape (round/rect), rotation, capacity; status source (query or computed: free/reserved/occupied/bill requested/cleaning/out of service); status -> color + icon map; tile content (number, guests, waiter, elapsed time, amount); click action per status (free -> open order, occupied -> open bill, reserved -> seat guests); context actions (merge tables, move/transfer, split). Layout edited in P32 designer. |
| Data needs | Layout table (x, y, w, h, shape, areaId), live status view, timers (opened at). |
| Mobile/tablet | Tablet: scaled canvas with pinch zoom. Phone: fall back to P10 tile list grouped by area. |
| Big data | Objects per area are small (< 500): load per area. PUSH for status changes (SignalR group per branch/area). |
| Verticals | Restaurants, hospitals (beds), hotels (rooms by floor), warehouses (bin map), events/cinema, parking, salons. |

Restaurant table status palette (recommended defaults, user-editable):

| Status | Arabic | Default color | Typical trigger |
|---|---|---|---|
| Free | فاضية | Green | Bill paid / table cleared |
| Reserved | محجوزة | Blue | Reservation within N minutes |
| Occupied / Ordering | مشغولة | Red/Orange | Order opened |
| Food served | تم التقديم | Amber | All items bumped in KDS |
| Bill requested | طلب الحساب | Purple (blinking) | Waiter pressed "print bill" |
| Needs cleaning | تحتاج تنظيف | Grey | Paid but not cleared |
| Out of service | خارج الخدمة | Dark/hatched | Manual |

### P10 — Live Status Tile Board / Session Timer (لوحة الحالة الحية / عداد الجلسات)

| Aspect | Specification |
|---|---|
| Purpose | Grid of resources each with a status and a running clock: PlayStation/billiards devices, gym lockers, car wash bays, meeting rooms, machines on the shop floor, phone booth, hotel rooms (simple version of P09 without coordinates). |
| Studio must ask | Resource table; grouping (zone/type); status rules; timer start field; pricing rule (per hour/per minute/blocks, single vs multi-player rate, time bands e.g. night rate, minimum charge, rounding); tile actions (start, pause, switch device, change mode single/multi, add items/snacks, end & checkout, prepaid countdown with alert); alert when prepaid time ends. |
| Data needs | Resources, sessions (start, end, pauses, mode changes), rate table, session items. |
| Mobile | Same tiles, 2 per row; actions in a bottom sheet. |
| Big data | Small set; PUSH. Timer is computed client-side from server start time (server time offset correction). |
| Verticals | Gaming lounges, billiards, gyms, workshops/car wash, co-working, manufacturing (machine status). |

### P11 — Touch POS (نقطة بيع باللمس)

| Aspect | Specification |
|---|---|
| Purpose | Fastest possible sale: restaurant, cafe, retail, pharmacy, gaming lounge canteen. |
| Studio must ask | Mode (retail quick-sale / restaurant order / pharmacy); category bar (levels, colors, images); item tile content; modifiers/add-ons groups (required/optional, min/max, price delta); scanner input; weighed items (scale barcode prefixes); customer selection; order types (dine-in/takeaway/delivery/drive-through); payment methods (cash, card, wallet, split tender, on account); discounts & permission limits; hold/recall; returns; shift open/close (cash drawer count); receipt template; kitchen routing (item -> printer/KDS station); offline mode on/off. |
| Data needs | Items + prices (price list per branch/time), modifiers, taxes, payment methods, shifts, terminals, printers routing. |
| Mobile/tablet | Designed for tablet landscape first; phone = waiter handheld (category list -> items -> cart page). |
| Big data | Items cached locally (IndexedDB) with delta sync by `UpdatedAt`; search local. Sales posted asynchronously in queue. |
| Verticals | Restaurants, cafes, retail, pharmacies, gaming lounges, gyms (shop), salons, hotels (outlets). |

Restaurant sub-features to support in P11: split bill (by item, by seat, by equal parts, by amount), merge tables, transfer items between tables, course firing (send starters now, mains later), void with reason + manager PIN, tips, service charge, coupons.

### P12 — Card / Tile Catalog (كتالوج بطاقات)

| Aspect | Specification |
|---|---|
| Purpose | Browse visually: menu items, products, properties for rent, cars, rooms, courses, gallery of members. |
| Studio must ask | Source; image field; title/subtitle/price/badges; card size; facets (category, price range, availability); sort; click action (open profile / add to cart / book). |
| Mobile | 1–2 cards per row. |
| Big data | INF with server facets (counts by AGG); thumbnails served resized. |
| Verticals | Restaurants (menu admin), retail, real estate, car rental, hotels, schools (courses), e-commerce. |

### P13 — Tracking Timeline (خط التتبع الزمني)

| Aspect | Specification |
|---|---|
| Purpose | Show the life of one object: waybill tracking, order status, patient journey, ticket history, asset history. |
| Studio must ask | Events table (object key, status, time, user, location, note, attachment/proof photo/signature); status icons/colors; expected vs actual milestones; public tracking page (no login, by tracking number + phone). |
| Mobile | Vertical timeline (same as desktop). |
| Big data | Events per object are small; list of objects uses SSP. |
| Verticals | Logistics, e-commerce, workshops, hospitals, CRM tickets, legal/case work. |

### P14 — Dashboard / KPI (لوحة المؤشرات)

| Aspect | Specification |
|---|---|
| Purpose | Overview for managers and role home pages. |
| Studio must ask | Widgets: KPI card (query returning one value + comparison), chart (bar/line/pie/area; query; dimensions/measures), top-N list, alert list (e.g. low stock, expiring batches), shortcut buttons; global filters (date range, branch) passed to all widgets; refresh interval; drill-down target per widget. Layout via P32. |
| Mobile | Single column; KPI cards in 2-column grid. |
| Big data | AGG only; cache results per filter for N minutes; optional pre-aggregated tables. |
| Verticals | All. |

### P15 — Wizard / Stepper (معالج خطوات)

| Aspect | Specification |
|---|---|
| Purpose | Guided processes: patient admission, hotel check-in, membership sign-up, company first-time setup, loan/installment plan, shipment creation for walk-in customers. |
| Studio must ask | Steps (each step = a form section or embedded pattern); per-step validation; branching (skip step if …); summary step; final action (save/procedure/print); save draft and resume. |
| Mobile | Natural fit (one step per screen). |
| Big data | n/a. |
| Verticals | Hospitals, hotels, gyms, schools (enrollment), real estate (contracts), logistics, setup. |

### P16 — Approval Inbox (صندوق الموافقات)

| Aspect | Specification |
|---|---|
| Purpose | Everything awaiting my decision: leave requests, purchase requests, discounts above limit, credit limit overrides, expense claims. |
| Studio must ask | Which documents participate; approval chain (by role, by amount thresholds, sequential/parallel); actions (approve/reject/return with comment, delegate); SLA/escalation; notification channels. |
| Mobile | Very important on mobile: card list + swipe approve/reject + push notification. |
| Big data | SSP; counts badge via AGG; PUSH for new items. |
| Verticals | HR, purchasing, sales, finance, hospitals, any multi-level org. |

### P17 — Queue / TV Display (شاشة عرض الطابور)

| Aspect | Specification |
|---|---|
| Purpose | Public read-only screen: clinic "now serving 105 -> room 3", restaurant "order ready", pharmacy pickup, bank-style counters, gym class board, flight-style shipment board. |
| Studio must ask | Source query; layout (columns, big number, ticker text, media/ads area); refresh/push; sound/voice announcement (text-to-speech AR/EN) on change; kiosk auth (device token, no user login); theme/logo. |
| Mobile | n/a (TV 16:9, sometimes portrait). |
| Big data | Tiny; PUSH. Must auto-reconnect and survive network drop (show last state). |
| Verticals | Clinics/hospitals, restaurants, pharmacies, government-style services, banks, gyms, workshops. |

### P18 — Ticket Rail / KDS (شاشة التذاكر / شاشة المطبخ)

| Aspect | Specification |
|---|---|
| Purpose | Work tickets arriving in real time to a station: kitchen display, bar, lab sample bench, pharmacy prep, workshop bay, packing station. |
| Studio must ask | Station definition (which item groups/routes go to it); ticket content (order no, table, type, items, modifiers, notes, seat, course); timers and color thresholds (e.g. green < 8 min, amber < 15, red after); actions (start, bump item, bump ticket, recall, mark out of stock); expo/summary station (all-day counts); bump bar/keyboard support; sound on new ticket. |
| Mobile/tablet | Tablet on wall; horizontal scrolling rail. |
| Big data | Only open tickets (status not done) + last N bumped for recall; PUSH. |
| Verticals | Restaurants, cafes, labs, pharmacies, workshops, warehouses (packing), print shops. |

### P19 — Map / Geo Dispatch (الخريطة والتوزيع الجغرافي)

| Aspect | Specification |
|---|---|
| Purpose | Delivery zones, drivers' live positions, route planning, branch locator, property locations, field service. |
| Studio must ask | Map provider (OpenStreetMap/Leaflet default; Google optional with key); layers: points (lat/lng fields, icon by status), polygons (delivery zones with fee), routes; live tracking source (driver app GPS); dispatch action (assign order to driver by drag or nearest suggestion). |
| Mobile | Driver app: list of stops + "navigate" deep link; full-screen map. |
| Big data | Cluster markers; load by viewport bounding box; PUSH positions every 10–30 s (throttled). |
| Verticals | Logistics, restaurants (delivery), real estate, field service, utilities, sales reps. |

### P20 — Report / Pivot Viewer (عارض التقارير والجداول المحورية)

| Aspect | Specification |
|---|---|
| Purpose | All operational and financial reports: statements, aging, stock balance, sales by item, P&L, payroll register. |
| Studio must ask | Data source (view/procedure with parameters); parameter form (with cascading filters, date presets); output types (grid with grouping & subtotals, pivot, chart, printable layout); column formats; conditional formatting; drill-through to document screen; export (Excel, PDF, CSV); schedule & email; permission per report. |
| Mobile | Summary first (totals + chart); detail grid scrollable horizontally; export/share PDF. |
| Big data | Server-side procedure with paging for detailed reports; AGG for pivots; long reports run as background job and notify when ready; hard row limit for on-screen grid, unlimited for export stream. |
| Verticals | All. |

### P21 — Scan Task Screen (شاشة المسح بالباركود)

| Aspect | Specification |
|---|---|
| Purpose | Handheld/phone workflows driven by scanning: receiving, put-away, picking, packing, stock count, transfer, asset audit, delivery proof, gym/event check-in, patient wristband, pharmacy dispensing verification. |
| Studio must ask | Task document (P02 header behind it); scan sequence (scan location -> scan item -> qty -> confirm); barcode parsing rules (GS1-128 AI (01) GTIN, (10) batch, (17) expiry, (21) serial; scale barcodes; QR JSON); expected list vs blind count; over/under tolerance; sound/vibration feedback; camera vs hardware scanner (keyboard wedge); offline queue. |
| Mobile | Primary target: phone/handheld, big fonts, one action per screen. |
| Big data | Only current task lines (tens–hundreds); offline cache of item master barcodes (delta sync). |
| Verticals | Warehouses, retail, pharmacies, logistics, assets, events, gyms, hospitals. |

### P22 — Activity / Notes / Chat Feed (سجل النشاط والملاحظات)

| Aspect | Specification |
|---|---|
| Purpose | Collaboration and audit on any record: notes, @mentions, system events (created, status changed), customer/driver chat, internal team chat. |
| Studio must ask | Enabled per screen (one switch); who can see (internal/customer-visible); mention notifications; attachment allowed; audit events to show. |
| Mobile | Chat-style bubbles. |
| Big data | INF (newest first, keyset by id). PUSH for new messages. |
| Verticals | All (side panel X6). |

### P23 — Document / File Manager (مدير المستندات)

| Aspect | Specification |
|---|---|
| Purpose | Attachments per record and a central repository: contracts, scans, X-ray images, employee documents with expiry, delivery proofs. |
| Studio must ask | Categories, required documents per entity type, expiry tracking + alert, max size/types, versioning, scan from device/camera, preview (PDF/image/DICOM viewer link). |
| Mobile | Camera capture upload. |
| Big data | Files in storage (disk/blob), metadata in SQL; INF list; thumbnails. |
| Verticals | HR, real estate, hospitals, logistics, assets, legal, schools. |

### P24 — Matrix / Spreadsheet Entry (شبكة إدخال مصفوفية)

| Aspect | Specification |
|---|---|
| Purpose | Fast entry where rows and columns are both dimensions: daily attendance sheet (employees x days), student grades (students x subjects), price list (items x price lists), size/color quantity grid (apparel), class timetable (days x periods), monthly budget (accounts x months), stock count sheet. |
| Studio must ask | Row dimension source; column dimension source (static or query); cell value table & field; cell editor type; row/column totals; copy/paste from Excel; keyboard navigation. |
| Mobile | Pick one row -> edit its columns as a form. |
| Big data | VIRT in both directions; save only dirty cells (bulk). |
| Verticals | HR, schools, retail (apparel), accounting (budgets), restaurants (menu pricing per branch). |

### P25 — Batch Process Runner (شاشة تشغيل عملية مجمعة)

| Aspect | Specification |
|---|---|
| Purpose | Periodic heavy processes: payroll calculation, depreciation run, interest/late-fee calculation, rent invoice generation, monthly membership billing, period/year close, stock revaluation, re-order suggestion. |
| Studio must ask | Parameters; preview query (what will be produced); run procedure; can it be reversed (rollback procedure); lock rule (no double-run per period); output document type; log display. |
| Mobile | Read-only status. |
| Big data | Runs on server as background job with progress (PUSH progress %). |
| Verticals | HR, assets, accounting, real estate, gyms, schools (fees), inventory. |

### P26 — Resource Availability Rack (شبكة الإتاحة والحجز)

| Aspect | Specification |
|---|---|
| Purpose | Resources x dates: hotel room rack/tape chart, car rental fleet, equipment rental, hall booking, apartment short-term rental. |
| Studio must ask | Resource source (+ grouping by type/floor); booking source (resource, from, to, status, guest); colors by status; drag to extend/move; create booking by selecting cells; overbooking rule; rate display per day. |
| Mobile | Day list per resource type with availability counts. |
| Big data | WIN (e.g. 14–31 days); resource rows VIRT. |
| Verticals | Hotels, car rental, real estate, event halls, equipment rental, hospitals (bed planning). |

### P27 — Self-Service Kiosk (كشك الخدمة الذاتية)

| Aspect | Specification |
|---|---|
| Purpose | Public touch screens: take queue ticket (clinic/bank), member check-in by QR/fingerprint, self-order in restaurant, visitor registration, price checker. |
| Studio must ask | Steps (often a P15 with big buttons); idle reset timeout; language choice at start; printer for ticket; device auth (no user login); payment terminal (optional). |
| Mobile | n/a (kiosk). Same pattern can run as public web page (QR menu on table). |
| Big data | n/a. |
| Verticals | Clinics, restaurants, gyms, retail (price check), government-style services, hotels. |

### P28 — Device Integration Console (شاشة ربط الأجهزة)

| Aspect | Specification |
|---|---|
| Purpose | Configure and monitor external devices and the messages they send/receive. |
| Studio must ask | Device type & protocol; connection (TCP/IP host:port, serial COM/baud, file drop folder, HTTP push); code mapping (device test code -> system test/parameter; device user id -> employee); auto-accept vs manual verification; retry/error queue. |
| Data needs | Devices, mapping tables, raw message log, parsed result staging. |
| Big data | Message log SSP; purge/archive policy. |
| Verticals | Hospitals/labs (analyzers), HR (attendance clocks), retail (scales, price-computing scales), gyms (turnstiles), hotels (door locks), logistics (weigh/dimension scanners), manufacturing (PLC counters). |

Common device integrations:

| Device | Protocol / method | Used by |
|---|---|---|
| Lab analyzers (chemistry, hematology) | ASTM E1381/E1394 (CLSI LIS1/LIS2-A2) over serial RS-232 or TCP; HL7 v2.x (ORM orders, ORU results) over MLLP/TCP; bidirectional (host query) or unidirectional | Labs, hospitals |
| Radiology (modalities, PACS) | DICOM Modality Worklist (MWL), HL7 ORM/ORU to RIS, viewer link | Hospitals, radiology centers |
| HIS interoperability | HL7 v2 ADT, HL7 FHIR REST (Patient, Encounter, Observation) | Hospitals, insurance |
| Attendance clocks (fingerprint/face/card) | Vendor SDK (e.g. ZKTeco pull SDK / ADMS push over HTTP), CSV export | HR, gyms, schools |
| Receipt printers | ESC/POS over USB/LAN/Bluetooth | POS, restaurants, queue tickets |
| Label printers | ZPL (Zebra), TSPL/EPL; or PDF at label size | Warehouses, pharmacy, logistics, lab tubes |
| Barcode scanners | Keyboard wedge (no integration), camera scanning, handheld SDK (Android intents) | All inventory |
| Weighing scales | Serial protocol or scale-generated barcodes (prefix 2x + PLU + weight/price) | Retail, groceries, logistics |
| Cash drawer | Kick pulse through receipt printer | POS |
| Customer display / pole | Serial/USB or second HDMI screen (web page) | POS |
| Card payment terminals | Vendor SDK / ECR protocol | POS |
| Door locks / RFID cards | Vendor SDK (hotel lock encoders) | Hotels, gyms |
| GPS | Driver mobile app (browser geolocation / native) | Logistics, delivery |
| e-Invoicing gateways | Government APIs (e.g. ETA Egypt, ZATCA KSA) | Accounting/sales |

Architecture note: browser pages cannot open serial ports/raw TCP reliably for all devices, so a **local Device Bridge (X5)** — a small Windows service on the branch PC — is needed for: lab analyzers, attendance clocks pull, ESC/POS silent printing, ZPL printing, scales, cash drawer. It talks to the API (HTTPS) and receives print jobs via SignalR.

### P29 — Reconciliation / Matching (شاشة المطابقة)

| Aspect | Specification |
|---|---|
| Purpose | Match two sources: bank statement vs book entries, PO vs GRN vs supplier invoice (3-way match), courier COD collected vs remitted, insurance claims vs payments, stock count vs system. |
| Studio must ask | Left source, right source, match keys/tolerance (amount, date ± days, reference), auto-match rules, manual match (1:1, 1:N, N:M), action on match (post adjustment / mark settled). |
| Mobile | Not targeted. |
| Big data | SSP each side filtered by period/account; auto-match on server. |
| Verticals | Accounting, purchasing, logistics, hospitals (insurance), inventory. |

### P30 — Import / Export Mapper (شاشة الاستيراد والتصدير)

| Aspect | Specification |
|---|---|
| Purpose | Bring data from Excel/CSV (opening balances, item master, price updates, employees, bank statement) and export. |
| Studio must ask | Target screen/table; column mapping (saved templates); lookup resolution (code -> id); validation preview with errors per row; insert/update/upsert mode; transaction (all or nothing / skip bad rows). |
| Big data | Chunked upload & bulk insert (existing `bulk` endpoint); background job for > 50k rows. |
| Verticals | All. |

### P31 — Interactive Diagram Picker (مخطط تفاعلي للاختيار)

| Aspect | Specification |
|---|---|
| Purpose | Select/record on a picture: dental chart (odontogram, tooth number FDI), body map (pain/injury location), car body damage inspection, seat map (bus/cinema), shelf planogram. |
| Studio must ask | Base image/SVG; regions (id, polygon); per-region states and colors; what is saved (region id + state + note). |
| Mobile | Tap regions; zoom. |
| Big data | n/a. |
| Verticals | Dental clinics, hospitals, workshops, transport/events, retail. |

### P32 — Visual Designer (المصمم المرئي) — Studio internal

| Aspect | Specification |
|---|---|
| Purpose | Tools the Studio user uses to design: screen/form layout, print templates (A4/80mm/labels), floor plans (P09 layouts), dashboards (P14), workflows (status transitions), kiosk flows. |
| Notes | Output is always JSON metadata stored in DB, rendered by the runtime pattern components. |

---

## 4. Vertical catalogs

Columns: **Screen** — **Pattern** — **Key entities / fields** — **Special behaviors** (RT = realtime, DEV = device, PRN = printing, RPT = report).

Every vertical additionally inherits the **Common Core** (4.0).

### 4.0 Common Core (shared by all verticals) (الأساسيات المشتركة)

| Screen | Pattern | Key entities / fields | Special behaviors |
|---|---|---|---|
| Company / branches / fiscal years | P04, P01 | Company, Branch, ControlYear (status 0 open/1 closed) | Year status drives permissions |
| Users, roles, permissions | P01, P24 | Sys_Users, Sys_RoleModule, Sys_UserModule | Permission matrix = P24 (modules x actions) |
| Menu / modules | P03 | Sys_Modules | |
| Numbering series | P01 | Doc type, prefix, branch, year, next no | X8 |
| Lookups (cities, currencies, units, taxes, payment methods) | P01 | | |
| Customers / suppliers | P01 + P05 | Code, name AR/EN, phone, tax no, credit limit, price list | Profile shows balance, statement |
| Items / services master | P01/P02 + P05 | Code, barcode(s), category (P03), units & conversion, prices, tax, track batch/serial, image | Barcode label PRN |
| Home dashboard per role | P14 | | |
| Approvals | P16 | | |
| Notifications & activity | P22 | | RT |
| Attachments | P23 | | |
| Import/export | P30 | | |
| Print template designer | P32 | | X3 |
| Audit log | P01 (read-only) | who/what/when/old/new | |

### 4.1 Restaurants & Cafes (المطاعم والكافيهات)

| Screen | Pattern | Key entities / fields | Special behaviors |
|---|---|---|---|
| Menu categories | P03 | Category, parent, color, image, display order, available times | |
| Menu items | P01 + P12 | Item, category, price per order type/branch, image, kitchen station, prep time, calories, allergens, available flag | Out-of-stock toggle pushes RT to POS |
| Modifier groups & options | P02 | Group (min/max/required), options (price delta, ingredient link) | |
| Recipes / BOM | P02 | Menu item -> ingredients with qty & unit, yield | Deducts stock on sale (theoretical cost) |
| Combos / meal deals | P02 | Combo, choice slots | |
| Floor plan designer | P32 | Areas, tables (x, y, shape, seats) | |
| Dine-in floor view | P09 | Table status, guests, waiter, opened time, amount | RT colors (free/reserved/occupied/served/bill/cleaning); merge/transfer tables |
| Touch POS / order taking | P11 | Order (type, table, guests, waiter), lines, modifiers, seat, course, notes | Kitchen routing; hold/fire course; RT to KDS; offline |
| Waiter handheld | P11 (phone layout) | same | RT |
| Split bill / merge / transfer | P11 dialog | Bill splits by item/seat/equal/amount | PRN per split |
| Payment & close | P11 dialog | Tenders, tip, service charge, change | PRN 80mm receipt; cash drawer DEV; e-invoice QR |
| Kitchen Display (KDS) per station | P18 | Ticket, items, modifiers, timers | RT; bump bar; sound; all-day counts |
| Kitchen printer routing | P01 | Item group -> printer/KDS station | PRN kitchen chit 80mm |
| Order-ready display | P17 | Order no ready / preparing | RT, voice |
| Reservations | P07 (+ P09 assign table) | Guest, phone, party size, time, table, deposit, status | Reminder SMS/WhatsApp |
| Waitlist | P01/P10 | Guest, party size, quoted wait | SMS when table ready |
| Delivery orders | P06 + P19 | Customer, address, zone fee, driver, status (new/preparing/out/delivered), COD | RT; driver assign; aggregator orders import |
| Delivery zones | P19 | Polygon, fee, min order, ETA | |
| Drivers & driver settlement | P01, P29 | Driver, cash collected vs remitted | |
| QR table menu / self-order | P27 (public web) + P12 | Table token | Order RT to POS/KDS |
| Shift open/close & cash count | P15 | Opening float, denominations, expected vs counted | PRN Z-report |
| Inventory (ingredients) purchasing & stock | see 4.4 | | |
| Waste / spoilage | P02 | Item, qty, reason | |
| Daily sales / item mix / food cost / waiter performance | P20, P14 | | RPT |

### 4.2 Retail POS & Stores (التجزئة ونقاط البيع)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| POS quick sale | P11 (retail mode) | Barcode-first entry, qty, price, discount, customer, loyalty | Scanner, scale barcodes DEV, customer display, cash drawer, receipt PRN, offline |
| Returns / exchanges | P11 dialog / P02 | Original receipt lookup, return reason, refund tender | Permission limit |
| Price checker | P27 | Barcode -> price, promo | |
| Promotions engine | P02 | Buy X get Y, % off, bundle, time window, branch, customer group | Evaluated in POS |
| Loyalty & gift cards | P01 + P05 | Points rules, card balance | |
| Variants (size/color) | P24 | Style x size x color grid | Labels PRN |
| Price list updates | P24 / P30 | Items x price lists | |
| Shelf labels / barcode labels | P20 (print) | Item, price, barcode, promo tag | ZPL/PDF labels PRN |
| Shift / cashier session (X/Z report) | P15 | | PRN |
| Store transfer / replenishment | P02 | | see 4.4 |
| Sales dashboard (today, per cashier, hourly) | P14 | | RT |

### 4.3 Shipping / Courier / Logistics (الشحن والتوصيل واللوجستيات)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Shippers (merchants) & contracts | P01 + P05 | Shipper, pricing plan, COD fee %, return fee, pickup address | |
| Rate cards | P24 | Origin zone x destination zone x weight bands | |
| Zones / cities / hubs | P03 + P19 | Country > governorate > city > area, hub | |
| Create waybill (AWB) | P02 / P15 | Sender, receiver, address, phone, pieces, weight, dimensions (volumetric), contents, COD amount, service type, reference | Auto-number AWB; label PRN (4x6 / A6 with barcode/QR) |
| Bulk waybill upload | P30 | Excel from merchant | Validates cities/phones |
| Merchant portal (create/track own shipments) | P01/P13 (public role) | | |
| Pickup requests | P06 + P19 | Pickup address, time window, courier | |
| Hub receiving (inbound scan) | P21 | Scan AWB -> received at hub | Weight check DEV |
| Sorting / bagging / manifest | P21 + P02 | Bag/manifest, AWBs, destination hub | Manifest PRN |
| Line-haul trips | P02 | Vehicle, driver, manifests, departure/arrival | |
| Route / runsheet assignment (dispatch) | P19 + P06 | Driver, AWBs, stop order | Route optimization (optional); runsheet PRN |
| Driver app (deliver / fail / collect COD / POD) | P21 + P13 (mobile) | Status, reason codes, signature, photo, GPS, COD collected | Offline; GPS RT |
| Live drivers map | P19 | Positions, current stop | RT |
| Shipment tracking | P13 | Events: created, picked up, at hub, out for delivery, delivered, failed, returned | Public tracking page; SMS/WhatsApp notifications |
| Exceptions / returns (RTO) | P06 | Failed attempts, reschedule, return to shipper | |
| COD settlement – driver | P29 | Collected vs handed over | |
| COD remittance – merchant | P25 + P02 | Delivered COD minus fees -> payout statement | Statement PRN |
| Customer service tickets | P06 + P22 | Ticket linked to AWB | |
| KPIs (delivery rate, SLA, failed reasons) | P14, P20 | | RPT |
| Fleet & vehicles | P01 + P05 | Vehicle, license expiry, maintenance | see 4.10 |

### 4.4 Warehouses & Inventory (المخازن والمخزون)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Warehouses / zones / aisles / bins | P03 + P09 (bin map) | Location hierarchy, bin type, capacity, pick sequence | Location barcode labels PRN |
| Item master (inventory view) | P05 | Units & conversions, barcodes, batch/serial/expiry tracking, reorder level, min/max, ABC class | |
| Purchase receipt / GRN | P02 + P21 | Supplier, PO ref, lines, batch, expiry, serials, qty received vs ordered | Labels PRN; GS1 parsing |
| Put-away | P21 | Suggested bin (rule: fixed bin / nearest empty / same item), confirm bin scan | |
| Stock transfer (between warehouses) | P02 (+ in-transit) | From, to, lines, sent/received status | Two-step: send + receive |
| Bin-to-bin move | P21 | | |
| Sales order picking (wave/batch) | P21 + P06 | Pick list, path order, picked qty | Pick list PRN |
| Packing & dispatch | P18 / P21 | Package, weight, carrier, label | Shipping label PRN |
| Stock count (cycle / full) | P02 + P21 + P24 | Count sheet, blind count, variance, recount, approve & post adjustment | Freeze snapshot at start |
| Stock adjustment / damage | P02 | Reason, cost impact | P16 approval |
| Stock card (item movement ledger) | P20 | In, out, balance, cost | |
| Stock balance by location / batch | P20 (pivot) | | |
| Reorder suggestions | P25 + P01 | Below min, suggested PO | |
| Expiry alerts | P14 widget + P20 | Near-expiry batches | |
| Costing setup (average/FIFO) | P04 | | |
| Warehouse dashboard | P14 | Receipts pending, picks open, accuracy | RT |

### 4.5 Pharmacies (الصيدليات)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Drug master | P01 + P05 | Trade name, generic/active ingredient, strength, form, manufacturer, units (box/strip/tablet), price (fixed pricing), narcotic/controlled flag, storage (fridge) | Unit breaking (sell strips) |
| Substitutes / alternatives | P01 (linked) | Same active ingredient & strength | POS shows alternatives when out of stock |
| Drug interactions (optional) | P01 | Ingredient pairs, severity | Warning at sale |
| Batch & expiry stock | P20 + P14 | Batch, expiry, qty | FEFO (first-expire-first-out) suggestion at sale; expired-sale block |
| Pharmacy POS | P11 (pharmacy mode) | Search by trade/generic/barcode, batch auto-select, unit, insurance split | Receipt PRN; dosage label PRN |
| Prescription entry | P02 | Patient, doctor, diagnosis, items, dose, frequency, duration, refills, image of Rx | P23 scan; controlled drugs log |
| Insurance claims (patient share / company share) | P02 + P29 | Policy, coverage %, approval no | Claim export |
| Purchasing from distributors (with bonus qty) | P02 | Bonus/free qty, discount, batch, expiry | |
| Returns to supplier (expired) | P02 | | |
| Near-expiry & shortage reports | P20 | | RPT |
| Delivery orders | P06 | | see 4.3 |
| Controlled substances register | P20 | | Regulatory PRN |

### 4.6 Clinics & Hospitals (العيادات والمستشفيات)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Departments / clinics / rooms | P03 | | |
| Doctors & schedules | P01 + P24 (weekly template) | Doctor, specialty, clinic, slots, fee | |
| Patient registration | P15 / P04 | MRN, national ID, name AR/EN, DOB, gender, phone, insurance, emergency contact, photo | Duplicate detection; wristband/card PRN |
| Patient file (EMR) | P05 | Tabs: visits, vitals, diagnoses (ICD-10), allergies, medications, orders, results, documents, invoices | P22 notes; P23 files |
| Appointments | P07 (resource = doctor) | Patient, doctor, slot, type, status (booked/arrived/in/done/no-show) | SMS reminders; online booking |
| Reception queue / check-in | P10 / P06 | Arrived patients per doctor | RT |
| Queue TV display | P17 | Ticket no -> room | RT, voice call |
| Queue ticket kiosk | P27 | | Ticket PRN 80mm |
| Doctor consultation screen | P05 + P04 (SOAP) + P31 | Complaint, exam, vitals, diagnosis, plan, prescription, orders (lab/rad) | Templates per specialty; dental chart P31 |
| Nursing / vitals | P24 / P04 | BP, pulse, temp, SpO2 over time | Chart trend |
| Lab orders & sample collection | P02 + P21 | Order, tests/panels, sample (tube) barcode | Tube label PRN (ZPL) |
| Lab worklist / bench | P18 | Pending samples per section | RT |
| Lab results entry & verification | P02 + P28 | Test, result, unit, reference range (by age/sex), flag H/L/critical | Analyzer DEV (ASTM/HL7) auto results; tech verify -> doctor release; critical alert |
| Lab result report | P20 (print) | | A4 report PRN with signature; patient portal |
| Radiology orders & worklist | P02 + P18 | Modality, exam, scheduled | DICOM MWL DEV; PACS viewer link; report template |
| Radiology reporting | P04 (rich text templates) | | PRN |
| Admission (ADT) | P15 | Admission, ward, bed, doctor, payer, deposit | HL7 ADT optional |
| Bed management / ward map | P09 (beds) / P26 | Bed status: free/occupied/cleaning/reserved/maintenance | RT |
| Transfers / discharge | P15 | | Discharge summary PRN |
| Inpatient orders & medication administration (MAR) | P24 (time x drug) | | |
| OR / surgery scheduling | P07 (resource = OR) | | |
| Pharmacy (inpatient) | see 4.5 | | |
| Services & price lists (cash / per insurer) | P24 | Service x payer price | |
| Billing (OPD / IPD) | P02 | Services, patient share, insurer share, deposits | Invoice PRN |
| Insurance: approvals, claims, rejections | P16 + P02 + P29 | Pre-authorization, claim batch, remittance | Export formats per insurer |
| Doctor commission / revenue share | P25 | | RPT |
| Hospital dashboard (census, occupancy, revenue) | P14 | | RT |

### 4.7 PlayStation / Gaming Lounges (صالات البلايستيشن والألعاب)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Devices / rooms | P01 | Device (PS4/PS5/PC/billiard/VR), room, type, rate group, status | |
| Rate plans | P24 | Device type x mode (single/multi) x time band (day/night/weekend), per hour/minute, minimum charge, rounding | |
| Session board | P10 | Session start, pauses, mode changes, device switch, prepaid time, items | RT live timers; alert when prepaid ends; auto-calculated charge |
| Start / end session | P10 dialog | Customer (optional), mode, prepaid or open | Receipt PRN 80mm |
| Add snacks & drinks | P11 (embedded in session) | Items on the session bill | Stock deduct |
| Canteen POS (walk-in) | P11 | | |
| Packages / prepaid hours / membership cards | P01 + P05 | Balance hours | |
| Tournaments | P01 + P02 | Teams, matches, fees | |
| Shift close | P15 | | Z-report PRN |
| Reports (device utilization, revenue per hour, top items) | P20, P14 | | RPT |

### 4.8 Gyms & Fitness (الجيم واللياقة)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Membership plans | P01 | Duration, price, sessions count, freeze days allowed, access hours, branches | |
| Members | P01 + P05 | Photo, phone, measurements (P24 over time), membership history, payments, attendance | Membership card PRN (QR) |
| Sell / renew membership | P15 / P02 | Plan, start date, discount, installments | Invoice PRN; e-receipt |
| Check-in | P27 / P21 | Scan QR / fingerprint / card | Turnstile DEV; validity check; RT on reception screen |
| Freeze / transfer membership | P04 + P16 | | |
| Class schedule | P07 (resource = studio/trainer) | Class, trainer, capacity, recurrence | |
| Class booking | P12 + P07 | Booking, waitlist | Capacity enforced RT |
| Trainers & personal training packages | P01 + P07 | Sessions remaining, commission | |
| Workout / diet plans | P02 | Plan, exercises, sets/reps | PRN / share |
| Lockers | P10 | Locker status | |
| Shop POS (supplements) | P11 | | |
| Expiring memberships / renewals follow-up | P20 + P06 | | SMS |
| Dashboard (active members, check-ins today, revenue) | P14 | | |

### 4.9 HR & Payroll (الموارد البشرية والمرتبات)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Org structure | P03 | Company > department > section, positions | Org chart view |
| Employees | P01 + P05 | Personal data, contract, salary structure, documents (expiry), bank account, insurance no | P23 docs with expiry alerts |
| Recruitment | P06 | Vacancy, candidates, stages | |
| Shifts & rosters | P24 / P07 | Shift templates, employee x day roster | |
| Attendance devices | P28 | Device IP, sync schedule, user mapping | DEV (fingerprint/face clocks) |
| Attendance log & daily processing | P25 + P24 | Punches -> in/out, late, early leave, overtime, absence | Rules engine |
| Attendance sheet (monthly) | P24 | Employee x day status | |
| Leave types & balances | P01 + P20 | Accrual rules, carry-over | |
| Leave / permission request | P04 + P16 | Type, from-to, balance check | Mobile self-service |
| Loans & advances | P02 | Installments schedule | Deducted in payroll |
| Allowances / deductions / penalties | P24 / P02 | | |
| Payroll run | P25 | Period, employees, components, taxes, social insurance | Lock after posting; GL journal |
| Payslips | P20 (print) | | PRN / email |
| Bank transfer file | P25 export | | Bank file formats |
| End of service | P15 | | |
| Appraisals | P02 + P16 | KPIs, scores | |
| Employee self-service portal | P14 + P04 + P16 | | Mobile |

### 4.10 Fixed Assets (الأصول الثابتة)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Asset categories | P03 | Default life, method (straight line/declining), GL accounts | |
| Asset register | P01 + P05 | Code, tag barcode, cost, purchase date, location, custodian, life, salvage, status | Asset tag label PRN |
| Acquisition / capitalization | P02 | From purchase invoice | |
| Depreciation run | P25 | Period, schedule per asset | Posts GL; reversible |
| Depreciation schedule | P20 | | |
| Custody (handover / return) | P02 + P13 | Employee, asset, date, condition, signature | Custody form PRN |
| Transfers between locations | P02 | | |
| Maintenance requests & work orders | P06 + P02 | Problem, priority, technician, parts, cost | |
| Preventive maintenance plans | P07 / P25 | Interval (days/km/hours) | Auto-generate WOs |
| Disposal / sale / write-off | P02 + P16 | Gain/loss | |
| Physical asset audit | P21 | Scan tag -> found/missing/wrong location | Offline |

### 4.11 Accounting & Finance (الحسابات والمالية)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Chart of accounts | P03 | Level-coded, type, nature (debit/credit), leaf posting | |
| Cost centers / projects | P03 | | |
| Journal voucher | P02 | Lines: account, debit, credit, cost center, description | Must balance; PRN |
| Receipt / payment vouchers (cash & bank) | P02 / P04 | Cash box/bank, payee, amount, allocation to invoices | PRN A5/A4; cheque printing |
| Cheques (receivable / payable) lifecycle | P06 + P13 | Due date, status (in portfolio/deposited/collected/bounced) | |
| Bank reconciliation | P29 + P30 | Statement import | |
| Currencies & rates | P01 / P24 | | |
| Customer/supplier statement | P20 | | PRN / email |
| Aging | P20 (pivot) | | |
| Trial balance, P&L, balance sheet, cash flow | P20 | Levels, comparative periods | PRN / Excel |
| Budgets | P24 | Account x month | Budget vs actual RPT |
| Taxes (VAT returns) & e-invoicing | P25 + P20 | | Gateway DEV/API (ETA/ZATCA) |
| Period / year close | P25 | | Sets ControlYear status |
| Finance dashboard | P14 | Cash position, receivables, payables | |

### 4.12 Sales, Purchasing & CRM (المبيعات والمشتريات وإدارة العملاء)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Leads / opportunities pipeline | P06 | Stage, value, probability, owner | Drag stage |
| Activities (calls, meetings, tasks) | P07 + P22 | | Reminders |
| Customer 360 | P05 | Contacts, orders, invoices, tickets, balance | |
| Quotation -> Sales order -> Delivery -> Invoice | P02 (copy-from chain) | | PRN A4; status tracking P13 |
| Sales returns / credit notes | P02 | | |
| Price lists, discounts, credit limit | P24 / P01 | | Credit limit check -> P16 override |
| Sales reps & commissions | P01 + P25 | | |
| Sales rep mobile (van sales, visits) | P11 (mobile) + P19 | Route, visit check-in GPS | Offline; mobile Bluetooth printer |
| Purchase request -> RFQ -> PO -> GRN -> invoice | P02 chain + P16 | | 3-way match P29 |
| Supplier comparison (RFQ) | P24 | Suppliers x items prices | |
| Support tickets | P06 + P22 + P13 | SLA | |
| Campaigns (SMS/WhatsApp/email) | P15 | Segment, template | |
| Sales dashboards | P14, P20 | | |

### 4.13 Real Estate (العقارات)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Projects / buildings / floors / units | P03 + P09 (floor map) | Unit type, area, view, price, status (available/reserved/sold/rented) | RT unit status colors |
| Units catalog | P12 + P19 | Photos, filters | |
| Leads & viewings | P06 + P07 | | |
| Reservation & sales contract | P15 + P02 | Buyer, unit, price, down payment | Contract PRN (A4 multi-page) |
| Installment plans | P02 + P25 | Schedule generator, due dates, late fees | Reminders SMS |
| Collections | P02 / P20 | | Receipt PRN |
| Lease contracts | P15 + P02 | Tenant, period, rent, deposit, escalation | Renewal alerts |
| Rent invoicing | P25 | Monthly generation | |
| Unit availability (short-term rental) | P26 | | |
| Maintenance requests | P06 | | Tenant portal |
| Owners' statements (property management) | P20 | | |
| Documents (deeds, IDs) | P23 | | Expiry |

### 4.14 Schools & Training Centers (المدارس ومراكز التدريب)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Academic structure (stage > grade > class) | P03 | | |
| Students | P01 + P05 | Guardian, documents, medical notes | ID card PRN |
| Admission / enrollment | P15 | | |
| Fees structure & invoicing | P24 + P25 | Grade x fee items; installments; discounts (siblings) | |
| Fee collection | P02 / P11 | | Receipt PRN |
| Timetable | P24 (days x periods) / P07 | Teacher conflicts check | |
| Attendance (students) | P24 / P21 | Class x day | Parent SMS |
| Exams & grades entry | P24 | Students x subjects/components | |
| Report cards | P20 (print) | | PRN |
| Courses & sessions (training centers) | P12 + P07 | | Certificates PRN |
| Bus routes | P19 | | |
| Parent / student portal | P14 + P13 | | Mobile |

### 4.15 Hotels (الفنادق)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Room types, rooms, floors | P01 + P03 | | |
| Room rack / tape chart | P26 | Reservations x dates | Drag to move/extend |
| Floor map / room status | P09 / P10 | Vacant clean / vacant dirty / occupied / out of order | RT from housekeeping |
| Rates & seasons | P24 | Room type x date ranges | |
| Reservations | P02 / P15 | Guest, dates, room type, rate, deposit, source (OTA) | Channel manager API (optional) |
| Check-in | P15 | ID scan, room assign, key card | Door lock encoder DEV; registration card PRN |
| Guest folio | P02 + P05 | Charges (room, restaurant, laundry), payments | Post from outlets POS; folio PRN |
| Check-out | P15 | | Invoice PRN |
| Housekeeping board | P06 / P10 | Tasks per room, attendant | Mobile |
| Night audit | P25 | Post room charges, roll date | |
| Outlets POS | P11 | Charge to room | |
| Occupancy / ADR / RevPAR | P14, P20 | | |

### 4.16 Manufacturing (التصنيع)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Bill of materials (multi-level) | P03 + P02 | Product, components, qty, scrap % | |
| Routings / operations | P02 | Work centers, times | |
| Work centers / machines | P01 + P10 | Status running/idle/down | Machine counters DEV (optional) |
| Production planning (MRP) | P25 + P08 | Demand -> planned orders | |
| Production orders | P02 + P06 | Qty, BOM snapshot, status | |
| Material issue / return | P02 + P21 | | |
| Shop floor terminal (start/stop operation, report qty, scrap) | P10 / P27 | | RT |
| Finished goods receipt | P02 | Batch/lot | Labels PRN |
| Quality inspection | P02 + P16 | Parameters, pass/fail | |
| Production cost analysis | P20 | | |

### 4.17 Car Services & Workshops (مراكز صيانة السيارات والورش)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Customers & vehicles | P05 | Plate, VIN, make/model/year (cascading), odometer, history | |
| Appointments / bay booking | P07 (resource = bay) | | |
| Vehicle check-in & inspection | P15 + P31 | Damage diagram, photos, fuel level, customer signature | Check-in form PRN |
| Job card (work order) | P02 | Labor operations, parts, technician, estimated vs actual time | Estimate PRN; customer approval P16 (link/SMS) |
| Workshop board | P06 / P10 | Status: waiting/in progress/waiting parts/QC/ready | RT; TV P17 "your car is ready" |
| Technician time clock | P10 | Start/stop per job | |
| Parts inventory | see 4.4 | | |
| Invoice & payment | P02 | | PRN |
| Service reminders (next km/date) | P25 + P20 | | SMS |
| Car wash lanes | P10 | | |

### 4.18 Salons & Spas (الصالونات ومراكز التجميل)

| Screen | Pattern | Key entities | Special behaviors |
|---|---|---|---|
| Services & durations | P01 + P12 | Service, duration, price, staff skills | |
| Staff & commissions | P01 + P25 | | |
| Appointments | P07 (resource = stylist/chair) | | Online booking; reminders |
| Walk-in queue | P10 / P17 | | |
| Chair board | P09 / P10 | Chair status, current client, timer | RT |
| Checkout POS (services + products) | P11 | Multiple staff per ticket | Receipt PRN |
| Packages / memberships / gift vouchers | P01 + P05 | | |
| Client profile (preferences, history, photos) | P05 | | |

### 4.19 Additional verticals worth anticipating (short list)

| Vertical | Dominant patterns |
|---|---|
| Car rental | P26, P15 (contract), P31 (damage), P13 |
| Event halls / weddings | P07, P26, P02 (packages) |
| Laundry / dry cleaning | P11, P06 (washing->ironing->ready), P21 (tag scan), labels PRN |
| Cinema / bus tickets | P09/P31 seat map, P11, P17 |
| Construction contracting | P08, P02 (BOQ, progress invoices), P25 (retention) |
| Legal / case management | P05, P07 (hearings), P13, P23 |
| NGOs / charities | P05 (beneficiaries), P02 (aid distribution), P21 |
| Agriculture / poultry farms | P10 (houses/sheds), P24 (daily feed/mortality), P20 |
| Veterinary | same as 4.6 with pet instead of patient |

---

## 5. Vertical x Pattern coverage matrix

`●` = core screen pattern for that vertical, `○` = used secondarily. (P01, P02, P04, P14, P16, P20, P22, P23, P30 are used by all and omitted.)

| Vertical | P03 | P05 | P06 | P07 | P08 | P09 | P10 | P11 | P12 | P13 | P15 | P17 | P18 | P19 | P21 | P24 | P25 | P26 | P27 | P28 | P29 | P31 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Restaurants | ● | ○ | ● | ● |  | ● | ○ | ● | ● | ○ | ● | ● | ● | ● |  | ○ |  |  | ● | ○ | ○ |  |
| Retail | ● | ○ |  |  |  |  |  | ● | ○ |  | ● |  |  |  | ● | ● |  |  | ○ | ● |  |  |
| Logistics | ● | ○ | ● |  |  |  |  |  |  | ● | ● | ○ | ○ | ● | ● | ● | ● |  |  | ○ | ● |  |
| Warehouses | ● | ● | ○ |  |  | ○ |  |  |  |  |  |  | ○ |  | ● | ● | ● |  |  | ○ | ○ |  |
| Pharmacies | ○ | ● | ○ |  |  |  |  | ● |  |  |  | ○ |  |  | ● |  |  |  |  |  | ○ |  |
| Clinics/Hospitals | ● | ● | ○ | ● |  | ● | ● |  |  | ○ | ● | ● | ● |  | ● | ● | ○ | ○ | ● | ● | ● | ● |
| Gaming lounges |  | ○ |  |  |  |  | ● | ● |  |  | ○ |  |  |  |  | ● |  |  |  |  |  |  |
| Gyms |  | ● | ○ | ● |  |  | ○ | ○ | ○ |  | ● | ○ |  |  | ● | ○ | ○ |  | ● | ● |  |  |
| HR & payroll | ● | ● | ○ | ○ |  |  |  |  |  |  | ○ |  |  |  |  | ● | ● |  |  | ● |  |  |
| Fixed assets | ● | ● | ○ | ○ |  |  |  |  |  | ○ |  |  |  |  | ● |  | ● |  |  |  |  |  |
| Accounting | ● |  | ○ |  |  |  |  |  |  | ○ |  |  |  |  |  | ● | ● |  |  | ○ | ● |  |
| Sales/CRM/Purchasing |  | ● | ● | ○ |  |  |  | ○ |  | ○ | ○ |  |  | ○ |  | ● | ○ |  |  |  | ● |  |
| Real estate | ● | ○ | ○ | ○ | ○ | ● |  |  | ● |  | ● |  |  | ○ |  |  | ● | ○ |  |  |  |  |
| Schools | ● | ● |  | ● |  |  |  | ○ | ○ |  | ● |  |  | ○ | ○ | ● | ● |  |  |  |  |  |
| Hotels | ○ | ○ | ○ |  |  | ● | ● | ○ |  |  | ● |  |  |  |  | ● | ● | ● |  | ○ |  |  |
| Manufacturing | ● |  | ○ |  | ● |  | ● |  |  |  |  |  |  |  | ○ |  | ● |  | ○ | ○ |  |  |
| Workshops | ○ | ● | ● | ● |  |  | ● |  |  | ○ | ● | ○ |  |  |  |  | ○ |  |  |  |  | ● |
| Salons |  | ● |  | ● |  | ○ | ● | ● | ○ |  |  | ○ |  |  |  |  | ○ |  |  |  |  |  |

Reading the matrix: after P01/P02 (already built), the highest-reuse new patterns are **P05, P07, P11, P24, P25, P21, P06, P09/P10, P15**.

---

## 6. Cross-cutting requirements

### 6.1 Cascading filters & dependent lookups (القوائم المتتالية)

Requirement: any lookup/filter can depend on one or more previous fields. Example chains:

| Chain | Vertical |
|---|---|
| Category -> Sub-category -> Item | POS, inventory |
| Country -> Governorate -> City -> Area -> Zone fee | Logistics, delivery |
| Make -> Model -> Year -> Engine | Workshops |
| Warehouse -> Zone -> Aisle -> Bin | Warehouses |
| Department -> Clinic -> Doctor -> Available slot | Clinics |
| Stage -> Grade -> Class -> Student | Schools |
| Project -> Building -> Floor -> Unit | Real estate |
| Account type -> Account (leaf only) -> Cost center (if required by account) | Accounting |
| Item -> Unit (of this item) -> Batch (of this item, not expired, FEFO order) | Pharmacy, inventory |

Studio configuration per lookup field:

| Setting | Meaning |
|---|---|
| Source | Table/view, value field, display field(s) AR/EN, extra columns in dropdown |
| Depends on | List of parent fields + mapping `ParentField -> SourceColumn` |
| On parent change | Clear / keep if still valid / auto-select if single option |
| Static filter | e.g. `IsActive = 1`, `Company = current` |
| Search mode | Load all (small, < 500) / server search-as-you-type (top N) / search modal (X1, with grid & filters) |
| Allow add new | Opens P01/P04 quick-create and returns new value |
| Fill other fields | On select, copy fields (price, unit, tax) into the row |

Rules: dependency graph must be acyclic (validate in Studio); filters in grid filter bars (X2) use the same engine; server must parameterize queries (no string concatenation — note the known `BuildWhereUltraFast` `"= 1"` replace bug that corrupts `"= 15"`; must be fixed before cascading filters rely on it).

### 6.2 Validations (التحققات)

| Level | Examples |
|---|---|
| Field | required, min/max, length, regex (phone, national ID 14 digits, tax no), unique (server) |
| Cross-field | end date >= start date; debit XOR credit; discount <= limit by role |
| Row (detail) | qty > 0; batch required if item tracks batch; expiry not passed |
| Document | journal balanced; at least one line; total = payments; credit limit |
| External table | exists / not exists in another table (already in `Validation.ts`); stock available |
| Server/business | via procedure (`G_ProcessTrans` returns `@Ok` + message AR/EN) |
| Soft vs hard | warning (allow with confirm / manager PIN) vs block |

### 6.3 Printing templates (قوالب الطباعة)

| Format | Size | Typical documents | Technology |
|---|---|---|---|
| A4 / A5 | 210x297 / 148x210 mm | Invoices, quotations, POs, statements, contracts, lab reports, payslips | HTML/CSS print layout -> browser print or server PDF; header/footer per branch; AR/EN or bilingual; multi-page with repeated headers; e-invoice QR |
| Thermal receipt | 80 mm (also 58 mm) | POS receipt, kitchen chit, queue ticket, session receipt, Z-report | Option A: HTML at 72 mm width via browser print (needs kiosk-print setting). Option B: ESC/POS via Device Bridge (silent, fast, cuts paper, opens drawer). Arabic text: render as image (raster) when printer lacks Arabic code page |
| Labels | 38x25, 50x25, 100x150 (4x6) mm, etc. | Item barcode/price, shelf label, AWB shipping label, lab tube, asset tag, bin location, pharmacy dosage | ZPL/TSPL via bridge or PDF at label size; barcode types: Code128, EAN-13, QR, GS1-128, DataMatrix |
| Cards | CR80 | Member card, patient card, student ID | PDF |

Template designer (P32) needs: bands (header, detail repeat, group, footer, page footer), fields with format, images/logo, barcode/QR element, conditional sections, totals in words (AR/EN "only ... pounds"), copies count, printer routing per terminal (which printer prints which template), reprint with "COPY" watermark, print log.

### 6.4 Reports (التقارير)

- Every vertical ships standard reports (P20) defined as metadata: source procedure, parameters (reusing cascading lookups), layout (grid/grouped/pivot/chart/print).
- Drill-down: summary -> detail -> document screen.
- Export: Excel (native, not CSV-only), PDF, print; schedule by email.
- Security: report permission per role + row-level scoping (company/branch).
- Performance: heavy reports through background job + cached result; read-only replica optional later.

### 6.5 Realtime updates (التحديث اللحظي)

| Need | Screens | Mechanism |
|---|---|---|
| Status changes visible to others | P09 floor, P10 tiles, P06 boards, P18 KDS, P17 TV, P26 rack | SignalR hub (ASP.NET Core native); groups per `company:branch:channel` |
| New items notification | P16 inbox, P22 chat, delivery orders | SignalR + browser notifications; mobile push later |
| Live position | P19 | Throttled GPS posts; broadcast to dispatcher group |
| Background job progress | P25, P30, big reports | SignalR progress messages |
| Print jobs to local bridge | X3/X5 | SignalR channel per device |

Design rule: server is the source of truth; clients get snapshot + deltas; on reconnect re-fetch snapshot. Timers computed from server timestamps (never client clock alone).

### 6.6 Offline needs (العمل بدون إنترنت)

| Screen | Offline level | Strategy |
|---|---|---|
| Touch POS (P11) | Must work offline | Local item/price cache (IndexedDB), local order queue with client GUID + offline number series per terminal, sync when online, conflict-free (append-only sales) |
| Driver app / scan tasks (P21) | Must work offline | Task download, queue of events with timestamps & GPS |
| Asset audit / stock count | Should | Download count sheet, upload results |
| KDS / floor plan | Local network preferred | Optional local server mode for restaurants (same LAN) |
| Everything else | Online only | Show clear offline banner |

Note: frontend is a Next.js static export — fits PWA (service worker + IndexedDB) well.

### 6.7 Multi-language AR/EN & RTL (تعدد اللغات والاتجاه)

- Every caption, message, menu, template and report title stored AR + EN (`Resources.ts` today; Studio metadata must store both).
- Data fields with two names (`NameAr`, `NameEn`) for items, customers, accounts; display follows UI language; search matches both.
- Layout mirrors fully in RTL (use CSS logical properties: `margin-inline-start`, etc.); icons with direction (arrows, back) flip; numbers, phone, barcodes, codes remain LTR inside RTL text.
- Digits: option Western (0-9) vs Arabic-Indic (٠-٩) per company; amounts in words AR/EN.
- Dates: Gregorian default; optional Hijri display (KSA).
- Printing: bilingual templates (AR right column, EN left) are common for invoices/receipts.
- Public screens (P17, P27) support per-screen language or alternating; voice announcements per language.

### 6.8 Permissions & data scoping (الصلاحيات)

- Existing model: module-level EXECUTE / CREATE / EDIT / DELETE / PRINT / VIEW / CUSTOM, gated by fiscal year status. Studio screens must register as modules (`MODULE_CODE`) automatically.
- Extra needs: field-level (hide cost price from cashier), action-level custom permissions (void, discount > X%, reprint, open drawer), row-level (own branch / own records / assigned driver), manager override by PIN on the spot.

### 6.9 Other cross-cutting items

| Item | Notes |
|---|---|
| Numbering series (X8) | per doc type / branch / year / terminal (offline) |
| Status workflow engine (X7) | statuses, allowed transitions, required role, side-effect procedure; feeds P06, P13, P16 |
| Notifications | in-app, SMS, WhatsApp, email templates with placeholders |
| Audit trail | field-level change log for documents |
| Multi-company / branch / currency | every table scoped; exchange rates on documents |
| Attachments & camera | everywhere (P23) |
| Public (no-login) pages | tracking (P13), QR menu (P12/P27), online booking (P07), TV (P17) with device tokens |
| Accessibility for touch | min 44–48 px targets in P11/P10/P27 |
| Theming per company | logo, colors on POS/TV/prints |

---

## 7. "Custom business" — building a new vertical from blocks (نشاط مخصص)

A user who runs a business not listed (e.g. a bicycle rental shop, a print shop, a tutoring center) should follow the same recipe the catalog itself uses. The Studio should guide them with a wizard (P15):

| Step | Question the Studio asks | Result |
|---|---|---|
| 1. Things (entities) | "What do you manage?" (bikes, customers, rentals, repairs) | Tables created; each gets a P01 setup screen and optional P05 profile |
| 2. Groupings | "Do any of these have categories or parent/child?" | P03 tree for categories/locations |
| 3. Transactions | "What documents do you create?" (rental contract with lines, repair job, invoice) | P02 documents with numbering, totals, print template |
| 4. Life cycle | "Does a record go through stages?" (available -> rented -> returned -> maintenance) | X7 status workflow -> P06 board and P13 timeline automatically available |
| 5. Time | "Is anything booked by time or charged by time?" | Booked by slots -> P07; booked by days -> P26; charged by running time -> P10 |
| 6. Place | "Do you need to see things on a layout or a map?" | P09 layout or P19 map |
| 7. Selling | "Do you sell over a counter quickly?" | P11 POS bound to the items entity |
| 8. Devices | "Barcodes, printers, scales, fingerprint, other machines?" | P21 scan tasks, X3 print routes, P28 device setup |
| 9. Approvals | "Does anything need a manager's approval?" | P16 rules |
| 10. Periodic jobs | "Anything calculated every day/month?" (late fees, commissions) | P25 processes |
| 11. Public | "Should customers see or do anything themselves?" | P13 tracking page, P27 kiosk, P07 online booking |
| 12. Measures | "What numbers do you want to watch?" | P14 dashboard + P20 reports |

Example — bicycle rental, assembled without code:

| Need | Pattern chosen |
|---|---|
| Bikes list with type, size, station | P01 + P05 |
| Stations | P03 + P19 |
| Live bikes board (available/rented/repair) with rental timer & per-hour price | P10 |
| Rental checkout & return | P11 (rental mode) / P02 |
| Damage check on return | P31 (bike diagram) |
| Repair jobs | P06 |
| Daily revenue & utilization | P14, P20 |

Template packs: each vertical in section 4 should be shipped as an installable "pack" (metadata only: tables, screens, workflows, print templates, reports, dashboards) that the user can install and then modify in the Studio. A custom business = empty pack + the wizard above, or clone of the nearest pack.

---

## 8. Recommended build order (by reuse x effort)

| Wave | Patterns | Reason |
|---|---|---|
| 0 (exists) | P01, P02, P03, X1 | Already in framework; extend with Studio metadata instead of code generation |
| 1 | X7 workflow, X3 print engine (A4 + 80mm HTML), X4 SignalR, P04, P05, P20, P14 | Foundations every vertical needs |
| 2 | P11 POS, P09 floor plan, P10 tile board, P18 KDS, P17 TV | Unlocks restaurants, cafes, retail, gaming lounges, salons |
| 3 | P07 calendar, P06 kanban, P15 wizard, P16 approvals, P24 matrix, P25 batch | Unlocks clinics, gyms, HR, CRM, schools, workshops |
| 4 | P21 scan (PWA offline), P13 timeline, P19 map, P29 reconciliation, P30 import, X5 device bridge + ZPL/ESC/POS | Unlocks logistics, warehouses, pharmacies |
| 5 | P26 rack, P28 device console (HL7/ASTM, attendance clocks), P31 diagram, P08 gantt, P27 kiosk, P22/P23 polish | Unlocks hotels, hospitals/labs, manufacturing |
| Continuous | P32 designers | Built alongside each pattern (each pattern needs its own config editor) |

Prerequisites/risks noted during research:
- Fix `BuildWhereUltraFast` (`"= 1"` replace corrupting `"= 15"`) before filter-heavy patterns (X1/X2, P20).
- `onPrint` in `MasterDetail` is still a placeholder — X3 should be the implementation behind it.
- Silent thermal/label printing and lab/attendance devices are impossible from a pure browser page; plan the local Device Bridge (X5) early.
- Studio-generated screens should be **runtime metadata** (JSON rendered by pattern components) rather than generated `.tsx` files, otherwise non-programmers cannot publish without a rebuild of the static export.
