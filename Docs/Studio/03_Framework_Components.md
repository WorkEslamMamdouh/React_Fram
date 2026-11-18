# 03 — Framework Pattern Components (مكونات الأنماط الجاهزة)

> What this is: the runtime components that implement the screen patterns from `01_Business_Screen_Catalog.md`.
> Every component takes **one typed config object that is pure JSON** (no functions), so the Studio can produce it and store it as metadata. Anything that needs code — saving, side effects, a mock data source — is passed as a separate prop, never inside the config.
>
> Location: `Frontend/App/app/ClientApp/Shared/Components/Import/Patterns/`
> Demos (run without any DB table, local mock data): `Frontend/App/app/ClientApp/Demo_<Pattern>/` — open `/ClientApp/Demo_<Pattern>` (they open inside `HomeLayout` automatically).

| Pattern | Component | Config type (file) | Demo |
|---|---|---|---|
| X2 / X1 cascading filters | `CascadingFilterBar` + `useCascadingFilters` | `CascadeFilterConfig` (`ModelCascadingFilter.ts`) | `Demo_CascadingFilter` |
| P05 Record Profile 360 | `Profile360` | `Profile360Config` (`ModelProfile360.ts`) | `Demo_Profile360` |
| P07 Calendar / Scheduler | `Scheduler` | `SchedulerConfig` (`ModelScheduler.ts`) | `Demo_Scheduler` |
| P09 Floor Plan | `FloorPlan` | `FloorPlanConfig` (`ModelFloorPlan.ts`) | `Demo_FloorPlan` |
| P10 Live tiles + session timer | `TileBoard` (+ `sessionPricing.ts`) | `TileBoardConfig` (`ModelTileBoard.ts`) | `Demo_TileBoard` |
| P11 Touch POS | `TouchPOS` (+ `posCart.ts`) | `TouchPOSConfig` (`ModelTouchPOS.ts`) | `Demo_TouchPOS` |
| P06 Kanban | `Kanban` | `KanbanConfig` (`ModelKanban.ts`) | `Demo_Kanban` |
| P15 Wizard | `Wizard` | `WizardConfig` (`ModelWizard.ts`) | `Demo_Wizard` |
| P14 Dashboard / KPI | `Dashboard` | `DashboardConfig` (`ModelDashboard.ts`) | `Demo_Dashboard` |
| P21 Barcode scan task | `ScanTask` (+ `scanParse.ts`) | `ScanTaskConfig` (`ModelScanTask.ts`) | `Demo_ScanTask` |
| P18 Kitchen display / ticket rail | `KitchenDisplay` | `KitchenDisplayConfig` (`ModelKitchenDisplay.ts`) | `Demo_KDS` |

Existing components (`DynamicGrid`, `MasterDetail`, `TreeScreen`, `AdvancedFilter`, `SearchableSelect`, `Validation.ts`) were **not changed**.

---

## 0. Shared building blocks (`ModelPatterns.ts`, `patternKit.tsx`)

### 0.1 Types

| Type | Meaning |
|---|---|
| `LText` | `string` or `{ en, ar }`. Every caption in every config is `LText`. |
| `DataSourceConfig` | `{ tableName, keyField?, condition?, orderBy?, orderType?, selectedColumns? }` — a table/view read through `ManageDataSQL/Query`. `condition` may contain `{Field}` placeholders. |
| `LoadMode` | `"pages"` (server-side pagination), `"infinite"` (append next page on scroll, uses `useInfiniteSentinel`), `"all"` (small lists only). |
| `StatusStyle` | `{ value, label, color, bg?, icon?, blink? }` — one status → color/icon. Used by floor plan, tiles, kanban badges, timelines, alerts. |
| `PatternAction` | `{ id, label, icon?, variant?, showForStatus?, confirm? }` — a button; the component calls `onAction(id, row)`. |
| `TimeThreshold` | `{ fromMinutes, color }` — timer coloring (KDS). |

### 0.2 Data providers

All components read through a `DataProvider` (`(q: DataQuery) => Promise<{ rows, total }>`):

- `sqlDataProvider` (default) — builds a safe condition (`source.condition` + `where` equality map + `extraCondition` + `search` LIKE + `range`) and calls `SQL.Select` with `PageNumber/PageSize/ReturnTotalCount`. Values go through `sqlLit` (numbers raw, strings `N'..'` escaped) and are parameterized again on the server by `BuildWhereUltraFast`.
- `createLocalProvider({ Table: rows[] })` — same contract over in-memory arrays (demos, tests, offline caches).

`DataQuery.range = { field, from, to }` loads only a time window (Scheduler — "WIN").

### 0.3 Hooks / UI helpers

