Small pills that label things: a platform, a status, a rating. `Badge` sits on glass; `PosterBadge` sits on poster art.

```tsx
import { Badge } from '@/components/ui/Badge'
import { PosterBadge } from '@/components/ui/PosterCard'
import { RotateCcw, Star } from 'lucide-react'

<Badge>Netflix</Badge>
<Badge tone="accent">New episode</Badge>
<Badge tone="rating">
  <Star size={12} strokeWidth={1.8} aria-hidden="true" style={{ fill: 'currentColor' }} />
  4.5
</Badge>

<PosterCard
  title="The Bear"
  posterUrl={url}
  badges={<PosterBadge><RotateCcw size={12} strokeWidth={1.8} aria-hidden="true" />Rewatch</PosterBadge>}
/>
```

`Badge` props, from `components/ui/Badge.tsx`: `tone` and any `span` attribute.

| Tone | Text colour |
| --- | --- |
| `neutral` (default) | `--text-primary` |
| `accent`, `brand`, `live`, `success` | `--accent` (all four are the one aqua) |
| `rating` | `--rating` (gold) |

`PosterBadge` props: `children` only.

Recipe (spec 5.5): a 24px pill, 12/16 at weight 600, 8px side padding, 4px gap for an icon. `Badge` is `--glass-chip` (`rgba(255,255,255,.10)`) under `--glass-chip-edge`. `PosterBadge` is the dark `--glass-badge` under `--glass-badge-edge`, so it reads on a bright poster.

Rules:

- The tone colours the text only. The fill stays white glass on panels and dark glass on art.
- Gold is for ratings. Use `tone="rating"` only next to a star or a score.
- Icons in a badge are 12px, `strokeWidth={1.8}`, `aria-hidden`.
- No blur on either badge: they repeat in grids and lists.
