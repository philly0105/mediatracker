# Design Spec: DorfMovies "Spatial Glass" Redesign

## 1. Summary
Replace the **Autumn Pine** look (flat warm-brown surfaces, pine green, Outfit) with **Spatial Glass**: translucent glass panels floating over a heavily blurred backdrop of whatever title the page is about, Inter type, a cool blue-black palette with one aqua accent, and real TMDB artwork (backdrops, posters, episode stills, title logos) everywhere a title appears.

The approved reference is **`docs/designs/spatial-glass/reference/home.html`**. Open it in a browser; it is self-contained, with images in `reference/assets/`. Screenshots are in `docs/designs/spatial-glass/screenshots/`. That file is the source of truth for every value in this spec. If this spec and the reference disagree, the reference wins.

This is a **visual redesign**. Routes, behaviour, data flow, keyboard shortcuts and copy stay as they are. The only data changes are the small additions in §7, which the design needs.

## 2. Goals and non-goals
**Goals**
- Every route looks like it belongs to the reference: same glass tiers, type, spacing rhythm, buttons, chips, progress and rating treatments.
- The artwork leads. Backdrops, posters, episode stills (already stored in `episodes.still_url`, not rendered yet) and title logos replace text-only treatments.
- The ambient backdrop follows the featured title of each page (the Home "continue watching" show, the title on a title page, and the most recent watch elsewhere).
- No regressions in accessibility (WCAG 2.1 AA, focus, 44px targets, reduced motion) or performance (see `docs/performance/` and the comments in `app/globals.css`), especially on mobile.

**Non-goals:** new features, route or URL changes, schema changes beyond §7, copy rewrites, light mode.

## 3. Principles
1. **Content is the colour.** The page tint comes from the featured title's backdrop, blurred 80px. The UI has almost no colour of its own.
2. **Glass is layered.** Use three tiers (§5.2). Blur only the top-level containers; everything inside them uses translucent fills.
3. **Light edges, deep shadows.** Every glass container gets a 1px top highlight, a gradient rim and a soft long shadow. Never a hard border.
4. **One accent.** Aqua `#8FE3F0` marks progress, "next", current-state data and focus. Gold `#F2C46D` is only for star ratings. Nothing else is coloured.
5. **Quiet chrome, big art.** Use large radii (28 for containers, 14 for rows and controls), generous 24px gutters, and white or translucent-white text.
6. **Tabular numbers.** Every count, date, runtime and stat uses `font-variant-numeric: tabular-nums`.

## 4. Foundations (exact values from the reference)

### 4.1 Colour
| Role | Value | Notes |
|---|---|---|
| Canvas | `#061015` | `body` background, `themeColor`, end of the ambient tint |
| Ambient tint (over the blurred art) | `linear-gradient(180deg, rgba(4,12,17,.46) 0, rgba(4,12,17,.58) 900px, rgba(5,13,18,.84) 1700px, #061015 2250px)` | In production the layer is viewport-fixed, so use `rgba(4,12,17,.50) 0%, rgba(4,12,17,.62) 55%, rgba(5,13,18,.84) 100%` |
| Text primary | `#F3F8FA` | headings, primary labels |
| Text secondary | `rgba(236,245,249,.80)` | body and meta (the reference uses .86/.80/.76; normalise to .86 / .80 / .74) |
| Text muted | `rgba(236,245,249,.74)` | captions, timestamps |
| Text faint | `rgba(236,245,249,.66)` | placeholders only |
| Ink on light | `#08161C` | text on the white primary button and the logo mark |
| Accent | `#8FE3F0` | progress fill, "Next" labels, current bar, toggles, focus ring base |
| Accent tint | `rgba(143,227,240,.38)` | progress track under accent fill |
| Accent ring | `0 0 0 3px rgba(143,227,240,.20)` | selected or current outline |
| Focus ring | `outline: 2px solid #9BE7F5; outline-offset: 2px` | every interactive element, via `:focus-visible` |
| Rating | `#F2C46D` | stars only; empty star `rgba(236,245,249,.30)` |
| Deep panel | `#0B1A21` | solid fallback surfaces |

### 4.2 Typography
- **Inter** variable with optical sizing: `next/font/google` `Inter({ subsets: ['latin'], axes: ['opsz'], display: 'swap' })` (Google css2 equivalent `Inter:opsz,wght@14..32,400..700`). Weights in use are **500, 600, 650**. 400 is used only for long body copy.
- Body base: 15px / 22px, `letter-spacing: -0.006em`, `-webkit-font-smoothing: antialiased`.

