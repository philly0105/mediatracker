import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import type { Media, Season, EpisodeProgress, WatchEntry } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const latestEntry = () =>
    supabase
      .from('watch_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('media_id', id)
      .order('watched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

  // The show page re-reads the entry after a rating or a mark-as-watched, and
  // only ever uses `entry` from the result. Without this it pulled the media
  // row, every season and every episode-progress row to read back one value.
  if (request.nextUrl.searchParams.get('only') === 'entry') {
    const { data: entry } = await latestEntry()
    return NextResponse.json({ entry: (entry ?? null) as WatchEntry | null })
  }

  const [{ data: media }, { data: seasons }, { data: entry }] = await Promise.all([
    supabase.from('media').select('*').eq('id', id).maybeSingle(),
    supabase.from('seasons').select('*').eq('media_id', id).order('season_number'),
    latestEntry(),
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
