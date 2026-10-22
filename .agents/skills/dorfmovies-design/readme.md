# DorfMovies design system: Spatial Glass

DorfMovies is a personal movie and TV tracker (Next.js 16, Supabase, TMDB). You log what
you watched, rate it, keep a watchlist, follow episode progress and browse stats. The
product is dark only and led by artwork.

The visual language is Spatial Glass. Translucent glass panels float over a heavily
blurred backdrop of the title the page is about. Type is Inter, the canvas is a cool
blue-black, and there is one aqua accent. It replaced the Autumn Pine look (warm brown,
pine green, Outfit) in October 2026. Autumn Pine material is archived in
`explorations/autumn-pine/`; don't use it.

Sources of truth, in order:

1. `docs/designs/spatial-glass/reference/home.html`, the approved mock. Open it in a
   browser; images are in `reference/assets/`. If anything here disagrees with it, the
   reference wins.
2. `docs/superpowers/specs/2026-10-22-spatial-glass-redesign.md`, the spec. Section 5.5
   has the recipe for every component and 5.6 the direction for every route.
3. The token files in `tokens/` for exact values, and `components/ui/` for the real
   components.

## Where things live

- `tokens/*.css` here is where tokens are authored. Each file is copied byte for byte to
  `app/styles/design-system/tokens/`, and
  `app/styles/design-system/__tests__/designSystemSync.test.ts` fails if a copy differs.
  Edit here, then copy (commands in `app/styles/design-system/README.md`).
- `app/globals.css` imports the token files one by one: colors, typography, spacing,
  effects, textures, keyframes. It does not import `styles.css`, because `styles.css`
  also pulls in `fonts.css` and its Google Fonts `@import`, and the app already gets
  Inter from `next/font` (exposed as `--font-inter`). A new token file has to be added to
  both `styles.css` and `app/globals.css`.
- `styles.css` and `glass.css` here are for static HTML only: the guideline cards and
  throwaway prototypes. `styles.css` loads every token file plus Inter from Google Fonts.
  `glass.css` copies the glass tier classes, the body rule, the focus ring and the
  ambient layer from the app so HTML renders the same. No test compares `glass.css` with
  `app/globals.css`, so change both together.
- The glass tiers and other component classes (`.glass-*`, `.card-surface`, `.btn-*`,
  `.nav-item`, `.input-field`, `.poster-card*`, `.clear-filters`, `.tabular`) are in
  `app/globals.css`. Tailwind v4's `@theme inline` block there bridges the `zinc`,
  `green`, `teal`, `amber` and `rust` ramps into Tailwind utilities, and maps
  `--color-white` to `--zinc-100`, so `bg-white/5` is `--glass-card` and
  `border-white/10` is `--border-soft`.
- Components are in `components/ui/` (one file each), plus `components/RatingStars.tsx`
  and `components/AmbientBackdrop.tsx`. Each `components/<group>/*.prompt.md` in this
  skill is the recipe for one or two of them.

## Principles

1. Content is the colour. The page tint comes from the featured title's backdrop,
   blurred 80px. The UI has almost no colour of its own.
2. Glass is layered. Blur only the top-level containers (tier 1). Everything inside them
   is a flat translucent fill (tier 2).
3. Light edges, deep shadows. Every glass container gets a 1px top highlight, a gradient
   rim and a long soft shadow. Never a hard border.
4. One accent. Aqua `#8FE3F0` marks progress, "next", current state and focus. Gold
   `#F2C46D` is for star ratings and nothing else. Destructive text is `--danger`
   `#FF9B9B`. Nothing else is coloured.
5. Quiet chrome, big art. Radius 28 for containers and 14 for rows and controls, 24px
   gutters, white or translucent-white text.
6. Tabular numbers. Every count, date, runtime and stat uses
   `font-variant-numeric: tabular-nums` (the `.tabular` class or the `tabular-nums`
   utility).

## Glass tiers

