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
})
