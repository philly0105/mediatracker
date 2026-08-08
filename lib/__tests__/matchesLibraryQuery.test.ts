import { describe, it, expect } from 'vitest'
import { matchesLibraryQuery } from '@/lib/matchesLibraryQuery'
import type { WatchEntry } from '@/types'

function entry(media: Partial<NonNullable<WatchEntry['media']>> | null): WatchEntry {
  return {
    id: 'e1',
    user_id: 'u1',
    media_id: 'm1',
    rating: null,
    review: null,
    watched_at: '2026-01-01',
    rewatch: false,
    created_at: '2026-01-01T00:00:00Z',
    media: media
      ? {
          id: 'm1',
          tmdb_id: 1,
          type: 'movie',
          title: 'Untitled',
          overview: null,
          poster_url: null,
          genres: [],
          release_year: null,
          runtime_mins: null,
          director: null,
          cast_members: [],
          collection_id: null,
          collection_name: null,
          ...media,
        }
      : undefined,
  }
}

const goneGirl = entry({
  title: 'Gone Girl',
  director: 'David Fincher',
  release_year: 2014,
  cast_members: ['Ben Affleck', 'Rosamund Pike'],
  genres: ['Thriller', 'Drama'],
})

describe('matchesLibraryQuery', () => {
  it('matches on title', () => {
    expect(matchesLibraryQuery(goneGirl, 'gone')).toBe(true)
  })

  it('matches on director, which title-only search missed entirely', () => {
    expect(matchesLibraryQuery(goneGirl, 'fincher')).toBe(true)
  })

  it('matches on a cast member', () => {
    expect(matchesLibraryQuery(goneGirl, 'rosamund')).toBe(true)
  })

  it('matches on genre and on release year', () => {
    expect(matchesLibraryQuery(goneGirl, 'thriller')).toBe(true)
    expect(matchesLibraryQuery(goneGirl, '2014')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(matchesLibraryQuery(goneGirl, 'FINCHER')).toBe(true)
  })

  it('ANDs terms across different fields', () => {
    expect(matchesLibraryQuery(goneGirl, 'fincher 2014')).toBe(true)
    expect(matchesLibraryQuery(goneGirl, 'fincher 1999')).toBe(false)
  })

  it('returns everything for an empty or whitespace-only query', () => {
    expect(matchesLibraryQuery(goneGirl, '')).toBe(true)
    expect(matchesLibraryQuery(goneGirl, '   ')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchesLibraryQuery(goneGirl, 'nolan')).toBe(false)
  })

  it('excludes a row with a missing media join rather than throwing', () => {
    expect(matchesLibraryQuery(entry(null), 'gone')).toBe(false)
    // ...but an empty query still lets it through, matching the old behaviour
    // of rendering whatever came back.
    expect(matchesLibraryQuery(entry(null), '')).toBe(true)
  })

  it('tolerates null director and empty cast/genres', () => {
    const sparse = entry({ title: 'Solaris' })
    expect(matchesLibraryQuery(sparse, 'solaris')).toBe(true)
    expect(matchesLibraryQuery(sparse, 'tarkovsky')).toBe(false)
  })
})
