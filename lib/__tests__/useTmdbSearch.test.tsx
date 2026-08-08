import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTmdbSearch } from '@/lib/useTmdbSearch'

// The hook owns the debounce and the fetch; a burst of keystrokes must collapse
// into a single request for the final query, and short queries must never hit
// the network.
const mockFetch = vi.fn()

function searchCalls() {
  return mockFetch.mock.calls.filter(([url]) => String(url).includes('/api/tmdb/search'))
}

describe('useTmdbSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('issues one request for a burst of keystrokes instead of one per key', async () => {
    const { result } = renderHook(() => useTmdbSearch())

    // Typing "heat" used to fire a TMDB request per character; only the last
    // keystroke's query should ever reach the network.
    act(() => { result.current.setQuery('h') })
    act(() => { result.current.setQuery('he') })
    act(() => { result.current.setQuery('heat') })
    expect(searchCalls()).toHaveLength(0)

    await act(async () => { vi.advanceTimersByTime(350) })

    const calls = searchCalls()
    expect(calls).toHaveLength(1)
    expect(String(calls[0][0])).toContain('q=heat')
  })

  it('does not call the API for queries shorter than two characters', async () => {
    const { result } = renderHook(() => useTmdbSearch())

    act(() => { result.current.setQuery('b') })
    await act(async () => { vi.advanceTimersByTime(1000) })

    expect(searchCalls()).toHaveLength(0)
    expect(result.current.results).toEqual([])
  })

  it('clear empties the query and results', () => {
    const { result } = renderHook(() => useTmdbSearch())

    act(() => { result.current.setQuery('heat') })
    act(() => { result.current.clear() })

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
  })
})
