import { NextRequest, NextResponse } from 'next/server'
import { TMDB_GENRES } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const tmdbKey = process.env.TMDB_API_KEY
  if (!tmdbKey) return NextResponse.json({ error: 'Missing TMDB API key' }, { status: 500 })

  try {
    // 1. Search for person to get ID and Profile
    const qs1 = new URLSearchParams({ api_key: tmdbKey, query: name })
    const searchRes = await fetch(`https://api.themoviedb.org/3/search/person?${qs1}`)
    if (!searchRes.ok) throw new Error('Failed to search person')
    const searchData = await searchRes.json()
    
    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ topMovies: [], recentMovies: [], profile_url: null })
    }

    const person = searchData.results[0]
    const profileUrl = person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : null

    // 2. Fetch combined credits
    const qs2 = new URLSearchParams({ api_key: tmdbKey })
    const creditsRes = await fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?${qs2}`)
    if (!creditsRes.ok) throw new Error('Failed to fetch person credits')
    const creditsData = await creditsRes.json()

    // 3. Process credits
    // Combine cast and crew (director)
    const directorCredits = (creditsData.crew || []).filter((c: any) => c.job === 'Director')
    const castCredits = creditsData.cast || []
    
    // Deduplicate by tmdb_id
    const seen = new Set<number>()
    const allCredits: any[] = []

    for (const item of [...castCredits, ...directorCredits]) {
      if (item.media_type !== 'movie' && item.media_type !== 'tv') continue
      if (!seen.has(item.id)) {
        seen.add(item.id)
        allCredits.push(item)
      }
    }

    const mapItem = (r: any) => ({
      tmdb_id: r.id,
      type: r.media_type === 'tv' ? 'show' : 'movie',
      title: r.title ?? r.name,
      overview: r.overview || '',
      poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      release_year: r.release_date
        ? parseInt(r.release_date.split('-')[0])
        : r.first_air_date
        ? parseInt(r.first_air_date.split('-')[0])
        : null,
      full_release_date: r.release_date || r.first_air_date || null,
      genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))),
      vote_average: r.vote_average || 0,
      vote_count: r.vote_count || 0
    })

    const mapped = allCredits.map(mapItem)

    // Top Rated: Sort by vote_average (requiring at least some votes, e.g. 50)
    const topMovies = [...mapped]
      .filter((m) => m.vote_count > 50)
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 10)

    // Most Recent: Sort by release date descending
    const recentMovies = [...mapped]
      .filter((m) => m.full_release_date)
      .sort((a, b) => {
        if (a.full_release_date < b.full_release_date) return 1
        if (a.full_release_date > b.full_release_date) return -1
        return 0
      })
      .slice(0, 10)

    // All Movies: Sort by highest IMDb rating (vote_average) descending
    // Push items with < 20 votes down to avoid obscure 10/10s floating to the very top.
    const allMovies = [...mapped].sort((a, b) => {
      const aIsValid = (a.vote_count || 0) > 20
      const bIsValid = (b.vote_count || 0) > 20
      
      if (aIsValid && !bIsValid) return -1
      if (!aIsValid && bIsValid) return 1
      
      if (b.vote_average !== a.vote_average) {
        return b.vote_average - a.vote_average
      }
      return (b.vote_count || 0) - (a.vote_count || 0)
    })

    return NextResponse.json({
      profile_url: profileUrl,
      topMovies,
      recentMovies,
      allMovies
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

