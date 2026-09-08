import { NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/fetchAllRows'
import type { WatchEntry, WatchlistItem } from '@/types'

function csvField(value: string): string {
  // Leading =, +, -, @, TAB and CR are treated as formula starts by Excel/Sheets/Numbers.
  // Prefix with a tab so the cell renders safely as plain text.
  const escaped = /^[=+\-@\t\r]/.test(value) ? `\t${value}` : value
  if (/[",\n\r]/.test(escaped) || escaped !== value) {
    return `"${escaped.replace(/"/g, '""')}"`
  }
  return escaped
}

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Both reads are paged with fetchAllRows so libraries over PostgREST's
  // 1000-row cap export completely. .order('id') tiebreaks identical
  // timestamps to ensure deterministic pagination across windows.
  const [entries, watchlist] = await Promise.all([
    fetchAllRows<WatchEntry>((from, to) =>
      supabase
        .from('watch_entries')
        .select('*, media(*)')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .order('id')
        .range(from, to)
    ),
    fetchAllRows<WatchlistItem>((from, to) =>
      supabase
        .from('watchlist_items')
        .select('*, media(*)')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })
        .order('id')
        .range(from, to)
    ),
  ])

  const error = entries.error ?? watchlist.error
  if (error) return NextResponse.json({ error }, { status: 500 })

  const rows = [
    'title,year,type,rating,date,review,status',
    ...entries.rows.map((e) => [
      csvField(e.media?.title ?? ''),
      e.media?.release_year ?? '',
      e.media?.type ?? '',
      e.rating ?? '',
      e.watched_at ?? '',
      csvField(e.review ?? ''),
      'watched',
    ].join(',')),
    ...watchlist.rows.map((w) => [
      csvField(w.media?.title ?? ''),
      w.media?.release_year ?? '',
      w.media?.type ?? '',
      '',
      '',
      '',
      'watchlist',
    ].join(',')),
  ].join('\n')

  const date = new Date().toISOString().split('T')[0]
  return new NextResponse(rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="dorfmovies-${date}.csv"`,
    },
  })
}
