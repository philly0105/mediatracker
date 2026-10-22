The dashboard's headline metric — giant gradient numeral with an icon chip and caption. Compose inside a `SpotlightCard`.

```jsx
<SpotlightCard spotlightColor="rgba(249,115,22,0.12)">
  <StatTile icon="calendar" tone="orange" tag="Year 2026"
            value={42} caption="Watched this year" captionIcon="trending-up" />
</SpotlightCard>
```

`tone`: `violet` / `orange` / `rose` / `white` (sets both the chip tint and the numeral gradient). `tag` is the small uppercase pill top-right. Numbers should stay short — this type is huge (60px black).
