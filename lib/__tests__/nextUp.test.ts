import { describe, it, expect } from 'vitest'
import { findNextUp, seasonProgress, type NextUpSeason } from '../nextUp'

const season = (id: string, season_number: number, episode_count: number): NextUpSeason =>
  ({ id, season_number, episode_count })

describe('findNextUp', () => {
  it('returns the first unwatched episode in the first season', () => {
    const seasons = [season('s1', 1, 3)]
    expect(findNextUp(seasons, new Set(['s1-1']))).toEqual({
      season_id: 's1', season_number: 1, episode_number: 2,
    })
  })

  it('skips fully watched seasons', () => {
    const seasons = [season('s1', 1, 2), season('s2', 2, 2)]
    expect(findNextUp(seasons, new Set(['s1-1', 's1-2']))).toEqual({
      season_id: 's2', season_number: 2, episode_number: 1,
    })
  })

  it('returns null when every episode is watched', () => {
    const seasons = [season('s1', 1, 2)]
    expect(findNextUp(seasons, new Set(['s1-1', 's1-2']))).toBeNull()
  })

  it('lets a gap earlier in season 1 beat season 2 progress', () => {
    const seasons = [season('s1', 1, 5), season('s2', 2, 2)]
    // Season 2 is done, but season 1 has a hole at episode 3.
    expect(findNextUp(seasons, new Set(['s1-1', 's1-2', 's2-1', 's2-2']))).toEqual({
      season_id: 's1', season_number: 1, episode_number: 3,
    })
  })

  it('ignores seasons with no aired episodes', () => {
    const seasons = [season('s1', 1, 0)]
    expect(findNextUp(seasons, new Set())).toBeNull()
  })
})

describe('seasonProgress', () => {
  it('counts the watched episodes of one season only', () => {
    const watched = new Set(['s1-1', 's1-2', 's1-3', 's2-1', 's2-2', 's2-3', 's2-4', 's2-5', 's2-6'])
    expect(seasonProgress(season('s2', 2, 10), watched)).toEqual({ watched: 6, total: 10 })
  })

  it('ignores progress past the season\'s episode count', () => {
    // A season that TMDB later shortened keeps its old progress rows.
    expect(seasonProgress(season('s1', 1, 2), new Set(['s1-1', 's1-2', 's1-3']))).toEqual({ watched: 2, total: 2 })
  })

  it('reports an empty season as nothing of nothing', () => {
    expect(seasonProgress(season('s1', 1, 0), new Set())).toEqual({ watched: 0, total: 0 })
  })
})
