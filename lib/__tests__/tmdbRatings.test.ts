import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { getTmdbRating, useTmdbRating, _resetForTesting } from '@/lib/tmdbRatings'

describe('tmdbRatings', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    _resetForTesting()
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('coalesces multiple getTmdbRating calls within the window into a single fetch request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ratings: {
          'movie:550': 8.4,
          'movie:680': 8.5,
          'show:1399': 8.9,
        },
      }),
    })

    const p1 = getTmdbRating(550, 'movie')
    const p2 = getTmdbRating(680, 'movie')
    const p3 = getTmdbRating(1399, 'show')

    // Fast-forward past batch window (50ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    const [r1, r2, r3] = await Promise.all([p1, p2, p3])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const url = String(mockFetch.mock.calls[0][0])
    expect(url).toContain('/api/tmdb/rating?ids=')
    expect(url).toContain(encodeURIComponent('movie:550,movie:680,show:1399'))

    expect(r1).toBe(8.4)
    expect(r2).toBe(8.5)
    expect(r3).toBe(8.9)
  })

  it('serves cached ratings immediately without issuing another fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ratings: { 'movie:550': 8.4 },
      }),
    })

    const r1 = await (async () => {
      const p = getTmdbRating(550, 'movie')
      await vi.advanceTimersByTimeAsync(50)
      return p
    })()

    expect(r1).toBe(8.4)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call should return instantly from cache
    const r2 = await getTmdbRating(550, 'movie')
    expect(r2).toBe(8.4)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('handles batch sizes exceeding MAX_BATCH (40) by scheduling multiple flushes', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const parsed = new URL(url, 'http://localhost')
      const ids = parsed.searchParams.get('ids')?.split(',') ?? []
      const ratings: Record<string, number> = {}
      for (const id of ids) {
        ratings[id] = 7.5
      }
      return {
        ok: true,
        json: async () => ({ ratings }),
      }
    })

    const promises: Promise<number | null>[] = []
    // Request 45 items (should produce 2 batches: 40 then 5)
    for (let i = 1; i <= 45; i++) {
      promises.push(getTmdbRating(i, 'movie'))
    }

    // Flush first batch (40)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    // Flush second batch (5)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    const results = await Promise.all(promises)
    expect(results).toHaveLength(45)
    expect(results.every((r) => r === 7.5)).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('resolves null when API returns an error or fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const p = getTmdbRating(999, 'movie')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    const result = await p
    expect(result).toBeNull()
  })

  it('useTmdbRating hook returns initial value when provided without fetching', () => {
    const { result } = renderHook(() => useTmdbRating(550, 'movie', 8.4))
    expect(result.current).toBe(8.4)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('useTmdbRating hook fetches and updates state when initial is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ratings: { 'movie:550': 8.4 },
      }),
    })

    const { result } = renderHook(() => useTmdbRating(550, 'movie', null))
    expect(result.current).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(result.current).toBe(8.4)
  })
})
