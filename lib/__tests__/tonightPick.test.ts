import { describe, it, expect } from 'vitest'
import type { WatchlistItem, WatchlistPriority } from '@/types'
import { pickTonight } from '@/lib/tonightPick'

function makeItem(id: string, priority: WatchlistPriority, runtime: number | null = 90): WatchlistItem {
  return {
    id,
    user_id: 'user',
    media_id: `media-${id}`,
    priority,
    added_at: '2024-01-01',
    media: {
      id: `media-${id}`,
      tmdb_id: 1,
      type: 'movie',
      title: `Title ${id}`,
      overview: 'Overview',
      poster_url: null,
      genres: [],
      release_year: 2020,
      runtime_mins: runtime,
      director: null,
      cast_members: [],
      collection_id: null,
      collection_name: null,
    },
  }
}

describe('pickTonight', () => {
  it('returns null for an empty pool', () => {
    expect(pickTonight([], { rng: () => 0 })).toBeNull()
  })

  it('respects the priority weights', () => {
    // Weights sum to 7 (4 + 2 + 1). With a sealed rng, the draw lands in the
    // band of whichever priority the fraction multiplies out to.
    const pool = [
      makeItem('must', 'must_watch'),
      makeItem('want', 'want_to_watch'),
      makeItem('someday', 'someday'),
    ]
    expect(pickTonight(pool, { rng: () => 0.1 })!.id).toBe('must')
    expect(pickTonight(pool, { rng: () => 0.6 })!.id).toBe('want')
    expect(pickTonight(pool, { rng: () => 0.95 })!.id).toBe('someday')
  })

  it('never repeats the same item twice in a row when the pool has more than one', () => {
    const pool = [makeItem('a', 'must_watch'), makeItem('b', 'want_to_watch')]
    expect(pickTonight(pool, { avoidId: 'a', rng: () => 0 })!.id).not.toBe('a')
    expect(pickTonight(pool, { avoidId: 'b', rng: () => 0.99 })!.id).not.toBe('b')
  })

  it('may repeat the only item when the pool has exactly one', () => {
    const single = [makeItem('a', 'must_watch')]
    expect(pickTonight(single, { avoidId: 'a', rng: () => 0 })!.id).toBe('a')
  })

  it('passes a null runtime only under the any budget', () => {
    const pool = [
      makeItem('null', 'must_watch', null),
      makeItem('short', 'must_watch', 60),
      makeItem('long', 'must_watch', 150),
    ]
    // `any` includes the null-runtime item.
    expect(pickTonight(pool, { budget: 'any', rng: () => 0 })!.id).toBe('null')
    // A concrete budget excludes the null-runtime item and anything over it.
    expect(pickTonight(pool, { budget: '90', rng: () => 0 })!.id).toBe('short')
    expect(pickTonight(pool, { budget: '90', rng: () => 0.99 })!.id).toBe('short')
  })

  it('narrows the pool by the time budget', () => {
    const pool = [makeItem('short', 'must_watch', 60), makeItem('long', 'must_watch', 150)]
    expect(pickTonight(pool, { budget: '120', rng: () => 0 })!.id).toBe('short')
    expect(pickTonight(pool, { budget: '30', rng: () => 0 })).toBeNull()
  })
})