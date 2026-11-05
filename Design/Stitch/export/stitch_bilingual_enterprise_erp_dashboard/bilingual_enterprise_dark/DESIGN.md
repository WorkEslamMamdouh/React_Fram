---
name: Bilingual Enterprise Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bbcac6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#859490'
  outline-variant: '#3c4947'
  surface-tint: '#4fdbc8'
  primary: '#4fdbc8'
  on-primary: '#003731'
  primary-container: '#14b8a6'
  on-primary-container: '#00423b'
  inverse-primary: '#006b5f'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#16bb83'
  on-tertiary-container: '#00442c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#71f8e4'
  primary-fixed-dim: '#4fdbc8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005048'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  tabular-num:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers an executive-grade, operational control environment for mission-critical enterprise resource planning. Tailored for dual-locale (English LTR and Arabic RTL) corporate workflows, the interface balances high-density information architecture with visual calmness. 

The aesthetic is precision-engineered modernism: deep slate canvases eliminate optical fatigue across extended shift work, while crisp high-contrast semantic accents instantly communicate complex multi-currency ledger statuses, supply-chain bottlenecks, and operational thresholds. The experience evokes rigorous control, architectural permanence, and fluid bidirectional clarity.

## Colors

The palette is anchored by a structured scale of deep slate neutrals, complemented by functional luminous accents:

- **Canvas & Surface Architecture**:
  - Base Canvas: `#0b1120` (root backdrop, viewport margins)
  - Surface Tier 1 (Workspaces & Panels): `#0f172a`
  - Surface Tier 2 (Cards, Table Headers, Floating Containers): `#1e293b`
  - Surface Tier 3 (Hover States, Active Selections, Elevated Popovers): `#334155`
  - Subtle Borders & Separators: `#1e293b` with active structural divides at `#334155` (alpha variants used for micro-rulers)

- **Typography & Content Hierarchy**:
  - High-Contrast Primary Text: `#f8fafc`
  - Secondary / Metadata Text: `#94a3b8`
  - Tertiary / Muted Placeholder Text: `#64748b`

- **Interactive Accents**:
  - Primary Accent: Teal (`#14b8a6` primary interactive, `#0d9488` pressed/hover boundary)
  - Secondary Accent: Cyan (`#06b6d4` analytics, system metrics, inline highlights)

- **ERP Financial & Operational Semantic Tones**:
  - Settlement / Paid: Emerald (`#10b981` text/icon on `#064e3b` container base)
  - Pending / Reconciliation: Amber (`#f59e0b` text/icon on `#78350f` container base)
  - Overdue / Critical Alert: Rose (`#f43f5e` text/icon on `#881337` container base)

## Typography

The typography system operates on a dual-engine architecture:
- **Latin Typography & Numeric Engine**: Inter is configured with OpenType feature tags `tnum` (tabular numbers) and `cv05` enabled globally across financial ledgers, transactional lines, and metadata. Tabular numbers align precisely across columns regardless of locale.
- **Arabic Script Architecture**: When rendering Arabic (`dir="rtl"`), the system applies `Cairo` as the font family while retaining numeric alignment rules. Font weight values map identically (400 for Regular, 500 for Medium, 600 for Semi-bold), with line heights adjusted +2px to comfortably accommodate Arabic ascenders and descenders without clipping bounding boxes.
- **Scale Usage**: Headings remain restrained and compact; enterprise dashboards favor high data density over decorative scale.

## Layout & Spacing

The layout model uses a fluid, composite 12-column grid system optimized for widescreen enterprise monitors, scaling down dynamically across responsive breakpoints:
- **Desktop (>= 1280px)**: 12-column fluid grid, `1.5rem` outer canvas margin, `1rem` column gutters. Persistent collapsed or expanded navigation rail on inline-start (left in LTR, right in RTL).
- **Tablet (768px - 1279px)**: 8-column layout, `1rem` margins, collapsed modal side-drawer navigation.
- **Mobile (< 768px)**: 4-column layout, `1rem` margin, stacked single-column cards with horizontal scrolling for dense data tables.

