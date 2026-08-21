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
| **F-24** | Consolidate the six different toggle treatments into one primitive; `<Kbd>` platform detection (⌘ vs Ctrl). — **DONE (session 2, partial):** `<Kbd>` shipped with platform detection. The toggle-primitive consolidation is still open.|
| **F-27** | `Button`'s dead `icon`/`iconRight` props (currently `eslint-disable`d as unused); `NavItem` needs a `'use client'` audit now that it has no state; add a `tone` prop so call sites stop using `className="hover:!bg-rose-600 hover:!border-rose-500"` (≈6 sites in `MediaInfoModal.tsx`). — **DONE (session 2):** `tone` prop added; all five `hover:!` call sites migrated. The `icon`/`iconRight` deletion is held for F-47 approval.|
| **F-29** | Remove the 26 `backdrop-blur` usages. Note `.btn-ghost` and `.input-field` in `globals.css` still carry `backdrop-filter: blur(var(--blur-md))` — I preserved the existing behaviour there rather than pre-empting this finding. — **DONE (session 2).** |
| **F-31** | Move the design system out of `.agents/skills/dorfmovies-design/` into e.g. `app/styles/design-system/`, update the `@import` on line 1 of `app/globals.css`, drop the `turbopack.root` workaround in `next.config.ts`. The audit's roadmap says do this **first** in the design sprint. — **DONE (session 2).** |
| **F-32** | Watchlist three-section restructure. |
| **F-33** | "Clear filters" reset. — **DONE (session 2).** |
| **F-34** | Migrate 7 hand-rolled empty states to the existing `EmptyState` component. — **DONE (session 2).** |
| **F-36** | Modal footer button hierarchy. — **DONE (session 2).** |
| **F-37** | `AnimatePresence` around the 12 unwrapped `MediaInfoModal` call sites. — **DONE (session 2)**, via F-38. See 5.9. |
| **F-38** | `MediaModalProvider` (removes the duplicated modal state from those 12 sites). — **DONE (session 2).** All 13 sites migrated; see 5.9. |
| **F-39 (rest)** | `opengraph-image.tsx` routes for generated OG cards. |
| **F-44** | Small list: show-page progress bar, person-page `BackButton`, `/import` client redirect, Continue Watching scroll affordances, ⌘K recents, `vh`→`dvh` in `SearchOverlay`, `?` help sheet. |
| **F-46** | Fill the test-coverage gaps the audit enumerates. |
| **F-47** | Dead code — **all of these need the user's approval before deleting** (their AGENTS.md: "Ask before deleting or overwriting any file", "`trash` > `rm`"). |

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
