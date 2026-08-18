import { Suspense } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ShowDetailPage from '@/app/show/[id]/page'
import { ToastProvider } from '@/components/ToastProvider'

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

const mockFetch = vi.fn()
function deleteCalls() {
  return mockFetch.mock.calls.filter(([, init]) => init?.method === 'DELETE')
}

// The page reads route params with use(), which suspends until the promise
// resolves, so it needs a boundary of its own here.
async function renderPage() {
  // The initial render suspends, so it has to happen inside an awaited act.
  await act(async () => {
    render(
      <ToastProvider>
        <Suspense fallback={null}>
          <ShowDetailPage params={Promise.resolve({ id: 'm1' })} />
        </Suspense>
      </ToastProvider>
    )
  })
}

describe('episode tracker cascade undo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url)
      if (urlStr.includes('/api/shows/')) {
        return {
          ok: true,
          json: async () => ({
            media: { id: 'm1', tmdb_id: 1396, type: 'show', title: 'Breaking Bad', overview: null, poster_url: null, genres: [], release_year: 2008, runtime_mins: 47, director: null, cast_members: [], collection_id: null, collection_name: null },
            seasons: [{ id: SEASON_ID, media_id: 'm1', season_number: 1, episode_count: 5 }],
            entry: null,
            progress: progressRows,
          }),
        }
      }
      if (urlStr.includes('/api/episodes/meta')) {
        return {
          ok: true,
          json: async () => ({ episodes: [] }),
        }
      }
      return { ok: true, json: async () => ({ ok: true }) }
    })
    global.fetch = mockFetch
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  // Suspense resolution, the params promise and the Supabase loads each need a
  // turn of the microtask queue before the tracker is on screen.
  async function settle() {
    for (let i = 0; i < 5; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    }
  }

  it('un-checking E1 clears the season locally but sends nothing yet', async () => {
    await renderPage()
    await settle()

    await act(async () => { fireEvent.click(screen.getByText('E1')) })

    // All five are unmarked in the UI, but nothing has been written — that is
    // what makes this recoverable.
    expect(screen.getByText('0/5')).toBeInTheDocument()
    expect(deleteCalls()).toHaveLength(0)
    expect(screen.getByText('Unmarked 5 episodes.')).toBeInTheDocument()
  })

  it('undo restores the whole season and never sends the delete', async () => {
    await renderPage()
    await settle()

    await act(async () => { fireEvent.click(screen.getByText('E1')) })
    expect(screen.getByText('0/5')).toBeInTheDocument()

    await act(async () => { fireEvent.click(screen.getByText('Undo')) })
    expect(screen.getByText('5/5')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(deleteCalls()).toHaveLength(0)
  })

  it('commits the delete once the undo window closes', async () => {
    await renderPage()
    await settle()

    await act(async () => { fireEvent.click(screen.getByText('E1')) })
    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })

    expect(deleteCalls()).toHaveLength(1)
    const body = JSON.parse(String(deleteCalls()[0][1]?.body))
    expect(body.season_id).toBe(SEASON_ID)
    expect(body.episodes).toEqual([1, 2, 3, 4, 5])
  })

  it('puts the season back when the deferred delete fails', async () => {
    await renderPage()
    await settle()

    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await act(async () => { fireEvent.click(screen.getByText('E1')) })
    expect(screen.getByText('0/5')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })

    expect(screen.getByText('5/5')).toBeInTheDocument()
    expect(screen.getByText('Could not update episode progress.')).toBeInTheDocument()
  })
})
