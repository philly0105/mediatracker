# DorfMovies "Spatial Glass" Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Tick boxes in this file as you complete them so work can resume across sessions.

**Goal:** Re-skin the whole app to the approved "Spatial Glass" design without changing behaviour.

**Spec:** `docs/superpowers/specs/2026-10-22-spatial-glass-redesign.md`. Read it fully before Task 1.
**Visual reference:** `docs/designs/spatial-glass/reference/home.html` (open it in a browser) and `docs/designs/spatial-glass/screenshots/`.

**Architecture:** Retune the existing design tokens in place (same names, new values) so the roughly 340 existing call sites re-theme. Add glass utility classes and a fixed `AmbientBackdrop` layer. Rebuild the shell and the `components/ui/*` primitives on those. Then restyle every route, high-traffic first. Two small data additions (backdrop and logo URLs on `media`).

**Tech stack:** Next.js 16 (read `node_modules/next/dist/docs/` before using any Next API, as AGENTS.md requires), React 19, Tailwind CSS v4, Supabase, TMDB, lucide-react, recharts, Vitest + Testing Library.

## Global constraints
- **No behaviour changes.** Routes, URL state, keyboard shortcuts, data flow, copy and test semantics stay the same. When a test asserts an old class or colour, update the assertion to the new design intent; never delete a test to make it pass.
- **Tokens are authored in `.agents/skills/dorfmovies-design/tokens/` and copied byte-for-byte into `app/styles/design-system/tokens/`.** `designSystemSync.test.ts` enforces this.
- **Glass performance budget (spec §5.2):** `backdrop-filter` only on tier-1 containers, at most 8 visible per viewport, never inside grids or rails, never animated.
- **Accessibility:** AA contrast, `:focus-visible` ring `2px solid #9BE7F5` offset 2px, 44px targets, `aria-label` on icon buttons; respect reduced motion, reduced transparency and forced colours.
- Icons stay `lucide-react` (`strokeWidth={1.8}`). No emoji.
- After every task run `npm run lint && npm run test:run && npm run build`. All three must pass before you commit.
- Commit per task with Conventional Commits (`style:`, `feat:`, `refactor:`, `test:`). Work on branch `redesign/spatial-glass`. Never push to `master`.
- **Ask Richard before applying any migration to the production Supabase project.**

---

## Task 0: Branch and baseline
**Files:** none (outputs under `docs/designs/spatial-glass/baseline/`)

- [x] `git checkout -b redesign/spatial-glass`
- [x] `npm ci` then run `npm run lint && npm run test:run && npm run build` and record the results. Fix nothing yet; note pre-existing failures in this file under Task 0.
  - Baseline at `c50a825` (2026-10-22), run on the home server (gmk1) rather than the dev PC, which can't spare the RAM: lint clean, 60 test files / 502 tests passing, `next build` succeeds. No pre-existing failures.
- [x] Start `npm run dev`, sign in, and screenshot `/`, `/library`, `/watchlist`, `/calendar`, `/stats`, one `/show/[id]` and the media modal at 1440 and 390 into `docs/designs/spatial-glass/baseline/`.
- [x] Record a Lighthouse mobile run for `/` and `/library` (Performance, Accessibility) in `docs/designs/spatial-glass/baseline/lighthouse.md`.
  - Signed-in shots and Lighthouse came from a mock Supabase and TMDB with fixture data mirroring the reference (`~/tools/mtg-mock` on gmk1), since the dev PC has no Supabase env and can't spare the RAM. Production build of `45db05b`, Lighthouse 13.5 mobile, median of 3: `/` 94 perf / 98 a11y, `/library` 86 / 92. Method and caveats in `baseline/lighthouse.md`.
- [x] Commit: `chore: baseline screenshots and metrics before spatial-glass redesign`

## Task 1: Retune design tokens (skill → app sync)
**Files:**
- Modify: `.agents/skills/dorfmovies-design/tokens/{colors,typography,spacing,effects,fonts,textures}.css`
- Copy to: `app/styles/design-system/tokens/` (byte-identical)
- Test: `app/styles/design-system/__tests__/designSystemSync.test.ts`