| Class | Tier | Use | Recipe |
| --- | --- | --- | --- |
| `.glass-panel` | 1, blurred | sidebar, section panels, mobile bars, modals, popovers, toasts | `--glass-panel`, `blur(var(--glass-blur)) saturate(var(--glass-saturate))` (40px, 160%), `--shadow-md`, radius 28 (24 under 760px) |
| `.glass-slab` | 1, blurred | text over artwork, the hero content slab | `--glass-slab` (darker base), same blur at 150% saturation, `--shadow-slab`, radius 22 |
| `.glass-row` | 2, flat | rows and cards inside a panel | `--glass-card`, hover `--glass-card-hover`, `--glass-row-edge`, radius 20 |
| `.glass-inset` | 2, flat | search, text inputs, the segmented track | `--glass-input`, `--shadow-well`, radius 14 |
| `.glass-btn` | 2, flat | secondary buttons, chips, icon buttons | `--btn-ghost-bg`, hover `--btn-ghost-bg-hover`, `--glass-btn-edge` |
| `.glass-rim` | edge | add to a tier-1 or tier-2 container | a masked `::before` painting `--glass-rim` as a 1px gradient edge; follows the element's radius |
| `.glass-card` | 2, legacy | older call sites | `.glass-row` with radius 16 |
| `.card-surface` | no blur | a standalone card that may repeat per item | the panel gradient and shadow without the blur, radius 28 |

In React, use `Card` from `components/ui/Card.tsx` rather than the classes:
`variant="panel"` is `glass-panel glass-rim p-5`, `slab` is `glass-slab glass-rim p-7`,
`row` is `glass-row p-3`, `inset` is `glass-inset p-4`, and the default `surface` is
`card-surface`.

Fallbacks are built into the classes. Without `backdrop-filter` support, and under
`prefers-reduced-transparency: reduce`, tier 1 switches to the opaque `--glass-fallback`
(reduced transparency also hides the ambient art). Under `forced-colors: active` every
tier draws a `1px solid CanvasText` border.

### Performance budget

These are hard rules. Blur is the most expensive thing in this design, and phones pay
for it first.

- `backdrop-filter` goes on tier-1 elements only, and no more than 8 may be visible in
  one viewport.
- Never on an element inside a poster grid, a rail, a virtualised list or any long
  list. Those use tier-2 fills or `card-surface`. `Card variant="panel"` and `"slab"`
  are never rendered per item.
- Never animate `backdrop-filter` or `filter`. Animate `opacity` and `transform` only.
- No `background-attachment: fixed` and no body background pinned to the viewport. The
  ambient art is one fixed element (next section).
- To soften blur on one element, set the variable (`[--glass-blur:24px]`, as the mobile
  bars do) rather than writing a new `backdrop-filter`.

## Ambient backdrop

`AmbientHost` (in `components/AmbientBackdrop.tsx`) is mounted once in `app/layout.tsx`
and paints the only ambient layer: the featured backdrop blurred `--ambient-blur` (80px)
and saturated `--ambient-saturate` (1.3), scaled 1.15, under `--ambient-tint`. With no
art it shows `--ambient-radial` over the canvas.

A page picks its art by rendering the default export, `<AmbientBackdrop src={url} />`.
It renders nothing. It registers the image while mounted, and the newest page
registration wins. `RecentAmbient` in `app/(app)/layout.tsx` registers the latest watch
as the fallback with `<AmbientBackdrop src={url} fallback />`. Art changes crossfade
over 400ms (opacity only, none under reduced motion). Never paint a second ambient layer
of your own.

Backdrop and logo URLs come from `fetchMediaArt(supabase, mediaIds)` in
`lib/mediaArt.ts`, which returns a `Map<string, { backdrop_url, logo_url }>`. Don't add
`backdrop_url` or `logo_url` to a page's main select. Until migration 014 is applied,
PostgREST rejects a select that names a missing column, and the whole page query fails.

