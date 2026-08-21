# Frontend deep-dive audit — 2026-08-21

Scope: `app/`, `components/`, `lib/` (client-facing), `app/globals.css`, the design
system in `.agents/skills/dorfmovies-design/`, `next.config.ts`, `proxy.ts`.
Read at commit `5ec2d6c`, on `master`, clean tree.

This audit does **not** restate `docs/AUDIT-UX-2026-08-18.md`. That pass landed and
its findings (U1–U31, X1–X2) are confirmed present in the code. Everything below is
new, or is a regression/gap in what that pass produced.

Verified state at time of audit:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean, 0 errors / 0 warnings |
| `npm run build` | succeeds, 47 routes |
| `npm run test:run` (parallel) | **1 failure in ~1 of 4 runs** — see F-31 |
| `npx vitest run --no-file-parallelism` | 298/298, 3/3 runs |
| Routes prerendered as static | **1 of 47** (`/manifest.webmanifest`) |
| Total client JS emitted | 1.6 MB across chunks (largest 359 KB) |

---

## Executive summary

The app is in good shape structurally — strict TS, clean lint, a real focus-trap
implementation, deferred-write undo, URL-mirrored filters, batched TMDB rating
lookups. The problems are concentrated in four places:

1. **One broken feature.** The Recommendations *Refresh* button is defeated by a
   `useCallback`/`useEffect` dependency cycle. It fires three requests and lands
   back on the original result set. (F-01)
2. **Design-system drift is now the dominant visual problem.** 236 cold-white
   utilities on a warm canvas, six different toggle treatments, an auth flow still
   on the pre-rebrand violet/orange palette with white pill buttons, a gold hover
   ring on the five most-used card surfaces, and two public share pages that never
   got the design system at all.
3. **Keyboard access is broken on the primary interaction.** The library list row,
   the watchlist card, the recommendation card and the person-page credit card are
   all `<div onClick>` with no role, tabindex or key handler. You cannot open a
   title's details from the keyboard on four of the app's main surfaces.
4. **Nothing is cached and several things are unbounded.** Every route is dynamic,
   auth is resolved 2–3× per navigation, the whole watch history is downloaded on
   library load *and on every tab focus*, and four unbounded queries silently
   truncate at PostgREST's 1000-row cap.

