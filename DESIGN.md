# Design System — TindaPOS

## Product Context
- **What this is:** Street vendor POS (Point of Sale) as a PWA for Android
- **Who it's for:** Filipino tindahan/palengke/food stall owners — non-tech-savvy, budget-conscious, sell in outdoor markets
- **Space/industry:** Micro-business retail PH — competes with Peddlr, Loyverse, GCash Negosyo
- **Project type:** Mobile-first Progressive Web App (PWA), offline-first

## Memorable Thing
> "This was made for me."

Every design decision serves this. It should feel Filipino, familiar, and like someone actually thought about vendors — not a generic app ported from Singapore.

## Key UX Principle
**Single-hand, thumb-first.** Filipino street vendors hold their phone in one hand while serving customers. Every primary action must be reachable by the right thumb on a 6" Android in direct outdoor sunlight. No competitor does this.

## Aesthetic Direction
- **Direction:** Utilitarian/Warm — function-first with warmth and personality
- **Decoration level:** Intentional — color carries personality, no decorative blobs or gradients
- **Mood:** Like a trusted tindero/tindera who takes their stall seriously. Opens clean and sharp every morning.
- **Competitive gap:** Every PH POS app uses blue/teal corporate styling. This one uses warm amber — visible in sunlight, feels like the market.

