import { describe, it, expect } from 'vitest'
import {
  filterLibraryEntries,
  distinctGenres,
  distinctDecades,
  collectGenres,
  type LibraryFilters,
} from '@/lib/libraryFilters'
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

const noFilters: LibraryFilters = {
  genre: null,
  minRating: null,
  unratedOnly: false,
  decade: null,
}

describe('filterLibraryEntries', () => {
  it('returns everything for an empty/default filter set', () => {
    const entries = [
      makeEntry({ title: 'A', genres: ['Drama'], release_year: 2010 }, 5),
      makeEntry({ title: 'B', genres: ['Comedy'], release_year: 2020 }, null),
      makeEntry(null),
    ]
    expect(filterLibraryEntries(entries, noFilters)).toEqual(entries)
  })

  it('filters by genre', () => {
    const entries = [
      makeEntry({ title: 'A', genres: ['Drama'] }),
      makeEntry({ title: 'B', genres: ['Comedy'] }),
      makeEntry(null),
    ]
    const out = filterLibraryEntries(entries, { ...noFilters, genre: 'Drama' })
    expect(out.map((e) => e.media?.title)).toEqual(['A'])
  })

  it('filters by minimum rating, keeping the threshold and above', () => {
    const entries = [
      makeEntry({ title: 'A' }, 5),
      makeEntry({ title: 'B' }, 4),
      makeEntry({ title: 'C' }, 3),
      makeEntry({ title: 'D' }, null),
    ]
    const out = filterLibraryEntries(entries, { ...noFilters, minRating: 4 })
    expect(out.map((e) => e.media?.title)).toEqual(['A', 'B'])
  })

  it('filters to unrated entries only', () => {
    const entries = [
      makeEntry({ title: 'A' }, 5),
      makeEntry({ title: 'B' }, null),
      makeEntry({ title: 'C' }, 3),
    ]
    const out = filterLibraryEntries(entries, { ...noFilters, unratedOnly: true })
    expect(out.map((e) => e.media?.title)).toEqual(['B'])
  })

  it('filters by decade', () => {
    const entries = [
      makeEntry({ title: 'A', release_year: 2010 }),
      makeEntry({ title: 'B', release_year: 2020 }),
      makeEntry({ title: 'C', release_year: 1998 }),
      makeEntry({ title: 'D', release_year: null }),
      makeEntry(null),
    ]
    const out = filterLibraryEntries(entries, { ...noFilters, decade: 2020 })
    expect(out.map((e) => e.media?.title)).toEqual(['B'])
  })

  it('combines filters with AND', () => {
    const entries = [
      makeEntry({ title: 'A', genres: ['Drama'], release_year: 2010 }, 5),
      makeEntry({ title: 'B', genres: ['Drama'], release_year: 2010 }, 3),
      makeEntry({ title: 'C', genres: ['Comedy'], release_year: 2010 }, 5),
      makeEntry({ title: 'D', genres: ['Drama'], release_year: 2020 }, 5),
    ]
    const out = filterLibraryEntries(entries, {
      genre: 'Drama',
      minRating: 4,
      unratedOnly: false,
      decade: 2010,
    })
    expect(out.map((e) => e.media?.title)).toEqual(['A'])
  })

  it('does not throw on entries with a missing media join', () => {
    const entries = [makeEntry(null), makeEntry({ title: 'A', genres: ['Drama'] }, null)]
    expect(() => filterLibraryEntries(entries, { ...noFilters, genre: 'Drama' })).not.toThrow()
    expect(() => filterLibraryEntries(entries, { ...noFilters, decade: 2020 })).not.toThrow()
    expect(() => filterLibraryEntries(entries, { ...noFilters, unratedOnly: true })).not.toThrow()
    expect(() => filterLibraryEntries(entries, { ...noFilters, minRating: 4 })).not.toThrow()
  })
})

describe('distinctGenres', () => {
  it('returns only genres present, alphabetical, deduped', () => {
    const entries = [
      makeEntry({ genres: ['Drama', 'Thriller'] }),
      makeEntry({ genres: ['Drama'] }),
      makeEntry({ genres: ['Action'] }),
      makeEntry({ genres: [] }),
      makeEntry(null),
    ]
    expect(distinctGenres(entries)).toEqual(['Action', 'Drama', 'Thriller'])
  })
})

describe('distinctDecades', () => {
  it('returns decades present, newest first', () => {
    const entries = [
      makeEntry({ release_year: 2015 }),
      makeEntry({ release_year: 2023 }),
      makeEntry({ release_year: 1998 }),
      makeEntry({ release_year: null }),
      makeEntry(null),
    ]
    expect(distinctDecades(entries)).toEqual([2020, 2010, 1990])
  })
})

describe('collectGenres', () => {
  it('flattens and dedupes genres from facet rows, alphabetically', () => {
    const rows = [
      { media: { genres: ['Thriller', 'Drama'] } },
      { media: { genres: ['Drama'] } },
      { media: { genres: null } },
      { media: null },
      null,
    ]
    expect(collectGenres(rows)).toEqual(['Drama', 'Thriller'])
  })

  it('returns an empty array for no rows', () => {
    expect(collectGenres([])).toEqual([])
  })
})