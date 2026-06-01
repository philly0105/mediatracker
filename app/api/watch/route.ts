import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'

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

// PATCH: update rating on a watch entry
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, rating } = await request.json()
  const { error } = await supabase
    .from('watch_entries')
    .update({ rating: rating ?? null })
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