Some backdrops are very light (The Bear, Bugonia). Secondary text must stay at 4.5:1 or
better over them, so check new surfaces against the lightest art in the library.

## Tokens

Names and values from `tokens/`. White alpha values are written in the token files and
nowhere else. App `.ts` and `.tsx` files must not contain `rgba(255,255,255,…)` or
palette hex literals (`app/__tests__/palette.test.ts` fails on them), so use the token.
Gradient tokens go through `background`, never `bg-[var(--x)]`: Tailwind emits that as
`background-color`, where a gradient is invalid.

### Canvas and surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--bg-void`, `--surface-page` | `#061015` | canvas, `themeColor`, end of the ambient tint |
| `--bg-deep` | `#0B1A21` | solid surface behind artwork |
| `--bg-base`, `--surface-shell` | `rgba(9, 20, 27, 0.46)` | glass tint under the shell and panels |
| `--bg-raised` | `rgba(255, 255, 255, 0.05)` | rows and cards inside panels |
| `--bg-bar` | `rgba(255, 255, 255, 0.09)` | bars, chips, row hover |
| `--bg-elevated`, `--glass-modal` | `linear-gradient(180deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.04)), rgba(9, 20, 27, 0.72)` | modals, popovers |
| `--surface-modal` | `rgba(9, 20, 27, 0.72)` | flat, for `bg-[var(--surface-modal)]` call sites |
| `--surface-card` | `var(--glass-card)` | |
| `--surface-input` | `var(--glass-input)` | |
| `--scrim` | `rgba(3, 9, 12, 0.62)` | behind modals and drawers |
| `--black`, `--white` | `#000000`, `#ffffff` | |

### Glass

| Token | Value | Use |
| --- | --- | --- |
| `--glass-panel` | `linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03)), rgba(9, 20, 27, 0.46)` | `.glass-panel` |
| `--glass-slab` | `radial-gradient(120% 70% at 0% 0%, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0) 60%), linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)), rgba(6, 15, 21, 0.66)` | `.glass-slab` |
| `--glass-hero` | `linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)), rgba(9, 20, 27, 0.34)` | hero frame |
| `--glass-card` | `rgba(255, 255, 255, 0.05)` | `.glass-row` |
| `--glass-card-hover` | `rgba(255, 255, 255, 0.09)` | `.glass-row:hover` |
| `--glass-input` | `rgba(0, 0, 0, 0.24)` | `.glass-inset` |
| `--glass-chip` | `rgba(255, 255, 255, 0.10)` | `Badge` |
| `--glass-inset-card` | `rgba(255, 255, 255, 0.06)` | a card inside a slab or row (next episode) |
| `--glass-badge` | `rgba(6, 15, 21, 0.62)` | `PosterBadge`, a badge over a poster |
| `--glass-fallback` | `rgba(12, 24, 31, 0.94)` | tier 1 with no blur or reduced transparency |
| `--glass-rim` | `linear-gradient(160deg, rgba(255, 255, 255, 0.40), rgba(255, 255, 255, 0.10) 28%, rgba(255, 255, 255, 0.04) 62%, rgba(255, 255, 255, 0.16))` | `.glass-rim` |
| `--glass-blur` | `40px` | tier-1 blur |
| `--glass-saturate` | `160%` | tier-1 saturation (150% on the slab) |
| `--ambient-blur` | `80px` | ambient art |
| `--ambient-saturate` | `1.3` | ambient art |
| `--ambient-tint` | `linear-gradient(180deg, rgba(4, 12, 17, 0.50) 0%, rgba(4, 12, 17, 0.62) 55%, rgba(5, 13, 18, 0.84) 100%)` | over the ambient art |
| `--ambient-radial` | `radial-gradient(1200px 600px at 20% -10%, rgba(143, 227, 240, 0.10), transparent 60%)` | the no-art state |

### Interaction fills and charts