Spacing follows an exacting 4px/8px modular rhythm designed for high-density transactional interfaces. Gaps between controls never exceed `1rem` inside data entry units to prevent excessive visual travel. Directional properties leverage CSS logical properties exclusively (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`) to guarantee symmetrical fidelity across English and Arabic interfaces.

## Elevation & Depth

Visual hierarchy is maintained via tonal stratification and razor-sharp border boundaries rather than heavy drop shadows:
- **Ground Tier (Canvas)**: `#0b1120` — absolute base canvas.
- **Tier 1 (Panels & Master Regions)**: `#0f172a` — outlined with a 1px border of `#1e293b`.
- **Tier 2 (Interactive Modules & Cards)**: `#1e293b` — framed with a 1px border of `#334155`.
- **Tier 3 (Modals, Context Menus & Popovers)**: `#1e293b` — elevated by a 1px perimeter highlight of `#475569` and an ultra-subtle directional shadow (`0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)`).
- **Focus Depth**: When inputs or table rows achieve active state, they emit a sharp 1px internal border in `#14b8a6` paired with an ambient teal glow (`0 0 0 1px #14b8a6, 0 0 12px rgba(20, 184, 166, 0.25)`).

## Shapes

The design system employs a rigorous, unified radius of `12px` (`0.75rem`) across all standard interactive elements, form fields, cards, and modal dialogs. Micro-elements such as status badges, indicator chips, and small table tags utilize a compact `6px` radius (`0.375rem`), while rounded avatars retain fully circular geometries.

This precise corner radius softens the dense technical layout without compromising the architectural, grid-aligned discipline expected in mission-critical software.

## Components

- **Buttons**:
  - *Primary*: Background `#14b8a6`, text `#0b1120`, font weight 600, 12px border radius. Hover: `#0d9488`. Active focus ring: 2px offset with `#14b8a6`.
  - *Secondary*: Surface `#1e293b`, text `#f8fafc`, 1px border `#334155`. Hover: `#334155` background and `#475569` border.
  - *Destructive*: Background `#881337`, text `#f43f5e`, 1px border `#f43f5e`.

- **Form Inputs & Search Fields**:
  - Surface `#0f172a`, 1px border `#334155`, text `#f8fafc`, placeholder `#64748b`. 
  - Height standard: 38px (compact enterprise density).
  - Focus state: border turns `#14b8a6` with ambient glow; labels dynamically align based on document orientation (`ltr` vs `rtl`).

- **Data Tables & Ledger Grids**:
  - Header Row: Background `#0f172a`, uppercase tracking on English labels, text `#94a3b8`, bottom border 1px `#334155`.
  - Row Surface: `#0f172a` alternating with `#0b1120` or solid `#0f172a` separated by 1px `#1e293b` borders.
  - Row Hover: Background shifts cleanly to `#1e293b`.
  - Tabular Cells: Digits set in tabular Inter (`tnum`), right-aligned for numeric currencies in LTR, left-aligned in RTL.

- **Status Badges & Chips**:
  - Rendered with 6px border radius, 11px semi-bold typography, and structured color pairings:
    - *Paid / Settled*: Background `rgba(16, 185, 129, 0.12)`, text `#10b981`, border `rgba(16, 185, 129, 0.3)`.
    - *Pending / Escrow*: Background `rgba(245, 158, 11, 0.12)`, text `#f59e0b`, border `rgba(245, 158, 11, 0.3)`.
    - *Overdue / Action Required*: Background `rgba(244, 63, 94, 0.12)`, text `#f43f5e`, border `rgba(244, 63, 94, 0.3)`.

- **Cards & Data Modules**:
  - Background `#0f172a`, 1px boundary `#1e293b`, 12px corner radius, internal padding `1.25rem`. KPI metrics display cyan `#06b6d4` trend vectors.

- **Checkboxes & Selection Controls**:
  - Custom square check containers (16px × 16px) with 4px border radius. Unchecked: 1px border `#334155`, background transparent. Checked: background `#14b8a6`, border `#14b8a6`, icon `#0b1120`.