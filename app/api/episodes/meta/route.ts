import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { fetchTmdbSeasonEpisodes } from '@/lib/tmdb'
import type { Episode, Season } from '@/types'

// Episode titles and air dates for one show, filling from TMDB on first read.
//
// There is deliberately no backfill script. upsertMedia writes a show's seasons
// from the /tv/:id payload, which carries episode *counts* only — getting names
// means one extra request per season, so doing it at ingest would make marking a
// 10-season show watched cost ten TMDB round-trips before the write returns.
// Filling here instead means a show pays that cost once, the first time someone
// opens its page, and every show already in the library heals itself the same
// way. The rows are shared cache, so it happens once for all users.

const CONCURRENCY = 3

// A season whose episode list TMDB is short on (or has none of) would otherwise
// be re-fetched on every page load forever. This bounds that to one attempt per
// season per window. It is per-instance and lost on cold start, which is the
// right trade: worst case is a few extra requests, not a wrong answer.
const RETRY_COOLDOWN_MS = 6 * 60 * 60 * 1000
const lastAttempt = new Map<string, number>()

// Claims rather than merely selects: the returned seasons are marked as tried,
// so two page loads in a row do not both go to TMDB for the same short season.
export function claimSeasonsNeedingFill(
  seasons: Pick<Season, 'id' | 'season_number' | 'episode_count'>[],
  episodes: Pick<Episode, 'season_id'>[],
  now = Date.now()
): Pick<Season, 'id' | 'season_number' | 'episode_count'>[] {
  const counts = new Map<string, number>()
  for (const e of episodes) counts.set(e.season_id, (counts.get(e.season_id) ?? 0) + 1)

  const claimed = seasons.filter((s) => {
    // `<` rather than `=== 0` so a season that gained episodes since it was
    // cached picks the new ones up.
    if ((counts.get(s.id) ?? 0) >= s.episode_count) return false
    const previous = lastAttempt.get(s.id)
    return previous === undefined || now - previous > RETRY_COOLDOWN_MS
  })
  for (const s of claimed) lastAttempt.set(s.id, now)
  return claimed
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mediaId = new URL(request.url).searchParams.get('media_id')
  if (!mediaId) return NextResponse.json({ error: 'media_id required' }, { status: 400 })

  const { data: media } = await supabase
    .from('media')
    .select('id, tmdb_id, type')
    .eq('id', mediaId)
    .maybeSingle()

  if (!media || media.type !== 'show') {
    return NextResponse.json({ error: 'Not a show in the library' }, { status: 404 })
  }

  const { data: seasonRows, error: seasonError } = await supabase
    .from('seasons')
    .select('id, season_number, episode_count')
    .eq('media_id', mediaId)

  if (seasonError) return NextResponse.json({ error: seasonError.message }, { status: 500 })
  const seasons = seasonRows ?? []
  if (seasons.length === 0) return NextResponse.json({ episodes: [] })

  const seasonIds = seasons.map((s) => s.id)
  const { data: cached, error: episodeError } = await supabase
    .from('episodes')
    .select('*')
    .in('season_id', seasonIds)

  // The table lands in migration 008. A database that has not run it yet should
  // degrade to numbered episodes, not 500 the show page.
  if (episodeError) {
    if (episodeError.code === '42P01') return NextResponse.json({ episodes: [] })
    return NextResponse.json({ error: episodeError.message }, { status: 500 })
  }

  const missing = claimSeasonsNeedingFill(seasons, cached ?? [])
  if (missing.length === 0) return NextResponse.json({ episodes: cached ?? [] })

  const written: Episode[] = []
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const chunk = missing.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map(async (season) => {
      try {
        const episodes = await fetchTmdbSeasonEpisodes(media.tmdb_id, season.season_number)
        if (episodes.length === 0) return
        const { data, error } = await supabase
          .from('episodes')
          .upsert(
            episodes.map((e) => ({ season_id: season.id, ...e })),
            { onConflict: 'season_id,episode_number' }
          )
          .select()
        // A failure here is not fatal — the tracker falls back to E-numbers.
        if (error) console.error(`episodes fill (season ${season.season_number}):`, error.message)
        else written.push(...(data ?? []))
      } catch (err) {
        console.error(`episodes fill (season ${season.season_number}):`, err)
      }
    }))
  }

  // Freshly written rows win over the cached copy of the same episode.
  const byKey = new Map<string, Episode>()
  for (const e of [...(cached ?? []), ...written]) {
    byKey.set(`${e.season_id}-${e.episode_number}`, e)
  }
  return NextResponse.json({ episodes: [...byKey.values()] })
}
