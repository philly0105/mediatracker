import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { findNextUp } from '@/lib/nextUp'
import { fetchMediaArt } from '@/lib/mediaArt'
import { fetchNextEpisodes } from '@/lib/nextEpisode'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { mediaKey } from '@/lib/mediaKey'
import { getTopRecommendation } from '@/lib/recommendations'
import type { Media, MediaType, WatchEntry } from '@/types'
import HomeHeader from '@/components/home/HomeHeader'
import EmptyHero from '@/components/home/EmptyHero'
import { HeroSectionSkeleton } from '@/components/home/HomeSkeletons'
import HomeStatsPanel, { StatsPanelSkeleton, loadYearStats } from '@/components/home/HomeStatsPanel'
import BecauseYouWatched, { BecauseYouWatchedSkeleton } from '@/components/home/BecauseYouWatched'
import ContinueWatchingRow, { type ContinueWatchingShow, type ContinueWatchingTmdb } from '@/components/ContinueWatchingRow'
import DashboardUpcoming from '@/components/DashboardUpcoming'
import DashboardRecentCards from '@/components/DashboardRecentCards'

type ProgressWithSeason = {
  season_id: string
  episode_number: number
  seasons: { media_id: string } | { media_id: string }[] | null
}

type SeasonMedia = { id: string; title: string; poster_url: string | null; tmdb_id: number; runtime_mins: number | null }

type SeasonWithMedia = {
  id: string
  media_id: string
  season_number: number
  episode_count: number
  media: SeasonMedia | SeasonMedia[] | null
}

type WatchlistRow = {
  priority: string
  media: { tmdb_id: number; type: MediaType } | { tmdb_id: number; type: MediaType }[] | null
}

function joinedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

// The hero plus the reference's four "Up next" rows.
const SHOWN_SHOWS = 5

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const now = new Date()

  // The two slow reads start now and are awaited only inside their own
  // Suspense boundaries below, so they overlap with everything else and
  // stream in behind the hero. Neither can reject.
  const statsPromise = loadYearStats(supabase, user.id, now.getFullYear())
  const recPromise = getTopRecommendation(supabase, user.id).catch(() => null)

  const [{ data: recent }, { data: watchlistRows }, { data: recentShowIds }] = await Promise.all([
    supabase
      .from('watch_entries')
      .select('id, rating, review, watched_at, rewatch, created_at, media!inner(id, tmdb_id, type, title, overview, poster_url, release_year, genres, vote_average)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    // Keys as well as priorities: the "Coming soon" bookmarks need to know
    // which upcoming titles are already on the list.
    supabase.from('watchlist_items').select('priority, media!inner(tmdb_id, type)').eq('user_id', user.id),
    // Grouped in the database (migration 010) so this is the 10 genuinely most
    // recent shows. Reducing raw progress rows to distinct media_ids in JS means
    // either fetching the whole history or capping the row count — and a cap
    // loses shows outright when one binge fills it.
    supabase.rpc('recent_watching_media_ids', { max_shows: 10 }),
  ])

  const recentEntries = (recent ?? []) as unknown as WatchEntry[]
  const mediaIds = ((recentShowIds ?? []) as { media_id: string }[])
    .map((row) => row.media_id)
    .filter((mediaId): mediaId is string => Boolean(mediaId))
  const recentMediaId = recentEntries[0]?.media?.id ?? null

  // Art for the shows in progress and, for the empty hero, the latest watch.
  const artIds = recentMediaId ? [...mediaIds, recentMediaId] : mediaIds

  // Rows from the seasons join always carry a TMDB id, which the episode and
  // details lookups below need; the rail type leaves it optional.
  let continueWatchingShows: Array<ContinueWatchingShow & { media: SeasonMedia }> = []
  let art = new Map<string, { backdrop_url: string | null; logo_url: string | null }>()

  if (mediaIds.length > 0) {
    const [{ data: seasonsData }, { data: fullProgressData }, artMap] = await Promise.all([
      supabase
        .from('seasons')
        .select('id, media_id, season_number, episode_count, media!inner(id, title, poster_url, tmdb_id, runtime_mins)')
        .in('media_id', mediaIds)
        .order('season_number', { ascending: true }),
      supabase
        .from('episode_progress')
        .select('season_id, episode_number, seasons!inner(media_id)')
        .eq('user_id', user.id)
        .in('seasons.media_id', mediaIds),
      fetchMediaArt(supabase, artIds),
    ])
    art = artMap

    const fullProgress = (fullProgressData ?? []) as ProgressWithSeason[]
    const seasonsByMediaId = new Map<string, ContinueWatchingShow['seasons']>()
    const mediaById = new Map<string, SeasonMedia>()
    for (const season of ((seasonsData ?? []) as SeasonWithMedia[])) {
      const media = joinedOne(season.media)
      if (!media) continue

      mediaById.set(season.media_id, media)
      const seasons = seasonsByMediaId.get(season.media_id) ?? []
      seasons.push({
        id: season.id,
        season_number: season.season_number,
        episode_count: season.episode_count,
      })
      seasonsByMediaId.set(season.media_id, seasons)
    }

    const watchedKeysByMediaId = new Map<string, Set<string>>()
    for (const progress of fullProgress) {
      const mediaId = joinedOne(progress.seasons)?.media_id
      if (!mediaId) continue

      const watchedKeys = watchedKeysByMediaId.get(mediaId) ?? new Set<string>()
      watchedKeys.add(`${progress.season_id}-${progress.episode_number}`)
      watchedKeysByMediaId.set(mediaId, watchedKeys)
    }

    continueWatchingShows = mediaIds.flatMap((mediaId) => {
      const media = mediaById.get(mediaId)
      const seasons = seasonsByMediaId.get(mediaId) ?? []
      const watchedKeys = watchedKeysByMediaId.get(mediaId) ?? new Set<string>()
      const nextUp = findNextUp(seasons, watchedKeys)
      if (!media || !nextUp) return []

      return [{
        media,
        seasons,
        watchedEpisodeKeys: Array.from(watchedKeys),
        nextUp,
        art: art.get(mediaId),
      }]
    })
  } else if (recentMediaId) {
    art = await fetchMediaArt(supabase, [recentMediaId])
  }

  const priorityCounts = { must_watch: 0, want_to_watch: 0, someday: 0 }
  const watchlistKeys: string[] = []
  for (const row of ((watchlistRows ?? []) as WatchlistRow[])) {
    priorityCounts[row.priority as keyof typeof priorityCounts]++
    const media = joinedOne(row.media)
    if (media) watchlistKeys.push(mediaKey(media.type, media.tmdb_id))
  }

  const shown = continueWatchingShows.slice(0, SHOWN_SHOWS)
  const recentMedia = recentEntries[0]?.media ?? null
  const recentArt = recentMediaId ? art.get(recentMediaId) : undefined
  // One preloaded image on the page, decided from database data alone so the
  // rail can stream before TMDB answers: a show in progress means the hero
  // preloads its backdrop (stored or TMDB's); with none, the empty hero
  // preloads the latest watch's stored art, and only when that is missing too
  // does the first recent poster take the slot.
  const preloadFirstPoster = shown.length === 0 && !recentArt?.backdrop_url

  return (
    <div className="space-y-6">
      <HomeHeader email={user.email} name={user.name} />

      <Suspense fallback={<HeroFallback />}>
        <HeroSection
          supabase={supabase}
          shown={shown}
          recent={recentMedia}
          recentArt={recentArt}
          comingSoon={<DashboardUpcoming watchlistKeys={watchlistKeys} />}
        />
      </Suspense>

      <DashboardRecentCards entries={recentEntries} preloadFirst={preloadFirstPoster} />

      <div className="flex flex-wrap items-stretch" style={{ gap: 24 }}>
        <Suspense fallback={<StatsPanelSkeleton />}>
          <HomeStatsPanel
            stats={statsPromise}
            inProgress={continueWatchingShows.length}
            mustWatch={priorityCounts.must_watch}
            now={now}
          />
        </Suspense>
        <Suspense fallback={<BecauseYouWatchedSkeleton />}>
          <BecauseYouWatched rec={recPromise} />
        </Suspense>
      </div>
    </div>
  )
}

