# Signed-in Production Performance Baseline and Measurement Report

Date: 2026-08-23
Source Commit: b6aa7238edd48d72e53f85de230f7dc135e28b06 (Task 1 source state used for build)
Next.js Version: 16.2.6 (Turbopack)

## 1. Build Baseline (before)

- **Build Command:** `npm run build` (measured with PowerShell `[System.Diagnostics.Stopwatch]`)
- **Source Commit Used for Build:** `b6aa7238edd48d72e53f85de230f7dc135e28b06` (`b6aa723`)
- **Exit Code:** 0
- **Turbopack Workspace Root Warning:** Eliminated (PASS - resolved by explicit `turbopack.root: process.cwd()` in `next.config.ts`)
- **Elapsed Wall Clock Duration:** 14.63s (14,626 ms)
- **Phase Durations:**
  - Compilation: 4.8s
  - TypeScript validation: 5.7s
  - Static page generation: 535ms (46/46 pages)

## 2. Chunk Measurement Methodology

Source manifests and static assets analyzed:
- `.next/server/app/(app)/*/page_client-reference-manifest.js`
- `.next/static/chunks/*.js`

Measurements reflect uncompressed bundle sizes emitted by Turbopack for production.

## 3. Authenticated Layout / Shell Chunks (before)

Common client chunks referenced by all authenticated routes under `app/(app)`:

| Chunk File | Size (Bytes) | Size (KiB) | Primary Contents / Modules |
| --- | --- | --- | --- |
| `01xlw8hd842-c.js` | 3,377 | 3.3 KiB | Next.js App Router client runtime components (`layout-router`, `render-from-template-context`, `client-page`, `client-segment`, `http-access-fallback/error-boundary`, `boundary-components`, `icon-mark`) |
| `06._p59qxe-5..js` | 54,646 | 53.4 KiB | Next.js / React client runtime bundle |
| `08uavht7.y38m.js` | 10,673 | 10.4 KiB | Shell providers & UI utilities (`ToastProvider`, `MotionProvider`, `Sidebar`, `MultiSelectProvider`, `KeyboardShortcuts`, `MediaModalProvider`) |
| `09~x0wean2psw.js` | 134,840 | 131.7 KiB | Framer Motion & animation runtime bundle |
| `0hcxb~uxqj2is.js` | 2,166 | 2.1 KiB | Root error boundary (`app/error.tsx`) |
| `06kuhl90v4566.js` | 3,772 | 3.7 KiB | Lucide icon core & link helpers |
| `031fh80z2ftqi.js` | 29,372 | 28.7 KiB | Lucide icons & UI primitives |
| `0-nqspq6b3qec.js` | 26,300 | 25.7 KiB | `SearchOverlay`, `KeyboardHelp`, and shortcut UI bundle |
| `0n492anfd6.fe.js` | 38,330 | 37.4 KiB | `MediaModalProvider`, `MediaInfoModal`, `SimilarModal`, and modal dependencies |
| `01gm6slae8eh7.js` | 1,263 | 1.2 KiB | Global error boundary (`app/global-error.tsx`) |
| **Total Layout / Shell** | **304,739** | **297.6 KiB** | **10 chunks common to all authenticated routes** |

## 4. Route Initial Chunk Baselines (before)

### Dashboard (`/(app)/page`)
- **Total Initial Route Chunks:** 11 chunks
- **Total Initial Route Size:** 321,287 bytes (313.8 KiB)
- **Breakdown:**
  - 10 Shared Layout / Shell Chunks: 304,739 bytes (297.6 KiB)
  - 1 Route-Specific Chunk (`03ofb~asmxrf-.js`): 16,548 bytes (16.2 KiB) (`BentoGrid`, `Card`, `DashboardRecentCards`, `DashboardSearchBar`, `DashboardUpcomingWidget`, `ContinueWatchingRow`)

### Stats (`/(app)/stats/page`)
- **Total Initial Route Chunks:** 13 chunks
- **Total Initial Route Size:** 675,408 bytes (659.6 KiB)
- **Breakdown:**
  - 10 Shared Layout / Shell Chunks: 304,739 bytes (297.6 KiB)
  - Recharts Chart Bundle (`07by7sh0dlbcu.js`): 368,536 bytes (359.9 KiB)
  - Route UI Chunk (`15mi.u1z31je5.js`): 642 bytes (0.6 KiB) (`StatsCharts`, `Card`)
  - Route Error Boundary (`0kdgida49udqh.js`): 1,491 bytes (1.5 KiB) (`app/(app)/stats/error.tsx`)

### Recharts Dedicated Chunk
- **Chunk Name:** `07by7sh0dlbcu.js`
- **Size:** 368,536 bytes (359.9 KiB)
- **Status (before):** Included directly in the initial blocking route chunks for `/(app)/stats/page`.

## 5. Summary Baseline Table

| Metric | Post-Task-1 Baseline (before) | Target | Notes |
| --- | --- | --- | --- |
| Turbopack Root Warning | Eliminated (PASS) | Eliminated (PASS) | Resolved in Task 1 (`turbopack.root` configured) |
| Authenticated Layout Common Size | 304,739 B (297.6 KiB) | >= 30% reduction | Target for Tasks 2-4 |
| Dashboard Initial Bundle Size | 321,287 B (313.8 KiB) | Reduced with shell | Measured from `/(app)/page` manifest |
| Stats Initial Bundle Size | 675,408 B (659.6 KiB) | <= 316 KiB (defer Recharts) | Target for Task 5 |
| Initial Recharts Chunk in Stats | 368,536 B (359.9 KiB) | 0 B initial (deferred async) | `07by7sh0dlbcu.js` |

