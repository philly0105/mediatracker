Pill button in the DorfMovies house style — use for every clickable action; solid-white `primary` is the one strong CTA per view, `ghost` for secondary, `accent` (violet tint) for on-brand emphasis, `link` for tertiary/inline.

```jsx
<Button variant="primary">Sign In</Button>
<Button variant="ghost" icon="pencil">Edit</Button>
<Button variant="accent" iconRight="arrow-right">Start searching</Button>
<Button variant="link" iconRight="arrow-right">View all</Button>
```

Icons are Lucide names — load `https://unpkg.com/lucide@latest` and call `lucide.createIcons()` after render. Sizes: `sm` / `md` / `lg`. `fullWidth` stretches to its container (used in modals/forms).
