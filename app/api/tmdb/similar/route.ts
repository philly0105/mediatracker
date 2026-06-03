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
    const [page1, page2] = await Promise.all([
      fetchTmdbRecommendations(Number(id), type, 1),
      fetchTmdbRecommendations(Number(id), type, 2),
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

    return NextResponse.json(results.slice(0, 12))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
