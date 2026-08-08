# R3-3 — Quick actions on /search result rows

Goal: every action on the search page currently requires opening the modal
(3 clicks to add to watchlist). Put bookmark/watched buttons on the row
itself. Applies to `app/search/page.tsx` (`SearchRow`) only — the ⌘K overlay
intentionally stays minimal.

## Visual spec

- `SearchRow`'s root becomes a `group` (it already is a full-width button —
  restructure into a `div` wrapper with `group relative` holding the existing
  clickable button plus the action cluster, so nested-button HTML stays valid).
- Action cluster, right-aligned and vertically centered
  (`absolute right-3 top-1/2 -translate-y-1/2`), matching the watchlist card
  pattern exactly:
  `flex gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-sm border border-[var(--border-subtle)]`
  with visibility `opacity-100 md:opacity-0 md:group-hover:opacity-100
  transition-opacity duration-200`.
- Reserve space so text never sits under the cluster on mobile: add `pr-20`
  to the row's text column on small screens (`md:pr-2`).
- Two icon buttons, each `p-1.5 rounded-sm transition-colors`, icons
  `w-3.5 h-3.5`:
  - **Bookmark** — not listed: `text-zinc-400 hover:text-[var(--amber-300)]
    hover:bg-[var(--amber-tint-bg)]`, `title="Add to watchlist"`.
    Already listed: persistent active tint `text-[var(--amber-300)]
    bg-[var(--amber-tint-bg)]`, `title="Remove from watchlist"`.
  - **Check** — not watched: `text-zinc-400 hover:text-[var(--teal-300)]
    hover:bg-[var(--teal-tint-bg)]`, `title="Mark as watched"`.
    Already watched: persistent `text-[var(--teal-300)] bg-[var(--teal-tint-bg)]`,
    `title="Watched — log a rewatch"`.
- While a row action is in flight, replace that button's icon with
  `Loader2 w-3.5 h-3.5 animate-spin` and disable both buttons.
- Add matching `aria-label`s to both buttons.

## Behaviour

All handlers live in `SearchPage` (it already has `useMediaActions`,
`useLibraryIds`, and toast access via `useToast` — add the import). Every
button click calls `e.stopPropagation()` so the row's open-modal click never
fires.

- Bookmark, not listed → `addToWatchlist(tmdb_id, type)` (existing
  `want_to_watch` default). Success: add to `watchlistIds`,
  `toast(`Added ${title} to your watchlist.`, { tone: 'success' })`.
- Bookmark, listed → `removeFromWatchlist(tmdb_id, type)` (already exported
  by `useMediaActions`). Success: remove from `watchlistIds`,
  `toast(`Removed ${title} from your watchlist.`, { tone: 'success' })`.
- Check, not watched → `markWatched(tmdb_id, type)`. Success: add to
  `watchedIds`, `toast(`Logged ${title} as watched.`, { tone: 'success' })`.
- Check, already watched → do NOT write immediately. Show
  `toast(`${title} is already in your history.`, { tone: 'info', action:
  { label: 'Log rewatch', onClick: () => markWatched(tmdb_id, type,
  { rewatch: true }) — with its own success toast `Logged a rewatch of
  ${title}.` } })`. This mirrors the modal's 409 pattern; an accidental tap
  must not silently log a rewatch.
- Errors: `isAlreadyWatchedError(err)` → the same rewatch-offer toast;
  anything else → `toast(message, { tone: 'error' })`.

## Tests

Add a component test: rendering a result row with known ids, clicking
bookmark fires a POST to `/api/watchlist` (mock fetch) and flips the badge;
clicking check on an already-watched row does NOT call `/api/watch` until the
toast action is clicked.
