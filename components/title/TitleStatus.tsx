'use client'
import Image from 'next/image'
import React from 'react'
import { Check } from 'lucide-react'
import { ProgressRing } from '@/components/ui/ProgressRing'
import RatingStars from '@/components/RatingStars'
import { formatAirDate, formatDateLabel } from '@/lib/formatDate'
import { formatMinutes } from './format'

export interface NextEpisode {
  seasonNumber: number
  episodeNumber: number
  name?: string | null
  stillUrl?: string | null
  runtimeMins?: number | null
  /** YYYY-MM-DD. */
  airDate?: string | null
  /** True when the air date is still ahead; the card then reads "All caught up" and "Airs …". */
  unaired?: boolean
}

export interface TitleProgress {
  kind: 'progress'
  /** The season the ring measures, e.g. 2 → "S2": the next episode's, or the last. */
  seasonNumber: number
  seasonWatched: number
  seasonTotal: number
  /** Whole-title totals for the second line ("15/19 episodes"). */
  watched: number
  total: number
  /** Minutes of unwatched episodes, for "3h 42m to go"; omit when the runtime is unknown. */
  minutesLeft?: number | null
  /** Null once everything that exists has been watched. */
  next?: NextEpisode | null
}

export interface TitleWatched {
  kind: 'watched'
  /** ISO date of the watch entry. */
  watchedAt: string
  rating: number | null
  /** Makes the stars editable; without it they are read-only. */
  onRate?: (rating: number | null) => void
  rewatch?: boolean
}

export type TitleStatusValue = TitleProgress | TitleWatched

const strongMeta: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-sm)',
  lineHeight: '18px',
  color: 'var(--text-strong)',
  fontVariantNumeric: 'tabular-nums',
}

/**
 * The status block inside the hero slab. A show in progress gets the season
 * ring, the counts and the next-episode card; a watched title gets its date
 * and stars. Both are plain props so the modal can feed them for a movie.
 */
export function TitleStatus({ status }: { status: TitleStatusValue }) {
  if (status.kind === 'watched') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-body)',
            lineHeight: '20px',
            fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--text-primary)',
          }}
        >
          <Check className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--accent)' }} />
          Watched {formatDateLabel(status.watchedAt)}
          {status.rewatch && <span style={{ color: 'var(--text-muted)' }}>· Rewatch</span>}
        </p>
        <RatingStars value={status.rating} onChange={status.onRate} readOnly={!status.onRate} />
      </div>
    )
  }

  const { seasonNumber, seasonWatched, seasonTotal, watched, total, minutesLeft, next } = status
  const seasonLeft = Math.max(0, seasonTotal - seasonWatched)
  const airLabel = next?.airDate ? formatAirDate(next.airDate) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ProgressRing
          value={seasonWatched}
          max={seasonTotal}
          size={52}
          stroke={5}
          label={`S${seasonNumber}`}
          aria-label={`${seasonWatched} of ${seasonTotal} episodes watched in season ${seasonNumber}`}
        />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-body)',
              lineHeight: '20px',
              fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--text-primary)',
            }}
          >
            {seasonWatched} of {seasonTotal} episodes watched
          </p>
          {/* One text run on purpose: the show page's tests read the
              "15/19 episodes" fraction out of it. */}
          <p style={strongMeta}>
            {watched}/{total} episodes
            {seasonLeft > 0 && ` · ${seasonLeft} left this season`}
            {minutesLeft != null && minutesLeft > 0 && ` · ${formatMinutes(minutesLeft)} to go`}
            {!next && ' · All caught up'}
          </p>
        </div>
      </div>

      {next && (
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 10,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--glass-inset-card)',
            boxShadow: 'var(--glass-inset-card-edge)',
          }}
        >
          {/* The reference's 128x72 still, 96x64 under the content breakpoint
              so the episode name keeps its width on a phone. */}
          <div
            className="relative h-16 w-24 shrink-0 overflow-hidden md:h-[72px] md:w-32"
            style={{ borderRadius: 10, background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))' }}
          >
            {next.stillUrl && (
              <Image src={next.stillUrl} alt="" aria-hidden="true" fill sizes="128px" style={{ objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-xs)',
                lineHeight: '16px',
                fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--accent)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {/* Everything aired is watched once the next episode is still
                  to come, so the card says so where the old page did. */}
              {next.unaired ? 'All caught up' : 'Next'} · S{next.seasonNumber} · E{next.episodeNumber}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 'var(--text-lg)',
                lineHeight: '24px',
                fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
                letterSpacing: 'var(--tracking-snug)',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {next.name ?? `Episode ${next.episodeNumber}`}
            </p>
            {(next.runtimeMins || airLabel) && (
              <p style={{ ...strongMeta, marginTop: 2 }}>
                {next.runtimeMins ? formatMinutes(next.runtimeMins) : null}
                {next.runtimeMins && airLabel ? ' · ' : null}
                {airLabel ? (next.unaired ? `Airs ${airLabel}` : `Aired ${airLabel}`) : null}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