Suggested order of work is in [Prioritised roadmap](#prioritised-roadmap) at the end.

---

## Tier 0 — Broken or wrong

### F-01 · Recommendations "Refresh" is defeated by a dependency cycle
`app/recommendations/page.tsx:63`, `:98`, `:102-106`

`loadRecommendations` is a `useCallback` with `[seedCycle]` in its deps, it calls
`setSeedCycle` internally, and the mount effect depends on `[loadRecommendations]`:

```ts
const loadRecommendations = useCallback(async (refresh = false) => {
  const nextCycle = refresh ? seedCycle + 1 : 0
  ...
  setSeedCycle(nextCycle)          // ← mutates the dep
}, [seedCycle])                     // ← which changes the identity

useEffect(() => { loadRecommendations() }, [loadRecommendations])  // ← which refires
```

Pressing Refresh runs:

1. `loadRecommendations(true)` → fetches `?refresh=1&cycle=1` → `setSeedCycle(1)`
2. identity changes → effect refires → `loadRecommendations()` with `refresh=false`
   → **fetches the bare, un-rotated endpoint and overwrites the refreshed results**
   → `setSeedCycle(0)`
3. identity changes again → effect refires → a third identical fetch

Net effect: three network round-trips, and the user ends up looking at the original
recommendation set. This is exactly the U3/U4 behaviour the last audit built, and it
is currently inert.

**Fix:** hold the cycle in a ref (`seedCycleRef`) and drop `seedCycle` from the
callback deps, or split the mount fetch out of the shared callback with a
`didMount` ref guard the way `useTmdbSearch` already does. Add a test that asserts
exactly one `fetch` per Refresh press and that the `cycle` param increments.

### F-02 · `pb-safe-bottom` and `scrollbar-none` are undefined classes
`components/Sidebar.tsx:210`, `:263`; `app/streaming/page.tsx:181`;
`components/MediaInfoModal.tsx:387`; `components/SimilarModal.tsx:123`;
`components/Sidebar.tsx:98`

Neither utility exists. Tailwind v4 ships neither, and nothing in `globals.css` or
the design system defines them via `@utility`. Both silently compile to nothing.

Consequences:
- The mobile bottom nav and the More drawer have **no safe-area padding**. On an
  iPhone with a home indicator the nav labels sit inside the gesture area.
- Four scroll containers still show scrollbars.

Compounding it: `app/layout.tsx:18` exports `viewport` without `viewportFit: 'cover'`,
so `env(safe-area-inset-bottom)` would resolve to `0` even once the utility exists.

**Fix:** add `viewportFit: 'cover'` to the viewport export, then define both in
`globals.css`:

```css
@utility pb-safe-bottom { padding-bottom: calc(0.5rem + env(safe-area-inset-bottom)); }
@utility scrollbar-none { scrollbar-width: none; &::-webkit-scrollbar { display: none } }
```

### F-03 · `<Link>` wrapping a `<button>` on the Franchises page
`app/collections/page.tsx:73-79`

`PosterCard`'s root element is a `<button>` (`components/ui/PosterCard.tsx:26`), and
the collections grid wraps it in a `<Link>`. `<a>` containing `<button>` is invalid
HTML; browsers recover inconsistently, and keyboard activation lands on the inner
button, which has no handler.

**Fix:** give `PosterCard` an optional `href` that renders its root as a `Link`
instead of a `button` — the same shape `NavItem` already uses.

### F-04 · Auth pages get a guaranteed vertical scrollbar
`app/layout.tsx:60`, `components/AuthShell.tsx:24`

The root layout always renders `<main className="... px-4 py-6 md:px-8 md:py-8 ... pb-8">`.
`AuthShell` then sets `min-h-screen` inside it. Total document height is
`100vh + 24px + 32px` on every auth route. Two ambient orb layers also stack: the
layout's pine/rust/amber set at `app/layout.tsx:38-45` and AuthShell's own
violet/orange set at `components/AuthShell.tsx:26-31`.

**Fix:** either give the auth routes their own route group with a bare layout
(`app/(auth)/layout.tsx`), or change `min-h-screen` to `min-h-[calc(100dvh-3.5rem)]`
and drop AuthShell's orbs in favour of the layout's.

---

## Tier 1 — Accessibility

### F-05 · The primary "open details" interaction is mouse-only on four surfaces
`components/ui/MediaRow.tsx:41` · `components/ui/Card.tsx:15` ·
`app/recommendations/page.tsx:398` · `app/person/[name]/page.tsx:69`

All four are `<div onClick={...}>` with no `role="button"`, no `tabIndex={0}`, no
`onKeyDown`. That covers:

- **Library, list view** (the default) — `MediaRow`
- **Watchlist cards** — `Card` with `onClick`
- **Recommendation cards** — bare div
- **Person credit cards** — `Card` with `onClick`

A keyboard user can reach the edit/delete chips inside these cards but cannot open
the modal that is the card's whole purpose. The poster/grid variants are fine —
`PosterCard` and the streaming grid both use real `<button>` roots — which is what
makes this inconsistency easy to miss.

**Fix:** the cheapest correct change is to make `Card` and `MediaRow` render a
`<button type="button">` root when `onClick` is present (as `PosterCard` does), and
convert the two inline divs the same way. Watch for nesting: the action chips inside
`MediaRow` already `stopPropagation`, but nested `<button>` is invalid — hoist them
out of the root the way `MediaCard`'s poster variant already does
(`components/MediaCard.tsx:70-75` has the right pattern and the comment explaining it).

### F-06 · Not one form control in the app has an accessible name
`app/watchlist/page.tsx:120,130,139` · `components/LibraryView.tsx:243,253` ·
`components/EditEntryModal.tsx:78,82,86` · `components/PasswordChangeForm.tsx:62,73` ·
all of `components/AuthShell.tsx`

- 28 inputs/selects, **5 `<label>` elements, none with `htmlFor` and none wrapping
  their control.** They are decorative text.
- All five `<select>` elements have no `label`, no `aria-label`, no `id`. A screen
  reader announces "combo box, All Genres" with no indication of what it filters.
- Every text input is labelled by placeholder only — login email/password, all four
  signup fields, both search boxes, the review textarea. That is WCAG 3.3.2, and it
  also means the label vanishes the moment the user types.

**Fix:** `htmlFor`/`id` pairs on the five existing labels; `aria-label` on the five
selects and on the two search inputs; visible labels (or at minimum `aria-label`) on
the auth fields. This is mechanical and worth doing in one pass.

### F-07 · Watched/unwatched episodes are distinguished by colour alone
`components/EpisodeTracker.tsx:129-160`

Episode buttons carry no `aria-pressed`, no checkmark, no text state — only
`background: var(--teal-tint-bg)` vs `rgba(255,255,255,0.04)` and a border colour.
Both tints are under 3:1 against the card. For a colour-blind user, or anyone on a
dim screen, a 24-episode season is indistinguishable from an unwatched one.

The season accordion headers (`:82`) also lack `aria-expanded` / `aria-controls`.

**Fix:** add `aria-pressed={watched}` to the episode buttons and a small `Check`
glyph in the watched state; add `aria-expanded`/`aria-controls` to the headers.

### F-08 · Toasts auto-dismiss with no pause and no cap
`components/ToastProvider.tsx:87`, `:105`

A toast disappears after 5 s (5.5 s for undo toasts) on a hard `setTimeout`, with no
pause on hover or focus. WCAG 2.2.1 requires a way to extend or pause timed content;
a dismiss button is not that. The undo toasts are worse, because the timer is racing
the user's decision. There is also no cap on the stack — a bulk action or repeated
clicks pushes an unbounded column of toasts up the screen.

**Fix:** clear the timer on `mouseenter`/`focusin` and restart on
`mouseleave`/`focusout`; cap the stack at 3 and drop the oldest.

### F-09 · The mobile "More" drawer is not a dialog
`components/Sidebar.tsx:199-259`

It has no `role="dialog"`, no `aria-modal`, no focus trap, no Escape handler, and no
body scroll lock. `lib/useModal.ts` provides all four and is used correctly by every
other overlay in the app — this one was never wired to it.

**Fix:** `const { containerRef } = useModal(() => setMoreOpen(false))` on the drawer
panel, plus `role="dialog" aria-modal="true" aria-label="More"`.

### F-10 · Bulk-select checkbox has no accessible name
`components/SelectableOverlay.tsx:38-52`

This control wraps every selectable card in the app and is an icon-only `<button>`
with no `aria-label` and no `aria-pressed`. The floating action bar
(`components/MultiSelectProvider.tsx:152`) has no `role="toolbar"` and no live region,
so entering select mode and the selected count are both silent.

**Fix:** `aria-label={`Select ${item.title}`}` + `aria-pressed={isSelected}`;
`role="toolbar" aria-label="Bulk actions"` on the bar and `aria-live="polite"` on the
count.

### F-11 · Contrast failures on active filter states
`components/FilterPills.tsx:25` · `app/streaming/page.tsx:188`, `:236`

`text-white` on `--accent` (`#7c9a6a`) is **3.13:1** — below the 4.5:1 required for
11–12 px bold label text. This is the active state of every `FilterPills` row (library
sort, library rating, streaming sort, recommendations type, recommendations genre),
the streaming provider pills, and the Hide-watched toggle.

The design system already has the right value: `--btn-primary-fg` is `#11160d`, which
gives **5.9:1**. `CalendarClient.tsx:70` uses `text-zinc-950` on green and is correct
— it is the only one.

Also flagged: `text-zinc-600` (`#776d5b`, **3.35–3.52:1** depending on surface) is used
for 26 pieces of real informational copy, not decoration — "No matches for X",
"Searching…", "No matching items.", the ⌘K footer shortcut legend, import status
labels. Those need `--text-muted` (`#918470`, 4.96:1) at minimum.

**Fix:** change `FilterPills` and the two streaming call sites to
`text-[var(--btn-primary-fg)]`. Sweep `text-zinc-600` → `text-zinc-500` wherever the
text is informational rather than a placeholder glyph.

### F-12 · Reduced motion is only half-honoured
`app/globals.css:145-156`

The media query zeroes `transition-duration` and `animation-duration`, and resets
`.glass-card:hover`'s transform. But every inline-style hover in the app applies its
transform through React state, not CSS, so the query cannot reach it:

- `PosterCard` — `scale(1.02)` on the card **and** `scale(1.10) rotate(1deg)` on the
  image (`components/ui/PosterCard.tsx:34`, `:63`)
- `MediaRow` — `translateY(-2px) scale(1.01)` (`components/ui/MediaRow.tsx:50`)
- `Card` — `translateY(-2px)` (`components/ui/Card.tsx:23`)
- `NavItem` — icon `scale(1.1)` (`components/ui/NavItem.tsx:44`)

With transitions zeroed these become *instant jumps*, which is worse for a
vestibular-sensitive user than the animation was. Tailwind hover-translates
(`hover:-translate-y-0.5` on the recommendation and streaming cards) have the same
problem.

`MotionProvider` correctly covers framer-motion. This is the CSS/inline half.

**Fix:** a `usePrefersReducedMotion()` hook read by the four primitives, or move the
hover treatment to CSS classes so the existing media query catches it. The latter is
better — see F-19.

---

## Tier 2 — Performance and data

### F-13 · Every route is dynamic; auth is resolved 2–3× per navigation
`app/layout.tsx:22-29` · `proxy.ts:40` · `lib/supabase/server.ts:26`

The build confirms it: **46 of 47 routes are `ƒ` (dynamic)**, including `/login`,
`/signup`, `/forgot-password` and both public `/share/*` pages, none of which need a
session.

The cause is the root layout awaiting `supabase.auth.getUser()` to decide whether to
render the `Sidebar`. Worse, it calls `createClient()` + `getUser()` **directly**
rather than through the `getAuthenticatedUser()` React-cached helper that exists two
lines below it in the same file. So a dashboard load resolves auth three times:
`proxy.ts` → root layout → `app/page.tsx`.

**Fix, in order of value:**
1. One-line win — swap the layout's raw call for `getAuthenticatedUser()`. Dedupes
   layout + page into one request. `proxy.ts` still costs one, which is unavoidable.
2. Move the auth-gated shell into a `(app)` route group layout and put the public
   routes (`/login`, `/signup`, `/forgot-password`, `/share/*`) in a sibling group
   with no auth call. Those six routes become statically renderable and CDN-cacheable.
   This also solves F-04 for free.

### F-14 · The entire watch history is downloaded on library load *and every tab focus*
`components/LibraryView.tsx:74-114` · `app/api/watch/route.ts:24-38`

`GET /api/watch` has no `.limit()` and no `.range()`. It returns every entry with
`genres`, `cast_members` (an array of actor names), `director`, `overview` stripped
but everything else intact. `LibraryView` fetches the whole thing, then filters and
paginates in the browser.

Two consequences:

- **Silent truncation.** PostgREST's hosted `max-rows` default is 1000. A user past
  1000 logged titles gets a library that is quietly wrong, with a "1000 watched"
  count that never grows.
- **Refetch on focus is unthrottled** (`:99-114`). Alt-tabbing to another app and
  back re-downloads the entire library. On a 900-entry library with cast arrays that
  is a multi-hundred-KB payload per tab switch.

The same 1000-row ceiling applies to three more unbounded queries:
`app/stats/page.tsx:47-56` (both queries), `app/collections/page.tsx:19-21`, and
`lib/useLibraryIds.ts:25-28`.

**Fix:** stale-gate the focus refetch (skip if the last fetch was <30 s ago) as a
one-line stopgap. Longer term, move the filter/sort/paginate work server-side the way
`/api/watchlist` already does — it takes `page`, `limit`, `type`, `genre`, `q` and
`sort` and returns a `total`. The library is the only major list that didn't get that
treatment.

### F-15 · `useLibraryIds` re-downloads the whole library on every ⌘K
`lib/useLibraryIds.ts:21-39` · `components/KeyboardShortcuts.tsx:65`

`KeyboardShortcuts` renders `open ? <SearchOverlay/> : null`, so the overlay mounts
fresh on every open, so `useLibraryIds` re-runs. It issues two unbounded browser-side
Supabase queries — the full `watch_entries` and full `watchlist_items` id sets — purely
to compute two `Set<number>`s for the ✓/+ badges.

It is also the last remaining direct browser→Supabase read outside the API layer; the
X2 refactor moved `/show/[id]` off this pattern but left this one.

The streaming page mounts it too (`app/streaming/page.tsx:62`), so the same two
queries fire on that route.

**Fix:** a dedicated `/api/library/ids` returning two arrays of `tmdb_id` (a single
projection, no joins), hoisted to a provider above `KeyboardShortcuts` so it is
fetched once per session rather than once per overlay open. Cache it in a module-level
map the way `MediaInfoModal`'s `detailsCache` does.

### F-16 · The dashboard blocks on a TMDB call that could stream
`app/page.tsx:47-65`

`fetchUpcomingReleases()` sits inside the top-level `Promise.all`. The fetch *is*
cached (`lib/tmdb.ts:633`, `revalidate: CACHE_12H`) with an 8 s abort, but on a cold
cache the whole dashboard — stats tiles, Continue Watching, Recently Watched — waits
behind it. There is also a second sequential round-trip after the first `Promise.all`
resolves (`:69-84`), because the seasons/progress queries depend on `mediaIds`.

**Fix:** wrap `<DashboardUpcomingWidget>` in `<Suspense>` with a skeleton and move its
data fetch into the widget's own async component. The bento grid paints immediately and
the release calendar streams in. `app/loading.tsx` already has the right skeleton shape
to reuse.

### F-17 · `MultiSelectProvider` re-renders the whole page on every card mount
`components/MultiSelectProvider.tsx:53-59` · `components/SelectableOverlay.tsx:22-27`

`register()` calls `setSelectableCount(...)` on every registration. `SelectableOverlay`
wraps every selectable card in the app and registers in a mount effect. The provider
sits above `{children}` in the root layout, so each registration re-renders the entire
page subtree. A library page mounting 24 cards, then 24 more on infinite scroll, drives
that many full-tree renders.

**Fix:** the ref-based registry is already right; only the count needs to reach React.
Debounce the `setSelectableCount` into a microtask or `requestAnimationFrame` so a
burst of registrations collapses to one state update.

### F-18 · Bulk actions fire unbounded parallel requests
`components/MultiSelectProvider.tsx:85-112`

`Promise.allSettled` over the whole selection, with **no concurrency limit** — and the
bar explicitly offers "Select all {selectableCount}". Selecting 500 titles fires 500
simultaneous `POST /api/watch`, each of which does an auth check, an `upsertMedia`
(which may hit TMDB), a duplicate check and an insert.

**Fix:** a small concurrency pool (4–6 at a time) with progress in the action bar, or
a batch endpoint that takes an array.

### F-19 · Hover state is React state on the four hottest primitives
`components/ui/Button.tsx:24` · `Card.tsx:9` · `PosterCard.tsx:21` · `MediaRow.tsx:35` ·
`NavItem.tsx:13` · `Input.tsx:19`

Six primitives track hover/focus in `useState` and apply it through inline styles.
Every pointer enter/leave is a React render. On a 24-card grid that is 24 independent
re-render paths driven by mouse movement — and it forces `'use client'` on components
that would otherwise be server-renderable (`Button`, `Input` and `NavItem` don't even
have the directive; they work only because every importer happens to be a client
component — see F-27).

It also makes F-12 unfixable without a hook, and blocks `:focus-visible` styling
(a keyboard user gets no hover-equivalent affordance).

**Fix:** move these to CSS. `globals.css` already carries `.glass-card:hover` with the
full treatment and a reduced-motion override; extending that pattern to
`.poster-card`, `.media-row`, `.nav-item` and the button variants removes six
`useState`s, the client-component requirement, and F-12 in one change.

### F-20 · Continue Watching posters bypass `next/image`
`components/ContinueWatchingRow.tsx:176`

The poster is a CSS `background-image: url(...)`, so it gets no optimisation, no
responsive `sizes`, no AVIF/WebP, no lazy loading — and it bypasses the
`remotePatterns` allowlist in `next.config.ts` entirely. Every other card in the app
uses `next/image`. On the dashboard this is up to 10 unoptimised TMDB JPEGs above the
fold.

Related: **no `<Image>` anywhere in the app sets `priority`**, so the LCP image on
every route is lazy-loaded.

**Fix:** convert to `<Image fill sizes="64px" />` and set `priority` on the first
Continue Watching poster and the first row of Recently Watched.

### F-21 · The user's email address is sent to `api.dicebear.com` on every page load
`components/Sidebar.tsx:161`, `:192`

```tsx
src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(userEmail)}
```

The raw email is the URL query parameter, sent to a third party on every render of the
sidebar — i.e. every authenticated page load, twice (desktop rail + mobile bar). It is
also a render-blocking external request on the critical path, and a hard dependency on
a service the app doesn't control.

**Fix:** hash the email before using it as a seed (`sha256(email).slice(0,16)`), or
better, drop the dependency and render initials in a tinted circle — the design system
has the tint tokens for it and it costs zero requests.

---

## Tier 3 — Design system drift

The brand is well specified in `.agents/skills/dorfmovies-design/` — warm brown-black
canvas, warm-stone text ramp, flat opaque surfaces, pine accent, tight 4–12 px radii,
Lucide icons only. The app diverges from it in six systematic ways.

### F-22 · 236 cold-white utilities on a warm canvas
`globals.css:16-63` bridges Tailwind's `zinc-*` and the legacy hue aliases into the
design system's warm ramp. It does **not** bridge `white`, and nothing can — `white`
is `#ffffff` by definition.

| Utility | Count |
| --- | --- |
| `text-white` | 110 |
| `border-white/5` | 27 |
| `bg-white/5` | 26 |
| `bg-white/10` | 26 |
| `border-white/10` | 21 |
| `bg-white` | 11 |
| `border-white` | 9 |
| others (`/15`, `/20`, `/70`, `via-`) | 6 |
| **total** | **236 across 44 files** |

Plus 24 hardcoded `rgba(255,255,255,…)` literals in inline styles, including in the
primitives themselves (`Badge.tsx:12` neutral tone, `NavItem.tsx:30` active background).

The system's replacements already exist: `--text-primary` (`#e9e2d3` warm cream) for
`text-white`, and `--border-subtle` / `--border-default` / `--btn-ghost-bg` for the
white-alpha overlays.

**Fix:** this is a mechanical sweep, best done as one commit with a screenshot diff.
`text-white` → `text-[var(--text-primary)]`, `bg-white/5` → `bg-[var(--btn-ghost-bg)]`,
`border-white/10` → `border-[var(--border-default)]`. Then add an ESLint
`no-restricted-syntax` rule banning `-white` class names so it can't come back.

### F-23 · The hover ring on every card surface is off-palette gold
`.agents/skills/dorfmovies-design/tokens/effects.css:30-33`

```css
--glow-violet: ... 0 0 0 1px rgba(216, 166, 78, 0.30);   /* gold */
--glow-rose:   ... 0 0 0 1px rgba(207, 82, 54, 0.35);    /* brick */
--glow-live:       0 0 0 1px rgba(207, 82, 54, 0.40) ...
```

These are pre-"Autumn Pine" values that were never retuned. `--glow-violet` is used on
`Card`, `PosterCard`, `MediaRow`, the recommendation cards and Continue Watching —
the five most-used surfaces. Meanwhile `globals.css`'s `.glass-card:hover` uses
`--border-strong`, which is pine `rgba(124,154,106,0.42)`.

So on a page mixing `.glass-card` elements with `Card`/`MediaRow` elements, hovering
produces **two different coloured rings**. Neither `216,166,78` nor `207,82,54` matches
the current amber (`#d3a85c` = 211,168,92) or rust (`#ad6647` = 173,102,71) tokens.

**Fix:** retune the three glow tokens to derive from `--green-500` / `--rust-400` /
`--amber-400`, and rename them (`--ring-accent`, `--ring-live`) so the violet/rose
names stop implying a palette that no longer exists.

### F-24 · Six different toggle/segmented-control treatments
| Where | Treatment | Active state |
| --- | --- | --- |
| `FilterPills.tsx:25` | `rounded-sm` pill row | `bg-[var(--accent)] text-white` ❌ contrast |
| `streaming/page.tsx:184` | `rounded-full` + framer `layoutId` | `bg-[var(--accent)] text-white` ❌ |
| `streaming/page.tsx:211` | segmented, `bg-[var(--surface-input)]` | `bg-white/10 text-white` |
| `LibraryView.tsx:270` | segmented, `bg-[var(--surface-input)]` | `bg-white/10 text-white` |
| `CalendarClient.tsx:63` | segmented, `bg-black/40 p-1.5` | `bg-green-500 text-zinc-950` ✅ |
| `SearchOverlay.tsx:262` / `StatsCharts.tsx:47` | `rounded-full` text pills | `bg-white/[0.08] text-white` |

Six visual languages for the same interaction, three of which disagree on the active
foreground colour, and only one of which passes contrast. `FilterPills` exists and was
extracted precisely to stop this — it just never absorbed the other five.

Similarly, there are **two search triggers** with different shapes:
`DashboardSearchBar.tsx:11` is `rounded-full h-11`, `Sidebar.tsx:88` is
`rounded-[var(--radius-md)] h-9`. Both hardcode `⌘K` regardless of platform, even
though `KeyboardShortcuts.tsx:14` correctly accepts Ctrl.

**Fix:** promote `FilterPills` to the single toggle primitive with a `variant` prop
(`pills | segmented`), fix its active foreground to `--btn-primary-fg`, and migrate the
other five. Add a `<Kbd>` component that detects platform once and renders `⌘K` or
`Ctrl K`.

### F-25 · The auth flow is still on the pre-rebrand palette
`components/AuthShell.tsx` — the entire file

This is the first screen every user sees, and it is the least on-brand surface in the
app:

| Line | Current | Should be |
| --- | --- | --- |
| `:24` | `background: '#0d0d0f'` (cold near-black) | `--surface-page` `#100e09` |
| `:27` | orb `rgba(109,40,217,.18)` — **violet** | `--orb-violet` (pine) |
| `:29` | orb `rgba(234,88,12,.14)` — **orange** | `--orb-rose` (amber) |
| `:33` | `rounded-3xl` (24 px) + `backdrop-blur-md` | `--radius-2xl` (12 px), no blur |
| `:34` | `rgba(255,255,255,0.04)` panel | `--surface-modal` |
| `:47` | inputs `rounded-full` | `--radius-sm` (4 px) |
| `:60` | submit button **solid `#ffffff`** | `--btn-primary-bg` (pine) |
| `:71` | error `rgba(225,29,72,…)` — raw crimson | `--rust-tint-bg` |
| `:80` | notice `rgba(16,185,129,…)` — raw emerald | `--teal-tint-bg` |
| `:36` | title as plain white text | `Dorf` cream + `Movies` pine wordmark |

The file's own comment justifies the hardcoding: *"these screens render before the app
shell and its CSS variables are in play."* **That is not true.** `globals.css` is
imported by the root layout and applies to every route including `/login`; the
variables are available. The comment is why the drift was never caught.

**Fix:** rewrite `AuthShell` against the tokens, use the wordmark treatment for the
title, and delete the stale comment. Combine with F-04's route-group change.

### F-26 · The two public share pages never got the design system
`app/share/watched/[token]/page.tsx` · `app/share/watchlist/[token]/page.tsx`

These are the *only* pages a non-user ever sees, and they are pre-design-system
leftovers: `bg-gray-900` cards (cold grey on a warm canvas), `text-gray-300` /
`text-gray-400`, `rounded-xl`, a bare `<h1 className="text-2xl font-bold">` instead of
`PageHeader`, no `Eyebrow`, no wordmark, no owner attribution.

Also missing:
- **No `generateMetadata`.** A shared link previews in iMessage/Slack/Discord as
  "DorfMovies — Track your movies, TV shows, and watchlists." with no image. For a
  share feature that *is* the product.
- Raw ISO dates (`entry.watched_at` printed directly at `watched/page.tsx:27`) instead
  of `formatDateLabel` from `lib/formatDate.ts`.
- No empty state — a valid share with no visible rows renders a bare heading.

**Fix:** rebuild both on `PageHeader` + `MediaRow`/`PosterCard`, add a
`generateMetadata` with an OG image, add the wordmark and a "Shared from DorfMovies"
footer, and use `formatDateLabel`.

### F-27 · Primitives use hooks without `'use client'`; `Button` has a dead API
`components/ui/Button.tsx` · `Input.tsx` · `NavItem.tsx` · `MediaRow.tsx`

All four call `useState` with no `'use client'` directive. They work today only
because every importer happens to be a client component. The first server component
that imports `Button` — a plausible thing to do on `app/page.tsx` or `app/settings/page.tsx`
— fails at runtime with an unhelpful error.

Separately, `Button` declares `icon` and `iconRight` props, eslint-disables them as
unused, and **never renders them** (`components/ui/Button.tsx:16-19`). Any caller
passing `icon={<Plus/>}` gets nothing, silently. Every current call site works around
it by passing the icon as a child.

There is also a **dual hover system**: `Button` tracks hover in `useState` and writes
inline `background`, while eight call sites add `hover:!bg-rose-600` /
`hover:!bg-violet-600` etc. The `!important` class wins, so the component's own hover
logic is dead on those buttons. Two mechanisms, one of them inert.

**Fix:** add `'use client'` to all four (or better, remove the state per F-19); delete
`icon`/`iconRight` or actually render them; give `Button` a `tone` prop
(`default | destructive | success`) so callers stop reaching for `!important`.

### F-28 · Native `<select>` with `appearance-none` and no replacement chevron
`components/LibraryView.tsx:246`, `:256` · `app/watchlist/page.tsx:123`, `:133`, `:142`

All five selects strip the native dropdown arrow with `appearance-none` and never draw
one. They render as static-looking labels with no affordance that they are interactive.

**Fix:** wrap in a relative div with an absolutely-positioned `ChevronDown` and
`pointer-events-none`, or use a `background-image` chevron. Fixing F-06's `aria-label`
gap at the same time makes this one edit per select.

### F-29 · Blur used 26 times against an explicitly flat system
`grep -c backdrop-blur` → 26 (13 `-md`, 4 `-xl`, 4 `-sm`, 5 inline `blur(var(--blur-md))`)

`effects.css:19-23` sets all four blur tokens to `0px` deliberately — the SKILL.md says
"**flat opaque** cards … no backdrop-blur — the blur tokens are deliberately `0`".
The five inline uses correctly read the (zero) token, which means they are no-ops that
still create a compositing layer per element — `MediaRow` does this on every library
row. The 21 Tailwind uses bypass the token entirely and apply real blur, which is the
one thing the brand rules out.

**Fix:** delete the five inline no-ops; replace the 21 Tailwind blurs with an opaque
scrim (`--scrim` already exists at `rgba(10,8,5,0.82)` and is what the modals should be
using).

### F-30 · Assorted design-system misses
- **Star glyphs instead of Lucide.** `RatingStars.tsx:45,50`, `MediaRow.tsx:92`,
  `StatsCharts.tsx:141` use the `★` character; `MediaInfoModal.tsx:414` and the
  streaming/recommendations cards use Lucide `<Star>`. SKILL.md: "Lucide icons only; no
  emoji." The glyph also renders differently per platform and can't be half-filled
  cleanly. `RatingStars` additionally uses `--zinc-700` (**1.52:1**) for empty stars —
  effectively invisible, so an unrated row gives no hint that it is rateable.
- **Chart colours hardcoded.** `StatsCharts.tsx:6-14` duplicates eight palette hexes
  plus `#9d9079` axis and `#1b1711` stroke as literals. Retheming the token file won't
  reach the charts.
- **PWA theme colour is wrong.** `app/manifest.ts:11-12` and `app/layout.tsx:19` both
  set `#030303` (cold near-black). The canvas is `#100e09` (warm brown-black). On a
  mobile PWA the status bar and splash are visibly a different colour from the app.
- **No favicon at all.** No `app/icon.*`, no `app/favicon.ico`, no `public/favicon.ico`.
  Only the two manifest PNGs exist. Browser tabs show the default globe. The manifest
  also has no `maskable` icon and no `apple-touch-icon`.
- **`--content-max` is double-applied.** `app/layout.tsx:66` wraps every route in
  `max-w-[var(--content-max)]` (1280 px) and `BentoGrid.tsx:16` adds `max-w-7xl mx-auto`
  (also 1280 px) inside it.
- **`--sidebar-width` is 256 px in the tokens; the layout hardcodes `md:pl-72`** (288 px)
  at `app/layout.tsx:63` and `w-64` at `Sidebar.tsx:69`. Three numbers, two of which
  disagree with the token.

### F-31 · The design system is imported from an agent-tooling directory
`app/globals.css:1`

```css
@import "../.agents/skills/dorfmovies-design/styles.css";
```

Every colour, type, spacing, effect and texture token the app renders comes from inside
a **Claude/agent skill folder**. `next.config.ts:16-21` even documents the workaround
needed to keep the relative path resolving. If that folder is moved, regenerated by a
skill update, or excluded from a deployment artifact, every token silently goes
undefined and the app renders as unstyled Tailwind defaults on a white background.

**Fix:** copy `tokens/` and `styles.css` into `app/styles/design-system/` as the
canonical source the build depends on, and keep the skill folder as the authoring
surface that syncs into it. The `turbopack.root` workaround in `next.config.ts` can
then go away too.

---

## Tier 4 — UX and product gaps

### F-32 · The watchlist's three-section layout fights its own infinite scroll
`app/watchlist/page.tsx:157-166`, `:269-284`

Three `WatchlistSection` components mount simultaneously, each with its own fetch, its
own pagination state and **its own infinite-scroll sentinel**, stacked vertically. With
200 items in Must Watch you must infinite-scroll through all 200 before "Want to Watch"
comes into view. Four requests fire on load (3 sections + 1 facets call).

Undo also re-appends restored rows to the end of the array
(`:307`, `:349`), so undoing a priority change or a removal drops the card at the bottom
of the section rather than back where it was.

**Fix:** collapse to one paginated query with priority as a group key, and render the
sections with "Show all N" expanders rather than three independent infinite scrolls.
Restore by index rather than append.

### F-33 · Filter banks have no reset
`components/LibraryView.tsx:224-297` · `app/watchlist/page.tsx:110-152`

The library filter row is nine controls wide (the code comment admits it). It computes
`hasActiveFilters` (`:172`) and uses it *only* to change a count string — there is no
"Clear filters" button anywhere, on either page. A user who has narrowed to
`Horror / 4+ / 1980s / "cage"` and sees nothing has to reset four controls by hand.

On mobile, nine controls wrap into a wall above the content.

**Fix:** a "Clear filters" chip that appears when `hasActiveFilters` and resets to
`FILTER_DEFAULTS`; on mobile, collapse the bank into a single "Filters (3)" button that
opens a sheet.

### F-34 · Empty states are inconsistent — six treatments for the same idea
`components/ui/EmptyState.tsx` exists and is good (dashed card, icon, hint, action). It
is used on the dashboard, library, stats and calendar. It is **not** used by:

- `app/watchlist/page.tsx:454` — `<p className="text-zinc-600 text-xs italic">No matching items.</p>`
- `components/LibraryView.tsx:363` — `<p className="text-zinc-400">No logged titles match…</p>`
- `app/streaming/page.tsx:250` — bare `<p className="text-zinc-400 py-8 text-center">`
- `app/recommendations/page.tsx:334`, `:344`, `:388` — **three** hand-rolled `Card`
  variants on one page (error, "All Caught Up", "Genre Cleared")
- `app/collections/page.tsx:62` — italic paragraph with an inline link
- `app/show/[id]/page.tsx:219` — `<div className="text-zinc-400">That show is not in your library.</div>`
- `app/person/[name]/page.tsx:114` — `<p className="text-zinc-500 text-sm">No items found.</p>`

None of the seven offers a recovery action, which is the whole point of the component.

**Fix:** migrate all seven to `EmptyState`. Add an optional `tone="error"` variant so
the two error cards can use it too.

### F-35 · Episode click-to-here is destructive with no affordance
`components/EpisodeTracker.tsx:27-47`

Clicking E10 marks E1–E10. Clicking an already-watched E5 unmarks **E5 through the end
of the season**. Nothing in the UI communicates either behaviour — the `title` attribute
carries the episode name, not the action. A user clicking a watched episode intending to
untick just that one silently loses the rest of the season.

There *is* an undo toast, but it fires after the fact and lasts 5.5 s.

**Fix:** at minimum, a `title`/`aria-label` that states the range ("Mark S1 E1–E10
watched" / "Unmark S1 E5–E24"). Better: highlight the affected range on hover, and make
a plain click toggle only the clicked episode with shift-click for the cascade.

### F-36 · The modal footer is a wall of five identical green buttons
`components/MediaInfoModal.tsx:653-782`

`Button`'s default variant is `primary` → solid `--btn-primary-bg` (pine green). Every
footer button omits `variant`, so for a TV show the footer renders:

`[Add to Watchlist]` `[Mark as Watched]` — `[Follow Show]` — `[Track Episodes]` — `[Similar TV Shows]`

five full-width solid pine blocks with no hierarchy. Worse, **"Remove from Watchlist" is
also solid pine** until you hover it, at which point a `hover:!bg-rose-600` class turns
it red. A destructive action is styled as the page's primary affirmative action.

**Fix:** exactly one `primary` (the contextual next action — Mark as Watched, or Track
Episodes for a show in progress), `ghost` for the rest, and a real `destructive` tone
for Remove (see F-27).

### F-37 · Modals animate in but never out
12 of the 13 `MediaInfoModal` call sites

`MediaInfoModal.tsx:369` declares `exit={{ opacity: 0, scale: 0.95, y: 15 }}`, but
framer-motion only runs exit animations inside `<AnimatePresence>`. Only
`app/watchlist/page.tsx:566` wraps it. The other twelve — dashboard, library, streaming,
recommendations, calendar, person, show, collections, similar, search overlay, upcoming
widget, tonight-pick — mount with a spring and vanish instantly.

`SearchOverlay` has the same asymmetry (spring in, hard cut out).

**Fix:** this is the strongest argument for a `MediaModalProvider` (see F-38) — one
`AnimatePresence` at the provider, and all thirteen call sites get correct motion.

### F-38 · `MediaInfoModal` is wired up thirteen times by hand
Thirteen call sites each construct `onAddToWatchlist`, `onMarkAsWatched`, and often
`onRemoveFromWatchlist` / `onUpdatePriority`, each with slightly different optimistic
updates, toast copy and refresh behaviour. `useMediaActions` centralises the *requests*
but not the wiring.

This is the source of F-37, and of behavioural drift — e.g. `MediaCard.tsx:145` calls
`router.refresh()` after marking watched, `SearchOverlay.tsx:44` does it via `onDone`,
`streaming/page.tsx:341` updates a local Set instead, `recommendations/page.tsx:131`
removes the card from a list.

**Fix:** a `MediaModalProvider` exposing `openMedia(item, opts)`, holding one modal
instance inside one `AnimatePresence`, with the standard action handlers built in and
an optional `onChanged` callback for pages that keep local lists.

### F-39 · Per-page metadata does not exist
Only `app/layout.tsx:14` exports metadata. There is no `title.template`, no
`metadataBase`, no `openGraph`, no `twitter`, and no `generateMetadata` on any dynamic
route.

Consequences: every tab reads "DorfMovies"; browser history and bookmarks are
indistinguishable; `/show/[id]` and `/person/[name]` — the app's two deep-linkable
detail routes — have no titles; and both share links (the feature whose entire purpose
is being pasted somewhere) preview with no image and generic text.

**Fix:** `title: { default: 'DorfMovies', template: '%s · DorfMovies' }` plus
`metadataBase` in the root layout, a static `metadata` export on each fixed route, and
`generateMetadata` on `/show/[id]`, `/person/[name]`, `/collections/[id]` and both
`/share/*` routes with an `opengraph-image.tsx` using the poster.

### F-40 · Missing error and loading boundaries
- **No `app/global-error.tsx`.** An error thrown in the root layout — including the
  Supabase call at `layout.tsx:27`, whose `catch` only covers the auth call itself —
  has no fallback and renders the framework default.
- **One `error.tsx`, at the root.** A failed query on `/stats`, `/calendar` or
  `/collections` takes down the whole page rather than the section that failed.
- **`loading.tsx` missing where it matters most.** Present for calendar, collections,
  person, settings, stats and the dashboard. Absent for `/show/[id]`, which is a client
  component with no SSR path, so it paints a skeleton from scratch on every visit — and
  it is the app's most deep-linked route (Continue Watching, bookmarks, shared links).
- `app/error.tsx:24` uses `min-h-screen` inside the padded `<main>`, so the error page
  overflows the same way F-04 describes.

### F-41 · Charts have no accessible alternative
`components/StatsCharts.tsx`

Five Recharts visualisations with no `aria-label`, no `role="img"`, no data table
fallback and no text summary. Recharts emits raw SVG that screen readers skip entirely,
so the Stats page is empty for a non-sighted user apart from the four `StatTile` numbers.

`app/stats/page.tsx:123` also uses a fixed `grid-cols-3` for the streak tiles (unlike
`:116`, which correctly does `grid-cols-2 sm:grid-cols-4`). Three tiles with 30 px
numerals and "Longest streak" as a tracked uppercase label at ~95 px each will break on
a 320 px viewport.

**Fix:** `role="img"` + `aria-label` summarising each chart ("Genre breakdown: Drama 34,
Comedy 21, …"), a visually-hidden `<table>` per chart, and `grid-cols-1 sm:grid-cols-3`
for the streak row.

### F-42 · Bulk-action bar collides with the mobile bottom nav
`components/MultiSelectProvider.tsx:152`

`fixed bottom-6 md:bottom-10` puts the bar 24 px from the bottom on mobile, directly on
top of the fixed bottom nav (~52 px tall). `ToastProvider.tsx:120` gets this right with
`bottom-24 md:bottom-20`; the action bar doesn't.

The bar also has five controls in a non-wrapping row at `left-1/2 -translate-x-1/2` with
no `max-width`, so it overflows horizontally on a 320 px screen.

### F-43 · Recommendations disables every action button during any single action
`app/recommendations/page.tsx:456`, `:471` — `disabled={actioningId !== null}`

`actioningId` is a single value, so clicking "Watchlist" on one card greys out both
buttons on all ~60 visible cards until the request completes.

**Fix:** `disabled={actioningId === item.tmdb_id}`.

### F-44 · Smaller UX gaps worth a line each
- **`/show/[id]` has no progress bar** (`app/show/[id]/page.tsx:249`) — episode progress
  is text-only (`12/62 episodes`), even though `EpisodeTracker` and
  `ContinueWatchingRow` both render bars. It also skips `PageHeader` and hand-rolls its
  own `h1`. `refreshEntry` (`:70-81`) re-fetches the entire show payload (media +
  seasons + progress + entry) just to read back one rating value.
- **`/person/[name]` hand-rolls a back button** (`:126-138`) with a bare
  `router.back()`, duplicating `BackButton` — the component that exists specifically to
  add the history-length fallback. It also doesn't mark which credits are already in the
  user's library, which the app knows.
- **`app/import/page.tsx` redirects client-side** via `useEffect`, rendering `null`
  first. Its three sibling stubs (`/search`, `/movies`, `/shows`, `/lists`) all use a
  server `redirect()`. This one flashes blank.
- **Continue Watching is a bare horizontal scroller** — no scroll-snap, no edge fade, no
  arrow controls. Hard to use with a non-trackpad mouse.
- **⌘K has no recent-searches memory** and no results for a query that returns nothing —
  no "search People instead?" nudge, no suggestions.
- **`paddingTop: '12vh'` and `max-h-[min(420px,60vh)]`** in `SearchOverlay.tsx:236,283`
  use `vh` rather than `dvh`; with a mobile keyboard open the palette is pushed
  off-screen.
- **Only two keyboard shortcuts exist** (`⌘K`, `/`). No `?` help sheet, no `g`-prefixed
  navigation, no `Esc` to clear a bulk selection.

---

## Code health

### F-45 · Flaky test under parallel execution
`components/__tests__/LibraryView.test.tsx:95-124`

Characterised this run:

| Mode | Result |
| --- | --- |
| Full suite, default (parallel) | **1 failure in 1 of 5 runs** |
| `--no-file-parallelism` | 3/3 clean |
| Single test in isolation, 8× | 8/8 clean |

So it is load/timing-dependent, not a product bug — but it will fail CI intermittently.
Contributing factors visible in the config:

- `vi.stubGlobal('IntersectionObserver', …)` is used three times in this file and
  **never unstubbed**. `vi.restoreAllMocks()` at `:91` does not undo `stubGlobal` —
  that needs `vi.unstubAllGlobals()`.
- `vitest.config.ts` sets none of `restoreMocks`, `clearMocks` or `unstubGlobals`.
- jsdom environment setup is the dominant cost in this suite (26.5 s of a 7.4 s wall
  clock across workers), so contention is high.

**Fix:** add `restoreMocks: true, unstubGlobals: true, clearMocks: true` to
`vitest.config.ts`'s `test` block. Re-run 10× parallel to confirm.

### F-46 · Test coverage is thin exactly where the risk is
298 tests across 36 files, but they concentrate on `lib/` pure functions and a handful
of components. Nothing covers:

- `SearchOverlay`'s mode-switching and `aria-activedescendant` indexing across the
  three interleaved option groups (quick-nav / matched pages / results), where the
  index arithmetic at `:99` and `:196` is the fiddliest logic in the app
- The recommendations refresh cycle (which is why F-01 shipped)
- `useModal`'s stacking, scroll-lock and focus-restore behaviour
- `MultiSelectProvider`'s register/unregister lifecycle and `selectAll`
- Any keyboard-navigation assertion beyond `KeyboardShortcuts.test.tsx`

### F-47 · Dead and near-dead code
- `Button`'s `icon` / `iconRight` props (F-27) — declared, eslint-disabled, never rendered.
- `--gold-*`, `--violet-*`, `--orange-*`, `--rose-*`, `--emerald-*` alias blocks in
  `colors.css:60-78` plus the matching tint aliases at `:110-118` — kept for "legacy
  callers" that the `globals.css` bridge has since made redundant for Tailwind
  utilities. Worth auditing which are still referenced directly.
- `supabase/migrations/012_drop_lists.sql` is written and unapplied (flagged in the
  previous handoff; still true).
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` — Next.js
  starter leftovers.

---

## Prioritised roadmap

**Sprint 1 — correctness (about a day)**
1. F-01 Recommendations refresh cycle *(broken feature)*
2. F-02 `pb-safe-bottom` / `scrollbar-none` + `viewportFit` *(broken on every iPhone)*
3. F-03 `<Link>` around `<button>` on Franchises
4. F-43 Recommendations disabling all cards
5. F-45 Vitest config flags *(stop CI flaking)*
6. F-13 step 1 — one-line `getAuthenticatedUser()` swap in the layout

**Sprint 2 — accessibility (two to three days)**
7. F-05 Keyboard access on the four card surfaces *(highest-impact single fix)*
8. F-06 Labels and `aria-label` sweep
9. F-11 Contrast on active pills and `text-zinc-600`
10. F-07 Episode watched state + accordion ARIA
11. F-08 Toast pause + cap · F-09 More-drawer dialog · F-10 Select checkbox name

**Sprint 3 — design system (two to three days)**
12. F-31 Move the design system out of `.agents/` *(do this first — everything else builds on it)*
13. F-22 The 236-utility white sweep + lint rule
14. F-23 Retune the glow tokens
15. F-25 Rewrite `AuthShell` · F-26 Rebuild the share pages
16. F-24 Consolidate to one toggle primitive · F-28 select chevrons
17. F-29 Remove blur · F-30 favicon, theme colour, star glyphs, chart tokens

**Sprint 4 — performance and structure (three to four days)**
18. F-13 step 2 — `(app)` / `(public)` route groups *(also fixes F-04)*
19. F-14 Server-side library pagination · F-15 `/api/library/ids`
20. F-19 Hover to CSS *(also fixes F-12 and F-27's directive problem)*
21. F-38 `MediaModalProvider` *(also fixes F-37)*
22. F-16 Dashboard Suspense · F-17 registry batching · F-18 bulk concurrency
23. F-20 Continue Watching images + `priority` · F-21 DiceBear email leak

**Sprint 5 — product polish**
24. F-39 Metadata and OG images · F-40 error/loading boundaries
25. F-32 Watchlist restructure · F-33 filter reset · F-34 empty-state migration
26. F-36 Modal footer hierarchy · F-35 episode cascade affordance
27. F-41 Chart accessibility · F-42 action-bar collision · F-44 the small list
28. F-46 Fill the test gaps as each of the above lands
