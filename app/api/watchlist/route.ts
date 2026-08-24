import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'
import { collectGenres } from '@/lib/libraryFilters'
import { parsePriority, parseTmdbId, parseMediaType, badRequest, readJson } from '@/lib/validation'

// The buckets the watchlist page renders, in the order it renders them.
const GROUPED_PRIORITIES = ['must_watch', 'want_to_watch', 'someday'] as const

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  // Facets mode: return the distinct genres across the user's watchlist rows,
  // honouring the optional type filter so switching to "Movies Only" narrows
  // the genre list too. Just the genres column (media.genres is a text[]) —
  // flattening and dedupe happen in JS, no extra SQL needed at this scale.
  // The distinct genres across the user's watchlist rows, honouring the optional
  // type filter so switching to "Movies Only" narrows the genre list too. Just
  // the genres column (media.genres is a text[]) — flattening and dedupe happen
  // in JS, no extra SQL needed at this scale.
  //
  // !inner for the same reason the paged query below uses it: without it a
  // filter on the embedded resource only nulls out media on non-matching rows
  // instead of excluding them, so every watchlist row would come back. The
  // genre list would still come out right — collectGenres skips nulls — but
  // only by accident, and the query would read the whole watchlist to do it.
  async function fetchGenres(type: string | null) {
    let query = supabase
      .from('watchlist_items')
      .select('media!inner(genres)')
      .eq('user_id', user!.id)

    if (type && type !== 'all') {
      query = query.eq('media.type', type)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    // The generated types model the media relationship as an array, but the
    // runtime rows are a single object (as the rest of this route already uses).
    return collectGenres((data ?? []) as { media?: { genres?: string[] | null } | null }[])
  }

  if (searchParams.get('facets') === '1') {
    try {
      return NextResponse.json({ genres: await fetchGenres(searchParams.get('type')) }, { status: 200 })
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
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

  function buildListQuery(forPriority: string | null) {
    let query = supabase
      .from('watchlist_items')
      .select('*, media!inner(*)', { count: 'exact' })
      .eq('user_id', user!.id)

    if (type && type !== 'all') {
      query = query.eq('media.type', type)
    }
    if (genre && genre !== 'All') {
      query = query.contains('media.genres', [genre])
    }
    if (forPriority) {
      query = query.eq('priority', forPriority)
    }
  // Free-text search over title, director and year. This used to be title only,
  // which meant two identically-styled search boxes — this one and the
  // library's — behaved differently, and that is worse than one that is simply
  // limited. The `!inner` join already in the select means a filter here
  // excludes non-matching rows rather than just nulling out their media.
  //
  // Not at full parity with lib/matchesLibraryQuery: that also matches cast and
  // genres, which are text[] and have no substring form in PostgREST (`cs`
  // needs a whole, case-exact element). Reaching them properly wants a
  // generated tsvector column rather than a wider `or`.
  //
  // `or` takes a comma-separated filter list, so a term containing a comma or a
  // parenthesis would break out of the expression — hence the strip.
    if (q && q.trim()) {
      const term = q.trim().replace(/[,()"\\]/g, ' ').trim()
      if (term) {
        const year = /^\d{4}$/.test(term) ? term : null
        const filters = [
          `title.ilike.%${term}%`,
          `director.ilike.%${term}%`,
          ...(year ? [`release_year.eq.${year}`] : []),
        ]
        query = query.or(filters.join(','), { referencedTable: 'media' })
      }
    }

    // Ordering the parent rows by an embedded to-one column uses PostgREST's
    // `media(title)` order syntax — postgrest-js passes the string through.
    return sort === 'oldest' ? query.order('added_at', { ascending: true })
      : sort === 'title' ? query.order('media(title)', { ascending: true })
      : sort === 'year' ? query.order('media(release_year)', { ascending: false })
      : query.order('added_at', { ascending: false })
  }

  // Grouped mode. The watchlist page renders all three priority buckets at
  // once; asking for them one at a time meant four requests on load (three
  // sections plus the facets call) and three independent infinite scrolls
  // stacked vertically, so a large Must Watch bucket buried the other two.
  // One request, four parallel queries, a page of each bucket plus its true
  // total — the page renders a preview per bucket and expands on demand.
  if (searchParams.get('group') === 'priority') {
    try {
      const [genres, ...groups] = await Promise.all([
        fetchGenres(type),
        ...GROUPED_PRIORITIES.map(async (p) => {
          const { data, error, count } = await buildListQuery(p).range(offset, offset + limit - 1)
          if (error) throw new Error(error.message)
          return { priority: p, items: data ?? [], total: count ?? 0 }
        }),
      ])

      return NextResponse.json(
        {
          groups: Object.fromEntries(groups.map((g) => [g.priority, { items: g.items, total: g.total }])),
          genres,
          page,
          limit,
        },
        { status: 200 }
      )
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
  }

  const { data, error, count } = await buildListQuery(priority).range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data, total: count ?? 0, page, limit }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<{
    tmdb_id?: unknown
    type?: unknown
    priority?: unknown
  }>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const { tmdb_id, type, priority } = bodyRes.value
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
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<{
    id?: unknown
    priority?: unknown
  }>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const { id, priority } = bodyRes.value
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
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<{
    id?: unknown
    tmdb_id?: unknown
    type?: unknown
  }>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const { id, tmdb_id, type } = bodyRes.value

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