| Role | Size / line height | Weight | Tracking |
|---|---|---|---|
| Greeting / page H1 | 28 / 34 (24 / 30 under 760px) | 650 | -0.02em |
| Big stat numeral | 28 / 34 | 650 | -0.025em |
| Section title | 20 / 26 | 650 | -0.015em |
| Card title | 16 / 24 | 600 | -0.01em |
| Body | 15 / 22 | 500 | -0.006em |
| Nav, buttons | 14 / 20 | 500–600 | -0.01em |
| Meta | 13 / 18 | 500 | 0 |
| Caption, kbd, chip | 12 / 16 | 500–600 | 0 |

### 4.3 Radii, spacing, shadows
- **Radii:** 28 (sidebar, panels, hero frame, modals); 24 (panels under 760px); 20 (inner hero slab); 16 (inset cards); 14 (nav items, search, rows, posters, stills); 12 (small thumbs); 6 (kbd); 999 (pills, buttons); 50% (icon buttons, avatar, rings); 2 (progress segments).
- **Spacing:** 4-based. Gaps are 2 / 6 / 8 / 12 / 16 / 24. The shell padding and panel gap are 24 (12 under 760px). Panel padding is 20–28.
- **Shadows**
  - Container: `inset 0 1px 0 rgba(255,255,255,.14), 0 30px 60px -24px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.16)`
  - Hero frame: `inset 0 1px 0 rgba(255,255,255,.20), 0 40px 80px -32px rgba(0,0,0,.65), 0 2px 8px rgba(0,0,0,.20)`
  - Poster: `0 18px 32px -14px rgba(0,0,0,.70)`
  - Thumb or still: `0 0 0 1px rgba(255,255,255,.10), 0 6px 14px -6px rgba(0,0,0,.60)`
  - Inset well (search): `inset 0 1px 2px rgba(0,0,0,.30), inset 0 0 0 1px rgba(255,255,255,.07), 0 1px 0 rgba(255,255,255,.06)`

### 4.4 Breakpoints (map onto Tailwind's)
| Width | Shell |
|---|---|
| ≥ 1024 (`lg`) | Floating glass sidebar, 232px, sticky contents |
| 768–1023 (`md`) | Compact icon rail, 76px, label under the icon (as in the Adaptive mock), tooltips on hover |
| < 768 | Keep the existing mobile top bar, bottom tab bar and "More" drawer from `components/Sidebar.tsx`, restyled as glass bars (blur 24px). The reference's ≤1020 wrapped top bar is a mock-up shortcut, not the target. |

Content breakpoint: at < 760px the hero stacks (image above, content slab below) and panels use radius 24, padding 14.

## 5. Architecture

### 5.1 Tokens: retune in place
Keep every existing token **name** so the roughly 340 existing call sites (`text-zinc-*`, `bg-white/5`, `border-white/10`, `var(--text-*)`, `var(--glass-*)`, `var(--border-*)`, `var(--btn-*)`) re-theme automatically. Change the **values** and add new glass, ambient and blur tokens. Edit in `.agents/skills/dorfmovies-design/tokens/` first, then copy into `app/styles/design-system/tokens/`. `app/styles/design-system/__tests__/designSystemSync.test.ts` fails if the two copies differ.

