import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SearchPage from '@/app/search/page'
import { ToastProvider } from '@/components/ToastProvider'

// The page pulls the user's watched/watchlist ids from Supabase on mount purely
// to badge rows; it is irrelevant to the debounce and needs no network here.
vi.mock('@/lib/useLibraryIds', () => ({
  useLibraryIds: () => ({
    watchedIds: new Set<number>(),
    watchlistIds: new Set<number>(),
    setWatchedIds: vi.fn(),
    setWatchlistIds: vi.fn(),
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => ({ select: async () => ({ data: [] }) }) }),
}))

const mockFetch = vi.fn()

function searchCalls() {
  return mockFetch.mock.calls.filter(([url]) => String(url).includes('/api/tmdb/search'))
}

function type(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Search movies and TV shows...'), {
    target: { value },
  })
}

describe('SearchPage query debounce', () => {
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
    render(
      <ToastProvider>
        <SearchPage />
      </ToastProvider>
    )

    // Typing "breaking bad" used to fire a TMDB request per character.
    for (const value of ['b', 'br', 'bre', 'brea', 'break', 'breaking']) {
      act(() => { type(value) })
    }
    expect(searchCalls()).toHaveLength(0)

    await act(async () => { vi.advanceTimersByTime(350) })

    const calls = searchCalls()
    expect(calls).toHaveLength(1)
    expect(String(calls[0][0])).toContain('q=breaking')
  })

  it('does not call the API for queries shorter than two characters', async () => {
    render(
      <ToastProvider>
        <SearchPage />
      </ToastProvider>
    )

    act(() => { type('b') })
    await act(async () => { vi.advanceTimersByTime(1000) })

    expect(searchCalls()).toHaveLength(0)
  })

  it('aborts an in-flight request when a newer query supersedes it', async () => {
    render(
      <ToastProvider>
        <SearchPage />
      </ToastProvider>
    )

    act(() => { type('heat') })
    await act(async () => { vi.advanceTimersByTime(350) })
    expect(searchCalls()).toHaveLength(1)

    const firstSignal = searchCalls()[0][1]?.signal as AbortSignal
    expect(firstSignal.aborted).toBe(false)

    act(() => { type('heat 1995') })
    await act(async () => { vi.advanceTimersByTime(350) })

    // The superseded request is cancelled, so its late response cannot land on
    // top of the newer one.
    expect(searchCalls()).toHaveLength(2)
    expect(firstSignal.aborted).toBe(true)
  })

  it('clears results and stops loading when the query is emptied', async () => {
    render(
      <ToastProvider>
        <SearchPage />
      </ToastProvider>
    )

    act(() => { type('heat') })
    await act(async () => { vi.advanceTimersByTime(350) })
    expect(searchCalls()).toHaveLength(1)

    act(() => { type('') })
    await act(async () => { vi.advanceTimersByTime(1000) })

    expect(searchCalls()).toHaveLength(1)
    expect(screen.queryByText('Searching...')).not.toBeInTheDocument()
  })
})
