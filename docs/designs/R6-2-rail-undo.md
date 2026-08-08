# R6-2 — Undo for the Continue Watching rail

Goal: the dashboard rail's mark-watched check advances an episode with no
way back — a mistap silently corrupts episode progress, and a finished show
vanishes from the rail entirely. Give the action a success toast with Undo
that restores the exact pre-action card, including re-inserting a card the
advance removed. Also fold the component's private `findNextUp` copy into
the shared `lib/nextUp` helper (identical logic, duplicated since R4-3).

Only `components/ContinueWatchingRow.tsx` (+ a new test file) changes.

## 1. Use the shared next-up helper

- Delete the local `findNextUp` function.
- `import { findNextUp } from '@/lib/nextUp'` — its `NextUpSeason` shape
  (`{ id, season_number, episode_count }`) matches `ContinueWatchingSeason`,
  and its return shape matches `ContinueWatchingNextUp`. Call sites are
  unchanged.
- `getEpisodeStats` stays local (nothing else uses it).

## 2. Toast + undo in `markWatched`

- Add `import { useToast } from '@/components/ToastProvider'` and
  `const { toast } = useToast()` in the component (the rail renders inside
  the layout's `ToastProvider`).
- At the top of `markWatched`, before any state updates, snapshot what undo
  must restore:

```tsx
const snapshotItem = show
const snapshotIndex = items.findIndex((item) => item.media.id === show.media.id)
```

- After the successful POST and the existing `setItems` advance, fire:

```tsx
toast(
  `Marked ${show.media.title} S${currentNextUp.season_number} E${currentNextUp.episode_number} as watched.`,
  {
    tone: 'success',
    action: { label: 'Undo', onClick: () => undoMarkWatched(snapshotItem, snapshotIndex, currentNextUp) },
  }
)
```

- The existing `errorById` inline failure handling for the POST stays as-is.

## 3. `undoMarkWatched`

New function next to `markWatched`:

```tsx
// Restores the exact pre-action card: the episode is un-marked server-side
// and the snapshot replaces (or re-inserts, if the advance removed a finished
// show) the current card. Indexes may have drifted if other cards changed;
// clamping to the list length keeps the restore stable rather than perfect.
async function undoMarkWatched(
  snapshotItem: ContinueWatchingShow,
  snapshotIndex: number,
  nextUp: ContinueWatchingNextUp
) {
  try {
    const response = await fetch('/api/episodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        season_id: nextUp.season_id,
        episode_number: nextUp.episode_number,
      }),
    })
    if (!response.ok) throw new Error('Failed to undo')

    setItems((prev) => {
      const existing = prev.findIndex((item) => item.media.id === snapshotItem.media.id)
      if (existing !== -1) {
        return prev.map((item, i) => (i === existing ? snapshotItem : item))
      }
      const insertAt = Math.min(Math.max(snapshotIndex, 0), prev.length)
      return [...prev.slice(0, insertAt), snapshotItem, ...prev.slice(insertAt)]
    })
  } catch {
    toast('Could not undo — the episode is still marked watched.', { tone: 'error' })
  }
}
```

No success toast on undo — the card visibly reverting is the feedback.

## 4. Tests — NEW `components/__tests__/ContinueWatchingRow.test.tsx`

Wrap renders in `ToastProvider`. Mock `global.fetch` (`vi.fn()`), and build
a fixture show: one season (`episode_count: 3`), `watchedEpisodeKeys` for
episode 1, `nextUp` at episode 2. Cover:

1. Renders the show title and `Next up: S1 E2`.
2. Clicking the mark-watched button POSTs `/api/episodes` with
   `{ season_id, episode_number: 2 }` and the card advances to
   `Next up: S1 E3`; a toast containing `Marked` and an `Undo` button
   appears.
3. Clicking `Undo` DELETEs `/api/episodes` with episode 2 and the card
   shows `Next up: S1 E2` again.
4. Finished-show restore: a fixture watched up to the final episode — after
   marking the last episode the card disappears (rail renders nothing);
   clicking `Undo` brings the card back.

Use `findByText`/`waitFor` for the post-fetch assertions; resolve the
mocked fetch with `{ ok: true, json: async () => ({}) }`.

## 5. Out of scope

Do not touch `app/page.tsx`, `lib/nextUp.ts`, the API routes,
`MediaInfoModal`, or anything under `docs/`.
