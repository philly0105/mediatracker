import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import EpisodeTracker from '../EpisodeTracker'
import { formatAirDate, isUnaired } from '@/lib/formatDate'
import type { Season, Episode, EpisodeProgress } from '@/types'

const season: Season = { id: 's1', media_id: 'm1', season_number: 1, episode_count: 5 }

function episode(n: number, name: string | null, air_date: string | null, extra: Partial<Episode> = {}): Episode {
  return {
    id: `e${n}`, season_id: 's1', episode_number: n, name, air_date,
    overview: null, runtime_mins: null, still_url: null,
    ...extra,
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
  afterEach(() => { vi.useRealTimers() })

  const season1: Season = { id: 's1', media_id: 'm1', season_number: 1, episode_count: 2 }
  const season2: Season = { id: 's2', media_id: 'm1', season_number: 2, episode_count: 2 }
  const progress: EpisodeProgress[] = [
    { id: 'p1', user_id: 'u1', season_id: 's1', episode_number: 1, watched_at: '2026-01-01' },
    { id: 'p2', user_id: 'u1', season_id: 's1', episode_number: 2, watched_at: '2026-01-02' },
  ]

  it('defaults to opening the season containing the nextUp unwatched episode', () => {
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
    expect(screen.getByRole('radio', { name: 'Season 2' })).toBeChecked()
  })

  it('switches seasons from the segmented control', () => {
    render(
      <EpisodeTracker
        seasons={[season1, season2]}
        progress={progress}
        onProgressChange={onProgressChange}
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Season 1' }))

    expect(screen.getByRole('radio', { name: 'Season 1' })).toBeChecked()
    expect(screen.getByText('Unmark whole season')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('marks finished seasons with a check in the control', () => {
    render(
      <EpisodeTracker
        seasons={[season1, season2]}
        progress={progress}
        onProgressChange={onProgressChange}
      />
    )
    // The accordion header used to show each season's bar; the control's
    // check is what tells a finished season from an unfinished one now,
    // without opening it.
    expect(screen.getByRole('radio', { name: 'Season 1' }).querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('radio', { name: 'Season 2' }).querySelector('svg')).toBeNull()
  })

  it('counts a season with an unaired episode as finished once the aired ones are watched', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 10))
    const three: Season = { id: 's1', media_id: 'm1', season_number: 1, episode_count: 3 }
    render(
      <EpisodeTracker
        seasons={[three, season2]}
        progress={watched(1, 2)}
        episodes={[episode(1, 'One', '2026-07-01'), episode(2, 'Two', '2026-07-08'), episode(3, 'Three', '2026-07-15')]}
        onProgressChange={onProgressChange}
      />
    )
    expect(screen.getByRole('radio', { name: 'Season 1' }).querySelector('svg')).not.toBeNull()
  })
})

describe('EpisodeTracker rows', () => {
  beforeEach(() => { onProgressChange.mockReset() })

  it('names each toggle with its cascade and reports the watched state', () => {
    render(
      <EpisodeTracker
        seasons={[season]}
        progress={watched(1, 2)}
        episodes={[episode(1, 'Pilot', '2008-01-20'), episode(3, 'And the Bag\'s in the River', '2008-02-10')]}
        onProgressChange={onProgressChange}
      />
    )

    expect(screen.getByRole('button', { name: 'Unmark S1 E1–E5 (Pilot)' })).toHaveAttribute('aria-pressed', 'true')
    const third = screen.getByRole('button', { name: "Mark S1 E1–E3 watched (And the Bag's in the River)" })
    expect(third).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(third)
    expect(onProgressChange).toHaveBeenCalledWith('s1', 3, true)
  })

  it('rings the next episode to watch and moves it as progress changes', () => {
    const { rerender } = render(
      <EpisodeTracker seasons={[season]} progress={watched(1, 2)} onProgressChange={onProgressChange} />
    )
    const ringed = () => screen.getAllByRole('listitem').filter((li) => li.style.boxShadow.includes('accent-ring'))
    expect(ringed()).toHaveLength(1)
    expect(ringed()[0]).toContainElement(screen.getByText('E3'))
    // Forced colours discard the shadow, so the ring there is a Highlight outline.
    expect(ringed()[0].className).toContain('forced-colors:outline-2')
    expect(ringed()[0].className).toContain('forced-colors:outline-[color:Highlight]')
    expect(screen.getByText('E2').closest('li')!.className).toBe('')

    rerender(<EpisodeTracker seasons={[season]} progress={watched(1, 2, 3)} onProgressChange={onProgressChange} />)
    expect(ringed()[0]).toContainElement(screen.getByText('E4'))
  })

  it('shows the runtime and a one-line synopsis when the fill has them', () => {
    render(
      <EpisodeTracker
        seasons={[season]}
        progress={[]}
        episodes={[episode(1, 'Pilot', '2008-01-20', { runtime_mins: 58, overview: 'A chemistry teacher is diagnosed.' })]}
        onProgressChange={onProgressChange}
      />
    )
    // The runtime is the aside from the content breakpoint up; on a phone it
    // leads the date line instead, so the two never share a width.
    const aside = screen.getByText('58m')
    expect(aside.className).toBe('max-md:hidden')
    const dateLine = screen.getByText('Jan 20, 2008')
    expect(dateLine.textContent).toBe('58m · Jan 20, 2008')
    expect(dateLine.querySelector('span')!.className).toBe('md:hidden')
    const synopsis = screen.getByText('A chemistry teacher is diagnosed.')
    expect(synopsis.className).toBe('truncate max-md:line-clamp-2 max-md:whitespace-normal')
  })

  it('keeps the runtime as the aside when there is no air date to join it to', () => {
    render(
      <EpisodeTracker
        seasons={[season]}
        progress={[]}
        episodes={[episode(1, 'Pilot', null, { runtime_mins: 58 })]}
        onProgressChange={onProgressChange}
      />
    )
    expect(screen.getByText('58m').className).toBe('')
  })

  it('puts the watched pill on the row and the unwatched label in primary text', () => {
    render(
      <EpisodeTracker seasons={[season]} progress={watched(1)} onProgressChange={onProgressChange} />
    )
    const done = screen.getByRole('button', { name: 'Unmark S1 E1–E5' })
    const todo = screen.getByRole('button', { name: 'Mark S1 E1–E2 watched' })
    // The accent on the .16 glass fill measured under 4.5:1; on the row it clears it.
    expect(done.className).toContain('bg-transparent')
    expect(done.style.color).toBe('var(--accent)')
    expect(todo.className).not.toContain('bg-transparent')
    expect(todo.style.color).toBe('var(--text-primary)')
    for (const b of [done, todo]) expect(b.className).toContain('h-11 min-w-11')
  })

  it('keeps an episode with no still on the still-shaped placeholder', () => {
    renderTracker(watched())
    // No still anywhere: every placeholder is the 16:9 thumb, not a poster,
    // at the small phone size an episode row asks for.
    for (const li of screen.getAllByRole('listitem')) {
      const thumb = li.querySelector('.glass-row')!.firstElementChild as HTMLElement
      expect(thumb.className).toContain('w-[72px] h-10 md:w-40')
      expect(thumb.style.width).toBe('')
    }
  })
})
