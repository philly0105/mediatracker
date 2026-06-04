import { getPopularCollections } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { TmdbCollectionSummary } from '@/types'

export async function GET(req: NextRequest) {
  const batch = Math.max(1, parseInt(req.nextUrl.searchParams.get('batch') ?? '1'))
  const startPage = (batch - 1) * 3 + 1

  const [p1, p2, p3] = await Promise.all([
    getPopularCollections(startPage),
    getPopularCollections(startPage + 1),
    getPopularCollections(startPage + 2),
  ])

  const seen = new Set<number>()
  const merged: TmdbCollectionSummary[] = []

  for (const c of [...p1, ...p2, ...p3]) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    merged.push(c)
  }

  return NextResponse.json({ collections: merged })
}
