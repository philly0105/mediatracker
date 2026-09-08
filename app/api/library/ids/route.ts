import { NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { mediaKey } from '@/lib/mediaKey'
import type { MediaType } from '@/types'

type JoinedMedia = { tmdb_id: number; type: MediaType }
type JoinedRow = { media: JoinedMedia | JoinedMedia[] | null }

function toIds(rows: JoinedRow[]): string[] {
  const ids = new Set<string>()
  for (const row of rows) {
    const media = Array.isArray(row.media) ? row.media[0] : row.media
    if (typeof media?.tmdb_id === 'number' && (media.type === 'movie' || media.type === 'show')) {
      ids.add(mediaKey(media.type, media.tmdb_id))
    }
  }
  return Array.from(ids)
}

// Just the tmdb_ids of everything the user has watched or shortlisted — enough
// to paint the ✓ / + badges in ⌘K, the streaming grid and the similar-titles
// modal, and nothing more.
//
// This replaces two unbounded browser-side Supabase reads that pulled the whole
// library across the wire on every overlay open. It is also the last of those
// direct reads, so the client no longer talks to PostgREST at all.
export async function GET() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [watched, watchlist] = await Promise.all([
    fetchAllRows<JoinedRow>((from, to) =>
      supabase
        .from('watch_entries')
        .select('media!inner(tmdb_id, type)')
        .eq('user_id', user.id)
        .order('id')
        .range(from, to)
    ),
    fetchAllRows<JoinedRow>((from, to) =>
      supabase
        .from('watchlist_items')
        .select('media!inner(tmdb_id, type)')
        .eq('user_id', user.id)
        .order('id')
        .range(from, to)
    ),
  ])

  const error = watched.error ?? watchlist.error
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({
    watched: toIds(watched.rows),
    watchlist: toIds(watchlist.rows),
  })
}
