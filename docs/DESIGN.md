# Design System — Secure Your Git

Extracted from three reference screenshots of a public plugin-directory page
(listing header, long-form description with a ratings sidebar, FAQ accordion +
footer). We match the **style** only. The reference's product branding (its
magenta logo tile, hero illustration, logos, copy) is deliberately **not** used.

The screenshots are retina captures (3456 px wide → 1728 CSS px). All values
below are in CSS px, estimated by measuring the captures and rounding to a
sensible scale.

## Overall feel

Editorial, airy and flat. A charcoal chrome sits around a white reading
surface, with a single saturated blue accent. Content leads, and there are
almost no shadows. Hierarchy comes from whitespace, hairline borders and type
weight rather than from color blocks. It is developer-friendly and trustworthy,
not "marketing-glossy".

## Color palette

| Token | Light | Dark (derived) | Source / use |
|---|---|---|---|
| `chrome` | `#1E1E1E` | `#101214` | Global header, footer |
| `chrome-2` | `#2C3338` | `#1A1D20` | Sub-header bar, chrome hover |
| `chrome-deep` | `#141414` | `#0B0C0D` | Bottom-most footer band |
| `chrome-fg` | `#FFFFFF` | `#F0F0F1` | Text on chrome |
| `chrome-muted` | `#A7AAAD` | `#8C8F94` | Trademark line, secondary chrome text |
| `bg` | `#FFFFFF` | `#16181A` | Page background |
| `surface` | `#F6F7F7` | `#1F2225` | Search input fill, code/editor surface, tracks |
| `surface-2` | `#F0F0F1` | `#272B2F` | Bar tracks, hovered rows |
| `border` | `#DCDCDE` | `#3A3F44` | Hairlines between rows, tab outline |
| `border-strong` | `#C3C4C7` | `#50575E` | Input focus-adjacent outline |
| `fg` | `#1E1E1E` | `#F0F0F1` | Primary text |
| `fg-muted` | `#50575E` | `#A7AAAD` | Secondary text, meta labels |
| `primary` | `#3858E9` | `#7B90FF` | Primary buttons, links, focus ring |
| `primary-hover` | `#2145E6` | `#9AABFF` | Button / link hover |
| `primary-fg` | `#FFFFFF` | `#0B0C0D` | Text on primary |
| `accent` | `#D9714F` | `#E8876A` | Rating stars & bars, used for **high** severity |
| `success` | `#008A20` | `#4AB866` | Text/icon |
| `success-subtle` | `#B8E6BF` | `#1B3B24` | "Issues resolved" bar → grade A / pass bg |
| `warning` | `#996800` | `#F0C33C` | Medium severity text |
| `warning-subtle` | `#FCF0C3` | `#3D3214` | Medium severity bg |
| `danger` | `#CC1818` | `#F86368` | Critical severity text, errors |
| `danger-subtle` | `#FACFD2` | `#3F1D1F` | Critical severity bg |
| `info` | `#3858E9` | `#7B90FF` | Low severity text |
| `info-subtle` | `#E5E9FD` | `#1E2546` | Low severity bg |

Severity mapping: **critical** = danger, **high** = accent (the reference's
rust/orange bar color), **medium** = warning, **low** = info.

## Typography

- **Sans:** Inter (variable), self-hosted via `@fontsource-variable/inter`.
  The reference uses a neutral grotesque that Inter matches closely.
- **Mono:** JetBrains Mono, self-hosted via `@fontsource/jetbrains-mono`.
- No Google Fonts CDN is used. That keeps the CSP at `font-src 'self'`.

| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Display / product title (H1) | 32 / 40 | 400 | -0.01em |
| Section heading (H2) | 28 / 36 | 600 | -0.01em |
| Sub-heading (H3) | 20 / 28 | 600 | 0 |
| Emphasis heading (uppercase lead) | 18 / 24 | 600 | 0, uppercase |
| Body | 16 / 30 | 400 | 0 (very airy, about 1.875) |
| Nav / UI | 16 / 24 | 400 | 0 |
| Small / meta | 14 / 22 | 400 | 0 |
| Label / badge | 12 / 16 | 600 | 0.02em |
| Code | 14 / 22 | 400 | 0 |

Links are primary blue and **underlined** by default (reference behavior). Nav
links on chrome are not underlined.

## Spacing, radius, borders, shadows

- Spacing scale: 4-based (4, 8, 12, 16, 24, 32, 40, 48, 64, 80). Sections are
  separated by 48–64 px. List rows have 24 px vertical padding.
- Radius: `sm` 2 px (buttons, inputs, badges, the reference's sharp-cornered
  button), `md` 4 px (code blocks, cards), `lg` 12 px (large icon tiles).
- Borders: 1 px solid `border` hairlines. They separate FAQ rows, sidebar
  meta rows and the tab bar.
- Shadows: none in the content area. The only exception is a subtle focus
  ring, `0 0 0 2px primary`.

## Layout

- Max content width **1160 px**, centered, 24 px gutter (16 px ≤ 640 px).
- Global header: 72 px tall, chrome background, logo mark + nav left,
  search/icon + primary CTA right.
