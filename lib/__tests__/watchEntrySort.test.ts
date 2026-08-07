import { describe, it, expect } from 'vitest'
import { sortWatchEntries } from '@/lib/watchEntrySort'
import type { Media, WatchEntry } from '@/types'

const baseMedia: Media = {
  id: 'm',
  tmdb_id: 1,
  type: 'movie',
  title: '',
  overview: null,
  poster_url: null,
  genres: [],
  release_year: null,
  runtime_mins: null,
  director: null,
  cast_members: [],
  collection_id: null,
  collection_name: null,
}

function makeEntry(media: Partial<Media> | null, rating: number | null = null): WatchEntry {
  return {
    id: 'x',
    user_id: 'u',
    media_id: 'm',
    rating,
    review: null,
    watched_at: '2026-01-01',
    rewatch: false,
    created_at: '2026-01-01',
    ...(media ? { media: { ...baseMedia, ...media } } : {}),
  }
}

describe('sortWatchEntries', () => {
  it("'recent' returns the input array unchanged and by reference", () => {
    const a = makeEntry({ title: 'B' })
    const b = makeEntry({ title: 'A' })
    const input = [a, b]
    const out = sortWatchEntries(input, 'recent')
    expect(out).toBe(input)
    expect(out).toEqual([a, b])
  })

  it("'name' sorts by title without mutating the input", () => {
    const a = makeEntry({ title: 'Zulu' })
    const b = makeEntry({ title: 'Alien' })
    const input = [a, b]
    const out = sortWatchEntries(input, 'name')
    expect(out.map((e) => e.media?.title)).toEqual(['Alien', 'Zulu'])
    expect(input).toEqual([a, b])
  })

  it("'rating' sorts descending with nulls last, tie-breaking by title", () => {
    const a = makeEntry({ title: 'Ralph' }, 7)
    const b = makeEntry({ title: 'Ada' }, 7)
    const c = makeEntry({ title: 'Zed' }, 9)
    const d = makeEntry({ title: 'Mia' }, null)
    const out = sortWatchEntries([a, b, c, d], 'rating')
    expect(out.map((e) => e.media?.title)).toEqual(['Zed', 'Ada', 'Ralph', 'Mia'])
  })

  it("'releaseDate' sorts newest first with null years last, tie-breaking by title", () => {
    const a = makeEntry({ title: 'Old', release_year: 1990 })
    const b = makeEntry({ title: 'New', release_year: 2010 })
    const c = makeEntry({ title: 'NullYear', release_year: null })
    const d = makeEntry({ title: 'Tie1', release_year: 2000 })
    const e = makeEntry({ title: 'Tie0', release_year: 2000 })
    const out = sortWatchEntries([a, b, c, d, e], 'releaseDate')
    expect(out.map((x) => x.media?.title)).toEqual(['New', 'Tie0', 'Tie1', 'Old', 'NullYear'])
  })
})