type HeroSectionProps = {
  supabase: Awaited<ReturnType<typeof createClient>>
  shown: Array<ContinueWatchingShow & { media: SeasonMedia }>
  /** The latest watch, whose art stands in when nothing is in progress. */
  recent: Media | null
  recentArt: { backdrop_url: string | null; logo_url: string | null } | undefined
  comingSoon: ReactNode
}

/**
 * What the hero and rows show beyond the database: each next episode's name
 * and still, and each show's platform, rating, tagline and (when 014's art
 * columns are empty) its backdrop and logo. These are the page's only TMDB
 * reads, so they wait inside their own Suspense boundary: on a cold cache the
 * header and the recent rail paint while the hero fills in behind its
 * skeleton. Every fetch is cached, and any one failing leaves the hero on
 * database fields rather than taking the section down.
 */
async function HeroSection({ supabase, shown, recent, recentArt, comingSoon }: HeroSectionProps) {
  const [nextEpisodes, tmdbDetails, recentDetails] = await Promise.all([
    fetchNextEpisodes(supabase, shown.map((show) => ({ tmdbId: show.media.tmdb_id, nextUp: show.nextUp }))),
    Promise.all(shown.map((show) => fetchTmdbDetails(show.media.tmdb_id, 'show').catch(() => null))),
    // The empty hero's backdrop when the media row has none yet (014 not
    // applied): the cheap details call, since only the backdrop is wanted.
    shown.length === 0 && recent && !recentArt?.backdrop_url
      ? fetchTmdbDetails(recent.tmdb_id, recent.type, false).catch(() => null)
      : null,
  ])

  const shows: ContinueWatchingShow[] = shown.map((show, i) => {
    const details = tmdbDetails[i]
    const tmdb: ContinueWatchingTmdb | undefined = details
      ? {
          tagline: details.tagline,
          certification: details.certification,
          genres: details.genres,
          vote_average: details.vote_average ?? null,
          platform: details.watch_providers?.flatrate?.[0]?.provider_name ?? null,
          backdrop_url: details.backdrop_url,
          logo_url: details.logo_url,
          release_year: details.release_year,
        }
      : undefined
    return { ...show, tmdb, nextEpisode: nextEpisodes[i] ?? null }
  })

  // Only stored art is preloaded here; when it is missing the rail already
  // took the page's one preload slot, so a TMDB backdrop loads plainly.
  const emptyHero = (
    <EmptyHero
      recent={recent ? { title: recent.title, backdrop_url: recentArt?.backdrop_url ?? recentDetails?.backdrop_url ?? null } : null}
      preload={Boolean(recentArt?.backdrop_url)}
    />
  )

  return <ContinueWatchingRow shows={shows} emptyHero={emptyHero} comingSoon={comingSoon} />
}

function HeroFallback() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading what to watch next...</span>
      <div aria-hidden="true" className="space-y-6">
        <HeroSectionSkeleton />
      </div>
    </div>
  )
}