| Token | Value | Use |
| --- | --- | --- |
| `--glass-fill-hover` | `rgba(255, 255, 255, 0.08)` | ghost, nav and link hover; kbd |
| `--glass-fill-selected` | `rgba(255, 255, 255, 0.12)` | keyboard-highlighted result, header pill |
| `--glass-fill-active` | `rgba(255, 255, 255, 0.15)` | active nav item, selected segment |
| `--skeleton-bg` | `rgba(255, 255, 255, 0.06)` | skeleton block |
| `--skeleton-shimmer` | `rgba(255, 255, 255, 0.10)` | skeleton shimmer |
| `--progress-track` | `rgba(255, 255, 255, 0.16)` | ring track, unwatched segments |
| `--chart-bar` | `rgba(255, 255, 255, 0.26)` | bars (the current or peak bar is `--accent`) |
| `--chart-line` | `rgba(255, 255, 255, 0.60)` | dashed average |
| `--chart-baseline` | `rgba(255, 255, 255, 0.14)` | x axis |
| `--chart-grid` | `rgba(255, 255, 255, 0.08)` | gridlines |
| `--chart-axis` | `rgba(236, 245, 249, 0.70)` | axis labels, 12px |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `--text-primary` | `var(--zinc-100)`, `#F3F8FA` | headings, primary labels |
| `--text-strong` | `rgba(236, 245, 249, 0.86)` | emphasised meta, kbd |
| `--text-secondary` | `rgba(236, 245, 249, 0.80)` | body and meta |
| `--text-muted` | `rgba(236, 245, 249, 0.74)` | captions, timestamps, eyebrows |
| `--text-faint` | `rgba(236, 245, 249, 0.66)` | placeholders only |
| `--ink`, `--text-inverse` | `#08161C` | text on the white primary button and the logo mark |

Neutral ramp (`--zinc-*`, solid so Tailwind alpha modifiers work): 100 `#F3F8FA`,
200 `#DCE6EA`, 300 `#C3D1D7`, 400 `#A9B9C0`, 500 `#93A4AB`, 600 `#74868E`, 700
`#3A4A51`, 800 `#1E2E35`, 900 `#0F1D23`. On the canvas, 100 to 600 all pass WCAG AA
(17.95 down to 5.07). 700 and darker are for borders and disabled states, never text.

### Accent, rating and status

| Token | Value | Use |
| --- | --- | --- |
| `--accent` | `var(--green-500)`, `#8FE3F0` | progress, "next", current state |
| `--accent-hover` | `var(--green-400)`, `#B4EEF6` | |
| `--accent-tint` | `rgba(143, 227, 240, 0.38)` | the track under an accent fill |
| `--accent-ring` | `0 0 0 3px rgba(143, 227, 240, 0.20)` | selected or current outline |
| `--brand-mark`, `--live`, `--success` | the accent | |
| `--rating` | `var(--amber-400)`, `#F2C46D` | filled stars |
| `--rating-empty` | `rgba(236, 245, 249, 0.30)` | empty stars |
| `--danger` | `#FF9B9B` | destructive text on a glass button |
| `--border-focus` | `#9BE7F5` | the focus ring |

Ramps: `--green-300` `#C6F2F8`, `--green-400` `#B4EEF6`, `--green-500` `#8FE3F0`,
`--green-600` `#5FC4D6`, `--green-700` `#3C8E9C` (aqua, despite the name). `--amber-300`
`#F7D899`, `--amber-400` `#F2C46D`, `--amber-500` `#D9A94E`, `--amber-yellow` `#F2C46D`
(gold). `--teal-300` to `--teal-500` and `--rust-300` to `--rust-600` alias the green
steps. Rust is deprecated; don't use it in new code.

Tints: `--green-tint-bg` `rgba(143, 227, 240, 0.14)`, `--green-tint-border`
`rgba(143, 227, 240, 0.30)`, `--amber-tint-bg` `rgba(242, 196, 109, 0.14)`,
`--amber-tint-border` `rgba(242, 196, 109, 0.30)`. The rust and teal tints alias the
green ones.

### Buttons and borders

