import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { badRequest, parseMediaType, parseTmdbIdParam } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  // The id used to be taken on trust, so `?id=abc` became `/movie/NaN`, TMDB
  // 404ed, fetchTmdbDetails threw and the catch below answered 500 — a caller
  // error reported as ours.
  const idResult = parseTmdbIdParam(searchParams.get('id'))
  if (!idResult.ok) return badRequest(idResult.error)
  const typeResult = parseMediaType(searchParams.get('type'))
  if (!typeResult.ok) return badRequest(typeResult.error)

  const id = idResult.value
  const type = typeResult.value

  try {
    // This route backs the most-opened surface in the app, and it used to walk
    // four round trips end to end: TMDB, then the media lookup, then the
    // watch/watchlist pair, then — for a show — the follow check on its own.
    // The TMDB call and the media lookup share no inputs, and the follow check
    // needs the same media.id the other two do, so it is two rounds.
    const [details, { data: media }] = await Promise.all([
      fetchTmdbDetails(id, type),
      supabase
        .from('media')
        .select('id')
        .eq('tmdb_id', id)
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
    // The thrown message quotes TMDB's status ("TMDB details failed: 404"),
    // which told the caller about our upstream and nothing they could act on.
    // It stays in the server log; the client gets one flat message.
    console.error('GET /api/tmdb/details failed:', err)
    return NextResponse.json({ error: 'Could not load title details' }, { status: 500 })
  }
}