| Existing token(s) | New value |
|---|---|
| `--bg-void`, `--surface-page` | `#061015` |
| `--bg-base`, `--surface-shell` | `rgba(9,20,27,.46)` (glass tint; the solid fallback is `#0B1A21`) |
| `--bg-raised`, `--glass-card` | `rgba(255,255,255,.05)` |
| `--glass-card-hover`, `--bg-bar` | `rgba(255,255,255,.09)` |
| `--glass-panel` | `linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.03)), rgba(9,20,27,.46)` |
| `--bg-elevated`, `--glass-modal`, `--surface-modal` | `linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04)), rgba(9,20,27,.72)` |
| `--glass-input`, `--surface-input` | `rgba(0,0,0,.24)` |
| `--glass-chip` | `rgba(255,255,255,.10)` |
| `--scrim` | `rgba(3,9,12,.62)` |
| `--zinc-100 … --zinc-900` (cool ramp; solid so Tailwind alpha modifiers keep working) | 100 `#F3F8FA` · 200 `#DCE6EA` · 300 `#C3D1D7` · 400 `#A9B9C0` · 500 `#93A4AB` · 600 `#74868E` · 700 `#3A4A51` · 800 `#1E2E35` · 900 `#0F1D23` |
| `--text-primary / secondary / muted / faint` | `#F3F8FA` / `rgba(236,245,249,.80)` / `rgba(236,245,249,.74)` / `rgba(236,245,249,.66)` |
| `--text-inverse` | `#08161C` |
| `--border-faint / subtle / soft / default` | `rgba(255,255,255,.04 / .07 / .10 / .14)` |
| `--border-strong`, `--border-focus` | `rgba(143,227,240,.42)`, `#9BE7F5` |
| `--accent`, `--brand-mark` | `#8FE3F0` |
| `--accent-hover` | `#B4EEF6` |
| `--rating` | `#F2C46D` |
| `--live` | `#8FE3F0` (now-watching uses the accent; rust is retired) |
| `--success` | `#8FE3F0` (watched check = accent) |
| `--btn-primary-bg / -hover / -fg` | `#F3F8FA` / `#FFFFFF` / `#08161C` |
| `--btn-ghost-bg / -hover` | `rgba(255,255,255,.16)` / `rgba(255,255,255,.22)` |
| `--green-*`, `--teal-*` ramps | alias to an aqua ramp: 300 `#C6F2F8`, 400 `#B4EEF6`, 500 `#8FE3F0`, 600 `#5FC4D6`, 700 `#3C8E9C` |
| `--amber-*` | alias to gold: 300 `#F7D899`, 400 `#F2C46D`, 500 `#D9A94E` |
| `--rust-*` | deprecated; alias to the aqua ramp |
| `--*-tint-bg / -border` | aqua `rgba(143,227,240,.14 / .30)`; gold `rgba(242,196,109,.14 / .30)` |
| `--orb-*`, `--page-radial` | unused after §5.3; set `--page-radial` to the fixed ambient tint gradient and the orbs to `transparent` |
| `--radius-sm / md / lg / xl / 2xl` | `8 / 14 / 16 / 14 / 28` px (pill unchanged) |
| `--blur-sm / md / lg / xl` | `12 / 24 / 40 / 80` px |
| `--shadow-sm / md / xl / poster` | thumb / container / hero-frame / poster from §4.3 |
| `--glow-violet` (generic hover ring) | `0 0 0 1px rgba(255,255,255,.12), 0 18px 32px -14px rgba(0,0,0,.70)` |
| `--glow-live` | the accent ring `0 0 0 3px rgba(143,227,240,.20)` |
| `--inset-hairline` | `inset 0 1px 0 rgba(255,255,255,.14)` |
| `--font-sans` | `var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif` |
| `--grain-opacity` | `0` (the glass look has no grain; keep the token, drop the visible layer) |
| `--sidebar-width` | `232px`; add `--rail-width: 76px` |
| `--content-max` | `1440px` (the reference shell max is 1720px including the sidebar) |

New tokens to add: `--glass-blur: 40px`, `--glass-saturate: 160%`, `--glass-rim: linear-gradient(160deg, rgba(255,255,255,.40), rgba(255,255,255,.10) 28%, rgba(255,255,255,.04) 62%, rgba(255,255,255,.16))`, `--ambient-blur: 80px`, `--ambient-saturate: 1.3`, `--accent-tint: rgba(143,227,240,.38)`, `--accent-ring: 0 0 0 3px rgba(143,227,240,.20)`, `--rating-empty: rgba(236,245,249,.30)`, `--ink: #08161C`, `--glass-fallback: rgba(12,24,31,.94)`.

Tailwind bridge (`@theme inline` in `app/globals.css`): keep the bridge. The zinc ramp now resolves to the cool values. Map `--color-white` to `#F3F8FA` so `bg-white/5` and `border-white/10` become the hairlines from the table. Retire the green, teal, amber and rust utilities by mapping them to the aqua and gold ramps. Grep for and fix any colour that reads wrong.

