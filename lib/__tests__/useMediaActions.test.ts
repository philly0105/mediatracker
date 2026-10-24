import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useMediaActions,
  MediaActionError,
  isAlreadyWatchedError,
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
} from '@/lib/useMediaActions'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => { mockFetch.mockReset() })

function jsonResponse({ ok, status, body }: { ok: boolean; status: number; body: unknown }) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('useMediaActions', () => {
  it('markWatched resolves and returns the Response on 201', async () => {
    const res = jsonResponse({ ok: true, status: 201, body: { entry: { id: 1 } } })
    mockFetch.mockResolvedValueOnce(res)

    const { markWatched } = useMediaActions()
    const result = await markWatched(550, 'movie')

    expect(result).toBe(res)
  })

  it('markWatched throws MediaActionError with status 409 and the server message on a duplicate', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ok: false, status: 409, body: { error: 'Already in your watch history' } })
    )

    const { markWatched } = useMediaActions()
    const promise = markWatched(550, 'movie')

    await expect(promise).rejects.toBeInstanceOf(MediaActionError)
    await expect(promise).rejects.toMatchObject({
      name: 'MediaActionError',
      status: 409,
      message: 'Already in your watch history',
    })
  })

  it('isAlreadyWatchedError returns true for a 409 and false for a 500', () => {
    expect(isAlreadyWatchedError(new MediaActionError('dup', 409))).toBe(true)
    expect(isAlreadyWatchedError(new MediaActionError('boom', 500))).toBe(false)
    expect(isAlreadyWatchedError(new Error('plain'))).toBe(false)
    expect(isAlreadyWatchedError(null)).toBe(false)
  })

  it('throws with the right status when a non-ok body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => { throw new SyntaxError('Unexpected token') },
    } as unknown as Response)

    const { markWatched } = useMediaActions()
    const promise = markWatched(550, 'movie')

    await expect(promise).rejects.toMatchObject({
      status: 503,
      message: SERVER_ERROR_MESSAGE,
    })
  })

  // Nine call sites render `message` straight into a toast, so a transport
  // status must not reach one: an expired session used to toast the single
  // word `Unauthorized`, and a 500 `Request failed (500)`.
  it.each([
    [401, 'Unauthorized', 'Your session has expired. Reload the page and sign in again.'],
    [403, 'Forbidden', 'You do not have access to that.'],
    [429, 'Rate limit exceeded', 'Too many requests. Give it a minute and try again.'],
  ])('replaces the server string for a %i with copy that says what to do', async (status, serverMessage, expected) => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ok: false, status, body: { error: serverMessage } })
    )

    const { addToWatchlist } = useMediaActions()
    const promise = addToWatchlist(550, 'movie')

    await expect(promise).rejects.toMatchObject({ status, message: expected })
  })

  it('reports a 500 as our fault rather than passing the server string through', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ok: false, status: 500, body: { error: 'relation "watchlist" does not exist' } })
    )

    const { addToWatchlist } = useMediaActions()
    const promise = addToWatchlist(550, 'movie')

    await expect(promise).rejects.toMatchObject({
      status: 500,
      message: SERVER_ERROR_MESSAGE,
    })
  })

  // The 4xx the API phrases for people are left exactly as written — the 409
  // above is one, and some callers show the string as-is.
  it('keeps a 400 body message written for humans', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ok: false, status: 400, body: { error: 'Missing tmdb_id or type' } })
    )

    const { addToWatchlist } = useMediaActions()
    const promise = addToWatchlist(550, 'movie')

    await expect(promise).rejects.toMatchObject({
      status: 400,
      message: 'Missing tmdb_id or type',
    })
  })

  it('turns a rejected fetch into a MediaActionError with connection copy', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const { markWatched } = useMediaActions()
    const promise = markWatched(550, 'movie')

    await expect(promise).rejects.toBeInstanceOf(MediaActionError)
    await expect(promise).rejects.toMatchObject({
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
    })
  })

  it('does not mistake a network failure for the already-watched 409', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const { markWatched } = useMediaActions()
    const err = await markWatched(550, 'movie').catch((e) => e)

    expect(isAlreadyWatchedError(err)).toBe(false)
  })

  it('does not call onDone when the request fails', async () => {
    const onDone = vi.fn()
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const { removeFromWatchlist } = useMediaActions({ onDone })
    await removeFromWatchlist(550, 'movie').catch(() => {})

    expect(onDone).not.toHaveBeenCalled()
  })

  it('markWatched sends rewatch: true in the request body when opts.rewatch is set', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true, status: 201, body: {} }))

    const { markWatched } = useMediaActions()
    await markWatched(550, 'movie', { rewatch: true })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/watch',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"rewatch":true'),
      })
    )
  })

  it('markWatched defaults rewatch to false', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true, status: 201, body: {} }))

    const { markWatched } = useMediaActions()
    await markWatched(550, 'movie')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/watch',
      expect.objectContaining({
        body: expect.stringContaining('"rewatch":false'),
      })
    )
  })

  it('addToWatchlist throws on non-ok', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ok: false, status: 400, body: { error: 'Missing tmdb_id or type' } })
    )

    const { addToWatchlist } = useMediaActions()
    const promise = addToWatchlist(550, 'movie')

    await expect(promise).rejects.toMatchObject({ status: 400 })
  })

  it('removeFromWatchlist throws on non-ok', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: false, status: 500, body: { error: 'boom' } }))

    const { removeFromWatchlist } = useMediaActions()
    const promise = removeFromWatchlist(550, 'movie')

    await expect(promise).rejects.toMatchObject({ status: 500, message: SERVER_ERROR_MESSAGE })
  })
})