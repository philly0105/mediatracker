import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { parseUuid } from '@/lib/validation'
import { NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'node:crypto'

// Backfills media.backdrop_url and media.logo_url for rows written before
// migration 014 added them. The hero and ambient layer read both straight off
// the row, so a title without them renders the plain fallback. upsertMedia
// fills rows in as their metadata goes stale; this does the whole table at once.
// Needs the full payload: the logo comes from the `images` append.
//
// Idempotent: it only writes a column that is still null, and only with a value
// TMDB actually returned, so re-running never wipes or replaces art.
//
// Resumable, but by cursor rather than by re-selecting what is still null like
// the other backfills. Plenty of titles have no logo on TMDB, so those rows stay
// null for good; re-selecting from the top would hand the same unfillable rows
// back on every run and, once there are `limit` of them, never get further.
// Pass the returned `next` as `?after=` until it comes back null.

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const CONCURRENCY = 5
const MISSING_ART = 'backdrop_url.is.null,logo_url.is.null'

function isValidAdminAuth(header: string | null, secret: string): boolean {
  if (!header || !header.startsWith('Bearer ')) return false
  const token = header.slice(7)
  const a = createHash('sha256').update(token).digest()
  const b = createHash('sha256').update(secret).digest()
  return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin endpoints are disabled: ADMIN_SECRET is not set' }, { status: 503 })
  }
  if (!isValidAdminAuth(req.headers.get('Authorization'), adminSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // media's update policy is "auth.uid() is not null", so a sessionless anon
  // client writes zero rows however many it reports. Fail loudly instead.
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({
      error: 'No authenticated Supabase session. media\'s update policy requires auth.uid() is not null, so this must run with a logged-in session (or a service-role client).',
    }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT)
  const afterParam = url.searchParams.get('after')
  let after: string | null = null
  if (afterParam !== null) {
    const parsed = parseUuid(afterParam)
    if (!parsed.ok) {
      return NextResponse.json({ error: '`after` must be a media id (the `next` from the previous run)' }, { status: 400 })
    }
    after = parsed.value
  }

  let query = supabase
    .from('media')
    .select('id, tmdb_id, type, backdrop_url, logo_url')
    .or(MISSING_ART)
    .order('id', { ascending: true })
    .limit(limit)
  if (after) query = query.gt('id', after)

  const { data: rows, error } = await query

  if (error) {
    // 42703/PGRST204 mean migration 014 was never applied.
    if (error.code === '42703' || error.code === 'PGRST204') {
      return NextResponse.json({
        error: 'media.backdrop_url / media.logo_url do not exist — apply supabase/migrations/014_media_art.sql first.',
      }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const targets = rows ?? []
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  // Chunked rather than one big Promise.all, to stay under TMDB's rate limit.
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map(async (row) => {
      try {
        const details = await fetchTmdbDetails(row.tmdb_id, row.type)
        const art: { backdrop_url?: string; logo_url?: string } = {}
        if (!row.backdrop_url && details.backdrop_url) art.backdrop_url = details.backdrop_url
        if (!row.logo_url && details.logo_url) art.logo_url = details.logo_url
        if (Object.keys(art).length === 0) {
          // TMDB has nothing for the columns this row is missing.
          skipped++
          return
        }
        const { data: written, error: updateError } = await supabase
          .from('media')
          .update(art)
          .eq('id', row.id)
          .select('id')
        if (updateError) errors.push(`tmdb_id=${row.tmdb_id}: ${updateError.message}`)
        // Count what RETURNING actually gave back, not what we intended.
        else updated += written?.length ?? 0
      } catch (err) {
        errors.push(`tmdb_id=${row.tmdb_id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }))
  }

  // Includes rows TMDB has no art for, so it need not reach 0; `next` is what
  // says the walk is done.
  const { count: remaining } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .or(MISSING_ART)

  return NextResponse.json({
    processed: targets.length,
    updated,
    skipped,
    remaining: remaining ?? null,
    next: targets.length === limit ? targets[targets.length - 1].id : null,
    ...(errors.length > 0 ? { errors } : {}),
  })
}
