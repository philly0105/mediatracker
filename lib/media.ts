import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchTmdbDetails } from '@/lib/tmdb'
import type { Media, Season, MediaType } from '@/types'

export async function upsertMedia(
  supabase: SupabaseClient,
  tmdbId: number,
  type: MediaType
): Promise<{ media: Media; seasons: Season[] }> {
  // A title that's already cached can skip the TMDB round-trip. Movies have no
  // rows derived from the detail response; a show's seasons rows are, so we only
  // take the cached path once they already exist (otherwise the episode tracker
  // would have nothing to render). Residual staleness — a show that gained a
  // season since its last write — is bounded by the 7-day TMDB detail cache.
  //
  // Rows predating migration 004 have a null vote_average. Those must NOT take
  // the cached path: re-fetching is the only thing that backfills them, and
  // MediaCard still falls back to a per-card rating fetch while they're null.
  const { data: existing } = await supabase
    .from('media')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .eq('type', type)
    .maybeSingle()

  if (existing && existing.vote_average !== null && existing.vote_average !== undefined) {
    if (type === 'movie') return { media: existing, seasons: [] }
    const { data: cachedSeasons } = await supabase
      .from('seasons')
      .select('*')
      .eq('media_id', existing.id)
      .order('season_number', { ascending: true })
    if (cachedSeasons && cachedSeasons.length > 0) {
      return { media: existing, seasons: cachedSeasons }
    }
    // A cached show with no seasons yet still needs the detail response.
  }

  const details = await fetchTmdbDetails(tmdbId, type)

  const mediaRow: Record<string, unknown> = {
    tmdb_id: details.tmdb_id,
    type: details.type,
    title: details.title,
    overview: details.overview,
    poster_url: details.poster_url,
    genres: details.genres,
    release_year: details.release_year,
    runtime_mins: details.runtime_mins,
    director: details.director,
    cast_members: details.cast_members,
  }

  // Collection + rating fields were previously written in a second UPDATE; carry
  // them in the one upsert (migrations 003/004 add the columns).
  if (details.type === 'movie') {
    mediaRow.collection_id = details.belongs_to_collection?.id ?? null
    mediaRow.collection_name = details.belongs_to_collection?.name ?? null
  }
  if (details.vote_average !== undefined) {
    mediaRow.vote_average = details.vote_average
  }

  const { data: media, error } = await supabase
    .from('media')
    .upsert(mediaRow, { onConflict: 'tmdb_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert media: ${error.message}`)

  let seasons: Season[] = []

  if (type === 'show' && details.seasons) {
    const seasonRows = details.seasons.map(s => ({
      media_id: media.id,
      season_number: s.season_number,
      episode_count: s.episode_count,
    }))
    const { data: upsertedSeasons, error: sErr } = await supabase
      .from('seasons')
      .upsert(seasonRows, { onConflict: 'media_id,season_number' })
      .select()
    if (sErr) throw new Error(`Failed to upsert seasons: ${sErr.message}`)
    seasons = upsertedSeasons ?? []
  }

  return { media, seasons }
}
