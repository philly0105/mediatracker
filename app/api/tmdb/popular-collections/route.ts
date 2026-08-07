import { getPopularCollections } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batch = Math.max(1, parseInt(req.nextUrl.searchParams.get('batch') ?? '1'))
  const collections = await getPopularCollections(batch)
  return NextResponse.json({ collections })
}