| Export | Use |
|---|---|
| `usePagedData({ provider, source, where, extraCondition, search, range, mode, pageSize, enabled })` | Returns `rows, total, page, pageCount, loading, loadingMore, hasMore, loadMore, goToPage, refresh`. Stale responses are ignored. |
| `InfiniteSentinel`, `PagerBar` | Bottom of a list: sentinel for `infinite`, page buttons for `pages`. |
| `VirtualList` | Fixed-row-height virtualization (renders only visible rows; `onEndReached` for infinite). |
| `useLangKit()` | `{ lang, isAr, dir, t(en, ar), lt(LText) }` from `useSys`. |
| `useNow(ms, serverOffsetMs)` | Ticking clock for timers (server time offset supported). |
| `BottomSheet` | Bottom sheet on phones, centered dialog on desktop; used for all action menus. |
| `StatusPill`, `EmptyState`, `btnClass`, `cardClass`, `fmtValue`, `fmtDuration` | Styling follows the existing `erp-*` Tailwind tokens (light/dark, RTL via logical properties). |

All components: AR/EN + RTL (`dir` from language), touch targets ≥ 40–48 px, phone/tablet/desktop layouts.

---

## 1. Backend fix — `BuildWhereUltraFast`

- New: `Backend/Controllers/GateWay/Services/WhereParameterizer.cs` — a single-pass scanner that replaces each literal after `=` **at its exact position** with `@pN`.
- `SQLServer.BuildWhereUltraFast` now delegates to it (same signature and output shape: `("WHERE " + sql, List<SqlParameter>)`). The old regex `s_regex` was removed.
- Fixes: `= 1` vs `= 15` corruption, decimals (`= 1.5`), negatives, escaped quotes (`'O''Brien'`), `=` inside string literals (`LIKE '%a=1%'`) and inside `[bracketed]` identifiers, `NULLIF(` mistaken for `NULL`.
- Reproducible check: `dotnet run --project Tools/Checks/BuildWhereCheck` (compiles the real backend file; 17 cases, prints `ALL PASSED`, exit code 0/1).

---

## 2. Cascading filters (X2) — `useCascadingFilters` + `CascadingFilterBar`

Each filter can depend on one or more earlier filters. On change, dependents are cleared (or kept if still valid, or auto-selected when only one option is left). Options load from a table/view with a where built from parent values. Cycles and unknown parents are reported (`state.errors`).

### Config

| Field | Notes |
|---|---|
| `filters[]: CascadeFilterDef` | `field`, `label`, `type` (`select` default, `text`, `number`, `date`, `dateRange`, `boolean`), `source { tableName, valueField, displayField, displayFieldEn?, condition?, orderBy?, searchFields? }` or static `options[]` (with `parentValues`), `dependsOn[] { parent, column, whenParentEmpty: "none" | "all" }`, `onParentChange` (`clear` / `keepIfValid` / `autoSelectSingle`), `loadMode` (`all` / `server` = page of 30 + server search + infinite), `targetColumn` (column in the screen data; `null` = chain only), `required`, `operator`, `defaultValue`, `hidden`, `span` |
| `id`, `persist` | remember last values per screen (localStorage, try/catch) |
| `applyOnChange` | `false` = Apply button |
| `columns`, `layout` | bar / stacked; phones always use a bottom sheet |

### Output of the hook

`values`, `fields[]` (options/loading/disabled per filter), **`condition`** (SQL for `DynamicGrid`), **`where`** (equality map for providers), `predicate(row)` (local filtering), `activeCount`, `setValue`, `clearAll`, `apply`, `searchOptions`. Also `cascadeToActiveFilters()` gives the `ActiveFilter[]` shape used by `AdvancedFilter`.

### Use with DynamicGrid (no change to DynamicGrid needed — it reloads when `condition` changes)

```tsx
const cf = useCascadingFilters(FilterConfig);
<CascadingFilterBar state={cf} />
<DynamicGrid tableName="I_Items" keyColumn="ItemID" columns={Columns}
             condition={andJoin(`CompCode = ${CompCode}`, cf.condition)} />
```

### Full example

