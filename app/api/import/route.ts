import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchTmdb } from '@/lib/tmdb'
import { upsertMedia } from '@/lib/media'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, year, type, rating, date, review, status } = await request.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

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

  const { media } = await upsertMedia(supabase, match.tmdb_id, match.type)

  if (status === 'watchlist') {
    await supabase.from('watchlist_items').upsert(
      { user_id: user.id, media_id: media.id, priority: 'want_to_watch', added_at: new Date().toISOString().split('T')[0] },
      { onConflict: 'user_id,media_id' }
    )
  } else {
    const watchedAt = date || new Date().toISOString().split('T')[0]
    await supabase.from('watch_entries').upsert(
      {
        user_id: user.id,
        media_id: media.id,
        rating: rating ? parseFloat(rating) : null,
        review: review || null,
        watched_at: watchedAt,
      },
      { onConflict: 'user_id,media_id,watched_at' }
    )
  }

  return NextResponse.json({ ok: true, matched: match.title })
}
