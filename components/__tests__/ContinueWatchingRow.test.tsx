import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ContinueWatchingRow, { type ContinueWatchingShow } from '../ContinueWatchingRow'
import { ToastProvider } from '../ToastProvider'

// The hero's rate/add buttons open the media modal and the Up next rows
// navigate to the show page; neither needs the real provider or router here.
const openMedia = vi.fn()
const push = vi.fn()
vi.mock('@/components/MediaModalProvider', () => ({
  useMediaModal: () => ({ openMedia, closeMedia: vi.fn() }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), back: vi.fn() }),
}))

const fetchMock = vi.fn()
function callsFor(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
}

// One season of three episodes. `watched` is the watchedEpisodeKeys snapshot,
// and `nextEpisode` is the episode the rail reports as next up.
function makeShow(watched: string[], nextEpisode: number, overrides: Partial<ContinueWatchingShow> = {}): ContinueWatchingShow {
  return {
    media: { id: 'm1', title: 'Breaking Bad', poster_url: null },
    seasons: [{ id: 's1', season_number: 1, episode_count: 3 }],
    watchedEpisodeKeys: watched,
    nextUp: { season_id: 's1', season_number: 1, episode_number: nextEpisode },
    ...overrides,
  }
}

function renderRail(shows: ContinueWatchingShow[], extra: { emptyHero?: React.ReactNode; comingSoon?: React.ReactNode } = {}) {
  render(
    <ToastProvider>
      <ContinueWatchingRow shows={shows} {...extra} />
    </ToastProvider>
  )
}

describe('ContinueWatchingRow', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock
    openMedia.mockReset()
    push.mockReset()
  })

  it('renders the first show as the hero with its next-up episode', () => {
    renderRail([makeShow(['s1-1'], 2)])

    expect(screen.getByRole('heading', { name: 'Breaking Bad' })).toBeInTheDocument()
    expect(screen.getByText('Next · S1 · E2')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 episodes watched')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Episodes' })).toHaveAttribute('href', '/show/m1')
  })

  it('marks the episode watched and offers an undo', async () => {
    renderRail([makeShow(['s1-1'], 2)])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark E2 watched' }))
    })

    expect(callsFor('POST')).toHaveLength(1)
    expect(JSON.parse(String(callsFor('POST')[0][1]?.body))).toEqual({ season_id: 's1', episode_number: 2 })

    expect(await screen.findByText('Next · S1 · E3')).toBeInTheDocument()
    expect(screen.getByText('Marked Breaking Bad S1 E2 as watched.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('undoes the advance and restores the previous episode', async () => {
    renderRail([makeShow(['s1-1'], 2)])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark E2 watched' }))
    })
    expect(await screen.findByText('Next · S1 · E3')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    })

    expect(await screen.findByText('Next · S1 · E2')).toBeInTheDocument()
    expect(callsFor('DELETE')).toHaveLength(1)
    expect(JSON.parse(String(callsFor('DELETE')[0][1]?.body))).toEqual({ season_id: 's1', episode_number: 2 })
  })

  it('re-inserts a finished show that the advance removed', async () => {
    renderRail([makeShow(['s1-1', 's1-2'], 3)])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark E3 watched' }))
    })

    // Marking the final episode removes the show from the page entirely.
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(screen.queryByText('Next · S1 · E3')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    })

    expect(await screen.findByText('Next · S1 · E3')).toBeInTheDocument()
  })

  it('shows the hours left when the episode runtime is known, and not otherwise', () => {
    const { unmount } = render(
      <ToastProvider>
        <ContinueWatchingRow shows={[makeShow(['s1-1'], 2, {
          nextEpisode: { name: 'Cat’s in the Bag...', runtime_mins: 45, air_date: '2008-01-27', still_url: null, overview: null },
        })]} />
      </ToastProvider>
    )
    expect(screen.getByText('2 left this season · 1h 30m to go')).toBeInTheDocument()
    expect(screen.getByText('Cat’s in the Bag...')).toBeInTheDocument()
    expect(screen.getByText('45m · Aired Jan 27, 2008')).toBeInTheDocument()
    unmount()

    renderRail([makeShow(['s1-1'], 2)])
    expect(screen.getByText('2 left this season')).toBeInTheDocument()
    expect(screen.getByText('Episode 2')).toBeInTheDocument()
  })

  it('opens the media modal from the rate and add-to-list buttons only when the TMDB id is known', () => {
    const { unmount } = render(
      <ToastProvider>
        <ContinueWatchingRow shows={[makeShow(['s1-1'], 2)]} />
      </ToastProvider>
    )
    expect(screen.queryByRole('button', { name: 'Rate Breaking Bad' })).not.toBeInTheDocument()
    unmount()

    renderRail([makeShow(['s1-1'], 2, { media: { id: 'm1', title: 'Breaking Bad', poster_url: null, tmdb_id: 1396 } })])
    fireEvent.click(screen.getByRole('button', { name: 'Rate Breaking Bad' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Breaking Bad to a list' }))
    expect(openMedia).toHaveBeenCalledTimes(2)
    expect(openMedia.mock.calls[0][0]).toMatchObject({ tmdb_id: 1396, type: 'show', title: 'Breaking Bad' })
  })

  it('lists the remaining shows under Up next, each with its own check', async () => {
    const second: ContinueWatchingShow = {
      media: { id: 'm2', title: 'Better Call Saul', poster_url: null },
      seasons: [{ id: 's2', season_number: 1, episode_count: 4 }],
      watchedEpisodeKeys: ['s2-1'],
      nextUp: { season_id: 's2', season_number: 1, episode_number: 2 },
      nextEpisode: { name: 'Mijo', runtime_mins: 47, air_date: '2015-02-09', still_url: null, overview: null },
    }
    renderRail([makeShow(['s1-1'], 2), second])

    expect(screen.getByRole('heading', { name: 'Up next' })).toBeInTheDocument()
    expect(screen.getByText('1 more show in progress')).toBeInTheDocument()
    expect(screen.getByText('“Mijo”')).toBeInTheDocument()
    expect(screen.getByText('S1 · E2 · 47m')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark Better Call Saul season 1 episode 2 watched' }))
    })

    expect(JSON.parse(String(callsFor('POST')[0][1]?.body))).toEqual({ season_id: 's2', episode_number: 2 })
    expect(await screen.findByText('S1 · E3')).toBeInTheDocument()
    // The hero was untouched.
    expect(screen.getByText('Next · S1 · E2')).toBeInTheDocument()
  })

  it('renders the empty hero and the coming-soon panel when nothing is in progress', () => {
    renderRail([], { emptyHero: <div>Pick something to watch</div>, comingSoon: <div>Coming soon panel</div> })

    expect(screen.getByText('Pick something to watch')).toBeInTheDocument()
    expect(screen.getByText('Coming soon panel')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Up next' })).not.toBeInTheDocument()
  })
})
