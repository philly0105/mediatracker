Two headers: `PageHeader` titles a route, `SectionHeader` titles a glass panel.

## PageHeader

```tsx
import { PageHeader } from '@/components/ui/PageHeader'

<PageHeader
  eyebrow="Thursday, October 22"
  title="Good evening, Richard"
  action={<Button variant="secondary"><Plus size={18} strokeWidth={1.8} aria-hidden="true" />Log a watch</Button>}
/>
<PageHeader title="Library" sub="312 titles" selectable />
```

Props, from `components/ui/PageHeader.tsx`:

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | node | The page's only `h1`. |
| `eyebrow` | string | The muted line above the title: a date or the page's context. Rendered with `Eyebrow`. |
| `sub` | node | One quiet line under the title, 13/18 secondary. Skip it when the title says enough. |
| `action` | node | Right-aligned slot: a pill, a filter, a search field. |
| `selectable` | boolean | Adds the Select / Done pill wired to `MultiSelectProvider`. Does nothing outside one. |

Recipe (spec 5.5): eyebrow 13/18 muted, then the H1 at 28/34, weight 650 (24/30 under `md`); actions right-aligned. The header stacks on phones and goes side by side from `sm`.

## SectionHeader

```tsx
import { SectionHeader } from '@/components/ui/SectionHeader'

<Card variant="panel" as="section" aria-labelledby="coming-soon">
  <SectionHeader
    id="coming-soon"
    title="Coming soon"
    sub="4 episodes this week"
    action={{ label: 'See all', href: '/calendar' }}
  />
  ...
</Card>
```

Props, from `components/ui/SectionHeader.tsx`: `title` (node, rendered as `h2`), `sub` (node), `action` (`{ label, href }`, a link with a trailing chevron), `id` (put on the `h2`), `className`, `style`.

Recipe (spec 5.5): title 20/26 at weight 650; optional sub 13/18 muted; trailing link 14/500 in secondary text, white on hover over `--glass-fill-hover`, 44px tall. The header has 12px below it and 4px of left inset to line up with the rows.

Rules:

- One `PageHeader` per route, at the top. Panels get `SectionHeader`, never a hand-rolled `h2`.
- Titles and links are sentence case: "See all", not "SEE ALL" or "See All".
- Pair each `SectionHeader` `id` with `aria-labelledby` on its panel.
