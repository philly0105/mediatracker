import { describe, it, expect } from 'vitest'
import { claimSeasonsNeedingFill } from '@/app/api/episodes/meta/route'
import type { Episode, Season } from '@/types'

function season(id: string, season_number: number, episode_count: number): Pick<Season, 'id' | 'season_number' | 'episode_count'> {
  return { id, season_number, episode_count }
}

function cached(season_id: string, count: number): Pick<Episode, 'season_id'>[] {
  return Array.from({ length: count }, () => ({ season_id }))
}

describe('claimSeasonsNeedingFill', () => {
  it('picks the seasons with nothing cached', () => {
    const seasons = [season('a', 1, 7), season('b', 2, 10)]
    const needing = claimSeasonsNeedingFill(seasons, cached('a', 7))
    expect(needing.map((s) => s.id)).toEqual(['b'])
  })

  it('re-fills a season that gained episodes', () => {
    // A running show's episode_count grows; the cached rows do not.
    const needing = claimSeasonsNeedingFill([season('a', 1, 10)], cached('a', 8))
    expect(needing.map((s) => s.id)).toEqual(['a'])
  })

  it('wants nothing when every season is complete', () => {
    const seasons = [season('a', 1, 7), season('b', 2, 10)]
    expect(claimSeasonsNeedingFill(seasons, [...cached('a', 7), ...cached('b', 10)])).toEqual([])
  })

  it('does not retry a short season on the next page load', () => {
    // TMDB sometimes lists fewer episodes than episode_count claims. Without
    // the cooldown that season would be re-fetched on every single render of
    // the show page, forever.
    const seasons = [season('c', 1, 10)]
    const first = claimSeasonsNeedingFill(seasons, cached('c', 4), 1_000)
    expect(first.map((s) => s.id)).toEqual(['c'])

    const second = claimSeasonsNeedingFill(seasons, cached('c', 4), 2_000)
    expect(second).toEqual([])

    // ...but it does try again once the window has passed.
    const later = claimSeasonsNeedingFill(seasons, cached('c', 4), 1_000 + 7 * 60 * 60 * 1000)
    expect(later.map((s) => s.id)).toEqual(['c'])
  })
})