```json
{
  "id": "Items_Filter",
  "columns": 4,
  "filters": [
    { "field": "CategoryID", "label": { "en": "Category", "ar": "الفئة" },
      "source": { "tableName": "I_Category", "valueField": "CategoryID", "displayField": "NameAr", "displayFieldEn": "NameEn", "condition": "IsActive = 1" } },
    { "field": "TypeID", "label": { "en": "Type", "ar": "النوع" },
      "source": { "tableName": "I_ItemType", "valueField": "TypeID", "displayField": "NameAr", "displayFieldEn": "NameEn" },
      "dependsOn": [{ "parent": "CategoryID", "column": "CategoryID" }],
      "onParentChange": "autoSelectSingle" },
    { "field": "ItemID", "label": { "en": "Item", "ar": "الصنف" },
      "source": { "tableName": "I_Item", "valueField": "ItemID", "displayField": "NameAr", "displayFieldEn": "NameEn", "searchFields": ["NameAr", "NameEn", "Barcode"] },
      "dependsOn": [{ "parent": "TypeID", "column": "TypeID" }],
      "loadMode": "server" },
    { "field": "TrDate", "label": { "en": "Date", "ar": "التاريخ" }, "type": "dateRange" },
    { "field": "IsActive", "label": { "en": "Active", "ar": "فعال" }, "type": "boolean" }
  ]
}
```

---

## 3. P05 — `Profile360`

Props: `config`, `recordKey`, `provider?`, `record?` (skip loading), `onAction(id, record)`, `onRowClick(tabId, row)`, `onAddNote(tabId, text, record)`.

Header card (photo or initials, title AR/EN, status badges, info fields, stat tiles, quick actions) + tabs. Tab kinds: `fields`, `list` (filtered by `foreignKey = recordKey`, `loadMode` pages/infinite, search, status column; cards on phones), `timeline`, `notes` (with add), `kpis`. **Tabs load lazily on first open** and stay mounted. Phone: header compacts, tabs scroll as chips, or `mobileTabs: "stacked"` for accordion sections.

```json
{
  "entity": { "tableName": "IQ_Patients", "keyField": "PatientID" },
  "header": {
    "titleField": "NameAr", "titleFieldEn": "NameEn", "subtitleField": "MRN", "photoField": "PhotoUrl",
    "badges": [{ "field": "Status", "statuses": [
      { "value": "active", "label": { "en": "Active", "ar": "فعال" }, "color": "#10B981" },
      { "value": "blocked", "label": { "en": "Blocked", "ar": "موقوف" }, "color": "#F43F5E", "icon": "⛔" }] }],
    "infoFields": [{ "field": "Phone", "label": { "en": "Phone", "ar": "تليفون" } }],
    "stats": [{ "field": "Balance", "label": { "en": "Balance", "ar": "الرصيد" }, "format": "money" },
              { "field": "VisitsCount", "label": { "en": "Visits", "ar": "الزيارات" }, "format": "number" }]
  },
  "quickActions": [{ "id": "newAppointment", "label": { "en": "New appointment", "ar": "موعد جديد" }, "icon": "📅", "variant": "primary" }],
  "tabs": [
    { "id": "info", "kind": "fields", "label": { "en": "Info", "ar": "البيانات" },
      "fields": [{ "field": "BirthDate", "label": { "en": "Birth date", "ar": "تاريخ الميلاد" }, "format": "date" }] },
    { "id": "visits", "kind": "list", "label": { "en": "Visits", "ar": "الزيارات" }, "countField": "VisitsCount",
      "source": { "tableName": "IQ_Visits", "keyField": "VisitID", "orderBy": "VisitDate", "orderType": "DESC" },
      "foreignKey": "PatientID", "loadMode": "pages", "pageSize": 15, "searchFields": ["Doctor", "Diagnosis"],
      "columns": [{ "field": "VisitDate", "label": { "en": "Date", "ar": "التاريخ" }, "format": "date", "mobile": true },
                  { "field": "Amount", "label": { "en": "Amount", "ar": "المبلغ" }, "format": "money", "mobile": true }],
      "statusField": "Status", "statuses": [{ "value": "done", "label": { "en": "Done", "ar": "تمت" }, "color": "#10B981" }] },
    { "id": "timeline", "kind": "timeline", "label": { "en": "Timeline", "ar": "الخط الزمني" },
      "source": { "tableName": "IQ_PatientEvents", "keyField": "EventID" }, "foreignKey": "PatientID",
      "timeField": "EventTime", "titleField": "Title", "noteField": "Note", "userField": "User" },
    { "id": "notes", "kind": "notes", "label": { "en": "Notes", "ar": "ملاحظات" },
      "source": { "tableName": "Sys_Notes", "keyField": "NoteID" }, "foreignKey": "RecordID",
      "textField": "Text", "userField": "User", "timeField": "CreatedAt", "allowAdd": true }
  ]
}
```

---

## 4. P07 — `Scheduler`

Props: `config`, `provider?`, `initialDate?`, `onSlotClick(start, end, resourceId)`, `onEventClick(ev)`, `onEventMove(ev, newStart, newEnd, newResource) → false to reject`, `reloadKey`, `height`.

