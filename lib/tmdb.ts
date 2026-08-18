import type { TmdbSearchResult, TmdbPersonResult, MediaType, TmdbCollectionDetails, TmdbCollectionPart, TmdbCollectionSummary } from '@/types'

const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'
const BACKDROP = 'https://image.tmdb.org/t/p/w1280'
const STILL = 'https://image.tmdb.org/t/p/w300' // episode stills are thumbnail-sized

// TMDB responses are public, never user-specific. Windows are chosen by how volatile
// the underlying data actually is: near-static detail/credits metadata gets a long
// window, popularity/trending/discover listings a short one (Next 16 fetch defaults to
// no-store, so without these every call is a live round-trip to TMDB).
const CACHE_1H = 60 * 60 // search — fresh content matters when results are re-queried
const CACHE_6H = 6 * 60 * 60 // trending / discover / popular listings
const CACHE_12H = 12 * 60 * 60 // upcoming-release schedules (added & adjusted daily)
const CACHE_1D = 24 * 60 * 60 // per-title recommendation lists
const CACHE_7D = 7 * 24 * 60 * 60 // detail / credits / collection metadata (near-static)

// A raw TMDB list / multi / trending / discover item. Movies carry `title`,
// shows carry `name`; we only read the fields we actually surface, and fields
// that are genuinely optional in the API (e.g. vote_average on light fixtures)
// stay optional here rather than being pretended into existence.
type TmdbMovieListItem = {
  id: number
  media_type?: string
  title: string
  name?: undefined
  overview?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string | null
  first_air_date?: undefined
  genre_ids?: number[]
  vote_average?: number
  vote_count?: number
  runtime?: number | null
}

type TmdbShowListItem = {
  id: number
  media_type?: string
  name: string
  title?: undefined
  overview?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  first_air_date?: string | null
  release_date?: undefined
  genre_ids?: number[]
  vote_average?: number
  vote_count?: number
  runtime?: number | null
}

type TmdbListItem = TmdbMovieListItem | TmdbShowListItem

// Detail-payload building blocks (from /movie/:id, /tv/:id and friends).
type TmdbGenre = { id?: number; name: string }
type TmdbCastMember = { id?: number; name: string; character?: string }
type TmdbCrewMember = { id?: number; name: string; job?: string }
type TmdbVideo = { key?: string; type?: string; site?: string }
type TmdbSeason = { id?: number; season_number: number; episode_count: number; name?: string }

// A raw part row from /collection/:id. Only used to read the fields we map out.
type TmdbCollectionPartResponse = {
  id: number
  title: string
  release_date?: string | null
  overview?: string | null
  poster_path?: string | null
}

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

export const TMDB_GENRE_NAME_TO_ID: Record<string, number> = Object.entries(TMDB_GENRES).reduce(
  (acc, [id, name]) => {
    if (acc[name] === undefined) acc[name] = Number(id)
    return acc
  },
  {} as Record<string, number>
)

const TMDB_MOVIE_GENRE_IDS = new Set([
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37,
])
const TMDB_SHOW_GENRE_IDS = new Set([
  10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37,
])

function getGenreIdForType(genreName: string, type: MediaType) {
  const allowedIds = type === 'movie' ? TMDB_MOVIE_GENRE_IDS : TMDB_SHOW_GENRE_IDS
  const match = Object.entries(TMDB_GENRES).find(
    ([id, name]) => name === genreName && allowedIds.has(Number(id))
  )
  return match ? Number(match[0]) : TMDB_GENRE_NAME_TO_ID[genreName]
}

function apiUrl(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ api_key: process.env.TMDB_API_KEY ?? '', ...params })
  return `${BASE}${path}?${qs}`
}

