'use client'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MediaRow } from '@/components/ui/MediaRow'
import { SegmentedProgress } from '@/components/ui/SegmentedProgress'
import { seasonProgress } from '@/lib/nextUp'
import type { NextEpisodeDetails } from '@/lib/nextEpisode'
import type { ContinueWatchingShow } from './types'
import { formatMinutes } from './format'

type Props = {
  shows: ContinueWatchingShow[]
  detailsFor: (show: ContinueWatchingShow) => NextEpisodeDetails | null
  loadingById: Record<string, boolean>
  errorById: Record<string, boolean>
  onMarkWatched: (show: ContinueWatchingShow) => void
}

/**
 * The shows in progress after the hero's, as the reference's "Up next" panel:
 * one MediaRow per show with its next episode's still, the season's segmented
 * progress and a check that marks that episode watched. The rows space out to
 * fill the panel so it stands as tall as "Coming soon" beside it.
 */
export default function UpNextPanel({ shows, detailsFor, loadingById, errorById, onMarkWatched }: Props) {
  const router = useRouter()
  const count = shows.length

  return (
    <Card
      variant="panel"
      as="section"
      aria-labelledby="up-next-title"
      className="flex flex-col"
      style={{ flex: '1.7 1 520px', minWidth: 0 }}
    >
      <SectionHeader
        id="up-next-title"
        title="Up next"
        sub={`${count} more ${count === 1 ? 'show' : 'shows'} in progress`}
        action={{ label: 'See all', href: '/library?type=show' }}
      />
      <ul className="flex flex-1 flex-col justify-between" style={{ gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
        {shows.map((show) => {
          const { media, nextUp } = show
          const details = detailsFor(show)
          const season = show.seasons.find((s) => s.id === nextUp.season_id)
          const { watched, total } = season ? seasonProgress(season, new Set(show.watchedEpisodeKeys)) : { watched: 0, total: 0 }
          const runtime = formatMinutes(details?.runtime_mins)
          const loading = loadingById[media.id] ?? false
          const failed = errorById[media.id] ?? false

          return (
            <li key={media.id}>
              <MediaRow
                title={media.title}
                type="show"
                stillUrl={details?.still_url}
                posterUrl={media.poster_url}
                aside={show.tmdb?.platform ?? undefined}
                subtitle={details?.name ? `“${details.name}”` : undefined}
                year={`S${nextUp.season_number} · E${nextUp.episode_number}${runtime ? ` · ${runtime}` : ''}`}
                // The whole row still opens the show page, as the old card's link did.
                onClick={() => router.push(`/show/${media.id}`)}
                actions={
                  <button
                    type="button"
                    onClick={() => onMarkWatched(show)}
                    disabled={loading}
                    aria-label={`Mark ${media.title} season ${nextUp.season_number} episode ${nextUp.episode_number} watched`}
                    title="Mark watched"
                    className="glass-btn flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? <Loader2 size={20} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />
                      : <Check size={20} strokeWidth={1.8} aria-hidden="true" />}
                  </button>
                }
              >
                <SegmentedProgress
                  value={watched}
                  max={total}
                  aria-label={`Season ${nextUp.season_number}: ${watched} of ${total} episodes watched`}
                />
                {failed && (
                  <p role="alert" style={{ margin: 0, fontSize: 'var(--text-xs)', lineHeight: '16px', fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'], color: 'var(--danger)' }}>
                    Could not update
                  </p>
                )}
              </MediaRow>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
