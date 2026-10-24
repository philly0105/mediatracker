import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DashboardUpcomingWidget from '../DashboardUpcomingWidget'
import { ToastProvider } from '../ToastProvider'
import type { UpcomingRelease } from '@/lib/tmdb'

const refresh = vi.fn()
const openMedia = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/components/MediaModalProvider', () => ({
  useMediaModal: () => ({ openMedia, closeMedia: vi.fn() }),
}))

const fetchMock = vi.fn()
function callsFor(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
}

function release(tmdb_id: number, title: string, full_release_date: string, type: 'movie' | 'show' = 'movie'): UpcomingRelease {
  return {
    tmdb_id, type, title, full_release_date,
    overview: '', poster_url: null, release_year: 2026, genres: [], priority: 'upcoming',
  }
}

function renderWidget(releases: UpcomingRelease[], watchlistKeys: string[] = []) {
  render(
    <ToastProvider>
      <DashboardUpcomingWidget releases={releases} watchlistKeys={watchlistKeys} />
    </ToastProvider>
  )
}

describe('DashboardUpcomingWidget', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock
    refresh.mockReset()
    openMedia.mockReset()
  })

  it('marks titles already on the watchlist and counts them in the sub line', () => {
    renderWidget(
      [release(1, 'Wicked: For Good', '2026-11-21'), release(2, 'Avatar: Fire and Ash', '2026-12-19')],
      ['movie:2'],
    )

    expect(screen.getByRole('button', { name: 'Add Wicked: For Good to watchlist' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'On your watchlist: Avatar: Fire and Ash' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1 on your watchlist')).toBeInTheDocument()
  })

  it('adds a title as Must watch from the bookmark and refreshes', async () => {
    renderWidget([release(1, 'Wicked: For Good', '2026-11-21')])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Wicked: For Good to watchlist' }))
    })

    expect(callsFor('POST')).toHaveLength(1)
    expect(callsFor('POST')[0][0]).toBe('/api/watchlist')
    expect(JSON.parse(String(callsFor('POST')[0][1]?.body))).toEqual({ tmdb_id: 1, type: 'movie', priority: 'must_watch' })
    expect(screen.getByRole('button', { name: 'On your watchlist: Wicked: For Good' })).toHaveAttribute('aria-pressed', 'true')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('removes a saved title from the bookmark, and reverts when the write fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'nope' }), text: async () => 'nope' })
    renderWidget([release(2, 'Avatar: Fire and Ash', '2026-12-19')], ['movie:2'])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'On your watchlist: Avatar: Fire and Ash' }))
    })

    expect(callsFor('DELETE')).toHaveLength(1)
    // Back to saved: the optimistic removal was undone.
    expect(screen.getByRole('button', { name: 'On your watchlist: Avatar: Fire and Ash' })).toHaveAttribute('aria-pressed', 'true')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('opens the media modal from the row, as before', () => {
    renderWidget([release(1, 'Wicked: For Good', '2026-11-21')])

    fireEvent.click(screen.getByText('Wicked: For Good'))
    expect(openMedia).toHaveBeenCalledTimes(1)
    expect(openMedia.mock.calls[0][0]).toMatchObject({ tmdb_id: 1, type: 'movie', title: 'Wicked: For Good' })
  })

  it('shares one date stack between titles released the same day', () => {
    const { container } = renderWidgetWithContainer([
      release(1, 'Zootopia 2', '2026-11-26'),
      release(2, 'Wake Up Dead Man', '2026-11-26'),
      release(3, 'Avatar: Fire and Ash', '2026-12-19'),
    ])

    expect(container.querySelectorAll('time')).toHaveLength(2)
  })

  it('says so quietly when there is nothing coming', () => {
    renderWidget([])
    expect(screen.getByText('Nothing on the calendar')).toBeInTheDocument()
  })

  describe('countdowns', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 9, 22, 21, 30))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('counts from the reader\'s clock, not the server key it hydrated with', () => {
      // The server was already past midnight UTC when it rendered.
      render(
        <ToastProvider>
          <DashboardUpcomingWidget
            releases={[release(1, 'The Mongoose', '2026-10-30'), release(2, 'Tomorrow Film', '2026-10-23')]}
            today="2026-10-23T02"
          />
        </ToastProvider>
      )

      expect(screen.getByText('Fri · in 8 days')).toBeInTheDocument()
      expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    })
  })
})

function renderWidgetWithContainer(releases: UpcomingRelease[]) {
  return render(
    <ToastProvider>
      <DashboardUpcomingWidget releases={releases} />
    </ToastProvider>
  )
}
