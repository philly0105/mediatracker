import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import KeyboardShortcuts from '../KeyboardShortcuts'
import { ToastProvider } from '../ToastProvider'
import { MediaModalProvider } from '../MediaModalProvider'
import { SEARCH_OVERLAY_EVENT } from '@/lib/searchOverlayBus'
import { QUICK_NAV, G_CHORD_MS } from '@/lib/quickNav'
import { useModal } from '@/lib/useModal'

// SearchOverlay refreshes the route after logging an item; shortcut wiring just
// needs the call to exist, not to do anything. The ?search=1 param path reads
// search params and rewrites the URL, so the mock provides those too.
let mockSearch = ''
const refresh = vi.fn()
const replace = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace, push }),
  useSearchParams: () => new URLSearchParams(mockSearch),
  usePathname: () => '/',
}))

// The overlay pulls the user's watched/watchlist ids from Supabase purely to
// badge rows; irrelevant to the shortcut wiring, so mock it out here.
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

// The overlay logs straight from a result row now, so it reports outcomes
// through the toast context the way every other action surface does.
function renderShortcuts() {
  return render(
    <ToastProvider>
      <MediaModalProvider>
        <KeyboardShortcuts />
      </MediaModalProvider>
    </ToastProvider>
  )
}

function TestModal({ onClose }: { onClose: () => void }) {
  const { containerRef } = useModal(onClose)
  return (
    <div ref={containerRef} role="dialog">
      <button>modal button</button>
    </div>
  )
}

