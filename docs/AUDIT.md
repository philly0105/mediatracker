# MediaTracker — Codebase Audit (2026-06-06)

Stack confirmed: Next.js 16.2.6 (App Router, `proxy.ts` middleware), React 19, Supabase (`@supabase/ssr`, anon key only), TMDB, Tailwind v4, Vitest. **Not** CSV-based — the brief's description is stale. Tests: 20/20 pass. No service-role client exists anywhere.

---

## 🔴 Critical Issues

### C1. The entire Share feature is dead — OR every user's data is world-readable
This is a fork, and both branches are critical. All three share pages (`app/share/list/[token]`, `app/share/watched/[token]`, `app/share/watchlist/[token]`) read data with the **cookie-scoped anon client** (`lib/supabase/server.ts`), which RLS binds to the *visitor's* session.

- RLS policies (`migrations/001_initial.sql:95-111`) are `USING (user_id = auth.uid())`.
- A share-link visitor is unauthenticated → `auth.uid()` is `null` → `user_id = null` is never true → **zero rows returned before your `.eq('share_token', …)` filter ever runs** → `notFound()`. Every share link 404s for its only intended audience.
- The *only* ways the feature could "work": (a) RLS is disabled on the live project — in which case the anon key exposes **all users' watch history, ratings, watchlists, and lists** to anyone; or (b) a service-role read — which doesn't exist in the code.

**30-second test to find out which branch you're on:** open any share link in an incognito window.
- 404 → RLS is on, sharing is broken.
- Data renders → RLS is off, you have a data-exposure hole.

**Fix:** Add token-scoped public-read RLS policies, e.g.
```sql
create policy "shared watch_entries readable by token" on watch_entries for select
  using (user_id in (select user_id from user_settings where watched_share_token is not null));
create policy "public read shared user_settings" on user_settings for select
  using (watched_share_token is not null or watchlist_share_token is not null);
create policy "public read shared lists" on lists for select using (is_shared = true);
create policy "public read shared list_items" on list_items for select
  using (list_id in (select id from lists where is_shared = true));
```
(Tighten as needed — the point is anon must be able to read exactly the shared rows.)

### C2. RLS is the *sole* authorization layer — no defense in depth
The dashboard (`app/page.tsx:15-19`) queries `watch_entries`/`watchlist_items` with **no `.eq('user_id', …)` filter at all** — it trusts RLS to scope rows. Same pattern implied across read paths. This works today, but it means a single misapplied migration or a toggled-off RLS switch silently turns the whole app into a public data dump (see C1 branch b). Add explicit `user_id` filters as belt-and-suspenders; never rely on RLS alone for correctness.

### C3. `app/error.tsx` leaks raw error messages and offers no recovery
`{error.message}` is rendered straight to the user (`app/error.tsx:8-10`), and there's no `reset()` button. Next redacts *server* errors in prod, but client/render errors flow through verbatim. Show a generic message + a "Try again" button wired to `reset`.

### C4. `app/api/admin/backfill-collections/route.ts` is a silent no-op
It authenticates with a `Bearer ADMIN_SECRET` header (server-to-server, no Supabase session), then runs `supabase.from('media').update(...)`. Under RLS, `media` updates require `auth.uid() is not null` (`migrations/001:118`). A sessionless call has `auth.uid() = null` → **updates affect 0 rows and return no error**. The route reports `updated: N` based on TMDB data, not DB writes, so it looks like it worked. Also: `ADMIN_SECRET` is not in `.env.local.example`. Either use a service-role client here or run it as an authenticated user.

---

## 🟡 Architecture / Design Smells

### A1. No caching on any TMDB call
None of the `/api/tmdb/*`, `/api/calendar`, or `/api/recommendations` routes set `revalidate`, cache tags, or `fetch` cache options. In Next 16, `fetch` defaults to **no-store**, so every search keystroke, every detail view, every calendar load hits TMDB live. Worst offender: `lib/tmdb.ts:224-255` (`getPopularCollections`) fires **20 sequential detail fetches per page** because `belongs_to_collection` isn't in list responses. This is your biggest latency/cost/rate-limit risk. Wrap TMDB reads in `unstable_cache`/`'use cache'` with a sane `cacheLife`, or `revalidate`-tag them — TMDB metadata barely changes.

### A2. `Media → TmdbSearchResult` mapping is copy-pasted
Identical conversion appears in `MediaCard.tsx:40-48` and `DashboardRecentCards.tsx:17-28` (and more). Extract one `mediaToResult(media)` helper into `lib/`.

### A3. `MediaCard` does an N+1 client fetch for ratings
Each card with a null `vote_average` fires `/api/tmdb/rating` from a `useEffect` (`MediaCard.tsx:29-38`). On a long list with un-backfilled rows that's N parallel requests on mount. Now that `vote_average` is stored (migration 004), backfill the column and drop the per-card fetch.

### A4. No `loading.tsx` / Suspense anywhere
`find app -name loading.tsx` → none. Server pages like the dashboard block on `Promise.all` with a blank screen, no streamed skeleton. Add route-level `loading.tsx` for the data-heavy pages.

### A5. Hardcoded fake "personalization" shipped to prod
`app/page.tsx:130-143` renders *"Based on your love for sci-fi, we've curated a list of hidden gems from the 70s and 80s…"* — static copy + an Unsplash stock image, identical for every user regardless of taste. The "Live Now / Updated today" stat (`app/page.tsx:71-90`) is likewise hardcoded text on whatever show was most recently logged. Either wire these to real data or label them honestly.

