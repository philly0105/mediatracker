import { NextRequest, NextResponse } from 'next/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tmdb_id = req.nextUrl.searchParams.get('tmdb_id')
  const type = req.nextUrl.searchParams.get('type') as any
  
  if (!tmdb_id || !type) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }
  
  try {
    const details = await fetchTmdbDetails(Number(tmdb_id), type)
    return NextResponse.json({ vote_average: details.vote_average })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch TMDB details' }, { status: 500 })
  }
}
