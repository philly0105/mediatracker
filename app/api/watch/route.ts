import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'
import { fetchWatchEntries } from '@/lib/watchEntries'
import { parseRating, parseMediaType, parseTmdbId, parseDate, parseUuid, parseText, badRequest, readJson } from '@/lib/validation'

// GET: fetch watch entries (with media) for the authenticated user
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'movie' or 'show' or null for all

  const { entries, error, truncated } = await fetchWatchEntries({
    supabase,
    userId: user.id,
    type,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ entries, truncated })
}

// POST: log a watched entry
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<{
    tmdb_id?: unknown
    type?: unknown
    rating?: unknown
    review?: unknown
    watched_at?: unknown
    rewatch?: unknown
  }>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const { tmdb_id, type, rating, review, watched_at, rewatch } = bodyRes.value
  const tmdbRes = parseTmdbId(tmdb_id)
  if (!tmdbRes.ok) return badRequest(tmdbRes.error)

  const typeRes = parseMediaType(type)
  if (!typeRes.ok) return badRequest(typeRes.error)

  const ratingRes = parseRating(rating)
  if (!ratingRes.ok) return badRequest(ratingRes.error)

  const reviewRes = parseText(review, 5000, 'Review')
  if (!reviewRes.ok) return badRequest(reviewRes.error)

  let finalWatchedAt = new Date().toISOString().split('T')[0]
  if (watched_at !== undefined && watched_at !== null) {
    const dateRes = parseDate(watched_at)
    if (!dateRes.ok) return badRequest(dateRes.error)
    finalWatchedAt = dateRes.value
  }

  const isRewatch = typeof rewatch === 'boolean' ? rewatch : false

  const { media } = await upsertMedia(supabase, tmdbRes.value, typeRes.value)

  if (!isRewatch) {
    const { data: existing } = await supabase
      .from('watch_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('media_id', media.id)
      .limit(1)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already in your watch history' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('watch_entries')
    .insert({
      user_id: user.id,
      media_id: media.id,
      rating: ratingRes.value,
      review: reviewRes.value,
      watched_at: finalWatchedAt,
      rewatch: isRewatch,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already in your watch history' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ entry: data }, { status: 201 })
}

// PATCH: update rating, review, and watched_at on a watch entry
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<{
    id?: unknown
    rating?: unknown
    review?: unknown
    watched_at?: unknown
  }>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const { id, rating, review, watched_at } = bodyRes.value
  const idRes = parseUuid(id)
  if (!idRes.ok) return badRequest(idRes.error)
  
  const updates: Record<string, unknown> = {}
  if (rating !== undefined) {
    const ratingRes = parseRating(rating)
    if (!ratingRes.ok) return badRequest(ratingRes.error)
    updates.rating = ratingRes.value
  }
  if (review !== undefined) {
    const reviewRes = parseText(review, 5000, 'Review')
    if (!reviewRes.ok) return badRequest(reviewRes.error)
    updates.review = reviewRes.value
  }
  if (watched_at !== undefined) {
    if (watched_at === null) {
      return badRequest('watched_at cannot be null')
    }
    const dateRes = parseDate(watched_at)
    if (!dateRes.ok) return badRequest(dateRes.error)
    updates.watched_at = dateRes.value
  }

  const { error } = await supabase
    .from('watch_entries')
    .update(updates)
    .eq('id', idRes.value)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: remove a watch entry
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<{ id?: unknown }>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const { id } = bodyRes.value
  const idRes = parseUuid(id)
  if (!idRes.ok) return badRequest(idRes.error)

  const { error } = await supabase
    .from('watch_entries')
    .delete()
    .eq('id', idRes.value)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

