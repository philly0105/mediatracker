import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DashboardRecentCards from '../DashboardRecentCards'
import { MultiSelectProvider } from '../MultiSelectProvider'
import { ToastProvider } from '../ToastProvider'
import type { WatchEntry, Media } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/components/MediaModalProvider', () => ({
  useMediaModal: () => ({ openMedia: vi.fn(), closeMedia: vi.fn() }),
}))

function makeEntry(id: string, title: string, overrides: Partial<WatchEntry> = {}): WatchEntry {
  const media: Media = {
    id: `m-${id}`,
    tmdb_id: Number(id),
    type: 'movie',
    title,
    overview: 'overview',
    poster_url: null,
    release_year: 2024,
    runtime_mins: 120,
    genres: ['Action'],
    vote_average: 8.0,
    cast_members: [],
    director: null,
    collection_id: null,
    collection_name: null,
  }
  return {
    id: `we-${id}`,
    user_id: 'u1',
    media_id: media.id,
    media,
    rating: 4,
    review: null,
    rewatch: false,
    watched_at: '2026-10-19',
    created_at: '2026-10-19T00:00:00Z',
    ...overrides,
  }
}

function renderPanel(entries: WatchEntry[]) {
  render(
    <ToastProvider>
      <MultiSelectProvider>
        <DashboardRecentCards entries={entries} />
      </MultiSelectProvider>
    </ToastProvider>
  )
}

describe('DashboardRecentCards', () => {
  it('captions each poster with its rating, the date logged and a Rewatch badge', () => {
    renderPanel([
      makeEntry('1', 'Past Lives'),
      makeEntry('2', 'Sinners', { rewatch: true, watched_at: '2026-10-03' }),
    ])

    expect(screen.getByRole('heading', { name: 'Recently watched' })).toBeInTheDocument()
    expect(screen.getByText('Oct 19')).toBeInTheDocument()
    expect(screen.getByText('Oct 3')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Rated 4 out of 5')).toHaveLength(2)
    expect(screen.getAllByText('Rewatch')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library')
  })

  it('shows the empty state in the panel when nothing has been logged', () => {
    renderPanel([])

    expect(screen.getByText('Nothing watched yet.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Scroll right')).not.toBeInTheDocument()
  })
})

// jsdom does no layout: scrollWidth, clientWidth and scrollBy are all inert, and
// ResizeObserver does not exist. Give the scroller real numbers so the arrow
// enable/disable logic has something to read.
describe('DashboardRecentCards scroll affordances (F-44)', () => {
  let resizeCallbacks: Array<() => void>
  const metrics = { scrollLeft: 0, clientWidth: 600, scrollWidth: 1600 }

  beforeEach(() => {
    resizeCallbacks = []

    class FakeResizeObserver {
      constructor(private cb: () => void) {}
      observe() { resizeCallbacks.push(this.cb); this.cb() }
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    for (const key of ['clientWidth', 'scrollWidth'] as const) {
      vi.spyOn(HTMLElement.prototype, key, 'get').mockImplementation(function (this: HTMLElement) {
        return this.className.includes('overflow-x-auto') ? metrics[key] : 0
      })
    }
    vi.spyOn(HTMLElement.prototype, 'scrollLeft', 'get').mockImplementation(function (this: HTMLElement) {
      return this.className.includes('overflow-x-auto') ? metrics.scrollLeft : 0
    })
    // scrollBy is not implemented in jsdom; move the fake offset and re-run the
    // observer callbacks the way a real scroll event would.
    HTMLElement.prototype.scrollBy = function (...args: [ScrollToOptions?] | [number, number]) {
      const left = typeof args[0] === 'number' ? args[0] : args[0]?.left ?? 0
      metrics.scrollLeft = Math.max(
        0,
        Math.min(metrics.scrollWidth - metrics.clientWidth, metrics.scrollLeft + left)
      )
      for (const cb of resizeCallbacks) cb()
    }
  })

  afterEach(() => {
    // stubGlobal is not undone by restoreAllMocks, and a leaked ResizeObserver
    // is exactly the kind of cross-file bleed F-45 documents.
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    metrics.scrollLeft = 0
  })

  it('starts pinned left: only the right arrow is live', () => {
    renderPanel([makeEntry('1', 'Past Lives')])

    expect(screen.getByLabelText('Scroll left')).toBeDisabled()
    expect(screen.getByLabelText('Scroll right')).toBeEnabled()
  })

  it('enables the left arrow once scrolled, and disables the right at the end', () => {
    renderPanel([makeEntry('1', 'Past Lives')])

    act(() => { fireEvent.click(screen.getByLabelText('Scroll right')) })
    expect(screen.getByLabelText('Scroll left')).toBeEnabled()

    // Far enough to hit the end whatever the step size works out to.
    act(() => {
      for (let i = 0; i < 5; i++) fireEvent.click(screen.getByLabelText('Scroll right'))
    })
    expect(screen.getByLabelText('Scroll right')).toBeDisabled()
    expect(screen.getByLabelText('Scroll left')).toBeEnabled()
  })

  it('offers no arrows when everything already fits', () => {
    metrics.scrollWidth = metrics.clientWidth
    renderPanel([makeEntry('1', 'Past Lives')])

    expect(screen.getByLabelText('Scroll left')).toBeDisabled()
    expect(screen.getByLabelText('Scroll right')).toBeDisabled()
    metrics.scrollWidth = 1600
  })
})
