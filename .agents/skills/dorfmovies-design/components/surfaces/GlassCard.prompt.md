The default DorfMovies surface — wrap any content that should read as a floating glass panel.

```jsx
<GlassCard glow="violet" onClick={...}>
  <h3>Recently Watched</h3>
</GlassCard>
<GlassCard interactive={false} padding="var(--space-7)">…static panel…</GlassCard>
```

`glow`: `violet` (default) / `rose` / `orange` / `none`. Set `interactive={false}` for non-clickable panels (no lift). For the mouse-following spotlight variant use `SpotlightCard` instead.
