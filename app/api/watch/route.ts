import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'

// GET: fetch watch entries (with media) for the authenticated user
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'movie' or 'show' or null for all

  let query = supabase
    .from('watch_entries')
    .select('*, media(*)')
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false })

  if (type === 'movie' || type === 'show') {
    query = query.eq('media.type', type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

// POST: log a watched entry
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id, type, rating, review, watched_at, rewatch } = await request.json()
  if (!tmdb_id || !type) return NextResponse.json({ error: 'Missing tmdb_id or type' }, { status: 400 })

  const { media } = await upsertMedia(supabase, tmdb_id, type)

  if (!rewatch) {
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
      rating: rating ?? null,
      review: review ?? null,
      watched_at: watched_at ?? new Date().toISOString().split('T')[0],
      rewatch: rewatch ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}

// PATCH: update rating, review, and watched_at on a watch entry
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, rating, review, watched_at } = await request.json()
  
  const updates: any = {}
  if (rating !== undefined) updates.rating = rating ?? null
  if (review !== undefined) updates.review = review ?? null
  if (watched_at !== undefined) updates.watched_at = watched_at ?? null

  const { error } = await supabase
    .from('watch_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: remove a watch entry
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('watch_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
