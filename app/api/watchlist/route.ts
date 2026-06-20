import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '24', 10)
  const type = searchParams.get('type')
  const genre = searchParams.get('genre')
  const priority = searchParams.get('priority')
  
  const offset = (page - 1) * limit

  let query = supabase
    .from('watchlist_items')
    .select('*, media!inner(*)', { count: 'exact' })
    .eq('user_id', user.id)

  if (type && type !== 'all') {
    query = query.eq('media.type', type)
  }
  if (genre && genre !== 'All') {
    query = query.contains('media.genres', [genre])
  }
  if (priority) {
    query = query.eq('priority', priority)
  }

  const { data, error, count } = await query
    .order('added_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data, total: count ?? 0, page, limit }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id, type, priority } = await request.json()
  const { media } = await upsertMedia(supabase, tmdb_id, type)

  const { data, error } = await supabase
    .from('watchlist_items')
    .upsert({ user_id: user.id, media_id: media.id, priority }, { onConflict: 'user_id,media_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, priority } = await request.json()
  const { data, error } = await supabase
    .from('watchlist_items')
    .update({ priority })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, tmdb_id, type } = await request.json()

  if (id) {
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (tmdb_id && type) {
    const { data: media } = await supabase
      .from('media')
      .select('id')
      .eq('tmdb_id', tmdb_id)
      .eq('type', type)
      .single()

    if (media) {
      const { error } = await supabase
        .from('watchlist_items')
        .delete()
        .eq('media_id', media.id)
        .eq('user_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
