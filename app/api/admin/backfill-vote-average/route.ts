import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'node:crypto'

// Backfills media.vote_average for rows written before migration 004 added the
// column. Until a row has it, MediaCard falls back to a per-card
// GET /api/tmdb/rating — so this is what removes that fetch from every library
// page. Uses fetchTmdbDetails' cheap path (append=false): no credits, videos or
// providers, just the base payload we need one number from.
//
// Idempotent and resumable: it only ever selects rows still null, so re-running
// picks up where it left off. `remaining` in the response tells you when to stop.

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const CONCURRENCY = 5

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

  const { data: rows, error } = await supabase
    .from('media')
    .select('id, tmdb_id, type')
    .is('vote_average', null)
    .limit(limit)

  if (error) {
    // 42703/PGRST204 mean migration 004 was never applied.
    if (error.code === '42703' || error.code === 'PGRST204') {
      return NextResponse.json({
        error: 'media.vote_average does not exist — apply supabase/migrations/004_vote_average.sql first.',
      }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const targets = rows ?? []
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  // Chunked rather than one big Promise.all: 250+ titles at once would hammer
  // TMDB's rate limit and open as many sockets.
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map(async (row) => {
      try {
        const details = await fetchTmdbDetails(row.tmdb_id, row.type, false)
        if (details.vote_average === undefined || details.vote_average === null) {
          skipped++
          return
        }
        const { data: written, error: updateError } = await supabase
          .from('media')
          .update({ vote_average: details.vote_average })
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

  const { count: remaining } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .is('vote_average', null)

  return NextResponse.json({
    processed: targets.length,
    updated,
    skipped,
    remaining: remaining ?? null,
    ...(errors.length > 0 ? { errors } : {}),
  })
}
