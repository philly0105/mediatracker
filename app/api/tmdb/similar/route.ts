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
  const batch = Math.max(1, parseInt(searchParams.get('batch') ?? '1', 10))

  if (!id || !type || (type !== 'movie' && type !== 'show')) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  try {
    const tmdbPage1 = batch * 2 - 1
    const tmdbPage2 = batch * 2
    const [page1, page2] = await Promise.all([
      fetchTmdbRecommendations(Number(id), type, tmdbPage1),
      fetchTmdbRecommendations(Number(id), type, tmdbPage2),
    ])
    const seen = new Set<number>()
    const all = [...page1, ...page2].filter(r => {
      if (seen.has(r.tmdb_id)) return false
      seen.add(r.tmdb_id)
      return true
    })

    let results = all.filter(r => (r.vote_average ?? 0) >= 7)
    if (results.length < 10) {
      results = all.filter(r => (r.vote_average ?? 0) >= 6)
    }
    if (results.length < 10) {
      results = all
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
