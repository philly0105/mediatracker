# R6-1 — Log feedback: rate prompt + undo in MediaInfoModal

Goal: after "Mark as Watched" the modal already stays open and (after a
details refetch) shows the "Your Rating" stars — but the user gets no cue
that rating is now possible, and a mistaken log has no cheap way back.
Two changes, both inside `components/MediaInfoModal.tsx`:
(1) the success path waits for the refetch, points the user at the rating
row, and scrolls/pulses it; (2) the success toast for a first (non-rewatch)
log carries an Undo action that deletes the just-created watch entry.
Rewatch logs get NO undo (the details endpoint's `watch_entry` does not
disambiguate which entry a rewatch created).

## 1. `loadDetails` returns what it fetched

The undo action needs the fresh `watch_entry.id` at toast time, and state
set inside `loadDetails` is not readable synchronously. Change `loadDetails`
to return the details object it builds (the exact object currently passed to
`setDetails`), and `null` on the error path. No other behavior changes —
callers that ignore the return value are unaffected.

```tsx
const loadDetails = useCallback(async (refreshing = false): Promise<FullDetails | null> => {
  try {
    ...
    const fresh: FullDetails = { /* the object currently built inline */ }
    setDetails(fresh)
    setUserRating(data.watch_entry?.rating ?? null)
    return fresh
  } catch (err: any) {
    ...existing error handling...
    return null
  } finally {
    if (!refreshing) setLoading(false)
  }
}, [item.tmdb_id, item.type])
```

## 2. Rating row ref + pulse state

- Add `const ratingRowRef = useRef<HTMLDivElement>(null)` and
  `const [ratingPulse, setRatingPulse] = useState(false)`.
- On the "Your Rating" section's outer `<div className="space-y-2.5">`:

```tsx
<div
  ref={ratingRowRef}
  className={`space-y-2.5 rounded-[var(--radius-md)] transition-shadow duration-500 ${ratingPulse ? 'ring-2 ring-[var(--accent)]/60 ring-offset-4 ring-offset-transparent' : ''}`}
>
```

- Clear the pulse with an effect: when `ratingPulse` becomes true, a 1600ms
  timeout sets it false; clean the timeout up on unmount/re-run.

## 3. `handleWatchedClick` success path

Replace the current success block (toast + fire-and-forget
`loadDetails(true)`) with:

```tsx
await onMarkAsWatched(opts)
if (details) setDetails({ ...details, isWatched: true })
// The refetch is awaited so the fresh watch_entry (and its id, for Undo)
// exists before the toast points the user at the rating row.
const fresh = await loadDetails(true)
if (opts?.rewatch) {
  toast(`Logged a rewatch of ${item.title}.`, { tone: 'success' })
} else {
  const entryId = fresh?.watch_entry?.id
  toast(`Logged ${item.title} as watched — rate it below.`, {
    tone: 'success',
    ...(entryId ? { action: { label: 'Undo', onClick: () => undoWatch(entryId) } } : {}),
  })
  ratingRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setRatingPulse(true)
}
// Modal stays open after action
```

The catch block (409 rewatch offer / error toast) is unchanged.

## 4. `undoWatch`

New function next to the other handlers:

```tsx
// Undo for a first log only — a rewatch's new entry id is not recoverable
// from the details endpoint, so rewatches never offer this.
async function undoWatch(entryId: string) {
  try {
    const res = await fetch('/api/watch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId }),
    })
    if (!res.ok) throw new Error('Failed to undo')
    setUserRating(null)
    await loadDetails(true)
    toast(`Removed ${item.title} from your history.`, { tone: 'info' })
  } catch (err) {
    console.error(err)
    toast('Could not undo — the entry is still logged.', { tone: 'error' })
  }
}
```

## 5. Tests — `components/__tests__/MediaInfoModal.rewatch.test.tsx`

- Update any assertion that expects the old copy `Logged Heat as watched.`
  to the new copy `Logged Heat as watched — rate it below.` — note the two
  existing assertions are `queryByText(...).not.toBeInTheDocument()` guards,
  which pass either way; only update assertions that expect the text to be
  PRESENT (add none if none exist).
- jsdom does not implement `scrollIntoView`; if any test now throws on it,
  stub `HTMLElement.prototype.scrollIntoView = vi.fn()` in that file's
  `beforeEach` (KeyboardShortcuts.test.tsx already uses this exact stub).
- ADD two tests (follow the file's existing mock setup for details fetch and
  mark-watched):
  1. A successful non-rewatch log shows a toast containing
     `rate it below` with an `Undo` button.
  2. Clicking `Undo` issues `DELETE /api/watch` with the entry id from the
     (mocked) details response, and an info toast `Removed Heat from your
     history.` appears.

## 6. Out of scope

Do not touch `lib/useMediaActions.ts`, any caller of `MediaInfoModal`, the
API routes, or anything under `docs/`. The `onMarkAsWatched` prop contract
is unchanged.
