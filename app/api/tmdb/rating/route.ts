import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/server'
import type { MediaType } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tmdb_id = req.nextUrl.searchParams.get('tmdb_id')
  const rawType = req.nextUrl.searchParams.get('type')
  
  if (!tmdb_id || !rawType) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  // Kept behaviour-identical to the previous untyped version: anything that isn't
  // literally "movie" is treated as a show by fetchTmdbDetails' `type === 'movie'`
  // branch, so we normalise the same way here.
  const type: MediaType = rawType === 'movie' ? 'movie' : 'show'
  
  try {
    const details = await fetchTmdbDetails(Number(tmdb_id), type, false)
    return NextResponse.json({ vote_average: details.vote_average })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch TMDB details' }, { status: 500 })
  }
}
