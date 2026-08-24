# Signed-in production performance implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce JavaScript, data waterfalls, image contention, and avoidable rendering work in the authenticated DorfMovies experience while preserving its behavior and design.

**Architecture:** Keep the authenticated layout small and load search, modal, and chart code after user intent or viewport proximity. Seed the two clearest hydration-fetch pages from Server Components, keep client caches coherent after mutations, and replace routine Framer Motion use with CSS transforms and opacity.

**Tech Stack:** Next.js 16.2.6 App Router and Turbopack, React 19.2.4, TypeScript 5, Supabase SSR, Tailwind CSS 4, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-23-signed-in-production-performance.md`

## Global constraints

- Optimize the signed-in production experience. Local development speed is not a target.
- Verify with a local production build and local browser only. Do not deploy.
- Preserve the Autumn Pine design, all user-facing behavior, focus handling, modal stacking, keyboard shortcuts, undo, and reduced motion.
- Preserve every unrelated dirty file. Before each overlapping edit, inspect `git diff -- <file>` and merge rather than replace.
- Read the installed Next.js 16 guides under `node_modules/next/dist/docs/` before changing lazy loading, images, navigation caching, or Turbopack configuration.
- Load the TypeScript, Supabase, Postgres, TDD, and verification skills before their corresponding implementation steps.
- Do not add a dependency or a database migration unless measured evidence requires it.
- Each performance claim needs before and after evidence from the production build or a real local browser trace.

---

## File map

- `next.config.ts` owns Next.js caching, images, headers, and the explicit Turbopack project root.
- `app/layout.tsx` owns the smallest global providers and decorative canvas.
- `app/(app)/layout.tsx` owns authenticated navigation and global interaction providers.
- `components/KeyboardShortcuts.tsx` listens for shortcuts and dynamically mounts search/help UI.
- `components/MediaModalProvider.tsx` owns the modal API and stack state without importing modal implementation code.
- `components/MediaModalStack.tsx` will own Framer Motion presence and the lazily loaded modal bodies.
- `components/ToastProvider.tsx`, `components/Sidebar.tsx`, `components/MultiSelectProvider.tsx`, `components/ui/BentoGrid.tsx`, and `components/ui/SegmentedControl.tsx` will use CSS motion.
- `components/DeferredStatsCharts.tsx` will delay Recharts until its reserved region approaches the viewport.
- `lib/watchEntries.ts` will own the paged library read shared by the API and Server Component.
- `components/LibraryView.tsx` will accept server-seeded entries and retain the short return-navigation cache.
- `lib/showDetails.ts` will own the show detail read shared by the API and Server Component.
- `components/ShowDetailClient.tsx` will own show interactions using server-seeded data.
- `docs/performance/2026-08-23-signed-in-production.md` will hold baseline and final evidence.

### Task 1: Pin the build root and record the baseline

**Files:**
- Modify: `next.config.ts`
- Create: `lib/__tests__/nextConfig.test.ts`
- Create: `docs/performance/2026-08-23-signed-in-production.md`

**Interfaces:**
- Produces: `nextConfig.turbopack.root: string`, equal to the repository working directory during the build.
- Produces: a fixed evidence format used again in Task 9.

- [ ] **Step 1: Write the failing configuration test**

```ts
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

