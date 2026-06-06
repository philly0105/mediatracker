export type MediaType = 'movie' | 'show'
export type WatchlistPriority = 'must_watch' | 'want_to_watch' | 'someday'

export interface Media {
  id: string
  tmdb_id: number
  type: MediaType
  title: string
  overview: string | null
  poster_url: string | null
  genres: string[]
  release_year: number | null
  runtime_mins: number | null
  director: string | null
  vote_average?: number | null
  cast_members: string[]
  collection_id: number | null
  collection_name: string | null
}

export interface Season {
  id: string
  media_id: string
  season_number: number
  episode_count: number
}

export interface WatchEntry {
  id: string
  user_id: string
  media_id: string
  rating: number | null
  review: string | null
  watched_at: string
  rewatch: boolean
  created_at: string
  media?: Media
}

export interface EpisodeProgress {
  id: string
  user_id: string
  season_id: string
  episode_number: number
  watched_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  media_id: string
  priority: WatchlistPriority
  added_at: string
  media?: Media
}

export interface List {
  id: string
  user_id: string
  name: string
  share_token: string | null
  is_shared: boolean
  created_at: string
}

export interface ListItem {
  id: string
  list_id: string
  media_id: string
  added_at: string
  media?: Media
}

export interface UserSettings {
  user_id: string
  watched_share_token: string | null
  watchlist_share_token: string | null
}

// TMDB search result shape (before caching)
export interface TmdbSearchResult {
  tmdb_id: number
  type: MediaType
  title: string
  overview: string
  poster_url: string | null
  release_year: number | null
  genres?: string[]
  vote_average?: number
}

export interface TmdbCollectionSummary {
  id: number
  name: string
  poster_url: string | null
  backdrop_url: string | null
}

export interface TmdbCollectionPart {
  tmdb_id: number
  title: string
  poster_url: string | null
  release_date: string | null
  release_year: number | null
  overview: string
}

export interface TmdbCollectionDetails {
  id: number
  name: string
  overview: string
  poster_url: string | null
  backdrop_url: string | null
  parts: TmdbCollectionPart[]
}
