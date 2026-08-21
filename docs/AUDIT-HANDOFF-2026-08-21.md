# Frontend audit remediation — handoff

**Source of truth:** `docs/AUDIT-FRONTEND-2026-08-21.md` (47 findings, F-01…F-47, with
`file:line`, rationale and suggested fix for each, plus a five-sprint roadmap).

**Branch:** `master`. Everything below is **uncommitted** in the working tree. Nothing
has been committed or pushed. Last commit is `5ec2d6c`.

---

## 1. Verify first — one batch is unverified

Everything through F-41 passed the full gate: `npx tsc --noEmit`, `npm run lint`,
`npx vitest run` (38 files / 306 tests), `npm run build`.

**The F-30 batch (section 2.10 below) has NOT been verified** — the verification command
was interrupted. Run this before doing anything else:

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

> **Resolved 2026-08-21 (session 2).** The gate was run. Typecheck, lint and build were
> clean; one test failed — `RatingStars.test.tsx` asserted `style.color` on a `<span>`,
> but the F-30 `★`→Lucide swap moved the amber fill onto the `<svg>`. The component was
> correct, the assertion was stale. Rewritten to check the clip-wrapper widths and the
> amber `<svg>` count. See section 5 for everything session 2 changed.

### Gotchas when verifying

- `npx tsc --noEmit` emits stale errors from `.next/dev/types/validator.ts` pointing at
  pre-route-group paths (`../../../app/calendar/page.js` etc.). They are generated
  artifacts, not real. Run `npm run build` to regenerate, or filter: `| grep -v '\.next/dev'`.
- A dev server is running on **port 3000** (started via the preview tooling,
  serverId `4d682274-940c-4c3f-a021-424dc3ac46ed`).
- **`.claude/launch.json` is a temporary file I created** only to start that dev server.
  It is untracked and `.claude/` is not gitignored. Delete it before committing —
  ask the user first, per their "ask before deleting" rule.

---

## 2. What was done (all uncommitted)

### 2.1 F-17 — investigated and closed as a non-issue. Do not redo.
The audit claims `MultiSelectProvider.register()` drives one full-tree render per card
mount. Measured with a throwaway test: **24 `SelectableOverlay` cards produce 2 renders,
not 24** — React 19 auto-batches the sibling mount-effect burst into one commit. Adding
the suggested `requestAnimationFrame` debounce would have made `selectableCount`
asynchronous (breaking the synchronous assertions in `components/__tests__/selectAll.test.tsx`)
for no measurable gain. No change made.

### 2.2 F-18 — bulk-action concurrency pool
- **New** `lib/pool.ts` — `poolSettled(items, limit, task, onSettled?)`. Same result shape
  as `Promise.allSettled`, preserves input order, isolates failures, reports progress.
- **New** `lib/__tests__/pool.test.ts` — 3 tests (peak concurrency, order + failure
  isolation, progress callback + empty list).
- `components/MultiSelectProvider.tsx` — `handleBatchAction` now uses `poolSettled(items, 5, …)`
  instead of `Promise.allSettled` over the whole selection. Added `progress` state; the
  `aria-live` span shows `"{done} of {total} done"` while an action runs, `"{n} selected"` otherwise.

### 2.3 F-19 + F-12 — hover moved off React state and into CSS
This is the largest change. Six primitives tracked hover/focus in `useState` and applied
it through inline styles, which (a) re-rendered on every pointer move, (b) gave keyboard
focus no affordance, and (c) was invisible to the `prefers-reduced-motion` query — which
zeroed the transition and turned each hover into an *instant jump*.

- `app/globals.css` — new unlayered rules after `.glass-card:hover`:
  `.card-surface`, `.card-interactive`, `.media-row`, `.poster-card`, `.poster-card-img`,
  `.poster-card-overlay`, `.poster-card-title`, `.nav-item`, `.nav-item-icon`,
  `.nav-item[aria-current='page']`, `.btn`, `.btn-primary|ghost|accent|link`, `.input-field`.
  All hover rules are paired with `:focus-visible`. The `prefers-reduced-motion` block at
  the bottom of the file now lists every new transform selector.
- `useState` removed from: `components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`,
  `MediaRow.tsx`, `NavItem.tsx`, `PosterCard.tsx`. `NavItem` was rewritten entirely on
  CSS, keyed off `aria-current` so styling cannot drift from what a screen reader is told.
  `Card`, `Button` and `Input` now destructure `className` and merge it with their own.
- Tests updated: `components/__tests__/NavItem.test.tsx` (asserted inline styles that no
  longer exist → now asserts `aria-current` + class, plus a new inactive-case test);
  `components/__tests__/LibraryView.test.tsx` (`{ name: /Heat/ }` → `{ name: /^Heat/ }`
  — the F-11 `aria-label="Select {title}"` on `SelectableOverlay` had made the query
  ambiguous; this was a pre-existing break from an earlier batch, not from this one).
- Verified the rules actually emit by grepping `.next/static/chunks/*.css` after a build.

**Do not "clean up" the fact that caller classNames like `p-8` on `<Card>` are inert.**
`globals.css` is unlayered, so it outranks Tailwind's `@layer utilities`. That was already
true when the same properties were inline styles — behaviour is preserved deliberately.

### 2.4 F-20 — Continue Watching posters + LCP priority
- `components/ContinueWatchingRow.tsx` — CSS `background-image` → `<Image fill sizes="64px" />`,
  `priority={index < 2}`.
- `components/ui/PosterCard.tsx` — new optional `priority?: boolean` prop.
- `components/DashboardRecentCards.tsx` — `priority={index < 5}` (first grid row).

