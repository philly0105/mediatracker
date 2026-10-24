import { getPopularCollections } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { parsePageParam } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // `Math.max(1, parseInt('x'))` is NaN, which reached /movie/popular as
  // `page=NaN`; TMDB 422s and the feed showed an empty batch instead.
  const batch = parsePageParam(req.nextUrl.searchParams.get('batch'))
  const collections = await getPopularCollections(batch)
  return NextResponse.json({ collections })
}
