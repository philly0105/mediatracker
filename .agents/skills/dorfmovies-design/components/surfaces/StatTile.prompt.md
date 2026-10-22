A big numeral over its label, for counts and totals ("2026 so far" on Home, the Stats overview). The tile has no box of its own: it sits in a grid inside a glass panel with its siblings.

```tsx
import { StatTile } from '@/components/ui/StatTile'
import { Clock } from 'lucide-react'

<Card variant="panel" as="section" aria-labelledby="year">
  <SectionHeader id="year" title="2026 so far" />
  <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
    <StatTile label="Movies" value={42} />
    <StatTile label="Hours watched" value="118h" icon={<Clock size={18} strokeWidth={1.8} aria-hidden="true" />} />
  </div>
</Card>
```

Props, from `components/ui/StatTile.tsx`: `label` (string), `value` (string or number), `icon` (optional node, shown muted after the numeral), plus any `div` attribute.

Recipe (spec 5.5): numeral 28/34 at weight 650, tabular, tracking `--tracking-tighter`; label 13/18 in `--text-muted`; no box inside a panel.

Rules:

- The label comes first in the DOM and `column-reverse` puts the numeral on top, so a screen reader says "Hours watched, 118". Keep that order if you restyle it.
- Format the value before passing it ("118h", "4.2"). The tile does not format numbers.
- A tile shown on its own, outside a panel, can take a surface through `className` (`card-surface`). Don't give it `glass-panel`: a row of tiles would blow the blur budget.