### A6. Branding mismatch
`metadata.title` is "MediaTracker" (`app/layout.tsx:11`) but the UI brand is "CINESTACK" (`Sidebar.tsx:60,146`). Pick one.

### A7. Untyped TMDB boundary
`any` is pervasive across `lib/tmdb.ts` and the routes. Acceptable for a solo project, but a single typed `TmdbRawResult` at the fetch boundary would catch shape drift.

---

## 🟢 Quick Wins

- **Remove orphaned dependency `@google/genai`** (`package.json:14`) — grep confirms zero usage; it was the deleted "Ask AI" feature. Drag-along weight in your bundle/install.
- **Clean the stale `.next` types** — `tsc --noEmit` errors on `app/api/ask/route.js` (a deleted route) because `.next/dev/types/validator.ts` is stale. `rm -rf .next` fixes it; worth a note since it makes typecheck look broken when it isn't.
- **`app/error.tsx`** — add a `reset` button and generic message (also C3).
- **`next.config.ts` is empty** — add baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`, a CSP). Add `images.remotePatterns` if/when you adopt `next/image`.
- **`.env.local.example`** — missing `ADMIN_SECRET`; document it so the backfill route is reproducible.
- **Accessibility is actually decent** — `<img>` tags consistently have real `alt` text (e.g. `MediaCard.tsx:89`, `DashboardRecentCards.tsx:44`). Nice. Lists use proper `key` props. No quick wins needed here.

---

## 💡 Feature Suggestions (ranked by effort vs. impact)

1. **Fix & ship Sharing properly** — *Impact: High · Effort: Low–Med.* It's a headline feature that's currently dead (C1). Token-scoped RLS policies (above) make it real. Highest ROI on the list.
2. **TMDB caching (SWR-style)** — *Impact: High · Effort: Low.* `'use cache'` + `cacheLife('days')` on `lib/tmdb.ts` reads, `cacheTag` per tmdb_id. Cuts latency, API cost, and rate-limit risk in one pass. Directly answers your "offline/stale-while-revalidate" question.
3. **Search & filter on Movies/Shows/Watchlist** — *Impact: High · Effort: Med.* You already have `idx_media_genres` GIN + `idx_media_type` (migration 005) but no UI consuming them. Add genre/year/rating filters client-side over the already-fetched list; add a text filter. The DB is ready.
4. **Surface episode-level progress** — *Impact: Med · Effort: Low–Med.* `episode_progress` table + `EpisodeTracker.tsx` already exist; import marks every episode watched. Show a "12/24 episodes · 50%" bar on show cards/detail instead of binary watched. The data's already there.
5. **Backfill `vote_average` + retire the per-card rating fetch** — *Impact: Med · Effort: Low.* Fixes A3; makes lists snappier.
6. **`next/image` migration** — *Impact: Med · Effort: Med.* Zero usage today; all raw `<img>` of TMDB w500 posters. Needs `remotePatterns` for `image.tmdb.org`, `api.dicebear.com`, `images.unsplash.com`. Real LCP/bandwidth win on poster-grid pages, but touches ~20 files — do it deliberately, not urgently.

---

## Prioritized Fix List

```
[ ] File: supabase/migrations/006_share_policies.sql (new) | Issue: share links 404 for visitors because RLS hides owner rows | Fix: add token/is_shared-scoped public SELECT policies for watch_entries, watchlist_items, user_settings, lists, list_items
[ ] File: app/page.tsx + all read routes        | Issue: RLS is the only thing scoping data; no defense in depth | Fix: add explicit .eq('user_id', user.id) filters alongside RLS
[ ] File: app/error.tsx                          | Issue: leaks raw error.message, no recovery | Fix: render generic copy + add reset() retry button
[ ] File: app/api/admin/backfill-collections/route.ts | Issue: sessionless anon client can't write under RLS → silent no-op | Fix: use a service-role client (or run authenticated); add ADMIN_SECRET to .env example
[ ] File: app/page.tsx:130-143,71-90            | Issue: fake "personalized" copy + hardcoded "Live Now/Updated today" shown to all users | Fix: wire to real data or relabel honestly
[ ] File: lib/tmdb.ts (+ /api/tmdb/*, /api/calendar) | Issue: no caching; getPopularCollections does 20 fetches/page | Fix: wrap reads in 'use cache'/unstable_cache with cacheLife + tags
[ ] File: components/MediaCard.tsx:29-38         | Issue: N+1 client rating fetch per card | Fix: backfill media.vote_average, remove the useEffect fetch
[ ] File: lib/ (new mediaToResult helper)        | Issue: Media→TmdbSearchResult mapping duplicated across components | Fix: extract one shared helper
[ ] File: app/<routes>/loading.tsx (new)         | Issue: blank screen during server data fetches | Fix: add route-level loading skeletons
[ ] File: package.json:14                        | Issue: @google/genai is an orphaned dependency | Fix: remove it
[ ] File: .next (build artifact)                 | Issue: stale type ref to deleted app/api/ask makes tsc error | Fix: rm -rf .next and rebuild
[ ] File: next.config.ts                         | Issue: empty config, no security headers | Fix: add headers() with baseline security headers
[ ] File: app/layout.tsx:11 vs Sidebar.tsx       | Issue: brand mismatch (MediaTracker vs CINESTACK) | Fix: unify branding
```
