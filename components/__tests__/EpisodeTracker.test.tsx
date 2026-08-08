import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EpisodeTracker from '../EpisodeTracker'
import type { Season, EpisodeProgress } from '@/types'

const season: Season = { id: 's1', media_id: 'm1', season_number: 1, episode_count: 5 }

function watched(...episodes: number[]): EpisodeProgress[] {
  return episodes.map((n) => ({
    id: `p${n}`, user_id: 'u1', season_id: 's1', episode_number: n, watched_at: '2026-01-01',
  }))
}

const onProgressChange = vi.fn()

function renderTracker(progress: EpisodeProgress[]) {
  return render(
    <EpisodeTracker seasons={[season]} progress={progress} onProgressChange={onProgressChange} />
  )
}

describe('EpisodeTracker season actions', () => {
  beforeEach(() => { onProgressChange.mockReset() })

  it('marks every unwatched episode in one call', () => {
    renderTracker(watched(1, 2))
    fireEvent.click(screen.getByText('Mark whole season watched'))

    // Only the missing ones, and as a single batched call — not five.
    expect(onProgressChange).toHaveBeenCalledTimes(1)
    expect(onProgressChange).toHaveBeenCalledWith('s1', [3, 4, 5], true)
  })

  it('offers to unmark once the season is complete', () => {
    renderTracker(watched(1, 2, 3, 4, 5))
    expect(screen.queryByText('Mark whole season watched')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Unmark whole season'))
    expect(onProgressChange).toHaveBeenCalledWith('s1', [1, 2, 3, 4, 5], false)
  })

  it('passes a lone episode as a number, matching the legacy API shape', () => {
    renderTracker(watched(1, 2, 3, 4))
    fireEvent.click(screen.getByText('Mark whole season watched'))
    expect(onProgressChange).toHaveBeenCalledWith('s1', 5, true)
  })

  it('does nothing when there is nothing to change', () => {
    renderTracker(watched(1, 2, 3, 4, 5))
    // Already complete, so "mark" is not offered; unmark is the only action.
    expect(screen.getByText('Unmark whole season')).toBeInTheDocument()
  })

  it('still marks an episode and everything before it on a single click', () => {
    renderTracker(watched())
    fireEvent.click(screen.getByText('E3'))
    expect(onProgressChange).toHaveBeenCalledWith('s1', [1, 2, 3], true)
  })
})