## Typography
- **UI labels / headings:** Plus Jakarta Sans — warm, slightly rounded, legible at any size, not overused in PH apps
- **Prices / totals / change:** DM Mono (tabular-nums) — prices stay perfectly aligned, instantly readable in any light
- **Loading:** Google Fonts CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  ```
- **Scale:**
  | Role | Size | Weight |
  |------|------|--------|
  | App name / hero | 24px | 800 |
  | Screen title | 18px | 800 |
  | Section heading | 15px | 700 |
  | Body | 14px | 400 |
  | Labels / buttons | 14px | 700 |
  | Small labels | 12px | 600 |
  | Micro / tags | 10–11px | 700 |
  | Price display | 22–32px DM Mono | 500 |

## Color
- **Approach:** Restrained — amber is rare and meaningful, not decorative everywhere

```css
:root {
  /* Primary */
  --amber:         #F59E0B;  /* Primary CTA, active states, accent */
  --amber-dark:    #D97706;  /* Hover, price text */
  --amber-light:   #FEF3C7;  /* Active item bg, amount highlight */

  /* Payment confirmed */
  --green:         #16A34A;  /* GCash QR button, success states */
  --green-light:   #DCFCE7;  /* Success alert bg */

  /* Neutrals */
  --bg:            #FAFAF7;  /* App background — warm off-white, not clinical */
  --surface:       #FFFFFF;  /* Cards, headers, nav */
  --surface-2:     #F5F5F0;  /* Secondary surfaces, summary boxes */
  --border:        #E7E5E4;  /* All borders */

  /* Text */
  --text:          #1C1917;  /* Primary text — warm near-black */
  --text-muted:    #78716C;  /* Secondary, descriptions */
  --text-faint:    #A8A29E;  /* Placeholders, inactive nav */

  /* Semantic */
  --error:         #EF4444;
  --error-light:   #FEF2F2;
  --warning:       #F59E0B;  /* same as amber */
  --info:          #3B82F6;
  --info-light:    #EFF6FF;
}
```

**Dark mode** — reduce surface brightness, keep amber slightly brighter (#FBBF24), keep green legible:
```css
[data-theme="dark"] {
  --bg:          #1C1917;
  --surface:     #292524;
  --surface-2:   #3D3835;
  --amber:       #FBBF24;
  --amber-dark:  #F59E0B;
  --amber-light: #2D2507;
  --green:       #22C55E;
  --green-light: #052E12;
  --text:        #FAFAF7;
  --text-muted:  #A8A29E;
  --text-faint:  #78716C;
  --border:      #3D3835;
}
```

### Token changes in the Oct 2026 UI refresh
Tokens now live in `src/index.css` as space-separated RGB channels (so Tailwind opacity modifiers work) and are exposed as Tailwind colors in `tailwind.config.js`. Brand hues are unchanged; contrast was fixed:
- **`on-amber` (#1C1917) is the text/icon color on amber fills** — white on #F59E0B is 2.1:1, near-black is 8.1:1 and reads in direct sunlight.
- **`amber-ink` (#B45309) is amber used as *text* on light surfaces** (5:1). Raw `amber` is for fills, rings and bars only.
- **`green` is #15803D in light mode** (white-on-green 5:1); `on-green` / `on-error` flip per theme.
- **`border-strong` for form-control edges** (>=3:1, WCAG 1.4.11); plain `border` stays for decorative dividers.
- `faint` / `error` darkened so every text pair is >=4.5:1 in both themes (verified numerically, see decisions log).
- Theme defaults to the OS preference when the vendor has not chosen one.

## Spacing
- **Base unit:** 8px
- **Min touch target:** 48px (outdoor use, thick fingers, one hand)
- **Scale:**
  | Token | Value |
  |-------|-------|
  | 2xs | 4px |
  | xs | 8px |
  | sm | 12px |
  | md | 16px |
  | lg | 24px |
  | xl | 32px |
  | 2xl | 48px |
  | 3xl | 64px |

## Layout
- **Approach:** Single-hand mobile-first
- **Primary nav:** Bottom navigation bar (4 tabs: Benta / Menu / Ulat / Setting). From 1024px up it becomes a left rail and Benta shows the order as an always-visible right-hand cart panel (no one-hand constraint on a desktop/landscape tablet). Below that, the cart is a floating bar above the nav.
- **Item catalog:** 2-column grid, large tiles (emoji/photo + name + price)
- **Sticky bottom bar:** Running total (DM Mono) + "Bayad na" CTA — always visible, never scrolls away
- **Breakpoints:** Mobile-only primary design. Tablet (≥768px) — 3-column item grid
- **Border radius:**
  | Element | Radius |
  |---------|--------|
  | Cards / items | 12px |
  | Buttons (pill) | 9999px |
  | Buttons (rect) | 14px |
  | Inputs | 8px |
  | Tags / pills | 100px |
  | Bottom nav | none |

## Motion
- **Approach:** Minimal-functional — only transitions that help comprehension
- **Add to cart:** Item card brief scale(0.97) + cart badge bounce
- **Charge button:** Pulse animation when total > ₱0
- **Success (Bayad na):** Green flash on sticky bar, brief checkmark
- **Transitions:** 150ms ease-out for state changes, 250ms for screen transitions
- **No:** Entrance animations, scroll-driven motion, decorative effects

## Language / Localization
- **Default:** Filipino (Tagalog) — "Bayad na", "Sukli", "Kabuuan", "I-add", "Burahin"
- **Toggle:** User can switch to English in Settings — "Checkout", "Change", "Total", "Add", "Delete"
- **Storage:** `localStorage('lang')` — persists across sessions
- **Rule:** Every UI string must have both Filipino and English variants. No hardcoded strings.

## Customization Features (per the design brief)

### App Branding
- Vendor can set a custom **business name** (shown in app header instead of "TindaPOS")
- Vendor can upload a custom **logo/icon** (replaces 🏪 emoji)
- Stored in `localStorage` or IndexedDB — no account needed

### Item Photos
- Each menu item supports an **optional custom photo** (vendor takes/uploads from phone)
- Photo stored as base64 in IndexedDB (offline-safe)
- Fallback: emoji (default, always works with zero setup)
- Image display: 1:1 square, object-fit: cover, rounded top corners of item card

### GCash QR Code
- Vendor uploads a **screenshot of their GCash QR** from the GCash app
- Stored as image in IndexedDB
- Displayed full-screen during payment — customer scans from vendor's phone
- No GCash API integration needed — zero merchant account complexity
- "Nabayaran na" button is manual confirmation by cashier (vendor trusts customer)

## Component Patterns

### Item Card
```
┌─────────────────┐
│ [Photo/Emoji]   │ ← 1:1 square, object-fit cover
│ Item Name    [+]│ ← + button top-right, 22px touch
│ ₱15.00          │ ← DM Mono amber-dark
└─────────────────┘
Active state: amber border + amber-light bg
```

### Sticky Bottom Bar
```
┌────────────────────────────────┐
│ Kabuuan          [Bayad na →] │
│ ₱145.00                        │
└────────────────────────────────┘
Height: 72px · always above bottom nav
```

### GCash QR Screen
- Full-screen modal over dark overlay
- Vendor QR image centered, large (240px)
- Amount shown above QR in amber box
- "Nabayaran na ✅" green button at bottom

## Anti-Patterns (never do these)
- No purple/violet gradients
- No corporate blue (that's Peddlr, that's GCash — not us)
- No Inter or Roboto as primary font
- No sidebar navigation (requires two hands)
- No modals requiring typing (keyboard covers bottom half of screen)
- No loading spinners longer than 300ms on offline-safe operations
- No features that require internet to function (core POS must work offline)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-09 | Amber #F59E0B as primary (not blue) | No PH competitor uses amber; visible in sunlight; warm like the market |
| 2026-06-09 | DM Mono for prices | Tabular-nums alignment; instant readability for cash amounts |
| 2026-06-09 | Plus Jakarta Sans (not Inter/Poppins) | Warm, rounded, legible — not overused in PH market |
| 2026-06-09 | Single-hand thumb-first layout | Vendors hold phone in one hand while serving customers |
| 2026-06-09 | Static GCash QR via screenshot upload | Zero API complexity; free; works for 90% of vendor use cases |
| 2026-06-09 | Taglish-first with English toggle | "This was made for me" — but non-Tagalog speakers still supported |
| 2026-06-09 | Custom item photos optional | Reduces friction; emoji fallback means zero-setup works day 1 |
| 2026-06-09 | Bottom nav (4 tabs) | Thumb-reachable; standard Android pattern vendors already know |
| 2026-10-24 | Near-black text on amber (`on-amber`) instead of white | White on amber fails WCAG (2.1:1); near-black is 8.1:1 and survives sunlight glare |
| 2026-10-24 | SVG line icons replace emoji UI chrome (`Icon.jsx`) | Consistent weight/size, themeable, screen-reader friendly. Item/category emoji stay: that is vendor content |
| 2026-10-24 | Sentence-case section titles; no tiny all-caps labels | Filipino words in tracked caps are hard to read outdoors and read as template scaffolding |
| 2026-10-24 | Shared `Sheet` (portal, focus trap, Esc, `inert` background) for every modal | One accessible implementation instead of six hand-rolled overlays |
| 2026-10-24 | Money fields are text + `inputMode="decimal"` with sanitizing, not `type=number` | `type=number` accepts "e"/"-" and changes value on scroll; a negative discount used to raise the total |
| 2026-10-24 | Cart persisted in localStorage; payment method + discount live in the store | A refresh, Android process kill or SW update must not lose a sale in progress |
| 2026-10-24 | Pinch-zoom re-enabled (removed `maximum-scale`/`user-scalable=no`) | WCAG 1.4.4; vendors with low vision need it |
| 2026-10-24 | Plus Jakarta Sans + DM Mono kept despite the "overused font" detector warning | Brand decision recorded 2026-06-09; revisit only with the owner's approval |
