import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import EpisodeTracker from '../EpisodeTracker'
import { formatAirDate, isUnaired } from '@/lib/formatDate'
import type { Season, Episode, EpisodeProgress } from '@/types'

const season: Season = { id: 's1', media_id: 'm1', season_number: 1, episode_count: 5 }

function episode(n: number, name: string | null, air_date: string | null): Episode {
  return {
    id: `e${n}`, season_id: 's1', episode_number: n, name, air_date,
    overview: null, runtime_mins: null, still_url: null,
  }
}

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

describe('EpisodeTracker episode metadata', () => {
  beforeEach(() => { onProgressChange.mockReset() })
  afterEach(() => { vi.useRealTimers() })

  function renderWithMeta(episodes: Episode[]) {
    return render(
      <EpisodeTracker
        seasons={[season]}
        progress={[]}
        episodes={episodes}
        onProgressChange={onProgressChange}
      />
    )
  }

  it('renders titles and air dates alongside the numbers', () => {
    renderWithMeta([episode(1, 'Pilot', '2008-01-20'), episode(2, "Cat's in the Bag...", '2008-01-27')])

    expect(screen.getByText('Pilot')).toBeInTheDocument()
    expect(screen.getByText("Cat's in the Bag...")).toBeInTheDocument()
    expect(screen.getByText('Jan 20, 2008')).toBeInTheDocument()
    // The number stays: it is what episode_progress keys on, and what the
    // click-to-here cascade is described in.
    expect(screen.getByText('E1')).toBeInTheDocument()
  })

  it('falls back to bare numbers when metadata has not arrived', () => {
    renderTracker(watched())
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByText(`E${n}`)).toBeInTheDocument()
    }
  })

  it('covers episodes the fill did not return', () => {
    // A partial fill must not blank out the rest of the season.
    renderWithMeta([episode(1, 'Pilot', '2008-01-20')])
    expect(screen.getByText('Pilot')).toBeInTheDocument()
    expect(screen.getByText('E5')).toBeInTheDocument()
  })

  it('labels an episode that has not aired yet', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 8))
    renderWithMeta([episode(1, 'Pilot', '2026-08-01'), episode(2, 'Next Week', '2026-08-15')])

    expect(screen.queryByText('Aug 15, 2026')).not.toBeInTheDocument()
    expect(screen.getByText('Airs Aug 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('Aug 1, 2026')).toBeInTheDocument()
  })

  it('still clicks through on an episode with a title', () => {
    renderWithMeta([episode(3, 'And the Bag\'s in the River', '2008-02-10')])
    fireEvent.click(screen.getByText('E3'))
    expect(onProgressChange).toHaveBeenCalledWith('s1', [1, 2, 3], true)
  })
})

describe('air date helpers', () => {
  afterEach(() => { vi.useRealTimers() })

  it('reads a bare date as local midnight, not UTC', () => {
    // Date('2008-01-20') is UTC midnight, which renders as Jan 19 anywhere
    // west of Greenwich. This is the bug the helper exists to avoid.
    expect(formatAirDate('2008-01-20')).toBe('Jan 20, 2008')
  })

  it('returns null for a date it cannot parse', () => {
    expect(formatAirDate('')).toBeNull()
    expect(formatAirDate('not-a-date')).toBeNull()
  })

  it('treats today as aired and tomorrow as not', () => {
    const today = new Date(2026, 7, 8)
    expect(isUnaired('2026-08-08', today)).toBe(false)
    expect(isUnaired('2026-08-09', today)).toBe(true)
    expect(isUnaired(null, today)).toBe(false)
  })
})

describe('EpisodeTracker unaired episodes', () => {
  beforeEach(() => { onProgressChange.mockReset() })
  afterEach(() => { vi.useRealTimers() })

  const threeEpisodeSeason: Season = { id: 's1', media_id: 'm1', season_number: 1, episode_count: 3 }

  function renderWithUnairedThird() {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 10))
    return render(
      <EpisodeTracker
        seasons={[threeEpisodeSeason]}
        progress={[]}
        episodes={[
          episode(1, 'One', '2026-07-01'),
          episode(2, 'Two', '2026-07-08'),
          episode(3, 'Three', '2026-07-15'),
        ]}
        onProgressChange={onProgressChange}
      />
    )
  }

  it('skips the unaired last episode when marking the whole season watched', () => {
    renderWithUnairedThird()
    fireEvent.click(screen.getByText('Mark whole season watched'))

    // Episode 3 has not aired, so only 1 and 2 are marked — not all three.
    expect(onProgressChange).toHaveBeenCalledTimes(1)
    expect(onProgressChange).toHaveBeenCalledWith('s1', [1, 2], true)
  })

  it('keeps unmarking every watched episode even when one has not aired', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 10))
    render(
      <EpisodeTracker
        seasons={[threeEpisodeSeason]}
        progress={watched(1, 2)}
        episodes={[
          episode(1, 'One', '2026-07-01'),
          episode(2, 'Two', '2026-07-08'),
          episode(3, 'Three', '2026-07-15'),
        ]}
        onProgressChange={onProgressChange}
      />
    )
    fireEvent.click(screen.getByText('Unmark whole season'))
    // Unmarking is unchanged: it clears every watched episode, air date is ignored.
    expect(onProgressChange).toHaveBeenCalledWith('s1', [1, 2], false)
  })

  it('shows the header fraction minus the unaired episode', () => {
    renderWithUnairedThird()
    // Three episodes, one unaired — the header counts it as 0/2, not 0/3.
    expect(screen.getByText('0/2')).toBeInTheDocument()
    expect(screen.queryByText('0/3')).not.toBeInTheDocument()
  })
})

describe('EpisodeTracker default open season', () => {
  const season1: Season = { id: 's1', media_id: 'm1', season_number: 1, episode_count: 2 }
  const season2: Season = { id: 's2', media_id: 'm1', season_number: 2, episode_count: 2 }

  it('defaults to opening the season containing the nextUp unwatched episode', () => {
    const progress: EpisodeProgress[] = [
      { id: 'p1', user_id: 'u1', season_id: 's1', episode_number: 1, watched_at: '2026-01-01' },
      { id: 'p2', user_id: 'u1', season_id: 's1', episode_number: 2, watched_at: '2026-01-02' },
    ]

    render(
      <EpisodeTracker
        seasons={[season1, season2]}
        progress={progress}
        onProgressChange={onProgressChange}
      />
    )

    // Season 1 is fully watched, so Season 2 should be open by default.
    // In Season 2, episodes are not watched, so "Mark whole season watched" is visible for Season 2.
    expect(screen.getByText('Mark whole season watched')).toBeInTheDocument()
  })
})
