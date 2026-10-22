import type { NextEpisodeDetails } from '@/lib/nextEpisode'

export type ContinueWatchingSeason = {
  id: string
  season_number: number
  episode_count: number
}

export type ContinueWatchingNextUp = {
  season_id: string
  season_number: number
  episode_number: number
}

/** What the hero and Up next rows show from TMDB; absent when TMDB was unreachable. */
export type ContinueWatchingTmdb = {
  tagline: string | null
  certification: string | null
  genres: string[]
  vote_average: number | null
  platform: string | null
  backdrop_url: string | null
  logo_url: string | null
  /** TMDB's width over height for `logo_url`; optional so older callers still fit. */
  logo_aspect?: number | null
  release_year: number | null
}

export type ContinueWatchingShow = {
  media: {
    id: string
    title: string
    poster_url: string | null
    // Optional so the old three-field callers (and their tests) still fit:
    // without tmdb_id the hero leaves out the rate/add buttons, and without
    // runtime_mins it leaves out "to go".
    tmdb_id?: number
    runtime_mins?: number | null
  }
  seasons: ContinueWatchingSeason[]
  watchedEpisodeKeys: string[]
  nextUp: ContinueWatchingNextUp
  /** Backdrop and logo stored on the media row (migration 014). */
  art?: { backdrop_url: string | null; logo_url: string | null }
  tmdb?: ContinueWatchingTmdb
  /** The next-up episode's name, still, runtime and air date; null when unknown. */
  nextEpisode?: NextEpisodeDetails | null
}
