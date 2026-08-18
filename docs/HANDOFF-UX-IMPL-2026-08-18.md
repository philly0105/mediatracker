# Handoff — UX audit implementation (2026-08-18)

Work in progress on `master`, **uncommitted**. Implements `docs/AUDIT-UX-2026-08-18.md`
plus a full removal of the Lists feature.

Read the audit first — findings are referenced below by their `U`/`X` numbers and
this document does not restate them.

## State of the tree right now

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm run test:run` | **298 passed / 36 files** (was 261 / 33) |
| `npm run lint` | **0 errors, 0 warnings** (clean) |
| `npm run build` | **succeeds, 44 routes** (clean) |

Nothing was exercised against a running app. There is still no `.env.local` in
this checkout, so no Supabase or TMDB credentials.

---

## Done

### Lists removed completely

- Deleted `app/lists/[id]/`, `app/api/lists/` (3 routes), `app/share/list/[token]/`.
- `app/lists/page.tsx` is now a redirect stub to `/watchlist`, matching the
  convention `/search` and `/import` already use. Old bookmarks and previously
  shared list links land somewhere useful instead of 404ing.
- `List` and `ListItem` removed from `types/index.ts`.
- **`supabase/migrations/012_drop_lists.sql` is written but NOT APPLIED.** It
  drops `shared_list()`, three indexes, then `list_items` and `lists`. This is
  destructive and irreversible — export anything worth keeping first. Nothing in
  the app reads these tables any more, so applying it is safe but not urgent.
- Grep for `shared_list|list_items|from('lists')|/api/lists|share/list|ListItem`
  across `app/ components/ lib/ types/` returns nothing but `watchlist_*` matches.

### Tier 0

- **U1** — `UNDO_WINDOW_MS` (6000) and `UNDO_TOAST_MS` (5500) exported from
  `lib/useDeferredAction.ts`; `ToastProvider` derives an action toast's duration
  from `UNDO_TOAST_MS` instead of its own 8000. The toast now leaves before the
  write commits, so the dead window is gone. All three `if (!cancel(k)) return`
  sites now toast "Too late to undo…" instead of failing silently.
- **U3** — Refresh sends `?refresh=1&cycle=N`, N incrementing per press; the
  server rotates the seed window by `cycle * SEED_LIMIT`, so it returns different
  titles rather than the same set reshuffled. Refresh no longer resets the genre
  and type pills. Added `effectiveGenre` in `app/recommendations/page.tsx` — if a
  refreshed set no longer contains the selected genre it falls back to All rather
  than rendering an empty page with a pill still lit.
- **U4** — `fetchSeeds()` in `app/api/recommendations/route.ts` cascades:
  `rating >= 4` → any rating, best first → most recent regardless of rating →
  only then trending with `fallback: true`. Pulls a 60-row pool per tier and
  rotates within it, which is what makes U3 work.
- **U5** — `hideWatchedDate` deleted entirely (prop and both call sites). The
  Library shows the watched date, and the TMDB score is no longer mutually
  exclusive with it.
- **U6** — Solved without backfill: new `lib/tmdbRatings.ts` coalesces every
  card's lookup into one batched request per 50 ms window with a session-lifetime
  cache; `/api/tmdb/rating` now takes `?ids=movie:550,show:1399` (max 40) **and writes
  what it finds back to `media.vote_average`**, so the column self-heals as pages
  are viewed and the client lookup fades out on its own. 24 requests → 1.
- **U7** — `app/streaming/page.tsx` treats hide-watched as a fill target: keeps
  advancing pages until 20 unwatched posters or `page >= totalPages`, capped at 5
  auto-advances per filter combination. Empty-state copy now distinguishes
  "exhausted this service" from "turn the filter off".

### Tier 1

- **U8/U9** — `SearchOverlay` result rows carry `✓` and `+` chips (visible on the
  active row and on hover), plus `⌘↵` = mark watched and `⇧↵` = add to watchlist.
  Footer advertises both. Both paths toast and update the local id sets.
- **U10** — Watchlist search widened to title + director + exact year via
  PostgREST `.or(..., { referencedTable: 'media' })`.
- **U11** — Priority change from a watchlist card now toasts, with an Undo that
  PATCHes back to the previous priority.
- **U12/U21** — Clicking the currently-selected star clears the rating
  (`onChange` widened to `number | null` across five call sites — the API already
  accepted null). Interactive star boxes padded from 24 to 32 px, so hit zones go
  from 12×24 to 16×32; the glyph is unchanged and read-only stars are untouched.
- **U13** — `RatingStars` no longer prints its own `{value}/5`; callers control it.
- **U14** — Calendar added to `MORE_NAV`, which fixes the desktop sidebar and the
  mobile More drawer together.
- **U15** — `/show/[id]` uses `<BackButton fallback="/library" />`.
- **U16** — Added `app/settings/loading.tsx`.
- **U17** — Library refetches on `visibilitychange` + `focus`; the Refresh button
  is demoted to an icon with an `aria-label`.
- **U18** — Modal prefers `details.overview` and `overview` dropped from
  both `WATCH_SELECT` constants.

### Tier 2

- **U19** — `md:focus-within:opacity-100` on both hover-gated action clusters.
- **U20** — `formatAirDate`/`isUnaired`/`formatDateLabel` lifted out of `EpisodeTracker`
  into new `lib/formatDate.ts`. Used by `MediaRow`, `DashboardRecentCards`,
  and `DashboardUpcomingWidget`.
- **U22** — Overlay input is a `combobox` with `aria-activedescendant`; the
  results container is a `listbox`; rows are `role="option"` with `aria-selected`.
- **U23** — `aria-current="page"` on `NavItem`, the mobile bottom bar, and the
  More drawer.
- **U24** — Search-mode toggles are `role="group"` + `aria-pressed`.

### Tier 3

- **U26** — Module-level `detailsCache` in `MediaInfoModal`.
- **U27** — Ratings bar series renamed `Films` → `Titles`.
- **U28** — `lib/stats.ts` added `computeTopRated`, `computeRewatchCount`,
  `computeStreaks`, `computeYearlyActivity`, `availableYears`. Stats page adds
  Rewatches / Current streak / Longest streak tiles, "Your Highest Rated" card,
  and yearly activity selector.
- **U29** — Lucide `ChevronUp`/`ChevronDown` replace the `▲`/`▼` glyphs.
- **U30** — `Button`'s hover handlers moved after `{...rest}` and compose.
- **U31** — Dashboard renders cards or empty state, not both.

### Code Health & Infrastructure (X1 & X2)

- **X1 (Lint completely clean: 0 errors, 0 warnings)**:
  - Fixed all 33 `any`s across CSS `fontWeight`, icon props (`LucideIcon`),
    typed `catch (err: unknown)`, RPC row types (`SharedWatchedRow`, `SharedWatchlistRow`),
    `WatchEntry[]`, `WatchlistItem[]`, `TmdbWatchProviders`, and Recharts `PieLabelRenderProps`.
  - Fixed all `<img>` warnings by switching to `next/image` (`MediaInfoModal`) or
    annotating external dynamic SVG avatars (`Sidebar`).
  - Removed unused variables and redundant `eslint-disable` comments.
- **X2 (Show page API isolation)**:
  - Created `app/api/shows/[id]/route.ts` handling `media`, `seasons`, `watch_entries`,
    and `episode_progress`.
  - Refactored `app/show/[id]/page.tsx` away from direct browser Supabase access to
    use `/api/shows/[id]`. Removed `lib/supabase/client` import and cleared
    `exhaustive-deps` warning.
- **Flaky test resolved**:
  - `LibraryView.test.tsx` switched from `mockResolvedValueOnce` to `mockResolvedValue`
    so background focus-refetches under parallel test runners no longer fail.
- **Comprehensive tests written for all new behavior (298 tests passing across 36 files)**:
  - `lib/__tests__/stats.test.ts`: `computeStreaks` (today/yesterday/broken/longest),
    `computeTopRated` (deduping by title, highest rating, sorting), `computeRewatchCount`,
    `computeYearlyActivity`, and `availableYears`.
  - `lib/__tests__/tmdbRatings.test.ts`: batch coalescing within 50ms window, in-memory
    caching, `MAX_BATCH` spillover (> 40 items), error handling, `useTmdbRating` hook.
  - `lib/__tests__/formatDate.test.ts`: date string parsing without UTC timezone day shifts,
    `formatAirDate`, `formatDateLabel`, `isUnaired`.
  - `components/__tests__/KeyboardShortcuts.test.tsx`: `⌘↵` / `Ctrl+Enter` (mark watched),
    `⇧↵` (add watchlist), row action chips (`✓` and `+`), and ARIA listbox/combobox attributes.
  - `components/__tests__/RatingStars.test.tsx`: click-current-value-to-clear to `null`,
    clear rating ARIA labels.
  - `app/__tests__/recommendationsSeed.test.ts`: 3-tier seed cascade (rating >= 4 → any
    rating → unrated recency → trending fallback) and cycle offset rotation.

---

## Remaining items

### 1. Migration 012 not applied

`supabase/migrations/012_drop_lists.sql` drops `shared_list()`, indexes, `list_items`,
and `lists`. Destructive; run when ready against Supabase with credentials.

### 2. Browser manual verification (when credentials / environment ready)

---

## Things worth knowing before you touch this

- **One flaky test.** `LibraryView > renders only the first page and grows as the
  sentinel is reached` failed once in a full-suite run and then passed 8/8
  consecutive full runs plus in isolation. I traced the plausible interaction —
  the new focus-refetch in `LibraryView` firing a second `fetch` against a
  `mockResolvedValueOnce` — and it is safe: `mockFetch` resets to returning
  `undefined`, the refetch throws, and the `.catch(() => {})` swallows it without
  touching state. Probably pre-existing timing under parallel load, but it is
  unproven either way and worth a second look if it recurs.
- **`useTmdbSearch` effect order is load-bearing.** The `modeRef` sync effect must
  stay declared above the mode-change effect. Reordering them silently
  reintroduces a stale-mode fetch.
- **`MediaInfoModal`'s cache is per-session and per-title, not per-user-state.**
  If something is marked watched outside the modal (the new ⌘K chips, for
  instance), reopening it can paint the stale `isWatched` for one frame before
  the background revalidate lands. Accepted tradeoff, documented in the file.
- The user asked for an "implementation skill" to do the grunt work. **There isn't
  one installed** — `ListSkills` and `SearchSkills` both come back with nothing
  matching, and the only project skill is `.agents/skills/dorfmovies-design`.
  All of this was done by hand.
