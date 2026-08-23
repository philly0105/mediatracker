import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import type { MediaType } from '@/types'

// Batch rating lookup for rows whose media.vote_average is still null.
//
// Was one request per card, which meant a burst of ~24 concurrent requests on
// every library page. Callers now go through lib/tmdbRatings, which coalesces a
// render's worth of cards into a single call.
//
// It also writes what it finds back to media.vote_average, so the column fills
// in as pages are viewed and the client-side lookup fades out on its own —
// app/api/admin/backfill-vote-average does the same thing in bulk.

const MAX_IDS = 40
const CONCURRENCY = 5

/** `movie:550` / `show:1399` — the key shape the client caches on. */
function parseKey(raw: string): { key: string; tmdb_id: number; type: MediaType } | null {
  const [rawType, rawId] = raw.split(':')
  const tmdb_id = Number(rawId)
  if (!rawType || !Number.isInteger(tmdb_id) || tmdb_id <= 0) return null
  // Anything that isn't literally "movie" is a show, matching fetchTmdbDetails'
  // own `type === 'movie'` branch.
  const type: MediaType = rawType === 'movie' ? 'movie' : 'show'
  return { key: `${type}:${tmdb_id}`, tmdb_id, type }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = req.nextUrl.searchParams.get('ids')
  if (!raw) return NextResponse.json({ error: 'Missing ids' }, { status: 400 })

  const targets = new Map<string, { tmdb_id: number; type: MediaType }>()
  for (const part of raw.split(',')) {
    const parsed = parseKey(part.trim())
    if (parsed) targets.set(parsed.key, { tmdb_id: parsed.tmdb_id, type: parsed.type })
    if (targets.size >= MAX_IDS) break
  }
  if (targets.size === 0) return NextResponse.json({ error: 'No valid ids' }, { status: 400 })

  const entries = Array.from(targets.entries())
  const ratings: Record<string, number> = {}

  // Chunked rather than one Promise.all over everything: 40 at once would open
  // as many sockets to TMDB. fetchTmdbDetails is server-cached, so repeat
  // lookups inside the revalidate window cost nothing.
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(entries.slice(i, i + CONCURRENCY).map(async ([key, { tmdb_id, type }]) => {
      try {
        const details = await fetchTmdbDetails(tmdb_id, type, false)
        if (details.vote_average == null) return
        ratings[key] = details.vote_average
        // Best-effort write-back; a failure here just means the next viewer
        // looks it up again.
        await supabase
          .from('media')
          .update({ vote_average: details.vote_average })
          .eq('tmdb_id', tmdb_id)
          .eq('type', type)
          .is('vote_average', null)
      } catch {
        // One bad id must not fail the batch — that key is simply absent from
        // the response and the card renders without a score.
      }
    }))
  }

  return NextResponse.json({ ratings })
}
