import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTopRecommendation, type SeedRow } from '@/lib/recommendations'
import { fetchTmdbRecommendations, fetchTmdbTrending } from '@/lib/tmdb'
import type { TmdbSearchResult } from '@/types'

vi.mock('@/lib/tmdb', () => ({
  fetchTmdbRecommendations: vi.fn(),
  fetchTmdbTrending: vi.fn(),
  discoverByGenre: vi.fn(),
}))

// Answers the watched / watchlisted id reads and the seed tiers (told apart by
// the filter each tier adds), like the route's own tests.
//
// The two id reads honour .range() the way PostgREST does, capped at the same
// 1000 rows it caps a response at. A fake that served every row regardless
// could not tell a paged read from an unpaged one, which is the whole point of
// the exclusion-set test below.
const POSTGREST_MAX_ROWS = 1000

function fakeSupabase({
  watched = [] as number[],
  watchlist = [] as number[],
  loved = [] as SeedRow[],
  recent = [] as SeedRow[],
  readError = null as string | null,
}) {
  return {
    from: (table: string) => {
      let select = ''
      let tier: 'loved' | 'rated' | 'recent' = 'recent'
      let first = 0
      let last = POSTGREST_MAX_ROWS - 1
      const builder = {
        select: (s: string) => { select = s; return builder },
        eq: () => builder,
        limit: () => builder,
        order: () => builder,
        gte: () => { tier = 'loved'; return builder },
        not: () => { tier = 'rated'; return builder },
        range: (from: number, to: number) => {
          first = from
          last = Math.min(to, from + POSTGREST_MAX_ROWS - 1)
          return builder
        },
        then: (resolve: (value: { data: unknown[] | null; error?: { message: string } }) => void) => {
          const window = (ids: number[]) =>
            ids.slice(first, last + 1).map((tmdb_id) => ({ media: { tmdb_id } }))
          const isIdRead = table === 'watchlist_items' || select === 'media!inner(tmdb_id)'
          if (isIdRead && readError) return resolve({ data: null, error: { message: readError } })
          if (table === 'watchlist_items') return resolve({ data: window(watchlist) })
          if (select === 'media!inner(tmdb_id)') return resolve({ data: window(watched) })
          resolve({ data: tier === 'loved' ? loved : tier === 'rated' ? [] : recent })
        },
      }
      return builder
    },
  } as unknown as Parameters<typeof getTopRecommendation>[0]
}

const seed = (id: number, rating: number | null, title: string): SeedRow =>
  ({ rating, media: { tmdb_id: id, type: 'show', title } })

const rec = (id: number, title: string): TmdbSearchResult => ({
  tmdb_id: id, type: 'show', title, overview: '', poster_url: null, release_year: 2025,
  genres: ['Drama'], backdrop_url: `https://image.tmdb.org/t/p/w1280/${id}.jpg`,
})

describe('getTopRecommendation', () => {
  beforeEach(() => {
    vi.mocked(fetchTmdbRecommendations).mockReset()
    vi.mocked(fetchTmdbTrending).mockReset()
  })

  it('returns the highest-scored pick with its seed title and backdrop', async () => {
    const supabase = fakeSupabase({
      watched: [136315],
      loved: [seed(95396, 5, 'Severance'), seed(95480, 4, 'Slow Horses')],
    })
    vi.mocked(fetchTmdbRecommendations).mockImplementation(async (id) =>
      id === 95396
        ? [rec(136315, 'The Bear'), rec(225171, 'Pluribus'), rec(83867, 'Andor')]
        : [rec(225171, 'Pluribus')]
    )

    expect(await getTopRecommendation(supabase, 'user-1')).toEqual({
      ...rec(225171, 'Pluribus'),
      seed_title: 'Severance',
    })
  })

  it('breaks a score tie in seed order, as the Recommendations page does', async () => {
    const supabase = fakeSupabase({ recent: [seed(1, null, 'First'), seed(2, null, 'Second')] })
    vi.mocked(fetchTmdbRecommendations).mockImplementation(async (id) =>
      id === 1 ? [rec(10, 'From first')] : [rec(20, 'From second')]
    )

    const top = await getTopRecommendation(supabase, 'user-1')
    expect(top).toMatchObject({ tmdb_id: 10, seed_title: 'First' })
  })

  it('is null with no history, without fetching trending', async () => {
    expect(await getTopRecommendation(fakeSupabase({}), 'user-1')).toBeNull()
    expect(fetchTmdbTrending).not.toHaveBeenCalled()
    expect(fetchTmdbRecommendations).not.toHaveBeenCalled()
  })

  it('is null when every recommendation is already in the library', async () => {
    const supabase = fakeSupabase({ watchlist: [225171], loved: [seed(95396, 5, 'Severance')] })
    vi.mocked(fetchTmdbRecommendations).mockResolvedValue([rec(225171, 'Pluribus')])
    expect(await getTopRecommendation(supabase, 'user-1')).toBeNull()
  })

  it('excludes a watched title past PostgREST\'s 1000-row cap', async () => {
    // The exclusion set is the one read where a silent truncation is a wrong
    // answer rather than a short list: unpaged, everything from the 1001st
    // entry on was invisible here and got recommended back to the user, with
    // a ✓ already painted on it by /api/library/ids.
    const watched = Array.from({ length: 1001 }, (_, i) => 1000 + i)
    const supabase = fakeSupabase({ watched, loved: [seed(95396, 5, 'Severance')] })
    vi.mocked(fetchTmdbRecommendations).mockResolvedValue([rec(2000, 'Already watched'), rec(42, 'Genuinely new')])

    expect(await getTopRecommendation(supabase, 'user-1')).toMatchObject({ tmdb_id: 42 })
  })

  it('pages the watchlist read too', async () => {
    const watchlist = Array.from({ length: 1200 }, (_, i) => 5000 + i)
    const supabase = fakeSupabase({ watchlist, loved: [seed(95396, 5, 'Severance')] })
    vi.mocked(fetchTmdbRecommendations).mockResolvedValue([rec(6199, 'Already shortlisted'), rec(42, 'Genuinely new')])

    expect(await getTopRecommendation(supabase, 'user-1')).toMatchObject({ tmdb_id: 42 })
  })

  it('refuses to answer when the library read fails', async () => {
    // Half an exclusion set recommends films the user has already seen, which
    // is worse than the page's error card.
    const supabase = fakeSupabase({ readError: 'connection reset', loved: [seed(95396, 5, 'Severance')] })
    await expect(getTopRecommendation(supabase, 'user-1')).rejects.toThrow('connection reset')
  })

  it('survives a seed whose TMDB request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = fakeSupabase({ loved: [seed(1, 5, 'Broken'), seed(2, 5, 'Fine')] })
    vi.mocked(fetchTmdbRecommendations).mockImplementation(async (id) => {
      if (id === 1) throw new Error('TMDB down')
      return [rec(30, 'Pick')]
    })
    expect(await getTopRecommendation(supabase, 'user-1')).toMatchObject({ tmdb_id: 30, seed_title: 'Fine' })
  })
})