- [x] In `colors.css`, apply every row of spec §5.1's table: canvas, glass surfaces, cool zinc ramp, text ramp, borders, accent and gold ramps (green, teal and rust alias to aqua; amber to gold), tints, buttons and scrim. Keep every existing name. Add the new tokens (`--accent-tint`, `--accent-ring`, `--rating-empty`, `--ink`, `--glass-fallback`, `--glass-rim`). Rewrite the header comment to describe Spatial Glass.
- [x] In `effects.css`, set the radii (`sm 8, md 14, lg 16, xl 14, 2xl 28`), blur (`12/24/40/80`), shadows (§4.3) and glows. Add `--glass-blur: 40px`, `--glass-saturate: 160%`, `--ambient-blur: 80px`, `--ambient-saturate: 1.3`. Keep `/* @kind other */` annotations where they exist.
- [x] In `typography.css`, set `--font-sans` to `var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif` and update the role tokens to the §4.2 table (`--font-display` → 650 28px/34px, etc.).
- [x] In `spacing.css`, set `--sidebar-width: 232px`, add `--rail-width: 76px` and `--shell-pad: 24px`, and set `--content-max: 1440px`.
- [x] In `fonts.css`, swap the Outfit `@import` for `Inter:opsz,wght@14..32,400..700`. In `textures.css`, set `--grain-opacity: 0`.
- [x] Copy all changed files into `app/styles/design-system/tokens/` and confirm `designSystemSync.test.ts` passes.
- [x] Verify, then commit: `style(tokens): retune design tokens to spatial glass`

## Task 2: Font and metadata colours
**Files:** `app/layout.tsx`, `app/manifest.ts`, `app/icon.tsx`, `app/apple-icon.tsx`, every `opengraph-image.tsx`

- [x] Replace `Outfit` with `Inter({ subsets: ['latin'], axes: ['opsz'], variable: '--font-inter', display: 'swap' })`, apply `inter.variable` and `inter.className` on `<body>`, and add `font-optical-sizing: auto` to the body rule in `globals.css`. Check the `next/font` docs in `node_modules/next/dist/docs/` for the axes syntax.
- [x] `viewport.themeColor` → `#061015`; manifest `background_color` and `theme_color` → `#061015`.
- [x] Icons and OG images: canvas `#061015`, mark `#EAF6F9` rounded square with an `#08161C` "D" (copy the SVG from the reference sidebar), text `#F3F8FA`, accent `#8FE3F0`.
- [x] Verify, then commit: `style: switch to Inter and spatial-glass metadata colours`

## Task 3: Global CSS (Tailwind bridge, glass utilities, ambient base)
**Files:** `app/globals.css`

- [x] Keep the `@theme inline` bridge; it now resolves to the cool ramp automatically. Change `--color-white: var(--zinc-100)` (now `#F3F8FA`, still correct). Map the green, teal, amber and rust bridges to the aqua and gold ramps (spec §5.1).
- [x] `body`: `background-color: var(--surface-page); color: var(--text-primary); font-size: 15px; line-height: 22px; letter-spacing: -0.006em; -webkit-font-smoothing: antialiased`.
- [x] Delete the `body::after` grain rule and the gradient `.ambient-layer` rule; Task 4 replaces them. Keep the comment explaining why nothing is pinned with `background-attachment: fixed`.
- [x] Replace `.glass-panel` and `.glass-card` and add the other tiers:

