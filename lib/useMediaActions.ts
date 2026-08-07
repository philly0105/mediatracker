'use client'
import type { MediaType, WatchlistPriority } from '@/types'

// Shared network handlers behind "add to watchlist" / "mark as watched" (and the
// occasional "remove from watchlist"), previously inlined as raw fetch calls in
// ~11 files. Callers keep their own local-state / refresh behaviour either via
// the per-instance `onDone` callback (when every action shares the same
// side-effect) or by awaiting the returned Response.
export function useMediaActions(opts: { priority?: WatchlistPriority; onDone?: () => void } = {}) {
  const { priority = 'want_to_watch', onDone } = opts

  const headers = { 'Content-Type': 'application/json' }

  async function addToWatchlist(tmdb_id: number, type: MediaType) {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tmdb_id, type, priority }),
    })
    if (onDone) onDone()
    return res
  }

  async function markWatched(tmdb_id: number, type: MediaType) {
    const res = await fetch('/api/watch', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tmdb_id,
        type,
        watched_at: new Date().toISOString().split('T')[0],
      }),
    })
    if (onDone) onDone()
    return res
  }

  async function removeFromWatchlist(tmdb_id: number, type: MediaType) {
    const res = await fetch('/api/watchlist', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ tmdb_id, type }),
    })
    if (onDone) onDone()
    return res
  }

  return { addToWatchlist, markWatched, removeFromWatchlist }
}
