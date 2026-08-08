import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SearchPage from '@/app/search/page'
import { ToastProvider } from '@/components/ToastProvider'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'

// Seed values let a test start with the row already watched/watchlisted while the
// setters still mutate real state (needed to assert the bookmark badge flips).
let initialWatched: number[] = []
let initialWatchlist: number[] = []
vi.mock('@/lib/useLibraryIds', async () => {
  const { useState } = await import('react')
  return {
    useLibraryIds: () => {
      const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set(initialWatched))
      const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set(initialWatchlist))
      return { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds }
    },
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => ({ select: async () => ({ data: [] }) }) }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

const RESULT = {
  tmdb_id: 550,
  type: 'movie',
  title: 'Heat',
  overview: 'A movie',
  poster_url: null,
  release_year: 1995,
}

const mockFetch = vi.fn()

function callsWith(urlPart: string) {
  return mockFetch.mock.calls.filter(([url]) => String(url).includes(urlPart))
}

function type(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Search movies and TV shows...'), {
    target: { value },
  })
}

function renderPage() {
  return render(
    <ToastProvider>
      <MultiSelectProvider>
        <SearchPage />
      </MultiSelectProvider>
    </ToastProvider>
  )
}

// Type a query and let the debounce fire so a result row renders. Direct
// assertions (not findBy/waitFor) because the debounce runs on fake timers.
async function showResult() {
  act(() => { type('heat') })
  await act(async () => { vi.advanceTimersByTime(350) })
  // Flush the in-flight search() promise so setResults lands before we assert.
  await act(async () => {})
  expect(screen.getByText('Heat')).toBeInTheDocument()
}

describe('SearchPage quick actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    initialWatched = []
    initialWatchlist = []
    mockFetch.mockReset()
    mockFetch.mockImplementation((url: string) => {
      if (String(url).includes('/api/tmdb/search')) {
        return Promise.resolve({ ok: true, json: async () => ({ results: [RESULT] }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('bookmark POSTs to /api/watchlist and flips the badge', async () => {
    renderPage()
    await showResult()

    await act(async () => {
      fireEvent.click(screen.getByTitle('Add to watchlist'))
    })
    // Flush the async addToWatchlist handler.
    await act(async () => {})

    expect(callsWith('/api/watchlist')).toHaveLength(1)
    const [url, init] = callsWith('/api/watchlist')[0] as [string, RequestInit]
    expect(url).toBe('/api/watchlist')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ tmdb_id: 550, type: 'movie', priority: 'want_to_watch' }))

    // The success handler adds the id to watchlistIds, which flips the badge.
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
  })

  it('check on an already-watched row does not write until the toast action is clicked', async () => {
    initialWatched = [550]
    renderPage()
    await showResult()

    await act(async () => {
      fireEvent.click(screen.getByTitle('Watched — log a rewatch'))
    })
    await act(async () => {})

    // Already watched → only the rewatch offer, no write yet.
    expect(callsWith('/api/watch')).toHaveLength(0)
    expect(screen.getByText('Heat is already in your history.')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('Log rewatch'))
    })
    await act(async () => {})

    expect(callsWith('/api/watch')).toHaveLength(1)
    const [, init] = callsWith('/api/watch')[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ tmdb_id: 550, type: 'movie', rewatch: true })
  })
})