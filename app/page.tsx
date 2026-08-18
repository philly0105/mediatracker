import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, Flame, ArrowRight, MonitorPlay } from 'lucide-react'
import DashboardRecentCards from '@/components/DashboardRecentCards'
import { BentoGrid, BentoGridItem } from '@/components/ui/BentoGrid'
import { Card } from '@/components/ui/Card'
import { StatTile } from '@/components/ui/StatTile'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import DashboardSearchBar from '@/components/DashboardSearchBar'
import DashboardUpcomingWidget from '@/components/DashboardUpcomingWidget'
import ContinueWatchingRow, { type ContinueWatchingShow } from '@/components/ContinueWatchingRow'
import { fetchUpcomingReleases } from '@/lib/tmdb'
import { findNextUp } from '@/lib/nextUp'

type ProgressWithSeason = {
  season_id: string
  episode_number: number
  seasons: { media_id: string } | { media_id: string }[] | null
}

type SeasonWithMedia = {
  id: string
  media_id: string
  season_number: number
  episode_count: number
  media: { id: string; title: string; poster_url: string | null } | { id: string; title: string; poster_url: string | null }[] | null
}

function joinedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const [
    { data: recent },
    { data: watchlistCounts },
    { count: thisYearCount },
    upcomingReleases,
    { data: recentShowIds },
  ] = await Promise.all([
    supabase
      .from('watch_entries')
      .select('id, rating, review, watched_at, rewatch, created_at, media!inner(id, tmdb_id, type, title, overview, poster_url, release_year, genres, vote_average)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('watchlist_items').select('priority').eq('user_id', user.id),
    supabase.from('watch_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('watched_at', `${new Date().getFullYear()}-01-01`),
    fetchUpcomingReleases(),
    // Grouped in the database (migration 010) so this is the 10 genuinely most
    // recent shows. Reducing raw progress rows to distinct media_ids in JS means
    // either fetching the whole history or capping the row count — and a cap
    // loses shows outright when one binge fills it.
    supabase.rpc('recent_watching_media_ids', { max_shows: 10 }),
  ])

  const mediaIds = ((recentShowIds ?? []) as { media_id: string }[])
    .map((row) => row.media_id)
    .filter((mediaId): mediaId is string => Boolean(mediaId))

  let continueWatchingShows: ContinueWatchingShow[] = []
  if (mediaIds.length > 0) {
    const [{ data: seasonsData }, { data: fullProgressData }] = await Promise.all([
      supabase
        .from('seasons')
        .select('id, media_id, season_number, episode_count, media!inner(id, title, poster_url)')
        .in('media_id', mediaIds)
        .order('season_number', { ascending: true }),
      supabase
        .from('episode_progress')
        .select('season_id, episode_number, seasons!inner(media_id)')
        .eq('user_id', user.id)
        .in('seasons.media_id', mediaIds),
    ])

    const fullProgress = (fullProgressData ?? []) as ProgressWithSeason[]
    const seasonsByMediaId = new Map<string, ContinueWatchingShow['seasons']>()
    const mediaById = new Map<string, ContinueWatchingShow['media']>()
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
      }]
    })
  }

  const priorityCounts = { must_watch: 0, want_to_watch: 0, someday: 0 }
  for (const item of (watchlistCounts ?? [])) {
    priorityCounts[item.priority as keyof typeof priorityCounts]++
  }

  return (
    <div className="space-y-12 relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-[0.15] z-0 h-[500px]" />
      
      {/* Header with integrated Search Bar */}
      <div className="relative z-30">
        <PageHeader
          eyebrow="Welcome back"
          title="Dashboard"
          sub="Your personal media collection and viewing analytics."
          action={
            <div className="w-full sm:w-auto sm:min-w-[380px]">
              <DashboardSearchBar />
            </div>
          }
        />
      </div>

      {/* Bento Grid Stats */}
      <div className="relative z-10">
        <BentoGrid className="grid-cols-1 md:grid-cols-3">
          
          {/* Stat 1: Watched this Year */}
          <BentoGridItem delay={0.1} className="col-span-1 md:order-1">
            <Link href="/stats" className="block cursor-pointer h-full">
              <StatTile
                style={{ height: '100%' }}
                label={`Year ${new Date().getFullYear()}`}
                value={thisYearCount ?? 0}
                icon={<Calendar className="w-5 h-5 text-[var(--accent)]" />}
              />
            </Link>
          </BentoGridItem>

          {/* Stat 2: Must Watch */}
          <BentoGridItem delay={0.2} className="col-span-1 md:order-3">
            <Link href="/watchlist" className="block cursor-pointer h-full">
              <StatTile
                style={{ height: '100%' }}
                label="Must Watch"
                value={priorityCounts.must_watch}
                icon={<Flame className="w-5 h-5 text-[var(--live)]" />}
              />
            </Link>
          </BentoGridItem>

          {/* Stat 3: Upcoming Releases / Release Calendar */}
          <BentoGridItem delay={0.3} className="col-span-1 md:col-span-2 md:row-span-2 md:order-2">
            <Card style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
              <DashboardUpcomingWidget releases={upcomingReleases} />
            </Card>
          </BentoGridItem>

        </BentoGrid>
      </div>

      {continueWatchingShows.length > 0 && (
        <ContinueWatchingRow shows={continueWatchingShows} />
      )}

      {/* Recently Watched */}
      <div className="relative z-10 pt-4">
        <div className="flex items-center justify-between mb-6 pl-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            Recently Watched
          </h2>
          <Link
            href="/library"
            className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* One state, one component. These used to render together — harmless
            only because an empty grid has no height. */}
        {(recent ?? []).length === 0 ? (
          <EmptyState
            icon={MonitorPlay}
            title="Nothing watched yet."
            hint="Log your first film or show and your stats, streak and recommendations start building from here."
            actionLabel="Start searching"
            actionHref="/?search=1"
          />
        ) : (
          <DashboardRecentCards entries={(recent ?? []) as unknown as import('@/types').WatchEntry[]} />
        )}
      </div>

    </div>
  )
}
