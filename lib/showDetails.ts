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
  const [mediaRes, seasonsRes, entryRes] = await Promise.all([
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

  const seasonList: Season[] = (seasonsRes.data ?? []) as Season[]
  const seasonIds = seasonList.map((s) => s.id)
  let progress: EpisodeProgress[] = []
  if (seasonIds.length > 0) {
    const progressRes = await supabase
      .from('episode_progress')
      .select('*')
      .eq('user_id', userId)
      .in('season_id', seasonIds)
    if (progressRes.error) {
      throw progressRes.error
    }
    progress = (progressRes.data ?? []) as EpisodeProgress[]
  }

  return {
    media: mediaRes.data as Media,
    seasons: seasonList,
    entry: (entryRes.data ?? null) as WatchEntry | null,
    progress,
  }
}