Views: `day`, `week`, `month`, `agenda`, `resource` (one column per doctor/chair/room; non-working hours shaded per resource). Only the visible date range is queried (`range` on `startField`). Overlapping events are laid out in lanes. Overlap rule `block` / `warn` / `allow` with `capacity`. Drag-to-move on desktop (`allowDrag`). Phone defaults to `mobileView` (agenda). Week start configurable (6 = Saturday).

```json
{
  "events": { "source": { "tableName": "IQ_Appointments", "keyField": "AppID" },
    "idField": "AppID", "startField": "StartAt", "durationField": "Duration",
    "titleField": "PatientName", "subtitleField": "Type", "resourceField": "DoctorID", "statusField": "Status" },
  "resources": [
    { "id": 1, "label": { "en": "Dr. Sami", "ar": "د. سامي" }, "color": "#0D9488", "workStart": "09:00", "workEnd": "17:00" },
    { "id": 2, "label": { "en": "Dr. Hala", "ar": "د. هالة" }, "color": "#8B5CF6" }],
  "statuses": [{ "value": "booked", "label": { "en": "Booked", "ar": "محجوز" }, "color": "#3B82F6" },
               { "value": "arrived", "label": { "en": "Arrived", "ar": "وصل" }, "color": "#10B981" }],
  "views": ["resource", "day", "week", "month", "agenda"], "defaultView": "resource", "mobileView": "agenda",
  "slotMinutes": 30, "dayStart": "08:00", "dayEnd": "21:00", "weekStartsOn": 6,
  "overlap": "warn", "capacity": 1, "allowDrag": true, "defaultDuration": 30
}
```
`resourcesSource` (table) can replace the static `resources` list.

---

## 5. P09 — `FloorPlan`

Props: `config`, `rows?` (live snapshot from parent / SignalR) **or** `objects.source` + `refreshSeconds`, `onAction(id, obj)`, `editable`, `onMove(obj, x, y)`, `serverTimeOffsetMs`.

Canvas in design units, scaled to the container + zoom buttons; each object colored by status, shows label, guests/seats, elapsed time since `openedAtField`, amount. Tap → `clickAction[status]` runs directly, otherwise a bottom sheet with the actions allowed for that status (`showForStatus`, optional `confirm`). Edit mode = drag with grid snap. Legend with live counts. Phone: tiles grouped by area (`phoneLayout: "tiles"`).

```json
{
  "areas": [{ "id": 1, "label": { "en": "Main hall", "ar": "الصالة الرئيسية" } },
            { "id": 2, "label": { "en": "Garden", "ar": "الجنينة" }, "background": "/img/garden.png", "width": 1000, "height": 560 }],
  "canvas": { "width": 960, "height": 600, "grid": 10 },
  "objects": { "source": { "tableName": "IQ_R_TablesStatus" },
    "idField": "TableID", "areaField": "AreaID", "labelField": "TableNo", "xField": "X", "yField": "Y", "wField": "W", "hField": "H",
    "shapeField": "Shape", "seatsField": "Seats", "statusField": "Status", "openedAtField": "OpenedAt",
    "guestsField": "Guests", "amountField": "Amount", "waiterField": "Waiter" },
  "statuses": [
    { "value": "free", "label": { "en": "Free", "ar": "فاضية" }, "color": "#10B981" },
    { "value": "reserved", "label": { "en": "Reserved", "ar": "محجوزة" }, "color": "#3B82F6" },
    { "value": "occupied", "label": { "en": "Occupied", "ar": "مشغولة" }, "color": "#F97316" },
    { "value": "bill", "label": { "en": "Bill requested", "ar": "طلب الحساب" }, "color": "#8B5CF6", "blink": true },
    { "value": "cleaning", "label": { "en": "Cleaning", "ar": "تحتاج تنظيف" }, "color": "#64748B" }],
  "clickAction": { "free": "openOrder" },
  "actions": [
    { "id": "openOrder", "label": { "en": "Open order", "ar": "فتح طلب" }, "variant": "primary", "showForStatus": ["free"] },
    { "id": "bill", "label": { "en": "Print bill", "ar": "طباعة الحساب" }, "showForStatus": ["occupied"] },
    { "id": "pay", "label": { "en": "Pay & close", "ar": "دفع وإغلاق" }, "variant": "success", "showForStatus": ["bill"] }],
  "phoneLayout": "tiles", "refreshSeconds": 15
}
```

---

## 6. P10 — `TileBoard` + `sessionPricing.ts`

Props: `config`, `rows?` or `source`, `onAction(id, row, charge)`, `onAlert(row, remainingMinutes)` (once per session), `serverTimeOffsetMs`.

Each tile: status, running clock (1 s), live charge, current hourly rate, prepaid countdown (blinks under `alertBeforeEndMinutes`, red "time is up"). Status filter chips with counts, grouping (`groupField`). Actions in a bottom sheet show a charge breakdown.

