import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import KeyboardShortcuts from '../KeyboardShortcuts'
import { SEARCH_OVERLAY_EVENT } from '@/lib/searchOverlayBus'
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

  it('opens the search overlay on Cmd/Ctrl+K', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens the search overlay on /', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: '/' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
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

  it('closes the overlay on Escape', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
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

  it('opens the search overlay via the window event and does not double-open', () => {
    render(<KeyboardShortcuts />)
    act(() => { window.dispatchEvent(new Event(SEARCH_OVERLAY_EVENT)) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event(SEARCH_OVERLAY_EVENT)) })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('opens the overlay and strips the ?search=1 param', () => {
    mockSearch = 'search=1'
    render(<KeyboardShortcuts />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(replace).toHaveBeenCalledWith('/', { scroll: false })
  })

  it('does not open the overlay when the param is absent', () => {
    render(<KeyboardShortcuts />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows the Go to quick-nav heading and a Dashboard row when opened', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(screen.getByText('Go to')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('navigates to /library on ArrowDown then Enter', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = screen.getByPlaceholderText('Search movies and TV shows…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/library')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates to /watchlist when the Watchlist row is clicked', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    fireEvent.click(screen.getByText('Watchlist'))
    expect(push).toHaveBeenCalledWith('/watchlist')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a Pages group with a Stats row when typing sta and no "No matches" text', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = screen.getByPlaceholderText('Search movies and TV shows…')
    fireEvent.change(input, { target: { value: 'sta' } })
    await act(async () => { vi.advanceTimersByTime(350) })
    expect(screen.getByText('Pages')).toBeInTheDocument()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.queryByText(/No matches/)).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('navigates to /stats on Enter when sta is typed', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const input = screen.getByPlaceholderText('Search movies and TV shows…')
    fireEvent.change(input, { target: { value: 'sta' } })
    await act(async () => { vi.advanceTimersByTime(350) })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/stats')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