## 6. Before and after

Final source commit measured: `b23bda7`.
Final build: Next.js 16.2.6 (Turbopack), exit 0, 13,258 ms wall clock; compile 3.8s, TypeScript 6.0s, static generation 360ms (46/46). No workspace-root warning was emitted.

All byte counts below are uncompressed production JavaScript from the route client-reference manifests and `.next/static/chunks`.

| Metric | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Authenticated common shell | 304,739 B (297.6 KiB) | 107,159 B (104.6 KiB) | 64.8% |
| Dashboard initial route | 321,287 B (313.8 KiB) | 142,690 B (139.3 KiB) | 55.6% |
| Stats initial route | 675,408 B (659.6 KiB) | 112,144 B (109.5 KiB) | 83.4% |
| Production build wall clock | 14,626 ms | 13,258 ms | 9.4% |

The 64.8% shell reduction exceeds the plan's 30% acceptance target.

### Final initial chunks

Authenticated common shell (six chunks, 107,159 B):

- `01gm6slae8eh7.js` — 1,263 B
- `01xlw8hd842-c.js` — 3,377 B
- `06._p59qxe-5..js` — 54,646 B
- `0hcxb~uxqj2is.js` — 2,166 B
- `0jf5~u2--m18j.js` — 40,137 B
- `178g1xm4gt5v7.js` — 5,570 B

Dashboard adds `018jtk~ub0qcw.js` (35,531 B), for 142,690 B total across seven chunks.

Library adds `0_w6-09o3jrfg.js` (1,477 B), `0w6qb8_op42j~.js` (51,502 B), and `16ty2921ivfs3.js` (9,091 B), for 169,229 B total across nine chunks. No comparable Library baseline was captured in Task 1.

Stats adds `0kdgida49udqh.js` (1,491 B) and `185txroaf81l3.js` (3,494 B), for 112,144 B total across eight chunks.

The Dashboard manifest's initial `clientModules` graph contains no `SearchOverlay`, `MediaInfoModal`, or `recharts` implementation module. Deferred interaction bundles measured after the final build are:

- Search and keyboard panels: `122ke~g61~1pq.js` — 34,049 B
- Media information modal: `14o_.3m-k_r17.js` — 45,656 B
- Framer Motion runtime boundaries: two 137,532 B chunks, loaded by separate deferred interaction graphs
- Recharts and Stats charts: `0.qj2k9tzs4n-.js` — 368,591 B (359.95 KiB), absent from Stats' initial graph

## 7. Server data and interaction work

- Library now receives its first watch-entry page from the authenticated Server Component. Hydration no longer immediately repeats `GET /api/watch`; filter refreshes remain abortable, stale responses are ignored, and background refreshes coalesce.
- Show detail now loads media, seasons, the latest watch entry, and episode progress on the server and seeds `ShowDetailClient`. Hydration no longer immediately repeats `GET /api/shows/:id`. The `only=entry` mutation refresh path remains narrow.
- Supabase query failures are distinct from confirmed absence: server pages propagate failures, API routes return 500, and only a successful missing media row becomes 404.

## 8. Image, motion, and paint policy

- Root and routine route motion moved from Framer Motion to transform/opacity CSS with a global `prefers-reduced-motion` override.
- Search panels, media modals, and Stats charts are loaded only after user or viewport intent.
- Exactly one Dashboard poster preloads. Continue Watching preloads none. Production `fill` images have layout-specific `sizes`, including the 2/3/4-column Popular Collections grid.
- At 390px, ambient fixed-orb paint is reduced from 150px blur/0.2 opacity to 60px blur/0.1 opacity; desktop values are unchanged.

## 9. Verification evidence

Fresh completion-gate commands on 2026-08-24:

- `npm run test:run` — 58 files, 480 tests passed, 0 failed.
- `npx tsc --noEmit` — exit 0.
- `npm run lint` — exit 0, no errors or warnings.
- `npm run build` — exit 0, all 46 routes generated, no workspace-root warning.
- Focused image policy — 5 tests passed, including a demonstrated red/green check for collection grid `sizes`.
- Focused shortcut/modal/watchlist boundary suite — 45 tests passed; Strict Mode shortcut regression — 32 tests passed.

### Browser verification

Local production browser checks were run at 1440x900 and 390x844. The page had no horizontal overflow at either width. Computed ambient-orb values were 150px/0.2 on desktop and 60px/0.1 on mobile. With CDP reduced-motion emulation, `matchMedia('(prefers-reduced-motion: reduce)')` was true and computed animation/transition duration was 0.01ms.

The isolated checkout has no local Supabase URL/anonymous key and no authenticated local session. Signed-in routes therefore reached the production error boundary before application workflows could render. Per the local-only constraint, no credentials were requested, copied, or pulled from production. Desktop/mobile signed-in navigation, modal stacking, episode updates, and chart activation are covered by the automated regression suite but were not claimed as live-browser verified.

## 10. Rejected or deferred changes

- No database indexes or schema changes: local evidence did not include a slow-query plan that justified migration risk.
- No speculative dependency upgrade despite audit notices: dependency remediation is separate from the measured runtime bottlenecks.
- Framer Motion remains inside deferred modal/search boundaries because their exit sequencing is behavior-critical. Rewriting those interactions would trade a post-intent download for materially higher regression risk; the runtime is absent from the initial Stats graph and the heavy interaction implementations are absent from the common client-module graph.
- No production deployment, production session mutation, or merge into the dirty main checkout was performed.
