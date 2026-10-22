One title as a horizontal row: a thumb, a text column and a trailing action. Used for "Up next", history, search results and lists inside a panel.

```tsx
import { MediaRow } from '@/components/ui/MediaRow'
import { SegmentedProgress } from '@/components/ui/SegmentedProgress'
import { Button } from '@/components/ui/Button'
import { Check } from 'lucide-react'

<MediaRow
  title="Severance"
  type="show"
  stillUrl={episode.still_url}
  posterUrl={show.poster_url}
  subtitle="S2 · E7  Chikhai Bardo"
  aside="Apple TV+"
  onClick={() => openShow(show.id)}
  actions={
    <Button variant="icon" aria-label="Mark S2 E7 watched" onClick={markWatched}>
      <Check size={20} strokeWidth={1.8} aria-hidden="true" />
    </Button>
  }
>
  <SegmentedProgress value={6} max={10} />
</MediaRow>

<MediaRow title="Bugonia" year={2025} posterUrl={url} rating={4} onRate={rate} watchedAt="2026-10-18" />
```

Props, from `components/ui/MediaRow.tsx`:

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | string | 16/22 at weight 600, up to two lines. |
| `type` | `movie` (default), `show` | Sets the default `aside` text ("Movie" or "TV") and the placeholder label. |
| `stillUrl` | string or null | A 16:9 still, 160x90 (104x58 under `md`; 72x40 with `stillSize="sm"`, which the episode list passes). Falls back to the poster if it fails. |
| `stillSize` | `md` (default), `sm` | The still's size under `md`. |
| `posterUrl` | string or null | A 60x90 poster thumb, used when there is no still. |
| `subtitle` | node | The line under the title, 14/20 in `--text-strong`. |
| `aside` | node | Muted 12/16 text at the top right of the text column, such as a platform. |
| `year`, `tmdbRating` | number | A muted 13/18 tabular meta line; the TMDB score gets a small gold star. |
| `rating`, `onRate` | number or null, function | Your stars. `onRate` makes them the 24px rating control; without it they are 12px and read-only. |
| `review` | string | Two italic lines on `--glass-inset-card`. |
| `watchedAt` | string (date) | "Watched Oct 18" with a calendar icon. |
| `onClick` | function | Stretches a native button over the row, named by the title. The stars and actions are its siblings above it, not nested controls. |
| `actions` | node | Trailing slot. Clicks in it don't reach the row's `onClick`. |
| `children` | node | Under the text, such as a `SegmentedProgress`. |

Recipe (spec 5.5): `.glass-row` plus `.glass-rim`, radius 20 (`--radius-row`), padding 10px 12px 10px 10px and a 16px gap from `md` up, 8px padding and an 8px gap below it. Thumbs are radius 12 (`--radius-thumb`) with `--shadow-sm`. The trailing action is a 44px circle check button.

Rules:

- Rows are tier 2 and never blur: a list renders one per item. Put the list inside a `Card variant="panel"`.
- An icon button in `actions` names its target in `aria-label` ("Mark S2 E7 watched"), because every row has one.
- Pass `stillUrl` for episodes and `posterUrl` for titles. The row picks the shape from what it gets.