| Token | Value |
| --- | --- |
| `--btn-primary-bg` | `var(--zinc-100)` |
| `--btn-primary-fg` | `var(--ink)` |
| `--btn-primary-bg-hover` | `var(--white)` |
| `--btn-ghost-bg` | `rgba(255, 255, 255, 0.16)` |
| `--btn-ghost-bg-hover` | `rgba(255, 255, 255, 0.22)` |
| `--border-faint` | `rgba(255, 255, 255, 0.04)` |
| `--border-subtle` | `rgba(255, 255, 255, 0.07)` |
| `--border-divider` | `rgba(255, 255, 255, 0.08)` |
| `--border-soft` | `rgba(255, 255, 255, 0.10)` |
| `--border-medium` | `rgba(255, 255, 255, 0.12)` |
| `--border-default` | `rgba(255, 255, 255, 0.14)` |
| `--border-strong` | `rgba(143, 227, 240, 0.42)` |

### Radii

| Token | Value | Use |
| --- | --- | --- |
| `--radius-2xl` | `28px` | sidebar, panels, hero frame, modals (24 under 760px) |
| `--radius-slab` | `22px` | hero slab |
| `--radius-row` | `20px` | rows inside panels |
| `--radius-lg` | `16px` | inset cards |
| `--radius-md` | `14px` | nav items, search, inputs, rows, stills |
| `--radius-xl` | `14px` | poster cards |
| `--radius-thumb` | `12px` | small thumbs |
| `--radius-sm` | `8px` | small controls |
| `--radius-xs` | `6px` | kbd |
| `--radius-pill` | `9999px` | buttons, chips |

Icon buttons and the avatar are circles. Progress segments use a 2px radius.

