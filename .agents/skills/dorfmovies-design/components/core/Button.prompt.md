Every clickable action. Buttons are pills at least 44px tall. The white `primary` is the one strong action per view.

```tsx
import { Button } from '@/components/ui/Button'
import { Check, Plus, Trash2 } from 'lucide-react'

<Button>Mark watched</Button>
<Button variant="secondary">
  <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
  Add to list
</Button>
<Button variant="icon" aria-label="Mark episode watched">
  <Check size={20} strokeWidth={1.8} aria-hidden="true" />
</Button>
<Button variant="secondary" tone="destructive">
  <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
  Remove from Watchlist
</Button>
<Button variant="link">Cancel</Button>
<Button type="submit" size="lg" fullWidth>Sign in</Button>
```

Props, from `components/ui/Button.tsx` (plus any `button` attribute):

| Prop | Values | Notes |
| --- | --- | --- |
| `variant` | `primary` (default), `secondary`, `icon`, `ghost`, `accent`, `link` | See below. |
| `aria-label` | string | Required by the type when `variant="icon"`. |
| `tone` | `default`, `destructive`, `success` | Layers a meaning on the variant. |
| `size` | `sm`, `md` (default), `lg` | `sm` 44px, 13px text, 0 14px padding. `md` 44px, 14px text, 0 18px. `lg` 48px, 15px text, 0 20px. |
| `fullWidth` | boolean | Stretches to the container (forms, modals). |
| `disabled` | boolean | 40% opacity, not-allowed cursor, `onClick` dropped. |

There is no icon prop. Put a Lucide icon in the children, 18px (20px in an icon button), `strokeWidth={1.8}`, `aria-hidden="true"`. The button lays children out with an 8px gap. `type` defaults to `button`; pass `type="submit"` in forms.

| Variant | Look |
| --- | --- |
| `primary` | `.btn-primary`: `--btn-primary-bg` (`#F3F8FA`) with `--btn-primary-fg` (`--ink`, `#08161C`) text and a soft drop shadow; hover `--btn-primary-bg-hover` (white). |
| `secondary` | `.glass-btn` pill: `--btn-ghost-bg` under `--glass-btn-edge`, hover `--btn-ghost-bg-hover`, primary text. |
| `icon` | The same glass pill as a 44px circle (48 at `lg`). |
| `ghost` | `.btn-ghost`, the same glass pill as `secondary`. Prefer `secondary` in new code. |
| `accent` | `.btn-accent`: the aqua tint, `--green-tint-bg` under a `--green-tint-border` ring, `--green-300` text. |
| `link` | `.btn-link`: transparent, secondary text; hover `--glass-fill-hover` and primary text. This is the spec's transparent "ghost". |

Tones: `destructive` is a glass pill with `--danger` text. `success` is the aqua tint, filling solid aqua with ink text on hover.

Recipe (spec 5.5): "`primary`: pill, `#F3F8FA` background, `#08161C` text, 44px tall, 0 18px padding, 600 weight, hover `#FFF`. `secondary`: `.glass-btn` pill. `icon`: 44px circle `.glass-btn`, needs `aria-label`. Disabled 40% opacity."

Rules:

- One `primary` per view. Everything else is `secondary`, `icon` or `link`.
- Destructive actions use `tone="destructive"`, never a red background or a `primary`.
- Labels are sentence case verbs: "Mark watched", "Add to list".
- A link that should look like a button wears `btn glass-btn` classes on the `Link` (see `EmptyState`). Never wrap a `Button` in a `Link`.
