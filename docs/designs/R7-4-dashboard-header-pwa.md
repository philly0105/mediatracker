# R7-4 — Dashboard header shrink + PWA manifest

Two small independent halves. (A) The dashboard header is the last oversized
one — an eyebrow line, a text-5xl gradient title, and a subtitle before any
content. Shrink it to the app-standard header. (B) Add a web app manifest so
the app is installable; the icon PNGs already exist in `public/` — do NOT
create or modify them.

## A. `app/page.tsx` — header shrink

Replace the entire "Header with integrated Search Bar" block:

```tsx
{/* Header with integrated Search Bar */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-30 pl-2">
  <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
  <div className="w-full md:w-auto md:min-w-[380px] flex-shrink-0">
    <DashboardSearchBar />
  </div>
</div>
```

(The Eyebrow, the Sparkles icon, the gradient `<h1>`, and the subtitle
paragraph are all deleted; `md:items-end` becomes `md:items-center` and the
gap tightens from 6 to 4.)

Import cleanup in the same file:

- Remove `Sparkles` from the lucide-react import (its only use was the
  eyebrow).
- Remove the `Eyebrow` import entirely (same reason).

Nothing else on the page changes — the `bg-grid` decorative div, the bento
grid, and all sections below stay exactly as they are.

## B. PWA manifest

### NEW `app/manifest.ts`

Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`,
a `manifest.ts` in the app root is served as the manifest route:

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DorfMovies',
    short_name: 'DorfMovies',
    description: 'Track your movies, TV shows, and watchlists.',
    start_url: '/',
    display: 'standalone',
    background_color: '#030303',
    theme_color: '#030303',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

`public/icon-192.png` and `public/icon-512.png` are already committed assets.
`#030303` is the body background from `globals.css`.

### `app/layout.tsx` — theme color

In this Next version `themeColor` lives in a `viewport` export, not
`metadata` (see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`).
Extend the existing type import and add the export directly under the
`metadata` export:

```tsx
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#030303',
}
```

No other layout changes.

## Tests

None — the header change is markup-only on a server component with no test
file, and the manifest is static config verified by the production build
(which serves it at `/manifest.webmanifest`). Do not add tests.

## Out of scope

Do not touch `public/` (the icons exist), `DashboardSearchBar`, the bento
grid/stat tiles, `ContinueWatchingRow`, or anything under `docs/`.
