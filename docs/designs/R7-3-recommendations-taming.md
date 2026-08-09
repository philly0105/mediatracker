# R7-3 — Recommendations page taming

Goal: the recommendations page is the visually busiest left — an oversized
gradient header, two bespoke animated filter controls, and per-card
enter/exit/layout animations. Bring it in line with the rest of the app:
standard header, the shared `FilterPills` for both filters, and plain cards.
Only `app/recommendations/page.tsx` changes. All data logic (fetching,
filtering, paging, infinite scroll, modal) is untouched.

## 1. Header

Replace the current header `<div className="flex flex-col gap-1.5">` block
(gradient `<h1>` with the Sparkles icon + subtitle) with the library-style
header:

```tsx
<div className="flex flex-col gap-1.5">
  <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
  <p className="text-sm text-zinc-400">
    {fallback
      ? 'We compiled this week\'s overall trending items to get you started!'
      : 'Personalized recommendations based on similar titles from your watch history.'}
  </p>
</div>
```

The surrounding flex row and the Refresh `<Button>` stay as they are. Keep
the `Sparkles` lucide import — it is still used by the two empty states.

## 2. Filters — shared `FilterPills` for both rows

Add `import { FilterPills } from '@/components/FilterPills'`.

Replace BOTH the "Media Type Switch" block (the `inline-flex p-1 …` segmented
control with the `motion.div layoutId="activeTypeHighlight"`) AND the "Genre
Tabs" block (the `overflow-x-auto` row with `layoutId="activeGenreTab"`) with
one column:

```tsx
{/* Filters */}
<div className="flex flex-col gap-3">
  <FilterPills
    options={[
      { id: 'all', label: 'All' },
      { id: 'movie', label: 'Movies' },
      { id: 'show', label: 'TV Shows' },
    ]}
    active={activeType}
    onSelect={(id) => {
      setActiveType(id)
      setActiveGenre('All')
      setDiscoverPageByFilter({})
      setHasMoreByFilter({})
      setVisibleCount(10)
    }}
  />
  <FilterPills
    options={topGenres.map((genre) => ({ id: genre, label: genre }))}
    active={activeGenre}
    onSelect={(genre) => {
      setActiveGenre(genre)
      setDiscoverPageByFilter((prev) => ({ ...prev, [`${activeType}:${genre}`]: 1 }))
      setHasMoreByFilter((prev) => {
        const next = { ...prev }
        delete next[`${activeType}:${genre}`]
        return next
      })
      setVisibleCount(10)
    }}
  />
</div>
```

The handler bodies are today's, verbatim — only the wrapping markup changes.
`FilterPills` wraps, so the mobile horizontal-scroll container is dropped
deliberately. The type label copy tightens from "All Recommendations" to
"All" (the genre row's "All" is distinct — different row, same pattern the
library already uses).

## 3. Cards — drop the per-card animations

- Remove the `<AnimatePresence>` wrapper around `visibleItems.map`.
- The card `motion.div` becomes a plain `<div>`: delete the `layout`,
  `initial`, `animate`, `exit`, and `transition` props; keep `onClick` and
  the full `className` unchanged (the CSS hover transitions already carry
  the interaction feel; card removal on action becomes an instant list
  update, matching the library's behavior).
- Remove the now-unused `import { motion, AnimatePresence } from 'framer-motion'`.

## 4. Spacing

The page root `<div className="space-y-10 pb-12">` becomes
`space-y-6 pb-12`, and the inner results wrapper `space-y-8` becomes
`space-y-6` — the header no longer needs the loose rhythm.

## 5. Tests

None. The page has no test file today; its logic is unchanged and the shared
`FilterPills` is already covered by its call sites' tests. Do not add one.

## 6. Out of scope

Do not touch `/api/recommendations`, `FilterPills.tsx`, `MediaInfoModal`,
`SelectableOverlay`, the card inner layout (poster, metadata, action
buttons), or anything under `docs/`.
