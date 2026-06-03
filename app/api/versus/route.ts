import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TMDB_GENRES } from '@/lib/tmdb'
import type { TmdbSearchResult } from '@/types'

const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'

function apiUrl(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ api_key: process.env.TMDB_API_KEY ?? '', ...params })
  return `${BASE}${path}?${qs}`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = request.nextUrl.searchParams.get('type') // 'movie' | 'show'
  const genreId = request.nextUrl.searchParams.get('genreId') // optional

  if (!type || (type !== 'movie' && type !== 'show')) {
    return NextResponse.json({ error: 'Valid type (movie or show) required' }, { status: 400 })
  }

  // 1. Fetch user's full history to exclude already watched/watchlisted items
  const [
    { data: watchedList },
    { data: watchlistList },
  ] = await Promise.all([
    supabase.from('watch_entries').select('media!inner(tmdb_id)').eq('user_id', user.id),
    supabase.from('watchlist_items').select('media!inner(tmdb_id)').eq('user_id', user.id),
  ])

  const watchedIds = new Set((watchedList ?? []).map((w: any) => w.media.tmdb_id))
  const watchlistIds = new Set((watchlistList ?? []).map((w: any) => w.media.tmdb_id))

  // 2. Fetch Discover pages to get a large pool
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv'
  
  const promises = []
  for (let page = 1; page <= 6; page++) {
    const params: Record<string, string> = {
      page: String(page),
      sort_by: 'popularity.desc',
      'vote_count.gte': '100'
    }
    if (genreId && genreId !== 'any') {
      params.with_genres = genreId
    }
    promises.push(fetch(apiUrl(endpoint, params)).then(r => r.ok ? r.json() : null))
  }

  const responses = await Promise.all(promises)
  
  const allResults: TmdbSearchResult[] = []
  responses.forEach(data => {
    if (!data || !data.results) return
    const mapped = data.results.map((r: any): TmdbSearchResult => ({
      tmdb_id: r.id,
      type: type as 'movie' | 'show',
      title: r.title ?? r.name,
      overview: r.overview ?? '',
      poster_url: r.poster_path ? `${IMG}${r.poster_path}` : null,
      release_year: r.release_date
        ? parseInt(r.release_date.split('-')[0])
        : r.first_air_date
        ? parseInt(r.first_air_date.split('-')[0])
        : null,
      genres: Array.from(new Set((r.genre_ids ?? []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))),
      vote_average: r.vote_average,
    }))
    allResults.push(...mapped)
  })

  // 3. Exclude already watched/watchlisted
  const filtered = allResults.filter(
    (item) => !watchedIds.has(item.tmdb_id) && !watchlistIds.has(item.tmdb_id) && item.poster_url
  )

  // Deduplicate
  const uniqueMap = new Map()
  filtered.forEach(item => uniqueMap.set(item.tmdb_id, item))
  const uniqueResults = Array.from(uniqueMap.values())

  return NextResponse.json({ results: uniqueResults })
}
