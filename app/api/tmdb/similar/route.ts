import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbRecommendations } from '@/lib/tmdb'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { badRequest, parseMediaType, parsePageParam, parseTmdbIdParam, MAX_TMDB_PAGE } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const idResult = parseTmdbIdParam(searchParams.get('id'))
  if (!idResult.ok) return badRequest(idResult.error)
  const typeResult = parseMediaType(searchParams.get('type'))
  if (!typeResult.ok) return badRequest(typeResult.error)

  const id = idResult.value
  const type = typeResult.value
  // One batch is two TMDB pages, so the batch ceiling is half TMDB's. This was
  // `Math.max(1, parseInt(...))`, and Math.max(1, NaN) is NaN: `?batch=x` sent
  // `page=NaN` upstream, TMDB 422ed and this route answered `200 []` — a
  // broken request that looked exactly like "nothing similar".
  const batch = parsePageParam(searchParams.get('batch'), 1, MAX_TMDB_PAGE / 2)

  try {
    const tmdbPage1 = batch * 2 - 1
    const tmdbPage2 = batch * 2
    const [page1, page2] = await Promise.all([
      fetchTmdbRecommendations(id, type, tmdbPage1),
      fetchTmdbRecommendations(id, type, tmdbPage2),
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
  } catch (err) {
    // Same reasoning as /api/tmdb/details: the upstream status stays in the
    // server log rather than going out in the response body.
    console.error('GET /api/tmdb/similar failed:', err)
    return NextResponse.json({ error: 'Could not load similar titles' }, { status: 500 })
  }
}
