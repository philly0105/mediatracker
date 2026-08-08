# R4-1 — One Library page + slimmer navigation

Goal: /movies and /shows are the same component with a prop; merge them into
one /library destination with a type filter, and cut the nav from 12
destinations to 9 (6 primary + 3 in More). Watchlist joins the mobile bottom
bar. No route is deleted — old URLs redirect.

## 1. New route `/library`

`app/library/page.tsx` — server component, exactly like the current
`app/movies/page.tsx` shape:

```tsx
import { Suspense } from 'react'
import LibraryView from '@/components/LibraryView'

export default function LibraryPage() {
  // LibraryView reads useSearchParams (via useUrlFilters), which needs a
  // Suspense boundary or the whole route opts out of static rendering.
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  )
}
```

## 2. `components/LibraryView.tsx` changes

- Drop the `LibraryViewProps` interface and all three props (`type`, `title`,
  `noun`). The heading is the literal `Library`.
- Add `type` to the URL-filter defaults, first key:
  `const FILTER_DEFAULTS = { type: 'all', q: '', sort: 'recent', rating: 'All', genre: 'All', decade: 'All' }`
- Validate it like the other enumerated keys:
  `const typeFilter = (['all', 'movie', 'show'] as const).find((t) => t === filters.type) ?? 'all'`
- New pills row rendered FIRST in the controls cluster (before the sort
  pills), using the existing `FilterPills` component:
  `[{ id: 'all', label: 'All' }, { id: 'movie', label: 'Movies' }, { id: 'show', label: 'Shows' }]`
  with `onSelect={(id) => setFilter('type', id)}`.
- Fetch: `fetchEntries` appends `?type=${typeFilter}` only when
  `typeFilter !== 'all'` (a bare `/api/watch` already returns both types).
  `fetchEntries` deps gain `typeFilter`, so changing the pill refetches; the
  existing `useEffect` on `fetchEntries` already re-runs. While a refetch is
  in flight after a type change, keep showing the previous entries (do NOT
  flip `loading` back on — the skeleton is for first load only).
- `filterKey` (the pagination reset) must include `typeFilter`.
- Wording where `noun` was used, all fixed strings now:
  - Search input placeholder: `Search titles, director, cast...`
  - Empty library: `No titles logged yet.` (keep the `Search to add one.` link)
  - Filtered-to-nothing: `No logged titles match ...` (same suffix logic)
- The controls row's render guard becomes
  `!loading && (entries.length > 0 || typeFilter !== 'all')` — the type pills
  must survive an empty result set, or filtering to a type with nothing in it
  removes the only way back. The empty-state noun follows the active type
  (`No movies|shows|titles logged yet.`).
- Everything else (sort/rating/genre/decade filters, refresh, undo delete,
  infinite scroll) is untouched.

## 3. Redirects for the old routes

`app/movies/page.tsx` becomes (and `app/shows/page.tsx` identically with
`show`):

```tsx
import { redirect } from 'next/navigation'

// The old per-type library routes live on as redirects so bookmarks and
// shared filter URLs keep working.
export default async function MoviesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value)
  }
  params.set('type', 'movie')
  redirect(`/library?${params.toString()}`)
}
```

Consult `node_modules/next/dist/docs/` for the current `searchParams` and
`redirect` semantics before writing these — per AGENTS.md the APIs may differ
from your training data.

## 4. `components/Sidebar.tsx`

- `PRIMARY_NAV` becomes exactly, in this order (order matters — the mobile
  bottom bar takes the first four):
  1. `Dashboard` `/` `Home`
  2. `Search` `/search` `Search`  (unchanged in this task; R4-2 rewires it)
  3. `Library` `/library` `Library` (the lucide `Library` icon)
  4. `Watchlist` `/watchlist` `ListTodo`
  5. `Streaming` `/streaming` `Clapperboard`
  6. `Recommendations` `/recommendations` `Sparkles`
- `MORE_NAV` becomes exactly:
  1. `Lists` `/lists` `List` (lucide `List` icon — `Layers` moves to Franchises)
  2. `Franchises` `/collections` `Layers`
  3. `Stats` `/stats` `BarChart3`
  Calendar leaves the nav entirely — the dashboard's upcoming widget already
  links to `/calendar`, which stays routable.
- Mobile bottom bar: still `PRIMARY_NAV.slice(0, 4)` + More — which now yields
  Dashboard · Search · Library · Watchlist · More. The More drawer is
  `PRIMARY_NAV.slice(4)` + `MORE_NAV` + Settings (6 items; Calendar is not in
  the drawer either).
- Remove now-unused icon imports (`Film`, `Tv`, `Calendar`); keep the file's
  structure otherwise identical.

## 5. Renames and links

- `/collections` page (`app/collections/page.tsx`): h1 `Collections` →
  `Franchises`; subtitle stays `Explore movie franchises and series.`;
  section heading `Your Active Collections` → `Your Franchises`. The route
  and everything else stay.
- Dashboard `app/page.tsx`: the Recently Watched `View all` link `/movies` →
  `/library`.

## 6. Tests

- Update `components/__tests__/LibraryView.test.tsx`: render `<LibraryView />`
  with no props, `usePathname` mock → `/library`. Existing assertions keep
  passing.
- Add one test there: with fetch mocked, clicking the `Movies` type pill
  issues a fetch to `/api/watch?type=movie`, and clicking `All` issues a
  fetch to `/api/watch` with no type param.
