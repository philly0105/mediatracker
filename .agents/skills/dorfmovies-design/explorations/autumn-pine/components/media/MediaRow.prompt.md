The watch-entry list card — poster thumb beside title, type/year, rating, and an optional review. Used on Movies/Shows/Watchlist in a 1–3 column grid.

```jsx
<MediaRow title="Oppenheimer" year={2023} type="movie"
          posterUrl="https://image.tmdb.org/t/p/w200/…jpg"
          rating={4.5} onRate={setRating}
          review="A towering, relentless character study." watchedAt="2026-06-10" />
```

Pass `onRate` to make stars editable; omit for read-only. Use `tmdbRating` instead of `watchedAt` for library views that hide the watched date. For the grid-of-covers layout use `PosterCard`.
