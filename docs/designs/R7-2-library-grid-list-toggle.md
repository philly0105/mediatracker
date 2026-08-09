# R7-2 — Library grid/list view toggle

Goal: the library only has one layout — detail rows (poster thumb, stars,
review) in an auto-fill grid. Add a poster-wall alternative and a toggle,
persisted in the URL like every other library filter. The row layout stays
the default and is unchanged.

## 1. `components/MediaCard.tsx` — a `view` prop

Add to `Props`:

```tsx
  // 'row' renders the detailed MediaRow (default); 'poster' renders a
  // compact PosterCard for the library's grid view.
  view?: 'row' | 'poster'
```

Destructure with `view = 'row'`. Import `{ PosterCard } from './ui/PosterCard'`.

The component currently returns `<SelectableOverlay>` wrapping `<MediaRow>`
plus the two portals. Keep the portals and all handlers exactly as they are;
only the visual child switches:

```tsx
return (
  <SelectableOverlay item={mediaAsResult}>
    {view === 'poster' ? (
      <div className="relative group/poster">
        <PosterCard
          title={media.title}
          year={media.release_year ?? undefined}
          posterUrl={media.poster_url}
          rating={rating}
          onClick={() => { if (!showInfo) setShowInfo(true) }}
        />
        {/* Edit/delete float OUTSIDE the PosterCard (its root is a <button>;
            nesting buttons is invalid HTML). Same hover-chip treatment as the
            watchlist cards: always visible on touch, hover-revealed on md+. */}
        <div
          className="absolute top-2 right-2 z-10 flex gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-sm border border-[var(--border-subtle)] opacity-100 md:opacity-0 md:group-hover/poster:opacity-100 transition-opacity duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Edit entry"
            aria-label="Edit entry"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            title="Delete entry"
            aria-label="Delete entry"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    ) : (
      <MediaRow ...all current props, unchanged... />
    )}

    ...existing portals, unchanged...
  </SelectableOverlay>
)
```

The poster view shows the rating read-only in the PosterCard footer; rating
changes happen via the row view or the modals. No `onRate` in poster view.

## 2. `components/LibraryView.tsx`

- `FILTER_DEFAULTS` gains `view: 'list'` (after `decade`). Being a
  non-free-text key it mirrors to the URL immediately and is omitted at its
  default.
- Validate like the others:

```tsx
const view = filters.view === 'grid' ? 'grid' : 'list'
```

- Import `List, LayoutGrid` from `lucide-react` (extend the existing lucide
  import line).
- Toggle control: a small segmented pair, inserted in the controls row
  BETWEEN the search `<div className="w-full sm:w-64">` and the Refresh
  `<Button>`:

```tsx
<div className="inline-flex p-1 rounded-sm bg-[var(--surface-input)] border border-[var(--border-subtle)] self-start">
  <button
    type="button"
    onClick={() => setFilter('view', 'list')}
    aria-label="List view"
    aria-pressed={view === 'list'}
    className={`p-1.5 rounded-sm transition-colors ${view === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
  >
    <List className="w-4 h-4" />
  </button>
  <button
    type="button"
    onClick={() => setFilter('view', 'grid')}
    aria-label="Grid view"
    aria-pressed={view === 'grid'}
    className={`p-1.5 rounded-sm transition-colors ${view === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
  >
    <LayoutGrid className="w-4 h-4" />
  </button>
</div>
```

- Rendering: the non-loading branch's card container becomes conditional.
  List view keeps today's inline-style auto-fill grid and props verbatim.
  Grid view uses the collections pages' responsive poster grid:

```tsx
{view === 'grid' ? (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {visibleEntries.map((entry) => (
      <MediaCard
        key={entry.id}
        entry={entry}
        view="poster"
        hideWatchedDate={true}
        onDeleted={handleEntryDeleted}
        onUpdated={handleEntryUpdated}
      />
    ))}
  </div>
) : (
  ...today's inline-style grid of MediaCard, unchanged (no view prop)...
)}
```

- `view` is NOT added to `filterKey` — switching layout re-renders the same
  result set and must not reset the infinite-scroll window. The sentinel,
  loading skeleton, and both empty states are shared by the two views and
  stay exactly where they are.

## 3. Tests — `components/__tests__/LibraryView.test.tsx`

Keep all existing tests. ADD one:

- `toggles between row and poster layouts`: stub IntersectionObserver like
  the reset test does; mock one entry (`entry('1', 'Heat')`); render. In the
  default list view, `screen.queryByRole('button', { name: /Heat/ })` is
  null (MediaRow's root is a div). Click
  `screen.getByRole('button', { name: 'Grid view' })`; now
  `screen.getByRole('button', { name: /Heat/ })` exists (PosterCard's root
  is a button) and `Grid view` has `aria-pressed="true"`. Click
  `screen.getByRole('button', { name: 'List view' })`; the Heat button is
  gone again.

Note the next/navigation mock already in the file covers `useUrlFilters`.

## 4. Out of scope

Do not touch `PosterCard.tsx`, `MediaRow.tsx`, `useUrlFilters`, the
watchlist/collections pages, or anything under `docs/`. Do not change the
loading skeleton or empty states.