describe('Next production configuration', () => {
  it('pins Turbopack to this repository', () => {
    expect(nextConfig.turbopack?.root).toBe(process.cwd())
  })
})
```

- [ ] **Step 2: Run the test and confirm the root is absent**

Run: `npm test -- lib/__tests__/nextConfig.test.ts`

Expected: FAIL because `nextConfig.turbopack` is undefined.

- [ ] **Step 3: Add the supported Next.js 16 setting**

Add this peer to `experimental` and `images` in `next.config.ts`:

```ts
turbopack: {
  root: process.cwd(),
},
```

- [ ] **Step 4: Build and capture the baseline**

Run: `npm test -- lib/__tests__/nextConfig.test.ts`

Run: `npm run build`

Expected: PASS, and the multiple-lockfile workspace-root warning is gone.

Write the build commit, build duration, authenticated layout chunk names and bytes, Dashboard total initial route chunks, Stats total initial route chunks, and the 359.9 KiB Recharts chunk to `docs/performance/2026-08-23-signed-in-production.md`. Mark these numbers `before`. Use `.next/server/app/(app)/*/page_client-reference-manifest.js` and `.next/static/chunks/*.js` as the source.

- [ ] **Step 5: Commit the isolated configuration change**

```powershell
git add -- next.config.ts lib/__tests__/nextConfig.test.ts docs/performance/2026-08-23-signed-in-production.md
git commit -m "perf(build): pin Turbopack root and record baseline"
```

### Task 2: Remove Framer Motion from the root and toast path

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/ToastProvider.tsx`
- Modify: `components/__tests__/ToastProvider.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Preserves: `toast(message, options): string` and `dismiss(id): void`.
- Produces: `.toast-enter` CSS animation with a reduced-motion override inherited from the global rule.

- [ ] **Step 1: Make the toast test enforce a Framer-free provider**

Delete the `framer-motion` mock and its helper types from `components/__tests__/ToastProvider.test.tsx`. Add:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

it('does not put Framer Motion in the root provider graph', () => {
  const source = readFileSync(join(__dirname, '..', 'ToastProvider.tsx'), 'utf8')
  expect(source).not.toContain("from 'framer-motion'")
})
```

- [ ] **Step 2: Run the toast tests and confirm the new assertion fails**

Run: `npm test -- components/__tests__/ToastProvider.test.tsx`

Expected: FAIL on the Framer Motion import assertion.

- [ ] **Step 3: Replace toast motion with CSS and remove the global motion wrapper**

Replace `AnimatePresence` and `motion.div` with the existing `toasts.map` and a normal `<div className="toast-enter ...">`. Preserve all live-region, pause, resume, action, and dismissal handlers.

Add to `app/globals.css`:

```css
@keyframes toast-enter {
  from { opacity: 0; transform: translate3d(0, 16px, 0) scale(.95); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

.toast-enter {
  animation: toast-enter var(--dur-base) var(--ease-out-expo) both;
}
```

Remove the `MotionProvider` import and wrapper from `app/layout.tsx`. Leave `components/MotionProvider.tsx` untouched unless the user separately authorizes deleting the now-unused file.

- [ ] **Step 4: Verify toast behavior**

Run: `npm test -- components/__tests__/ToastProvider.test.tsx`

Expected: all toast timing, action, live-region, and source-boundary tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- app/layout.tsx app/globals.css components/ToastProvider.tsx components/__tests__/ToastProvider.test.tsx
git commit -m "perf(shell): replace root motion runtime with CSS"
```

### Task 3: Lazy-load search, help, and media details

**Files:**
- Create: `components/MediaModalStack.tsx`
- Modify: `components/MediaModalProvider.tsx`
- Modify: `components/KeyboardShortcuts.tsx`
- Modify: `components/__tests__/MediaModalProvider.test.tsx`
- Modify: `components/__tests__/KeyboardShortcuts.test.tsx`
- Create: `components/__tests__/performanceBoundaries.test.ts`

**Interfaces:**
- `MediaModalStackProps = { entries: readonly StackEntry[]; onClose: () => void; onNavigateAway: () => void; onExitComplete: () => void; actions: ReturnType<typeof useMediaActions> }`.
- `StackEntry` becomes an exported type from `MediaModalProvider.tsx`.
- `MediaModalProvider` preserves `openMedia` and `closeMedia` exactly.

- [ ] **Step 1: Add source-boundary tests before changing imports**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (name: string) => readFileSync(join(__dirname, '..', name), 'utf8')

describe('authenticated shell bundle boundaries', () => {
  it('loads shortcut panels through next/dynamic', () => {
    const value = source('KeyboardShortcuts.tsx')
    expect(value).toContain("from 'next/dynamic'")
    expect(value).toContain("import('@/components/SearchOverlay')")
    expect(value).toContain("import('@/components/KeyboardHelp')")
  })

  it('keeps modal implementation out of the provider module', () => {
    const value = source('MediaModalProvider.tsx')
    expect(value).toContain("import('./MediaModalStack')")
    expect(value).not.toMatch(/^import .*MediaInfoModal/m)
    expect(value).not.toContain("from 'framer-motion'")
  })
})
```

- [ ] **Step 2: Run the boundary tests and confirm both fail**

Run: `npm test -- components/__tests__/performanceBoundaries.test.ts`

Expected: two FAIL results for missing dynamic imports.

- [ ] **Step 3: Split the media stack at the Client Component boundary**

In `MediaModalProvider.tsx`, define the dynamic component at module scope:

```ts
import dynamic from 'next/dynamic'

const MediaModalStack = dynamic(() => import('./MediaModalStack'))
```

Add `const [hostLoaded, setHostLoaded] = useState(false)`. Set it to true inside `openMedia` before updating the stack. Render `<MediaModalStack>` only when `hostLoaded` is true. Keep it mounted after the first open so its `AnimatePresence` receives the transition from one entry to zero and can call `onExitComplete`.

Move the existing `AnimatePresence`, `MediaInfoModal` mapping, and default action wiring to `components/MediaModalStack.tsx`. The new file may import Framer Motion because it is outside the initial graph.

- [ ] **Step 4: Dynamically import shortcut panels**

At module scope in `KeyboardShortcuts.tsx`:

```ts
import dynamic from 'next/dynamic'

const SearchOverlay = dynamic(() => import('@/components/SearchOverlay'))
const KeyboardHelp = dynamic(() => import('@/components/KeyboardHelp'))
```

Remove `AnimatePresence` from this file. Render each dynamic component conditionally. Keep the existing open guards, URL cleanup, focus callbacks, and close callbacks.

- [ ] **Step 5: Update behavioral tests for asynchronous module resolution**

Remove ownership assertions that require `AnimatePresence` inside `MediaModalProvider.tsx`. Assert instead that `MediaModalStack.tsx` owns both `AnimatePresence` and `MediaInfoModal`. Change immediate overlay lookups after opening shortcuts to `await screen.findByRole(...)` where dynamic resolution adds a microtask.

- [ ] **Step 6: Run the focused provider and keyboard tests**

Run: `npm test -- components/__tests__/performanceBoundaries.test.ts components/__tests__/MediaModalProvider.test.tsx components/__tests__/KeyboardShortcuts.test.tsx components/__tests__/similarModalProviders.test.tsx`

Expected: PASS with modal stacking, delayed `onClosed`, search focus restoration, and shortcut behavior intact.

- [ ] **Step 7: Commit**

```powershell
git add -- components/MediaModalStack.tsx components/MediaModalProvider.tsx components/KeyboardShortcuts.tsx components/__tests__/performanceBoundaries.test.ts components/__tests__/MediaModalProvider.test.tsx components/__tests__/KeyboardShortcuts.test.tsx
git commit -m "perf(shell): defer search and media modal bundles"
```

### Task 4: Remove routine Framer Motion from signed-in routes

**Files:**
- Modify: `components/Sidebar.tsx`
- Modify: `components/MultiSelectProvider.tsx`
- Modify: `components/ui/BentoGrid.tsx`
- Modify: `components/ui/SegmentedControl.tsx`
- Modify: `components/CalendarClient.tsx`
- Modify: `app/(app)/streaming/page.tsx`
- Modify: `app/(app)/watchlist/page.tsx`
- Modify: `app/globals.css`
- Modify: `components/__tests__/MultiSelectProvider.test.tsx`
- Modify: `components/__tests__/SegmentedControl.test.tsx`
- Modify: `app/__tests__/watchlistGroups.test.tsx`

**Interfaces:**
- Preserves all component props and selection/navigation behavior.
- Produces CSS classes `.motion-fade-up`, `.motion-sheet-up`, `.motion-toolbar-up`, and `.motion-item-in` using only opacity and transform.

- [ ] **Step 1: Extend the boundary test**

Add the shell and synchronous route files above to an array and assert that none contains `from 'framer-motion'`. Keep `MediaModalStack`, `SearchOverlay`, `MediaInfoModal`, `SimilarModal`, `KeyboardHelp`, and `TonightPickModal` outside this array because they load on demand.

- [ ] **Step 2: Run the test and confirm the listed imports fail it**

Run: `npm test -- components/__tests__/performanceBoundaries.test.ts`

Expected: FAIL with the current Framer Motion import list.

- [ ] **Step 3: Add the CSS motion classes**

```css
@keyframes fade-up {
  from { opacity: 0; transform: translate3d(0, 20px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes sheet-up {
  from { opacity: 0; transform: translate3d(0, 100%, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

.motion-fade-up { animation: fade-up .45s var(--ease-out-expo) both; }
.motion-sheet-up { animation: sheet-up .24s var(--ease-out-expo) both; }
.motion-toolbar-up { animation: fade-up .2s var(--ease-out-expo) both; }
.motion-item-in { animation: fade-up .2s var(--ease-out-expo) both; }
```

The existing reduced-motion rule reduces each animation to 0.01ms.

- [ ] **Step 4: Replace declarative motion with state and CSS**

- Sidebar: conditionally render the mobile backdrop and drawer as normal elements. Apply `.motion-sheet-up` to the drawer and a CSS opacity animation to the backdrop.
- MultiSelectProvider: conditionally render its fixed action bar with `.motion-toolbar-up`.
- BentoGrid: replace `motion.div` with `div` and set `animationDelay` to `${delay}s` on `.motion-fade-up`.
- SegmentedControl and Streaming: render the active background directly from `aria-pressed` state. Use background and transform transitions, not `layoutId`.
- Calendar: replace each timeline `motion.div` with `.motion-fade-up`; cap stagger at 300ms so long months do not leave content invisible.
- Watchlist: use the stable item key and `.motion-item-in`. Remove layout animation and `AnimatePresence`; optimistic removal still updates immediately.
- Watchlist Tonight's Pick: use `next/dynamic` at module scope and mount it only while `showPick` is true.

- [ ] **Step 5: Run focused interaction tests**

Run: `npm test -- components/__tests__/NavItem.test.tsx components/__tests__/MultiSelectProvider.test.tsx components/__tests__/SegmentedControl.test.tsx app/__tests__/watchlistGroups.test.tsx components/__tests__/performanceBoundaries.test.ts`

Expected: PASS. Selection actions, provider filters, watchlist movement/removal, and navigation remain unchanged.

- [ ] **Step 6: Commit**

```powershell
git add -- components/Sidebar.tsx components/MultiSelectProvider.tsx components/ui/BentoGrid.tsx components/ui/SegmentedControl.tsx components/CalendarClient.tsx 'app/(app)/streaming/page.tsx' 'app/(app)/watchlist/page.tsx' app/globals.css components/__tests__/MultiSelectProvider.test.tsx components/__tests__/SegmentedControl.test.tsx app/__tests__/watchlistGroups.test.tsx
git commit -m "perf(motion): move routine route effects to CSS"
```

### Task 5: Defer Recharts until the chart region approaches the viewport

**Files:**
- Create: `components/DeferredStatsCharts.tsx`
- Create: `components/__tests__/DeferredStatsCharts.test.tsx`
- Modify: `app/(app)/stats/page.tsx`

**Interfaces:**
- Consumes: the existing `StatsCharts` props via `React.ComponentProps<typeof StatsCharts>`.
- Produces: `DeferredStatsCharts` with a fixed-height skeleton and a 300px IntersectionObserver root margin.

- [ ] **Step 1: Write the viewport gate test**

Use a captured observer callback typed as `(entries: readonly { isIntersecting: boolean }[]) => void`. Assert that the chart test double is absent before intersection, then present after `{ isIntersecting: true }`:

```ts
vi.mock('../StatsCharts', () => ({ default: () => <div>loaded charts</div> }))

expect(screen.queryByText('loaded charts')).not.toBeInTheDocument()
act(() => observerCallback([{ isIntersecting: true }]))
expect(await screen.findByText('loaded charts')).toBeInTheDocument()
```

- [ ] **Step 2: Run the test and confirm the component is missing**

Run: `npm test -- components/__tests__/DeferredStatsCharts.test.tsx`

Expected: FAIL because `DeferredStatsCharts.tsx` does not exist.

- [ ] **Step 3: Implement the client-only dynamic boundary**

Inside `DeferredStatsCharts.tsx`, declare:

```ts
const LazyStatsCharts = dynamic(() => import('./StatsCharts'), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
})
```

Observe a wrapper with `{ rootMargin: '300px 0px' }`. Render `ChartsSkeleton` until it intersects, disconnect the observer, then render `LazyStatsCharts`. Use the existing card colors and reserve the same chart heights to avoid layout shift.

- [ ] **Step 4: Switch the Stats server page to the deferred wrapper**

Replace the direct `StatsCharts` import and element with `DeferredStatsCharts`. Do not move the server-side aggregates into the browser.

- [ ] **Step 5: Test and build-check the chunk boundary**

Run: `npm test -- components/__tests__/DeferredStatsCharts.test.tsx lib/__tests__/stats.test.ts`

Run: `npm run build`

Expected: PASS. The Stats initial entry chunks do not include the chunk containing the `recharts` string. That chunk remains available as an async chunk.

- [ ] **Step 6: Commit**

```powershell
git add -- components/DeferredStatsCharts.tsx components/__tests__/DeferredStatsCharts.test.tsx 'app/(app)/stats/page.tsx'
git commit -m "perf(stats): defer charts until viewport intent"
```

### Task 6: Seed the Library from the server

**Files:**
- Create: `lib/watchEntries.ts`
- Create: `lib/__tests__/watchEntries.test.ts`
- Modify: `app/api/watch/route.ts`
- Modify: `app/(app)/library/page.tsx`
- Modify: `components/LibraryView.tsx`
- Modify: `components/__tests__/LibraryView.test.tsx`

**Interfaces:**
- Produces: `fetchWatchEntries({ supabase, userId, type }): Promise<{ entries: WatchEntry[]; error: string | null; truncated: boolean }>`.
- `LibraryView` gains `initialEntries: WatchEntry[]`, `initialType: 'all' | 'movie' | 'show'`, and `initialFetchedAt: number`.

- [ ] **Step 1: Protect the existing dirty API work**

Run: `git diff -- app/api/watch/route.ts`

Save no temporary file. Read the diff and preserve its validation and error-handling changes while extracting only GET query construction.

- [ ] **Step 2: Write the paged-loader tests**

Test that `fetchWatchEntries` passes the authenticated user id, applies `media.type` only for `movie` or `show`, preserves the deterministic `watched_at` plus `id` order, and returns `truncated` from `fetchAllRows`.

- [ ] **Step 3: Run the loader tests and confirm the module is missing**

Run: `npm test -- lib/__tests__/watchEntries.test.ts`

Expected: FAIL because `lib/watchEntries.ts` does not exist.

- [ ] **Step 4: Extract the shared read and seed the page**

Move `WATCH_SELECT`, `WATCH_SELECT_LEFT`, and the GET paging callback into `lib/watchEntries.ts`. Keep POST, PATCH, and DELETE in the route. The API calls the helper and returns its current JSON shape.

Make `app/(app)/library/page.tsx` await `searchParams`, authenticate, create the server client, call `fetchWatchEntries`, and pass the rows plus `Date.now()` to `LibraryView`. Redirect unauthenticated users to `/login`. Throw on a loader error so `library/error.tsx` handles it.

In `LibraryView`, seed state only when `initialType === typeFilter`. Treat that seed as a fresh cache hit on the first effect. Type switches still fetch their selected type, and the existing 30-second module cache still powers return navigation.

- [ ] **Step 5: Prove hydration does not refetch seeded data**

Add a test that renders `LibraryView` with one `initialEntries` row and matching `initialType`, then asserts the row is visible and `fetch` has not been called. Add a second test that changes the type filter and asserts one `/api/watch?type=movie` call.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- lib/__tests__/watchEntries.test.ts components/__tests__/LibraryView.test.tsx lib/__tests__/watchEntrySort.test.ts app/__tests__/watchlistGroups.test.tsx`

Expected: PASS with no initial hydration fetch and unchanged filtering, deletion, undo, and cache behavior.

- [ ] **Step 7: Commit only the intended hunks**

```powershell
git add -- lib/watchEntries.ts lib/__tests__/watchEntries.test.ts 'app/(app)/library/page.tsx' components/LibraryView.tsx components/__tests__/LibraryView.test.tsx
git add -p -- app/api/watch/route.ts
git commit -m "perf(library): stream initial entries from the server"
```

### Task 7: Seed show details from the server

**Files:**
- Create: `lib/showDetails.ts`
- Create: `lib/__tests__/showDetails.test.ts`
- Create: `components/ShowDetailClient.tsx`
- Modify: `app/api/shows/[id]/route.ts`
- Modify: `app/(app)/show/[id]/page.tsx`
- Modify: `app/__tests__/showEpisodeUndo.test.tsx`

**Interfaces:**
- Produces: `loadShowDetails({ supabase, userId, mediaId }): Promise<ShowDetails | null>`.
- Produces: `ShowDetailClient({ mediaId, initialDetails })` where `initialDetails` contains `media`, `seasons`, `entry`, and `progress`.
- Preserves: `/api/shows/[id]?only=entry` for post-mutation rating refresh.

- [ ] **Step 1: Write the shared-loader test**

Test that media, seasons, and latest entry begin concurrently; progress runs only after season ids exist; a missing media row returns null; and a show with no seasons returns an empty progress array without a progress query.

- [ ] **Step 2: Run it and confirm the loader is missing**

Run: `npm test -- lib/__tests__/showDetails.test.ts`

Expected: FAIL because `lib/showDetails.ts` does not exist.

- [ ] **Step 3: Extract the route read**

Move the full GET data read into `loadShowDetails`. Keep the `only=entry` fast path in the route. Return the existing response shape so callers do not change.

- [ ] **Step 4: Split server data from client interactions**

Move the current interactive component body to `components/ShowDetailClient.tsx`. Initialize its state from `initialDetails` and remove the `/api/shows/${id}` mount effect and loading branch. Keep episode metadata as a separate non-blocking request.

Make `app/(app)/show/[id]/page.tsx` authenticate, load details on the server, call `notFound()` when absent, and render:

```tsx
return <ShowDetailClient mediaId={id} initialDetails={details} />
```

- [ ] **Step 5: Update the episode undo test**

Render `ShowDetailClient` with the existing Breaking Bad fixture directly. Delete the mocked initial `/api/shows/` response. Assert no initial show-details fetch occurs, while episode metadata and mutation requests still do.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- lib/__tests__/showDetails.test.ts app/__tests__/showEpisodeUndo.test.tsx components/__tests__/EpisodeTracker.test.tsx`

Expected: PASS with cascade undo, ratings, details modal, and episode updates unchanged.

- [ ] **Step 7: Commit**

```powershell
git add -- lib/showDetails.ts lib/__tests__/showDetails.test.ts components/ShowDetailClient.tsx 'app/api/shows/[id]/route.ts' 'app/(app)/show/[id]/page.tsx' app/__tests__/showEpisodeUndo.test.tsx
git commit -m "perf(shows): stream detail data before hydration"
```

### Task 8: Correct image priority and mobile paint costs

**Files:**
- Modify: `components/ui/PosterCard.tsx`
- Modify: `components/DashboardRecentCards.tsx`
- Modify: `components/ContinueWatchingRow.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/__tests__/imageLoading.test.tsx`

**Interfaces:**
- Rename `PosterCard.priority?: boolean` to `PosterCard.preload?: boolean`.
- At most one dashboard poster receives `preload={true}`.
- Every `fill` image has a layout-accurate `sizes` value.

- [ ] **Step 1: Write image-policy tests**

Mock `next/image` to expose `data-preload` and `data-sizes`. Render five `DashboardRecentCards` and assert exactly one has `data-preload="true"`. Render Continue Watching and assert none preload. Add a source scan over non-test files that rejects `<Image` blocks containing the deprecated `priority` prop. Use the bounded pattern `/<Image[\s\S]{0,500}\bpriority=/` so unrelated component props named `priority` do not fail the test.

- [ ] **Step 2: Run and confirm the current row-wide preload fails**

Run: `npm test -- components/__tests__/imageLoading.test.tsx`

Expected: FAIL because the Dashboard preloads five posters and Continue Watching preloads two.

- [ ] **Step 3: Apply the Next.js 16 image policy**

Rename the reusable prop and pass `preload={preload}` to `next/image`. Set only the first recent Dashboard poster to preload. Remove preloading from Continue Watching because it sits below the Dashboard stat grid. Add `sizes` to every remaining `fill` image based on its real grid or modal width.

For fixed thumbnails, keep explicit width and height. Do not mark provider logos or below-fold rows eager.

- [ ] **Step 4: Reduce mobile-only fixed blur paint**

Give the three ambient orbs a shared `ambient-orb` class. Under `@media (max-width: 640px)`, reduce their blur radius and opacity. Do not remove the grain, radial canvas, or orbs. Verify the desktop values remain unchanged.

- [ ] **Step 5: Test**

Run: `npm test -- components/__tests__/imageLoading.test.tsx components/__tests__/ContinueWatchingRow.test.tsx components/__tests__/MediaInfoModal.footer.test.tsx`

Expected: PASS with one intentional preload and unchanged poster aspect ratios.

- [ ] **Step 6: Commit**

```powershell
git add -- components/ui/PosterCard.tsx components/DashboardRecentCards.tsx components/ContinueWatchingRow.tsx components/__tests__/imageLoading.test.tsx app/layout.tsx app/globals.css
git commit -m "perf(images): prioritize one LCP poster and trim mobile paint"
```

### Task 9: Full verification and before/after report

**Files:**
- Modify: `docs/performance/2026-08-23-signed-in-production.md`

**Interfaces:**
- Produces: final measured bundle, build, test, and browser evidence.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm run test:run`

Run: `npx tsc --noEmit`

Run: `npm run lint`

Run: `npm run build`

Expected: all exit 0. The build has no workspace-root warning.

- [ ] **Step 2: Measure final bundle boundaries**

From the production manifests, record:

- Authenticated layout entry chunk names and total uncompressed bytes.
- Dashboard initial entry chunk names and total bytes.
- Library initial entry chunk names and total bytes.
- Stats initial entry chunk names and total bytes.
- Whether any initial authenticated layout chunk contains `SearchOverlay`, `MediaInfoModal`, or `recharts`.
- The async chunk sizes for search, media details, Framer Motion, and Recharts.

Compute the authenticated-shell reduction against Task 1. It must be at least 30 percent. If it misses, inspect the manifest's `clientModules` map and remove the remaining eager edge before continuing.

- [ ] **Step 3: Run a local production server**

Run: `npm run start`

Open the local server in the browser. If no local authenticated session exists, do not enter or request credentials. Record that constraint and run all available public-shell checks.

- [ ] **Step 4: Verify desktop behavior**

At a desktop width, check Dashboard, Library, Watchlist, Streaming, Recommendations, Calendar, Stats, and one show detail. Verify navigation and Back, skeleton shape, keyboard search, search actions, media modal stacking, similar titles, watchlist priority, episode progress, undo, Stats chart activation, and no visible image layout shift.

- [ ] **Step 5: Verify mobile and reduced motion**

At 390px, verify top and bottom navigation, More drawer, search, modal scrolling, watchlist controls, poster grids, Stats, and safe-area spacing. Emulate reduced motion and confirm the CSS animations and transforms do not visibly run.

- [ ] **Step 6: Complete the report**

Add a `Before and after` section with exact bytes and percentages, a `Server data` section naming the removed Library and show-detail hydration requests, a `Browser verification` section with widths and flows, and a `Rejected changes` section for ideas that lacked evidence or cost too much complexity.

- [ ] **Step 7: Commit the evidence**

```powershell
git add -- docs/performance/2026-08-23-signed-in-production.md
git commit -m "docs(perf): record signed-in optimization results"
```

- [ ] **Step 8: Run the completion gate**

Run: `git status --short`

Confirm only the user's pre-existing unrelated dirty files remain. Do not claim completion until the verification skill has checked the fresh command output and the 30 percent shell target.
