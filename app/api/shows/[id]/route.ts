import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { loadShowDetails } from '@/lib/showDetails'
import type { WatchEntry } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // The show page re-reads the entry after a rating or a mark-as-watched, and
  // only ever uses `entry` from the result. Without this it pulled the media
  // row, every season and every episode-progress row to read back one value.
  if (request.nextUrl.searchParams.get('only') === 'entry') {
    const { data: entry, error } = await supabase
      .from('watch_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('media_id', id)
      .order('watched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: (entry ?? null) as WatchEntry | null })
  }

  try {
    const details = await loadShowDetails({
      supabase,
      userId: user.id,
      mediaId: id,
    })

    if (!details) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    return NextResponse.json(details)
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'Failed to load show details'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
