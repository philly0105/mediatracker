Every container in the app. Pick the glass tier with `variant`; the card has no look of its own beyond that.

```tsx
import { Card } from '@/components/ui/Card'

<Card variant="panel" as="section" aria-labelledby="up-next">
  <SectionHeader id="up-next" title="Up next" action={{ label: 'See all', href: '/watchlist' }} />
  {/* rows inside a panel are tier 2 */}
  <Card variant="row">...</Card>
</Card>

<Card variant="slab">...hero text over artwork...</Card>
<Card onClick={openDetail} aria-label="Severance">...one result in a list...</Card>
```

Props, from `components/ui/Card.tsx`:

| Prop | Values | Notes |
| --- | --- | --- |
| `variant` | `surface` (default), `panel`, `slab`, `row`, `inset` | See the table below. |
| `as` | `div` (default), `section`, `article`, `aside`, `li` | Landmark or list semantics without a wrapper. |
| `onClick` | `() => void` | Makes the card keyboard-activatable (role, tab stop, Enter and Space). Adds the lift and ring on `surface` and `panel`, only the pointer cursor on the others. |
| others | any HTML attribute | `className` and `style` are appended. |

| Variant | Classes | Tier | Use |
| --- | --- | --- | --- |
| `panel` | `glass-panel glass-rim p-5` | 1, blurred | Section panels, the sidebar, modals, popovers. Radius 28 (24 under 760px). |
| `slab` | `glass-slab glass-rim p-7` | 1, smoked | Text over sharp artwork, as in the Home hero. Radius 22. |
| `row` | `glass-row p-3` | 2, flat | A row or card inside a panel. Radius 20, hover brightens the fill. |
| `inset` | `glass-inset p-4` | 2, well | A recessed area inside a panel. Radius 14. |
| `surface` | `card-surface` | 2, flat | The panel tint without blur, radius 28, for anything rendered once per list item outside a panel. |

Recipe (spec 5.5 and 5.2): "`ui/Card` → GlassPanel, variants `panel` / `slab` / `row` / `inset`; prop `as`."

Rules:

- Tier 1 (`panel`, `slab`) is the only place blur happens. Keep to 8 or fewer on screen, never one per item in a grid, rail or list, and never animate one.
- Inside a panel, use `row` or `inset`, never another `panel`.
- Give a `section` panel a name: `aria-labelledby` pointing at its `SectionHeader` `id`.
- Padding comes from the variant. Override it with `style` or a `p-*` class only when the reference does.
- `.glass-rim` makes the card `position: relative`, so absolutely positioned children anchor to it. Its 1px edge is a masked `::before` at `z-index: 3` and draws over artwork that reaches the card's edge.
