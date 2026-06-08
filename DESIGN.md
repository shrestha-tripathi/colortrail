# ColorTrail — Design System (Vercel-inspired)

**Working brand:** ColorTrail. All brand strings live in `src/site.config.ts`
(env-driven via `PUBLIC_SITE_*`). Never hardcode the brand name anywhere
in `src/`.

## Visual identity

This site uses a **Vercel-inspired design system** — restrained, near-monochrome,
shadow-as-border, Geist typography. The whole page is white (light) or near-black
(dark) with `#171717`-on-`#ffffff` text. Color is functional, never decorative.

- **Default theme: LIGHT** (user-preference saved in localStorage)
- **Toggle:** sun/moon button in nav
- **Reference template:** `creative/popular-web-designs/templates/vercel.md`

## Typography

**Family:** Geist Sans + Geist Mono via Google Fonts (loaded in `Layout.astro`).
**OpenType:** `liga` enabled globally on all Geist text.

### Hierarchy

| Role | Class / size | Weight | Letter-spacing |
|---|---|---|---|
| Display hero | `heading-display` 44-64px | 600 | -0.04em (~-2.5px at 60px) |
| Section heading | `heading-section` 32-40px | 600 | -0.035em |
| Card title | `heading-card` 20-24px | 600 | -0.025em |
| Body large | 18-20px | 400 | normal, line-height 1.6 |
| Body | 15-16px | 400 | normal, line-height 1.7 |
| Button / Link | 14px | 500 | normal |
| Eyebrow | `eyebrow` (Geist Mono) 12px | 500 | UPPERCASE, letter-spacing 0.04em |
| Caption | 12px | 400 | normal |

**Three-weight system:** 400 (read), 500 (interact), 600 (announce). No bold (700)
in body text. Hierarchy through size + tracking, not weight.

**Negative letter-spacing scales with size** — most aggressive at display,
relaxes as size decreases. Don't apply positive letter-spacing on Geist Sans.

## Color tokens (CSS variables, in `src/styles/global.css`)

### Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#ffffff` | `#0a0a0a` | Page background |
| `--color-bg-elevated` | `#fafafa` | `#131313` | Alt section bg, footer-strip |
| `--color-surface` | `#fafafa` | `#151515` | Card inset highlight |
| `--color-surface-strong` | `#f4f4f5` | `#1e1e1e` | Pressed/active state |

### Text

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-fg` | `#171717` | `#ededed` | Headings, primary text |
| `--color-fg-secondary` | `#4d4d4d` | `#a1a1a1` | Body, descriptions |
| `--color-muted` | `#666666` | `#888888` | Tertiary, eyebrow base |
| `--color-fg-subtle` | `#808080` | `#6d6d6d` | Placeholder, disabled, captions |

### Borders + functional

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-border` | `#ebebeb` | `#262626` | When `--shadow-ring` isn't usable |
| `--color-accent` | `#0072f5` | `#52a8ff` | Links in prose, focus |
| `--color-success` | `#0a7c3a` | `#45d176` | Positive table cells |
| `--color-error` | `#c2261e` | `#ff5c54` | Negative table cells, destructive |

### Badge tokens

| Token | Light | Dark |
|---|---|---|
| `--color-badge-bg` | `#ebf5ff` | `#0e2849` |
| `--color-badge-fg` | `#0068d6` | `#52a8ff` |

### Shadows (the signature)

| Token | Use |
|---|---|
| `--shadow-ring` | Shadow-as-border replacing CSS `border:` |
| `--shadow-ring-light` | Subtler ring (tabs, images) |
| `--shadow-elevation` | Subtle card lift |
| `--shadow-card` | Full multi-layer card stack (ring + elevation + inner highlight) |

## Component patterns

### Primary CTA (dark pill)
```html
<button class="rounded-md px-5 py-3 text-[14px] font-medium bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90">
```

### Secondary button (shadow-bordered)
```html
<button class="rounded-md px-5 py-3 text-[14px] font-medium" style="box-shadow: var(--shadow-ring);">
```

### Card (Vercel signature)
```html
<div class="rounded-md p-6" style="background-color: var(--color-bg); box-shadow: var(--shadow-card);">
```

### Pill badge
```html
<span class="px-3 py-1 rounded-pill text-[12px] font-medium font-mono uppercase tracking-wider"
      style="background-color: var(--color-badge-bg); color: var(--color-badge-fg);">
```

### Eyebrow / technical label
Use class `eyebrow` — Geist Mono, 12px, weight 500, UPPERCASE, letter-spacing 0.04em,
`--color-muted` text.

