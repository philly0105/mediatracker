import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id || !type || (type !== 'movie' && type !== 'show')) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  try {
    // This route backs the most-opened surface in the app, and it used to walk
    // four round trips end to end: TMDB, then the media lookup, then the
    // watch/watchlist pair, then — for a show — the follow check on its own.
    // The TMDB call and the media lookup share no inputs, and the follow check
    // needs the same media.id the other two do, so it is two rounds.
    const [details, { data: media }] = await Promise.all([
      fetchTmdbDetails(Number(id), type),
      supabase
        .from('media')
        .select('id')
        .eq('tmdb_id', Number(id))
        .eq('type', type)
        .maybeSingle(),
    ])

    // Check user status
    let isWatched = false
    let isWatchlisted = false
    let isFollowed = false
    let watch_entry: { id: string; rating: number | null; watched_at: string } | null = null

    if (media) {
      const [watchRes, watchlistRes, followRes] = await Promise.all([
        // The latest row (rewatches included) is what the modal dates and rates in place.
        supabase.from('watch_entries').select('id, rating, watched_at').eq('user_id', user.id).eq('media_id', media.id).order('watched_at', { ascending: false }).limit(1),
        supabase.from('watchlist_items').select('id').eq('user_id', user.id).eq('media_id', media.id).limit(1),
        type === 'show'
          ? supabase.from('followed_shows').select('id').eq('user_id', user.id).eq('media_id', media.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      isWatched = !!(watchRes.data && watchRes.data.length > 0)
      if (watchRes.data && watchRes.data.length > 0) {
        watch_entry = { id: watchRes.data[0].id, rating: watchRes.data[0].rating ?? null, watched_at: watchRes.data[0].watched_at }
      }
      isWatchlisted = !!(watchlistRes.data && watchlistRes.data.length > 0)
      isFollowed = !!followRes.data
    }

    // media_id lets the client link to /show/[id] for episode tracking without
    // a second round-trip. Null when the title isn't cached locally yet — in
    // which case no seasons rows exist to track against either.
    return NextResponse.json({
      ...details,
      media_id: media?.id ?? null,
      watch_entry,
      isWatched,
      isWatchlisted,
      isFollowed,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
