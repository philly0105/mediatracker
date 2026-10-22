The poster-art grid tile — the visual heart of DorfMovies (dashboard "Recently Watched", collections). Let real cover artwork carry the color.

```jsx
<PosterCard title="Dune: Part Two" year={2024}
            posterUrl="https://image.tmdb.org/t/p/w400/…jpg"
            rating={4.5} overlay="Watched Jun 12" onClick={…} />
```

Lay these out in a `grid` with `gap: var(--space-5)` and `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`. `overlay` fades up on hover; `rating` shows compact read-only stars.
