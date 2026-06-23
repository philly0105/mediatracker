import { NextRequest, NextResponse } from 'next/server'
import { discoverStreaming } from '@/lib/tmdb'
import type { MediaType } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider') ?? '8'
  const type = (searchParams.get('type') === 'show' ? 'show' : 'movie') as MediaType
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const { results, total_pages } = await discoverStreaming(provider, type, page)
  return NextResponse.json({ results, page, total_pages })
}