async function fetchTmdb(url: string, revalidateSeconds: number, timeoutMs = 8000): Promise<Response> {
  try {
    const signal = AbortSignal.timeout(timeoutMs)
    return await fetch(url, {
      signal,
      cache: 'force-cache',
      next: { revalidate: revalidateSeconds },
    })
  } catch {
    return new Response(null, { status: 504, statusText: 'Gateway Timeout' })
  }
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const res = await fetchTmdb(apiUrl('/search/multi', { query, include_adult: 'false' }), CACHE_1H)
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)
  const data = await res.json()

  return data.results
    .filter((r: TmdbListItem) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: TmdbListItem): TmdbSearchResult => ({
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

// People search is its own overlay mode, kept out of /search/multi so an actor
// query isn't diluted by every title they appear in. known_for gives the row a
// subtitle to disambiguate same-named people.
type TmdbPersonListItem = {
  id: number
  name: string
  profile_path?: string | null
  known_for?: Array<{ title?: string; name?: string }>
}

export async function searchTmdbPeople(query: string): Promise<TmdbPersonResult[]> {
  const res = await fetchTmdb(apiUrl('/search/person', { query, include_adult: 'false' }), CACHE_1H)
  if (!res.ok) throw new Error(`TMDB person search failed: ${res.status}`)
  const data = await res.json()

  return (data.results as TmdbPersonListItem[]).map((p): TmdbPersonResult => ({
    id: p.id,
    name: p.name,
    profile_url: p.profile_path ? `${IMG}${p.profile_path}` : null,
    known_for: (p.known_for ?? [])
      .map((k) => k.title ?? k.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', '),
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

export type StreamingSort = 'popular' | 'rating' | 'latest'

type ShowRuntimeSource = {
  episode_run_time?: number[] | null
  last_episode_to_air?: { runtime?: number | null } | null
  next_episode_to_air?: { runtime?: number | null } | null
}

// A show's per-episode runtime, which is what the stats page multiplies by the
// number of watched episodes.
//
// `episode_run_time` is the obvious field and used to be the only one read here,
// but TMDB has been deprecating it and returns an empty array for most shows now
// — 24 of the 26 shows in this database have a null runtime because of it. So
// fall back to an actual episode's runtime, which TMDB does still populate.
// Anything <= 0 is treated as missing rather than trusted.
export function showRuntimeMins(d: ShowRuntimeSource): number | null {
  const candidates = [
    d.episode_run_time?.[0],
    d.last_episode_to_air?.runtime,
    d.next_episode_to_air?.runtime,
  ]
  for (const value of candidates) {
    if (typeof value === 'number' && value > 0) return value
  }
  return null
}

export async function fetchTmdbDetails(
  tmdbId: number,
  type: MediaType,
  append = true
): Promise<TmdbFullDetails> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  // Cheap callers (e.g. /api/tmdb/rating, which only needs vote_average) can opt out of
  // the heavy append_to_response payload (full credits, trailers, providers, external_ids).
  const params: Record<string, string> = {}
  if (append) params.append_to_response = 'credits,videos,watch/providers,external_ids'
  const res = await fetchTmdb(apiUrl(endpoint, params), CACHE_7D)
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`)
  const d = await res.json()

  // These fields only exist in the append_to_response payload; stay safe when append=false
  const trailerKey = append ? d.videos?.results?.find((v: TmdbVideo) => v.type === 'Trailer' && v.site === 'YouTube')?.key : undefined
  const trailer_url = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null

  const providersData = append ? d['watch/providers']?.results?.US : undefined
  const watch_providers: TmdbWatchProviders | null = providersData ? {
    link: providersData.link,
    flatrate: providersData.flatrate?.map((p: TmdbWatchProvider) => ({ provider_id: p.provider_id, provider_name: p.provider_name, logo_path: p.logo_path ? `${IMG}${p.logo_path}` : null })),
    rent: providersData.rent?.map((p: TmdbWatchProvider) => ({ provider_id: p.provider_id, provider_name: p.provider_name, logo_path: p.logo_path ? `${IMG}${p.logo_path}` : null })),
    buy: providersData.buy?.map((p: TmdbWatchProvider) => ({ provider_id: p.provider_id, provider_name: p.provider_name, logo_path: p.logo_path ? `${IMG}${p.logo_path}` : null })),
  } : null

  if (type === 'movie') {
    const director = d.credits?.crew?.find((c: TmdbCrewMember) => c.job === 'Director')?.name ?? null
    return {
      tmdb_id: d.id, type: 'movie',
      imdb_id: d.imdb_id ?? null,
      title: d.title, overview: d.overview ?? '',
      poster_url: d.poster_path ? `${IMG}${d.poster_path}` : null,
      genres: (d.genres ?? []).map((g: TmdbGenre) => g.name),
      release_year: d.release_date ? parseInt(d.release_date.split('-')[0]) : null,
      runtime_mins: d.runtime ?? null,
      director,
      cast_members: (d.credits?.cast ?? []).slice(0, 5).map((c: TmdbCastMember) => c.name),
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
      genres: (d.genres ?? []).map((g: TmdbGenre) => g.name),
      release_year: d.first_air_date ? parseInt(d.first_air_date.split('-')[0]) : null,
      runtime_mins: showRuntimeMins(d),
      director: null,
      cast_members: (d.credits?.cast ?? []).slice(0, 5).map((c: TmdbCastMember) => c.name),
      seasons: (d.seasons ?? [])
        // Season 0 is TMDB's "Specials" bucket — recaps, behind-the-scenes,
        // webisodes — and it is often larger than a real season. Dropping it
        // keeps the tracker to episodes people actually watch through. This is
        // deliberate, not an oversight: making specials trackable means adding
        // a Season 0 to every show, which is a product call, not a bug fix.
        .filter((s: TmdbSeason) => s.season_number > 0)
        .map((s: TmdbSeason) => ({ season_number: s.season_number, episode_count: s.episode_count })),
      full_release_date: d.next_episode_to_air?.air_date || null,
      trailer_url,
      watch_providers,
      vote_average: d.vote_average,
    }
  }
}

// A raw episode from /tv/:id/season/:n.
type TmdbEpisode = {
  episode_number?: number
  name?: string | null
  overview?: string | null
  air_date?: string | null
  runtime?: number | null
  still_path?: string | null
}

export interface TmdbSeasonEpisode {
  episode_number: number
  name: string | null
  air_date: string | null
  overview: string | null
  runtime_mins: number | null
  still_url: string | null
}

// TMDB writes an unknown air date as "" rather than omitting it, and air_date is
// a `date` column — inserting "" is a 22007 invalid_datetime_format, so every
// empty string has to become null before it reaches the database.
function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

export function mapSeasonEpisodes(data: { episodes?: TmdbEpisode[] }): TmdbSeasonEpisode[] {
  return (data.episodes ?? [])
    // A season's episode list is the one place numbering can be missing or
    // zero (TMDB uses episode 0 for some specials); episode_progress keys on
    // this number, so anything that is not a positive integer is unusable.
    .filter((e): e is TmdbEpisode & { episode_number: number } =>
      typeof e.episode_number === 'number' && Number.isInteger(e.episode_number) && e.episode_number > 0
    )
    .map((e) => ({
      episode_number: e.episode_number,
      name: nullIfBlank(e.name),
      air_date: nullIfBlank(e.air_date),
      overview: nullIfBlank(e.overview),
      runtime_mins: typeof e.runtime === 'number' && e.runtime > 0 ? e.runtime : null,
      still_url: e.still_path ? `${STILL}${e.still_path}` : null,
    }))
}

// Per-episode metadata for one season. Same 7-day window as the other detail
// endpoints: an episode's title and air date change about as often.
export async function fetchTmdbSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number
): Promise<TmdbSeasonEpisode[]> {
  const res = await fetchTmdb(apiUrl(`/tv/${tmdbId}/season/${seasonNumber}`), CACHE_7D)
  if (!res.ok) throw new Error(`TMDB season failed: ${res.status}`)
  return mapSeasonEpisodes(await res.json())
}

export async function fetchTmdbRecommendations(tmdbId: number, type: MediaType, page = 1): Promise<TmdbSearchResult[]> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/recommendations` : `/tv/${tmdbId}/recommendations`
  const res = await fetchTmdb(apiUrl(endpoint, { page: String(page) }), CACHE_1D)
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? [])
    .map((r: TmdbListItem): TmdbSearchResult => ({
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
  const res = await fetchTmdb(apiUrl('/trending/all/week', { page: String(page) }), CACHE_6H)
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? [])
    .filter((r: TmdbListItem) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: TmdbListItem): TmdbSearchResult => ({
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
  page = 1,
  sort: StreamingSort = 'popular'
): Promise<{ results: TmdbSearchResult[]; total_pages: number }> {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv'
  const sortBy =
    sort === 'rating'
      ? 'vote_average.desc'
      : sort === 'latest'
        ? type === 'movie'
          ? 'primary_release_date.desc'
          : 'first_air_date.desc'
        : 'popularity.desc'
  const params: Record<string, string> = {
    watch_region: 'US',
    with_watch_providers: provider,
    with_watch_monetization_types: 'flatrate',
    sort_by: sortBy,
    page: String(page),
  }
  if (sort === 'rating') {
    params['vote_count.gte'] = '100'
  }
  const res = await fetchTmdb(apiUrl(endpoint, params), CACHE_6H)
  if (!res.ok) return { results: [], total_pages: 0 }
  const data = await res.json()
  const results = (data.results ?? []).map((r: TmdbListItem): TmdbSearchResult => ({
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

export async function discoverByGenre(
  genreName: string,
  type: MediaType,
  page = 1
): Promise<{ results: TmdbSearchResult[]; total_pages: number }> {
  const genreId = getGenreIdForType(genreName, type)
  if (!genreId) return { results: [], total_pages: 0 }

  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv'
  const res = await fetchTmdb(apiUrl(endpoint, {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
  }), CACHE_6H)
  if (!res.ok) return { results: [], total_pages: 0 }
  const data = await res.json()
  const results = (data.results ?? []).map((r: TmdbListItem): TmdbSearchResult => ({
    tmdb_id: r.id,
    type,
    title: r.title ?? r.name ?? '',
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
  const res = await fetchTmdb(apiUrl(`/collection/${id}`), CACHE_7D)
  if (!res.ok) throw new Error(`TMDB collection failed: ${res.status}`)
  const d = await res.json()

  const parts: TmdbCollectionPart[] = (d.parts ?? [])
    .sort((a: TmdbCollectionPartResponse, b: TmdbCollectionPartResponse) => (a.release_date ?? '').localeCompare(b.release_date ?? ''))
    .map((p: TmdbCollectionPartResponse): TmdbCollectionPart => ({
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
  const res = await fetchTmdb(apiUrl('/movie/popular', { page: String(page) }), CACHE_6H)
  if (!res.ok) return []
  const data = await res.json()
  const movieIds: number[] = (data.results ?? []).map((m: TmdbListItem) => m.id)

  // Chunk parallel detail fetches into batches of 5 to avoid unthrottled burst flooding
  type MovieCollectionDetail = { belongs_to_collection?: { id: number; name: string; poster_path?: string | null; backdrop_path?: string | null } | null } | null
  const details: MovieCollectionDetail[] = []
  const CHUNK_SIZE = 5
  for (let i = 0; i < movieIds.length; i += CHUNK_SIZE) {
    const chunk = movieIds.slice(i, i + CHUNK_SIZE)
    const chunkDetails = await Promise.all(
      chunk.map(id =>
        fetchTmdb(apiUrl(`/movie/${id}`), CACHE_7D)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    )
    details.push(...chunkDetails)
  }

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

export type UpcomingRelease = {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  overview: string
  poster_url: string | null
  full_release_date: string
  release_year: number | null
  genres: string[]
  vote_average?: number
  priority: string
  followed?: boolean
  episode_label?: string
}

export type FollowedShow = {
  tmdb_id: number
  title: string
  poster_url: string | null
  release_year: number | null
  genres?: string[] | null
  overview?: string | null
}

type UpcomingOptions = {
  // How many paginated discover pages to pull per type. Defaults keep the dashboard's
  // original 1 movie + 1 show page; /calendar passes its richer 3 + 2.
  pages?: { movie?: number; show?: number }
  // Followed shows (already joined from followed_shows) whose next_episode_to_air should
  // be resolved and surfaced as followed releases. None by default (dashboard behaviour).
  followedShows?: FollowedShow[]
}

// Cap followed-show detail fetches to bound TMDB API cost, mirroring the old /api/calendar route.
const MAX_FOLLOWED = 25

export async function fetchUpcomingReleases(options?: UpcomingOptions): Promise<UpcomingRelease[]> {
  const tmdbKey = process.env.TMDB_API_KEY
  if (!tmdbKey) return []

  const { pages = {}, followedShows = [] } = options ?? {}
  const moviePages = pages.movie ?? 1
  const showPages = pages.show ?? 1

  const today = new Date()
  const threeMonthsOut = new Date(today)
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3)
  const todayStr = today.toISOString().split('T')[0]
  const endStr = threeMonthsOut.toISOString().split('T')[0]

  const qs = (path: string, params: Record<string, string>) => {
    const q = new URLSearchParams({ api_key: tmdbKey, language: 'en-US', ...params })
    return `${BASE}${path}?${q}`
  }

  // Give TMDB a bounded time to respond instead of hanging/queuing indefinitely
  const safeJson = async (url: string) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(url, { signal: controller.signal, next: { revalidate: CACHE_12H } })
      if (!res.ok) {
        console.error(`Error fetching upcoming releases: TMDB responded ${res.status} for ${url}`)
        return { results: [] }
      }
      return await res.json()
    } catch (err) {
      console.error('Error fetching upcoming releases:', err)
      return { results: [] }
    } finally {
      clearTimeout(timeout)
    }
  }

  try {
    const movieRequests = Array.from({ length: moviePages }, (_, i) => i + 1).map(page =>
      safeJson(qs('/discover/movie', {
        region: 'US', sort_by: 'popularity.desc',
        'primary_release_date.gte': todayStr, 'primary_release_date.lte': endStr,
        'with_release_type': '2|3', with_original_language: 'en', page: String(page),
      }))
    )
    const showRequests = Array.from({ length: showPages }, (_, i) => i + 1).map(page =>
      safeJson(qs('/discover/tv', {
        sort_by: 'popularity.desc',
        'first_air_date.gte': todayStr, 'first_air_date.lte': endStr,
        with_original_language: 'en', page: String(page),
      }))
    )
    const [movieResults, showResults] = await Promise.all([
      Promise.all(movieRequests),
      Promise.all(showRequests),
    ])

    const seen = new Set<string>()

    const movies = movieResults
      .flatMap(d => d.results ?? [])
      .filter((r: TmdbListItem) => {
        const key = `movie-${r.id}`
        if (!r.release_date || r.release_date < todayStr || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: TmdbMovieListItem & { release_date: string }) => ({
        tmdb_id: r.id, type: 'movie' as const,
        title: r.title, overview: r.overview || '',
        poster_url: r.poster_path ? `${IMG}${r.poster_path}` : null,
        full_release_date: r.release_date,
        release_year: parseInt(r.release_date.split('-')[0]),
        genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))) as string[],
        vote_average: r.vote_average, priority: 'upcoming',
      }))

    const shows = showResults
      .flatMap(d => d.results ?? [])
      .filter((r: TmdbListItem) => {
        const key = `show-${r.id}`
        if (!r.first_air_date || r.first_air_date < todayStr || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: TmdbShowListItem & { first_air_date: string }) => ({
        tmdb_id: r.id, type: 'show' as const,
        title: r.name, overview: r.overview || '',
        poster_url: r.poster_path ? `${IMG}${r.poster_path}` : null,
        full_release_date: r.first_air_date,
        release_year: parseInt(r.first_air_date.split('-')[0]),
        genres: Array.from(new Set((r.genre_ids || []).map((id: number) => TMDB_GENRES[id]).filter(Boolean))) as string[],
        vote_average: r.vote_average, priority: 'upcoming',
      }))

    // Followed shows' next episode-to-air (auth-scoped, resolved per show)
    const followedReleases: UpcomingRelease[] = []
    if (followedShows.length > 0) {
      const resolved = await Promise.all(
        followedShows.slice(0, MAX_FOLLOWED).map(async (show) => {
          if (!show || !show.tmdb_id) return null
          try {
            const d = await safeJson(qs(`/tv/${show.tmdb_id}`, {}))
            const next = d.next_episode_to_air
            if (!next?.air_date) return null
            const key = `show-${show.tmdb_id}`
            // Don't duplicate if it's already in the new-shows list
            seen.add(key)
            return {
              tmdb_id: show.tmdb_id, type: 'show' as const,
              title: show.title, overview: show.overview || '',
              poster_url: show.poster_url,
              full_release_date: next.air_date,
              release_year: show.release_year,
              genres: show.genres ?? [],
              vote_average: d.vote_average,
              priority: 'upcoming',
              followed: true,
              episode_label: `S${next.season_number} · E${next.episode_number}`,
            } as UpcomingRelease
          } catch {
            return null
          }
        })
      )
      followedReleases.push(...resolved.filter((r): r is UpcomingRelease => r !== null))
    }

    return [...movies, ...shows, ...followedReleases]
      .sort((a, b) => a.full_release_date.localeCompare(b.full_release_date))
  } catch (err) {
    console.error('Error fetching upcoming releases:', err)
    return []
  }
}



