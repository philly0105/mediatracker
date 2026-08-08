import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useMediaActions,
  MediaActionError,
  isAlreadyWatchedError,
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

    await expect(promise).rejects.toMatchObject({ status: 503 })
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

    await expect(promise).rejects.toMatchObject({ status: 500 })
  })
})