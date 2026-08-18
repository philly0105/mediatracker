import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Media, Season, EpisodeProgress, WatchEntry } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: media }, { data: seasons }, { data: entry }] = await Promise.all([
    supabase.from('media').select('*').eq('id', id).maybeSingle(),
    supabase.from('seasons').select('*').eq('media_id', id).order('season_number'),
    supabase
      .from('watch_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('media_id', id)
      .order('watched_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!media) {
    return NextResponse.json({ error: 'Show not found' }, { status: 404 })
  }

  const seasonList: Season[] = seasons ?? []
  const seasonIds = seasonList.map((s) => s.id)
  let progress: EpisodeProgress[] = []
  if (seasonIds.length > 0) {
    const { data: progressRows } = await supabase
      .from('episode_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('season_id', seasonIds)
    progress = progressRows ?? []
  }

  return NextResponse.json({
    media: media as Media,
    seasons: seasonList,
    entry: (entry ?? null) as WatchEntry | null,
    progress,
  })
}
