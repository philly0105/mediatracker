'use client'
import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Check, Loader2, Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { seasonProgress } from '@/lib/nextUp'
import { formatAirDate } from '@/lib/formatDate'
import type { NextEpisodeDetails } from '@/lib/nextEpisode'
import type { ContinueWatchingShow } from './types'
import { formatMinutes } from './format'

// The reference's hero scrim: a floor under the stage and a feather along the
// right edge, so the slab's art never ends on a hard line. Side-by-side
// widths only; below lg the image is a plain band above the slab.
const SCRIM =
  'linear-gradient(180deg, rgba(4,10,14,0) 58%, rgba(4,10,14,.34) 100%), linear-gradient(270deg, rgba(4,10,14,.22) 0%, rgba(4,10,14,0) 16%)'

const semibold = 'var(--weight-semibold)' as CSSProperties['fontWeight']
const heading = 'var(--weight-heading)' as CSSProperties['fontWeight']

// The title at the display size: the heading when there is no logo, and the
// logo's stand-in under forced colours.
const TITLE: CSSProperties = {
  display: 'block', fontSize: 'var(--text-5xl)', lineHeight: '48px', fontWeight: heading,
  letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)',
}

type Props = {
  show: ContinueWatchingShow
  /** The next-up episode's details, from the row's cache; null when unknown. */
  details: NextEpisodeDetails | null
  loading: boolean
  failed: boolean
  onMarkWatched: () => void
  /** Opens the show in the media modal (rate, add to a list). Absent when the
   *  show's TMDB id is unknown, in which case those two buttons are left out. */
  onOpenDetails?: () => void
}

/**
 * The first show in progress, as the reference's hero: the backdrop sharp in
 * a glass frame, and the slab over it with the logo, progress ring, next
 * episode and actions. Exactly one tier-1 blur (the slab) sits inside the
 * frame; the frame itself is the hero recipe on the panel class.
 */
