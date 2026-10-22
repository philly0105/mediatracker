import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { upsertMedia } from '@/lib/media'
import { fetchTmdbDetails, type TmdbFullDetails } from '@/lib/tmdb'

vi.mock('@/lib/tmdb', () => ({ fetchTmdbDetails: vi.fn() }))

type Result = { data: unknown; error: { code?: string; message: string } | null }

// Just enough of the client for the movie path: one cached-row lookup, then
// upserts whose results are handed out in order.
function fakeSupabase(upsertResults: Result[]) {
  const upserts: Record<string, unknown>[] = []
  const client = {
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
      upsert: (row: Record<string, unknown>) => {
        upserts.push(row)
        return { select: () => ({ single: async () => upsertResults.shift() ?? { data: null, error: { message: 'unexpected upsert' } } }) }
      },
    })),
  }
  return { client: client as unknown as SupabaseClient, upserts }
}

function movieDetails(overrides: Partial<TmdbFullDetails> = {}): TmdbFullDetails {
  return {
    tmdb_id: 550, imdb_id: null, type: 'movie', title: 'Fight Club', overview: '',
    poster_url: null, genres: [], release_year: 1999, runtime_mins: 139,
    director: null, cast_members: [], belongs_to_collection: null, vote_average: 8.4,
    backdrop_url: 'https://image.tmdb.org/t/p/w1280/b.jpg',
    logo_url: 'https://image.tmdb.org/t/p/w500/l.png',
    tagline: null, certification: null,
    ...overrides,
  }
}

const saved = { data: { id: 'm1' }, error: null }

describe('upsertMedia', () => {
  beforeEach(() => { vi.mocked(fetchTmdbDetails).mockReset() })

  it('is exported and callable', () => {
    expect(typeof upsertMedia).toBe('function')
  })

  it('writes the backdrop and logo with the rest of the row', async () => {
    vi.mocked(fetchTmdbDetails).mockResolvedValueOnce(movieDetails())
    const { client, upserts } = fakeSupabase([saved])

    await upsertMedia(client, 550, 'movie')

    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({
      backdrop_url: 'https://image.tmdb.org/t/p/w1280/b.jpg',
      logo_url: 'https://image.tmdb.org/t/p/w500/l.png',
      vote_average: 8.4,
    })
  })

  it('leaves art TMDB no longer returns out of the write, so the stored value survives', async () => {
    vi.mocked(fetchTmdbDetails).mockResolvedValueOnce(movieDetails({ backdrop_url: null, logo_url: null }))
    const { client, upserts } = fakeSupabase([saved])

    await upsertMedia(client, 550, 'movie')

    expect(upserts[0]).not.toHaveProperty('backdrop_url')
    expect(upserts[0]).not.toHaveProperty('logo_url')
  })

  it('still records the rating and refresh time when only migration 014 is missing', async () => {
    vi.mocked(fetchTmdbDetails).mockResolvedValueOnce(movieDetails())
    const { client, upserts } = fakeSupabase([
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'backdrop_url' column" } },
      saved,
    ])

    const { media } = await upsertMedia(client, 550, 'movie')

    expect(media).toEqual({ id: 'm1' })
    expect(upserts).toHaveLength(2)
    expect(upserts[1]).not.toHaveProperty('backdrop_url')
    expect(upserts[1]).toHaveProperty('vote_average', 8.4)
    expect(upserts[1]).toHaveProperty('metadata_refreshed_at')
  })

  it('falls back to the base row on a database without the 003/004/013 columns either', async () => {
    vi.mocked(fetchTmdbDetails).mockResolvedValueOnce(movieDetails())
    const missing = { data: null, error: { code: '42703', message: 'column does not exist' } }
    const { client, upserts } = fakeSupabase([missing, missing, saved])

    await upsertMedia(client, 550, 'movie')

    expect(upserts).toHaveLength(3)
    expect(upserts[2]).not.toHaveProperty('vote_average')
    expect(upserts[2]).not.toHaveProperty('metadata_refreshed_at')
    expect(upserts[2]).toHaveProperty('title', 'Fight Club')
  })

  it('does not retry on errors other than a missing column', async () => {
    vi.mocked(fetchTmdbDetails).mockResolvedValueOnce(movieDetails())
    const { client, upserts } = fakeSupabase([{ data: null, error: { code: '23505', message: 'duplicate key' } }])

    await expect(upsertMedia(client, 550, 'movie')).rejects.toThrow('Failed to upsert media: duplicate key')
    expect(upserts).toHaveLength(1)
  })
})
