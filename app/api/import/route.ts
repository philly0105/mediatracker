import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchTmdb } from '@/lib/tmdb'
import { upsertMedia } from '@/lib/media'
import { parseRating, parseDate, parseMediaType, badRequest } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, year, type, rating, date, review, status } = await request.json()
  if (!title || typeof title !== 'string' || !title.trim()) return badRequest('Title is required')

  if (type !== undefined && type !== null && type !== '') {
    const typeRes = parseMediaType(type)
    if (!typeRes.ok) return badRequest(typeRes.error)
  }

  let parsedRatingVal: number | null = null
  if (rating !== null && rating !== undefined && rating !== '') {
    const rNum = typeof rating === 'number' ? rating : Number(rating)
    const ratingRes = parseRating(rNum)
    if (!ratingRes.ok) return badRequest(ratingRes.error)
    parsedRatingVal = ratingRes.value
  }

  let parsedDateVal: string = new Date().toISOString().split('T')[0]
  if (date !== null && date !== undefined && date !== '') {
    const dateRes = parseDate(date)
    if (!dateRes.ok) return badRequest(dateRes.error)
    parsedDateVal = dateRes.value
  }

  const results = await searchTmdb(title.trim())
  if (results.length === 0) return NextResponse.json({ error: `"${title}" not found on TMDB` }, { status: 404 })

  // Prefer type match, then year match within those
  const targetType = type === 'show' ? 'show' : 'movie'
  const typeMatches = results.filter(r => r.type === targetType)
  let match = typeMatches[0] ?? results[0]
  if (year) {
    const yearNum = parseInt(year)
    const yearMatch = (typeMatches.length > 0 ? typeMatches : results).find(r => r.release_year === yearNum)
    if (yearMatch) match = yearMatch
  }

  const { media, seasons } = await upsertMedia(supabase, match.tmdb_id, match.type)

  // Skip if already in watch history / watchlist
  if (status !== 'watchlist') {
    const { data: existing } = await supabase
      .from('watch_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('media_id', media.id)
      .limit(1)
      .maybeSingle()
    if (existing) return NextResponse.json({ ok: true, matched: match.title, skipped: true })
  }

  if (status === 'watchlist') {
    const { error: wlErr } = await supabase.from('watchlist_items').upsert(
      // added_at is when the row entered the watchlist, not the CSV's watched
      // date — a watchlist import has no watch date to carry over.
      { user_id: user.id, media_id: media.id, priority: 'want_to_watch', added_at: new Date().toISOString().split('T')[0] },
      { onConflict: 'user_id,media_id' }
    )
    if (wlErr) return NextResponse.json({ error: wlErr.message }, { status: 500 })
  } else {
    const { error: weErr } = await supabase.from('watch_entries').insert({
      user_id: user.id,
      media_id: media.id,
      rating: parsedRatingVal,
      review: typeof review === 'string' ? review : null,
      watched_at: parsedDateVal,
    })
    if (weErr) return NextResponse.json({ error: weErr.message }, { status: 500 })

    // For shows, mark every episode as watched
    if (match.type === 'show' && seasons.length > 0) {
      const episodeRows = seasons.flatMap(season =>
        Array.from({ length: season.episode_count }, (_, i) => ({
          user_id: user.id,
          season_id: season.id,
          episode_number: i + 1,
          watched_at: parsedDateVal,
        }))
      )
      const { error: epErr } = await supabase
        .from('episode_progress')
        .upsert(episodeRows, { onConflict: 'user_id,season_id,episode_number' })
      if (epErr) return NextResponse.json({ error: epErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, matched: match.title })
}
