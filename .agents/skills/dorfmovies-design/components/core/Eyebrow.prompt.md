The muted line above a title: today's date over the Home greeting, a page's context over its H1.

```tsx
import { Eyebrow } from '@/components/ui/Eyebrow'

<Eyebrow>Thursday, October 22</Eyebrow>
<h1>Good evening, Richard</h1>
```

Props, from `components/ui/Eyebrow.tsx`: `children` plus any `p` attribute. `PageHeader`'s `eyebrow` prop renders one for you.

Recipe (spec 5.5, the `ui/PageHeader` row, and the Meta role in 4.2): 13/18 at weight 500 (`--eyebrow-size`, `--eyebrow-weight`), no letter spacing (`--eyebrow-tracking`), `--text-muted`, plain case.

Rules:

- Write it in sentence case or as a date. Spatial Glass has no tracked uppercase labels anywhere, so never add `uppercase` or wide tracking.
- One eyebrow per heading, directly above it, with no gap beyond the heading's own 2px top margin.
