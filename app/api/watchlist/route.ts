import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'
import { collectGenres } from '@/lib/libraryFilters'
import { parsePriority, parseTmdbId, parseMediaType, badRequest } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  // Facets mode: return the distinct genres across the user's watchlist rows,
  // honouring the optional type filter so switching to "Movies Only" narrows
  // the genre list too. Just the genres column (media.genres is a text[]) —
  // flattening and dedupe happen in JS, no extra SQL needed at this scale.
  if (searchParams.get('facets') === '1') {
    const type = searchParams.get('type')
    // !inner for the same reason the paged query below uses it: without it a
    // filter on the embedded resource only nulls out media on non-matching rows
    // instead of excluding them, so every watchlist row would come back. The
    // genre list would still come out right — collectGenres skips nulls — but
    // only by accident, and the query would read the whole watchlist to do it.
    let query = supabase
      .from('watchlist_items')
      .select('media!inner(genres)')
      .eq('user_id', user.id)

    if (type && type !== 'all') {
      query = query.eq('media.type', type)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // The generated types model the media relationship as an array, but the
    // runtime rows are a single object (as the rest of this route already uses).
    return NextResponse.json(
      { genres: collectGenres((data ?? []) as { media?: { genres?: string[] | null } | null }[]) },
      { status: 200 }
    )
  }

  const parsePositiveInt = (raw: string | null, fallback: number, max: number): number => {
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1) return fallback
    return Math.min(n, max)
  }

  const page = parsePositiveInt(searchParams.get('page'), 1, 10_000)
  const limit = parsePositiveInt(searchParams.get('limit'), 24, 100)
  const type = searchParams.get('type')
  const genre = searchParams.get('genre')
  const priority = searchParams.get('priority')
  const q = searchParams.get('q')
  const sort = searchParams.get('sort')
  
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
  // Free-text search on the embedded media title; the `!inner` join already in
  // the select means a filter here excludes non-matching rows rather than just
  // nulling out their media.
  if (q && q.trim()) {
    query = query.ilike('media.title', `%${q.trim()}%`)
  }

  // Ordering the parent rows by an embedded to-one column uses PostgREST's
  // `media(title)` order syntax — postgrest-js passes the string through.
  const { data, error, count } = await (
    sort === 'oldest' ? query.order('added_at', { ascending: true })
    : sort === 'title' ? query.order('media(title)', { ascending: true })
    : sort === 'year' ? query.order('media(release_year)', { ascending: false })
    : query.order('added_at', { ascending: false })
  ).range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data, total: count ?? 0, page, limit }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id, type, priority } = await request.json()
  const tmdbRes = parseTmdbId(tmdb_id)
  if (!tmdbRes.ok) return badRequest(tmdbRes.error)

  const typeRes = parseMediaType(type)
  if (!typeRes.ok) return badRequest(typeRes.error)

  const priorityRes = parsePriority(priority)
  if (!priorityRes.ok) return badRequest(priorityRes.error)

  const { media } = await upsertMedia(supabase, tmdbRes.value, typeRes.value)

  const { data, error } = await supabase
    .from('watchlist_items')
    .upsert({ user_id: user.id, media_id: media.id, priority: priorityRes.value }, { onConflict: 'user_id,media_id' })
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
  if (!id || typeof id !== 'string') return badRequest('Invalid or missing id')

  const priorityRes = parsePriority(priority)
  if (!priorityRes.ok) return badRequest(priorityRes.error)

  const { data, error } = await supabase
    .from('watchlist_items')
    .update({ priority: priorityRes.value })
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
    if (typeof id !== 'string') return badRequest('Invalid id')
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (tmdb_id !== undefined || type !== undefined) {
    const tmdbRes = parseTmdbId(tmdb_id)
    if (!tmdbRes.ok) return badRequest(tmdbRes.error)

    const typeRes = parseMediaType(type)
    if (!typeRes.ok) return badRequest(typeRes.error)

    const { data: media } = await supabase
      .from('media')
      .select('id')
      .eq('tmdb_id', tmdbRes.value)
      .eq('type', typeRes.value)
      .maybeSingle()

    if (media) {
      const { error } = await supabase
        .from('watchlist_items')
        .delete()
        .eq('media_id', media.id)
        .eq('user_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    return badRequest('id or tmdb_id and type required')
  }

  return NextResponse.json({ ok: true })
}
