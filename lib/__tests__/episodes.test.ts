import { describe, it, expect } from 'vitest'
import { parseEpisodes } from '@/app/api/episodes/route'

describe('parseEpisodes', () => {
  it('parses the legacy single-episode shape with batch=false', () => {
    expect(parseEpisodes({ season_id: 's1', episode_number: 3 })).toEqual({
      season_id: 's1',
      episodes: [3],
      batch: false,
    })
  })

  it('parses the array shape { episodes: [...] } with batch=true', () => {
    expect(parseEpisodes({ season_id: 's1', episodes: [1, 2, 3] })).toEqual({
      season_id: 's1',
      episodes: [1, 2, 3],
      batch: true,
    })
  })

  it('parses the range shape { from, to } as inclusive with batch=true', () => {
    expect(parseEpisodes({ season_id: 's1', from: 1, to: 3 })).toEqual({
      season_id: 's1',
      episodes: [1, 2, 3],
      batch: true,
    })
  })

  it('normalises a reversed range (to < from) to ascending order', () => {
    expect(parseEpisodes({ season_id: 's1', from: 5, to: 2 })).toEqual({
      season_id: 's1',
      episodes: [2, 3, 4, 5],
      batch: true,
    })
  })

  it('deduplicates repeated episode numbers', () => {
    expect(parseEpisodes({ season_id: 's1', episodes: [1, 1, 2, 2, 2, 3] })).toEqual({
      season_id: 's1',
      episodes: [1, 2, 3],
      batch: true,
    })
  })

  it('rejects a missing or empty season_id', () => {
    expect(parseEpisodes({ episode_number: 1 })).toBeNull()
    expect(parseEpisodes({ season_id: '', episodes: [1] })).toBeNull()
  })

  it('rejects a body with no episode information', () => {
    expect(parseEpisodes({ season_id: 's1' })).toBeNull()
    expect(parseEpisodes({ season_id: 's1', foo: 'bar' })).toBeNull()
  })

  it('filters out non-integer, zero, and negative episode numbers', () => {
    expect(
      parseEpisodes({ season_id: 's1', episodes: [1, 2.5, 0, -3, 4, '5' as unknown as number] })
    ).toEqual({
      season_id: 's1',
      episodes: [1, 4],
      batch: true,
    })
  })

  it('returns null when every candidate episode is filtered out', () => {
    expect(parseEpisodes({ season_id: 's1', episodes: [0, -1, 1.5] })).toBeNull()
  })

  it('keeps batch false ONLY for the legacy single shape', () => {
    const legacy = parseEpisodes({ season_id: 's1', episode_number: 3 })
    const array = parseEpisodes({ season_id: 's1', episodes: [3] })
    const range = parseEpisodes({ season_id: 's1', from: 3, to: 3 })

    expect(legacy?.batch).toBe(false)
    expect(array?.batch).toBe(true)
    expect(range?.batch).toBe(true)
  })
})