```css
.glass-rim { position: relative; }
.glass-rim::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: var(--glass-rim); pointer-events: none; z-index: 3;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.glass-panel {
  background: var(--glass-panel);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 30px 60px -24px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.16);
  border-radius: 28px;
}
.glass-slab {
  background: linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.03)), rgba(9,20,27,.48);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-radius: 20px;
}
.glass-row {
  background: rgba(255,255,255,.05);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px rgba(255,255,255,.06);
  border-radius: 20px;
  transition: background var(--dur-fast) var(--ease-standard);
}
.glass-row:hover { background: rgba(255,255,255,.09); }
.glass-inset {
  background: rgba(0,0,0,.24); border-radius: 14px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,.30), inset 0 0 0 1px rgba(255,255,255,.07), 0 1px 0 rgba(255,255,255,.06);
}
.glass-btn {
  background: rgba(255,255,255,.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.20), inset 0 0 0 1px rgba(255,255,255,.06);
  transition: background var(--dur-fast) var(--ease-standard);
}
.glass-btn:hover { background: rgba(255,255,255,.22); }
.glass-card { /* legacy name: keep as an alias of .glass-row with radius 16 */
  background: rgba(255,255,255,.05);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px rgba(255,255,255,.06);
  border-radius: 16px;
}
.tabular { font-variant-numeric: tabular-nums; }
:where(a, button, input, select, textarea, [tabindex]):focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass-panel, .glass-slab { background: var(--glass-fallback); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass-panel, .glass-slab { background: var(--glass-fallback); -webkit-backdrop-filter: none; backdrop-filter: none; }
}
@media (forced-colors: active) {
  .glass-panel, .glass-slab, .glass-row, .glass-inset, .glass-btn, .glass-card { border: 1px solid CanvasText; }
}
```
- [x] Grep for leftover literals: `rg -n "#100e09|#15120c|#1b1711|#7c9a6a|#c4805f|#d3a85c|Outfit" app components lib`. Replace each with the matching token.
- [x] Verify, then commit: `style: glass utility tiers and cool tailwind bridge`

## Task 4: AmbientBackdrop
**Files:**
- Create: `components/AmbientBackdrop.tsx`
- Modify: `app/layout.tsx`, `app/(app)/layout.tsx`
- Test: `components/__tests__/AmbientBackdrop.test.tsx`

- [x] Create the component:

```tsx
'use client'
// One fixed, painted layer behind the app: the featured title's backdrop blurred
// 80px plus a tint. Fixed + filter is rasterised once and composited. Never
// animate the blur; only the opacity crossfades.
import { useEffect, useState } from 'react'

const TINT = 'linear-gradient(180deg, rgba(4,12,17,.50) 0%, rgba(4,12,17,.62) 55%, rgba(5,13,18,.84) 100%)'

export function toAmbientSrc(url: string | null | undefined) {
  // TMDB backdrops come in at w1280; w780 is plenty under an 80px blur.
  return url ? url.replace(/\/t\/p\/w\d+\//, '/t/p/w780/').replace('/t/p/original/', '/t/p/w780/') : null
}

export default function AmbientBackdrop({ src }: { src?: string | null }) {
  const url = toAmbientSrc(src)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => setLoaded(false), [url])
  return (
    <div aria-hidden="true" className="ambient" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative, blurred; next/image adds nothing here
        <img
          src={url}
          alt=""
          onLoad={() => setLoaded(true)}
          className="ambient-img"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%',
            filter: 'blur(var(--ambient-blur)) saturate(var(--ambient-saturate))', transform: 'scale(1.15)',
            opacity: loaded ? 1 : 0, transition: 'opacity 400ms var(--ease-standard)',
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: TINT }} />
    </div>
  )
}
```
- [x] In `globals.css`, add `@media (prefers-reduced-transparency: reduce) { .ambient-img { display: none } }` and `@media (prefers-reduced-motion: reduce) { .ambient-img { transition: none } }`.
- [x] `app/layout.tsx`: replace `<div className="ambient-layer" />` with a default `<AmbientBackdrop />` (tint only, with a faint aqua radial: `radial-gradient(1200px 600px at 20% -10%, rgba(143,227,240,.10), transparent 60%)` on the tint div when `src` is empty).
- [ ] Pages pass their featured art: Home → the first continue-watching show's backdrop; title page and modal → that title's backdrop; library-type pages → the most recently watched title. Render `<AmbientBackdrop src=… />` at the top of the page; it stacks above the default.
  - Library-type pages get the most recent watch from `components/RecentAmbient.tsx`, mounted in `app/(app)/layout.tsx`. Home and the title page wire theirs in Tasks 8 and 9.