describe('KeyboardShortcuts', () => {
  beforeEach(() => {
    mockSearch = ''
    replace.mockReset()
    refresh.mockReset()
    push.mockReset()
    // The overlay's scroll-into-view effect now runs on mount because the quick-nav
    // rows carry data-index; jsdom doesn't implement scrollIntoView, so stub it.
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('opens the search overlay on Cmd/Ctrl+K', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('opens the search overlay on /', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: '/' })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('does not open on / while typing in an input', () => {
    render(
      <>
        <KeyboardShortcuts />
        <input data-testid="box" />
      </>
    )
    const box = screen.getByTestId('box')
    box.focus()
    fireEvent.keyDown(box, { key: '/' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not open on / while typing in a textarea', () => {
    render(
      <>
        <KeyboardShortcuts />
        <textarea data-testid="area" />
      </>
    )
    const area = screen.getByTestId('area')
    area.focus()
    fireEvent.keyDown(area, { key: '/' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the overlay on Escape', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not open while another modal is open', () => {
    render(
      <>
        <KeyboardShortcuts />
        <TestModal onClose={vi.fn()} />
      </>
    )
    fireEvent.keyDown(document, { key: '/' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('opens the search overlay via the window event and does not double-open', async () => {
    renderShortcuts()
    act(() => { window.dispatchEvent(new Event(SEARCH_OVERLAY_EVENT)) })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event(SEARCH_OVERLAY_EVENT)) })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('opens the overlay and strips the ?search=1 param', async () => {
    mockSearch = 'search=1'
    renderShortcuts()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(replace).toHaveBeenCalledWith('/', { scroll: false })
  })

  it('does not open the overlay when the param is absent', () => {
    renderShortcuts()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows the Go to quick-nav heading and a Dashboard row when opened', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(await screen.findByText('Go to')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('navigates to /library on ArrowDown then Enter', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = await screen.findByPlaceholderText('Search movies and TV shows…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/library')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates to /watchlist when the Watchlist row is clicked', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    fireEvent.click(await screen.findByText('Watchlist'))
    expect(push).toHaveBeenCalledWith('/watchlist')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a Pages group with a Stats row when typing sta and no "No matches" text', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = await screen.findByPlaceholderText('Search movies and TV shows…')
    vi.useFakeTimers()
    try {
      fireEvent.change(input, { target: { value: 'sta' } })
      await act(async () => { vi.advanceTimersByTime(350) })
      expect(screen.getByText('Pages')).toBeInTheDocument()
      expect(screen.getByText('Stats')).toBeInTheDocument()
      expect(screen.queryByText(/No matches/)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('navigates to /stats on Enter when sta is typed', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = await screen.findByPlaceholderText('Search movies and TV shows…')
    vi.useFakeTimers()
    try {
      fireEvent.change(input, { target: { value: 'sta' } })
      await act(async () => { vi.advanceTimersByTime(350) })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(push).toHaveBeenCalledWith('/stats')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('marks active title as watched on Cmd+Enter / Ctrl+Enter', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/tmdb/search')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                tmdb_id: 550,
                type: 'movie',
                title: 'Fight Club',
                overview: 'A ticking-time-bomb insomniac...',
                poster_url: '/fightclub.jpg',
                release_year: 1999,
              },
            ],
          }),
        }
      }
      if (url.includes('/api/watch')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        }
      }
      return { ok: true, json: async () => ({}) }
    })
    global.fetch = mockFetch

    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = await screen.findByPlaceholderText('Search movies and TV shows…')
    vi.useFakeTimers()
    try {
      fireEvent.change(input, { target: { value: 'Fight' } })
      await act(async () => { vi.advanceTimersByTime(350) })

      expect(screen.getByText('Fight Club')).toBeInTheDocument()

      // Press Cmd+Enter (metaKey) on the search input
      fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
      await act(async () => { vi.advanceTimersByTime(50) })

      const watchPost = mockFetch.mock.calls.find(([u, opts]) => u.includes('/api/watch') && opts?.method === 'POST')
      expect(watchPost).toBeDefined()
      expect(JSON.parse(watchPost![1].body)).toMatchObject({ tmdb_id: 550, type: 'movie' })
      expect(screen.getByText('Logged Fight Club.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('adds active title to watchlist on Shift+Enter', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/tmdb/search')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                tmdb_id: 680,
                type: 'movie',
                title: 'Pulp Fiction',
                overview: 'The lives of two mob hitmen...',
                poster_url: '/pulp.jpg',
                release_year: 1994,
              },
            ],
          }),
        }
      }
      if (url.includes('/api/watchlist')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        }
      }
      return { ok: true, json: async () => ({}) }
    })
    global.fetch = mockFetch

    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = await screen.findByPlaceholderText('Search movies and TV shows…')
    vi.useFakeTimers()
    try {
      fireEvent.change(input, { target: { value: 'Pulp' } })
      await act(async () => { vi.advanceTimersByTime(350) })

      expect(screen.getByText('Pulp Fiction')).toBeInTheDocument()

      // Press Shift+Enter on the search input
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
      await act(async () => { vi.advanceTimersByTime(50) })

      const watchlistPost = mockFetch.mock.calls.find(([u, opts]) => u.includes('/api/watchlist') && opts?.method === 'POST')
      expect(watchlistPost).toBeDefined()
      expect(JSON.parse(watchlistPost![1].body)).toEqual({ tmdb_id: 680, type: 'movie', priority: 'want_to_watch' })
      expect(screen.getByText('Added Pulp Fiction to your watchlist.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders chips on result row and clicking mark watched chip triggers watch API', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/tmdb/search')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                tmdb_id: 1399,
                type: 'show',
                title: 'Game of Thrones',
                overview: 'Seven noble families...',
                poster_url: '/got.jpg',
                release_year: 2011,
              },
            ],
          }),
        }
      }
      if (url.includes('/api/watch')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        }
      }
      return { ok: true, json: async () => ({}) }
    })
    global.fetch = mockFetch

    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = await screen.findByPlaceholderText('Search movies and TV shows…')
    vi.useFakeTimers()
    try {
      fireEvent.change(input, { target: { value: 'Thrones' } })
      await act(async () => { vi.advanceTimersByTime(350) })

      const markButton = screen.getByTitle('Mark as watched')
      expect(markButton).toBeInTheDocument()

      fireEvent.click(markButton)
      await act(async () => { vi.advanceTimersByTime(50) })

      const watchPost = mockFetch.mock.calls.find(([u, opts]) => u.includes('/api/watch') && opts?.method === 'POST')
      expect(watchPost).toBeDefined()
      expect(JSON.parse(watchPost![1].body)).toMatchObject({ tmdb_id: 1399, type: 'show' })
      expect(screen.getByText('Logged Game of Thrones.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders combobox and listbox accessibility roles', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

    const input = await screen.findByRole('combobox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).toHaveAttribute('aria-controls', 'search-overlay-results')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })
})

describe('KeyboardShortcuts g-navigation and help sheet (F-44)', () => {
  beforeEach(() => {
    mockSearch = ''
    replace.mockReset()
    refresh.mockReset()
    push.mockReset()
    HTMLElement.prototype.scrollIntoView = vi.fn()
    // localStorage is absent in this jsdom setup, which is exactly the case
    // lib/recentSearches guards for.
    try { window.localStorage?.clear() } catch { /* not available */ }
  })

  it('jumps to a destination on g then its key', () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'g' })
    fireEvent.keyDown(document, { key: 'l' })
    expect(push).toHaveBeenCalledWith('/library')
  })

  it('ignores the second key when g was never pressed', () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: 'l' })
    expect(push).not.toHaveBeenCalled()
  })

  // A g typed and abandoned must not arm the next keystroke indefinitely.
  it('expires the g chord', () => {
    vi.useFakeTimers()
    try {
      renderShortcuts()
      fireEvent.keyDown(document, { key: 'g' })
      vi.advanceTimersByTime(G_CHORD_MS + 100)
      fireEvent.keyDown(document, { key: 'l' })
      expect(push).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not navigate from g while typing in a field', () => {
    renderShortcuts()
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'g' })
    fireEvent.keyDown(input, { key: 'l' })
    expect(push).not.toHaveBeenCalled()
    input.remove()
  })

  it('opens the help sheet on ?', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: '?' })
    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  })

  // The sheet registers as a modal, so the ? branch is gated out once it is up.
  it('does not stack a second help sheet', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: '?' })
    await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    fireEvent.keyDown(document, { key: '?' })
    expect(screen.getAllByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveLength(1)
  })

  it('does not jump on g while the help sheet is up', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: '?' })
    await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    fireEvent.keyDown(document, { key: 'g' })
    fireEvent.keyDown(document, { key: 'l' })
    expect(push).not.toHaveBeenCalled()
  })

  // ? is Shift+/ on most layouts; the bare-slash branch must not claim it.
  it('does not open the search palette on ?', () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: '?' })
    expect(screen.queryByPlaceholderText(/Search movies/)).not.toBeInTheDocument()
  })

  it('lists every quick-nav destination with its chord', async () => {
    renderShortcuts()
    fireEvent.keyDown(document, { key: '?' })
    const sheet = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    for (const item of QUICK_NAV) {
      expect(within(sheet).getByText(item.name)).toBeInTheDocument()
    }
  })
})
