import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchTmdb } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchTmdb(q.trim())
    return NextResponse.json({ results })
  } catch (err) {
    console.error('TMDB search error:', err)
    return NextResponse.json({ results: [], error: 'TMDB temporarily unavailable' }, { status: 200 })
  }
}
