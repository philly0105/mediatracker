A row of mutually exclusive options in one inset track: Movies / Shows, list and grid, a sort order.

```tsx
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Film, Tv } from 'lucide-react'

<SegmentedControl
  label="Media type"
  value={type}
  onChange={setType}
  options={[
    { id: 'movie', label: 'Movies', icon: Film },
    { id: 'show', label: 'Shows', icon: Tv },
  ]}
/>
```

Props, from `components/ui/SegmentedControl.tsx`:

| Prop | Type | Notes |
| --- | --- | --- |
| `options` | `{ id, label, icon? }[]` | `icon` is a Lucide component, drawn at 16px, stroke 1.8. |
| `value` | an option `id` | The selected option. |
| `onChange` | `(id) => void` | Called with the clicked option's `id`. |
| `label` | string | The radiogroup's accessible name. Give one. |
| `size` | `sm`, `md` (default) | `sm` is 12px text and 12px padding, `md` 13px and 16px. |
| `className` | string | Layout only. |

Recipe (spec 5.5): the track is `.glass-inset` (radius 14) with 4px padding; segments are 36px tall at `--radius-thumb`. The selected segment takes the glass-button fill (`--btn-ghost-bg` under `--glass-btn-edge`) and weight 600; the rest are secondary text at weight 500 that brighten over `--glass-fill-hover`. Forced colours paint the selected segment with the system Highlight pair.

Rules:

- It is a `radiogroup` of `radio` buttons. Use it for one choice among two to five, not for navigation between routes.
- Keep labels short: one or two words, sentence case.
- The selected segment is never aqua. The accent is for progress and current state elsewhere; here the brighter glass carries it.
