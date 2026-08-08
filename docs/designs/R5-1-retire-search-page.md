# R5-1 — Retire the /search page

Goal: the ⌘K overlay is the ONLY search implementation. The 309-line
`app/search/page.tsx` (its own debounce, quick actions, modal wiring) is
deleted; `/search` lives on as a redirect so bookmarks keep working, and the
redirect target auto-opens the overlay. In-app links that pointed at
`/search` now open the overlay directly.

Consult `node_modules/next/dist/docs/` for `redirect`, `useSearchParams`, and
`<Suspense>` semantics before writing any of this — per AGENTS.md this
Next.js version differs from your training data. In particular:
`useSearchParams` consumers need a Suspense boundary or `npm run build`
fails on static pages (dev and tests will NOT catch it).

## 1. `app/search/page.tsx` — replace entirely with a redirect

```tsx
import { redirect } from 'next/navigation'

// The search page was replaced by the ⌘K overlay; the route lives on as a
// redirect so old bookmarks land in a search box. KeyboardShortcuts opens
// the overlay when it sees ?search=1.
export default function SearchPage() {
  redirect('/?search=1')
}
```

No `'use client'`, no props. Everything else in the old file is deleted.

## 2. `components/KeyboardShortcuts.tsx` — open on `?search=1`

- Add imports: `useSearchParams`, `usePathname`, `useRouter` from
  `next/navigation`.
- Read them at the top of the component:
  `const searchParams = useSearchParams()`, `const pathname = usePathname()`,
  `const router = useRouter()`.
- New effect, placed after the existing keydown/bus effect:

```tsx
// ?search=1 is how the retired /search route (and server-rendered links
// that can't call openSearchOverlay) summon the overlay. Consume the param:
// open, then strip it from the URL so refresh/back don't reopen.
useEffect(() => {
  if (searchParams.get('search') !== '1') return
  if (!isAnyModalOpen() && !open) setOpen(true)
  const params = new URLSearchParams(searchParams)
  params.delete('search')
  const qs = params.toString()
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams])
```

  (The deps are deliberately just `searchParams` — `open` in deps would
  re-run the effect on close and `pathname`/`router` are stable enough; if
  the linter complains, keep the disable comment exactly as above.)

## 3. `app/layout.tsx` — Suspense boundary

`KeyboardShortcuts` now reads `useSearchParams`, so its render site must be
wrapped:

```tsx
<Suspense>
  <KeyboardShortcuts />
</Suspense>
```

Add `Suspense` to the existing `react` import (or a new import if none
exists). Nothing else in the layout changes.

## 4. Retarget the three in-app links to `/search`

- `app/page.tsx` (server component — cannot use onClick): the empty-state
  "Start searching" `<Link href="/search"` becomes `href="/?search=1"`.
  Classes and children unchanged.
- `app/collections/page.tsx` (server component): the empty-state
  "Search to add one." `<Link href="/search"` becomes `href="/?search=1"`.
  Classes and children unchanged.
- `components/LibraryView.tsx` (client component): the empty-state
  `<a href="/search" className="text-white underline underline-offset-2">`
  becomes a button that opens the overlay in place — no navigation:

```tsx
<button
  type="button"
  onClick={openSearchOverlay}
  className="text-white underline underline-offset-2"
>
  Search to add one.
</button>
```

  Add `import { openSearchOverlay } from '@/lib/searchOverlayBus'` to
  LibraryView's imports.
- `components/Sidebar.tsx` is NOT touched in this task (R5-2 rewires it).

## 5. Tests

- DELETE `app/__tests__/searchQuickActions.test.tsx` and
  `app/__tests__/searchDebounce.test.tsx` — they render the deleted page.
  (The row-level quick actions die with the page; the overlay's
  MediaInfoModal already covers add-to-watchlist / mark-watched.)
- NEW `lib/__tests__/useTmdbSearch.test.tsx` — the debounce behavior the
  deleted test covered now lives in the shared hook. Use
  `renderHook`/`act` from `@testing-library/react`, fake timers, and a
  mocked `global.fetch`. Cover exactly:
  1. Rapid `setQuery('h')`, `setQuery('he')`, `setQuery('heat')` then
     advancing 350ms issues ONE fetch to `/api/tmdb/search?q=heat`.
  2. A query under 2 chars issues no fetch and leaves `results` empty.
  3. `clear()` empties `query` and `results`.
- UPDATE `components/__tests__/KeyboardShortcuts.test.tsx`:
  - The `next/navigation` mock must now also provide `useSearchParams` and
    `usePathname` (the component imports them):
    `useSearchParams: () => new URLSearchParams(mockSearch)` with a
    module-level `let mockSearch = ''` reset in `beforeEach`, plus
    `usePathname: () => '/'` and `replace: vi.fn()` added to the router.
  - New test: with `mockSearch = 'search=1'`, rendering
    `<KeyboardShortcuts />` shows the dialog and calls `replace` with `'/'`.
  - New test: with `mockSearch = ''`, rendering shows no dialog (guards the
    param path against false positives).

## 6. Out of scope

Do not touch `components/SearchOverlay.tsx`, `components/Sidebar.tsx`, or
anything under `docs/`. Do not delete `SelectableOverlay`/
`MultiSelectProvider` (other pages use them).