**Pricing** (`computeSessionCharge`, pure, server-time based): rate by device `type` × `mode`; time `bands` (e.g. night/weekend, crossing midnight, by weekday); `unit` minute or `block` (`blockMinutes`, `rounding` up/nearest/down); `minimumCharge`; `graceMinutes`; pauses subtracted (`pausedMs` + live `pausedAt`); mode changes billed per segment (`segmentsField` = `[{ mode, start }]`); items amount added. The server must recompute the final amount on checkout.

```json
{
  "source": { "tableName": "IQ_PS_DevicesLive" },
  "idField": "DeviceID", "labelField": "Name", "typeField": "Type", "groupField": "Room", "statusField": "Status",
  "runningStatuses": ["running"], "pausedStatuses": ["paused"],
  "statuses": [{ "value": "free", "label": { "en": "Free", "ar": "فاضي" }, "color": "#10B981" },
               { "value": "running", "label": { "en": "Playing", "ar": "شغال" }, "color": "#F97316" },
               { "value": "paused", "label": { "en": "Paused", "ar": "موقوف مؤقت" }, "color": "#3B82F6" }],
  "session": { "startField": "StartedAt", "pausedMsField": "PausedMs", "pausedAtField": "PausedAt", "modeField": "Mode",
               "segmentsField": "Segments", "prepaidMinutesField": "PrepaidMinutes", "itemsAmountField": "ItemsAmount", "customerField": "Customer" },
  "pricing": { "currency": { "en": "EGP", "ar": "ج.م" }, "unit": "block", "blockMinutes": 15, "rounding": "up", "minimumCharge": 10, "graceMinutes": 3,
    "rates": [
      { "type": "PS5", "mode": "single", "perHour": 40, "bands": [{ "from": "00:00", "to": "06:00", "perHour": 30 }] },
      { "type": "PS5", "mode": "multi", "perHour": 60 },
      { "type": "Billiard", "perHour": 50 }] },
  "modeLabels": { "single": { "en": "Single", "ar": "فردي" }, "multi": { "en": "Multi", "ar": "مالتي" } },
  "actions": [
    { "id": "start", "label": { "en": "Start", "ar": "بدء" }, "variant": "primary", "showForStatus": ["free"] },
    { "id": "pause", "label": { "en": "Pause", "ar": "إيقاف مؤقت" }, "showForStatus": ["running"] },
    { "id": "end", "label": { "en": "End & checkout", "ar": "إنهاء ومحاسبة" }, "variant": "success", "showForStatus": ["running", "paused"],
      "confirm": { "en": "End session?", "ar": "إنهاء الجلسة؟" } }],
  "tileSize": "md", "alertBeforeEndMinutes": 5, "refreshSeconds": 10
}
```

---

## 7. P11 — `TouchPOS` + `posCart.ts`

Props: `config`, `provider?`, `onCheckout(order) → false keeps the cart`, `onDiscountOverLimit(pct) → true if a manager approved`, `cartHeader` (customer/table picker slot), `height`.

Tablet/desktop: categories + search/scan + item tiles | cart. Phone: "Items" / "Cart (n)" tabs + sticky total button. Items are loaded per category with infinite scroll (or pages). Modifier groups (`min`/`max`/required, price deltas) open before adding; same item + same modifiers merges quantity. Line edit sheet: quantity (decimals for weighed items), line discount presets, kitchen note, remove. Order discount with `maxPercent`. Tax inclusive/exclusive + service %. Hold / recall. Payment sheet: several methods (split tender), quick-cash buttons, exact, remaining and change. Barcode: keyboard-wedge scanner listener + search box Enter; scale barcodes (`scaleBarcode`: prefix + item code + weight/price).

`PosOrder` passed to `onCheckout`: `{ orderType, lines[{ itemId, name, unitPrice, qty, modifiers, discountPct, note }], orderDiscountPct, totals{ subtotal, lineDiscounts, orderDiscount, serviceCharge, tax, total, itemsCount }, payments[{ methodId, amount }], paid, change }` — map it to `SQL.InsertMasterDetail`.

