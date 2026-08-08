# R5-3 — Quick-nav in the empty ⌘K overlay

Goal: an empty overlay currently says "Type to search" — dead space. Show a
"Go to" list of destinations instead, driven by the same arrow-key/Enter
machinery the results already use. ⌘K → ↓ → ↵ reaches any page without the
mouse. Only `components/SearchOverlay.tsx` (+ tests) changes.

## 1. Data

Module-level constant in `SearchOverlay.tsx` (above the component):

```tsx
import { Home, Library, ListTodo, Clapperboard, Sparkles, List, Layers, BarChart3, Calendar, Settings } from 'lucide-react'

// Everything routable from the keyboard, nav-bar order first, then the
// destinations that live outside the sidebar's primary six.
const QUICK_NAV = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Watchlist', href: '/watchlist', icon: ListTodo },
  { name: 'Streaming', href: '/streaming', icon: Clapperboard },
  { name: 'Recommendations', href: '/recommendations', icon: Sparkles },
  { name: 'Lists', href: '/lists', icon: List },
  { name: 'Franchises', href: '/collections', icon: Layers },
  { name: 'Stats', href: '/stats', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
]
```

Merge these lucide imports into the existing `lucide-react` import line.

## 2. Mode + navigation

Inside the component:

```tsx
// Under two characters there is nothing to search — the list slot shows
// destinations instead, so the palette doubles as quick navigation.
const showQuickNav = query.trim().length < 2

function navigateTo(href: string) {
  router.push(href)
  handleClose()
}
```

(`router` already exists in the component.)

## 3. Keyboard handling — generalize `handleInputKeyDown`

The three branches operate on whichever list is showing:

- `const itemCount = showQuickNav ? QUICK_NAV.length : results.length`
- ArrowDown/ArrowUp: same clamping as today but against `itemCount`
  (`if (itemCount === 0) return` replaces the `results.length === 0` check).
- Enter:

```tsx
} else if (e.key === 'Enter') {
  if (showQuickNav) {
    const active = QUICK_NAV[activeIndex]
    if (active) {
      e.preventDefault()
      navigateTo(active.href)
    }
  } else {
    const active = results[activeIndex]
    if (active) {
      e.preventDefault()
      setSelected(active)
    }
  }
}
```

`handleInputChange` already resets `activeIndex` to 0 on every keystroke,
which covers the mode transition in both directions — do not add an effect.

## 4. Rendering — replace the "Type to search" block

In the results list `<div ref={listRef} ...>`, the current
`{query.trim().length < 2 && (<div ...>Type to search</div>)}` block becomes:

```tsx
{showQuickNav && (
  <>
    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Go to</div>
    {QUICK_NAV.map((item, i) => {
      const Icon = item.icon
      return (
        <button
          key={item.href}
          type="button"
          data-index={i}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => navigateTo(item.href)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
        >
          <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-sm text-zinc-300">{item.name}</span>
        </button>
      )
    })}
  </>
)}
```

The loading / no-matches / results blocks and their `query.trim().length >= 2`
guards are unchanged. The footer hints (↑↓ Navigate · ↵ Open · Esc Close)
remain accurate — leave the footer alone. The scroll-into-view effect keyed
on `activeIndex` already works for these rows via `data-index`.

## 5. Tests — `components/__tests__/KeyboardShortcuts.test.tsx`

This file already renders the real overlay through `KeyboardShortcuts`.

- Add `push: vi.fn()` (module-level `const push` like the existing
  `refresh`) to the `useRouter` mock; clear it in `beforeEach` if the file
  has one, otherwise use `vi.clearAllMocks()` consistently with the file's
  existing style.
- New tests:
  1. Opening the overlay (Cmd+K) shows the `Go to` heading and a
     `Dashboard` row.
  2. With the overlay open, ArrowDown once then Enter on the search input
     (`screen.getByPlaceholderText('Search movies and TV shows…')` — note
     the ellipsis character) calls `push` with `'/library'` and the dialog
     closes.
  3. Clicking the `Watchlist` row calls `push` with `'/watchlist'` and the
     dialog closes.

## 6. Out of scope

Do not touch `Sidebar`, `KeyboardShortcuts` (the component), any page under
`app/`, or anything under `docs/`.
