import { getPopularCollections } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const batch = Math.max(1, parseInt(req.nextUrl.searchParams.get('batch') ?? '1'))
  const collections = await getPopularCollections(batch)
  return NextResponse.json({ collections })
}
