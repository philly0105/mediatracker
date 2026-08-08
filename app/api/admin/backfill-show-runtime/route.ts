import { createClient } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

// Backfills media.runtime_mins for shows that have none.
//
// Every show written before showRuntimeMins() existed read only TMDB's
// `episode_run_time`, which TMDB has been deprecating and now returns empty for
// most shows — so 24 of 26 shows here have a null runtime. That makes the stats
// page's Hours total silently exclude all TV, since it multiplies this number by
// the count of watched episodes.
//
// upsertMedia will not repair these on its own: it takes a cached path for any
// row that already has a vote_average, so these rows are never re-fetched.
//
// Idempotent and resumable: only ever selects shows still null, so re-running
// picks up where it left off. `remaining` tells you when to stop.

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const CONCURRENCY = 5

export async function POST(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin endpoints are disabled: ADMIN_SECRET is not set' }, { status: 503 })
  }
  if (req.headers.get('Authorization') !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // media's update policy is "auth.uid() is not null", so a sessionless anon
  // client writes zero rows however many it reports. Fail loudly instead.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({
      error: 'No authenticated Supabase session. media\'s update policy requires auth.uid() is not null, so this must run with a logged-in session (or a service-role client).',
    }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT)

  const { data: rows, error } = await supabase
    .from('media')
    .select('id, tmdb_id')
    .eq('type', 'show')
    .is('runtime_mins', null)
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const targets = rows ?? []
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  // Chunked rather than one big Promise.all, to stay under TMDB's rate limit.
  // Needs the full payload: last_episode_to_air is not on the cheap path.
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map(async (row) => {
      try {
        const details = await fetchTmdbDetails(row.tmdb_id, 'show')
        if (details.runtime_mins === null || details.runtime_mins === undefined) {
          // TMDB genuinely has no runtime for this show; nothing to write.
          skipped++
          return
        }
        const { data: written, error: updateError } = await supabase
          .from('media')
          .update({ runtime_mins: details.runtime_mins })
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
    .eq('type', 'show')
    .is('runtime_mins', null)

  return NextResponse.json({
    processed: targets.length,
    updated,
    skipped,
    remaining: remaining ?? null,
    ...(errors.length > 0 ? { errors } : {}),
  })
}
