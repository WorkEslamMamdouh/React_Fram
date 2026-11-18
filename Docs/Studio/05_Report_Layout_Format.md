# 05 — Report Layout Format `rf-report/1` (شكل ملف تصميم التقرير)

> The contract between the ERP Studio report designer and the runtime renderer in the framework.
> Types: `Frontend/App/app/ClientApp/Shared/Reports/ReportLayoutTypes.ts` (source of truth).
> Renderer: `Shared/Reports/renderer/` · Viewer: `Shared/Reports/ReportViewer.tsx` · Templates: `Shared/Reports/templates/*.layout.json`.
> Replaces Stimulsoft (`.mrt`). Old `.mrt` layouts are not rendered; the viewer shows an automatic layout instead (§9).

---

## 1. Root

```jsonc
{
  "schema": "rf-report/1",
  "code": "INV_A4", "nameAr": "فاتورة ضريبية", "nameEn": "Tax invoice",
  "kind": "document",            // document (one record + lines) | list (grouped list) | labels
  "page":   { ... },             // §2
  "data":   { ... },             // §3 (optional at runtime)
  "styles": { "base": {...}, "th": {...}, "td": {...}, "total": {...} },   // §6
  "bands":  [ ... ]              // §4, in print order
}
```

## 2. Page

| Field | Meaning |
|---|---|
| `size` | `A4` `A5` `Letter` `Thermal80` `Thermal58` `LabelA4_3x8` `LabelA4_3x7` `LabelA4_2x7` `Label50x25` `Label40x30` `Label100x50` `Custom` |
| `orientation` | `portrait` (default) / `landscape` |
| `width`, `height` | mm — required for `Custom`, override a preset. `height: null` = open length (receipt) |
| `margins` | `{ top, right, bottom, left }` in mm (each preset has defaults: A4 10 mm, 80 mm receipt 3/4 mm, label sheets 0) |
| `dir` | `auto` (from the user's language) / `rtl` / `ltr` |

Thermal presets have **open height**: the whole report is one page whose height is measured, and printing uses `@page { size: 80mm <measured>mm; margin: 0 }`.
Label presets carry ready label settings (columns × rows, label size, gaps) used by a `labels` detail band (§4.3).

## 3. Data

At runtime the data comes from `ReportsController.run` (stored procedure, up to 5 result sets) or directly from the screen (`openLayoutReport`).

```jsonc
"data": {
  "source": { "type": "proc", "name": "dbo.Rpt_SalesInvoice" },          // Studio uses it; runtime reads Sys_Reports.ProcName
  "params": [ { "name": "TrID", "from": "row", "value": "SaleID" } ],      // Studio uses it; runtime reads Sys_ReportParams
  "tables": { "Data": "header", "Data2": "lines" }                          // result set → alias
}
```

* Result sets are named `Data`, `Data2`, … `Data5`. `tables` gives them aliases; both names work.
* Alias **`header`**: its first row is available everywhere as `header.X`.
* Always available: `Company.*` (`CompNameA/E, CompAddress, CompTel, BranchNameA/E, BranchAddress, BranchTel, VatNo, LogoBase64, PrintedBy, PrintedAt`), `Params.*`.

## 4. Bands

| `type` | Printed | Notes |
|---|---|---|
| `reportHeader` | once, top of page 1 | |
| `pageHeader` | top of every page | `skipFirstPage: true` (e.g. "continued" line) |
| `groupHeader` | when `groupBy` value changes | n levels = several group headers in order; `keepWithNext` (default true) keeps it with the first row |
| `detail` | per row | §4.1–4.3 |
| `groupFooter` | end of a group (same `groupBy`) | aggregates = the group rows |
| `reportFooter` | once, after the last row | aggregates = all rows |
| `pageFooter` | bottom of every page | `skipLastPage`; aggregates = rows on that page |

Common band fields: `elements`, `style`, `visibleIf` (expression), `layout: "flow" | "absolute"`, `height` (mm; required for `absolute`).
**flow** (default): elements one under another; an element with `width` sits next to the following ones; use a `row` element for columns.
**absolute**: each element has `x`, `y` (mm from the start edge — right edge in RTL) and `width`/`height`.

### 4.1 detail `layout: "table"` (default)
```jsonc
{ "type": "detail", "table": "lines", "layout": "table", "zebra": true, "showTotals": true,
  "sortBy": ["BranchName", "-TrDate"],                        // optional; "-" = descending
  "headerStyle": { "background": "#1f3a5f", "color": "#fff" },
  "columns": [
    { "expr": "rowNumber", "title": "#", "width": "6%", "align": "center" },
    { "field": "ItemName", "title": { "ar": "الصنف", "en": "Item" }, "width": "40%" },
    { "field": "Qty", "format": "n2", "align": "end", "aggregate": "sum" },
    { "expr": "Qty * UnitPrice", "title": "Total", "format": "n2", "aggregate": "sum" } ] }
```
Rows are split over pages by real measured height; the column header repeats on every page; `showTotals` adds a totals row (columns with `aggregate`: `sum | count | avg | min | max`). No `columns` = every column of the first row.
Groups expect the rows to be ordered by the `groupBy` fields (use `sortBy` if the procedure does not sort).

### 4.2 detail `layout: "flow" | "absolute"`
Each row renders the band's `elements` (card / form style).

### 4.3 detail `layout: "labels"`
```jsonc
{ "type": "detail", "layout": "labels", "table": "lines",
  "labels": { "columns": 3, "rows": 8, "width": 70, "height": 37, "gapX": 0, "gapY": 0,
              "copies": "Copies",            // number, or a field name with the count per row
              "elementLayout": "flow",       // or "absolute" (x/y in mm inside the label)
              "outline": true },             // light dashed frame (preview aid)
  "elements": [ ... ] }
```
Without `labels` the page preset's label settings are used. Roll presets (`Label50x25` …) = one label per page.

## 5. Elements

Common: `width` (`"50%"` or mm number), `height` (mm), `x`/`y` (absolute), `style`, `visibleIf`.
Texts can be a string or `{ "ar": "...", "en": "..." }` (picked by the user's language).

| `type` | Fields | Output |
|---|---|---|
| `text` | `text` with `{{expr}}` or `{{expr \| format}}` | text (new lines kept) |
| `field` | `field`, `format`, `label` | value of a column of the current row (then `header`, then `Company`) |
| `expression` | `expr`, `format`, `label` | computed value |
| `image` | `src` (expression: `Company.LogoBase64`, a field with base64, a URL / data URL), `fit` | image |
| `line` | `orientation`, `thickness` (mm), `color`, `dashed` | rule |
| `rect` | `text` | box (border/padding from `style`) |
| `row` | `items`, `gap`, `direction: "row" \| "column"` | container (columns or a stacked box) |
| `spacer` | `height` | empty space |
| `pageNumber` | `template` (default "Page {{page}} of {{pages}}" / "صفحة … من …") | page x of y |
| `signature` | `label` | signature line |
| `barcode` | `value` (expr), `format` `CODE128 \| EAN13 \| EAN8 \| CODE39 \| ITF \| ITF14 \| UPC`, `barHeight` (mm), `showText` | SVG (JsBarcode). Invalid value → "⚠ value" |
| `qr` | `value` (expr), `size` (mm, default 25), `level` `L/M/Q/H` | SVG (qrcode). ZATCA: `"value": "zatcaQr()"` |
| `chart` | `chart` `bar \| line \| pie \| donut`, `table` (default = detail rows/group), `category`, `value`, `aggregate`, `colors`, `title` | light SVG |
| `amountWords` | `value` (expr), `currency` (`EGP SAR AED KWD BHD OMR QAR JOD USD EUR`), `prefix`, `suffix` | Arabic amount in words (tafqeet) |
| `table` | `table` (alias), `columns`, `showTotals`, `zebra`, `headerStyle` | a whole sub-table inside a band (not split across pages) |

## 6. Styles

`{ font, size (pt), bold, italic, underline, color, background, align (start|center|end|justify), border (true | {top,right,bottom,left}), borderColor, borderWidth (mm), radius (mm), padding (mm), lineHeight, nowrap }`
`styles.base` = whole report, `styles.th` / `styles.td` / `styles.total` = table header / cells / totals row. Element `style` overrides. Default font: Cairo (`/fonts/Cairo/Cairo.ttf`).

## 7. Expressions (safe, no `eval`)

* Paths: `Qty`, `[Item Name]`, `header.NetAmount`, `Company.CompNameA`, `Params.FromDate`, `tables.lines`, `row.X`.
* Specials: `page`, `pages`, `rowNumber`, `today`, `now`, `lang`.
* Operators: `+ - * / %`, `= == != <> < > <= >=`, `&& || !`, `cond ? a : b`, parentheses. `+` joins text when one side is text.
* Aggregates (scope = group / page / report, see §4): `sum(expr)`, `avg`, `min`, `max`, `count()`; another table: `sum(Total, 'lines')`.
* Functions: `if(c,a,b)`, `coalesce(a,b,…)`, `concat`, `upper`, `lower`, `trim`, `substr(s,start,len)`, `len`, `round(v,d)`, `abs`, `number`, `format(v,'n2')`, `date(v)`, `t('عربي','English')`, `tafqeet(amount,'SAR')`,
  `zatcaQr(seller?, vatNo?, time?, total?, vat?)` — ZATCA phase-1 TLV (tags 1–5) as Base64; defaults: `Company.CompNameA`, `Company.VatNo`, `header.SaleDate|TrDate`, `header.NetAmount`, `header.VatAmount`.
* An invalid expression prints `#ERR` (the report still prints; the error is in the console).

## 8. Formats

`text`, `n0`, `n1`, `n2`, `n3`, `c` (= n2), `percent`, `date` (yyyy-MM-dd), `dateTime`, `time`, `bool` (نعم/لا · Yes/No). Without a format: numbers as-is, ISO dates → date. Digits are always Latin.

## 9. Storage and resolution (runtime)

* `Sys_ReportLayouts.LayoutFormat` = `json` | `mrt`, `LayoutJson` = this document (`Database/Phase10_Reports_Json.sql`).
* `api/Reports/resolve-layout` returns JSON layouts first, then the most specific scope (branch > company > all), default, newest.
* No JSON layout (new report, or only an old `.mrt`) → `autoLayout.ts` builds: company header + title + filters + printed at/by, a table of all result columns (decimals get totals), page numbers; paper/orientation from the old layout row.
* File fallback (no `Sys_Reports*` tables): `App_Data/Reports/layouts.json` + `layouts/{LayoutId}.json`.

## 10. Runtime API (screens)

```ts
openReport({ reportCode, filters | row, trId?, title?, moduleCode? })   // unchanged signature (DynamicGrid / MasterDetail / generated screens)
openLayoutReport({ layout, data: { tables, company?, params? }, title?, fileName? })   // ready layout + data (e.g. SalesInvoice onPrint)
```
Viewer: print (isolated iframe, `@page` = layout size), PDF (= print → "Save as PDF"), Excel (detail table via exceljs), zoom / fit width, page navigation, paper/orientation preview, report parameters.

## 11. Templates shipped

| File | Kind | Data |
|---|---|---|
| `SalesInvoice_A4.layout.json` | A4 tax invoice: header boxes, lines table with totals, totals box, ZATCA QR, amount in words, signatures, page x/y | `header` (IQ_TR_Sales row), `lines` (IQ_TR_SaleDetails) |
| `Receipt_80mm.layout.json` | 80 mm receipt (open height): lines, totals, words, QR, Code128 of the invoice no. | same |
| `BarcodeLabels_A4.layout.json` | A4 3×8 labels (70×37): company, item, Code128, price; `Copies` per row | `lines`: `ItemName`, `Barcode` (or `ItemCode`), `Price`, `Copies` |
