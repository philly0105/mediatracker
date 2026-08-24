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
  const [{ data: media }, { data: seasons }, { data: entry }] = await Promise.all([
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

  if (!media) {
    return null
  }

  const seasonList: Season[] = (seasons ?? []) as Season[]
  const seasonIds = seasonList.map((s) => s.id)
  let progress: EpisodeProgress[] = []
  if (seasonIds.length > 0) {
    const { data: progressRows } = await supabase
      .from('episode_progress')
      .select('*')
      .eq('user_id', userId)
      .in('season_id', seasonIds)
    progress = (progressRows ?? []) as EpisodeProgress[]
  }

  return {
    media: media as Media,
    seasons: seasonList,
    entry: (entry ?? null) as WatchEntry | null,
    progress,
  }
}
