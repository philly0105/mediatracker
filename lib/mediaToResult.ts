import type { Media, MediaType, TmdbSearchResult } from '@/types'

// Superset shape satisfied by both `Media` rows and `TmdbCollectionPart` parts:
// the collection part supplies tmdb_id/title/overview/poster_url/release_year but
// has no `type` (always a movie franchise part), no `genres` and no `vote_average`.
type MediaSource = Pick<Media, 'tmdb_id' | 'title' | 'overview' | 'poster_url' | 'release_year'> &
  Partial<Pick<Media, 'type' | 'vote_average' | 'genres'>>

interface Overrides {
  type?: MediaType
  vote_average?: number | null
}

export function mediaToResult(source: MediaSource, overrides: Overrides = {}): TmdbSearchResult {
  return {
    tmdb_id: source.tmdb_id,
    type: overrides.type ?? source.type ?? 'movie',
    title: source.title,
    overview: source.overview ?? '',
    poster_url: source.poster_url,
    release_year: source.release_year,
    genres: source.genres,
    vote_average: overrides.vote_average ?? source.vote_average ?? undefined,
  }
}
