import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/recommendations/route'
import * as serverAuth from '@/lib/supabase/server'
import * as tmdb from '@/lib/tmdb'
import type { MediaType, TmdbSearchResult } from '@/types'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/tmdb', () => ({
  fetchTmdbRecommendations: vi.fn(),
  fetchTmdbTrending: vi.fn(),
  discoverByGenre: vi.fn(),
}))

type Seed = { rating: number | null; media: { tmdb_id: number; type: MediaType; title: string } }

// Answers the route's three reads: the watched and watchlisted tmdb ids, and the
// seed tiers (told apart by the filter each tier adds).
function fakeSupabase({ watched = [] as number[], watchlist = [] as number[], loved = [] as Seed[], rated = [] as Seed[], recent = [] as Seed[] }) {
  return {
    from: (table: string) => {
      let select = ''
      let tier: 'loved' | 'rated' | 'recent' = 'recent'
      const builder = {
        select: (s: string) => { select = s; return builder },
        eq: () => builder,
        limit: () => builder,
        order: () => builder,
        gte: () => { tier = 'loved'; return builder },
        not: () => { tier = 'rated'; return builder },
        // The two id reads are paged through fetchAllRows; these fixtures are
        // all well under one page, so the window never matters here.
        range: () => builder,
        then: (resolve: (value: { data: unknown[] }) => void) => {
          if (table === 'watchlist_items') return resolve({ data: watchlist.map((tmdb_id) => ({ media: { tmdb_id } })) })
          if (select === 'media!inner(tmdb_id)') return resolve({ data: watched.map((tmdb_id) => ({ media: { tmdb_id } })) })
          resolve({ data: tier === 'loved' ? loved : tier === 'rated' ? rated : recent })
        },
      }
      return builder
    },
  }
}

function rec(id: number, overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return {
    tmdb_id: id, type: 'movie', title: `Title ${id}`, overview: '', poster_url: null,
    release_year: 2020, genres: ['Drama'], backdrop_url: `https://image.tmdb.org/t/p/w1280/${id}.jpg`,
    ...overrides,
  }
}

const seed = (id: number, rating: number | null, title = `Seed ${id}`): Seed =>
  ({ rating, media: { tmdb_id: id, type: 'movie', title } })

function get(query = '') {
  return GET(new NextRequest(`http://localhost/api/recommendations${query}`))
}

describe('GET /api/recommendations', () => {
  beforeEach(() => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue({ id: 'user-1' } as Awaited<ReturnType<typeof serverAuth.getAuthenticatedUser>>)
    vi.mocked(tmdb.fetchTmdbRecommendations).mockResolvedValue([])
    vi.mocked(tmdb.fetchTmdbTrending).mockResolvedValue([])
    vi.mocked(tmdb.discoverByGenre).mockResolvedValue({ results: [], total_pages: 0 })
  })

  function useSupabase(data: Parameters<typeof fakeSupabase>[0]) {
    vi.mocked(serverAuth.createClient).mockResolvedValue(fakeSupabase(data) as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>)
  }

  it('rejects a signed-out request', async () => {
    useSupabase({})
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(null)
    const res = await get()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('scores recommendations across seeds, credits the strongest seed and skips the library', async () => {
    useSupabase({ watched: [3], watchlist: [4], loved: [seed(100, 5, 'Severance'), seed(200, 4, 'The Bear')] })
    vi.mocked(tmdb.fetchTmdbRecommendations).mockImplementation(async (id) =>
      id === 100 ? [rec(1), rec(2), rec(3)] : [rec(2), rec(4), rec(5)]
    )

    const res = await get()
    const body = await res.json()

    expect(Object.keys(body)).toEqual(['results', 'fallback', 'hasMore'])
    expect(body.fallback).toBe(false)
    expect(body.hasMore).toBe(false)
    // 2 is recommended by both seeds, so it leads; 3 is watched and 4 watchlisted.
    expect(body.results.map((r: TmdbSearchResult) => r.tmdb_id)).toEqual([2, 1, 5])
    expect(body.results[0]).toMatchObject({ seed_title: 'Severance', backdrop_url: 'https://image.tmdb.org/t/p/w1280/2.jpg' })
    expect(body.results[2].seed_title).toBe('The Bear')
    expect(tmdb.fetchTmdbTrending).not.toHaveBeenCalled()
  })

  it('drops the ids the client already has', async () => {
    useSupabase({ loved: [seed(100, 5)] })
    vi.mocked(tmdb.fetchTmdbRecommendations).mockResolvedValue([rec(1), rec(2), rec(3)])

    const body = await (await get('?excludeIds=1,3,abc')).json()
    expect(body.results.map((r: TmdbSearchResult) => r.tmdb_id)).toEqual([2])
  })

  it('rotates the seed window by cycle', async () => {
    // cycle 1 is offset 15; in a pool of two that wraps to the second seed.
    useSupabase({ loved: [seed(100, 5), seed(200, 5)] })
    await get('?cycle=1')
    expect(vi.mocked(tmdb.fetchTmdbRecommendations).mock.calls.map(([id]) => id)).toEqual([200, 100])
  })

  it('falls back to trending only when there is no history at all', async () => {
    useSupabase({ watched: [7] })
    vi.mocked(tmdb.fetchTmdbTrending).mockImplementation(async (page = 1) => (page === 1 ? [rec(7), rec(8)] : []))

    const body = await (await get()).json()
    expect(tmdb.fetchTmdbTrending).toHaveBeenCalledTimes(5)
    expect(body).toEqual({ results: [rec(8)], fallback: true, hasMore: false })
  })

  it('tops a thin genre up from discover and reports more pages', async () => {
    useSupabase({ loved: [seed(100, 5)] })
    vi.mocked(tmdb.fetchTmdbRecommendations).mockResolvedValue([rec(1, { genres: ['Comedy'] })])
    vi.mocked(tmdb.discoverByGenre).mockResolvedValue({ results: [rec(1), rec(9, { genres: ['Comedy'] }), rec(10, { genres: ['Comedy'] })], total_pages: 3 })

    const body = await (await get('?genre=Comedy&type=movie&page=2')).json()
    expect(tmdb.discoverByGenre).toHaveBeenCalledWith('Comedy', 'movie', 2)
    expect(body.results.map((r: TmdbSearchResult) => r.tmdb_id)).toEqual([1, 9, 10])
    expect(body.hasMore).toBe(true)
  })
})