- [x] Test `toAmbientSrc` (`w1280` → `w780`, `original` → `w780`, `null` → `null`) and that the image is `aria-hidden` with `alt=""`.
- [x] Verify, then commit: `feat: ambient backdrop layer that follows the featured title`

## Task 5: Data — backdrop and logo on media
**Files:**
- Create: `supabase/migrations/014_media_art.sql`, `app/api/admin/backfill-media-art/route.ts`
- Modify: `lib/tmdb.ts`, `lib/media.ts` (and any other `from('media')` insert/upsert sites: grep for them), `types/index.ts`
- Test: `lib/__tests__/tmdb.test.ts`

- [x] Migration:
```sql
-- Artwork the Spatial Glass design renders: a backdrop for the ambient layer and
-- hero, and the transparent title logo used as the hero title treatment.
alter table media add column if not exists backdrop_url text;
alter table media add column if not exists logo_url text;
```
- [x] `lib/tmdb.ts`: when `append` is true, extend `append_to_response` with `images` and pass `include_image_language: 'en,null'`. Add and export a pure `pickLogo(logos)`: prefer `iso_639_1 === 'en'`, then the highest `vote_average`, then the widest; return a `w500` URL or `null`. Return `logo_url` alongside the existing `backdrop_url`.
- [x] Unit-test `pickLogo` (prefers English, highest vote, `null` when empty) and that details mapping returns `logo_url`.
- [x] `lib/media.ts` (and every other media upsert site): write `backdrop_url` and `logo_url` when present. Hook into the existing metadata refresh (migration 013 `metadata_refreshed_at`) so old rows fill in lazily.
- [x] Backfill route following the `backfill-vote-average` pattern (admin-guarded, batched, idempotent).
- [x] Add both fields to the `Media` types and the dashboard, library and detail selects that need them.
  - Pages read the art through `fetchMediaArt` (`lib/mediaArt.ts`), a separate query, rather than in their main selects, so a database without 014 still serves those pages. The show page already selects `*`.
- [ ] **Stop and ask Richard** to apply `014_media_art.sql` (Supabase SQL editor or `supabase db push`) and run the backfill once.
  - Deferred to the Task 14 handback: Richard asked for the redesign to run through without stopping. Until 014 is applied, the art reads come back empty (`lib/mediaArt.ts`, `RecentAmbient`) and `upsertMedia` falls back to the 013 columns, so nothing breaks.
- [x] Verify, then commit: `feat(data): store backdrop and logo urls for media`

## Task 6: Shell (sidebar, rail, mobile bars, page frame)
**Files:** `components/Sidebar.tsx`, `components/ui/NavItem.tsx`, `app/(app)/layout.tsx`, `components/ui/Avatar.tsx`, `components/ui/Kbd.tsx`

- [x] `(app)/layout.tsx`: shell wrapper `max-w-[1720px] mx-auto p-6 gap-6 flex` (on `lg`). Main content `flex-1 min-w-0`. Remove the old `md:pl-[calc(var(--sidebar-width)+2rem)]` offset for `lg`; the sidebar is now in flow (sticky), not fixed. Keep the existing mobile top and bottom paddings below `md`.
- [x] `lg` and up: sidebar as `<aside className="glass-panel glass-rim">`, 232px wide, `align-self: stretch`, inner content `sticky top-6`. Order: wordmark (SVG mark from the reference + "DorfMovies" 17/22/650 -0.02em), search field (`.glass-inset`, 44px, magnifier icon, ⌘K `Kbd`; clicking opens the existing SearchOverlay, which stays the single search), nav list, a "Must watch" mini-list (top 5 must-watch posters, 24×36 radius 4, count right-aligned; data from the existing watchlist counts query, or omit if it needs a new query), then Settings at the bottom.
  - The Must watch list needed its own query (`components/SidebarMustWatch.tsx`: one `watchlist_items` read, five rows plus the count). It streams in through Suspense and renders nothing on error, and the spec lists it in §5.4, so it stayed. Items open the media modal with the watchlist page's handlers.
  - Nav labels keep the current copy (Dashboard, Recommendations); spec §1 keeps copy as is, so §5.4's list is read as the order only. In the rail, "Recommendations" breaks at a soft hyphen.