### 5.2 Glass tiers (utility classes in `app/globals.css`)
| Class | Use | Recipe |
|---|---|---|
| `.glass-panel` (tier 1, blurred) | sidebar, section panels, mobile bars, modals, popovers, toasts | `background: var(--glass-panel); backdrop-filter: blur(40px) saturate(160%)` (with the `-webkit-` prefix); `box-shadow` = container shadow; `border-radius: 28px`; plus `.glass-rim` |
| `.glass-slab` (tier 1, smoked) | text over artwork (hero content slab) | `linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.03)), rgba(9,20,27,.48)` + the same blur + rim; radius 20 |
| `.glass-row` (tier 2, no blur) | rows and cards inside panels | `background: rgba(255,255,255,.05)`, hover `.09`; `box-shadow: inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px rgba(255,255,255,.06)`; radius 20 (rows) or 16 (cards) |
| `.glass-inset` (tier 2) | search and text inputs, segmented track | inset-well recipe from §4.3, background `rgba(0,0,0,.24)`, radius 14 |
| `.glass-btn` | secondary buttons, chips, icon buttons | `rgba(255,255,255,.16)`, hover `.22`, `box-shadow: inset 0 1px 0 rgba(255,255,255,.20), inset 0 0 0 1px rgba(255,255,255,.06)` |
| `.glass-rim` | gradient edge on tier-1 and tier-2 containers | `::before` 1px gradient border with mask (`padding:1px; background: var(--glass-rim); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; border-radius: inherit; pointer-events: none`); needs `position: relative` |

**Performance budget (hard rules)**
- `backdrop-filter` only on tier-1 elements, and **no more than 8 visible per viewport**.
- Never on elements inside poster grids, rails, virtualised or long lists. Those use tier-2 fills.
- Never animate `backdrop-filter` or `filter`. Only `opacity` and `transform`.
- `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` → tier 1 gets `background: var(--glass-fallback)`.
- `@media (prefers-reduced-transparency: reduce)` → tier 1 gets `--glass-fallback` and the ambient art is hidden (tint only).
- Re-measure with Lighthouse mobile and the Performance panel (4× CPU throttle, scroll the library) against the Task 0 baseline. No new long tasks on scroll.

### 5.3 Ambient backdrop
- New `components/AmbientBackdrop.tsx`: a `position: fixed; inset: 0; z-index: 0; pointer-events: none` layer with an `<img>` of the featured backdrop (TMDB **w780** is plenty under an 80px blur), `object-fit: cover; filter: blur(80px) saturate(1.3); transform: scale(1.15)`. The tint gradient from §4.1 sits on top. It is decorative, so `alt=""` and `aria-hidden`.
- The root layout renders a default layer (canvas plus a faint aqua radial). Pages set the featured image by rendering `<AmbientBackdrop src={backdropUrl} />`. The last one rendered wins, and it crossfades in over 400ms (opacity only, skipped under reduced motion).
- Replace the gradient `.ambient-layer` and the `body::after` grain. Keep the "one painted, fixed layer" rule recorded in `app/globals.css`: no `background-attachment: fixed`, no viewport-pinned body backgrounds.
- **Contrast guard:** some backdrops are very light (e.g. The Bear, Bugonia). The tint gradient plus the panels' own `rgba(9,20,27,.46)` base must keep secondary text at ≥ 4.5:1. Verify with the lightest backdrops in the library.

### 5.4 Shell
- Desktop: a page wrapper with 24px padding and a 24px gap, max-width 1720px; the glass sidebar (232px, radius 28, sticky inner content) next to the content column. Update `app/(app)/layout.tsx` spacing: `--sidebar-width` 232 + 24 gutter.
- Sidebar content (reference order): wordmark (rounded-square "D" mark + "DorfMovies" 17/22/650); search field (inset well, ⌘K kbd) that opens the existing `SearchOverlay`; nav (Home, Library, Watchlist, Streaming, For You, Calendar, Franchises, Stats; items 44px tall, radius 14; active `rgba(255,255,255,.15)` plus inset highlight; hover `.08`); a "Must watch" mini-list (5 poster thumbs 24×36 radius 4, count on the right); Settings at the bottom; avatar in the page header row, right-aligned.
- Mobile: keep the structure of the existing top bar, bottom tab bar and More drawer, restyled with `.glass-panel` (blur 24px), radius 0 for the bars and 28 for the drawer sheet.