```json
{
  "mode": "restaurant",
  "categoriesSource": { "tableName": "I_Category", "idField": "CategoryID", "labelField": "NameAr", "labelFieldEn": "NameEn", "colorField": "Color" },
  "items": { "source": { "tableName": "IQ_PosItems", "keyField": "ItemID", "orderBy": "SortOrder" },
    "idField": "ItemID", "nameField": "NameAr", "nameFieldEn": "NameEn", "priceField": "Price", "categoryField": "CategoryID",
    "barcodeField": "Barcode", "imageField": "ImageUrl", "availableField": "Available", "modifierGroupsField": "ModGroups",
    "loadMode": "infinite", "pageSize": 40, "searchFields": ["NameAr", "NameEn", "Barcode"] },
  "modifierGroups": [
    { "id": 1, "label": { "en": "Size", "ar": "الحجم" }, "min": 1, "max": 1, "options": [
      { "id": "s", "label": { "en": "Small", "ar": "صغير" } }, { "id": "l", "label": { "en": "Large", "ar": "كبير" }, "priceDelta": 20 }] }],
  "orderTypes": [{ "id": "dine", "label": { "en": "Dine-in", "ar": "صالة" } }, { "id": "take", "label": { "en": "Takeaway", "ar": "تيك أواي" } }],
  "paymentMethods": [{ "id": "cash", "label": { "en": "Cash", "ar": "كاش" }, "isCash": true }, { "id": "card", "label": { "en": "Card", "ar": "فيزا" } }],
  "discounts": { "allowLine": true, "allowOrder": true, "maxPercent": 15, "presets": [5, 10, 15, 25] },
  "tax": { "rate": 14, "inclusive": true, "label": { "en": "VAT", "ar": "ض.ق.م" } },
  "serviceChargePercent": 12, "currency": { "en": "EGP", "ar": "ج.م" }, "quickCash": [50, 100, 200, 500],
  "scanner": true,
  "scaleBarcode": { "prefixes": ["21", "22"], "itemCodeLength": 5, "valueLength": 5, "valueType": "weight", "divisor": 1000 }
}
```

---

## 8. P06 — `Kanban`

Props: `config`, `provider?`, `onMove(card, from, to) → false rejects (card rolls back)`, `onCardClick`, `extraCondition` / `where` (e.g. from cascading filters), `height`.

Each column loads its own pages (`pageSize`, infinite inside the column) and shows the server total. Drag & drop on desktop; "⋮ → Move to" sheet everywhere (touch). `transitions` restricts moves; `wipLimit` per column with `wipRule` block/warn. Optimistic move. Phone: one column at a time with a column chip bar.

```json
{
  "source": { "tableName": "IQ_CRM_Leads", "keyField": "LeadID", "orderBy": "LeadID", "orderType": "DESC" },
  "idField": "LeadID", "statusField": "Stage", "titleField": "Title", "subtitleField": "Customer",
  "amountField": "Amount", "dateField": "CloseDate", "assigneeField": "Owner",
  "badges": [{ "field": "Priority", "statuses": [{ "value": "high", "label": { "en": "High", "ar": "عالية" }, "color": "#F43F5E" }] }],
  "columns": [
    { "value": "new", "label": { "en": "New", "ar": "جديد" }, "color": "#06B6D4" },
    { "value": "proposal", "label": { "en": "Proposal", "ar": "عرض سعر" }, "color": "#8B5CF6" },
    { "value": "negotiation", "label": { "en": "Negotiation", "ar": "تفاوض" }, "color": "#F59E0B", "wipLimit": 20 },
    { "value": "won", "label": { "en": "Won", "ar": "تم البيع" }, "color": "#10B981" }],
  "transitions": { "new": ["proposal"], "proposal": ["negotiation", "won"], "negotiation": ["proposal", "won"], "won": [] },
  "pageSize": 20, "wipRule": "warn"
}
```

---

## 9. P15 — `Wizard`

Props: `config`, `initialValues?`, `onFinish(values) → false keeps the wizard open`, `onCancel?`, `renderCustomStep(stepId, values, setValue)` (embed any other pattern in a `kind: "custom"` step), `onStepChange?`.

Step bar (desktop) / "Step 2 of 5" + progress (phone), sticky buttons. Per-field checks: `required`, `min`/`max`, `pattern` (+ built-in email/phone), then the step's `validations` run through the existing **`RunValidations` from `Validation.ts`** (compare / range / regex / exists / notExists / unique). `visibleWhen` and `skipWhen` use a JSON condition `{ field, equals | in | notEmpty, not }`. `kind: "summary"` lists all answers with Edit links. `allowDraft` autosaves to localStorage and offers Resume / Discard.

