import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TMDB_GENRES } from '@/lib/tmdb'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

function tmdbFetch(path: string, params: Record<string, string>, key: string) {
  const qs = new URLSearchParams({ api_key: key, language: 'en-US', ...params })
  return fetch(`https://api.themoviedb.org/3${path}?${qs}`).then(r => r.json())
}

export async function GET(request: NextRequest) {
  const tmdbKey = process.env.TMDB_API_KEY
  if (!tmdbKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })

  const today = new Date()
  const threeMonthsOut = new Date(today)
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3)
  const todayStr = today.toISOString().split('T')[0]
  const endStr = threeMonthsOut.toISOString().split('T')[0]

  try {
    // Movies (5 pages) + New TV shows (3 pages) in parallel
    const moviePages = [1, 2, 3, 4, 5].map(page =>
      tmdbFetch('/discover/movie', {
        region: 'US', sort_by: 'primary_release_date.asc',
        'primary_release_date.gte': todayStr, 'primary_release_date.lte': endStr,
        'with_release_type': '2|3', page: String(page),
      }, tmdbKey)
    )
    const showPages = [1, 2, 3].map(page =>
      tmdbFetch('/discover/tv', {
        sort_by: 'popularity.desc',
        'first_air_date.gte': todayStr, 'first_air_date.lte': endStr,
        with_original_language: 'en', page: String(page),
      }, tmdbKey)
    )

    const [movieResults, showResults] = await Promise.all([
      Promise.all(moviePages),
      Promise.all(showPages),
    ])

    const seen = new Set<string>()

    const movies = movieResults
      .flatMap(d => d.results ?? [])
      .filter((r: any) => {
        const key = `movie-${r.id}`
        if (!r.release_date || r.release_date < todayStr || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: any) => ({
        tmdb_id: r.id, type: 'movie' as const,
        title: r.title, overview: r.overview || '',
        poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
        full_release_date: r.release_date,
        release_year: parseInt(r.release_date.split('-')[0]),
        genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))),
        vote_average: r.vote_average, priority: 'upcoming',
      }))

    const shows = showResults
      .flatMap(d => d.results ?? [])
      .filter((r: any) => {
        const key = `show-${r.id}`
        if (!r.first_air_date || r.first_air_date < todayStr || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: any) => ({
        tmdb_id: r.id, type: 'show' as const,
        title: r.name, overview: r.overview || '',
        poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
        full_release_date: r.first_air_date,
        release_year: parseInt(r.first_air_date.split('-')[0]),
        genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))),
        vote_average: r.vote_average, priority: 'upcoming',
      }))

    // Followed shows next episodes (auth users only)
    const followedReleases: any[] = []
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: followedRows } = await supabase
          .from('followed_shows')
          .select('media(tmdb_id, title, poster_url, release_year, genres, overview)')
          .eq('user_id', user.id)

        if (followedRows && followedRows.length > 0) {
          const nextEps = await Promise.all(
            followedRows.slice(0, 25).map(async (row: any) => {
              const m = row.media
              if (!m) return null
              try {
                const d = await tmdbFetch(`/tv/${m.tmdb_id}`, {}, tmdbKey)
                const next = d.next_episode_to_air
                if (!next?.air_date) return null
                const key = `show-${m.tmdb_id}`
                // Don't duplicate if it's already in the new-shows list
                seen.add(key)
                return {
                  tmdb_id: m.tmdb_id, type: 'show' as const,
                  title: m.title, overview: m.overview || '',
                  poster_url: m.poster_url,
                  full_release_date: next.air_date,
                  release_year: m.release_year,
                  genres: m.genres ?? [],
                  vote_average: d.vote_average,
                  priority: 'upcoming',
                  followed: true,
                  episode_label: `S${next.season_number} · E${next.episode_number}`,
                }
              } catch {
                return null
              }
            })
          )
          followedReleases.push(...nextEps.filter(Boolean))
        }
      }
    } catch {
      // Not logged in or follow fetch failed — skip silently
    }

    const releases = [...movies, ...shows, ...followedReleases]
      .sort((a, b) => (a.full_release_date < b.full_release_date ? -1 : 1))

    return NextResponse.json({ releases })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