- Sub-header: 64 px, same chrome with a 1 px `chrome-2` divider. It holds a
  section title left and secondary links right. On scroll it becomes a compact
  breadcrumb bar ("Section • Page").
- Main detail page: a **two-column grid**. The main column is about 760 px and
  the sidebar is about 340 px, with a 64 px gap. The sidebar holds a
  meta table (label left, value right, hairline rows), stats bars and links.
- Hero: full-width banner image block, then a title row (icon tile + H1 +
  byline, primary button right-aligned).
- Tabs: a row of text tabs over a bottom hairline. The active tab has a 1 px
  border on top/left/right and a bg-colored bottom that "opens" into the
  content.
- Accordion (FAQ): full-width rows, link-styled question, chevron right,
  hairline between rows.
- Footer: chrome background, 5 equal link columns, then a wordmark row with
  the trademark notice on the left and social icons on the right, then a
  deeper band with a short centered motto in spaced capitals.

## Components

- **Button / primary:** `primary` bg, white text, 16 px/500, 10×16 px
  padding, `sm` radius, no shadow, darkens on hover.
- **Button / secondary:** white bg, `primary` text, 1 px `primary` border.
- **Button / ghost:** transparent, `fg` text, `surface-2` bg on hover. On
  chrome it uses `chrome-fg` text.
- **Input / search:** `surface` fill, **no border**, `sm` radius, 48 px tall,
  trailing icon. Focus: 2 px `primary` ring.
- **Badge / tag:** small `sm`-radius pill, `*-subtle` background, strong text
  color, 12 px/600. Derived from the "46 out of 69" filled stat bar.
- **Stat bar:** label left, 24 px tall track (`surface-2`) with an `accent`
  fill, count right. Used for severity counts.
- **Tabs:** as described in Layout.
- **Code block:** `surface` bg, `md` radius, 16 px padding, mono 14/22,
  horizontal scroll.
- **Meta table / list rows:** label/value rows with hairline separators, 14 px
  vertical padding.
- **Cards:** in the reference, "cards" are just sections divided by
  hairlines. We do the same and add a `border` outline only where a component
  needs containment (the editor, a finding row).

## Light / dark mode

The reference only shows light mode. Dark mode keeps the same structure. The
reading surface becomes near-black charcoal (`#16181A`) and surfaces step up in
lightness. Text inverts to `#F0F0F1`. The primary blue is lifted to `#7B90FF`
for AA contrast on dark. The chrome gets darker than the page so the header
and footer still read as a frame. The mode follows `prefers-color-scheme`, with
a manual toggle persisted in `localStorage`.

## Implementation

- Tokens live as CSS custom properties (RGB channels) in
  `frontend/src/styles/tokens.css`. `:root` holds light values and `.dark`
  holds dark values.
- `frontend/tailwind.config.ts` maps every token to Tailwind color, font,
  size, radius and spacing names. Components use **only** these names, never
  hex values or arbitrary `[...]` values.
- Icons come from Lucide (`lucide-react`). No brand icons.

## Intentional differences from the reference

Reviewed after Phase 2. Each item is a deliberate departure, and the reason is given.

| Reference pattern | Our UI | Why |
|---|---|---|
| Full-width hero banner image above the title row | No banner. Icon tile + H1 row only | On the scanner, the editor *is* the hero. A banner would push the tool below the fold, and we have no product imagery to show. |
| Content sections are almost never contained | The editor and code blocks have a border and a surface fill | An editable area needs a clear boundary and a visible focus ring. Code needs a distinct surface to read as code. |
| Color used sparingly: one blue plus the rust rating bars | Severity colors (red/orange/amber/blue) on badges, bars, editor highlights and gutter dots | Severity is the main thing a scanner communicates. Color stays confined to those indicators, body text stays neutral, and every color is paired with a text label (badge text, "Vulnerable"/"Fixed" captions) for color-blind users. |
| Rating bars all share one accent color | Each severity bar uses its own color | The bars mean different things, not the same metric at different levels. |
| Tabs switch between content panels | Rule pages use the tab styling for **in-page anchor links**. Every section is always rendered | Keeping everything in the pre-rendered HTML is better for SEO, Ctrl-F and screen readers. "Overview" is shown as the active tab and does not track scroll position. |
| No good/bad markers on code | Vulnerable and fixed examples have red/green left borders and labels | Readers must tell the two examples apart at a glance. |
| Header: search field and a primary CTA button | Theme toggle instead; no search or CTA | The scanner itself is the CTA, and five rules don't need search. Dark mode is our addition. |
| Sub-header: account links (submit, favorites, log in) | Breadcrumbs plus "How it works" | There are no accounts. The sub-header becomes the breadcrumb bar on every page. |
| Footer: 5 link columns, social icons, motto band | 4 columns, no social icons, our own motto | We have no social accounts yet and don't copy the reference's text. |
| Only primary buttons shown | Secondary (outlined) and ghost buttons derived from it | The scanner needs several lower-priority actions next to one primary one. |
| Desktop-only screenshots | Mobile layout: collapsible nav menu, stacked title rows, single column | Required down to 375 px. Long identifiers wrap instead of widening the page. |
| Light mode only | Full dark mode | Derived as described above. |
