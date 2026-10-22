One entry in the sidebar, the compact rail or the More drawer.

```tsx
import { NavItem } from '@/components/ui/NavItem'
import { Home, Sparkles } from 'lucide-react'

<nav aria-label="Main">
  <NavItem icon={Home} label="Dashboard" href="/" active={pathname === '/'} />
  <NavItem icon={Sparkles} label="Recommendations" href="/recommendations" active={pathname.startsWith('/recommendations')} />
</nav>

{/* the compact rail between md and lg */}
<NavItem icon={Sparkles} label="Recommendations" railLabel={'Recom\u00admendations'} href="/recommendations" stacked />
```

Props, from `components/ui/NavItem.tsx`:

| Prop | Type | Notes |
| --- | --- | --- |
| `icon` | Lucide component | Pass the component, not an element. Drawn at 20px, stroke 1.8, in the text colour. |
| `label` | string | The visible label and the accessible name. |
| `href` | string | Renders a `Link`. Without it, the item is a `button` that calls `onClick`. |
| `onClick` | function | For items that act rather than navigate (open search, sign out). |
| `active` | boolean | Sets `aria-current="page"`, which is what the styling keys off. |
| `stacked` | boolean | Icon over an 11/14 label, for the compact rail. |
| `railLabel` | string | The stacked label when it needs a break point the label lacks (a soft hyphen). The accessible name stays `label`. |

Recipe (spec 5.4 and 5.5): `.nav-item` in `app/globals.css`. 44px tall, radius 14 (`--radius-md`), 12px side padding and icon gap, 14/20 at weight 500 in `--text-secondary`. Hover: primary text on `--glass-fill-hover`. Active: weight 600, primary text on `--glass-fill-active` (`rgba(255,255,255,.15)`) with `--inset-hairline` on top.

Rules:

- The active item is a brighter glass fill, never an aqua icon or a coloured bar.
- Drive `active` from the current route so `aria-current` and the look can't disagree.
- Items sit directly in the sidebar's `glass-panel`. Don't give an item its own blur or surface.