- [x] `md` to `lg`: compact rail, 76px wide (`--rail-width`), icon above a 11px label, same glass.
- [x] Under `md`: keep the current top bar, bottom tab bar and More drawer markup and behaviour. Swap the surfaces to `.glass-panel` with blur 24 (radius 0 for the bars; the drawer sheet gets radius 28 on top) and update item states.
- [x] `NavItem`: 44px tall, radius 14, gap 12, icon 20 and stroke 1.8; active `rgba(255,255,255,.15)` + `inset 0 1px 0 rgba(255,255,255,.14)`; hover `.08`; text 14/20/500 (600 when active). Keep `aria-current` and update `NavItem.test.tsx` assertions to the new classes.
- [x] `Avatar` and `Kbd`: per spec §5.5. Update `Kbd.test.tsx` if it asserts classes.
- [x] Check at 1440, 1100, 900, 768 and 390.
- [x] Verify, then commit: `style(shell): glass sidebar, compact rail and glass mobile bars`

## Task 7: UI primitives
**Files:** `components/ui/{Card,Button,Badge,Input,Select,SegmentedControl,PosterCard,MediaRow,StatTile,PageHeader,EmptyState,SectionError,Skeleton,ClearFilters,Eyebrow,BentoGrid}.tsx`, `components/RatingStars.tsx`; create `components/ui/{ProgressRing,SegmentedProgress,SectionHeader,DateStack}.tsx`

- [x] Rebuild each to spec §5.5 exactly, keeping the current props API (add props only when needed, e.g. `Card variant="panel|slab|row|inset"`, `Button variant="primary|secondary|icon|ghost"`).
- [x] New `ProgressRing` (48px, 4px stroke, `aria-label="6 of 10 episodes watched"`), `SegmentedProgress` (`role="img"` with the same aria-label), `SectionHeader`, `DateStack`.
- [x] `RatingStars`: gold `#F2C46D` and empty `rgba(236,245,249,.30)`; keep the half-star logic and click handlers.
- [x] `PosterCard`: no blur; radius 14; poster shadow + 1px ring; caption block; optional badges slot.
- [x] `Skeleton`: shimmer off under reduced motion.
- [x] `BentoGrid`: keep the export if pages still import it; Home no longer uses it after Task 8.
- [x] Update affected tests (`SegmentedControl.test.tsx`, `RatingStars.test.tsx`, and any others the run flags).
- [x] Verify, then commit: `style(ui): spatial-glass primitives`

## Task 8: Home dashboard
**Files:** `app/(app)/page.tsx`, `components/{ContinueWatchingRow,DashboardUpcoming,DashboardUpcomingWidget,DashboardRecentCards,DashboardSearchBar}.tsx`, `app/(app)/loading.tsx`

