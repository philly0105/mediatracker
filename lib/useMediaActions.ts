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

// POST /api/watch returns the row it inserted. Handing that row straight to
// MediaInfoModal is what lets the modal offer Undo without refetching the whole
// details payload; a body that isn't the shape we expect resolves to undefined,
// and the modal falls back to that refetch.
export async function readCreatedEntry(
  res: Response
): Promise<{ id: string; rating: number | null } | undefined> {
  let body: { entry?: { id?: unknown; rating?: unknown } } | null = null
  try {
    body = await res.json()
  } catch {
    // fall through to the refetch path below
  }
  const entry = body?.entry
  if (typeof entry?.id !== 'string') return undefined
  return { id: entry.id, rating: typeof entry.rating === 'number' ? entry.rating : null }
}

// Nine call sites put `MediaActionError.message` straight into a toast, so
// whatever comes out of here is user-facing copy. The API writes real copy for
// the cases it expects (the 409 below is offered as a "log a rewatch?"), but a
// transport status is not copy: a bookmark clicked on an expired session used
// to toast the bare word `Unauthorized`, and a 500 `Request failed (500)` —
// neither of which tells anyone what to do next.
const STATUS_MESSAGES: Record<number, string> = {
  401: 'Your session has expired. Reload the page and sign in again.',
  403: 'You do not have access to that.',
  429: 'Too many requests. Give it a minute and try again.',
}

/** A fault on our side, or a body we could not read. */
export const SERVER_ERROR_MESSAGE = 'Something went wrong on our end. Try again in a moment.'

/** A fetch that never reached a server: offline, DNS, a dropped connection. */
export const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Check your connection and try again.'

// Best-effort read of the error body. An error response is not guaranteed to be
// JSON; a parse failure must not mask the real status, so swallow it here.
async function readError(res: Response): Promise<string> {
  const mapped = STATUS_MESSAGES[res.status]
  if (mapped) return mapped
  // A 5xx body is a stack trace or an HTML error page as often as it is copy.
  if (res.status >= 500) return SERVER_ERROR_MESSAGE
  let body: { error?: unknown } | null = null
  try {
    body = await res.json()
  } catch {
    // fall through to the generic message below
  }
  // The remaining 4xx are the ones the API phrases for people ("Already in your
  // watch history"), so they are passed through as written.
  return typeof body?.error === 'string' ? body.error : SERVER_ERROR_MESSAGE
}

// Every action goes through here so the network-failure path is written once.
// `status: 0` marks "never reached a server", which no real response carries —
// isAlreadyWatchedError and the other status checks stay exact.
async function request(url: string, init: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new MediaActionError(NETWORK_ERROR_MESSAGE, 0)
  }
  if (!res.ok) throw new MediaActionError(await readError(res), res.status)
  return res
}

export function useMediaActions(opts: { priority?: WatchlistPriority; onDone?: () => void } = {}) {
  const { priority = 'want_to_watch', onDone } = opts

  const headers = { 'Content-Type': 'application/json' }

  // `overridePriority` exists for MediaModalProvider, which builds its handlers
  // once but opens media on behalf of pages that disagree about the default
  // bucket (the calendar and /person add as must_watch, the rest as
  // want_to_watch). Everyone else keeps passing two arguments.
  async function addToWatchlist(
    tmdb_id: number,
    type: MediaType,
    overridePriority?: WatchlistPriority
  ) {
    const res = await request('/api/watchlist', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tmdb_id, type, priority: overridePriority ?? priority }),
    })
    if (onDone) onDone()
    return res
  }

  // `watchOpts`, not `opts`: the hook's own options object is already named that
  // in the enclosing scope, and shadowing it here reads like a bug.
  async function markWatched(tmdb_id: number, type: MediaType, watchOpts: { rewatch?: boolean } = {}) {
    const res = await request('/api/watch', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tmdb_id,
        type,
        watched_at: new Date().toISOString().split('T')[0],
        rewatch: watchOpts.rewatch ?? false,
      }),
    })
    if (onDone) onDone()
    return res
  }

  async function removeFromWatchlist(tmdb_id: number, type: MediaType) {
    const res = await request('/api/watchlist', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ tmdb_id, type }),
    })
    if (onDone) onDone()
    return res
  }

  return { addToWatchlist, markWatched, removeFromWatchlist }
}
