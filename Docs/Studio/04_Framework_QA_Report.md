# 04 — Framework QA Report (المراجعة والاختبار)

> Scope: the new code from `03_Framework_Components.md` — `WhereParameterizer` / `BuildWhereUltraFast`, cascading filters, the 10 pattern components + helpers, and the `Demo_*` screens. Admin folders, `ScreenBuilder`, `Shared/Reports` and `ERP_Studio` were not touched.
> Date: 2026-11-12. Everything below was actually run; numbers are from this machine (Node 20.20.1, Windows 10, SQL Server `ESSA_React` at the address in `Backend/appsettings.json`).

---

## 1. Summary

| Area | Result |
|---|---|
| `WhereParameterizer` vs. the real DB | **31/31 conditions** return exactly the same keys through `api/ManageDataSQL/Query` (XOR-encrypted like `Sys.CallApiEncrypted`) as a direct SQL query. `BuildWhereCheck`: ALL PASSED. |
| Code review | 16 issues fixed (list in §3), all minimal changes. |
| Performance | `sessionPricing` 2.9–3.4× faster (results identical 300/300). VirtualList renders ≤ 29 rows for 100k rows and re-renders once per row instead of once per scrolled pixel. |
| Browser | All 11 `Demo_*` pages open logged in (QA user), no runtime errors, no page-level horizontal scroll at 375 / 768 / 1366 px in EN and AR. 2 layout bugs found and fixed (ScanTask input row, Scheduler view switch). |
| Builds | `tsc --noEmit` exit 0 · `npm run build` exit 0 · `dotnet build ERP.csproj` 0 errors / 0 warnings · ESLint on all Pattern files: 0 problems. |

---

## 2. WhereParameterizer — live check against the DB

Script: `Tools/Checks/WhereLiveCheck.ps1` (needs the backend running on `http://localhost:49475`).
It sends each condition through `ManageDataSQL/Query` (fields encrypted with the same XOR key) and compares the returned key list with `SELECT key FROM table WHERE <condition>` run directly.

```
powershell -ExecutionPolicy Bypass -File Tools\Checks\WhereLiveCheck.ps1
→ passed=31 failed=0
```

Covered: `ItemID = 15` vs `= 1` vs `=150`, `Price = 480.140`, `Price = 1.5`, `>=`, `<>`, `!=`, negatives (`> -1`, `= -5`), `IN (…)`, `CAST(x AS NVARCHAR) IN (N'1', N'15')`, `'IT0006'` and `N'IT0006'`, `N'O''Brien'`, `LIKE '%a=1%'`, `[ItemID] = 15`, `NULLIF(Barcode, '') …`, `= NULL`, nested parentheses, dates (`= '2025-01-01'`, ranges, `BETWEEN`, `CAST(… AS date) =`), decimals on `TST_Expense`, and the typical screen conditions found in the frontend (`CompCode = 1 AND IsActive = 1`, `CompCode = … AND BranchCode = …`, leading/trailing spaces, lowercase `and`).

Notes:
- `ManageDataSQLController` has `[Authorize]` commented out, so no JWT was needed for the check (this is an existing security gap — see §6).
- String values become `nvarchar` parameters; comparing them with `varchar` columns causes an implicit conversion (index scan instead of seek on big tables). Results are correct; only performance on large `varchar` columns may be affected.

---

## 3. Bugs found and fixed

