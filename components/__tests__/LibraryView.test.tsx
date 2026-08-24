import { StrictMode, type HTMLAttributes, type ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LibraryView, { __resetEntryCache } from '../LibraryView'
import { ToastProvider } from '../ToastProvider'
import { MultiSelectProvider } from '../MultiSelectProvider'
import { MediaModalProvider } from '../MediaModalProvider'
import type { WatchEntry } from '@/types'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown
  animate?: unknown
  exit?: unknown
  transition?: unknown
  layout?: unknown
}

function stripMotionProps({ ...props }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete props.initial
  delete props.animate
  delete props.exit
  delete props.transition
  delete props.layout
  return props
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  MotionConfig: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: (props: MotionDivProps) => <div {...stripMotionProps(props)} />,
  },
}))

const refresh = vi.fn()
const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), back: vi.fn(), replace }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/library',
}))

function entry(id: string, title: string): WatchEntry {
  return {
    id,
    user_id: 'u1',
    media_id: `m-${id}`,
    rating: 4,
    review: null,
    watched_at: '2026-01-01',
    rewatch: false,
    created_at: '2026-01-01T00:00:00Z',
    media: {
      id: `m-${id}`,
      tmdb_id: Number(id),
      type: 'movie',
      title,
      overview: null,
      poster_url: null,
      genres: [],
      release_year: 2020,
      runtime_mins: 100,
      director: null,
      vote_average: 7.5,
      cast_members: [],
      collection_id: null,
      collection_name: null,
    },
  }
}

const mockFetch = vi.fn()

function renderLibrary() {
  return render(
    <ToastProvider>
      <MediaModalProvider>
        <MultiSelectProvider>
          <LibraryView />
        </MultiSelectProvider>
      </MediaModalProvider>
    </ToastProvider>
  )
}

