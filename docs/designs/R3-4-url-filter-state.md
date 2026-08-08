# R3-4 — Filter/sort state in the URL

Goal: filters on /movies, /shows, /watchlist and /streaming live in
`useState` — refresh, back, or a shared link resets everything. Mirror them
into query params so views are bookmarkable and survive reloads.

## General mechanics (all pages)

- Read initial state from `useSearchParams()` in the lazy `useState`
  initialiser: `useState(() => searchParams.get('genre') ?? 'All')`.
  Validate values (e.g. an unknown sort id falls back to the default).
- On every filter change, rebuild the query string and
  `router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })`.
  Always `replace`, never `push` — no history spam; the goal is persistence,
  not back-button navigation between filter states.
- **Omit params at their default value** so URLs stay clean (`/movies`, not
  `/movies?sort=recent&rating=All&...`).
- Centralise this in a small hook `lib/useUrlFilters.ts`:
  `useUrlFilters(defaults: Record<string, string>)` returning
  `[values, setValue]` where `setValue(key, value)` updates state and the URL
  in one place. Debounce URL writes for free-text keys by 350 ms (state
  updates stay immediate); write other keys immediately. Keep it pure enough
  to unit test the query-string construction.
- Next 16 note: consult `node_modules/next/dist/docs/` for `useSearchParams`
  / `useRouter` semantics before writing this — per AGENTS.md the APIs may
  differ from what you expect. If the build demands a `<Suspense>` boundary
  around components using `useSearchParams`, add it at the page level with
  the page's existing loading skeleton as fallback.

## Per-page params (name → default, omitted at default)

- **LibraryView** (`/movies`, `/shows`): `q` → '' (the debounced free-text
  key), `sort` → `recent`, `rating` → `All`, `genre` → `All`,
  `decade` → `All`.
- **Watchlist**: `type` → `all`, `genre` → `All`.
- **Streaming**: `provider` → `8`, `type` → `movie`, `sort` → `popular`,
  `watched` → present as `watched=hide` only when hide-watched is on.
  `page` is NOT mirrored — infinite scroll position doesn't belong in a URL.

## Interactions to preserve

- LibraryView's render-time `filterKey` pagination reset must keep working —
  state remains the source of truth; the URL is a mirror.
- Watchlist: the genre-facet refetch on type change and the reset-to-All when
  a genre disappears must also write the corrected value to the URL.
- Arriving with params set (e.g. a bookmarked `/movies?genre=Horror&rating=4%2B`)
  must show filtered results on first paint of the data, with the selects and
  pills reflecting the URL.

## Tests

Unit-test the hook: defaults produce an empty query string; non-defaults
serialise; invalid values fall back; free-text debounces (fake timers).
