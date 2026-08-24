# Signed-in Production Performance Baseline and Measurement Report

Date: 2026-08-23
Commit: 33676f894851dec3d79b100cc7d9e20f851791f2
Next.js Version: 16.2.6 (Turbopack)

## 1. Build Baseline (before)

- **Build Command:** `npm run build`
- **Build Commit:** `33676f894851dec3d79b100cc7d9e20f851791f2`
- **Turbopack Workspace Root Warning:** Resolved (eliminated by explicit `turbopack.root: process.cwd()` in `next.config.ts`)
- **Build Durations (before):**
  - Compilation: 7.1s
  - TypeScript validation: 5.7s
  - Static page generation: 471ms (46/46 pages)
  - Total build execution time: ~13.3s

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

| Metric | Baseline (before) | Target | Notes |
| --- | --- | --- | --- |
| Turbopack Root Warning | Warning present | Eliminated (PASS) | Resolved in Task 1 |
| Authenticated Layout Common Size | 304,739 B (297.6 KiB) | >= 30% reduction | Target for Tasks 2-4 |
| Dashboard Initial Bundle Size | 321,287 B (313.8 KiB) | Reduced with shell | Measured from `/(app)/page` manifest |
| Stats Initial Bundle Size | 675,408 B (659.6 KiB) | <= 316 KiB (defer Recharts) | Target for Task 5 |
| Initial Recharts Chunk in Stats | 368,536 B (359.9 KiB) | 0 B initial (deferred async) | `07by7sh0dlbcu.js` |
