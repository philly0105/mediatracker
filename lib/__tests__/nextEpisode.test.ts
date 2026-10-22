import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchNextEpisodes } from '@/lib/nextEpisode'
import { fetchTmdbSeasonEpisodes, type TmdbSeasonEpisode } from '@/lib/tmdb'

vi.mock('@/lib/tmdb', () => ({ fetchTmdbSeasonEpisodes: vi.fn() }))

type Result = { data: unknown[] | null; error: { code?: string; message: string } | null }

// Records the filters of the one episodes read and answers it with `result`.
function fakeSupabase(result: Result) {
  const calls: { table: string; select?: string; ins: [string, unknown[]][] } = { table: '', ins: [] }
  const builder = {
    select: (s: string) => { calls.select = s; return builder },
    in: (col: string, vals: unknown[]) => { calls.ins.push([col, vals]); return builder },
    then: (resolve: (value: Result) => void) => resolve(result),
  }
  const client = { from: (table: string) => { calls.table = table; return builder } }
  return { client: client as unknown as SupabaseClient, calls }
}

const row = (season_id: string, episode_number: number, name: string) => ({
  season_id, episode_number, name, runtime_mins: 53, air_date: '2025-02-27',
  still_url: `https://image.tmdb.org/t/p/w300/${name}.jpg`, overview: `${name} overview`,
})

const tmdbEpisode = (episode_number: number, name: string): TmdbSeasonEpisode => ({
  episode_number, name, runtime_mins: 30, air_date: '2024-06-26',
  still_url: `https://image.tmdb.org/t/p/w300/${name}.jpg`, overview: null,
})

const severance = { tmdbId: 95396, nextUp: { season_id: 'sev-s2', season_number: 2, episode_number: 7 } }
const bear = { tmdbId: 136315, nextUp: { season_id: 'bear-s3', season_number: 3, episode_number: 2 } }

describe('fetchNextEpisodes', () => {
  beforeEach(() => { vi.mocked(fetchTmdbSeasonEpisodes).mockReset() })

  it('reads every show from the episodes cache in one query', async () => {
    const { client, calls } = fakeSupabase({
      data: [row('sev-s2', 7, 'Chikhai Bardo'), row('bear-s3', 2, 'Next'), row('bear-s3', 7, 'Other')],
      error: null,
    })

    const result = await fetchNextEpisodes(client, [severance, bear])

    expect(calls.table).toBe('episodes')
    expect(calls.ins).toEqual([['season_id', ['sev-s2', 'bear-s3']], ['episode_number', [7, 2]]])
    expect(result).toEqual([
      { name: 'Chikhai Bardo', runtime_mins: 53, air_date: '2025-02-27', still_url: 'https://image.tmdb.org/t/p/w300/Chikhai Bardo.jpg', overview: 'Chikhai Bardo overview' },
      { name: 'Next', runtime_mins: 53, air_date: '2025-02-27', still_url: 'https://image.tmdb.org/t/p/w300/Next.jpg', overview: 'Next overview' },
    ])
    expect(fetchTmdbSeasonEpisodes).not.toHaveBeenCalled()
  })

  it('fills a show the cache does not have from TMDB, keeping the input order', async () => {
    const { client } = fakeSupabase({ data: [row('sev-s2', 7, 'Chikhai Bardo')], error: null })
    vi.mocked(fetchTmdbSeasonEpisodes).mockResolvedValue([tmdbEpisode(1, 'Tomorrow'), tmdbEpisode(2, 'Next')])

    const [first, second] = await fetchNextEpisodes(client, [bear, severance])

    expect(fetchTmdbSeasonEpisodes).toHaveBeenCalledExactlyOnceWith(136315, 3)
    expect(first).toEqual({ name: 'Next', runtime_mins: 30, air_date: '2024-06-26', still_url: 'https://image.tmdb.org/t/p/w300/Next.jpg', overview: null })
    expect(second?.name).toBe('Chikhai Bardo')
  })

  it('goes to TMDB for everything when the episodes table cannot be read', async () => {
    const { client } = fakeSupabase({ data: null, error: { code: '42P01', message: 'relation "episodes" does not exist' } })
    vi.mocked(fetchTmdbSeasonEpisodes).mockResolvedValue([tmdbEpisode(7, 'Chikhai Bardo')])

    const [episode] = await fetchNextEpisodes(client, [severance])
    expect(fetchTmdbSeasonEpisodes).toHaveBeenCalledWith(95396, 2)
    expect(episode?.name).toBe('Chikhai Bardo')
  })

  it('returns null for an episode neither source has, and when TMDB fails', async () => {
    const { client } = fakeSupabase({ data: [], error: null })
    vi.mocked(fetchTmdbSeasonEpisodes)
      .mockResolvedValueOnce([tmdbEpisode(1, 'Only one')])
      .mockRejectedValueOnce(new Error('TMDB season failed: 504'))

    expect(await fetchNextEpisodes(client, [severance, bear])).toEqual([null, null])
  })

  it('does not query anything for no shows', async () => {
    const { client, calls } = fakeSupabase({ data: [], error: null })
    expect(await fetchNextEpisodes(client, [])).toEqual([])
    expect(calls.table).toBe('')
  })
})
