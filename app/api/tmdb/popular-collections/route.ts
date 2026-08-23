import { getPopularCollections } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batch = Math.max(1, parseInt(req.nextUrl.searchParams.get('batch') ?? '1'))
  const collections = await getPopularCollections(batch)
  return NextResponse.json({ collections })
}