### 5.5 Components (existing → new recipe)
| Component | Spec |
|---|---|
| `ui/Card` → GlassPanel | variants `panel` / `slab` / `row` / `inset` from §5.2; prop `as` |
| `ui/Button` | `primary`: pill, `#F3F8FA` background, `#08161C` text, 44px tall, 0 18px padding, 600 weight, hover `#FFF`. `secondary`: `.glass-btn` pill. `icon`: 44px circle `.glass-btn`, needs `aria-label`. `ghost`: transparent, hover `rgba(255,255,255,.08)`. Disabled 40% opacity. |
| `ui/Badge`, chips | 24–28px pill, 12/16/600, `rgba(255,255,255,.10)` + `inset 0 0 0 1px rgba(255,255,255,.12)`; rating badge uses a gold star; platform chip; "Rewatch" chip with an icon |
| `ui/Input`, `ui/Select` | `.glass-inset`, 44px, 14px text, placeholder `rgba(236,245,249,.66)`, leading icon 18px stroke 1.8 |
| `ui/Kbd` | 22px tall, radius 6, `rgba(255,255,255,.08)` + `inset 0 0 0 1px rgba(255,255,255,.14)`, 12/500 |
| `ui/NavItem` | §5.4 |
| `ui/SegmentedControl` | track `.glass-inset` radius 14, segments 36px, selected `rgba(255,255,255,.15)` + inset highlight |
| `ui/PosterCard` | 2:3, radius 14, poster shadow, `0 0 0 1px rgba(255,255,255,.10)` ring; caption under it: title 13/18/600, then gold stars + date 12/16 muted; badges top-left. **No blur.** |
| `ui/MediaRow` | `.glass-row` radius 20, still or poster thumb (14 radius) + text column + trailing action (44px circle check) |
| `ui/StatTile` | numeral 28/34/650 tabular, label 13/18 muted; no box of its own inside a panel |
| `ui/PageHeader` | eyebrow date 13/18 muted, then H1 28/34/650 ("Good evening, Richard" uses the real name and time of day); actions right-aligned (a glass "Log a watch" pill and the avatar) |
| `ui/EmptyState`, `ui/SectionError` | centred in a panel, 48px icon in a `.glass-btn` circle, title 16/24/600, body 14/20 secondary, primary or secondary button |
| `ui/Skeleton` | `rgba(255,255,255,.06)` blocks with a `.06 → .10` shimmer (none under reduced motion), using the radii of the thing it stands in for |
| `ui/Avatar` | 44px circle, white initials on `rgba(255,255,255,.16)`, ring `0 0 0 2px rgba(255,255,255,.16)` |
| `RatingStars` | gold `#F2C46D` filled, empty `rgba(236,245,249,.30)`, half stars kept, 12–14px in captions and 24px in the rating control |
| **New** `ProgressRing` | 48px SVG ring, 4px stroke, track `rgba(255,255,255,.16)`, fill `#8FE3F0`, label inside 12/600 (e.g. "S2") |
| **New** `SegmentedProgress` | one 4px-tall segment per episode, 3px gap, radius 2: watched `#8FE3F0`, unwatched `rgba(255,255,255,.16)`; "6 of 10" 12px tabular to the right |
| **New** `SectionHeader` | title 20/26/650 + optional subtitle 13/18 muted + trailing link ("See all ›": 14/500, hover white with `rgba(255,255,255,.08)` background) |
| **New** `DateStack` | month 12/16 muted over day 20/26/650 tabular, 40px column (Coming soon, Calendar) |
| Charts (recharts in `StatsCharts`) | bars `rgba(255,255,255,.22)` radius 4, the current or peak bar `#8FE3F0`, dashed average line `rgba(255,255,255,.35)`, gridlines `rgba(255,255,255,.08)`, axis 12px `rgba(236,245,249,.70)`, tooltip as `.glass-panel` radius 14 |
| Icons | lucide-react, 18–20px, `strokeWidth={1.8}`, `currentColor` |

