import type { TmdbSearchResult, MediaType } from '@/types'

const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'

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

export interface TmdbFullDetails {
  tmdb_id: number
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
}

export async function fetchTmdbDetails(tmdbId: number, type: MediaType): Promise<TmdbFullDetails> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  const res = await fetch(apiUrl(endpoint, { append_to_response: 'credits' }))
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`)
  const d = await res.json()

  if (type === 'movie') {
    const director = d.credits?.crew?.find((c: any) => c.job === 'Director')?.name ?? null
    return {
      tmdb_id: d.id, type: 'movie',
      title: d.title, overview: d.overview ?? '',
      poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
      genres: (d.genres ?? []).map((g: any) => g.name),
      release_year: d.release_date ? parseInt(d.release_date.split('-')[0]) : null,
      runtime_mins: d.runtime ?? null,
      director,
      cast_members: (d.credits?.cast ?? []).slice(0, 5).map((c: any) => c.name),
    }
  } else {
    return {
      tmdb_id: d.id, type: 'show',
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
    }
  }
}

export async function fetchTmdbRecommendations(tmdbId: number, type: MediaType): Promise<TmdbSearchResult[]> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/recommendations` : `/tv/${tmdbId}/recommendations`
  const res = await fetch(apiUrl(endpoint))
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

