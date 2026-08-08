# R3-5 — "Pick for me" on the watchlist

Goal: the watchlist should answer its own question. A weighted random picker
with an optional time budget, presented in a small modal.

## Entry point — `app/watchlist/page.tsx`

In the header controls row, after the genre `<select>`, add a `Button`
(default variant) with the lucide `Dices` icon (`w-4 h-4`) and label
`Pick for me`. It opens the modal below and passes the current `typeFilter`
and `genreFilter` so the pick respects what's on screen.

## New component — `components/TonightPickModal.tsx`

Client component, portal to body, `z-50`, using the `useModal` hook (Escape,
scroll lock, focus restore). Scrim: `fixed inset-0` `background: var(--scrim)`
`backdrop-blur-md`, click closes.

Panel: centered, `max-w-md w-full`, `background: var(--surface-modal)`,
`border border-white/15`, `rounded-[var(--radius-2xl)]`, `p-6`, `shadow-2xl`,
close X button styled identically to MediaInfoModal's. Entrance: motion
spring, stiffness 350, damping 28, `initial={{ opacity: 0, scale: 0.95, y: 15 }}`.

Content, top to bottom:

1. Label: `text-xs font-bold uppercase tracking-wider text-zinc-500` →
   `Tonight's Pick`.
2. Time budget as `FilterPills`: options `Any time` (`any`, default),
   `< 90m` (`90`), `< 2h` (`120`), `< 3h` (`180`). Changing it re-rolls
   immediately from the re-filtered pool.
3. The pick card — a motion.div keyed by the picked item's id
   (`initial={{ opacity: 0, y: 8, scale: 0.98 }}`, duration 0.2) with
   `flex gap-4`:
   - Poster: `next/image` 112×168, `rounded-[var(--radius-xl)] border
     border-white/5 shadow-lg object-cover` (standard No Poster box fallback).
   - Right column (`min-w-0 flex-1 space-y-2`):
     - Priority badge: reuse the icon + tint classes from the page's
       `PRIORITY_CONFIG` (export it from the page module or lift it into
       `lib/`; do not restyle it) at pill size: `inline-flex items-center
       gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5
       rounded border`.
     - Title: `text-xl font-black text-white leading-tight`.
     - Meta line `text-xs text-zinc-400`: `2019 · Movie · 1h 52m` (runtime
       via the same `formatRuntime` shape as MediaInfoModal; omit segments
       that are null).
     - Genres: same pill styling as MediaInfoModal's genre pills, max 4.
     - Overview: `text-sm text-zinc-400 leading-relaxed line-clamp-3`.
4. Footer, `flex gap-3 pt-5`:
   - `Reroll` — Button, `flex: 1`, `Dices` icon. Picks again (never the same
     item twice in a row when the pool has more than one).
   - `Details` — Button, `flex: 1`, `Info` icon. Opens `MediaInfoModal` for
     the pick (`mediaToResult(item.media)`), stacked above; wire
     `onAddToWatchlist` as a no-op and `onMarkAsWatched` via
     `useMediaActions().markWatched` so a pick can be logged on the spot.

Empty pool: replace the card with `py-10 text-center text-sm text-zinc-400`:
`Nothing on your watchlist matches.` plus, when a time budget is active, a
second line `text-xs text-zinc-600`: `Try a longer time budget.`

## Candidate pool & weighting

- On open, fetch all three priorities in parallel:
  `GET /api/watchlist?priority=<p>&page=1&limit=100` plus the page's current
  `type`/`genre` params. Merge results. Loading state: card area shows the
  standard pulse skeleton (poster box + three lines).
- Time budget filters on `media.runtime_mins`: pass when `runtime_mins !=
  null && runtime_mins <= threshold`. `any` passes everything, null runtimes
  included.
- Weighted random: `must_watch` ×4, `want_to_watch` ×2, `someday` ×1.

## Tests

Pure-function test for the weighted pick (seedable RNG parameter: pass
`rng: () => number` defaulting to `Math.random`): weights respected, no
immediate repeat when pool > 1, time-budget filtering (null runtime only in
`any`).
