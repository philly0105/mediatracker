import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchTmdb, fetchTmdbDetails, getCollectionDetails, getPopularCollections, discoverStreaming, showRuntimeMins, mapSeasonEpisodes, fetchTmdbSeasonEpisodes } from '@/lib/tmdb'

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

  it('requests append_to_response by default', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 550, title: 'Fight Club', genres: [], credits: { crew: [], cast: [] } }),
    })
    await fetchTmdbDetails(550, 'movie')
    expect(mockFetch.mock.calls[0][0]).toContain('append_to_response=')
  })

  it('omits append_to_response when append is false, and still returns the full shape', async () => {
    // The cheap path /api/tmdb/rating uses: no credits, videos or watch/providers
    // come back, so the mapping must fall back rather than throw.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 550, title: 'Fight Club', runtime: 139,
        overview: 'A movie', poster_path: '/path.jpg',
        genres: [{ name: 'Drama' }], release_date: '1999-10-15',
        vote_average: 8.4,
      }),
    })
    const details = await fetchTmdbDetails(550, 'movie', false)
    expect(mockFetch.mock.calls[0][0]).not.toContain('append_to_response=')
    expect(details).toMatchObject({
      tmdb_id: 550,
      title: 'Fight Club',
      vote_average: 8.4,
      cast_members: [],
      director: null,
      trailer_url: null,
      watch_providers: null,
    })
  })
})

describe('showRuntimeMins', () => {
  it('prefers episode_run_time when TMDB still populates it', () => {
    expect(showRuntimeMins({ episode_run_time: [42], last_episode_to_air: { runtime: 60 } })).toBe(42)
  })

  it('falls back to the last aired episode when episode_run_time is empty', () => {
    // TMDB is deprecating episode_run_time and returns [] for most shows now,
    // which is why 24 of 26 shows in this database had a null runtime.
    expect(showRuntimeMins({ episode_run_time: [], last_episode_to_air: { runtime: 47 } })).toBe(47)
  })

  it('falls back to the next episode when there is no last one', () => {
    expect(showRuntimeMins({ next_episode_to_air: { runtime: 30 } })).toBe(30)
  })

  it('treats zero, negative and null runtimes as missing', () => {
    expect(showRuntimeMins({ episode_run_time: [0], last_episode_to_air: { runtime: 50 } })).toBe(50)
    expect(showRuntimeMins({ episode_run_time: [-5], next_episode_to_air: { runtime: 25 } })).toBe(25)
    expect(showRuntimeMins({ episode_run_time: [], last_episode_to_air: { runtime: null } })).toBeNull()
  })

  it('returns null when TMDB offers nothing at all', () => {
    expect(showRuntimeMins({})).toBeNull()
    expect(showRuntimeMins({ episode_run_time: null, last_episode_to_air: null })).toBeNull()
  })
})

describe('fetchTmdbDetails for shows', () => {
  it('maps a runtime from last_episode_to_air when episode_run_time is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1396, name: 'Breaking Bad', overview: 'A show',
        poster_path: '/p.jpg', first_air_date: '2008-01-20',
        genres: [], episode_run_time: [],
        last_episode_to_air: { runtime: 47 },
        seasons: [{ season_number: 1, episode_count: 7 }],
        credits: { cast: [] },
      }),
    })
    const details = await fetchTmdbDetails(1396, 'show')
    expect(details.runtime_mins).toBe(47)
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

describe('discoverStreaming', () => {
  it('requests highest rated streaming movies with a vote count floor', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total_pages: 1 }),
    })

    await discoverStreaming('1899', 'movie', 2, 'rating')

    const url = new URL(mockFetch.mock.calls[0][0])
    expect(url.pathname).toBe('/3/discover/movie')
    expect(url.searchParams.get('with_watch_providers')).toBe('1899')
    expect(url.searchParams.get('sort_by')).toBe('vote_average.desc')
    expect(url.searchParams.get('vote_count.gte')).toBe('100')
    expect(url.searchParams.get('page')).toBe('2')
  })

  it('requests latest streaming shows by first air date', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], total_pages: 1 }),
    })

    await discoverStreaming('8', 'show', 1, 'latest')

    const url = new URL(mockFetch.mock.calls[0][0])
    expect(url.pathname).toBe('/3/discover/tv')
    expect(url.searchParams.get('sort_by')).toBe('first_air_date.desc')
    expect(url.searchParams.has('vote_count.gte')).toBe(false)
  })
})

describe('mapSeasonEpisodes', () => {
  it('maps the fields the tracker renders', () => {
    const episodes = mapSeasonEpisodes({
      episodes: [{
        episode_number: 1,
        name: 'Pilot',
        overview: 'A chemistry teacher.',
        air_date: '2008-01-20',
        runtime: 58,
        still_path: '/still.jpg',
      }],
    })

    expect(episodes).toEqual([{
      episode_number: 1,
      name: 'Pilot',
      air_date: '2008-01-20',
      overview: 'A chemistry teacher.',
      runtime_mins: 58,
      still_url: 'https://image.tmdb.org/t/p/w300/still.jpg',
    }])
  })

  it('turns TMDB\'s empty strings into nulls', () => {
    // air_date is a `date` column: inserting "" is an invalid_datetime_format
    // error, not an empty value, so this mapping is load-bearing.
    const [ep] = mapSeasonEpisodes({
      episodes: [{ episode_number: 1, name: '', overview: '  ', air_date: '', runtime: 0, still_path: null }],
    })
    expect(ep.air_date).toBeNull()
    expect(ep.name).toBeNull()
    expect(ep.overview).toBeNull()
    expect(ep.runtime_mins).toBeNull()
    expect(ep.still_url).toBeNull()
  })

  it('drops episodes that cannot be keyed on a number', () => {
    // episode_progress keys on (season_id, episode_number), so episode 0 —
    // TMDB uses it for some specials — has nowhere to go.
    const episodes = mapSeasonEpisodes({
      episodes: [
        { episode_number: 0, name: 'Special' },
        { name: 'Unnumbered' },
        { episode_number: 2, name: 'Real' },
      ],
    })
    expect(episodes.map(e => e.episode_number)).toEqual([2])
  })

  it('handles a season payload with no episodes at all', () => {
    expect(mapSeasonEpisodes({})).toEqual([])
  })
})

describe('fetchTmdbSeasonEpisodes', () => {
  it('requests the season endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ episodes: [] }) })
    await fetchTmdbSeasonEpisodes(1396, 2)
    expect(new URL(mockFetch.mock.calls[0][0]).pathname).toBe('/3/tv/1396/season/2')
  })

  it('throws when TMDB rejects the request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(fetchTmdbSeasonEpisodes(1396, 99)).rejects.toThrow('TMDB season failed: 404')
  })
})