| # | File | Problem | Fix |
|---|---|---|---|
| 1 | `Layouts/HomeLayout/Navbar/Navbar.ts` | `selectedBranch.BranchCode` / `selectedYear.FinYear` read while the store has no branches/years (nobody logged in) → crash inside `HomeLayout`. | Null guards in the 2 effects + `selectedBranch?.BranchCode`. Logged-in behaviour unchanged. |
| 2 | same | Switching language / dark mode crashed (`Cannot read properties of null (reading 'IDSettingsUser')`) for a user with no `Sys_SettingsUserProfile` row (found with the QA user). | The UI change still happens; saving the preference is skipped when there is no profile row. |
| 3 | `patternKit.tsx` `usePagedData` | Effect depended on the `source` object reference → a parent that builds `source` inline every render would reload forever. | Depend on `!!source`; real changes already go through the request signature. |
| 4 | `patternKit.tsx` `VirtualList` | `setState` on every scroll pixel → full list re-render per pixel. | scrollTop rounded to the row height (+1 safety row). Verified no gaps over 4,413 scroll positions. |
| 5 | `cascadingFilter.ts` | Option labels stayed in the old language after AR/EN switch (options were cached by parent values only). | Language added to the options signature. |
| 6 | `cascadingFilter.ts` | `autoSelectSingle` / `keepIfValid` changed a filter without clearing its own children → grandchildren could keep an invalid value. | Uses `applyCascadeChange` for those changes. |
| 7 | `CascadingFilterBar.tsx` | `<label>` not linked to its input (screen readers / tap on label). | `htmlFor` + `id` on every filter input. |
| 8 | `Wizard.tsx` (`allowDraft`) | On mount the autosave effect wrote the empty form over the saved draft, so "Resume" restored nothing. | Autosave waits until the draft was read and while the Resume/Discard choice is pending. Verified in browser: draft survives reload and Resume restores the values. |
| 9 | `ScanTask.tsx` | Progress restore + save raced; in React StrictMode (dev) saved progress was wiped. | Save starts only after restore. Verified: scanned 1 item, reloaded → `1 / 6` kept. |
| 10 | `ScanTask.tsx` camera loop | Loop called the `submit` from the first render (stale step, totals, location). | Calls the latest `submit` through a ref. |
| 11 | `ScanTask.tsx` layout | Scan input had no `min-w-0` → on 375 px the OK button was pushed out and clipped. Camera support was computed during render (hydration mismatch risk on Android). | `min-w-0 w-full` on the input; camera support detected after mount. |
| 12 | `TouchPOS.tsx` | Barcode scanner's Enter also "clicked" the focused button (e.g. the last tapped item) → item added twice. | `preventDefault()` when the Enter ends a scan. |
| 13 | `Scheduler.tsx` | View switch (`overflow-hidden`) cut the "Agenda" button on phones. | `max-w-full overflow-x-auto`, buttons `shrink-0`. |
| 14 | `KitchenDisplay.tsx` | Bump-bar keys fired while a `<select>` had focus. | `SELECT` ignored like `INPUT`/`TEXTAREA`. |
| 15 | `Kanban.tsx` | "⋮" button had a fixed English `aria-label="move"`. | Localized. |
| 16 | `Demo_Profile360.ts` | Tab icon 🪪 (Emoji 13) shows as an empty box on Windows 10. | Replaced with 📇. |

---

## 4. Benchmarks