```json
{
  "id": "Gym_Signup", "allowDraft": true, "allowJumpBack": true, "tableName": "G_Members", "keyColumn": "MemberID",
  "finishLabel": { "en": "Create membership", "ar": "إنشاء الاشتراك" },
  "steps": [
    { "id": "personal", "title": { "en": "Member", "ar": "بيانات العضو" }, "fields": [
      { "field": "FullName", "label": { "en": "Full name", "ar": "الاسم" }, "required": true, "span": 2 },
      { "field": "Phone", "label": { "en": "Mobile", "ar": "الموبايل" }, "type": "phone", "required": true, "pattern": "^01[0125][0-9]{8}$" }],
      "validations": [{ "type": "unique", "field": "Phone", "table": "G_Members", "messageEn": "Phone already registered", "messageAr": "الموبايل متسجل قبل كده" }] },
    { "id": "plan", "title": { "en": "Plan", "ar": "الباقة" }, "fields": [
      { "field": "Plan", "label": { "en": "Plan", "ar": "الباقة" }, "type": "select", "required": true,
        "options": [{ "value": "day", "label": { "en": "Day pass", "ar": "يوم" } }, { "value": "m1", "label": { "en": "1 month", "ar": "شهر" } }] },
      { "field": "HasTrainer", "label": { "en": "Trainer", "ar": "مدرب" }, "type": "checkbox" },
      { "field": "Trainer", "label": { "en": "Trainer", "ar": "المدرب" }, "type": "select", "required": true,
        "visibleWhen": { "field": "HasTrainer", "equals": true }, "options": [{ "value": 1, "label": "Hany" }] }] },
    { "id": "health", "title": { "en": "Health", "ar": "الصحة" }, "skipWhen": { "field": "Plan", "equals": "day" }, "fields": [
      { "field": "Weight", "label": { "en": "Weight", "ar": "الوزن" }, "type": "number", "min": 30, "max": 250 }] },
    { "id": "summary", "kind": "summary", "title": { "en": "Review", "ar": "مراجعة" } }
  ]
}
```

---

## 10. P14 — `Dashboard`

Props: `config`, `provider?`, `onDrill(widgetId, target, row?)`.

12-column grid on desktop (KPIs 2-per-row on phones, other widgets full width). Global filters are a `CascadeFilterConfig`; each widget receives `where` + `condition` (or only the fields listed in `filterFields`). Widgets read **aggregated** sources (views/procedures returning ready numbers — never raw rows). Widget kinds:

- `kpi` — `valueField`, optional `compareField` → ▲/▼ % (colored by `higherIsBetter`), `format`, `icon`, `suffix`, `drillTo`.
- `chart` — `bar` (grouped), `line`, `area`, `donut`; dependency-free SVG; hover tooltip + crosshair; legend for ≥2 series; "Table" toggle (accessible alternative). Series colors follow a fixed, color-blind-checked order (`SERIES_COLORS`) unless `series[].color` is set.
- `list` — top-N table (`limit`, `columns`).
- `alerts` — text + level (`StatusStyle` with icon + label, never color alone).
- `shortcuts` — big link buttons.

`refreshSeconds` reloads all widgets.

```json
{
  "title": { "en": "Sales today", "ar": "مبيعات النهارده" },
  "filters": { "id": "SalesDash", "filters": [
    { "field": "BranchID", "label": { "en": "Branch", "ar": "الفرع" }, "source": { "tableName": "G_Branch", "valueField": "BranchCode", "displayField": "BranchNameAr", "displayFieldEn": "BranchNameEn" } },
    { "field": "TrDate", "label": { "en": "Date", "ar": "التاريخ" }, "type": "dateRange" }] },
  "refreshSeconds": 60,
  "widgets": [
    { "id": "sales", "kind": "kpi", "title": { "en": "Sales", "ar": "المبيعات" }, "source": { "tableName": "VW_Dash_SalesKpi" },
      "valueField": "Sales", "compareField": "SalesPrev", "format": "money", "icon": "💰", "drillTo": "SalesInvoice" },
    { "id": "byHour", "kind": "chart", "chartType": "area", "title": { "en": "Sales by hour", "ar": "المبيعات بالساعة" }, "span": 8,
      "source": { "tableName": "VW_Dash_SalesByHour", "orderBy": "Hour" }, "labelField": "Hour",
      "series": [{ "field": "Sales", "label": { "en": "Sales", "ar": "المبيعات" } }, { "field": "Target", "label": { "en": "Target", "ar": "المستهدف" } }] },
    { "id": "byCat", "kind": "chart", "chartType": "donut", "title": { "en": "By category", "ar": "حسب الفئة" }, "span": 4,
      "source": { "tableName": "VW_Dash_SalesByCategory" }, "labelField": "Category", "series": [{ "field": "Value", "label": "Sales" }] },
    { "id": "top", "kind": "list", "title": { "en": "Top items", "ar": "أعلى الأصناف" }, "span": 6, "limit": 5,
      "source": { "tableName": "VW_Dash_TopItems" }, "columns": [{ "field": "Item", "label": "Item" }, { "field": "Amount", "label": "Amount", "format": "money" }] },
    { "id": "alerts", "kind": "alerts", "title": { "en": "Alerts", "ar": "تنبيهات" }, "span": 6,
      "source": { "tableName": "VW_Dash_Alerts" }, "textField": "Text", "levelField": "Level",
      "levels": [{ "value": "critical", "label": { "en": "Critical", "ar": "حرج" }, "color": "#d03b3b", "icon": "⛔" }] }
  ]
}
```