### 2.5 F-16 — dashboard no longer blocks on TMDB
- **New** `components/DashboardUpcoming.tsx` — server component owning
  `fetchUpcomingReleases()` behind its own `<Suspense>` with a matching skeleton.
- `app/(app)/page.tsx` — `fetchUpcomingReleases()` removed from the top-level `Promise.all`;
  `<DashboardUpcomingWidget releases={…} />` → `<DashboardUpcoming />`.
- `app/(app)/loading.tsx` — comment updated (it claimed the page blocks on TMDB).

### 2.6 F-13 step 2 — `(app)` / `(public)` route groups
- All authed routes moved to `app/(app)/…`; `login`, `signup`, `forgot-password`,
  `reset-password`, `share/*` moved to `app/(public)/…` (all via `git mv`, so history is
  preserved — see `R`/`RM` entries in `git status`).
- `app/layout.tsx` — **no longer touches Supabase**. Only html/body, fonts, orbs,
  `MotionProvider`, `ToastProvider`, metadata, viewport.
- **New** `app/(app)/layout.tsx` — the authed shell: `getAuthenticatedUser()`, `Sidebar`,
  `KeyboardShortcuts`, padded `<main>`, `MultiSelectProvider`.
- **New** `app/(public)/layout.tsx` — no auth call, no sidebar, same `<main>` padding so
  `AuthShell`'s `min-h-[calc(100dvh-3.5rem)]` maths still holds (verified in-browser:
  `scrollHeight === innerHeight` on `/login`).
- Build output confirms `/login`, `/signup`, `/forgot-password`, `/reset-password` are now
  `○ (Static)`. The `/share/*` routes stay dynamic (they read the DB per token — correct).
- Test import paths fixed: `app/__tests__/recommendationsRefresh.test.tsx` and
  `app/__tests__/showEpisodeUndo.test.tsx`.
- `app/error.tsx`, `app/not-found.tsx`, `app/api/`, `app/auth/callback` stayed at the root.

### 2.7 F-39 — metadata
- `app/layout.tsx` — `metadataBase` (`process.env.NEXT_PUBLIC_SITE_URL ??
  'https://mediatracker-ebon.vercel.app'`), `title: { default, template: '%s · DorfMovies' }`,
  `applicationName`, `openGraph.siteName`.
- Static `export const metadata` added to the server pages: `calendar`, `collections`,
  `library`, `settings`, `stats`.
- Client-component routes can't export metadata, so each got a thin segment layout that
  does: `app/(app)/import|recommendations|streaming|watchlist/layout.tsx`.
