---
name: Liquid Glass Finance
colors:
  surface: '#fcf8fb'
  surface-dim: '#dcd9dc'
  surface-bright: '#fcf8fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#414755'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#006e28'
  on-secondary: '#ffffff'
  secondary-container: '#6ffb85'
  on-secondary-container: '#00732a'
  tertiary: '#bc000a'
  on-tertiary: '#ffffff'
  tertiary-container: '#e2241f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#72fe88'
  secondary-fixed-dim: '#53e16f'
  on-secondary-fixed: '#002107'
  on-secondary-fixed-variant: '#00531c'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#930005'
  background: '#fcf8fb'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  large-title:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: 0.37px
  title-1:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: 0.36px
  title-2:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.26px
  title-3:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 25px
    letterSpacing: -0.45px
  headline:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.43px
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.43px
  callout:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 21px
    letterSpacing: -0.32px
  subhead:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.24px
  footnote:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.08px
  caption-1:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0px
  caption-2:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 13px
    letterSpacing: 0.07px
  currency-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.5px
  currency-card:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.3px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies an ultra-refined iOS aesthetic, blending Apple’s Human Interface Guidelines with an organic "Liquid Glass" physical material metaphor. Tailored for personal financial clarity and poise, the UI rejects harsh flat minimalism and overly dense skeuomorphism in favor of refractive, tactile glass surfaces resting above luminous ambient fields.

The experience evokes calm assurance, executive control, and pristine order. The ambient background features dynamic, slow-shifting atmospheric chromatic orbs (soft sky cyan, subtle lavender, and warm champagne amber) filtered through high-viscosity frosted glass sheets. Surfaces possess physical presence: directional specular edge catch-lights, calibrated light diffusion, and fluid spring animations.

## Colors

The palette is tuned around native Apple iOS color profiles and financial semantics:

- **Primary (`#007AFF`)**: iOS System Blue. Anchors structural call-to-actions, active navigation highlights, primary interaction indicators, and focused segmented tabs.
- **Income / Pemasukan (`#34C759`)**: Emerald Green. Signifies incoming cash flow, positive balances, investments, and completed yield. Paired with a 12% alpha tinted emerald fill on glass badges.
- **Expense / Pengeluaran (`#FF3B30`)**: Coral Red. Represents bill debits, transaction outflows, and over-budget notices. Paired with a 12% alpha tinted coral fill on glass badges.
- **Transfer / Savings (`#5856D6`)**: Royal Indigo. Designated for vault reserves, inter-account transfers, and goal allocations.
- **Neutrals**:
  - Primary Label: `#1C1C1E` (High contrast, 100% opacity)
  - Secondary Label: `#3A3A3C` (Subordinate data, 80% opacity)
  - Tertiary / Muted: `#8E8E93` (Placeholders, inactive tabs, captions)
  - Ambient Canvas Start: `#F4F5FA`
  - Ambient Canvas End: `#E8ECF8`
  - Glass Base Fill: `rgba(255, 255, 255, 0.65)` (Primary card), `rgba(255, 255, 255, 0.82)` (Floating navigation/sheets)

## Typography

Typography prioritizes pristine proportional metrics and immediate monetary readability. Plus Jakarta Sans provides clean geometric clarity with subtle rounded terminal nuances that mimic Apple’s humanist SF Pro and SF Pro Rounded traits.

