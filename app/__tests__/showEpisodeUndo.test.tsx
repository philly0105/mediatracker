import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ShowDetailClient from '@/components/ShowDetailClient'
import { ToastProvider } from '@/components/ToastProvider'
import { MediaModalProvider } from '@/components/MediaModalProvider'
import type { ShowDetails } from '@/lib/showDetails'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown
}
function strip({ ...p }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete p.initial; delete p.animate; delete p.exit; delete p.transition
  return p
}
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: { div: (props: MotionDivProps) => <div {...strip(props)} /> },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

const SEASON_ID = 'season-1'

// One season of 5 episodes, all watched — the setup where the cascade is
// most destructive: clicking E1 unmarks all five.
const progressRows = [1, 2, 3, 4, 5].map((n) => ({
  id: `p${n}`,
  user_id: 'u1',
  season_id: SEASON_ID,
  episode_number: n,
  watched_at: '2026-01-01',
}))

const initialDetails: ShowDetails = {
  media: {
    id: 'm1',
    tmdb_id: 1396,
    type: 'show',
    title: 'Breaking Bad',
    overview: null,
    poster_url: null,
    genres: [],
    release_year: 2008,
    runtime_mins: 47,
    director: null,
    cast_members: [],
    collection_id: null,
    collection_name: null,
  },
  seasons: [{ id: SEASON_ID, media_id: 'm1', season_number: 1, episode_count: 5 }],
  entry: null,
  progress: progressRows,
}

const mockFetch = vi.fn()
function deleteCalls() {
  return mockFetch.mock.calls.filter(([, init]) => init?.method === 'DELETE')
}

function renderShowDetailClient(details: ShowDetails = initialDetails) {
  return render(
    <ToastProvider>
      <MediaModalProvider>
        <ShowDetailClient mediaId="m1" initialDetails={details} />
      </MediaModalProvider>
    </ToastProvider>
  )
}

describe('episode tracker cascade undo and client interactions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url)
      if (urlStr.includes('/api/episodes/meta')) {
        return {
          ok: true,
          json: async () => ({ episodes: [] }),
        }
      }
      if (urlStr.includes('/api/shows/') && urlStr.includes('only=entry')) {
        return {
          ok: true,
          json: async () => ({ entry: null }),
        }
      }
      return { ok: true, json: async () => ({ ok: true }) }
    })
    global.fetch = mockFetch
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('does not issue an initial show-details fetch on mount but requests episode metadata', async () => {
    renderShowDetailClient()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    const fetchUrls = mockFetch.mock.calls.map(([url]) => String(url))
    const showDetailsCalls = fetchUrls.filter(
      (u) => u.includes('/api/shows') && !u.includes('only=entry')
    )
    expect(showDetailsCalls).toHaveLength(0)

    const metaCalls = fetchUrls.filter((u) => u.includes('/api/episodes/meta?media_id=m1'))
    expect(metaCalls).toHaveLength(1)
  })

  it('un-checking E1 clears the season locally but sends nothing yet', async () => {
    renderShowDetailClient()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    await act(async () => { fireEvent.click(screen.getByText('E1')) })

    // All five are unmarked in the UI, but nothing has been written — that is
    // what makes this recoverable.
    expect(screen.getByText('0/5')).toBeInTheDocument()
    expect(deleteCalls()).toHaveLength(0)
    expect(screen.getByText('Unmarked 5 episodes.')).toBeInTheDocument()
  })

  it('undo restores the whole season and never sends the delete', async () => {
    renderShowDetailClient()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    await act(async () => { fireEvent.click(screen.getByText('E1')) })
    expect(screen.getByText('0/5')).toBeInTheDocument()

    await act(async () => { fireEvent.click(screen.getByText('Undo')) })
    expect(screen.getByText('5/5')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(deleteCalls()).toHaveLength(0)
  })

  it('commits the delete once the undo window closes', async () => {
    renderShowDetailClient()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    await act(async () => { fireEvent.click(screen.getByText('E1')) })
    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })

    expect(deleteCalls()).toHaveLength(1)
    const body = JSON.parse(String(deleteCalls()[0][1]?.body))
    expect(body.season_id).toBe(SEASON_ID)
    expect(body.episodes).toEqual([1, 2, 3, 4, 5])
  })

  it('puts the season back when the deferred delete fails', async () => {
    renderShowDetailClient()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await act(async () => { fireEvent.click(screen.getByText('E1')) })
    expect(screen.getByText('0/5')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })

    expect(screen.getByText('5/5')).toBeInTheDocument()
    expect(screen.getByText('Could not update episode progress.')).toBeInTheDocument()
  })

  it('marks show as watched and refreshes entry with only=entry', async () => {
    renderShowDetailClient()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    const markButton = screen.getByText('Mark show as watched')
    await act(async () => { fireEvent.click(markButton) })

    const postWatchCalls = mockFetch.mock.calls.filter(
      ([url, init]) => String(url).includes('/api/watch') && init?.method === 'POST'
    )
    expect(postWatchCalls).toHaveLength(1)
    const postBody = JSON.parse(String(postWatchCalls[0][1]?.body))
    expect(postBody).toEqual({ tmdb_id: 1396, type: 'show' })

    const refreshCalls = mockFetch.mock.calls.filter(
      ([url]) => String(url).includes('/api/shows/m1?only=entry')
    )
    expect(refreshCalls).toHaveLength(1)
  })

  it('updates rating via PATCH /api/watch when entry is present', async () => {
    const detailsWithEntry: ShowDetails = {
      ...initialDetails,
      entry: {
        id: 'entry-1',
        user_id: 'u1',
        media_id: 'm1',
        rating: 4,
        review: null,
        watched_at: '2026-08-20',
        rewatch: false,
        created_at: '2026-08-20T00:00:00Z',
      },
    }

    renderShowDetailClient(detailsWithEntry)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    const star5 = screen.getByLabelText('Rate 5 stars')
    await act(async () => { fireEvent.click(star5) })

    const patchCalls = mockFetch.mock.calls.filter(
      ([url, init]) => String(url).includes('/api/watch') && init?.method === 'PATCH'
    )
    expect(patchCalls).toHaveLength(1)
    const patchBody = JSON.parse(String(patchCalls[0][1]?.body))
    expect(patchBody).toEqual({ id: 'entry-1', rating: 5 })
  })
})