- [ ] Rebuild to match `reference/home.html` section by section, from the data the page already loads:
  1. Header: date eyebrow + "Good evening, {first name}" (pick the greeting from the hour) + a "Log a watch" glass pill and avatar on the right.
  2. Hero for the first continue-watching show: a glass frame (radius 28, hero-frame shadow) around the sharp backdrop (`backdrop_url`, `object-position` set so faces clear the slab). A `.glass-slab` on the left with logo (`logo_url`, falling back to the title in 44px/650 text), tagline or overview line, meta chips, `ProgressRing` + "6 of 10 episodes watched / 4 left this season · 3h 42m to go", the next-episode card (still + "Next · S2 · E7" in accent + name + runtime · air date) and actions (primary "Mark E7 watched", secondary "Episodes", icon Rate and Add to list). The `<AmbientBackdrop>` uses the same show.
  3. A two-column row: the "Up next" panel (`SectionHeader` + `MediaRow`s for the remaining shows with stills, platform, `SegmentedProgress` and a check button) and the "Coming soon" panel (DateStack list from the upcoming data, bookmark state).
  4. A "Recently watched" panel holding a horizontal `PosterCard` rail (scrolls inside the panel, no blur per card), with half-star ratings, dates and a Rewatch chip.
  5. "2026 so far": the stats panel (numerals + a recharts bar chart of hours per month, current month in accent) beside the "Because you watched X" card (recommendation backdrop, logo, meta, CTA).
- [ ] Empty states: no shows in progress → the hero becomes a "Pick something to watch" panel using the most recent watch's art; no upcoming → a quiet line in the panel.
- [ ] `loading.tsx`: skeletons in the same layout.
- [ ] Compare against `screenshots/home-desktop-top.jpg` and `home-mobile.jpg` at 1440 and 390, and fix the differences.
- [ ] Verify, then commit: `style(home): spatial-glass dashboard`

## Task 9: Title experience
**Files:** `app/(app)/show/[id]/page.tsx`, `components/{ShowDetailClient,MediaInfoModal,EpisodeTracker,EditEntryModal,SimilarModal,MediaModalStack,TonightPickModal}.tsx`, `app/(app)/person/[name]/page.tsx`

- [ ] Show page and modal per spec §5.6: hero composition with the title's backdrop and logo, status (ring or watched date and rating), actions, season `SegmentedControl`, episode `MediaRow`s with `still_url` (number, name, runtime, air date, synopsis, watched toggle; the next episode gets the accent ring), your rating and review panel, cast strip, "More like this" rail, and the "Streaming on X" row (first flatrate provider from the existing providers data).
- [ ] Modals: `.glass-panel` sheet, max-width 960, radius 28, scrim `var(--scrim)`; a full-screen sheet under `md`. Keep the existing focus trap, scroll lock, Escape handling and stack behaviour.
- [ ] Person page: header with the headshot and name, then a filmography grid of `PosterCard`s.
- [ ] Update `MediaInfoModal.footer.test.tsx` and `MediaInfoModal.rewatch.test.tsx` assertions if they target old classes.
- [ ] Verify, then commit: `style(detail): spatial-glass title page and media modal`

## Task 10: Library and grid pages
**Files:** `components/{LibraryView,LibraryFilterDrawer,FilterPills,SelectableOverlay,MediaCard,CollectionMovieCard,PopularCollectionsFeed}.tsx`, `components/ui/ClearFilters.tsx`, `app/(app)/{library,watchlist,collections,collections/[id],recommendations,streaming,search}/page.tsx`, `components/SearchOverlay.tsx`

- [ ] A toolbar `.glass-panel` holding search-within (`.glass-inset`), type `SegmentedControl`, sort `Select`, filter chips (active chips = `rgba(255,255,255,.16)` + an accent dot, with a remove ×), the grid/list toggle and a Select button for multi-select.
- [ ] Grid: `PosterCard`s, 5–6 columns at 1440, 3 at 768 and 2 at 390, gap 24 or 16. **No blur on cards.** List view: `MediaRow`s.
- [ ] `LibraryFilterDrawer` becomes a glass side sheet, or a bottom sheet under `md`.
- [ ] Watchlist: priority `SegmentedControl` (Must watch / Want to watch / Someday) + grid.
- [ ] `SearchOverlay`: a centred `.glass-panel` (max-width 720, radius 28), input `.glass-inset` 52px, result rows `.glass-row` with poster thumbs, keyboard selection highlighted with `rgba(255,255,255,.12)` + accent ring.
- [ ] Ambient on these pages = the most recently watched title.
- [ ] Profile `/library` scroll with 4× CPU throttle against the baseline; there must be no new long tasks.
- [ ] Verify, then commit: `style(library): spatial-glass grids, toolbar and search overlay`

