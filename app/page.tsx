import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Flame, ArrowRight, Sparkles, MonitorPlay } from 'lucide-react'
import DashboardRecentCards from '@/components/DashboardRecentCards'
import { BentoGrid, BentoGridItem } from '@/components/ui/BentoGrid'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { StatTile } from '@/components/ui/StatTile'
import DashboardSearchBar from '@/components/DashboardSearchBar'
import DashboardUpcomingWidget from '@/components/DashboardUpcomingWidget'
import ContinueWatchingRow, { type ContinueWatchingShow } from '@/components/ContinueWatchingRow'
import { fetchUpcomingReleases } from '@/lib/tmdb'

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

function findNextUp(seasons: ContinueWatchingShow['seasons'], watchedKeys: Set<string>) {
  for (const season of seasons) {
    if (season.episode_count <= 0) continue
    for (let episode = 1; episode <= season.episode_count; episode++) {
      if (!watchedKeys.has(`${season.id}-${episode}`)) {
        return {
          season_id: season.id,
          season_number: season.season_number,
          episode_number: episode,
        }
      }
    }
  }

  return null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: recent },
    { data: watchlistCounts },
    { data: thisYearEntries },
    upcomingReleases,
  ] = await Promise.all([
    supabase.from('watch_entries').select('*, media(*)').order('created_at', { ascending: false }).limit(5),
    supabase.from('watchlist_items').select('priority'),
    supabase.from('watch_entries').select('id').gte('watched_at', `${new Date().getFullYear()}-01-01`),
    fetchUpcomingReleases(),
  ])

  const { data: episodeProgressData } = await supabase
    .from('episode_progress')
    .select('season_id, episode_number, seasons!inner(media_id)')
    .order('watched_at', { ascending: false })

  const episodeProgress = (episodeProgressData ?? []) as ProgressWithSeason[]
  const mediaIds = Array.from(new Set(
    episodeProgress
      .map((progress) => joinedOne(progress.seasons)?.media_id)
      .filter((mediaId): mediaId is string => Boolean(mediaId))
  ))

  let continueWatchingShows: ContinueWatchingShow[] = []
  if (mediaIds.length > 0) {
    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('id, media_id, season_number, episode_count, media!inner(id, title, poster_url)')
      .in('media_id', mediaIds)
      .order('season_number', { ascending: true })

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
    for (const progress of episodeProgress) {
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-30 pl-2">
        <div className="flex flex-col gap-2">
          <Eyebrow style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            Welcome back
          </Eyebrow>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 pb-2">
            Dashboard
          </h1>
          <p className="text-zinc-400 font-medium font-sans">
            Your personal media collection and viewing analytics.
          </p>
        </div>
        <div className="w-full md:w-auto md:min-w-[380px] flex-shrink-0">
          <DashboardSearchBar />
        </div>
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
                value={thisYearEntries?.length ?? 0}
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
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Recently Watched
          </h2>
          <Link
            href="/movies"
            className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        <DashboardRecentCards entries={recent ?? []} />
        
        {(recent ?? []).length === 0 && (
          <Card style={{ padding: '48px', textAlign: 'center', borderStyle: 'dashed', marginTop: '16px' }}>
            <MonitorPlay className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
            <p className="text-zinc-400 text-base font-medium font-sans">Nothing watched yet.</p>
            <Link
              href="/search"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent)] transition-opacity hover:opacity-80 bg-[var(--accent)]/10 px-4 py-2 rounded-sm border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20"
            >
              <span>Start searching</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Card>
        )}
      </div>

    </div>
  )
}
