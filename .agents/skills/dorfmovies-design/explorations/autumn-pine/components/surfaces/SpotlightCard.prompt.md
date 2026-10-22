Premium glass card with a mouse-following radial spotlight — used for dashboard bento stat tiles. Tint the spotlight per accent.

```jsx
<SpotlightCard spotlightColor="rgba(139,92,246,0.15)">
  <StatTile … />
</SpotlightCard>
```

Keep `padding={0}` when the child is a full-bleed clickable area (poster background, link). For plain non-spotlight surfaces use `GlassCard`.