### Shadows and edges

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-sm` | `0 0 0 1px rgba(255, 255, 255, 0.10), 0 6px 14px -6px rgba(0, 0, 0, 0.60)` | thumb or still |
| `--shadow-md` | `inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 30px 60px -24px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.16)` | container |
| `--shadow-xl` | `inset 0 1px 0 rgba(255, 255, 255, 0.20), 0 40px 80px -32px rgba(0, 0, 0, 0.65), 0 2px 8px rgba(0, 0, 0, 0.20)` | hero frame |
| `--shadow-slab` | `inset 0 1px 0 rgba(255, 255, 255, 0.20), 0 24px 48px -16px rgba(0, 0, 0, 0.50)` | hero slab |
| `--shadow-poster` | `0 18px 32px -14px rgba(0, 0, 0, 0.70)` | poster |
| `--shadow-well` | `inset 0 1px 2px rgba(0, 0, 0, 0.30), inset 0 0 0 1px rgba(255, 255, 255, 0.07), 0 1px 0 rgba(255, 255, 255, 0.06)` | inset well |
| `--glass-row-edge` | `inset 0 1px 0 rgba(255, 255, 255, 0.14), inset 0 0 0 1px rgba(255, 255, 255, 0.06)` | `.glass-row` |
| `--glass-btn-edge` | `inset 0 1px 0 rgba(255, 255, 255, 0.20), inset 0 0 0 1px rgba(255, 255, 255, 0.06)` | `.glass-btn` |
| `--glass-chip-edge` | `inset 0 0 0 1px rgba(255, 255, 255, 0.12)` | `Badge` |
| `--glass-inset-card-edge` | `inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 0 0 1px rgba(255, 255, 255, 0.04)` | inset card |
| `--glass-badge-edge` | `inset 0 0 0 1px rgba(255, 255, 255, 0.16)` | `PosterBadge` |
| `--glow-violet` | `0 0 0 1px rgba(255, 255, 255, 0.12), 0 18px 32px -14px rgba(0, 0, 0, 0.70)` | the generic hover ring; the name is old, the ring is white |
| `--glow-rose`, `--glow-orange` | `var(--glow-violet)` | back-compat names |
| `--glow-live` | `var(--accent-ring)` | current or selected item |
| `--inset-hairline` | `inset 0 1px 0 rgba(255, 255, 255, 0.14)` | top highlight (active nav item) |

Blur scale: `--blur-sm` 12px, `--blur-md` 24px (mobile bars), `--blur-lg` 40px (tier 1),
`--blur-xl` 80px (ambient).

### Motion

`--ease-out-expo` is `cubic-bezier(0.22, 1, 0.36, 1)` and `--ease-standard` is
`cubic-bezier(0.4, 0, 0.2, 1)`. Durations: `--dur-fast` 0.18s, `--dur-base` 0.26s,
`--dur-slow` 0.4s, `--dur-slower` 0.6s. Hover transforms: `--lift-hover`
`translateY(-2px)` for cards, `--lift-poster` `scale(1.02)` for posters. Keyframes in
`tokens/keyframes.css`: `dorf-pulse`, `dorf-fade-up`, `dorf-spin`, `dorf-shimmer`.
`app/globals.css` turns transitions, shimmers and hover transforms off under
`prefers-reduced-motion`.

### Type

One typeface, Inter, variable with optical sizing. `--font-sans` is
`var(--font-inter, 'Inter'), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`.
`--font-serif` aliases it, and `--font-mono` is `ui-monospace, Menlo, monospace`.

Weights in use are 500, 600 and 650. 400 is for long body copy only. `--weight-light`
and `--weight-regular` are 400, `--weight-medium` is 500, `--weight-semibold` and
`--weight-bold` are 600, and `--weight-heading`, `--weight-extrabold` and
`--weight-black` are 650.

| Role | Token | Size / line | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Page H1, greeting | `--font-display` | 28 / 34 (24 / 30 under 760px) | 650 | `--tracking-tight` -0.02em |
| Big stat numeral | `--font-stat` | 28 / 34 | 650 | `--tracking-tighter` -0.025em |
| Section title | `--font-h2` | 20 / 26 | 650 | `--tracking-snug` -0.015em |
| Card title | `--font-card-title` | 16 / 24 | 600 | `--tracking-text` -0.01em |
| Body | `--font-body` | 15 / 22 | 500 | `--tracking-body` -0.006em |
| Nav, buttons, inputs | | 14 / 20 | 500 to 600 | -0.01em |
| Meta, eyebrow | `--font-meta`, `--eyebrow-*` | 13 / 18 | 500 | 0 |
| Caption, kbd, chip | `--font-caption` | 12 / 16 | 500 to 600 | 0 |

Size scale (px): `--text-2xs` 11, `--text-xs` 12, `--text-sm` 13, `--text-base` 14,
`--text-body` 15, `--text-md` 16, `--text-lg` 18, `--text-xl` 20, `--text-2xl` 24,
`--text-3xl` 28, `--text-4xl` 36, `--text-5xl` 44, `--text-6xl` 60. Leading:
`--leading-none` 1, `--leading-tight` 1.2, `--leading-snug` 1.3, `--leading-normal` 1.5,
`--leading-relaxed` 1.65. Tracking also has `--tracking-normal` 0, `--tracking-wide`
0.02em and `--tracking-widest` 0.12em. Nothing in Spatial Glass uses wide tracking.

### Spacing and layout

4px grid (px): `--space-0` 0, `--space-1` 4, `--space-2` 8, `--space-3` 12,
`--space-4` 16, `--space-5` 20, `--space-6` 24, `--space-7` 28, `--space-8` 32,
`--space-10` 40, `--space-12` 48, `--space-16` 64. Gaps run 2, 6, 8, 12, 16 and 24.
Panels pad 20 to 28.

| Token | Value | Use |
| --- | --- | --- |
| `--shell-pad` | `24px` | page padding and panel gap (12 under 760px) |
| `--sidebar-width` | `232px` | glass sidebar, `lg` and up |
| `--rail-width` | `76px` | icon rail, `md` to `lg` |
| `--shell-max` | `1720px` | sidebar plus content |
| `--content-max` | `1440px` | content column |
| `--content-narrow` | `720px` | settings and import column |
| `--content-pad-x` | `24px` | main padding |
| `--poster-ratio` | `2 / 3` | posters |

Below 768px the app keeps its mobile top bar, bottom tab bar and More drawer, as glass
bars blurred 24px. Below 760px the hero stacks and panels use radius 24.

### Retired

`--grain` is kept with `--grain-opacity: 0`; the film-grain layer is gone. These no
longer exist, so don't reference them: `--page-radial`, `--orb-*`, the `--violet-*`,
`--rose-*`, `--emerald-*` and `--orange-*` ramps, the Outfit typeface, and the Autumn
Pine hexes `#100e09`, `#15120c`, `#1b1711`, `#7c9a6a`, `#c4805f` and `#d3a85c`.