### Section divider
Use `style="box-shadow: inset 0 1px 0 var(--color-border);"` on the section element
(NOT `border-top`). This sticks to the shadow-as-border philosophy.

## Brand exception: VIBGYOR gradient

The product IS color — so the brand mark uses a **VIBGYOR rainbow gradient**.
This is the ONE intentional exception to the otherwise monochrome system.
Used only in:

1. **`<BrandIcon />`** component (nav, footer, hero card icon)
2. **`.btn-brand`** utility class — primary "Pick a color" CTA (gradient bg + animated shimmer + soft halo)
3. **`.text-brand-gradient`** utility class — single accent word in hero ("color")
4. **`.brand-halo`** — soft rainbow blur behind the hero CTA cluster
5. **`favicon.svg`** — VIBGYOR background with white eyedropper on top

Tokens in `global.css`:
- `--brand-gradient` — full 7-stop VIBGYOR linear gradient (135°)
- `--brand-gradient-soft` — same with 85% alpha for overlays

Stops (work on both light + dark):
```
#ff3d3d (red) → #ff8a3d (orange) → #ffd23d (yellow) → #3ddc84 (green)
→ #3da5ff (blue) → #7a5af8 (indigo) → #c450ff (violet)
```

Animations (8s loop, respects `prefers-reduced-motion`):
- `brand-shimmer` — gradient `background-position` sweeps left-right
- `brand-halo-pulse` — soft scale + opacity breathing under hero CTA

**Rule:** never use the brand gradient on body text, secondary buttons,
cards, borders, or anywhere outside the 5 surfaces listed above. The
restraint is what makes it land — one splash of color on a monochrome
canvas is the entire concept.

## Hard rules

1. **Use shadow-as-border instead of CSS `border:`** — `box-shadow: var(--shadow-ring)`
   replaces traditional borders everywhere except inputs and table dividers
   where `inset 0 -1px 0 var(--color-border)` is acceptable.

2. **Never use weight 700 (bold) on body text.** Three weights only: 400, 500, 600.
   Headings are 600; emphasized inline text is `font-medium` (500); body is 400.

3. **Never apply opacity modifiers (`/40`, `/80`) to color tokens.** They're
   already tuned per-theme. Use `color-mix(in srgb, X 25%, transparent)` for
   tinted backgrounds — never opacity-stacks on text tokens.

4. **All technical labels (counts, codes, eyebrows) use Geist Mono uppercase.**
   This is the "developer console" voice that ties the site to the product.

5. **Default theme is LIGHT.** The toggle is opt-in for dark.

6. **No decorative color.** No gradients, no purple/orange accents, no rainbow.
   The color picker output IS the only color on the page. Everything else is
   grayscale.

## Light + dark must both pass

After any visual change, manually verify both themes via the toggle:
1. `npm run dev`
2. Toggle theme via sun/moon button
3. Check: text legibility, button contrast, card visibility, focus rings
4. Mobile viewport (≤640px) verified for both themes

Verify contrast with DOM, not vision (per p2pds pitfall #38 — vision lies
about subtle contrast):
```js
const lum = (rgb) => { /* WCAG relative luminance */ };
const contrast = (fg, bg) => (Math.max(lum(fg), lum(bg)) + 0.05) /
                              (Math.min(lum(fg), lum(bg)) + 0.05);
// Target: ≥4.5:1 for body, ≥3:1 for large text (AA)
```

## Anti-patterns

- ❌ Hardcoding the brand name "ColorTrail" anywhere outside `site.config.ts`
- ❌ Creating `tailwind.config.js` (v4 ignores it; use `@theme`)
- ❌ Using `border-*` Tailwind utilities for cards / sections (use `--shadow-ring`)
- ❌ `font-bold` (700) on body text — max weight is `font-semibold` (600)
- ❌ Positive letter-spacing on display headings (always negative)
- ❌ **Brand gradient OUTSIDE the 5 sanctioned surfaces** (see brand exception above)
- ❌ Decorative gradients, accents, or color washes anywhere else
- ❌ Opacity modifiers on color tokens (`/40`, `/80`) — fails WCAG on light
- ❌ External color libraries (chroma.js, color.js) — we do the math
- ❌ Adding accounts, login, server-side anything — the moat is "fully local"
- ❌ Tracking pixels — privacy is part of the product

## When updating templates

Always reference the source Vercel template:
```
skill_view(name="popular-web-designs", file_path="templates/vercel.md")
```
