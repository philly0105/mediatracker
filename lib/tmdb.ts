import type { TmdbSearchResult, MediaType, TmdbCollectionDetails, TmdbCollectionPart, TmdbCollectionSummary } from '@/types'

const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'
const BACKDROP = 'https://image.tmdb.org/t/p/w1280'

export const TMDB_GENRES: Record<number, string> = {
  28: 'Action & Sci-Fi',
  12: 'Action & Sci-Fi',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Action & Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Sci-Fi',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Action & Sci-Fi',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War',
}

function apiUrl(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ api_key: process.env.TMDB_API_KEY ?? '', ...params })
  return `${BASE}${path}?${qs}`
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const res = await fetch(apiUrl('/search/multi', { query, include_adult: 'false' }))
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)
  const data = await res.json()

  return data.results
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: any): TmdbSearchResult => ({
      tmdb_id: r.id,
      type: r.media_type === 'tv' ? 'show' : 'movie',
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
}

export interface TmdbWatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
}

export interface TmdbWatchProviders {
  link?: string
  flatrate?: TmdbWatchProvider[]
  rent?: TmdbWatchProvider[]
  buy?: TmdbWatchProvider[]
}

export interface TmdbFullDetails {
  tmdb_id: number
  imdb_id: string | null
  type: MediaType
  title: string
  overview: string
  poster_url: string | null
  genres: string[]
  release_year: number | null
  runtime_mins: number | null
  director: string | null
  cast_members: string[]
  seasons?: Array<{ season_number: number; episode_count: number }>
  full_release_date?: string | null
  trailer_url?: string | null
  belongs_to_collection?: { id: number; name: string } | null
  watch_providers?: TmdbWatchProviders | null
  vote_average?: number
}

