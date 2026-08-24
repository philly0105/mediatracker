# Task 7 Report: Seed Show Details from the Server

## Summary
Task 7 and Fix Round 1 have been completed following the TDD RED/GREEN workflow:
1. `lib/showDetails.ts`: Extracted `loadShowDetails({ supabase, userId, mediaId })` which initiates media, seasons, and latest watch entry queries concurrently in parallel via `Promise.all`. Throws query errors from media, seasons, entry, and progress queries, returning `null` only when media is confirmed absent with `error: null`. Skips `episode_progress` when a show has no seasons or media is absent, and enforces `user_id` scoping.
2. `app/api/shows/[id]/route.ts`: GET route handler delegates full show reads to `loadShowDetails`. In the `?only=entry` fast path, queries only `watch_entries`, returns 500 when the query fails, returns `{ entry }` on success, returns 401 for unauthenticated requests, and catches loader errors to return 500.
3. `app/(app)/show/[id]/page.tsx`: Converted `ShowDetailPage` into an async Server Component that awaits `params`, authenticates via `getAuthenticatedUser()` (redirecting unauthenticated users to `/login`), loads show details via `loadShowDetails`, triggers `notFound()` for confirmed absent shows, allows loader errors to bubble up to error boundaries, and passes `mediaId` and `initialDetails` to `<ShowDetailClient key={id} mediaId={id} initialDetails={details} />`.
4. `components/ShowDetailClient.tsx`: Interactive show client component seeded from `initialDetails`. Eliminates client-side mount fetch `/api/shows/${id}` and in-component loading branch while preserving non-blocking episode metadata fetch (`/api/episodes/meta?media_id=${mediaId}`), cascade undo with deferred actions, rating updates, details modal, mark show as watched, and post-mutation `?only=entry` refresh.
5. `app/__tests__/showDetailPage.test.tsx`: Implemented server page and navigation tests proving unauthenticated redirect, confirmed notFound, loader error propagation, page component keying, and cross-show navigation state isolation with two distinct show fixtures.
6. `app/__tests__/showRoute.test.ts`: Implemented route handler tests covering unauthenticated 401, `only=entry` single-table query, `only=entry` 500 error response, full load 200, confirmed absence 404, and loader error 500.
7. `lib/__tests__/showDetails.test.ts`: Unit tests covering concurrent reads, deferred progress query execution, null media row handling, empty seasons handling, auth scoping, and parameterized tests for each query error.
8. `app/__tests__/showEpisodeUndo.test.tsx`: Verified `ShowDetailClient` rendering with server seed data, verified no initial `/api/shows/${id}` fetch occurs on mount, and verified cascade undo and mutation interactions.

---

## Files Changed

### Created
1. `lib/showDetails.ts`: Shared query loader `loadShowDetails` and `ShowDetails` interface with error surfacing.
2. `lib/__tests__/showDetails.test.ts`: Unit tests covering query construction, concurrency, auth scoping, empty seasons, null handling, and parameterized query error handling.
3. `components/ShowDetailClient.tsx`: Interactive show client component seeded from `initialDetails`.
4. `app/__tests__/showRoute.test.ts`: Focused route tests covering `only=entry` fast path, error handling, auth, and full loads.
5. `app/__tests__/showDetailPage.test.tsx`: Server page tests covering auth redirect, notFound, loader error bubbling, and cross-show navigation isolation.
6. `task-7-report.md` / `.superpowers/sdd/2026-08-23-signed-in-production-performance/task-7-report.md`: Canonical Task 7 execution report.

### Modified
1. `app/api/shows/[id]/route.ts`: Added error capturing for `only=entry` returning 500, loader error try-catch returning 500, and auth check.
2. `app/(app)/show/[id]/page.tsx`: Added `key={id}` to `ShowDetailClient` to guarantee state reset across show navigations, auth redirect, and confirmed notFound.
3. `app/__tests__/showEpisodeUndo.test.tsx`: Updated tests to render `ShowDetailClient` with direct server seed data and assert no initial show-details fetch.

---

## Fix Round 1 Details