## Components

The recipes are spec section 5.5. Each prompt file names the real component, its props
and the rules that matter at call sites.

| Component | File | Prompt |
| --- | --- | --- |
| `Card` | `components/ui/Card.tsx` | `components/surfaces/Card.prompt.md` |
| `StatTile` | `components/ui/StatTile.tsx` | `components/surfaces/StatTile.prompt.md` |
| `PageHeader`, `SectionHeader` | `components/ui/PageHeader.tsx`, `SectionHeader.tsx` | `components/surfaces/Headers.prompt.md` |
| `EmptyState`, `SectionError`, `Skeleton` | `components/ui/EmptyState.tsx`, `SectionError.tsx`, `Skeleton.tsx` | `components/surfaces/States.prompt.md` |
| `Button` | `components/ui/Button.tsx` | `components/core/Button.prompt.md` |
| `Badge`, `PosterBadge` | `components/ui/Badge.tsx`, `PosterCard.tsx` | `components/core/Badge.prompt.md` |
| `Input`, `Select` | `components/ui/Input.tsx`, `Select.tsx` | `components/core/Input.prompt.md` |
| `SegmentedControl` | `components/ui/SegmentedControl.tsx` | `components/core/SegmentedControl.prompt.md` |
| `Eyebrow` | `components/ui/Eyebrow.tsx` | `components/core/Eyebrow.prompt.md` |
| `Kbd`, `Avatar` | `components/ui/Kbd.tsx`, `Avatar.tsx` | `components/core/Kbd.prompt.md` |
| `PosterCard` | `components/ui/PosterCard.tsx` | `components/media/PosterCard.prompt.md` |
| `MediaRow` | `components/ui/MediaRow.tsx` | `components/media/MediaRow.prompt.md` |
| `RatingStars` | `components/RatingStars.tsx` | `components/media/RatingStars.prompt.md` |
| `ProgressRing`, `SegmentedProgress`, `DateStack` | `components/ui/ProgressRing.tsx`, `SegmentedProgress.tsx`, `DateStack.tsx` | `components/media/Progress.prompt.md` |
| `NavItem` | `components/ui/NavItem.tsx` | `components/navigation/NavItem.prompt.md` |
| `AmbientBackdrop` | `components/AmbientBackdrop.tsx` | the ambient section above |

Also in `components/ui/`: `ClearFilters` (`onClear`), a glass pill with danger text that
shows only while a filter is active, and `BentoGrid`, kept for older layouts.

## Content and voice

The redesign changes no copy. When you write new copy:

- Plain and direct. Second person where the UI talks about the user's things ("Search
  your library"); label-driven elsewhere ("Date watched", "12 watched").
- Sentence case for body copy, section titles, empty states and new buttons, as in the
  reference: "Up next", "Coming soon", "Log a watch", "See all". Some older labels are
  Title Case ("Add to Watchlist"); leave them.
- No uppercase eyebrows and no tracked caps anywhere. The eyebrow is the muted line
  above a page title, usually the date, in plain case.
- Empty states state the fact, then the next step: "Nothing watched yet." followed by
  "Log your first film or show and your stats, streak and recommendations start building
  from here."