### 5.6 Pages
| Route(s) | Direction |
|---|---|
| `/` Home | Match the reference exactly: greeting header; the hero (glass frame around the sharp backdrop, smoked slab on the left with logo, tagline, meta chips, progress ring, next-episode card with still, actions); "Up next" panel (rows with stills and segmented progress) beside "Coming soon" (DateStack list with bookmarks); "Recently watched" poster rail; "2026 so far" stats panel with bar chart; "Because you watched" card. Ambient = the continue-watching show. |
| `/show/[id]`, `MediaInfoModal` (movies and shows) | The same hero composition with the title's own backdrop and logo. Status (progress ring and next episode, or watched date and rating). Actions (Mark watched, Rate, Add to list, Share, Similar). A season `SegmentedControl` and episode rows (`MediaRow` with `still_url`, number, name, runtime, air date, one-line synopsis, watched toggle; the next episode gets the accent ring). Your rating and review panel. Cast strip (headshots in 14-radius tiles). "More like this" poster rail. "Streaming on X" row. The modal uses the same content in a `.glass-panel` sheet (max-width 960, radius 28; full-screen sheet on mobile). Ambient = this title. |
| `/library`, `/watchlist`, `/collections`, `/collections/[id]`, `/recommendations`, `/streaming`, `/person/[name]`, share pages | A glass toolbar panel (search within, type `SegmentedControl`, sort `Select`, filter chips with an active state, grid/list toggle, Select for multi-select). Below it a poster grid of `PosterCard` (no blur per card; 5–6 columns at 1440, 2–3 on phones) or a `MediaRow` list. `LibraryFilterDrawer` becomes a glass sheet. Ambient = the most recently watched title. |
| `/calendar` | A month or agenda view in a `.glass-panel`; release rows use DateStack + poster thumb + title + weekday·countdown + watchlist bookmark (accent when saved). |
| `/stats` | Panels of StatTiles + charts per §5.5. Genre and decade breakdowns as horizontal bars. |
| `/settings`, `/import` | A single 720px column of `.glass-panel` sections; inputs `.glass-inset`; destructive actions as a secondary button with red text `#FF9B9B` (≥ 4.5:1 on the panel). |
| Auth (`AuthShell`, login, signup, forgot, reset) | A centred 420px `.glass-panel` card over an ambient backdrop of a popular title (static default), with the wordmark above. |
| Error, 404, loading | A glass panel with the message and actions; loading uses `ui/Skeleton` in the page's real layout. |
| `icon.tsx`, `apple-icon.tsx`, OG images, `manifest.ts`, `viewport.themeColor` | Canvas `#061015`, mark `#EAF6F9` with `#08161C` "D", text `#F3F8FA`, accent `#8FE3F0`. |

## 6. Accessibility
- Text tokens are ≥ 4.5:1 on their glass surface (the reference was measured on rendered pixels). Re-measure against the lightest backdrops (§5.3).
- `:focus-visible` gets the §4.1 ring on every interactive element; never `outline: none` without a replacement.
- Touch targets are ≥ 44px. Icon-only buttons need `aria-label`. Decorative art gets `alt=""` and `aria-hidden`.
- Respect `prefers-reduced-motion` (existing pass R7-1: crossfades, shimmers and hover transforms off), `prefers-reduced-transparency` (§5.2) and `forced-colors` (give glass containers a visible border).

## 7. Data additions (the only backend changes)
1. **Backdrops and logos on `media`:** a migration adds `backdrop_url text` and `logo_url text`. `lib/tmdb.ts` already maps `backdrop_url` from details. Add `images` to `append_to_response` with `include_image_language=en,null`. Pick the highest-voted `en` logo (fall back to `null`) as a PNG at `w500`. Write both wherever media rows are inserted or updated. Add `/api/admin/backfill-media-art` following the existing `/api/admin/backfill-*` pattern.
2. **Episode stills:** already in `episodes.still_url` (migration 008), not rendered yet. Render them.
3. **Watch providers:** already in the details append (`watch/providers`). Surface the first flatrate provider as the platform chip.
4. Nothing else. Stats, upcoming, next-up and recommendations already exist.

## 8. Acceptance criteria
- At 1440px, `/` matches the reference within normal implementation tolerance: layout, spacing, type, colours, glass and shadows.
- Every route in §5.6 uses only the tokens and components above; no leftover warm-brown or pine values. A grep for the old hexes (`#100e09`, `#15120c`, `#1b1711`, `#7c9a6a`, `#c4805f`, `#d3a85c`) and for `Outfit` returns nothing outside docs.
- At 390px nothing overflows horizontally, and the mobile bars and drawer work as before.
- `npm run lint`, `npm run test:run` and `npm run build` pass. `designSystemSync.test.ts` passes. Tests that asserted old classes are updated to the new behaviour, not deleted.
- Lighthouse mobile performance and accessibility are no worse than the Task 0 baseline, and scroll on `/library` has no new long tasks.
- `.agents/skills/dorfmovies-design/` describes Spatial Glass (guidelines, tokens, component prompts), so future agent work stays on-brand.
