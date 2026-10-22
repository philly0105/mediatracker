Five stars with half steps. Read-only in captions and rows; a single slider when the user can rate.

```tsx
import RatingStars from '@/components/RatingStars'

<RatingStars value={3.5} readOnly size="sm" />
<RatingStars value={rating} onChange={setRating} />
```

Props, from `components/RatingStars.tsx` (a default export):

| Prop | Type | Notes |
| --- | --- | --- |
| `value` | number or null | 0 to 5 in half steps. `null` is unrated. |
| `onChange` | `(rating: number or null) => void` | `null` clears the rating. Without it, the stars are read-only. |
| `readOnly` | boolean | Forces read-only even with `onChange`. |
| `size` | `md` (default), `sm` | `md` is the 24px control, each star in a 32px box. `sm` is the 12px caption row. |

Recipe (spec 5.5): filled stars are `--rating` (gold, `#F2C46D`), empty stars a solid `--rating-empty` (`rgba(236,245,249,.30)`), half stars kept. All glyphs are Lucide `Star` at stroke 1.8, never the ★ character.

Behaviour to keep:

- Read-only stars are one `role="img"` labelled "Rated 3.5 out of 5" or "Not rated".
- The interactive control is one `input type="range"` (0 to 5, step 0.5) laid over the stars, so it has one tab stop, arrow keys, Home and End. It previews while dragging and commits once on pointer up, key up or blur, so a drag costs one request.
- A 44px "Clear rating" button appears once there is a rating.
- The wrapper draws the global focus ring while the hidden slider has keyboard focus.

Rules:

- Gold is for ratings only. Nothing else in the app uses `--rating`.
- Use `sm` under posters and in read-only rows, `md` wherever the user rates.
