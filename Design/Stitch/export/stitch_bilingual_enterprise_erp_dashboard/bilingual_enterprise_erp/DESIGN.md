---
name: Bilingual Enterprise ERP
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f26'
  on-tertiary-container: '#0090a9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  tabular-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers an institutional-grade, high-density ERP interface architected primarily for Right-to-Left (RTL) Arabic enterprise workflows, with frictionless Left-to-Right (LTR) English parity. Designed for mission-critical operations across general ledgers, multi-currency invoicing, supply chain tracking, and real-time inventory management, the interface prioritizes absolute clarity, precision, and cognitive ease during prolonged operational sessions.

The design language balances **Modern Corporate Precision** with **Engineered High-Density Functionalism**. It avoids ornamental distractions in favor of structural clarity, predictable spatial mechanics, and razor-sharp typographic alignment. The visual tone instills authority, structural stability, and financial trustworthiness, turning complex, multi-layered data structures into legible, actionable workflows.

## Colors

The palette is engineered around high legibility, strict status communication, and visual comfort during data-dense operational work.

### Core Architecture
- **Primary Navy/Slate (`#0F172A` / `#1E293B`):** Establishes institutional weight. Used for navigation frames, primary text, active headers, and dominant interface commands.
- **Vibrant Teal & Cyan Accents (`#0D9488` / `#06B6D4`):** Represents focused interactive state transitions, key action triggers, primary row selections, and data visualization highlights.
- **Neutral Canvas & Surfaces (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`, `#CBD5E1`):** A stepped cool-slate hierarchy defining background canvas, distinct table alternating fills, card panels, and crisp divider lines.

### Functional Status Indicators
Financial and inventory operations rely strictly on deterministic semantic tokens:
- **Success / Posted / Paid (`#10B981`):** Applied with a matching soft tint (`#ECFDF5`) for completed financial states, verified stock audits, and balanced ledger lines.
- **Warning / Pending / Draft (`#F59E0B`):** Paired with tint (`#FFFBEB`) for unposted journal entries, pending approvals, and low stock thresholds.
- **Critical / Overdue / Void (`#F43F5E`):** Paired with tint (`#FFF1F2`) for overdue invoices, inventory discrepancies, and hard system validations.
- **Informational / Processing (`#0284C7`):** Paired with tint (`#F0F9FF`) for sync queues, batch runs, and background tasks.

## Typography

The typographic stack manages dual-script balance between **Cairo** (Arabic) and **Inter** (English & Numeric sequences).

### Bi-Directional Typographic Behavior
- **Font Stack Definition:** Set CSS font families with priority fallbacks: `font-family: 'Cairo', 'Inter', -apple-system, sans-serif;` for Arabic context and `'Inter', 'Cairo', sans-serif;` for English context.
- **Vertical Metrics & Baseline Alignment:** Cairo possesses taller ascenders and deeper descenders than Inter. Adjust Arabic text blocks with a 4% to 6% line-height expansion relative to English defaults to maintain comfortable breathing room.
- **Tabular Figures (`tnum`):** All financial summaries, stock metrics, currency values, ledger IDs, and barcode matrices must strictly enable OpenType tabular numbers (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`). Numbers in both RTL and LTR viewports preserve strict monospaced alignment across grid rows.
- **Punctuation & Directional Isolation:** Enclose mixed-content financial identifiers (e.g., account codes with dashes, currency symbols alongside values) within `dir="ltr"` or bidirectional isolation tags (`<bdi>`) to avoid inverted punctuation in RTL reading order.

## Layout & Spacing

The layout is built upon an RTL-first fluid 12-column grid system tuned for high information density across standard enterprise desktop resolutions (1440px and 1920px), while scaling down gracefully to tablet and mobile form factors.

### Directionality Mechanics (RTL/LTR)
- Layout containers rely entirely on logical CSS properties (`margin-inline-start`, `padding-inline-end`, `border-inline-start`, `inset-inline-start`).
- In RTL, primary navigation docks along the right edge; nested sub-navigation flows leftward; data tables read from right to left; primary action buttons sit pinned to the bottom-left of forms.

### Breakpoints & Grid Adaptation
- **Desktop (>= 1280px):** 12-column grid, `2rem` outer canvas margin, `1.5rem` gutter. Collapsible sidebar fixed at 260px (expanded) or 72px (icon-only).
- **Tablet (768px – 1279px):** 8-column grid, `1.5rem` canvas margin, `1rem` gutter. Sidebar collapses to off-canvas drawer or top toolbar. Data tables feature horizontal containment with pinned primary identifier columns.
- **Mobile (< 768px):** 4-column grid, `1rem` margin, `0.75rem` gutter. Dense multi-column tables transform into stacked summary card views.

## Elevation & Depth

Visual hierarchy uses crisp hairline borders paired with multi-layered, low-opacity ambient shadows tinted with slate navy (`#0F172A`). This prevents muddy stacking while maintaining strict structural boundaries.

### Elevation Hierarchy
- **Level 0 (Base Canvas):** Background fill `#F8FAFC`. Zero elevation.
- **Level 1 (Surface Cards & Inset Panels):** `#FFFFFF` surface with a crisp 1px hairline border (`#E2E8F0`) and subtle ambient depth:
  `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04);`
- **Level 2 (Hover States, Flyouts, Filter Bars):** Raised interactive containers:
  `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04);`
- **Level 3 (Dropdowns, Context Menus, Date Pickers):** Floating overlays:
  `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03);`
- **Level 4 (Modal Dialogs, Drawer Overlays):** Deep layered surfaces against a dimmed backdrop (`rgba(15, 23, 42, 0.45)`):
  `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.04);`

## Shapes

The design system maintains a refined balance between modern ergonomics and disciplined enterprise density through consistent corner radiuses.

- **Standard Containers & Cards:** Governed by `rounded-xl` (12px / `0.75rem`), providing clear definition to high-density content blocks without appearing overly playful.
- **Form Controls, Table Cells, and Action Buttons:** Utilize standard `rounded-lg` (8px / `0.5rem`) to maintain sharp interaction hitboxes and maximum internal text area.
- **Status Badges & Chips:** Render with full pill rounding (`9999px`) or compact `rounded-md` (6px) depending on operational priority.

## Components

### Buttons
- **Primary:** Solid `#0F172A` with `#FFFFFF` text. Hover transitions to `#1E293B`. Active state sets `#020617`. Focus ring displays 2px solid `#0D9488` with 2px offset.
- **Secondary / Accent:** Solid `#0D9488` with `#FFFFFF` text. Hover shifts to `#0F766E`.
- **Outline / Neutral:** `#FFFFFF` background with 1px hairline border in `#E2E8F0` and `#1E293B` text. Hover applies `#F1F5F9`.
- **Destructive:** Solid `#F43F5E` or outline with `#F43F5E` text and hover fill `#FFF1F2`.
- **Dimensions:** Compact 36px height (desktop) / 44px (touch/mobile) with horizontal padding of `12px`.

### Form Fields & Inputs
- **Base Style:** 36px control height, 1px border `#CBD5E1`, background `#FFFFFF`, font size 13px, border radius 8px (`rounded-lg`).
- **Focus State:** Hairline border switches to `#0D9488` with `box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15)`.
- **RTL Support:** Inline prefixes (currency symbols like SAR/USD, search icons) sit on the right, and input text starts from the right edge with proper optical padding.

### Data Tables (ERP Core)
- **Header:** Background `#F8FAFC`, uppercase label-sm typography, subtle border-bottom 1px `#CBD5E1`.
- **Rows:** Minimum height 40px (compact mode) or 48px (standard mode). Alternate rows receive `#FAFCFF` or clean white with 1px border-bottom `#E2E8F0`. Hover triggers background `#F1F5F9`. Selected row adds subtle `#0D9488` tint (`rgba(13, 148, 136, 0.05)`).
- **Alignment Rules:** Text content aligns right (in RTL) or left (in LTR). Financial metrics, quantities, and numeric totals always align to the opposite edge or use tabular right alignment with corresponding column headers matching the data orientation.

### Status Badges & Chips
- **Posted / Paid:** Border 1px `#A7F3D0`, background `#ECFDF5`, text `#065F46`.
- **Draft / Pending:** Border 1px `#FDE68A`, background `#FFFBEB`, text `#92400E`.
- **Overdue / Void:** Border 1px `#FECDD3`, background `#FFF1F2`, text `#9F1239`.
- **Badge Shape:** Compact height 22px, font-size 11px, weight 600, padding 2px 8px, `rounded-md`.

### Selection Controls (Checkboxes & Radios)
- **Unchecked:** 16x16px square (checkbox) or circle (radio), 1.5px border `#94A3B8`, background `#FFFFFF`.
- **Checked:** Background `#0D9488`, border `#0D9488`, white centered icon/dot.

### Cards & KPIs
- Encapsulated in 12px `rounded-xl` containers with `#FFFFFF` background, 1px border `#E2E8F0`, and Level 1 elevation.
- Financial metric cards highlight primary numerical totals in 22px bold tabular typography with trend badges positioned adjacent to the metric.