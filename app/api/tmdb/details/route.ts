import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id || !type || (type !== 'movie' && type !== 'show')) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  try {
    const details = await fetchTmdbDetails(Number(id), type)

    // Check user status
    let isWatched = false
    let isWatchlisted = false
    
    const { data: media } = await supabase
      .from('media')
      .select('id')
      .eq('tmdb_id', Number(id))
      .eq('type', type)
      .single()

    if (media) {
      const [watchRes, watchlistRes] = await Promise.all([
        supabase.from('watch_entries').select('id').eq('user_id', user.id).eq('media_id', media.id).limit(1),
        supabase.from('watchlist_items').select('id').eq('user_id', user.id).eq('media_id', media.id).limit(1)
      ])
      isWatched = !!(watchRes.data && watchRes.data.length > 0)
      isWatchlisted = !!(watchlistRes.data && watchlistRes.data.length > 0)
    }

    return NextResponse.json({ ...details, isWatched, isWatchlisted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
