import { NextRequest, NextResponse } from 'next/server'
import { discoverStreaming } from '@/lib/tmdb'
import type { StreamingSort } from '@/lib/tmdb'
import type { MediaType } from '@/types'

const STREAMING_SORTS = new Set<StreamingSort>(['popular', 'rating', 'latest'])

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider') ?? '8'
  const type = (searchParams.get('type') === 'show' ? 'show' : 'movie') as MediaType
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const requestedSort = searchParams.get('sort') as StreamingSort | null
  const sort = requestedSort && STREAMING_SORTS.has(requestedSort) ? requestedSort : 'popular'

  const { results, total_pages } = await discoverStreaming(provider, type, page, sort)
  return NextResponse.json({ results, page, total_pages })
}