describe('LibraryView', () => {
  beforeEach(() => {
    refresh.mockClear()
    mockFetch.mockReset()
    global.fetch = mockFetch
    // The entry cache is module state that survives unmount by design, so
    // without this each case inherits the previous one's library.
    __resetEntryCache()
    // No confirm() spy: deleting no longer prompts, it offers an Undo instead.
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function deleteCalls() {
    return mockFetch.mock.calls.filter(([, init]) => init?.method === 'DELETE')
  }

  it('renders only the first page and grows as the sentinel is reached', async () => {
    // jsdom has no IntersectionObserver; capture the callback so the test can
    // fire it directly rather than trying to fake a scroll.
    let trigger: (() => void) | null = null
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = () => cb([{ isIntersecting: true }])
      }
      observe() {}
      disconnect() {}
    })

    const many = Array.from({ length: 30 }, (_, i) => entry(String(i + 1), `Film ${i + 1}`))
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ entries: many }) })

    renderLibrary()
    await screen.findByText('Film 1')

    // 30 loaded, 24 rendered — the count still reports the whole library.
    expect(screen.getAllByTitle('Delete entry')).toHaveLength(24)
    expect(screen.getByText('30 watched')).toBeInTheDocument()
    expect(screen.queryByText('Film 30')).not.toBeInTheDocument()

    await act(async () => { trigger?.() })
    await screen.findByText('Film 30')
    expect(screen.getAllByTitle('Delete entry')).toHaveLength(30)
  })

  it('resets the window when a filter narrows the list', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const many = Array.from({ length: 30 }, (_, i) => entry(String(i + 1), `Film ${i + 1}`))
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ entries: many }) })

    renderLibrary()
    await screen.findByText('Film 1')

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Search titles/), {
        target: { value: 'Film 3' },
      })
    })

    // Substring matching, so "3" also catches 13, 23 and 30 — four rows. The
    // point is the header reports the subset rather than the whole library.
    expect(screen.getByText('4 of 30 watched')).toBeInTheDocument()
    expect(screen.getAllByTitle('Delete entry')).toHaveLength(4)
  })

  it('removes a deleted row immediately and commits the delete after the undo window', async () => {
    vi.useFakeTimers()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat'), entry('2', 'Sicario')] }),
    })

    renderLibrary()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('2 watched')).toBeInTheDocument()

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete entry')[0])
    })

    // Gone from the UI at once, but nothing has been sent yet — that is what
    // makes Undo a cancellation rather than a reconstruction.
    expect(screen.queryByText('Heat')).not.toBeInTheDocument()
    expect(screen.getByText('Sicario')).toBeInTheDocument()
    expect(screen.getByText('1 watched')).toBeInTheDocument()
    expect(deleteCalls()).toHaveLength(0)

    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })
    expect(deleteCalls()).toHaveLength(1)
    expect(JSON.parse(String(deleteCalls()[0][1]?.body))).toEqual({ id: '1' })

    vi.useRealTimers()
  })

  it('undo restores the row and never sends the delete', async () => {
    vi.useFakeTimers()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat')] }),
    })

    renderLibrary()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete entry')[0])
    })
    expect(screen.queryByText('Heat')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('Undo'))
    })

    expect(screen.getByText('Heat')).toBeInTheDocument()
    expect(screen.getByText('1 watched')).toBeInTheDocument()

    // Well past the window: the cancelled request must never fire.
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(deleteCalls()).toHaveLength(0)

    vi.useRealTimers()
  })

  it('puts the row back when the deferred delete fails', async () => {
    vi.useFakeTimers()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat')] }),
    })

    renderLibrary()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await act(async () => {
      fireEvent.click(screen.getAllByTitle('Delete entry')[0])
    })
    expect(screen.queryByText('Heat')).not.toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })

    // The server still has it, so the UI must not keep pretending otherwise.
    expect(screen.getByText('Heat')).toBeInTheDocument()
    expect(screen.getByText('Could not remove Heat.')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('issues a scoped fetch when a type pill is selected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat')] }),
    })

    renderLibrary()
    await screen.findByText('Heat')

    // The first fetch is unscoped — a bare /api/watch returns both types.
    expect(mockFetch).toHaveBeenCalledWith('/api/watch')

    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat')] }),
    })

    // Movies and All both appear as pills (rating also has an All), and the type
    // row is rendered first, so the leading All is the type filter.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Movies' }))
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/watch?type=movie')

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'All' })[0])
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/watch')
  })

  it('toggles between row and poster layouts', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat')] }),
    })

    renderLibrary()
    await screen.findByText('Heat')

    // Both layouts expose the title as a button — MediaRow via role="button" on
    // its div root, PosterCard via a real <button>. The tag name is what tells
    // them apart. (This used to assert that the list row was *not* a button,
    // which was really asserting that list view had no keyboard access.)
    expect(screen.getByRole('button', { name: /^Heat/ }).tagName).toBe('DIV')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Grid view' }))
    })
    expect(screen.getByRole('button', { name: /^Heat/ }).tagName).toBe('BUTTON')
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    })
    expect(screen.getByRole('button', { name: /^Heat/ }).tagName).toBe('DIV')
  })

  it('opens a library row from the keyboard', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [entry('1', 'Heat')] }),
    })

    renderLibrary()
    await screen.findByText('Heat')

    const row = screen.getByRole('button', { name: /^Heat/ })
    expect(row).toHaveAttribute('tabindex', '0')

    // List view is the default, so this is the app's primary way of opening a
    // title — it has to work without a mouse.
    await act(async () => {
      fireEvent.keyDown(row, { key: 'Enter' })
    })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('renders server-seeded entries without making an initial hydration fetch', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const seeded = [entry('1', 'Heat')]

    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <LibraryView
              initialEntries={seeded}
              initialType="all"
              initialFetchedAt={Date.now()}
            />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )

    expect(screen.getByText('Heat')).toBeInTheDocument()
    expect(screen.getByText('1 watched')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches scoped entries when switching type filter from seeded initial data', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const seeded = [entry('1', 'Heat')]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry('2', 'The Godfather')] }),
    })

    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <LibraryView
              initialEntries={seeded}
              initialType="all"
              initialFetchedAt={Date.now()}
            />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )

    expect(screen.getByText('Heat')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Movies' }))
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/watch?type=movie')
    expect(await screen.findByText('The Godfather')).toBeInTheDocument()
  })

  it('refetches and renders all entries when switching back to all after viewing movies', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const seededAll = [entry('1', 'All Seed Film')]
    const movieEntries = [entry('2', 'Movie Only Film')]
    const refetchedAll = [entry('3', 'Refetched All Film')]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: movieEntries }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: refetchedAll }),
      })

    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <LibraryView
              initialEntries={seededAll}
              initialType="all"
              initialFetchedAt={Date.now()}
            />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )

    expect(screen.getByText('All Seed Film')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Movies' }))
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/watch?type=movie')
    expect(await screen.findByText('Movie Only Film')).toBeInTheDocument()
    expect(screen.queryByText('All Seed Film')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'All' })[0])
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/watch')
    expect(await screen.findByText('Refetched All Film')).toBeInTheDocument()
    expect(screen.queryByText('Movie Only Film')).not.toBeInTheDocument()
  })

  it('does not make hydration fetch even under React StrictMode double effect invocation', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const seededAll = [entry('1', 'Strict Seed Film')]

    render(
      <StrictMode>
        <ToastProvider>
          <MediaModalProvider>
            <MultiSelectProvider>
              <LibraryView
                initialEntries={seededAll}
                initialType="all"
                initialFetchedAt={Date.now()}
              />
            </MultiSelectProvider>
          </MediaModalProvider>
        </ToastProvider>
      </StrictMode>
    )

    expect(screen.getByText('Strict Seed Film')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refetches on mount if initial seed is older than the stale threshold', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const staleEntries = [entry('1', 'Stale Seed Film')]
    const freshEntries = [entry('2', 'Fresh Server Film')]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: freshEntries }),
    })

    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <LibraryView
              initialEntries={staleEntries}
              initialType="all"
              initialFetchedAt={Date.now() - 35_000}
            />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/watch')
    expect(await screen.findByText('Fresh Server Film')).toBeInTheDocument()
  })

  it('ignores late scoped responses when navigating back to cached all before request resolves', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const seededAll = [entry('1', 'All Seed Film')]
    let resolveMovies!: (value: { ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }) => void
    const moviesPromise = new Promise<{ ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }>(
      (resolve) => {
        resolveMovies = resolve
      }
    )

    mockFetch.mockImplementationOnce(() => moviesPromise)

    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <LibraryView
              initialEntries={seededAll}
              initialType="all"
              initialFetchedAt={Date.now()}
            />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )

    expect(screen.getByText('All Seed Film')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()

    // Switch to Movies — starts the scoped fetch
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Movies' }))
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/watch?type=movie')

    // Switch back to All before the movie request resolves — should be satisfied from cache/seed
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'All' })[0])
    })

    // Assert no unnecessary All request when the fresh All cache/seed is still valid
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Now resolve the late Movies response
    await act(async () => {
      resolveMovies({
        ok: true,
        json: async () => ({ entries: [entry('2', 'Late Movie Film')] }),
      })
    })

    // UI remains All and late Movies rows never replace it
    expect(screen.getByText('All Seed Film')).toBeInTheDocument()
    expect(screen.queryByText('Late Movie Film')).not.toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('coalesces stale visibilitychange and focus requests into exactly one GET and updates entries', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('IntersectionObserver', class {
        observe() {}
        disconnect() {}
      })

      const initialTime = 1700000000000
      vi.setSystemTime(initialTime)

      const seededAll = [entry('1', 'Seed Movie')]
      let resolveBackground!: (value: { ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }) => void
      const bgPromise = new Promise<{ ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }>((resolve) => {
        resolveBackground = resolve
      })

      mockFetch.mockImplementation(() => bgPromise)

      render(
        <ToastProvider>
          <MediaModalProvider>
            <MultiSelectProvider>
              <LibraryView
                initialEntries={seededAll}
                initialType="all"
                initialFetchedAt={initialTime}
              />
            </MultiSelectProvider>
          </MediaModalProvider>
        </ToastProvider>
      )

      expect(screen.getByText('Seed Movie')).toBeInTheDocument()
      expect(mockFetch).not.toHaveBeenCalled()

      // Advance system time past the 30s stale threshold
      vi.setSystemTime(initialTime + 35_000)

      // Ensure document visibility is visible
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })

      // Fire visibilitychange and focus back-to-back
      fireEvent(document, new Event('visibilitychange'))
      fireEvent(window, new Event('focus'))

      // Assert only one GET is made
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/watch')

      // Resolve the background response
      await act(async () => {
        resolveBackground({
          ok: true,
          json: async () => ({ entries: [entry('2', 'Background Updated Film')] }),
        })
      })

      // Assert accepted response updates current type and no extra GET was triggered
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Background Updated Film')).toBeInTheDocument()
      expect(screen.queryByText('Seed Movie')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('coalesces visibility and focus during active manual refresh and resets refreshing state on resolution', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('IntersectionObserver', class {
        observe() {}
        disconnect() {}
      })

      const initialTime = 1700000000000
      vi.setSystemTime(initialTime)

      const seededAll = [entry('1', 'Initial Film')]
      let resolveRefresh!: (value: { ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }) => void
      const refreshPromise = new Promise<{ ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }>((resolve) => {
        resolveRefresh = resolve
      })

      mockFetch.mockImplementation(() => refreshPromise)

      render(
        <ToastProvider>
          <MediaModalProvider>
            <MultiSelectProvider>
              <LibraryView
                initialEntries={seededAll}
                initialType="all"
                initialFetchedAt={initialTime}
              />
            </MultiSelectProvider>
          </MediaModalProvider>
        </ToastProvider>
      )

      expect(screen.getByText('Initial Film')).toBeInTheDocument()
      expect(mockFetch).not.toHaveBeenCalled()

      // Advance time past stale threshold
      vi.setSystemTime(initialTime + 35_000)

      // Click manual refresh
      const refreshBtn = screen.getByRole('button', { name: 'Refresh library' })
      fireEvent.click(refreshBtn)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/watch')
      expect(screen.getByRole('button', { name: 'Refreshing library' })).toBeDisabled()

      // Ensure document visibility is visible and fire visibilitychange & focus while refresh is pending
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      fireEvent(document, new Event('visibilitychange'))
      fireEvent(window, new Event('focus'))

      // No duplicate background GET should be fired
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Resolve manual refresh response
      await act(async () => {
        resolveRefresh({
          ok: true,
          json: async () => ({ entries: [entry('2', 'Refreshed Film')] }),
        })
      })

      // Accepted response updates entries
      expect(screen.getByText('Refreshed Film')).toBeInTheDocument()
      expect(screen.queryByText('Initial Film')).not.toBeInTheDocument()

      // Refresh button is no longer spinning or disabled
      expect(screen.getByRole('button', { name: 'Refresh library' })).not.toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Refreshing library' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('guarantees post-mutation read on entry update when a prior background fetch was in flight', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('IntersectionObserver', class {
        observe() {}
        disconnect() {}
      })

      const initialTime = 1700000000000
      vi.setSystemTime(initialTime)

      const seededAll = [entry('1', 'Film Pre-Mutation')]
      let resolveBackground!: (value: { ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }) => void
      const bgPromise = new Promise<{ ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }>((resolve) => {
        resolveBackground = resolve
      })

      let resolveMutationUpdate!: (value: { ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }) => void
      const updatePromise = new Promise<{ ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }>((resolve) => {
        resolveMutationUpdate = resolve
      })

      mockFetch.mockImplementation((url, init) => {
        if (init?.method === 'PATCH') {
          return Promise.resolve({ ok: true, json: async () => ({}) })
        }
        if (mockFetch.mock.calls.filter(([, reqInit]) => !reqInit || reqInit.method !== 'PATCH').length === 1) {
          return bgPromise
        }
        return updatePromise
      })

      render(
        <ToastProvider>
          <MediaModalProvider>
            <MultiSelectProvider>
              <LibraryView
                initialEntries={seededAll}
                initialType="all"
                initialFetchedAt={initialTime}
              />
            </MultiSelectProvider>
          </MediaModalProvider>
        </ToastProvider>
      )

      expect(screen.getByText('Film Pre-Mutation')).toBeInTheDocument()

      // Advance time past stale threshold
      vi.setSystemTime(initialTime + 35_000)

      // Trigger background visibility fetch
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      fireEvent(document, new Event('visibilitychange'))

      // 1 GET call initiated
      expect(mockFetch).toHaveBeenCalledWith('/api/watch')

      // Open edit modal on card and save
      fireEvent.click(screen.getByTitle('Edit entry'))
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
      })

      // The mutation fetch must have been issued (post-mutation current-type read)
      expect(
        mockFetch.mock.calls.filter(([url, init]) => url === '/api/watch' && (!init || init.method !== 'PATCH'))
      ).toHaveLength(2)

      // Resolve the pre-mutation background fetch with old data
      await act(async () => {
        resolveBackground({
          ok: true,
          json: async () => ({ entries: [entry('1', 'Film Pre-Mutation Old Data')] }),
        })
      })

      // Stale pre-mutation response must NOT overwrite the UI
      expect(screen.queryByText('Film Pre-Mutation Old Data')).not.toBeInTheDocument()

      // Resolve the post-mutation fetch
      await act(async () => {
        resolveMutationUpdate({
          ok: true,
          json: async () => ({ entries: [entry('1', 'Film Post-Mutation Updated')] }),
        })
      })

      // Post-mutation response is accepted
      expect(screen.getByText('Film Post-Mutation Updated')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('resets refreshing state and does not strand controls if filter type changes while refresh is in flight', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const seededAll = [entry('1', 'All Seed Film')]
    let resolveAllRefresh!: (value: { ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }) => void
    const allRefreshPromise = new Promise<{ ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }>((resolve) => {
      resolveAllRefresh = resolve
    })

    let resolveMoviesFetch!: (value: { ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }) => void
    const moviesPromise = new Promise<{ ok: boolean; json: () => Promise<{ entries: WatchEntry[] }> }>((resolve) => {
      resolveMoviesFetch = resolve
    })

    mockFetch.mockImplementation((url) => {
      if (url === '/api/watch') return allRefreshPromise
      if (url === '/api/watch?type=movie') return moviesPromise
      return Promise.resolve({ ok: true, json: async () => ({ entries: [] }) })
    })

    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <LibraryView
              initialEntries={seededAll}
              initialType="all"
              initialFetchedAt={Date.now()}
            />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )

    // Trigger manual refresh on 'all'
    fireEvent.click(screen.getByRole('button', { name: 'Refresh library' }))
    expect(screen.getByRole('button', { name: 'Refreshing library' })).toBeDisabled()

    // While refresh is pending, switch type filter to 'Movies'
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Movies' }))
    })

    // Now resolve the older 'all' refresh
    await act(async () => {
      resolveAllRefresh({
        ok: true,
        json: async () => ({ entries: [entry('1', 'Late All Refresh Data')] }),
      })
    })

    // Refresh button must NOT be stuck in spinning/disabled state
    expect(screen.queryByRole('button', { name: 'Refreshing library' })).not.toBeInTheDocument()

    // Late 'all' data must NOT be accepted in Movies view
    expect(screen.queryByText('Late All Refresh Data')).not.toBeInTheDocument()

    // Now resolve the Movies fetch
    await act(async () => {
      resolveMoviesFetch({
        ok: true,
        json: async () => ({ entries: [entry('2', 'Movie Data')] }),
      })
    })

    expect(screen.getByText('Movie Data')).toBeInTheDocument()
  })

  it('preserves seeded entries and displays error toast without stranding controls when manual refresh fails with HTTP 500', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })

    const seededAll = [entry('1', 'Good Seed Film')]
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    })

    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <LibraryView
              initialEntries={seededAll}
              initialType="all"
              initialFetchedAt={Date.now()}
            />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )

    expect(screen.getByText('Good Seed Film')).toBeInTheDocument()
    expect(screen.getByText('1 watched')).toBeInTheDocument()

    const refreshBtn = screen.getByRole('button', { name: 'Refresh library' })
    await act(async () => {
      fireEvent.click(refreshBtn)
    })

    // Seeded entry must remain visible and not be replaced with empty array
    expect(screen.getByText('Good Seed Film')).toBeInTheDocument()
    expect(screen.getByText('1 watched')).toBeInTheDocument()

    // Concise error toast should be shown
    expect(await screen.findByText('Could not refresh library.')).toBeInTheDocument()

    // Refresh control must not be stranded in disabled/spinning state
    expect(screen.getByRole('button', { name: 'Refresh library' })).not.toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Refreshing library' })).not.toBeInTheDocument()
  })

  it('preserves seeded entries quietly without toast and without updating cache when background refresh fails with HTTP 500', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('IntersectionObserver', class {
        observe() {}
        disconnect() {}
      })

      const initialTime = 1700000000000
      vi.setSystemTime(initialTime)

      const seededAll = [entry('1', 'Good Seed Film')]
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      })

      render(
        <ToastProvider>
          <MediaModalProvider>
            <MultiSelectProvider>
              <LibraryView
                initialEntries={seededAll}
                initialType="all"
                initialFetchedAt={initialTime}
              />
            </MultiSelectProvider>
          </MediaModalProvider>
        </ToastProvider>
      )

      expect(screen.getByText('Good Seed Film')).toBeInTheDocument()

      // Advance time past stale threshold
      vi.setSystemTime(initialTime + 35_000)
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })

      await act(async () => {
        fireEvent(document, new Event('visibilitychange'))
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/watch')

      // Seeded entries must stay visible
      expect(screen.getByText('Good Seed Film')).toBeInTheDocument()
      expect(screen.getByText('1 watched')).toBeInTheDocument()

      // Background failure must remain quiet (no toast)
      expect(screen.queryByText('Could not refresh library.')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('preserves existing entries and avoids unhandled rejection when post-mutation refresh fails with HTTP 500', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('IntersectionObserver', class {
        observe() {}
        disconnect() {}
      })

      const initialTime = 1700000000000
      vi.setSystemTime(initialTime)

      const seededAll = [entry('1', 'Pre-Mutation Film')]
      mockFetch.mockImplementation(async (url, init) => {
        if (init?.method === 'PATCH') {
          return { ok: true, json: async () => ({}) }
        }
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal Server Error' }),
        }
      })

      render(
        <ToastProvider>
          <MediaModalProvider>
            <MultiSelectProvider>
              <LibraryView
                initialEntries={seededAll}
                initialType="all"
                initialFetchedAt={initialTime}
              />
            </MultiSelectProvider>
          </MediaModalProvider>
        </ToastProvider>
      )

      expect(screen.getByText('Pre-Mutation Film')).toBeInTheDocument()

      // Open edit modal and save
      fireEvent.click(screen.getByTitle('Edit entry'))
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
      })

      // The mutation fetch fired and failed with 500, but pre-existing row remains in UI
      expect(screen.getByText('Pre-Mutation Film')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
