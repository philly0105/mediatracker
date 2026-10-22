`Kbd` is a keyboard hint chip that names the user's real modifier. `Avatar` is the user's initial in a glass circle. Both are small, fixed-look pieces of the shell.

## Kbd

```tsx
import { Kbd } from '@/components/ui/Kbd'

<Kbd keys="K" />                                  {/* ⌘K on a Mac, Ctrl K elsewhere */}
<Kbd keys="↵" mod={false} />
<Kbd keys="K" className="hidden md:inline-flex" />
```

Props, from `components/ui/Kbd.tsx`:

| Prop | Type | Notes |
| --- | --- | --- |
| `keys` | string | The non-modifier part: `K`, `↵`, `↑↓`. |
| `mod` | boolean, default `true` | Prefix ⌘ on Apple platforms and "Ctrl " elsewhere. |
| `className` | string | Display and spacing only. It replaces the default `inline-flex`, so include a display class. |

Recipe (spec 5.5): 22px tall, radius 6 (`--radius-xs`), `--glass-fill-hover` fill inside a 1px `--border-default` border, 12/16 at weight 500 in `--text-strong`. The border is real rather than an inset shadow so forced colours keep the edge.

## Avatar

```tsx
import { Avatar } from '@/components/ui/Avatar'

<Avatar email={user.email} />
<Avatar email={user.email} size={32} />
```

Props, from `components/ui/Avatar.tsx`: `email` (the first character becomes the initial; with none it shows a Lucide `User`), `size` (px, default 44).

Recipe (spec 5.5): a 44px circle, white initial at weight 650 on `--btn-ghost-bg`, ringed by `0 0 0 2px` of the same fill. The initial scales with `size`.

Rules:

- Restyle neither through `className` or `style`. Every hint and every avatar in the app is the same chip.
- `Avatar` is `aria-hidden`. Put the accessible name on the button or link that wraps it.
- Don't load avatar images from third parties. Initials cost no requests and leak nothing.
