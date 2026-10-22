Text fields and filter dropdowns. Both are inset wells: a dark translucent fill under an inner shadow, no border.

```tsx
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ClearFilters } from '@/components/ui/ClearFilters'
import { Search } from 'lucide-react'

<Input
  icon={<Search />}
  placeholder="Search titles, people"
  aria-label="Search"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>
<Input multiline rows={4} placeholder="What did you think?" aria-label="Review" />

<div className="flex flex-wrap items-center gap-3">
  <Select label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
    <option value="">All genres</option>
  </Select>
  {filtered && <ClearFilters onClear={reset} />}
</div>
```

`Input` props, from `components/ui/Input.tsx` (plus any `input` or `textarea` attribute):

| Prop | Type | Notes |
| --- | --- | --- |
| `icon` | node | A leading Lucide icon. The field sets it to 18px, stroke 1.8 and `--text-muted`, whatever the icon's own props say. |
| `multiline` | boolean | Renders a `textarea` (12px 14px padding, no resize). |
| `rows` | number | Textarea rows, default 4. |

`Select` props, from `components/ui/Select.tsx`: `label` (required, becomes the `aria-label`) plus any `select` attribute. It draws its own chevron. `ClearFilters` takes `onClear` and renders the "Clear filters" glass pill in `--danger` text.

Recipe (spec 5.5): `.input-field`, the `.glass-inset` recipe: `--surface-input` fill, `--shadow-well`, radius 14 (`--radius-md`), at least 44px tall, 14px text at weight 500, placeholder `--text-faint`. Text starts 14px in, or 42px with an icon. On focus the well adds a 1px `--border-default` inner ring, and keyboard focus gets the global 2px aqua outline.

Rules:

- Every field needs a name a screen reader can read: a visible `<label>`, `aria-label`, or `Select`'s `label`.
- Don't add a border or a background to a field. The well is the whole look.
- Show `ClearFilters` only while a filter is narrowing the list.
- A search field that opens the search overlay pairs with `Kbd` (see `Kbd.prompt.md`).
