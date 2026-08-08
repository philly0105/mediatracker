# R6-3 — Watchlist search + sort, and page matches while typing in ⌘K

Two independent halves. (A) The watchlist gets the library's treatment:
URL-mirrored text search and sort on top of the existing type/genre filters.
(B) The ⌘K overlay's typed mode gains a small "Pages" group so typing "sta"
surfaces Stats above the TMDB results.

## A1. `app/api/watchlist/route.ts` — `q` and `sort` params on GET

After the existing `priority` param handling:

```ts
const q = searchParams.get('q')
const sort = searchParams.get('sort')
```

- `q` filters on the embedded media title (safe with the `!inner` join the
  select already uses):

```ts
if (q && q.trim()) {
  query = query.ilike('media.title', `%${q.trim()}%`)
}
```

- `sort` replaces the hardcoded `.order('added_at', ...)`. Exactly four
  values; anything else falls back to `added`:

```ts
// Ordering the parent rows by an embedded to-one column uses PostgREST's
// `media(title)` order syntax — postgrest-js passes the string through.
const { data, error, count } = await (
  sort === 'oldest' ? query.order('added_at', { ascending: true })
  : sort === 'title' ? query.order('media(title)', { ascending: true })
  : sort === 'year' ? query.order('media(release_year)', { ascending: false })
  : query.order('added_at', { ascending: false })
).range(offset, offset + limit - 1)
```

## A2. `app/watchlist/page.tsx` — controls + plumbing

- `const WATCHLIST_DEFAULTS = { type: 'all', genre: 'All', sort: 'added', q: '' }`
  (`q` last; as a free-text key — default `''` — `useUrlFilters` already
  debounces it 350ms).
- In `WatchlistContent`, read `const searchQuery = filters.q` and
  `const sortOrder = filters.sort`.
- Controls row (the `flex items-center gap-3` div): the search input goes
  FIRST, then the existing type select, genre select, the new sort select,
  then the Pick for me button. Search input uses the existing `ui/Input`
  component (`import { Input } from '@/components/ui/Input'`,
  `import { Search } from 'lucide-react'`):

```tsx
<Input
  icon={<Search className="w-4 h-4" />}
  placeholder="Search your watchlist..."
  value={searchQuery}
  onChange={(e) => setFilter('q', e.target.value)}
  className="min-w-[180px]"
/>
```

  (If `Input` does not accept `className`, wrap it in a
  `<div className="min-w-[180px]">` instead — check the component.)
- Sort select, identical styling to the genre select:

```tsx
<select
  value={sortOrder}
  onChange={(e) => setFilter('sort', e.target.value)}
  className="px-4 py-2 rounded-sm bg-[var(--surface-input)] border border-[var(--border-default)] text-sm font-semibold text-white focus:outline-none focus:border-[var(--border-focus)] appearance-none min-w-[140px]"
>
  <option value="added" className="bg-[var(--bg-void)]">Recently Added</option>
  <option value="oldest" className="bg-[var(--bg-void)]">Oldest First</option>
  <option value="title" className="bg-[var(--bg-void)]">Title A–Z</option>
  <option value="year" className="bg-[var(--bg-void)]">Release Year</option>
</select>
```

- On small screens the row now overflows: change the controls container to
  `flex flex-wrap items-center gap-3`.
- `WatchlistSection` gains props `searchQuery: string` and
  `sortOrder: string`, passed from the map. Inside:
  - `fetchPage` appends `params.set('q', searchQuery)` only when
    `searchQuery.trim() !== ''`, and `params.set('sort', sortOrder)` only
    when `sortOrder !== 'added'`.
  - The reset effect's dep list gains `searchQuery, sortOrder` (same
    eslint-disable comment stays).
- `TonightPickModal` is untouched (it has its own type/genre inputs only).
- Each section's empty state currently keys off its items; no copy changes —
  a search with no hits in a section shows that section's existing empty
  treatment.

## B. `components/SearchOverlay.tsx` — "Pages" group in typed mode

- New derived list inside the component (after `showQuickNav`):

```tsx
// Typing filters destinations too — prefix match keeps it to what the user
// is plausibly steering at ("sta" → Stats) without drowning TMDB results.
const matchedPages = showQuickNav
  ? []
  : QUICK_NAV.filter((page) => page.name.toLowerCase().startsWith(query.trim().toLowerCase()))
```

- Unified keyboard list: pages first, then results.
  - `const itemCount = showQuickNav ? QUICK_NAV.length : matchedPages.length + results.length`
    (replaces the existing `itemCount` line).
  - Enter branch for the typed mode becomes:

```tsx
} else {
  if (activeIndex < matchedPages.length) {
    const page = matchedPages[activeIndex]
    if (page) {
      e.preventDefault()
      navigateTo(page.href)
    }
  } else {
    const active = results[activeIndex - matchedPages.length]
    if (active) {
      e.preventDefault()
      setSelected(active)
    }
  }
}
```

- Rendering, inside the list container, ABOVE the loading/no-matches/results
  blocks:

```tsx
{!showQuickNav && matchedPages.length > 0 && (
  <>
    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Pages</div>
    {matchedPages.map((page, i) => {
      const Icon = page.icon
      return (
        <button
          key={page.href}
          type="button"
          data-index={i}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => navigateTo(page.href)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
        >
          <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-sm text-zinc-300">{page.name}</span>
        </button>
      )
    })}
  </>
)}
```

- The results `.map` rows change their index plumbing to the unified index:
  `const listIndex = i + matchedPages.length`, and `data-index={listIndex}`,
  `onMouseEnter={() => setActiveIndex(listIndex)}`, and the highlight
  condition `listIndex === activeIndex`.
- The `no matches` empty state must NOT render when `matchedPages.length > 0`
  (a page hit is a hit): its condition gains `&& matchedPages.length === 0`.
- The "Searching…" loading row keeps its condition — it may render below the
  Pages group, which is correct.

## Tests

- `components/__tests__/KeyboardShortcuts.test.tsx`, following the file's
  existing patterns (fetch mock, fake-timer typing helper if present — if
  none, add `vi.useFakeTimers()` locally to the new tests and type via
  `fireEvent.change` on the placeholder input, then
  `act(() => { vi.advanceTimersByTime(350) })`):
  1. Open the overlay, type `sta` (mock `/api/tmdb/search` to resolve
     `{ results: [] }`): a `Pages` heading and a `Stats` row appear, and no
     "No matches" text renders.
  2. With `sta` typed, Enter (index 0 = Stats) calls `push` with `/stats`
     and closes the dialog.
- NEW `app/__tests__/watchlistRoute.test.ts` is NOT required — the route's
  Supabase query building has no existing test harness; skip API tests.
- `app/watchlist` page tests: none exist today; do not add any.

## Out of scope

Do not touch `TonightPickModal`, `WatchlistCard`/item components,
`LibraryView`, `Sidebar`, or anything under `docs/`. Do not change the
priority-section structure of the watchlist page.