export default function HomeHero({ show, details, loading, failed, onMarkWatched, onOpenDetails }: Props) {
  const { media, nextUp, tmdb } = show
  const backdrop = show.art?.backdrop_url ?? tmdb?.backdrop_url ?? null
  const logo = show.art?.logo_url ?? tmdb?.logo_url ?? null

  const season = show.seasons.find((s) => s.id === nextUp.season_id)
  const { watched, total } = season ? seasonProgress(season, new Set(show.watchedEpisodeKeys)) : { watched: 0, total: 0 }
  const left = Math.max(0, total - watched)
  // An episode's own runtime first, then the show's typical one.
  const episodeMins = details?.runtime_mins ?? media.runtime_mins ?? null
  const toGo = episodeMins ? formatMinutes(left * episodeMins) : null
  const runtime = formatMinutes(details?.runtime_mins)
  const aired = details?.air_date ? formatAirDate(details.air_date) : null
  const genres = (tmdb?.genres ?? []).slice(0, 3)
  const score = tmdb?.vote_average ? Math.round(tmdb.vote_average * 10) : null

  return (
    <section
      aria-labelledby="hero-title"
      // The hero tier through the panel's custom property, not an inline
      // background, so the reduced-transparency and @supports fallbacks
      // still reach it.
      className="glass-panel glass-rim [--glass-panel:var(--glass-hero)]"
      style={{ padding: 8, borderRadius: 32, boxShadow: 'var(--shadow-xl)' }}
    >
      <div
        // The stage is a container so the slab can be sized against it: it
        // runs 604px wide beside the rail and 704px beside the sidebar at
        // 1024, where a fixed 480px slab would leave a strip of art. min-h,
        // not h: a slab whose actions wrap must grow the stage, not be
        // clipped by it.
        className="@container relative flex flex-col overflow-hidden lg:min-h-[520px] lg:flex-row"
        style={{ borderRadius: 24, background: 'var(--bg-deep)' }}
      >
        {/* The art: a band above the slab up to lg (220px on phones, 320px
            beside the rail), the whole stage from there. The one preloaded
            image on Home, since it is the largest thing above the fold. */}
        <div className="relative h-[220px] w-full md:h-[320px] lg:absolute lg:inset-0 lg:h-auto">
          {backdrop && (
            <Image
              src={backdrop}
              alt=""
              aria-hidden="true"
              fill
              preload
              sizes="(max-width: 1023px) 100vw, 1200px"
              className="object-cover object-[64%_18%] md:object-[50%_18%]"
            />
          )}
          <div aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ background: SCRIM, pointerEvents: 'none' }} />
        </div>

        {/* The slab takes 60% of the stage less its margins, capped at the
            reference's 480, so at least 40% of the art stays in view. */}
        <div
          className="glass-slab glass-rim flex flex-col rounded-none p-5 md:p-7 lg:m-4 lg:w-[min(480px,60cqw-32px)] lg:rounded-[var(--radius-slab)]"
          style={{ flex: 'none', maxWidth: '100%' }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="inline-flex items-center gap-2"
              style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: semibold, color: 'var(--text-primary)' }}
            >
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: 'var(--accent-ring)' }} />
              Continue watching
            </span>
            {tmdb?.platform && (
              <span
                className="inline-flex items-center"
                style={{
                  height: 26, padding: '0 10px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--glass-fill-selected)', boxShadow: 'var(--glass-chip-edge)',
                  fontSize: 'var(--text-xs)', lineHeight: '16px', fontWeight: semibold, color: 'var(--text-primary)', whiteSpace: 'nowrap',
                }}
              >
                {tmdb.platform}
              </span>
            )}
          </div>

          {/* The logo is the heading when there is one; otherwise the title at
              the display size, so the slab still opens on a name. With a logo
              the title rides along screen-reader-only and takes the logo's
              place under forced colours, where a white PNG on the Canvas
              slab can vanish. Logos come in every ratio, so the CSS fixes the
              width and the height follows the art. The props are a 2x
              intrinsic size rather than 288x96: Next warns when the rendered
              box differs from the props on one axis only. */}
          <h2 id="hero-title" style={{ margin: '24px 0 0', lineHeight: 0 }}>
            {logo && (
              <Image
                src={logo}
                alt=""
                aria-hidden="true"
                width={576}
                height={192}
                sizes="288px"
                className="forced-colors:hidden"
                style={{ width: 288, maxWidth: '100%', height: 'auto' }}
              />
            )}
            <span className={logo ? 'sr-only forced-colors:not-sr-only' : undefined} style={TITLE}>
              {media.title}
            </span>
          </h2>

          {tmdb?.tagline && (
            <p style={{ margin: '14px 0 0', fontSize: 'var(--text-body)', lineHeight: '22px', color: 'var(--text-strong)' }}>
              {tmdb.tagline}
            </p>
          )}

          {(tmdb?.certification || genres.length > 0 || score != null) && (
            <p
              className="flex flex-wrap items-center"
              style={{ margin: '10px 0 0', gap: '6px 10px', fontSize: 'var(--text-sm)', lineHeight: '20px', color: 'var(--text-strong)' }}
            >
              {tmdb?.certification && (
                <span
                  className="inline-flex items-center"
                  style={{
                    height: 20, padding: '0 6px', borderRadius: 5, boxShadow: 'inset 0 0 0 1px var(--border-medium)',
                    fontSize: 'var(--text-xs)', lineHeight: '16px', fontWeight: semibold,
                  }}
                >
                  {tmdb.certification}
                </span>
              )}
              {/* The dots between genres are bound to the genre before them
                  with a no-break space, so a wrap never starts on one. The
                  reference's dot before the score, spaced by the row's gap,
                  shows only from xl, where the slab is its full 480 and the
                  row stays a line; it rides at the end of the genres, so a
                  wrap can end on it but never open with it. Below xl the gap
                  alone separates the score. */}
              {genres.length > 0 && (
                <span>
                  {genres.join(' · ')}
                  {score != null && <span aria-hidden="true" className="hidden xl:inline" style={{ marginLeft: 10 }}>·</span>}
                </span>
              )}
              {score != null && <span className="tabular whitespace-nowrap">TMDB {score}%</span>}
            </p>
          )}

          <div className="flex items-center" style={{ marginTop: 24, gap: 14 }}>
            <ProgressRing
              value={watched}
              max={total}
              size={52}
              stroke={5}
              label={`S${nextUp.season_number}`}
              aria-label={`Season ${nextUp.season_number}: ${watched} of ${total} episodes watched`}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: '20px', fontWeight: semibold, color: 'var(--text-primary)' }}>
                {watched} of {total} episodes watched
              </p>
              <p className="tabular" style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-strong)' }}>
                {left} left this season{toGo ? ` · ${toGo} to go` : ''}
              </p>
            </div>
          </div>

          <div
            className="flex items-center"
            style={{
              marginTop: 16, gap: 14, padding: 10, borderRadius: 'var(--radius-lg)',
              background: 'var(--glass-inset-card)', boxShadow: 'var(--glass-inset-card-edge)',
            }}
          >
            <div
              className="relative h-16 w-24 shrink-0 overflow-hidden md:h-[72px] md:w-32"
              style={{ borderRadius: 10, background: 'var(--bg-deep)' }}
            >
              {details?.still_url && (
                <Image
                  src={details.still_url}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="128px"
                  style={{ objectFit: 'cover', transform: 'scale(1.35)' }}
                />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="tabular" style={{ margin: 0, fontSize: 'var(--text-xs)', lineHeight: '16px', fontWeight: semibold, color: 'var(--accent)' }}>
                {`Next · S${nextUp.season_number} · E${nextUp.episode_number}`}
              </p>
              <p
                className="truncate"
                style={{ margin: '2px 0 0', fontSize: 'var(--text-lg)', lineHeight: '24px', fontWeight: heading, letterSpacing: 'var(--tracking-snug)', color: 'var(--text-primary)' }}
              >
                {details?.name ?? `Episode ${nextUp.episode_number}`}
              </p>
              {(runtime || aired) && (
                <p className="tabular" style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-strong)' }}>
                  {[runtime, aired ? `Aired ${aired}` : null].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center" style={{ marginTop: 'auto', paddingTop: 20, gap: 8 }}>
            {/* The primary fills the row on phones; Button's own width is
                inline, so the responsive width lives on a wrapper. */}
            <div className="basis-full md:basis-auto">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onMarkWatched}
                disabled={loading}
                style={{ padding: '0 20px 0 16px' }}
              >
                {loading
                  ? <Loader2 size={18} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />
                  : <Check size={18} strokeWidth={1.8} aria-hidden="true" />}
                Mark E{nextUp.episode_number} watched
              </Button>
            </div>
            <Link
              href={`/show/${media.id}`}
              className="btn btn-ghost inline-flex flex-auto items-center justify-center md:flex-none"
              style={{ minHeight: 48, padding: '0 18px', fontSize: 'var(--text-body)', fontWeight: semibold, textDecoration: 'none' }}
            >
              Episodes
            </Link>
            {onOpenDetails && (
              // The two circles wrap as a pair, so a narrow slab never strands
              // one of them on a row of its own.
              <div className="flex items-center gap-2">
                <Button variant="icon" size="lg" aria-label={`Rate ${media.title}`} onClick={onOpenDetails}>
                  <Star size={20} strokeWidth={1.8} aria-hidden="true" />
                </Button>
                <Button variant="icon" size="lg" aria-label={`Add ${media.title} to a list`} onClick={onOpenDetails}>
                  <Plus size={20} strokeWidth={1.8} aria-hidden="true" />
                </Button>
              </div>
            )}
            {failed && (
              <p role="alert" className="basis-full" style={{ margin: 0, fontSize: 'var(--text-xs)', lineHeight: '16px', fontWeight: semibold, color: 'var(--danger)' }}>
                Could not update
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
