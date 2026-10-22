How far through a season, and when the next thing airs. Three small pieces: `ProgressRing`, `SegmentedProgress` and `DateStack`.

## ProgressRing

```tsx
import { ProgressRing } from '@/components/ui/ProgressRing'

<ProgressRing value={6} max={10} label="S2" />
<ProgressRing value={6} max={10} size={52} stroke={5} label="S2" />   {/* the Home hero */}
```

Props, from `components/ui/ProgressRing.tsx`: `value`, `max`, `size` (px, default 48), `stroke` (px, default 4), `label` (node centred inside, such as "S2"), `aria-label` (defaults to "6 of 10 episodes watched"), `className`, `style`.

Recipe (spec 5.5): an SVG ring, track `--progress-track` (`rgba(255,255,255,.16)`), arc `--accent` with round caps starting at twelve o'clock, label 13/18 at weight 650, tabular. At zero there is no arc at all.

## SegmentedProgress

```tsx
import { SegmentedProgress } from '@/components/ui/SegmentedProgress'

<SegmentedProgress value={6} max={10} />
<SegmentedProgress value={6} max={10} count={false} aria-label="6 of 10 episodes watched in season 2" />
```

Props, from `components/ui/SegmentedProgress.tsx`: `value`, `max`, `count` (the "6 of 10" text on the right, default on), `aria-label`, `className`, `style`.

Recipe (spec 5.5): one 4px segment per episode, 3px gaps, radius 2. Watched segments are `--accent`, the next episode `--accent-tint`, the rest `--progress-track`. The count is 12/16 muted and tabular. Over 24 episodes it becomes one continuous bar. Forced colours swap the fills for Highlight and GrayText.

## DateStack

```tsx
import { DateStack } from '@/components/ui/DateStack'

<DateStack date="2026-10-24" />
```

Props, from `components/ui/DateStack.tsx`: `date` (YYYY-MM-DD, or an ISO datetime whose date part is used), `className`, `style`. It renders a `time` element and nothing for an unparseable date.

Recipe (spec 5.5): a 40px centred column; the short month 12/16 at weight 600, muted, over the day 20/24 at weight 650, tabular. Used by "Coming soon" and the calendar.

Rules:

- Aqua means progress, "next" and current state. These three are where most of it appears, so don't add aqua elsewhere in the same row.
- Both progress pieces are `role="img"` with a full sentence label. If the default ("episodes watched") is wrong for what you measure, pass `aria-label`.
- `DateStack` parses the date parts itself. Don't pass it `new Date(...)` output: a bare YYYY-MM-DD parsed as UTC shows the previous day west of Greenwich.