- Short verbs on buttons: "Mark watched", "Sign in", "Remove".
- No emoji. No exclamation-mark hype.

## Iconography

lucide-react only, `strokeWidth={1.8}`, 18 to 20px, `currentColor`. Nav icons are 20px.
No emoji, icon font or custom illustration set. Stars are the Lucide `Star` filled with
`--rating` or `--rating-empty`, not the U+2605 glyph.

Nav glyphs (from `components/Sidebar.tsx`): `Home`, `Search`, `Library`, `ListTodo`,
`Clapperboard`, `Sparkles`, `CalendarDays`, `Layers`, `BarChart3`, `Settings`,
`MoreHorizontal`.

For HTML, paste the icon's SVG from lucide.dev inline and set `stroke-width="1.8"`, as
the guideline cards do:

```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M20 6 9 17l-5-5" />
</svg>
```

If you load the Lucide script from a CDN instead, pin a version and add an `integrity`
hash; don't load `lucide@latest`.

## Brand mark

A rounded square with a "D" cut from it, then "DorfMovies" at 17/22, weight 650,
-0.02em, in `--text-primary`. The sidebar draws it in `components/Sidebar.tsx`
(`Mark()`), 28px:

```html
<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
  <rect x="0.5" y="0.5" width="31" height="31" rx="10" fill="var(--text-primary)" />
  <path d="M10.5 8h5.7a8 8 0 0 1 0 16h-5.7z" fill="var(--ink)" />
  <circle cx="16.2" cy="16" r="2.6" fill="var(--text-primary)" />
</svg>
```

The favicon and app icons (`app/icon.tsx`, `app/apple-icon.tsx`, `public/icon-*.png`)
draw the same mark in `#EAF6F9` and `#08161C`. The favicon and the 192 and 512 PNGs put
the rounded square on a transparent canvas. The Apple icon fills the canvas with
`#EAF6F9`, because iOS applies its own corner mask, and the maskable PNG does the same
with the glyph at 0.8 scale so it stays in Android's safe zone. The PNGs are rendered
from the SVG with headless Chromium. See `assets/wordmark.html`.

## Accessibility

- Text tokens hold 4.5:1 on their glass surface. Recheck over the lightest backdrops.
- Every interactive element gets the global `:focus-visible` ring, `2px solid
  var(--border-focus)` with a 2px offset. Never remove an outline without a replacement.
- Touch targets are at least 44px, and every `Button` size is. Icon-only buttons need an
  `aria-label` (`variant="icon"` requires it in the type).
- Decorative art gets `alt=""` and `aria-hidden`.
- Respect `prefers-reduced-motion`, `prefers-reduced-transparency` and `forced-colors`.
  The glass classes already handle the last two.

## Files in this skill

- `SKILL.md`: the skill manifest.
- `readme.md`: this file.
- `styles.css`: entry point for HTML. Imports every token file, including `fonts.css`.
- `glass.css`: glass tiers, page base and ambient layer for HTML.
- `tokens/`: `colors.css`, `typography.css`, `spacing.css`, `effects.css`,
  `textures.css`, `keyframes.css`, and `fonts.css` (the Inter `@import`, used through
  `styles.css` only).
- `guidelines/`: specimen cards for colour, glass, type, spacing, radii and shadows.
  Each has a `@dsCard` header and links `../styles.css` and `../glass.css`.
- `assets/wordmark.html`: the mark and wordmark.
- `components/<group>/*.prompt.md`: one recipe card per real component or pair.
- `_ds_manifest.json`, `_adherence.oxlintrc.json`: Claude Design export metadata
  (cards, tokens, fonts) and lint hints for generated HTML and JSX. Both are derived
  from `tokens/` and the `@dsCard` headers, so they go stale when either changes.
- `.thumbnail`: a 720x480 WebP preview of `guidelines/colors-glass.html`.
- `explorations/autumn-pine/`: the archived Autumn Pine kit, cards and docs.