### 4.1 Pure helpers — `node Tools/Checks/PatternBench/bench.js`
(transpiles the real `.ts` files with the project's TypeScript; Node 20.20.1)

| Function | Case | Time |
|---|---|---|
| `cartTotals` | 20 / 200 / 2000 lines | 0.69 µs / 3.96 µs / 35.7 µs |
| add-to-cart merge (`findIndex` + `sameLine`) | 200 lines | 2.38 µs |
| `parseScan` | plain EAN-13 / GS1 () / GS1 raw (GS) / scale | 0.53 / 2.45 / 3.02 / 0.31 µs |
| `computeSessionCharge` before → after | 30 min | 52.4 → 47.9 µs |
| | 3 h | 235.9 → 128.5 µs |
| | 12 h, 2 mode segments | 674 → 308 µs |
| | 48 h (loop cap) | 5.25 → 1.80 ms |
| TileBoard tick: 40 running 3 h tiles × 2 calls | per 1-second tick | **37.2 → 11.0 ms** |

Pricing optimisation: band "HH:MM" parsed once (WeakMap cache), rate rule looked up once per mode, rules without bands skip the band loop. The bench re-implements the original algorithm and compares: **300/300 identical amounts**.

### 4.2 Paged data over 100,000 mock rows

| Step | Time |
|---|---|
| `createLocalProvider` page 1 (40 rows) sorted by name | 9.0 ms |
| page 1 with `where CategoryID = 7` | 6.3 ms |
| page 1 with search in 2 fields | 20.8 ms |
| last page (2500) no sort | 0.41 ms |
| `usePagedData` append + de-duplicate, 1000 pages × 100 rows up to 100k | 7.6 s total; slowest single append **109 ms** at 100k rows |
| `VirtualList` (100k rows, 44 px rows, 700 px view) | max 29 rows mounted; no gaps |

Infinite scroll is fine up to a few thousand rows (append ≈ 1 ms per 1,000 accumulated rows). The append cost grows with the list (array copy + key set each page), so a list that may be scrolled into tens of thousands of rows should use `VirtualList` and/or `"pages"` mode.

### 4.3 Backend paged queries — `Tools/Checks/QueryLatency.ps1`
Largest table in `ESSA_React`: `TST_OrderLine` (2,708 rows). 30 runs each, through `ManageDataSQL/Query`.

| Query | Server time p50 / p95 | Client round-trip p50 / p95 |
|---|---|---|
| page 1 × 25 + total count | 5 / 8 ms | 27.9 / 130.7 ms |
| page 50 × 25 + total count | 2 / 5 ms | 25.0 / 37.7 ms |
| page 1 × 100 + total, `Qty >= 1` | 3 / 4 ms | 49.7 / 55.8 ms |
| page 1 × 40, `ItemID = 15` | 4 / 6 ms | 24.8 / 29.1 ms |
| all rows (2,708), no paging | 5 / 11 ms | 788 / 915 ms |

Client time includes PowerShell 5.1 JSON parsing, which dominates the "all rows" case. The DB is too small to show real paging cost; the table sizes above are the largest available.

---

## 5. Browser test

- Frontend `npm run dev` via `.claude/launch.json` (port 3001), backend `dotnet run` (port 49475). Logged in with the QA account from `Database/QA_TestData.md`.
- Without login, `Demo_*` pages redirect to `/ClientApp/Login` (existing app behaviour); after the Navbar guard there is no crash during that redirect.
- All 11 demos (`Demo_CascadingFilter, Profile360, Scheduler, FloorPlan, TileBoard, TouchPOS, Kanban, Wizard, Dashboard, ScanTask, KDS`) checked at **375 × 812, 768 × 1024, 1366 × 800**, in **EN (ltr) and AR (rtl)**: page horizontal overflow = 0 everywhere; no button/input clipped by its container after fixes #11 and #13.
- Console: no runtime errors from the pattern components. Remaining errors are existing 404s for `/StyleDesign/*.css` (`StyleEN.css`, `HomeLayoutEN.css`, `NavbarEN.css`, `SideMenuEN.css`, Login CSS) — unrelated to this work.
- Test data created during the browser test (wizard draft, scan progress in localStorage) was removed afterwards. No database rows were written by the tests.

---

## 6. Remaining issues / risks (not changed)

1. **`ManageDataSQLController` has `[Authorize]` commented out** — any caller can run Query/Insert/Delete without a JWT. Security decision for the owner.
2. **`OrderByID` and `NameTable` are concatenated into SQL** (only `Condition` values are parameterized). Fine for trusted screens, but they must never come from user input.
3. `sessionPricing`: `minimumCharge` is applied even when the session is still inside `graceMinutes` (a 2-minute session with 3 grace minutes is charged the minimum). Needs a business decision.
4. Scheduler loads only events that **start** inside the visible range; an event that starts the day before and runs past midnight is not shown on the next day.
5. Kanban on phones shows one column, so the WIP check for a move to another column uses 0 for that column's count (not loaded).
6. `BottomSheet` has no focus trap / initial focus (keyboard users can tab behind the sheet).
7. The live components (TileBoard, KDS) recompute every tile every second. With the pricing fix 40 tiles ≈ 11 ms/s; boards with hundreds of live tiles should memoize per tile or slow the tick.
8. `usePagedData` append cost grows with the list (see §4.2).
9. `Navbar.ts` still has existing ESLint errors (`var`, `prefer-const`, `any`) — pre-existing code, left as is.
10. Existing 404s for `/StyleDesign/*.css`.

---

## 7. Files

Changed: `Layouts/HomeLayout/Navbar/Navbar.ts`, `Patterns/patternKit.tsx`, `cascadingFilter.ts`, `CascadingFilterBar.tsx`, `Wizard.tsx`, `ScanTask.tsx`, `TouchPOS.tsx`, `Scheduler.tsx`, `KitchenDisplay.tsx`, `Kanban.tsx`, `sessionPricing.ts`, `Demo_Profile360/Demo_Profile360.ts`. No C# files changed.

Added checks: `Tools/Checks/WhereLiveCheck.ps1`, `Tools/Checks/QueryLatency.ps1`, `Tools/Checks/PatternBench/bench.js`.
