import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchTmdbDetails } from '@/lib/tmdb'
import type { Media, Season, MediaType } from '@/types'

// 7-day freshness bound for cached TMDB metadata. Matches the 7-day detail
// cache window used in lib/tmdb.ts: metadata like overviews, cast, and seasons
// changes infrequently, but shows do gain seasons and upstream fixes happen.
const METADATA_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function upsertMedia(
  supabase: SupabaseClient,
  tmdbId: number,
  type: MediaType
): Promise<{ media: Media; seasons: Season[] }> {
  // A title that's already cached can skip the TMDB round-trip if its metadata is
  // fresh (within the 7-day TTL). Movies have no rows derived from the detail
  // response; a show's seasons rows are, so we only take the cached path once
  // they already exist (otherwise the episode tracker would have nothing to render).
  // A null or expired metadata_refreshed_at falls through to re-fetch from TMDB,
  // catching upstream metadata corrections and newly aired seasons.
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

  const isFresh =
    Boolean(existing?.metadata_refreshed_at) &&
    new Date(existing.metadata_refreshed_at).getTime() > Date.now() - METADATA_TTL_MS

  if (existing && isFresh && existing.vote_average !== null && existing.vote_average !== undefined) {
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

  // Collection + rating live in migrations 003/004, and refreshed_at in 013. Carry
  // them in the one upsert when those columns exist, but they are NOT guaranteed to:
  // the original code wrote them in a separate best-effort UPDATE precisely because
  // a database can be on 001/002 only. Putting them in the main upsert unconditionally
  // makes the whole write fail with "column does not exist", which would break marking
  // anything watched. So: try the full row, and fall back to the base columns.
  const optionalFields: Record<string, unknown> = {
    metadata_refreshed_at: new Date().toISOString(),
  }
  if (details.type === 'movie') {
    optionalFields.collection_id = details.belongs_to_collection?.id ?? null
    optionalFields.collection_name = details.belongs_to_collection?.name ?? null
  }
  if (details.vote_average !== undefined) {
    optionalFields.vote_average = details.vote_average
  }

  // Artwork lives in migration 014. This refresh is also how rows that predate
  // it get their art: once metadata_refreshed_at goes stale, the next write
  // lands here. Each key is only sent when TMDB has a value, because an upsert
  // updates just the columns it is given, and a title whose logo TMDB has since
  // pulled should keep the one it had rather than lose it.
  const artFields: Record<string, unknown> = {}
  if (details.backdrop_url) artFields.backdrop_url = details.backdrop_url
  if (details.logo_url) artFields.logo_url = details.logo_url

  const upsertRow = (row: Record<string, unknown>) =>
    supabase.from('media').upsert(row, { onConflict: 'tmdb_id,type' }).select().single()
  // PGRST204 = column not found in schema cache; 42703 = undefined_column.
  const isMissingColumn = (err: { code?: string } | null) =>
    err?.code === 'PGRST204' || err?.code === '42703'

  let { data: media, error } = await upsertRow({ ...mediaRow, ...optionalFields, ...artFields })

  // Step down one migration at a time. Dropping straight to the base row when
  // only 014 is missing would also stop writing vote_average and
  // metadata_refreshed_at, and without the latter every write re-fetches TMDB.
  if (error && isMissingColumn(error) && Object.keys(artFields).length > 0) {
    ;({ data: media, error } = await upsertRow({ ...mediaRow, ...optionalFields }))
  }
  if (error && isMissingColumn(error)) {
    ;({ data: media, error } = await upsertRow(mediaRow))
  }

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