- `generateMetadata`: **new** `app/(app)/show/[id]/layout.tsx` (queries `media` by id for
  title/overview/poster, try/catch so a metadata failure can't take the page down) and
  **new** `app/(app)/person/[name]/layout.tsx` (decodes the param, no fetch).
  `app/(app)/collections/[id]/page.tsx` gained `generateMetadata` reusing the 7-day-cached
  `getCollectionDetails`.
- The `/share/*` pages already had metadata from an earlier batch (F-26).
- **Still open from F-39:** the audit also asked for `opengraph-image.tsx` routes. I set
  `openGraph.images` to the TMDB poster URL instead. Generated OG cards are not done.

### 2.8 F-40 — error and loading boundaries
- **New** `app/global-error.tsx` — supplies its own `<html>`/`<body>`, inline styles only
  (it renders when the root layout itself failed, so no provider or token is available).
- **New** `components/ui/SectionError.tsx` — shared body for every `error.tsx`.
- **New** `error.tsx` for `app/(app)/stats`, `calendar`, `collections`, `library`.
- `app/error.tsx` rewritten to use `SectionError`; its `min-h-screen` → `min-h-[60vh]`
  (it renders inside the padded `<main>`, so full viewport height forced a scrollbar).
- **New** `app/(app)/show/[id]/loading.tsx` — the app's most deep-linked route had none.

### 2.9 F-41 — chart accessibility
- `components/StatsCharts.tsx` — new `ChartFigure` wrapper: `role="img"` + `aria-label`
  one-line summary on the chart, plus an `sr-only` `<table>` with the real numbers.
  Applied to all three Recharts panels (Activity, Genres, Ratings).
- All hex literals → design tokens (`var(--green-500)` etc.). **`var()` does resolve in
  SVG presentation attributes** — verified in the browser before making the change.
- `app/(app)/stats/page.tsx` — streak tiles `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`.

### 2.10 F-30 — assorted design-system misses (⚠ UNVERIFIED)
- **New** `app/icon.tsx` and `app/apple-icon.tsx` — generated via `next/og` `ImageResponse`
  ("D" in `#7c9a6a` on `#100e09`). The repo only had the Next.js starter `favicon.ico` and
  two Vercel-triangle PNGs.
- `app/manifest.ts` — `theme_color`/`background_color` `#030303` → `#100e09`; added a
  `maskable` icon entry.
- `app/layout.tsx` — `viewport.themeColor` `#030303` → `#100e09`.
- `★` → Lucide `<Star>` in `components/RatingStars.tsx`, `components/ui/MediaRow.tsx`,
  `components/StatsCharts.tsx`. `RatingStars` empty star `--zinc-700` (1.52:1) → `--zinc-500`.
- `components/ui/BentoGrid.tsx` — dropped `max-w-7xl mx-auto` (the layout already applies
  `max-w-[var(--content-max)]`, the same 1280px).
- `components/Sidebar.tsx` — `w-64` → `w-[var(--sidebar-width)]`.
- `app/(app)/layout.tsx` — `md:pl-72` → `md:pl-[calc(var(--sidebar-width)+2rem)]`.

---

## 3. What is left

Re-read `docs/AUDIT-FRONTEND-2026-08-21.md` and confirm each finding's status before
starting — the list below is what I believe is outstanding, but check F-35 and F-45,
which I have not looked at in this session.

| ID | Work |
|----|------|
| **F-24** | Consolidate the six different toggle treatments into one primitive; `<Kbd>` platform detection (⌘ vs Ctrl). — **DONE (session 2, partial):** `<Kbd>` shipped with platform detection. The toggle-primitive consolidation is **still open and deliberately deferred again in session 3** — the user chose to skip it until there is a local Supabase to see it in. It is the only open finding left.|
| **F-27** | `Button`'s dead `icon`/`iconRight` props (currently `eslint-disable`d as unused); `NavItem` needs a `'use client'` audit now that it has no state; add a `tone` prop so call sites stop using `className="hover:!bg-rose-600 hover:!border-rose-500"` (≈6 sites in `MediaInfoModal.tsx`). — **DONE (session 2):** `tone` prop added; all five `hover:!` call sites migrated. The `icon`/`iconRight` deletion is held for F-47 approval.|
| **F-29** | Remove the 26 `backdrop-blur` usages. Note `.btn-ghost` and `.input-field` in `globals.css` still carry `backdrop-filter: blur(var(--blur-md))` — I preserved the existing behaviour there rather than pre-empting this finding. — **DONE (session 2).** |
| **F-31** | Move the design system out of `.agents/skills/dorfmovies-design/` into e.g. `app/styles/design-system/`, update the `@import` on line 1 of `app/globals.css`, drop the `turbopack.root` workaround in `next.config.ts`. The audit's roadmap says do this **first** in the design sprint. — **DONE (session 2).** |
| **F-32** | Watchlist three-section restructure. — **DONE (session 2).** See 5.10. |
| **F-33** | "Clear filters" reset. — **DONE (session 2).** |
| **F-34** | Migrate 7 hand-rolled empty states to the existing `EmptyState` component. — **DONE (session 2).** |
| **F-36** | Modal footer button hierarchy. — **DONE (session 2).** |
| **F-37** | `AnimatePresence` around the 12 unwrapped `MediaInfoModal` call sites. — **DONE (session 2)**, via F-38. See 5.9. |
| **F-38** | `MediaModalProvider` (removes the duplicated modal state from those 12 sites). — **DONE (session 2).** All 13 sites migrated; see 5.9. |
| **F-39 (rest)** | `opengraph-image.tsx` routes for generated OG cards. — **DONE (session 3).** See 6.2. |
| **F-44** | Small list: show-page progress bar, person-page `BackButton`, `/import` client redirect, Continue Watching scroll affordances, ⌘K recents, `vh`→`dvh` in `SearchOverlay`, `?` help sheet. — **DONE (session 2).** All seven; see 5.11. |
| **F-46** | Fill the test-coverage gaps the audit enumerates. — **DONE (session 3).** See 6.3. |
| **F-47** | Dead code — **all of these need the user's approval before deleting** (their AGENTS.md: "Ask before deleting or overwriting any file", "`trash` > `rm`"). — **DONE (session 3)**, to the scope the user approved. See 6.1. |

### F-47 specifics (do not delete without asking)
- `app/(app)/lists/` — route still exists though Lists was removed from the nav in `5ec2d6c`.
- `supabase/migrations/012_drop_lists.sql` — unapplied.
- `app/favicon.ico` — still the Next.js starter icon (25 KB, dated Jul 31). With
  `app/icon.tsx` present, browsers use the generated icon via `<link rel="icon">`, but
  `/favicon.ico` still serves the starter.
- `public/{file,globe,next,vercel,window}.svg` and `public/icon-192.png`, `public/icon-512.png`
  — Vercel-triangle / Next starter assets. The two PNGs are still referenced by
  `app/manifest.ts`, so replacing them needs real artwork or a manifest change.
- `Button`'s `icon`/`iconRight` props.
- Legacy colour aliases in the `@theme inline` block of `app/globals.css`.

### Also deferred, deliberately
Renaming `--glow-*` to something like `--ring-accent`. The **values** were already retuned
(F-23, in `.agents/skills/dorfmovies-design/tokens/effects.css`); only the misleading name
remains, and renaming touches 5 call sites for zero behaviour change. Fold it into F-31.

---

## 4. Conventions established this session — please keep

- **CSS over React state for hover/focus.** New interactive primitives get a class in
  `app/globals.css`, paired `:hover`/`:focus-visible`, and a line in the
  `prefers-reduced-motion` block. Not `useState`.
- **`globals.css` is unlayered** and therefore outranks Tailwind utilities. This is load-bearing.
- **`--color-white: var(--zinc-100)`** in the `@theme inline` block retunes all ~229
  `text-white`/`bg-white/x` utilities at their source. Don't sweep those call sites.
- **`var()` works in SVG presentation attributes** — charts use tokens, not hex.
- Every non-obvious change carries a comment explaining what it replaced and why. Match that.
- The user's global AGENTS.md: no emojis in responses; surgical changes only; ask before
  deleting or overwriting; summarise file changes at the end of each response.

---

## 5. Session 2 — 2026-08-21

All still uncommitted on `master`. Full gate green at the end of every item below:
`npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
**Tests went 306 → 328 across 41 files.**

### 5.1 Housekeeping
- The F-30 batch was verified (see section 1). One stale assertion fixed in
  `components/__tests__/RatingStars.test.tsx`.
- **`.claude/` is now gitignored** rather than deleted, on the user's instruction. The dev
  server config survives for future sessions and `git add -A` can no longer sweep it in.
- **F-45 and F-35 were already done** — the previous session flagged them as unchecked.
  `vitest.config.ts` carries `restoreMocks`/`unstubGlobals`/`clearMocks`, and
  `EpisodeTracker` has a `cascadeLabel` naming the affected range. Both closed, no work.

### 5.2 F-31 — design system vendored out of `.agents/`
- **New** `app/styles/design-system/` — `styles.css` + `tokens/*.css`, copied byte-for-byte.
  This is now what the build imports.
- `app/globals.css:1` → `@import "./styles/design-system/styles.css"`.
- `next.config.ts` — the `turbopack.root` pin is gone; it only existed because the old
  relative `@import` escaped the app directory.
- **New** `app/styles/design-system/README.md` — provenance and the two-line sync command.
- **New** `app/styles/design-system/__tests__/designSystemSync.test.ts` — 9 tests asserting
  the vendored copy is byte-identical to the skill. **Verified it fails on drift**, not just
  that it passes.
- The skill folder stays the authoring surface, exactly as the audit specified.
- Verified in a browser that all seven token files still resolve at runtime (`--accent`
  `#7c9a6a`, body `rgb(16,14,9)`, `--sidebar-width` `256px`, Outfit loaded).

### 5.3 F-27 — `Button` tone, directive audit
- **The `'use client'` half was already fixed by F-19.** `Button`, `Input` and `NavItem` no
  longer call any hook, so they are genuinely server-safe; only `MediaRow` has state and it
  already has the directive. Nothing to add — don't "fix" this by adding directives, it
  would pull them into the client bundle for nothing.
- **New `tone` prop** (`default | destructive | success`) → `.btn-tone-*` in `globals.css`,
  placed after the `.btn-*` variants so equal-specificity ordering resolves correctly
  (**verified in-browser**: `btn-ghost btn-tone-destructive` computes rust, not ghost grey).
  Reads the `--rust-*` ramp directly, not the `--rose-*` aliases F-47 wants removed.
- All five `hover:!bg-*` call sites in `MediaInfoModal.tsx` are gone. `grep -rn 'hover:!'`
  now returns only the doc comment in `Button.tsx`.
- **Still open:** deleting `icon`/`iconRight`. Held for the F-47 approval batch.

### 5.4 F-29 — blur removed
22 occurrences across 17 files, plus the two `backdrop-filter` declarations in
`globals.css` that the previous session deliberately left for this finding. Every affected
element already had an opaque background (`--scrim`, `bg-[var(--bg-void)]/95`,
`bg-black/60–70`), so nothing needed a replacement scrim.

**Verified in-browser: zero elements on the page have a computed `backdrop-filter`.**

The ambient orbs in `app/layout.tsx` and `AuthShell.tsx` keep their `blur-[150px]` — that
is `filter`, not `backdrop-filter`, and it is the intended background treatment.

> **Note for whoever picks this up:** the built CSS still contains a few `backdrop-blur`
> utility definitions. They are dead — Tailwind's source detection is scanning
> `docs/**/*.md` and generating utilities from class names quoted inside the design docs.
> Not a blur regression. Worth fixing with `@source` directives, but doing it wrong
> silently drops utilities that *are* used, so it wants its own careful pass.

### 5.5 F-36 — modal footer hierarchy
- **New** `primaryAction` in `MediaInfoModal.tsx`: `'track' | 'watched' | null`. Exactly one
  solid button — Track Episodes for a trackable show, otherwise Mark as Watched, and
  **nothing** once it has been watched (there is no next step to point at).
- Remove from Watchlist → `variant="ghost" tone="destructive"`. Log rewatch → `tone="success"`
  (the inline teal styles are gone). Follow/Add/Similar → `ghost`. Track Episodes is a
  `<Link>`, so it takes the `.btn-*` classes instead of its own hand-rolled copy.
- **New** `components/__tests__/MediaInfoModal.footer.test.tsx` — 5 tests pinning the
  hierarchy per state, plus a regression guard that the footer contains no `hover:!`.

**One deliberate behaviour change:** Unfollow Show no longer gets a rose hover hint. It was
`hover:!bg-rose-600/10` — one of the `!important` overrides being removed — and preserving
it would have meant a destructive tone on a resting state that is not destructive.

### 5.6 F-34 — empty states
All eight hand-rolled sites migrated to `EmptyState`: watchlist, `LibraryView`, streaming,
recommendations (×3), collections, `/show/[id]`, `/person/[name]`. Each now offers a
recovery action where one exists, which was the audit's actual complaint.

`EmptyState` gained two props:
- `tone="error"` — as the audit asked, so the recommendations error card can use it.
- `size="compact"` — **not** in the audit, but necessary: under an active filter the
  watchlist keeps all three sections mounted, so the full 48px dashed card would have
  stacked three deep. Used by the watchlist, library-filtered, person and genre-cleared
  states.

Removed the imports this made unused (`Card` and `Link` in two files). "Try Again" kept its
exact casing — `recommendationsRefresh.test.tsx` queries it by name.

### 5.7 F-33 — clear filters
- **New** `components/ui/ClearFilters.tsx` + `.clear-filters` in `globals.css`
  (paired `:hover`/`:focus-visible`, per the session-1 convention).
- **`useUrlFilters` gained `reset(keys?)`** — returned as a third tuple element. Resetting by
  looping `setValue` would have fired one `router.replace` per key, each landing in history.
  It also **cancels a pending free-text debounce**, which would otherwise fire after the
  reset and put the cleared query straight back into the URL.
- 3 new tests in `lib/__tests__/useUrlFilters.test.tsx`. **The debounce test was verified to
  fail without the `clearTimeout`** — it is not a vacuous assertion.
- Wired into both banks. It resets exactly the keys `hasActiveFilters` reports on, so the
  chip's presence and its effect stay in step. **This deviates from the audit's "resets to
  `FILTER_DEFAULTS`"** on purpose: sort, type and the grid/list toggle are view preferences,
  and clearing a filter should not throw away the user's chosen layout.

### 5.8 F-24 — half done
- **Done: `<Kbd>`.** **New** `components/ui/Kbd.tsx` exporting `Kbd` and `useIsMac`.
  Migrated `DashboardSearchBar`, `Sidebar` and `SearchOverlay`'s `⌘↵` hint — all three
  hardcoded ⌘ even though the handler has always accepted Ctrl.
  Uses `useSyncExternalStore` with a server snapshot, **not** `useEffect` + `setState`:
  the repo's eslint config bans `react-hooks/set-state-in-effect`.
  **New** `components/__tests__/Kbd.test.tsx` — 5 tests.
- **Not done: the toggle consolidation.** `FilterPills` already uses `--btn-primary-fg` for
  its active foreground, so that specific complaint is resolved, but the five other
  treatments (streaming ×2, `LibraryView` view toggle, `CalendarClient`, `SearchOverlay`/
  `StatsCharts`) have not been migrated. See the warning below before starting it.

### 5.9 F-37 + F-38 — one owner for `MediaInfoModal`

These two were done together because F-38 subsumes F-37: once a single component owns the
modal, there is exactly one `<AnimatePresence>` to get right.

`MediaInfoModal` had **13 hand-wired call sites**. Twelve of them rendered it as a bare
`{open && <MediaInfoModal …>}` with no `AnimatePresence`, so its `exit` prop never ran and
the modal cut out instead of animating (F-37). Each site also rebuilt `onAddToWatchlist` /
`onMarkAsWatched` by hand, with quietly different priorities and refresh behaviour (F-38).

**New: `components/MediaModalProvider.tsx`**, mounted in `app/(app)/layout.tsx` *inside*
`ToastProvider` (root layout) — `MediaInfoModal` calls `useToast`, so that order is load-
bearing, not cosmetic. It exposes `useMediaModal() -> { openMedia, closeMedia }`.

Two things about its design that are not obvious:

- **It holds a stack, not a slot.** `MediaInfoModal` renders `SimilarModal`, which opens
  another `MediaInfoModal` on top of it. A single slot would replace the one underneath,
  and closing the inner one would drop you to nothing.
- **`onClosed` fires on exit-complete, `onChanged` on a successful write.** The ⌘K overlay
  restores focus in `onClosed`; doing it at close time lands focus on a dying element.
  `onChanged` exists because each `useLibraryIds()` caller keeps its own `useState`, so a
  shared cache write is not enough to update the badges.

Ten sites now pass nothing but `onChanged` / `onNavigateAway`. Three keep overrides because
their behaviour is genuinely bespoke, and `OpenMediaOptions` lets a caller replace any
default handler outright:

| Site | Why it overrides |
| --- | --- |
| `TonightPickModal` | Everything in the pool is already on the watchlist — "Add" is a no-op |
| `(app)/recommendations` | Both actions drop the card from the list |
| `(app)/watchlist` | Removal deletes by **watchlist row id**, not tmdb_id/type; watching also deletes the row |

`lib/useMediaActions.ts` gained an optional third `overridePriority` argument to
`addToWatchlist` — the provider builds its handlers once but opens media for pages that
disagree about the default bucket (calendar and `/person` add as `must_watch`).

The watchlist page kept a `openItemIdRef` (a ref, nothing renders from it) so its three
handlers can still dismiss the modal when the row they act on leaves the list.

**Tests** — `components/__tests__/MediaModalProvider.test.tsx`, 8 cases. Six behavioural
(open/close, nested stacking pops one at a time, `onClosed` ordering, priority pass-through,
default bucket, handler override), plus **two source-level guards**: no file outside the
provider may import `MediaInfoModal`, and the provider must render the stack inside an
`AnimatePresence`. Those two are what stop F-37 from creeping back one call site at a time.

All eight were mutation-checked. The `onClosed` test was vacuous on the first pass — it
still passed when the callback was moved to fire at close time — so it now asserts the DOM
is already empty when the callback runs.

Four existing test files (`showEpisodeUndo`, `recommendationsRefresh`, `KeyboardShortcuts`,
`LibraryView`) needed a `MediaModalProvider` wrapper, nested inside their `ToastProvider`.

Gate: `tsc` / `lint` / `vitest` (42 files, 336 tests) / `build` all clean.

### 5.10 F-32 — watchlist restructure

Three problems, all fixed together.

**Four requests on load became one.** `GET /api/watchlist` gained a `group=priority`
mode that runs the three bucket queries and the genre-facet query in parallel server-side
and returns `{ groups: { must_watch: { items, total }, … }, genres }`. The separate
`facets=1` call the page used to make is gone from the page (the mode itself is kept —
nothing else uses it, but it is the documented single-bucket entry point). The paged query
builder was extracted to `buildListQuery(priority)` so both modes share it verbatim.

**Three stacked infinite scrolls became per-bucket expanders.** Each section previews
`PAGE_SIZE` (12) rows with a "Show all N" button, then "Load N more". The
`IntersectionObserver` sentinels are gone. This is the actual fix for the finding: with
200 items in Must Watch you no longer scroll through all of them before Want to Watch
comes into view.

**Undo restores position.** Both undo paths re-appended the row to the end of the array,
so undoing a move or a removal dropped the card at the bottom of its bucket. `findItem`
now returns the index alongside the row and `restoreToGroup` splices it back.

All per-section state (items, total, page, expanded) moved up into `WatchlistContent`;
`WatchlistSection` is presentational. The handlers moved with it.

**Two things the tests caught, worth knowing:**

- The load effect originally depended on `setFilter`. `useUrlFilters` derives `setFilter`'s
  identity from the router's, so in any environment where `useRouter()` returns a fresh
  object the effect re-ran on every render — fetch, render, fetch. It now reads both
  `setFilter` and `genreFilter` through refs and depends only on `listParams`. (The
  original code used a `genreFilterRef` for the same reason; I had dropped it.)
- The restore index was first captured inside a `setGroups` updater. Those do not run
  synchronously, so the index was not available when the Undo closure was built. It is now
  read from the render snapshot.

**Tests** — `app/__tests__/watchlistGroups.test.tsx`, 5 cases: one grouped request rather
than four, preview-then-expand, no expander for a bucket that fits, and both undo-restores.
Mutation-checked: re-appending on undo, removing the expander, and splitting the facets
call back out each fail their test. Note the router mock must be a single stable object for
the reason above.

Gate: `tsc` / `lint` / `vitest` (43 files, 341 tests) / `build` all clean. Still not seen in
a browser — see section 6.

### 5.11 F-44 — the small list

All seven items, in two commits.

| Item | What changed |
| --- | --- |
| `/import` flashed blank | Server `redirect()` like its sibling stubs, not a `useEffect` |
| `vh` in `SearchOverlay` | `12dvh` / `60dvh`, so a mobile keyboard shrinks the palette rather than shoving it off-screen |
| `/person` back button | `BackButton` (history-length fallback). In "all credits" mode it is not history navigation, so that stays a plain button |
| `/person` credits | Same Watched/Watchlist chip the streaming grid uses, kept live through the modal's `onChanged` |
| `/show/[id]` progress | The bar `EpisodeTracker` and `ContinueWatchingRow` already had, plus `role="progressbar"`. `refreshEntry` uses a new `?only=entry` mode instead of re-reading media + seasons + progress for one rating |
| Continue Watching | Prev/next arrows (pointer only), edge fades, `snap-x`, `scroll-smooth` |
| ⌘K | Recent searches, and a "search people instead" nudge on a dead end |
| `?` help sheet | New `KeyboardHelp`, plus `g`-prefixed jumps and Escape-clears-selection |

Things worth knowing:

- **`QUICK_NAV` moved to `lib/quickNav.ts`.** The palette's "Go to" list, the `g` chords and the
  help sheet all enumerate the same destinations; three copies would drift. Each entry now
  carries its own `key`, so adding a destination adds its shortcut and its help row at once.
- **Recents are recorded when a search is *acted on*, not as it is typed.** Recording per
  keystroke fills the list with the prefixes of one search and buries the actual lookup.
  They share the arrow-key index space with the quick-nav rows: `[recents…, QUICK_NAV…]`.
- **`?` opens the sheet; it does not toggle.** The branch is gated on `!isAnyModalOpen()` and
  the sheet registers as a modal, so a second `?` can never reach it. A test caught this
  while the code still said `setHelpOpen(v => !v)`, which could only ever open.
- **Escape-clears-selection lives in `MultiSelectProvider`,** not `KeyboardShortcuts` — that is
  what holds the selection, and it defers to any open modal.
- **`window.localStorage` does not exist in this jsdom setup.** `lib/recentSearches` guards for
  it, and that guard is load-bearing rather than defensive dressing.

**Tests** — `lib/__tests__/recentSearches.test.ts` (9), plus new cases in
`KeyboardShortcuts.test.tsx` (g-chord expiry, typing guard, modal gating, help sheet contents)
and `ContinueWatchingRow.test.tsx` (arrow enable/disable, which needs `ResizeObserver` and the
scroll metrics stubbed — jsdom does no layout). `unstubAllGlobals` in `afterEach` there, since
a leaked `ResizeObserver` is the cross-file bleed F-45 documents. All mutation-checked.

Gate: `tsc` / `lint` / `vitest` (44 files, 362 tests) / `build` all clean.

**Browser-verified:** `/import` → `/settings#import-export`, fragment preserved, no blank
frame. Nothing else — see section 6. Note that with Supabase absent the failure bubbles to
`app/error.tsx`, which sits at the *root*, so it replaces the `(app)` layout and
`KeyboardShortcuts` with it. That is why none of the keyboard work could be exercised locally.

---

## 6. Verification limits — read this

There is **no Supabase credential in this environment**. `/login` and the other static
public routes render correctly and were verified in a browser, but **every authenticated
page throws** "Your project's URL and Key are required" and falls to its error boundary.

That means the visual results of F-33, F-34 and F-36 could not be seen in a running app.
They are covered by tests and by computed-style probes, which is why those were written the
way they were — but **nobody has actually looked at the new empty states, the clear-filters
chip, or the reworked modal footer.** Do that before shipping.

This is also why the F-24 toggle migration was left alone: it is a purely visual refactor
across six surfaces with framer `layoutId` transitions, icon-only buttons and a horizontally
scrolling pill row. Tests cannot tell you it looks right. Whoever picks it up should have a
working local Supabase first.

---

## 7. Session 3 — 2026-08-21

Commits `15a0233` … `5cd35a2` landed sessions 1 and 2; this session starts from a clean
`master` at `5cd35a2`. **F-24 is now the only open finding.**

Full gate green at the end of every item below: `npx tsc --noEmit`, `npm run lint`,
`npx vitest run`, `npm run build`. **Tests went 362 → 399 across 47 files.**

### 7.1 F-47 — dead code, to the scope the user approved

The user was asked per item. Approved: the starter assets, `Button`'s `icon`/`iconRight`,
and the colour aliases. Declined: `app/(app)/lists/` and `supabase/migrations/012_drop_lists.sql`
— **do not delete either.** `lists/page.tsx` is a live `redirect('/watchlist')` that catches
old bookmarks, and 012 is a destructive unapplied migration that is the user's to run.

- **Trashed** (`trash`, not `rm`): `public/{file,globe,next,vercel,window}.svg` and
  `app/favicon.ico`. `app/icon.tsx` already serves the real mark. `public/icon-192.png`
  and `icon-512.png` stay — `app/manifest.ts` still references them.
- `components/ui/Button.tsx` — `icon` / `iconRight` and their two `eslint-disable` lines
  are gone. Checked every `icon=` call site first: all are `EmptyState`, `Input`,
  `BentoGrid` or `NavItem`, none is a `Button`.
- **The colour aliases were not dead.** The audit called `--gold-*`, `--violet-*`,
  `--orange-*`, `--rose-*` and `--emerald-*` legacy, but only `--gold-*` was unreferenced;
  the other four were live at ~20 call sites. So they were *migrated*, then removed:

  | Alias | Real ramp | Note |
  | --- | --- | --- |
  | `violet-300…700` | `green-300…700` | |
  | `rose-400/500/600` | `rust-400/500/600` | |
  | `orange-400` | `amber-400` | |
  | `orange-500` | **`amber-400`** | not `amber-500` — the alias hopped a step |
  | `orange-600` | `amber-500` | |
  | `emerald-400/500` | `teal-400/500` | |

  Files touched: `MediaInfoModal`, `MediaCard`, `SimilarModal`, `SelectableOverlay`,
  `PasswordChangeForm`, `EditEntryModal`, `ImportExportPanel`, plus `.btn-accent` in
  `globals.css` (which read `--violet-tint-bg` / `--violet-300`).
  `@theme inline` lost the four alias sub-ramps and gained `--color-rust-300…600`, which
  the migrated `text-rust-400` / `bg-rust-500` utilities need in order to emit at all.
  The alias blocks are gone from **both** copies of `tokens/colors.css` (vendored and
  skill) — `designSystemSync.test.ts` fails if you touch only one.

  **The migration is value-preserving, and that was checked rather than assumed:** the
  built CSS was read back and every migrated utility resolves to the same token the alias
  pointed at (`.text-rust-400{color:var(--rust-400)}`, `.bg-amber-400\/5{…var(--amber-400)…}`,
  and so on). In the browser: `--accent` `#7c9a6a`, `--rust-400` `#c4805f`,
  `--violet-500` and `--rose-tint-bg` gone, and all three `.btn-tone-*` compute correctly.

  One consequence worth knowing: **a stray `bg-violet-500` no longer renders pine, it
  renders Tailwind's stock violet `#8d54ff`.** That is the intended outcome — off-brand
  and obvious — but it is a change from the old silently-correct behaviour.

### 7.2 F-47 follow-on — `@source not "../docs"`

Session 2 flagged, under F-29, that the built CSS carried dead `backdrop-blur` utilities
because Tailwind's source auto-detection walks to the repo root and scans `docs/`, turning
class names quoted inside design documents into real CSS. Removing the hue aliases made it
visible (`.bg-violet-500\/5{background-color:#8d54ff0d}` shipped in the bundle), so it was
fixed here: one `@source not "../docs";` in `app/globals.css`.

The handoff warned that doing this wrong silently drops utilities that *are* used, so it
was verified by diffing the emitted selector set across a rebuild: **535 → 490 selectors,
45 removed, 0 added**, and each of the 45 was grepped against `app/`, `components/`,
`lib/` and `types/` to confirm nothing renders it. The only three hits were prose inside
comments (`w-64` and `max-w-7xl` in `spacing.css`, `text-orange-400` in a new `globals.css`
comment) — Tailwind does not scan CSS files as content, confirmed by the diff.

Note the comment above the directive avoids writing `docs/**/*.md` literally: the `*/`
inside that glob closes a CSS comment early and the build fails with
`CssSyntaxError: Unknown word *.md`.

### 7.3 F-39 (rest) — generated OG cards

**New `lib/ogCard.tsx`** — one 1200×630 card renderer, plus `renderOgCard()`, shared by
six routes. It hardcodes the palette as hex: Satori resolves no CSS variables and loads no
stylesheet, so the tokens cannot come through. Keep it in step with `tokens/colors.css`.

Routes added: `app/opengraph-image.tsx` (the app-wide default every route inherits),
`(app)/show/[id]`, `(app)/person/[name]`, `(app)/collections/[id]`, and both
`(public)/share/*`. `app/layout.tsx` also gained `twitter: { card: 'summary_large_image' }`
— without it X renders the 1200×630 card as a small square thumbnail.

**The trap, and the reason two files were edited to remove working code:** Next's own docs
say file-based metadata overrides `generateMetadata`. **It does not, at least not for
`openGraph.images` in 16.2.6.** Verified with a throwaway route: with `openGraph.images`
set in config *and* an `opengraph-image.tsx` present in the same segment, the config URL
won and the generated card was built, served and never referenced. So the poster URLs
session 2 put in `show/[id]/layout.tsx` and `collections/[id]/page.tsx` had to come out, or
the cards would have been dead on arrival. `app/__tests__/ogImages.test.ts` guards both
halves of this (12 cases, both mutation-checked).

Other decisions:

- **The share cards deliberately do not read their token.** Those pages are `noindex`
  precisely because the token is the only thing guarding them, and anything rendered into
  an `og:image` gets cached and re-served by every unfurler that touches the URL. They get
  a branded "Shared list / Watched" card instead of the list contents.
- **`renderOgCard` retries without the poster if the poster fetch throws.** Satori fetches
  `<img src>` inline, so one TMDB hiccup would 500 the route and leave the link with no
  preview at all — worse than a preview with no poster.
- **No custom font.** `app/icon.tsx` set the precedent; loading Outfit here would add a
  network dependency to the build for a card that already reads on-brand.
- The `<img>` carries a two-rule `eslint-disable`. `next/image` has no runtime inside
  Satori, and alt text has nowhere to go once the tree is a PNG — the route's own `alt`
  export is what social clients read.

**Browser-verified:** the card renders correctly with and without a poster (screenshotted
via a throwaway route pointed at a real TMDB poster), all five dynamic routes return
`200 image/png`, and the root card's `og:` / `twitter:` tags are on `/login`. The
collection and show cards fall back to the generic card locally because there is no TMDB
key or Supabase credential — which exercised the fallback path, but means the *populated*
versions of those two have not been seen.

### 7.4 F-46 — the test-coverage gaps

Three of the audit's five bullets were already closed by sessions 1–2: `useModal` has 7
tests covering stacking, scroll-lock and focus-restore; `recommendationsRefresh.test.tsx`
covers the refresh cycle; `selectAll.test.tsx` covers registration counting. The two real
gaps were filled.

**New `components/__tests__/SearchOverlay.test.tsx` — 17 cases.** The audit called the
palette's index arithmetic "the fiddliest logic in the app", and nothing touched it. Three
option groups share one arrow-key index space — `[recents…, QUICK_NAV…]` when the query is
short, `[matchedPages…, results…]` once it is not — with the offsets spread across the
Enter handler and three separate render loops. The tests pin the mapping from both ends:
the index the keyboard is on, and the row `aria-activedescendant` names.

Covered: quick-nav start and clamping, the recents offset, Enter-on-a-recent refilling the
input rather than navigating, the matched-page offset, `⌘↵` falling through to navigation
when the active row is a page (`titleResults[0 - 1]` is undefined), `⇧↵` adding to the
watchlist, mode switching relabelling the listbox and resetting the highlight, person
results indexing from zero, `aria-expanded="false"` with no activedescendant when there are
no options, and the no-results nudge switching indexes.

**New `components/__tests__/MultiSelectProvider.test.tsx` — 8 cases**, covering what
`selectAll.test.tsx` does not: Escape clearing a selection, Escape deferring to an open
modal, `selectAll` reading the live registry rather than a stale snapshot, and the pooled
batch write — one request per item, the `DELETE /api/watchlist` that follows
`POST /api/watch`, the partial-failure toast, and **the selection surviving a total
failure so it can be retried**.

All 25 new cases were mutation-checked — 13 separate mutations, each caught by the test it
was meant to catch and by no more than the tests that genuinely depend on it. The full
suite was also run three times to confirm no cross-file bleed.

### 7.5 Bug — "Similar Movies" took down the whole app (F-38 regression, shipped in `15a0233`)

The user hit the root error boundary on "View similar", and in "other random places".

**Cause.** `MediaModalProvider` renders its stack as a *sibling* of its own children, so
everything the stack owns sits at the provider's level in the tree. In `app/(app)/layout.tsx`
that level was **outside** `MultiSelectProvider` — which was nested down inside `<main>`,
wrapping only `{children}`. `MediaInfoModal` renders `SimilarModal`, `SimilarModal` calls
`useMultiSelect()`, and that hook throws when no provider is above it. The throw escaped to
`app/error.tsx`, which sits at the *root*, so it replaced the entire app shell.

This is why it looked random: the entry point never mattered. Every path that reaches the
Similar button — a card on any page, ⌘K, Continue Watching — went through the same
provider-owned modal, so all of them broke and nothing else did.

**Fix.** `MultiSelectProvider` is now the outer provider in `app/(app)/layout.tsx`. It
renders only its children plus a portal to `document.body`, so moving it out of `<main>`
changes no layout. This also restores the pre-F-38 behaviour where the `SelectableOverlay`
cards inside `SimilarModal` register into the same selection as the page's cards — before
F-38, `SimilarModal` was rendered inside each page's tree, inside that provider.

**New `components/__tests__/similarModalProviders.test.tsx`** — 2 cases. One drives the
real flow (open a media modal through the provider, click Similar, assert the dialog
renders); the other is a source guard asserting `app/(app)/layout.tsx` opens
`MultiSelectProvider` before `MediaModalProvider`. The behavioural one was written *first*
and confirmed to reproduce the exact error — `useMultiSelect must be used within
MultiSelectProvider` — with the fixture flipped to the app's then-current order.

**Whoever adds a provider next:** the ordering rule is that anything the modal stack's
subtree reaches for must be provided *above* `MediaModalProvider`, not inside it.
`ToastProvider` (root layout) already satisfies this; those three — toast, multi-select,
media-modal — are the only context hooks in the app that throw when unprovided. The
`(public)` routes use none of them, checked.

### 7.6 Still open

**F-24 only.** The user chose again to defer the toggle consolidation until there is a
local Supabase credential: it is six visual surfaces with framer `layoutId` transitions,
and no test tells you it looks right. Section 6 still applies.

`--glow-*` and `--orb-violet` / `--orb-orange` / `--orb-rose` also still carry names from
a palette that no longer exists. Their *values* are correct; only the names mislead. Not
part of F-47's stated scope, and renaming them is pure churn unless done alongside F-24.
