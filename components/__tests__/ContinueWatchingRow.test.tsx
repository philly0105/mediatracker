import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ContinueWatchingRow, { type ContinueWatchingShow } from '../ContinueWatchingRow'
import { ToastProvider } from '../ToastProvider'

// Framer-motion's AnimatePresence keeps exiting toasts mounted while the exit
// animation runs, which never completes in jsdom. Stub it out, and strip the
// animation-only props so React does not warn about unknown DOM attributes.
type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown
}
function strip({ ...props }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete props.initial; delete props.animate; delete props.exit; delete props.transition
  return props
}
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: { div: (props: MotionDivProps) => <div {...strip(props)} /> },
}))

const fetchMock = vi.fn()
function callsFor(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
}

// One season of three episodes. `watched` is the watchedEpisodeKeys snapshot,
// and `nextEpisode` is the episode the rail reports as next up.
function makeShow(watched: string[], nextEpisode: number): ContinueWatchingShow {
  return {
    media: { id: 'm1', title: 'Breaking Bad', poster_url: null },
    seasons: [{ id: 's1', season_number: 1, episode_count: 3 }],
    watchedEpisodeKeys: watched,
    nextUp: { season_id: 's1', season_number: 1, episode_number: nextEpisode },
  }
}

function renderRail(shows: ContinueWatchingShow[]) {
  render(
    <ToastProvider>
      <ContinueWatchingRow shows={shows} />
    </ToastProvider>
  )
}

describe('ContinueWatchingRow', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    global.fetch = fetchMock
  })

  it('renders the show title and next-up episode', () => {
    renderRail([makeShow(['s1-1'], 2)])

    expect(screen.getByText('Breaking Bad')).toBeInTheDocument()
    expect(screen.getByText('Next up: S1 E2')).toBeInTheDocument()
  })

  it('marks the episode watched and offers an undo', async () => {
    renderRail([makeShow(['s1-1'], 2)])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark Breaking Bad season 1 episode 2 watched' }))
    })

    expect(callsFor('POST')).toHaveLength(1)
    expect(JSON.parse(String(callsFor('POST')[0][1]?.body))).toEqual({ season_id: 's1', episode_number: 2 })

    expect(await screen.findByText('Next up: S1 E3')).toBeInTheDocument()
    expect(screen.getByText('Marked Breaking Bad S1 E2 as watched.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('undoes the advance and restores the previous episode', async () => {
    renderRail([makeShow(['s1-1'], 2)])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark Breaking Bad season 1 episode 2 watched' }))
    })
    expect(await screen.findByText('Next up: S1 E3')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    })

    expect(await screen.findByText('Next up: S1 E2')).toBeInTheDocument()
    expect(callsFor('DELETE')).toHaveLength(1)
    expect(JSON.parse(String(callsFor('DELETE')[0][1]?.body))).toEqual({ season_id: 's1', episode_number: 2 })
  })

  it('re-inserts a finished show that the advance removed', async () => {
    renderRail([makeShow(['s1-1', 's1-2'], 3)])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark Breaking Bad season 1 episode 3 watched' }))
    })

    // Marking the final episode removes the card from the rail entirely.
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(screen.queryByText('Next up: S1 E3')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    })

    expect(await screen.findByText('Next up: S1 E3')).toBeInTheDocument()
  })
})
