import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: entries }, { data: watchlist }] = await Promise.all([
    supabase.from('watch_entries').select('*, media(*)').eq('user_id', user.id).order('watched_at', { ascending: false }),
    supabase.from('watchlist_items').select('*, media(*)').eq('user_id', user.id).order('added_at', { ascending: false }),
  ])

  const rows = [
    'title,year,type,rating,date,review,status',
    ...(entries ?? []).map((e: any) => [
      csvField(e.media?.title ?? ''),
      e.media?.release_year ?? '',
      e.media?.type ?? '',
      e.rating ?? '',
      e.watched_at ?? '',
      csvField(e.review ?? ''),
      'watched',
    ].join(',')),
    ...(watchlist ?? []).map((w: any) => [
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
