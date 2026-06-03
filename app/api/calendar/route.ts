import { NextRequest, NextResponse } from 'next/server'
import { TMDB_GENRES } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const tmdbKey = process.env.TMDB_API_KEY
  if (!tmdbKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })

  try {
    const today = new Date()
    const threeMonthsOut = new Date(today)
    threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3)

    const todayStr = today.toISOString().split('T')[0]
    const endStr = threeMonthsOut.toISOString().split('T')[0]

    const pages = [1, 2, 3, 4, 5]
    const results = await Promise.all(
      pages.map((page) => {
        const qs = new URLSearchParams({
          api_key: tmdbKey,
          region: 'US',
          language: 'en-US',
          sort_by: 'primary_release_date.asc',
          'primary_release_date.gte': todayStr,
          'primary_release_date.lte': endStr,
          'with_release_type': '2|3',
          page: String(page),
        })
        return fetch(`https://api.themoviedb.org/3/discover/movie?${qs}`).then(r => r.json())
      })
    )

    const seen = new Set<number>()
    const upcoming = results
      .flatMap((data) => data.results ?? [])
      .filter((r: any) => {
        if (!r.release_date || r.release_date < todayStr || seen.has(r.id)) return false
        seen.add(r.id)
        return true
      })
      .map((r: any) => ({
        tmdb_id: r.id,
        type: 'movie',
        title: r.title,
        overview: r.overview || '',
        poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        full_release_date: r.release_date,
        release_year: parseInt(r.release_date.split('-')[0]),
        genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))),
        vote_average: r.vote_average,
        priority: 'upcoming',
      }))
      .sort((a: any, b: any) => (a.full_release_date < b.full_release_date ? -1 : 1))

    return NextResponse.json({ releases: upcoming })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
