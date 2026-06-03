import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbRecommendations } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id || !type || (type !== 'movie' && type !== 'show')) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  try {
    const results = await fetchTmdbRecommendations(Number(id), type)
    const highRated = results.filter(r => (r.vote_average ?? 0) >= 7).slice(0, 8)
    return NextResponse.json(highRated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