## Task 11: Calendar and Stats
**Files:** `components/{CalendarClient,StatsCharts,DeferredStatsCharts}.tsx`, `app/(app)/{calendar,stats}/page.tsx`

- [ ] Calendar: a glass panel; release rows use `DateStack` + poster thumb + title + weekday·countdown + bookmark (accent when on the watchlist); month grid days use `.glass-row` cells, and today gets the accent ring.
- [ ] Stats: StatTile panels; recharts theme per spec §5.5 (bar fills, accent on the current or peak bar, gridlines, axis text, glass tooltip). Keep the deferred loading.
- [ ] Update `DeferredStatsCharts.test.tsx` if it asserts colours.
- [ ] Verify, then commit: `style(stats,calendar): spatial-glass charts and calendar`

## Task 12: Settings, import, auth, share, errors
**Files:** `app/(app)/{settings,import}/**`, `components/{ImportExportPanel,PasswordChangeForm,ShareToggle,ShareFooter,AuthShell,LoginForm,SignupForm,KeyboardHelp,KeyboardShortcutPanels,ToastProvider,BackButton,Presence}.tsx`, `app/(public)/**`, `app/{error,global-error,not-found}.tsx`, route `loading.tsx` / `error.tsx` files

- [ ] Settings and import: a 720px column of `.glass-panel` sections; destructive text `#FF9B9B`.
- [ ] Auth: a centred 420px glass card over a default ambient backdrop (a static popular title or the default tint).
- [ ] Public share pages: the library grid style, read-only, with the owner header.
- [ ] Toasts: `.glass-panel` radius 16, 14px text, icon in accent; keep the existing undo actions.
- [ ] Error, not-found and loading: glass panel with message + actions, and skeletons.
- [ ] Verify, then commit: `style: spatial-glass settings, auth, share, toasts and errors`

## Task 13: Design skill update
**Files:** `.agents/skills/dorfmovies-design/{SKILL.md,readme.md,guidelines/*,components/**/*.prompt.md}`, plus `app/styles/design-system/README.md` if wording changes

- [ ] Rewrite the skill's description of the visual language from Autumn Pine to Spatial Glass: principles, the tier rules and performance budget, the token table, and component recipes (point to spec §5.5). Remove the warm-brown and pine guidance. Archive the old explorations and UI kits under `explorations/autumn-pine/` or remove them.
- [ ] Update each `components/**/*.prompt.md` to the new recipe.
- [ ] Confirm the token copies are still byte-identical (sync test).
- [ ] Verify, then commit: `docs(design-skill): describe spatial glass`

## Task 14: QA, performance and PR
- [ ] Visual pass: every route at 1440, 1100, 900, 768 and 390. Save screenshots to `docs/designs/spatial-glass/after/` and compare with the reference and the baseline. No horizontal overflow anywhere.
- [ ] Accessibility: keyboard-only pass through the shell, search overlay, modal stack and the episode toggles. Check contrast on the three lightest backdrops in your library (spec §5.3). Turn on reduced motion, reduced transparency and forced colours and check each.
- [ ] Performance: Lighthouse mobile on `/` and `/library` against the baseline (no regression) and a scroll profile on `/library`.
- [ ] Leftover grep: `rg -n "#100e09|#15120c|#1b1711|#7c9a6a|#c4805f|#d3a85c|Outfit|--orb-|ambient-layer" app components lib`, which should return nothing.
- [ ] `npm run lint && npm run test:run && npm run build` all green.
- [ ] Push the branch and open a PR titled "Spatial Glass redesign" with before and after screenshots. Vercel builds a preview for Richard to check on his phone.
- [ ] Hand back to Richard: preview URL, the migration and backfill status, and any deviations from the spec with the reasons.
