# R3-1 — Rate directly in MediaInfoModal

Goal: close the "search → mark watched → rate" loop inside the modal. Today
rating requires finding the card in /movies afterwards.

## API change — `app/api/tmdb/details/route.ts`

The watch check currently selects only `id`. Change it to return the latest
entry so the client can rate it:

- `supabase.from('watch_entries').select('id, rating').eq('user_id', user.id).eq('media_id', media.id).order('watched_at', { ascending: false }).limit(1)`
- Add to the JSON response: `watch_entry: { id, rating } | null` (the single
  latest row, or null). `isWatched` stays derived exactly as now.

## Modal change — `components/MediaInfoModal.tsx`

1. Extend `FullDetails` with `watch_entry: { id: string; rating: number | null } | null`
   and populate it in `fetchDetails`.
2. Extract the details fetch into a `useCallback` (`loadDetails`) so it can be
   re-run. After a successful `handleWatchedClick` (both first watch and
   rewatch), call `loadDetails()` so `watch_entry` appears without reopening.
   Do NOT show the loading shimmer on this refetch — keep existing content on
   screen (track a `refreshing` flag or only set `loading` on first load).
3. New section, rendered when `details?.isWatched && details.watch_entry`,
   placed immediately after the `<hr className="border-white/5" />` and above
   the Watchlist Priority section:

```tsx
<div className="space-y-2.5">
  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
    Your Rating
  </h3>
  <div className="flex items-center gap-3">
    <RatingStars value={userRating} onChange={handleRatingChange} />
    {userRating != null && (
      <span className="text-xs text-zinc-500">{userRating} / 5</span>
    )}
  </div>
</div>
```

4. Interaction (`handleRatingChange`):
   - Optimistic: set local `userRating` state immediately (initialise it from
     `details.watch_entry.rating` when details load).
   - `PATCH /api/watch` with `{ id: details.watch_entry.id, rating }`.
   - On `!res.ok`: revert to the previous value and
     `toast('Could not save your rating.', { tone: 'error' })`.
   - On success: **no toast** — the stars are their own feedback. This is a
     deliberate exception to the toast-everything pattern; rating is
     high-frequency and low-risk.

## Notes

- Rating always edits the *latest* entry (rewatches included) — that is why
  the API orders by `watched_at` desc.
- `RatingStars` already supports half-star clicks and hover; use it as-is.
- Update/extend tests: the details route test (if any) for the new field, and
  a component test that stars render after `isWatched` + `watch_entry` and
  that a click PATCHes `/api/watch` with the entry id.