### 1. Cross-Show Navigation State
- Added `key={id}` to `<ShowDetailClient key={id} mediaId={id} initialDetails={details} />` in `app/(app)/show/[id]/page.tsx`.
- In `app/__tests__/showDetailPage.test.tsx`, added a test with two show fixtures (Show 1: Breaking Bad with 5/5 episodes watched, 5-star rating; Show 2: Better Call Saul with 0/10 episodes watched, no entry/rating).
- Verified that on rerender/navigation to the second show, local state (`progress`, `entry`, `rating`, `episodes`) cleanly resets and does not inherit the first show's state.

### 2. Supabase Query Errors
- In `lib/showDetails.ts`, `loadShowDetails` checks for errors in `media`, `seasons`, `watch_entries`, and `episode_progress` queries and surfaces/throws them.
- Confirmed absence returns `null` only when `!mediaRes.data` and `!mediaRes.error`.
- Added parameterized tests (`it.each`) in `lib/__tests__/showDetails.test.ts` verifying that failures on `media`, `seasons`, `watch_entries`, and `episode_progress` reject with the query error.

### 3. only=entry Error Handling
- In `app/api/shows/[id]/route.ts`, captured errors from `supabase.from('watch_entries')` and return `NextResponse.json({ error: error.message }, { status: 500 })`.
- Added `app/__tests__/showRoute.test.ts` verifying that `only=entry` queries only `watch_entries`, returns `{ entry }` on success, returns 500 on query failure, returns 401 when unauthenticated, returns 404 on absent show, and returns 500 on loader error.

### 4. Server Page Test Suite
- In `app/__tests__/showDetailPage.test.tsx`, added tests verifying:
  - Unauthenticated request triggers `redirect('/login')`.
  - Confirmed absent show triggers `notFound()`.
  - Loader errors propagate up and are not swallowed or converted into `notFound()`.
  - Page output includes `key={id}` matching the media ID.

---

## Verification Evidence

### 1. Focused Task 7 Suite
**Command:**
```powershell
npm test -- lib/__tests__/showDetails.test.ts app/__tests__/showRoute.test.ts app/__tests__/showDetailPage.test.tsx app/__tests__/showEpisodeUndo.test.tsx components/__tests__/EpisodeTracker.test.tsx
```
**Output:**
```
 RUN  v4.1.8 C:/Users/aideo/Projects/mediatracker/.worktrees/signed-in-production-performance

 Test Files  5 passed (5)
      Tests  44 passed (44)
   Start at  03:31:12
   Duration  1.46s (transform 458ms, setup 466ms, import 1.09s, tests 440ms, environment 3.37s)
```

### 2. Full Test Suite Run
**Command:**
```powershell
npm run test:run
```
**Output:**
```
 RUN  v4.1.8 C:/Users/aideo/Projects/mediatracker/.worktrees/signed-in-production-performance

 Test Files  57 passed (57)
      Tests  471 passed (471)
   Start at  03:31:17
   Duration  8.71s (transform 10.81s, setup 13.21s, import 37.72s, tests 23.32s, environment 108.51s)
```

### 3. Targeted ESLint
**Command:**
```powershell
npx eslint lib/showDetails.ts lib/__tests__/showDetails.test.ts 'app/api/shows/[id]/route.ts' 'app/(app)/show/[id]/page.tsx' app/__tests__/showDetailPage.test.tsx app/__tests__/showRoute.test.ts app/__tests__/showEpisodeUndo.test.tsx components/ShowDetailClient.tsx
```
**Result:** 0 errors, 0 warnings (clean exit code 0).

### 4. TypeScript Validation
**Command:**
```powershell
npx tsc --noEmit
```
**Result:** 0 errors (clean exit code 0).

### 5. Production Build Validation
**Command:**
```powershell
npm run build
```
**Output:**
```
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 4.0s
  Running TypeScript ...
  Finished TypeScript in 6.2s ...
  Collecting page data using 31 workers ...
✓ Generating static pages using 31 workers (46/46) in 318ms
  Finalizing page optimization ...

Route (app)
├ ƒ /show/[id]
├ ƒ /api/shows/[id]
...
```
**Result:** Clean build with route `ƒ /show/[id]` and `ƒ /api/shows/[id]` dynamically server-rendered on demand.

### 6. Git Diff Whitespace Check
**Command:**
```powershell
git diff --check
```
**Result:** Clean exit code 0.
