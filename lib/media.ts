import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchTmdbDetails } from '@/lib/tmdb'
import type { Media, Season, MediaType } from '@/types'

export async function upsertMedia(
  supabase: SupabaseClient,
  tmdbId: number,
  type: MediaType
): Promise<{ media: Media; seasons: Season[] }> {
  const details = await fetchTmdbDetails(tmdbId, type)

  const mediaRow = {
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

  const { data: media, error } = await supabase
    .from('media')
    .upsert(mediaRow, { onConflict: 'tmdb_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert media: ${error.message}`)

  // Best-effort: update collection fields (requires migration 003_collections.sql)
  if (details.type === 'movie') {
    await supabase
      .from('media')
      .update({
        collection_id: details.belongs_to_collection?.id ?? null,
        collection_name: details.belongs_to_collection?.name ?? null,
      })
      .eq('id', media.id)
    // ignore error — columns may not exist until migration is applied
  }

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
