'use client'
import type { MediaType, WatchlistPriority } from '@/types'

// Shared network handlers behind "add to watchlist" / "mark as watched" (and the
// occasional "remove from watchlist"), previously inlined as raw fetch calls in
// ~11 files. Callers keep their own local-state / refresh behaviour either via
// the per-instance `onDone` callback (when every action shares the same
// side-effect) or by awaiting the returned Response.
export class MediaActionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'MediaActionError'
    this.status = status
  }
}

// A 409 from POST /api/watch means a synchronous (non-rewatch) entry already
// exists for that media. Call sites use this to offer the rewatch path instead
// of surfacing an error, and should not hardcode the status number themselves.
export function isAlreadyWatchedError(err: unknown): boolean {
  return err instanceof MediaActionError && err.status === 409
}

// Best-effort read of the error body. An error response is not guaranteed to be
// JSON; a parse failure must not mask the real status, so swallow it here.
async function readError(res: Response): Promise<string> {
  let body: { error?: unknown } | null = null
  try {
    body = await res.json()
  } catch {
    // fall through to the status-based fallback below
  }
  return typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`
}

export function useMediaActions(opts: { priority?: WatchlistPriority; onDone?: () => void } = {}) {
  const { priority = 'want_to_watch', onDone } = opts

  const headers = { 'Content-Type': 'application/json' }

  async function addToWatchlist(tmdb_id: number, type: MediaType) {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tmdb_id, type, priority }),
    })
    if (!res.ok) {
      throw new MediaActionError(await readError(res), res.status)
    }
    if (onDone) onDone()
    return res
  }

  // `watchOpts`, not `opts`: the hook's own options object is already named that
  // in the enclosing scope, and shadowing it here reads like a bug.
  async function markWatched(tmdb_id: number, type: MediaType, watchOpts: { rewatch?: boolean } = {}) {
    const res = await fetch('/api/watch', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tmdb_id,
        type,
        watched_at: new Date().toISOString().split('T')[0],
        rewatch: watchOpts.rewatch ?? false,
      }),
    })
    if (!res.ok) {
      throw new MediaActionError(await readError(res), res.status)
    }
    if (onDone) onDone()
    return res
  }

  async function removeFromWatchlist(tmdb_id: number, type: MediaType) {
    const res = await fetch('/api/watchlist', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ tmdb_id, type }),
    })
    if (!res.ok) {
      throw new MediaActionError(await readError(res), res.status)
    }
    if (onDone) onDone()
    return res
  }

  return { addToWatchlist, markWatched, removeFromWatchlist }
}
