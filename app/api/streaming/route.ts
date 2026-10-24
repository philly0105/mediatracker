import { NextRequest, NextResponse } from 'next/server'
import { discoverStreaming } from '@/lib/tmdb'
import type { StreamingSort } from '@/lib/tmdb'
import type { MediaType } from '@/types'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { parsePageParam } from '@/lib/validation'

const STREAMING_SORTS = new Set<StreamingSort>(['popular', 'rating', 'latest'])

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider') ?? '8'
  const type = (searchParams.get('type') === 'show' ? 'show' : 'movie') as MediaType
  // Previously unclamped, so `?page=-5` and `?page=abc` went to TMDB verbatim.
  // The echoed `page` below is now the clamped one, so the client's paginator
  // and the results it is paging through agree.
  const page = parsePageParam(searchParams.get('page'))
  const requestedSort = searchParams.get('sort') as StreamingSort | null
  const sort = requestedSort && STREAMING_SORTS.has(requestedSort) ? requestedSort : 'popular'

  const { results, total_pages } = await discoverStreaming(provider, type, page, sort)
  return NextResponse.json({ results, page, total_pages })
}
