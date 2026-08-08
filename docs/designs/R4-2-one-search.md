# R4-2 — One search experience

Goal: three search UIs exist — the ⌘K overlay, the /search page, and
DashboardSearchBar's bespoke dropdown. Collapse to one: every search entry
point opens the ⌘K overlay. The /search page keeps its role for deep links
and row quick actions; it is not touched here.

## 1. New module `lib/searchOverlayBus.ts`

```ts
// The overlay is owned by KeyboardShortcuts (mounted once in the layout);
// other components ask it to open via a window event rather than threading
// state through context.
export const SEARCH_OVERLAY_EVENT = 'dorfmovies:open-search'

export function openSearchOverlay() {
  window.dispatchEvent(new Event(SEARCH_OVERLAY_EVENT))
}
```

## 2. `components/KeyboardShortcuts.tsx`

In the same effect that installs the keydown listener, also listen for
`SEARCH_OVERLAY_EVENT` on `window`. The event path applies the SAME guards as
the shortcuts (`isAnyModalOpen()`, the local `open` latch) and then
`setOpen(true)`. Clean both listeners up in the effect return.

## 3. `components/DashboardSearchBar.tsx` — becomes a trigger

Replace the whole component (delete the dropdown, the modal wiring, the
`useTmdbSearch` usage — `lib/useTmdbSearch.ts` itself stays, the overlay uses
it). New rendering, a single button styled to look like the old input:

```tsx
'use client'
import { Search } from 'lucide-react'
import { openSearchOverlay } from '@/lib/searchOverlayBus'

export default function DashboardSearchBar() {
  return (
    <button
      type="button"
      onClick={openSearchOverlay}
      className="w-full max-w-xl h-11 px-5 flex items-center gap-3 rounded-full bg-[var(--surface-shell)]/80 backdrop-blur-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all text-left"
    >
      <Search className="w-5 h-5 text-zinc-500" />
      <span className="flex-1 text-sm text-zinc-500 truncate">Quick log a movie or TV show...</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-500 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
    </button>
  )
}
```

## 4. `components/SearchOverlay.tsx` — refresh server data after actions

The old dashboard dropdown called `router.refresh()` after logging something
so Recently Watched updated. The overlay must now cover that: give its
`useMediaActions` an `onDone` that calls `router.refresh()`
(`useRouter` from `next/navigation`). Local Set updates stay as they are.

## 5. `components/Sidebar.tsx` — nav entries that open the overlay

- Extend `NavEntry` with `action?: 'search-overlay'` and set it on the
  `Search` entry (keep `href: '/search'` as data, but action wins).
- At each of the three render sites (desktop nav list, mobile bottom bar,
  mobile More drawer — the Search entry only appears in the first two), when
  `item.action === 'search-overlay'` render a `<button type="button">` with
  identical classes/children to the Link version, whose onClick calls
  `openSearchOverlay()` (and closes the drawer if rendered there). Active
  state for the button: always false.
- Mobile top bar: the search icon `Link` to /search becomes a `button` with
  the same classes and `aria-label="Search"`, onClick `openSearchOverlay()`.

## 6. Tests

- `components/__tests__/KeyboardShortcuts.test.tsx`: add one test —
  dispatching `SEARCH_OVERLAY_EVENT` on window opens the dialog, and does NOT
  open a second one when it is already open.
- No DashboardSearchBar test exists; do not add one.