export async function fetchTmdbDetails(tmdbId: number, type: MediaType): Promise<TmdbFullDetails> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  const res = await fetch(apiUrl(endpoint, { append_to_response: 'credits,videos,watch/providers,external_ids' }))
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`)
  const d = await res.json()
  
  const trailerKey = d.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key
  const trailer_url = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null

  const providersData = d['watch/providers']?.results?.US
  const watch_providers: TmdbWatchProviders | null = providersData ? {
    link: providersData.link,
    flatrate: providersData.flatrate?.map((p: any) => ({ provider_id: p.provider_id, provider_name: p.provider_name, logo_path: p.logo_path ? `${IMG}${p.logo_path}` : null })),
    rent: providersData.rent?.map((p: any) => ({ provider_id: p.provider_id, provider_name: p.provider_name, logo_path: p.logo_path ? `${IMG}${p.logo_path}` : null })),
    buy: providersData.buy?.map((p: any) => ({ provider_id: p.provider_id, provider_name: p.provider_name, logo_path: p.logo_path ? `${IMG}${p.logo_path}` : null })),
  } : null

  if (type === 'movie') {
    const director = d.credits?.crew?.find((c: any) => c.job === 'Director')?.name ?? null
    return {
      tmdb_id: d.id, type: 'movie',
      imdb_id: d.imdb_id ?? null,
      title: d.title, overview: d.overview ?? '',
      poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
      genres: (d.genres ?? []).map((g: any) => g.name),
      release_year: d.release_date ? parseInt(d.release_date.split('-')[0]) : null,
      runtime_mins: d.runtime ?? null,
      director,
      cast_members: (d.credits?.cast ?? []).slice(0, 5).map((c: any) => c.name),
      full_release_date: d.release_date || null,
      trailer_url,
      belongs_to_collection: d.belongs_to_collection
        ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name }
        : null,
      watch_providers,
      vote_average: d.vote_average,
    }
  } else {
    return {
      tmdb_id: d.id, type: 'show',
      imdb_id: d.external_ids?.imdb_id ?? null,
      title: d.name, overview: d.overview ?? '',
      poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
      genres: (d.genres ?? []).map((g: any) => g.name),
      release_year: d.first_air_date ? parseInt(d.first_air_date.split('-')[0]) : null,
      runtime_mins: d.episode_run_time?.[0] ?? null,
      director: null,
      cast_members: (d.credits?.cast ?? []).slice(0, 5).map((c: any) => c.name),
      seasons: (d.seasons ?? [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({ season_number: s.season_number, episode_count: s.episode_count })),
      full_release_date: d.next_episode_to_air?.air_date || null,
      trailer_url,
      watch_providers,
      vote_average: d.vote_average,
    }
  }
}

export async function fetchTmdbRecommendations(tmdbId: number, type: MediaType, page = 1): Promise<TmdbSearchResult[]> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/recommendations` : `/tv/${tmdbId}/recommendations`
  const res = await fetch(apiUrl(endpoint, { page: String(page) }))
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? [])
    .map((r: any): TmdbSearchResult => ({
      tmdb_id: r.id,
      type: type,
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
}

export async function fetchTmdbTrending(page = 1): Promise<TmdbSearchResult[]> {
  const res = await fetch(apiUrl('/trending/all/week', { page: String(page) }))
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? [])
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: any): TmdbSearchResult => ({
      tmdb_id: r.id,
      type: r.media_type === 'tv' ? 'show' : 'movie',
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
}

export async function discoverStreaming(
  provider: string,
  type: MediaType,
  page = 1
): Promise<{ results: TmdbSearchResult[]; total_pages: number }> {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv'
  const res = await fetch(apiUrl(endpoint, {
    watch_region: 'US',
    with_watch_providers: provider,
    with_watch_monetization_types: 'flatrate',
    sort_by: 'popularity.desc',
    page: String(page),
  }))
  if (!res.ok) return { results: [], total_pages: 0 }
  const data = await res.json()
  const results = (data.results ?? []).map((r: any): TmdbSearchResult => ({
    tmdb_id: r.id,
    type,
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
  // TMDB caps discover pagination at 500
  return { results, total_pages: Math.min(data.total_pages ?? 0, 500) }
}

export async function getCollectionDetails(id: number): Promise<TmdbCollectionDetails> {
  const res = await fetch(apiUrl(`/collection/${id}`))
  if (!res.ok) throw new Error(`TMDB collection failed: ${res.status}`)
  const d = await res.json()

  const parts: TmdbCollectionPart[] = (d.parts ?? [])
    .sort((a: any, b: any) => (a.release_date ?? '').localeCompare(b.release_date ?? ''))
    .map((p: any): TmdbCollectionPart => ({
      tmdb_id: p.id,
      title: p.title,
      poster_url: p.poster_path ? `${IMG}${p.poster_path}` : null,
      release_date: p.release_date || null,
      release_year: p.release_date ? parseInt(p.release_date.split('-')[0]) : null,
      overview: p.overview ?? '',
    }))

  return {
    id: d.id,
    name: d.name,
    overview: d.overview ?? '',
    poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
    backdrop_url: d.backdrop_path ? `${BACKDROP}${d.backdrop_path}` : null,
    parts,
  }
}

export async function getPopularCollections(page: number): Promise<TmdbCollectionSummary[]> {
  const res = await fetch(apiUrl('/movie/popular', { page: String(page) }))
  if (!res.ok) return []
  const data = await res.json()
  const movieIds: number[] = (data.results ?? []).map((m: any) => m.id)

  // belongs_to_collection is not in list responses — fetch details in parallel
  const details = await Promise.all(
    movieIds.map(id =>
      fetch(apiUrl(`/movie/${id}`))
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )
  )

  const seen = new Set<number>()
  const collections: TmdbCollectionSummary[] = []

  for (const movie of details) {
    if (!movie) continue
    const c = movie.belongs_to_collection
    if (!c || seen.has(c.id)) continue
    seen.add(c.id)
    collections.push({
      id: c.id,
      name: c.name,
      poster_url: c.poster_path ? `${IMG}${c.poster_path}` : null,
      backdrop_url: c.backdrop_path ? `${BACKDROP}${c.backdrop_path}` : null,
    })
  }
  return collections
}

export async function fetchUpcomingReleases(): Promise<any[]> {
  const tmdbKey = process.env.TMDB_API_KEY
  if (!tmdbKey) return []

  const today = new Date()
  const threeMonthsOut = new Date(today)
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3)
  const todayStr = today.toISOString().split('T')[0]
  const endStr = threeMonthsOut.toISOString().split('T')[0]

  const qs = (path: string, params: Record<string, string>) => {
    const q = new URLSearchParams({ api_key: tmdbKey, language: 'en-US', ...params })
    return `${BASE}${path}?${q}`
  }

  try {
    const [moviesRes, showsRes] = await Promise.all([
      fetch(qs('/discover/movie', {
        region: 'US', sort_by: 'popularity.desc',
        'primary_release_date.gte': todayStr, 'primary_release_date.lte': endStr,
        'with_release_type': '2|3', with_original_language: 'en', page: '1'
      })).then(r => r.json()),
      fetch(qs('/discover/tv', {
        sort_by: 'popularity.desc',
        'first_air_date.gte': todayStr, 'first_air_date.lte': endStr,
        with_original_language: 'en', page: '1'
      })).then(r => r.json())
    ])

    const seen = new Set<string>()

    const movies = (moviesRes.results ?? [])
      .filter((r: any) => {
        const key = `movie-${r.id}`
        if (!r.release_date || r.release_date < todayStr || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: any) => ({
        tmdb_id: r.id, type: 'movie' as const,
        title: r.title, overview: r.overview || '',
        poster_url: r.poster_path ? `${IMG}${r.poster_path}` : null,
        full_release_date: r.release_date,
        release_year: parseInt(r.release_date.split('-')[0]),
        genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))),
        vote_average: r.vote_average, priority: 'upcoming',
      }))

    const shows = (showsRes.results ?? [])
      .filter((r: any) => {
        const key = `show-${r.id}`
        if (!r.first_air_date || r.first_air_date < todayStr || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: any) => ({
        tmdb_id: r.id, type: 'show' as const,
        title: r.name, overview: r.overview || '',
        poster_url: r.poster_path ? `${IMG}${r.poster_path}` : null,
        full_release_date: r.first_air_date,
        release_year: parseInt(r.first_air_date.split('-')[0]),
        genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))),
        vote_average: r.vote_average, priority: 'upcoming',
      }))

    return [...movies, ...shows].sort((a, b) => a.full_release_date.localeCompare(b.full_release_date))
  } catch (err) {
    console.error('Error fetching upcoming releases:', err)
    return []
  }
}