---

## 11. P21 — `ScanTask` + `scanParse.ts`

Props: `config`, `lines?` (expected lines) or `config.lines.source`, `provider?`, `onLookup(parsed)` (items not in the list — needed for blind counts), `onComplete(events, totals) → false keeps progress`.

Big always-focused scan field (hardware keyboard-wedge scanners type + Enter), optional camera via the browser `BarcodeDetector` (Chrome/Android) when `allowCamera`. Step loop from `steps` (`location`, `item`, `qty`, `confirm`). Checks: wrong location, expired (`blockExpired`), over expected (`tolerance.overPercent`, `rule` block/warn). GS1-128 parsing (`(01)` GTIN → EAN-13 lookup, `(10)` batch, `(17)` expiry, `(21)` serial, `(30)/(37)` qty; parenthesised or raw with GS separator) and scale barcodes. Sound + vibration feedback, undo last scan, progress bar, line colors (pending / partial / done / over). Progress is saved to localStorage per `id` until Finish (survives reload / no network).

```json
{
  "id": "GRN_1045", "title": { "en": "Receive PO #1045", "ar": "استلام أمر شراء 1045" },
  "mode": "expected", "steps": ["location", "item"], "qtyMode": "perScan",
  "lines": { "source": { "tableName": "IQ_GRN_Lines", "condition": "GrnID = 1045" },
    "keyField": "LineID", "itemField": "ItemID", "nameField": "ItemName", "barcodeField": "Barcodes",
    "expectedQtyField": "OrderedQty", "locationField": "Bin" },
  "tolerance": { "overPercent": 0, "rule": "warn" },
  "gs1": true, "blockExpired": true, "feedback": { "sound": true, "vibrate": true }, "allowCamera": true
}
```

---

## 12. P18 — `KitchenDisplay`

Props: `config`, `tickets?` (live) or `source` (+ `refreshSeconds`), `station`, `onStationChange`, `onStart`, `onBumpItem(ticket, itemId, done)`, `onBumpTicket`, `onRecall`, `serverTimeOffsetMs`.

Only open tickets (status ≠ done), oldest first, as a horizontal rail (tablet on the wall) or a wrapping grid. Header color by elapsed minutes (`thresholds`), live timer, order no / table / type, notes. Tap an item to bump it, Start / Ready per ticket. Stations filter items by `item.station` (`accepts`); a station without `accepts` is the expo view. Side panel: "all day" open counts or recall list (last `recallCount` done). Bump-bar keys: `1..9` select, `S` start, `Enter` ready, `R` recall. Beep on new ticket.

```json
{
  "source": { "tableName": "IQ_KDS_Tickets", "condition": "Status <> 'done' OR BumpedAt > DATEADD(hour,-2,GETDATE())" },
  "fields": { "idField": "TicketID", "numberField": "OrderNo", "tableField": "TableNo", "typeField": "OrderType",
              "createdAtField": "CreatedAt", "statusField": "Status", "notesField": "Notes", "bumpedAtField": "BumpedAt", "itemsField": "ItemsJson" },
  "stations": [{ "id": "expo", "label": { "en": "Expo", "ar": "التجميع" } },
               { "id": "grill", "label": { "en": "Grill", "ar": "الشواية" }, "accepts": ["grill"] }],
  "statusValues": { "new": "new", "started": "started", "done": "done" },
  "thresholds": [{ "fromMinutes": 0, "color": "#10B981" }, { "fromMinutes": 8, "color": "#F59E0B" }, { "fromMinutes": 15, "color": "#F43F5E" }],
  "showAllDay": true, "recallCount": 8, "soundOnNew": true, "layout": "rail", "refreshSeconds": 10
}
```
`itemsField` holds `[{ id, name, qty, modifiers[], note, station, course, done }]` (array or JSON string).

---

## 13. Known limits / next steps

- Realtime (X4 SignalR) is not built yet: live components accept `rows`/`tickets` from the parent (push-ready) or poll with `refreshSeconds`.
- Not done in this pass: P04, P13, P16, P17, P20, P24–P32, Kanban swimlanes, Scheduler recurrence, POS offline (IndexedDB) and split bill, KDS course firing.
- Printing (X3) is not wired; POS/TileBoard/FloorPlan hand data back through callbacks.
- Pricing and totals computed in the browser are for display; the server/procedure must recompute on save.
- `createLocalProvider` ignores `extraCondition` (raw SQL); local filtering works through `where`, `search` and `range`.
