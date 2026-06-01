import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchTmdb, fetchTmdbDetails } from '@/lib/tmdb'

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
})
