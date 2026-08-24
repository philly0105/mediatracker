# Task 6 Report: Seed the Library from the Server

## Summary
Task 6, Fix Round 1, and Fix Round 2 have been completed following the TDD RED/GREEN workflow specified in `task-6-brief.md` and the signed-in production performance plan:
1. `lib/watchEntries.ts`: Extracted `WATCH_SELECT`, `WATCH_SELECT_LEFT`, and shared read query construction into `fetchWatchEntries({ supabase, userId, type })`. It preserves PostgREST paging via `fetchAllRows` with 1,000-row page windows, `truncated` boolean propagation, deterministic `watched_at` DESC then `id` DESC ordering, and authenticated `user_id` scoping.
2. `app/api/watch/route.ts`: Converted the GET route handler to delegate to `fetchWatchEntries`, preserving existing API JSON response shapes (`{ entries, truncated }` on success, `{ error }` on failure) while leaving POST, PATCH, and DELETE untouched.
3. `app/(app)/library/page.tsx`: Converted `LibraryPage` to an async Server Component that awaits `searchParams`, authenticates via `getAuthenticatedUser()`, fetches initial rows on the server with `fetchWatchEntries`, throws loader errors to `error.tsx`, and passes `initialEntries`, `initialType`, and `initialFetchedAt` to `LibraryView` wrapped in `<Suspense fallback={<LibraryLoading />}>`.
4. `components/LibraryView.tsx`: Seeds `entries` and sets `loading = false` synchronously during initial state initialization when `initialType === typeFilter`. Added a monotonic request-generation guard (`requestGenRef`) across all fetch paths (`useEffect`, `handleRefresh`, `refetchIfVisible`, `handleEntryUpdated`) and an in-flight request ownership mechanism (`inFlightRef`) to coalesce concurrent background visibility/focus requests and prevent duplicate network fetches.
5. `components/__tests__/LibraryView.test.tsx`: Implemented tests covering hydration no-fetch, type switching, sequential switches, StrictMode double-mount, stale-seed refetch, deferred-promise race conditions, visibility/focus coalescing, active manual refresh coalescing with control unstranding, and post-mutation entry-update guarantees.
6. `lib/__tests__/watchEntries.test.ts`: Implemented tests for user scoping, deterministic ordering, inner-join `media.type` filtering for `movie` and `show`, parameterized fallback for unrecognized types and `null`, pagination truncation, and error handling.

## Files Changed

### Created
1. `lib/watchEntries.ts`: Shared query loader and PostgREST pagination handler.
2. `lib/__tests__/watchEntries.test.ts`: Unit tests covering query builders, ordering, joins, type filtering, pagination, and error propagation.
3. `task-6-report.md` / `.superpowers/sdd/2026-08-23-signed-in-production-performance/task-6-report.md`: Canonical Task 6 execution and fix report.

### Modified
1. `app/api/watch/route.ts`: Replaced internal GET query construction with `fetchWatchEntries`.
2. `app/(app)/library/page.tsx`: Stream initial watch entries from server with searchParams resolution and auth guard.
3. `components/LibraryView.tsx`: In-flight ownership coalescing, monotonic generation guard on all fetch paths, and unconditional refresh button unstranding.
4. `components/__tests__/LibraryView.test.tsx`: Comprehensive concurrency, coalescing, and race condition test coverage.

---

## Fix Round 2

### Summary of Fix Round 2 Improvements
1. **Cross-Path In-Flight Ownership & Coalescing**:
   - Implemented `inFlightRef` tracking active current-type requests (`{ type, gen, promise }`).
   - `refetchIfVisible` checks `if (inFlightRef.current && inFlightRef.current.type === typeFilter) return` to coalesce back-to-back `visibilitychange` and `focus` events without issuing duplicate background GET requests.
   - Background requests also coalesce when manual refresh is already in flight for the active type.
2. **Control Lifecycle Unstranding**:
   - `handleRefresh` resets `setRefreshing(false)` unconditionally in `.finally()`, ensuring the Refresh button cannot be stranded spinning or disabled if a filter change or other event increments the generation.
   - `useEffect` and `handleEntryUpdated` clean up `inFlightRef` on settlement and effect disposal.
3. **Post-Mutation Read Freshness**:
   - `handleEntryUpdated` increments `requestGenRef.current` and launches a fresh fetch, superseding any pre-mutation in-flight request and guaranteeing that the eventual accepted state reflects post-mutation data.
4. **Preserved Filter Race & Type Invalidation**:
   - Filter switches increment `requestGenRef.current`, invalidate older in-flight fetches, and cleanly load or serve the target type from cache.

### TDD RED Phase Verification
- **Back-to-back visibility & focus:** failed prior to in-flight coalescing with `expected "vi.fn()" to be called 1 times, but got 2 times`.
- **Manual refresh & visibility/focus:** failed prior to coalescing and control unstranding with `expected "vi.fn()" to be called 1 times, but got 3 times`.

### TDD GREEN Phase Verification
- **Focused Suite (`npm test -- lib/__tests__/watchEntries.test.ts components/__tests__/LibraryView.test.tsx lib/__tests__/watchEntrySort.test.ts app/__tests__/watchlistGroups.test.tsx`):**
  4 test files, 35 tests passed.
- **Targeted TypeScript (`npx tsc --noEmit`):**
  0 errors.
- **Targeted ESLint (`npx eslint components/LibraryView.tsx components/__tests__/LibraryView.test.tsx`):**
  0 errors, 0 warnings.
- **Git Diff Check (`git diff --check`):**
  Clean exit code 0.
