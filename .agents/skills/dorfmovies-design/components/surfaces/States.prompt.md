Empty, error and loading states. They share one composition: an icon in a glass circle, a title, a secondary line and one button.

## EmptyState

```tsx
import { EmptyState } from '@/components/ui/EmptyState'
import { Bookmark } from 'lucide-react'

<EmptyState
  icon={Bookmark}
  title="Your watchlist is empty"
  hint="Add a movie or show from search and it lands here."
  actionLabel="Search titles"
  onAction={openSearch}
/>
<EmptyState size="compact" title="No shows match this filter" />
```

Props, from `components/ui/EmptyState.tsx`:

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | string | Sentence case. Say what is missing, not what went wrong. |
| `icon` | Lucide component | Pass the component (`Bookmark`), not an element. Drawn at 20px (18 compact) in a 48px (40 compact) `.glass-btn` circle. |
| `hint` | string | How the page fills up. 14/20 secondary, max 42ch. |
| `actionLabel` | string | Shown only with `onAction` or `actionHref`. |
| `onAction`, `actionHref` | function, string | Give one. `onAction` wins if both are set. |
| `tone` | `default`, `error` | `error` colours the icon and button with `--danger`. |
| `size` | `default`, `compact` | `default` is a `panel` that replaces a page's content. `compact` is a flat `row` for a section inside a panel. |

## SectionError

The body of every `error.tsx`. It logs the error and shows a fixed message with a "Try again" primary button that calls `reset`.

```tsx
'use client'
import { SectionError } from '@/components/ui/SectionError'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SectionError error={error} reset={reset} />
}
```

Props: `error`, `reset`, and optional `title` and `message` to override the defaults. The digest, when present, shows as a muted reference line. The message never shows `error.message`.

## Skeleton

```tsx
import { Skeleton, PosterGridSkeleton, RowListSkeleton } from '@/components/ui/Skeleton'

<Skeleton className="h-4 w-1/3" />
<Skeleton className="aspect-[2/3] rounded-[var(--radius-xl)]" />
<PosterGridSkeleton count={10} />
<RowListSkeleton count={6} />
```

`Skeleton` takes only `className`. It is a `--skeleton-bg` block with a `--skeleton-shimmer` band sweeping across it; the default radius is `--radius-sm`, and any `rounded-*` class you pass replaces it. `PosterGridSkeleton` (`count`, `showHeader`) and `RowListSkeleton` (`count`) are the two page shapes most `loading.tsx` files need.

Recipe (spec 5.5): states are centred in a panel with a 48px `.glass-btn` icon circle, title 16/24/600, body 14/20 secondary, one button. Skeleton blocks are `rgba(255,255,255,.06)` with a `.06` to `.10` shimmer, at the radius of the thing they stand in for, with no sweep under reduced motion.

Rules:

- A skeleton matches the shape it replaces: posters at `--radius-xl` and 2:3, rows on `.glass-row`, text lines at their line height.
- Loading and empty states inside a panel use the flat tier (`compact`, `RowListSkeleton`'s rows). Never a blurred panel inside a panel.
- Use `EmptyState` with `tone="error"` for a failed fetch inside a page, and `SectionError` for a route boundary.
