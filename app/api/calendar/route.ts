import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const tmdbKey = process.env.TMDB_API_KEY
  if (!tmdbKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })

  try {
    const qs = new URLSearchParams({ api_key: tmdbKey, region: 'US', language: 'en-US', page: '1' })
    const res = await fetch(`https://api.themoviedb.org/3/movie/upcoming?${qs}`)
    if (!res.ok) throw new Error('TMDB request failed')
    
    const data = await res.json()
    const todayStr = new Date().toISOString().split('T')[0]

    let upcoming = data.results.map((r: any) => ({
      tmdb_id: r.id,
      type: 'movie',
      title: r.title,
      poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      full_release_date: r.release_date,
      priority: 'upcoming'
    }))

    // Filter out movies that have already been released
    upcoming = upcoming.filter((item: any) => item.full_release_date >= todayStr)

    // Sort ascending by release date
    upcoming.sort((a: any, b: any) => {
      if (a.full_release_date < b.full_release_date) return -1
      if (a.full_release_date > b.full_release_date) return 1
      return 0
    })

    return NextResponse.json({ releases: upcoming })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

