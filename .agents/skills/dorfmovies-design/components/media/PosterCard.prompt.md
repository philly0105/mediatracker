A 2:3 poster with its caption underneath, for grids and rails (Library, Watchlist, Franchises, "Must watch").

```tsx
import { PosterCard, PosterBadge } from '@/components/ui/PosterCard'
import { RotateCcw } from 'lucide-react'

<div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
  {items.map((item, i) => (
    <PosterCard
      key={item.id}
      title={item.title}
      year={item.year}
      posterUrl={item.poster_url}
      rating={item.rating}
      href={`/collections/${item.id}`}
      preload={i === 0}
      overlay="Open"
      badges={item.rewatch && <PosterBadge><RotateCcw size={12} strokeWidth={1.8} aria-hidden="true" />Rewatch</PosterBadge>}
    />
  ))}
</div>
```

Props, from `components/ui/PosterCard.tsx`:

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | string | Caption line and the image's `alt`. With no poster, it is centred on a zinc gradient. |
| `year` | string or number | The small tabular text at the end of the caption: a year or a date. |
| `posterUrl` | string or null | Rendered with `next/image` `fill`, sized for a 2, 3 or 5 column grid. A failed load falls back to the title. |
| `rating` | number or null | Read-only gold stars at 12px in the caption. |
| `href` | string | Renders the card as a `Link`. |
| `onClick` | function | Renders the card as a `button`. Give `href` or `onClick`, one of them. |
| `preload` | boolean | Preload the image. Only the page's single LCP poster (the first one) gets it; never more than one per page. |
| `overlay` | string | A `PosterBadge` that fades in over the bottom of the poster on hover and focus. |
| `badges` | node | Pills pinned 8px from the top-left. Pass `PosterBadge`s. |
| `children` | node | Anything else over the poster. The frame is `position: relative`. |

Recipe (spec 5.5): 2:3 frame at radius 14 (`--radius-xl`), a 1px `--border-soft` ring over `--shadow-poster`. Caption under the poster with 10px above it: title 13/18 at weight 600, one line with an ellipsis, then stars and the year (12/16 muted, tabular) on one row. Hover and keyboard focus lift the card (`--lift-poster`), scale the image to 1.04, swap the ring for `--glow-violet` (the generic white hover ring, named for history), whiten the title and reveal the overlay. All of it is CSS (`.poster-card*` in `app/globals.css`), so reduced motion reaches it.

Rules:

- No blur, ever. Posters repeat in grids and rails. Badges over art use `PosterBadge`, the dark fill.
- The card is the one control. Never wrap it in a `Link` or put a button inside it; use `href`.
- Gold stays on the stars. Don't tint the caption or the frame.