- **Monetary & Numeric Data**: All financial values, amounts, counters, and dates must use tabular numbers (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`) to guarantee column alignment without horizontal jitter.
- **Currency Styling**: Indonesian Rupiah expressions follow standard bank notations strictly: `Rp1.250.000` (no space between `Rp` and value, period as thousands delimiter, comma for fractional sen if required). In large balance banners, style `Rp` with medium weight at 70% font size relative to the integer amount.

## Layout & Spacing

The layout operates on a strict 8pt base grid with a 4pt sub-grid for optical centering:

- **Mobile Viewport Structure**: Outer canvas margins sit at `20px` (`1.25rem`) on modern iOS devices, respecting native Safe Area Insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).
- **Vertical Stack Cadence**:
  - Micro gap between headers and sub-labels: `4px` (`space-xs`).
  - Item-to-item spacing within grouped glass lists: `8px` (`space-sm`).
  - Padding within primary glass containers: `20px` to `24px`.
  - Section-to-section separation: `24px` (`space-lg`) to `32px` (`space-xl`).
- **Floating Overlays**: Bottom navigation and interactive floating action buttons maintain a `16px` lateral margin from the edge and float `12px` above the home indicator safe margin.

## Elevation & Depth

Elevation is achieved through material refraction, layered translucent blurs, and directional top rim specular lighting rather than standard dark dropshadows.

1. **Backdrop Blur Tiers**:
   - Primary Glass Cards: `backdrop-filter: blur(24px) saturate(180%)`, background `rgba(255, 255, 255, 0.65)`.
   - Floating Modals & Bottom Navigation Bar: `backdrop-filter: blur(32px) saturate(200%)`, background `rgba(255, 255, 255, 0.82)`.
   - Embedded Inputs & Sub-chips: `backdrop-filter: blur(16px)`, background `rgba(255, 255, 255, 0.40)`.
2. **Specular Top Edge Glow (Refraction Line)**:
   - Outer rim: `1px solid rgba(255, 255, 255, 0.70)`.
   - Top internal light shelf: `box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.85)`.
3. **Ambient Shadows**:
   - Ultra-diffuse, low opacity: `box-shadow: 0 12px 32px -4px rgba(27, 39, 87, 0.06), 0 4px 12px -2px rgba(27, 39, 87, 0.03)`.
   - Floating Center Button: Tinted ambient glow `box-shadow: 0 8px 24px 0 rgba(0, 122, 255, 0.35)`.

## Shapes

The interface embraces Apple’s continuous corner curvature (squircle / continuous squircle geometry):

- **Cards & Primary Modules**: Corner radius of `24px` to `28px`.
- **Modals, Bottom Sheets & Major Containers**: Corner radius of `32px` top edges.
- **Interactive Controls, Tags & Navigation Capsules**: Pill-shaped (`border-radius: 9999px`) for segmented tabs, transaction badges, input pills, and the floating bottom bar.
- **Glass Keypad Buttons**: Pure circular buttons (`aspect-ratio: 1/1`) or full pill structures.

## Components

### Glass Cards (Cards)

- Translucent backdrop with `blur(24px)`, `border: 1px solid rgba(255, 255, 255, 0.6)`.
- Internal padding of `20px`. Top-right badge slot reserved for account network or category tag.
- Subtle inner gradient: `linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%)`.

### Floating Bottom Navigation Bar (Tab Bar)

- Persistent floating capsule hovering `12px` above bottom safe area, width spanning `calc(100% - 32px)`.
- Features 5 discrete slots:
  1. **Beranda** (Home icon + label)
  2. **Transaksi** (List/Receipt icon + label)
  3. **(+) Floating Glass Action Button** (Elevated `52px` circle with `#007AFF` gradient, white glyph, luminous aura)
  4. **Dompet** (Wallet icon + label)
  5. **Laporan** (Analytics chart icon + label)
- Active icon states render in `#007AFF`; inactive icons render in `#8E8E93`.

### Buttons & Pills

- **Primary Action**: Pill radius (`9999px`), solid `#007AFF` or tinted glass with `1px` white hairline stroke.
- **Segmented Control**: Pill-shaped glass container holding a sliding pure-white capsule tab with `box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08)`.

### Transaction Lists

- Grouped inset style with frosted background cells. Separators span between rows with an inset margin of `16px` matching content text indent.
- Left slot: `44px` squircle or circle with colored tinted fill (`12%` alpha) matching category (e.g. food, transfer, income).
- Center slot: Merchant/Recipient bold title stacked over subhead category and timestamp.
- Right slot: Tabular monetary figure with `+Rp...` in `#34C759` for income or `-Rp...` in `#1C1C1E` for expenses.

### Numeric Glass Keypad

- Used for fast expense entry. Grid of 3x4 circular glass buttons (`72px` diameter) with `blur(20px)`, active touch depression lowering surface opacity to `0.4`.
- Large numbers in `28px` semi-bold, with alphabetic sub-characters below in `10px` gray.

### Form Inputs & Chips

- Input fields use pill-shaped capsule forms with `rgba(255, 255, 255, 0.5)` background and inset shadow.
- Chips use `12px` vertical padding, `16px` horizontal, displaying small icons and currency limits.
