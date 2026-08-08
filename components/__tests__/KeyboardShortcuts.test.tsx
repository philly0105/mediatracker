import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import KeyboardShortcuts from '../KeyboardShortcuts'
import { SEARCH_OVERLAY_EVENT } from '@/lib/searchOverlayBus'
import { useModal } from '@/lib/useModal'

// SearchOverlay refreshes the route after logging an item; shortcut wiring just
// needs the call to exist, not to do anything.
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
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
})
