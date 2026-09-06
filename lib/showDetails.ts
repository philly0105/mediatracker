import type { SupabaseClient } from '@supabase/supabase-js'
import type { Media, Season, EpisodeProgress, WatchEntry } from '@/types'

export interface ShowDetails {
  media: Media
  seasons: Season[]
  entry: WatchEntry | null
  progress: EpisodeProgress[]
}

export async function loadShowDetails({
  supabase,
  userId,
  mediaId,
}: {
  supabase: SupabaseClient
  userId: string
  mediaId: string
}): Promise<ShowDetails | null> {
  // Progress used to be a second round trip, because it was filtered by the
  // season ids the query above returns. Joining through seasons filters on
  // media_id directly, which is the same rows in one round instead of two —
  // and this runs on every show page load.
  const [mediaRes, seasonsRes, entryRes, progressRes] = await Promise.all([
    supabase.from('media').select('*').eq('id', mediaId).maybeSingle(),
    supabase.from('seasons').select('*').eq('media_id', mediaId).order('season_number'),
    supabase
      .from('watch_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('media_id', mediaId)
      .order('watched_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('episode_progress')
      // !inner is what makes the eq() below filter episode_progress rows rather
      // than just the embedded seasons object.
      .select('*, seasons!inner(media_id)')
      .eq('user_id', userId)
      .eq('seasons.media_id', mediaId),
  ])

  if (mediaRes.error) {
    throw mediaRes.error
  }
  if (seasonsRes.error) {
    throw seasonsRes.error
  }
  if (entryRes.error) {
    throw entryRes.error
  }

  if (!mediaRes.data) {
    return null
  }

  if (progressRes.error) {
    throw progressRes.error
  }

  const seasonList: Season[] = (seasonsRes.data ?? []) as Season[]
  // Named columns rather than a spread: the row carries the joined `seasons`
  // object, and callers get the plain EpisodeProgress shape they always had.
  const progress: EpisodeProgress[] = (progressRes.data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    season_id: row.season_id,
    episode_number: row.episode_number,
    watched_at: row.watched_at,
  }))

  return {
    media: mediaRes.data as Media,
    seasons: seasonList,
    entry: (entryRes.data ?? null) as WatchEntry | null,
    progress,
  }
}
