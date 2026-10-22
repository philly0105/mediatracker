import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchTmdbSeasonEpisodes } from '@/lib/tmdb'
import type { Episode } from '@/types'

export type NextEpisodeDetails = Pick<Episode, 'name' | 'runtime_mins' | 'air_date' | 'still_url' | 'overview'>

// What findNextUp returns.
export type NextUpEpisode = { season_id: string; season_number: number; episode_number: number }

type EpisodeRow = NextEpisodeDetails & { season_id: string; episode_number: number }

/**
 * Name, runtime, air date, still and synopsis of each show's next-up episode,
 * in the order the shows are given (null where neither source has it).
 *
 * The episodes table is the cache /api/episodes/meta fills the first time a
 * show page opens, so a show only ever tracked from Home may not be in it yet.
 * Those fall back to TMDB's season list, which is fetch-cached for a week. This
 * never writes the cache: that stays the meta route's job.
 */
export async function fetchNextEpisodes(
  supabase: SupabaseClient,
  shows: Array<{ tmdbId: number; nextUp: NextUpEpisode }>
): Promise<Array<NextEpisodeDetails | null>> {
  if (shows.length === 0) return []

  // One read for every show. The two in() filters can match a few extra rows
  // (another show's episode with the same number); the lookup below drops them.
  const { data, error } = await supabase
    .from('episodes')
    .select('season_id, episode_number, name, runtime_mins, air_date, still_url, overview')
    .in('season_id', [...new Set(shows.map((s) => s.nextUp.season_id))])
    .in('episode_number', [...new Set(shows.map((s) => s.nextUp.episode_number))])

  // An error (the table predates migration 008, say) just means every show
  // goes to TMDB instead.
  const cached = new Map<string, NextEpisodeDetails>()
  for (const row of (error ? [] : data ?? []) as EpisodeRow[]) {
    cached.set(`${row.season_id}-${row.episode_number}`, {
      name: row.name,
      runtime_mins: row.runtime_mins,
      air_date: row.air_date,
      still_url: row.still_url,
      overview: row.overview,
    })
  }

  return Promise.all(shows.map(async ({ tmdbId, nextUp }) => {
    const hit = cached.get(`${nextUp.season_id}-${nextUp.episode_number}`)
    if (hit) return hit
    try {
      const episode = (await fetchTmdbSeasonEpisodes(tmdbId, nextUp.season_number))
        .find((e) => e.episode_number === nextUp.episode_number)
      if (!episode) return null
      return {
        name: episode.name,
        runtime_mins: episode.runtime_mins,
        air_date: episode.air_date,
        still_url: episode.still_url,
        overview: episode.overview,
      }
    } catch {
      // TMDB being down costs the card its still and title, not the page.
      return null
    }
  }))
}
