# R4-3 — Show page: next up, real progress, details, unaired fix

Goal: the show page (`app/show/[id]/page.tsx`) should answer "where am I?"
at a glance and stop marking unaired episodes. Four pieces.

## 1. Lift next-up into `lib/nextUp.ts`

Move `findNextUp` (currently a private helper in `app/page.tsx`) into
`lib/nextUp.ts`, exported, with its exact current signature and behaviour:

```ts
export type NextUpSeason = { id: string; season_number: number; episode_count: number }
export function findNextUp(seasons: NextUpSeason[], watchedKeys: Set<string>):
  { season_id: string; season_number: number; episode_number: number } | null
```

`app/page.tsx` imports it from there (its local copy and the related typing
move too if convenient — behaviour identical, dashboard untouched visually).

## 2. Fix the unaired-season-toggle bug — `components/EpisodeTracker.tsx`

In `handleSeasonToggle`, when MARKING a season watched, skip episodes that
have not aired: an episode with meta whose `isUnaired(meta.air_date)` is true
is excluded from `affected`. Episodes with no meta (titles not fetched yet)
count as aired, exactly like today. UNMARKING is unchanged — it clears every
watched episode regardless of air date.

Also fix the header fraction and `allWatched` for seasons with unaired
episodes: compute `airedCount` = episodes 1..episode_count minus those known
unaired; the progress bar and `{watchedCount}/{airedCount}` use `airedCount`
(fall back to `episode_count` when no meta), and
`allWatched = airedCount > 0 && watchedCount >= airedCount`. The button
labels stay the same.

## 3. Show page additions — `app/show/[id]/page.tsx`

### Next-up banner

Between the header block and the `Episodes` heading, when the show has at
least one season and is not fully watched, render a banner row:

- Container: `flex items-center justify-between gap-4 px-4 py-3 rounded-lg
  backdrop-blur-md`, `background: 'var(--glass-card)'`,
  `border: '1px solid var(--border-subtle)'` (the tracker's glassCard pair).
- Left column:
  - `text-[10px] font-bold uppercase tracking-widest text-zinc-500` →
    `Next up`
  - `text-sm font-semibold text-white` → `S{season_number} E{episode_number}`
    plus ` · {episode title}` when the episodes meta has a name for it.
- Right: `Button` `size="sm"` with `Check` icon, label `Mark watched`,
  onClick → `handleProgressChange(next.season_id, next.episode_number, true)`.

Computation: build `watchedKeys` from `progress`
(`` `${p.season_id}-${p.episode_number}` ``) and call `findNextUp(seasons,
watchedKeys)`. If the returned episode is unaired per the episodes meta
(`isUnaired`, exported by EpisodeTracker), render the variant instead:

- Label line → `All caught up`
- Value line → `S{n} E{n} airs {formatAirDate(air_date)}` (`formatAirDate` is
  also exported by EpisodeTracker); no button.

If `findNextUp` returns null (everything watched) or there are no seasons,
render no banner.

### Progress line

In the header, directly under the `{release_year} · TV Show` line:
`text-sm text-zinc-400` → `{watched}/{total} episodes` where total is the sum
of `episode_count` over seasons and watched is `progress.length`, plus
` · ~{h}h left` when `media.runtime_mins` is non-null and there are unwatched
episodes: `h = Math.round((total - watched) * media.runtime_mins / 60)`.
Omit the ` · ~{h}h left` segment when it rounds to 0. Render the line only
when `total > 0`.

### Details button

In the header actions area (same block as the rating stars / mark-watched
button, rendered in BOTH branches after the existing element):
`Button` `variant="ghost"` `size="sm"` with `Info` icon, label `Details`.
Opens `MediaInfoModal` with `item={mediaToResult(media)}`
(`lib/mediaToResult`), controlled by local `showDetails` state:

- `onClose={() => setShowDetails(false)}`
- `onAddToWatchlist` → `useMediaActions({ priority: 'want_to_watch' })`'s
  `addToWatchlist(media.tmdb_id, 'show')` (await it).
- `onMarkAsWatched` → `async (opts) => { await markWatched(media.tmdb_id,
  'show', opts) }` from the same hook, then re-run the same entry refresh the
  existing `handleMarkShowWatched` does (fetch the latest entry row and
  `setEntry`/`setRating`) so the stars appear without a reload. Extract that
  small refresh into a shared helper inside the component rather than
  duplicating the fetch.

## 4. Tests

- `lib/__tests__/nextUp.test.ts`: first unwatched episode wins; skips fully
  watched seasons; returns null when everything is watched; a gap earlier in
  season 1 beats season 2 progress.
- EpisodeTracker: add a test (new file or existing pattern in
  `components/__tests__/`) — with episodes meta marking the last episode of a
  season unaired (future `air_date`), clicking `Mark whole season watched`
  calls `onProgressChange` WITHOUT that episode number; and the header shows
  `0/2` when one of three episodes is unaired.
