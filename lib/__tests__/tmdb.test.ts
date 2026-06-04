import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchTmdb, fetchTmdbDetails, getCollectionDetails, getPopularCollections } from '@/lib/tmdb'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => { mockFetch.mockReset() })

describe('searchTmdb', () => {
  it('returns formatted movie results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          id: 550, media_type: 'movie',
          title: 'Fight Club', overview: 'A movie',
          poster_path: '/path.jpg', release_date: '1999-10-15',
        }]
      }),
    })
    const results = await searchTmdb('fight club')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      tmdb_id: 550, type: 'movie', title: 'Fight Club',
      release_year: 1999,
      poster_url: 'https://image.tmdb.org/t/p/w500/path.jpg',
    })
  })

  it('handles TV shows', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          id: 1396, media_type: 'tv',
          name: 'Breaking Bad', overview: 'A show',
          poster_path: '/path.jpg', first_air_date: '2008-01-20',
        }]
      }),
    })
    const results = await searchTmdb('breaking bad')
    expect(results[0]).toMatchObject({ tmdb_id: 1396, type: 'show', title: 'Breaking Bad' })
  })

  it('filters out non-movie/tv results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ id: 1, media_type: 'person', name: 'Actor' }]
      }),
    })
    const results = await searchTmdb('actor')
    expect(results).toHaveLength(0)
  })
})

describe('fetchTmdbDetails', () => {
  it('returns movie details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 550, title: 'Fight Club', runtime: 139,
        overview: 'A movie', poster_path: '/path.jpg',
        genres: [{ name: 'Drama' }, { name: 'Thriller' }],
        release_date: '1999-10-15',
        credits: {
          crew: [{ job: 'Director', name: 'David Fincher' }],
          cast: [{ name: 'Brad Pitt' }, { name: 'Edward Norton' }],
        },
      }),
    })
    const details = await fetchTmdbDetails(550, 'movie')
    expect(details).toMatchObject({
      tmdb_id: 550, title: 'Fight Club', runtime_mins: 139,
      director: 'David Fincher', genres: ['Drama', 'Thriller'],
      cast_members: ['Brad Pitt', 'Edward Norton'],
    })
  })

  it('includes collection data when movie belongs to a collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 550, title: 'Fight Club', runtime: 139,
        overview: 'A movie', poster_path: '/path.jpg',
        genres: [{ name: 'Drama' }], release_date: '1999-10-15',
        belongs_to_collection: { id: 123, name: 'Fight Club Collection' },
        credits: { crew: [], cast: [] },
        videos: { results: [] },
      }),
    })
    const details = await fetchTmdbDetails(550, 'movie')
    expect(details.belongs_to_collection).toEqual({ id: 123, name: 'Fight Club Collection' })
  })

  it('returns null belongs_to_collection when not in a collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 550, title: 'Fight Club', runtime: 139,
        overview: 'A movie', poster_path: '/path.jpg',
        genres: [], release_date: '1999-10-15',
        belongs_to_collection: null,
        credits: { crew: [], cast: [] },
        videos: { results: [] },
      }),
    })
    const details = await fetchTmdbDetails(550, 'movie')
    expect(details.belongs_to_collection).toBeNull()
  })
})

describe('getCollectionDetails', () => {
  it('returns collection with parts sorted by release_date', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 131635,
        name: 'Lord of the Rings Collection',
        overview: 'Epic fantasy trilogy',
        backdrop_path: '/backdrop.jpg',
        poster_path: '/poster.jpg',
        parts: [
          { id: 122, title: 'The Return of the King', poster_path: '/p3.jpg', release_date: '2003-12-17', overview: 'Third' },
          { id: 120, title: 'The Fellowship of the Ring', poster_path: '/p1.jpg', release_date: '2001-12-10', overview: 'First' },
          { id: 121, title: 'The Two Towers', poster_path: '/p2.jpg', release_date: '2002-12-18', overview: 'Second' },
        ],
      }),
    })
    const result = await getCollectionDetails(131635)
    expect(result.id).toBe(131635)
    expect(result.name).toBe('Lord of the Rings Collection')
    expect(result.backdrop_url).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg')
    expect(result.poster_url).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
    expect(result.parts).toHaveLength(3)
    expect(result.parts[0].title).toBe('The Fellowship of the Ring')
    expect(result.parts[0].tmdb_id).toBe(120)
    expect(result.parts[1].title).toBe('The Two Towers')
    expect(result.parts[2].title).toBe('The Return of the King')
    expect(result.parts[0].release_year).toBe(2001)
  })

  it('handles null poster and backdrop paths', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1, name: 'Test', overview: '', backdrop_path: null, poster_path: null, parts: [],
      }),
    })
    const result = await getCollectionDetails(1)
    expect(result.backdrop_url).toBeNull()
    expect(result.poster_url).toBeNull()
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(getCollectionDetails(0)).rejects.toThrow('TMDB collection failed: 404')
  })
})

describe('getPopularCollections', () => {
  it('fetches movie details and deduplicates by collection', async () => {
    // List response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }),
    })
    // Movie 1 detail: MCU
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ belongs_to_collection: { id: 10, name: 'MCU', poster_path: '/p.jpg', backdrop_path: '/b.jpg' } }),
    })
    // Movie 2 detail: MCU again (deduped)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ belongs_to_collection: { id: 10, name: 'MCU', poster_path: '/p.jpg', backdrop_path: '/b.jpg' } }),
    })
    // Movie 3 detail: DCEU
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ belongs_to_collection: { id: 20, name: 'DCEU', poster_path: '/p2.jpg', backdrop_path: '/b2.jpg' } }),
    })
    // Movie 4 detail: no collection
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ belongs_to_collection: null }),
    })

    const result = await getPopularCollections(1)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 10, name: 'MCU',
      poster_url: 'https://image.tmdb.org/t/p/w500/p.jpg',
      backdrop_url: 'https://image.tmdb.org/t/p/w1280/b.jpg',
    })
    expect(result[1].id).toBe(20)
  })

  it('returns empty array when list fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const result = await getPopularCollections(1)
    expect(result).toEqual([])
  })
})
