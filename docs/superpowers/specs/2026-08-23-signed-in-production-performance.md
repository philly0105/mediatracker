# Signed-in production performance design

Date: 2026-08-23
Status: ready for review
Target: authenticated DorfMovies experience on Vercel
Verification boundary: local production build and local browser checks only

## Goal

Make signed-in DorfMovies navigation, loading, scrolling, search, modals, and mutations faster without removing features or weakening the Autumn Pine design. The work must extend the current `perf/navigation-latency` branch and preserve unrelated working-tree changes.

This pass does not target local development speed. It does not deploy a preview or production build.

## Current evidence

The production build succeeds on Next.js 16.2.6. Its route manifests show about 238 KiB of uncompressed route-specific JavaScript in the authenticated shell before page code. The shared motion/runtime chunk is about 132 KiB. The always-mounted navigation, selection, keyboard, search, and media-modal chain accounts for most of the remaining shell code.

The Stats route adds a separate Recharts chunk of about 360 KiB uncompressed. Charts are below the summary numbers, but the route currently loads the chart library with the initial client graph.

The current branch already improves navigation in four useful ways:

- `getAuthenticatedUser()` uses local JWT claim verification when Supabase uses asymmetric signing keys.
- Next keeps dynamic route data in its client cache for 30 seconds.
- Library entries survive short return navigations in a module cache.
- Route-specific loading states replace the old generic fallback.

The build also warns that Turbopack selects `C:\Users\aideo\Projects` as the workspace root because it finds a parent lockfile. The project should declare its own root so production builds resolve files from the intended repository.

## Chosen approach

Use an evidence-driven full pass. Reduce the shared client graph first, then inspect each signed-in route for demonstrated data, image, rendering, and interaction costs. Avoid speculative rewrites and new infrastructure.

A bundle-only pass would leave server and refetch latency untouched. A data-only pass would keep expensive JavaScript on every route. This combined approach targets both while keeping each change tied to a measured cost.

## Loading architecture

The authenticated layout should ship only the code needed for navigation, lightweight global events, selection state, and toast state.

Search, media details, similar titles, keyboard help, Tonight's Pick, and other heavy modal bodies should load when the user signals intent. Hover, focus, an idle callback, or the first keyboard shortcut may start loading code before the UI opens. The implementation must not make keyboard or pointer activation depend on idle time.

Routine page entrances, card lifts, drawers, and toast transitions should use CSS opacity and transform transitions. CSS must honor `prefers-reduced-motion`. Framer Motion should remain only where a measured interaction still needs its sequencing or presence behavior. If no such interaction remains, remove the global motion provider.

Stats should render its title, summary tiles, and a stable chart placeholder without waiting for Recharts. The chart code loads in a separate client chunk. The placeholder must reserve the final chart area to avoid layout shift.

Every main route needs a loading state shaped like its final content. Returning to a recently visited route may show fresh cached content instead of a skeleton.

## Data flow and caching

Server data remains authoritative. Short-lived client caches exist only to make return navigation and repeated overlay use immediate.

Independent Supabase and TMDB reads should run concurrently. Queries should request only fields used by the page or its immediate interactions. Unbounded tables keep explicit pagination so PostgREST's row cap cannot truncate results.

The implementation should move aggregates to SQL only when that reduces transferred rows or repeated computation and can be covered by a migration test. It should not add a new database abstraction.

Client-side requests must avoid hydration-only duplicate fetches. A server-rendered page should pass initial data into its client component when that removes a second request without making cache invalidation harder.

Successful mutations must update or invalidate all affected client state:

- Marking watched updates library membership, search badges, recommendations, watchlist state, and dashboard data as applicable.
- Watchlist add, remove, and priority changes update any visible group counts and cached identifier sets.
- Episode changes update progress, continue-watching state, and undo state.
- Import completion invalidates collection data rather than leaving old module caches in memory.

Failures keep the last good content visible where possible. A failed background refresh must not replace cached rows with an empty state. Section errors should offer a retry. Mutation errors must roll back optimistic state and keep the existing toast feedback.

## Images, rendering, and interaction work

Audit each `next/image` use for correct `sizes`, dimensions, and priority. Only images likely to become the largest visible image should receive priority. Below-fold posters and provider logos stay lazy. The work must not bypass Next image optimization for TMDB art unless the source format or endpoint requires it.

Replace layout-triggering animation with opacity and transform. Remove broad `transition-all` declarations on large containers. Expensive fixed blur effects should be reduced or disabled on constrained mobile viewports only if browser profiling shows paint cost. The grain, warm canvas, opaque cards, poster-driven color, and pine accent remain unchanged.

Large lists should compute filters and sorting once per input change. They should not introduce memoization around trivial values. If a list grows enough to cause frame drops, prefer existing incremental rendering or windowing that preserves keyboard and selection behavior.

Every mutation control should show immediate pending state, prevent duplicate submission, and avoid a full-route refresh when a local update plus targeted invalidation is sufficient.

## Files and boundaries

Likely changes include:

- `app/layout.tsx` and `app/(app)/layout.tsx` for the shared client graph.
- `next.config.ts` for the explicit Turbopack root and supported Next.js performance settings.
- Global providers and overlays in `components/`.
- `components/StatsCharts.tsx` and `app/(app)/stats/page.tsx` for chart splitting.
- Signed-in page and API files where profiling proves a waterfall, duplicate fetch, excess payload, or stale cache.
- `app/globals.css` and design-system effects only for measured paint or motion changes.
- Focused tests beside the affected components and helpers.

Do not rewrite unrelated UI, change the database schema without measured need, alter authentication policy, deploy, or modify user-owned dirty files unless the performance work directly overlaps them. If overlap is necessary, preserve their existing behavior and diff.

## Verification

Capture the current build as the before baseline. After each phase, compare route manifests and chunk sizes rather than trusting source-level import changes.

Run:

- Focused tests for each changed behavior.
- The full Vitest suite.
- TypeScript checking.
- ESLint.
- A clean Next.js production build.

Run the production server locally and verify the signed-in flows available with the local session. Test desktop and 390px widths. Cover route navigation, back navigation, keyboard search, search result actions, media details, similar titles, watchlist changes, episode progress, undo, Stats loading, image behavior, and reduced motion.

If a local authenticated session is unavailable, verify authentication-sensitive behavior with existing integration tests and test the built client graph and public shell in the browser. Report the limitation rather than claiming a signed-in browser pass.

## Acceptance criteria

- Reduce authenticated-shell route-specific JavaScript by at least 30 percent from the roughly 238 KiB uncompressed baseline.
- Keep the roughly 360 KiB Recharts chunk out of Stats' initial blocking path.
- Keep search and media-modal implementations out of the initial authenticated-shell graph.
- Show a matching skeleton or fresh cached content during every major route transition.
- Remove hydration-only duplicate authenticated data requests where found.
- Preserve watch, watchlist, priority, episode, import, and undo behavior.
- Preserve focus handling, keyboard navigation, modal stacking, and reduced-motion behavior.
- Pass the full test, type, lint, and production-build checks.
- Complete local browser checks at desktop and 390px widths, or state exactly which signed-in checks local session access prevented.
- Record before and after bundle sizes plus any proven query-count or payload reductions.

## Delivery

The final handoff should list measured improvements, files changed, verification commands and results, remaining costs, and any optimization rejected because evidence did not justify its complexity.
