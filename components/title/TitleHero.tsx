import Image from 'next/image'
import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatMinutes, tmdbPercent } from './format'

export interface TitlePlatform {
  name: string
  logoUrl?: string | null
}

export interface TitleHeroProps {
  title: string
  type?: 'movie' | 'show'
  /** The sharp art in the stage (TMDB w1280). */
  backdropUrl?: string | null
  /** Replaces the title text when present; the title stays in the heading for assistive tech. */
  logoUrl?: string | null
  /** The logo's width over height (TMDB's), so its box is reserved before it loads. */
  logoAspect?: number | null
  /** Painted in the stage when there is no backdrop. */
  posterUrl?: string | null
  tagline?: string | null
  /** Shown under the tagline, clamped to three lines; the full text belongs to the details view. */
  overview?: string | null
  /** US content rating (TV-MA, R), as the small chip at the start of the meta line. */
  certification?: string | null
  year?: number | null
  genres?: string[]
  /** TMDB vote average on the 0–10 scale; rendered as "TMDB 84%". */
  tmdbScore?: number | null
  /** Rendered as "2h 10m" in the meta line; for movies, a show's per-episode runtime belongs in the status. */
  runtimeMins?: number | null
  /** The 13px line at the top of the slab; defaults to "TV Show" or "Movie". */
  eyebrow?: React.ReactNode
  /** The first flatrate provider, as the chip at the top-right of the slab. */
  platform?: TitlePlatform | null
  /** A `TitleStatus`: the progress ring and next episode, or the watched date and rating. */
  status?: React.ReactNode
  /** Buttons, laid out as a wrapping row pinned to the bottom of the slab. */
  actions?: React.ReactNode
  /** Preload the backdrop: on for the page, where it is the LCP image; off in a modal. */
  preload?: boolean
  /** The page uses h1; the modal, which already has a page heading behind it, h2. */
  headingLevel?: 1 | 2
  /** Put on the title heading, so a dialog can name itself with aria-labelledby. */
  headingId?: string
}

// The reference darkens the bottom and right edges of the art so the slab's
// shadow and the frame rim read over bright backdrops. --scrim is the only
// dark overlay token, so the two gradients mix it down to the reference's
// strength rather than writing a new colour here.
const STAGE_SCRIM =
  'linear-gradient(180deg, transparent 58%, color-mix(in srgb, var(--scrim) 55%, transparent) 100%), ' +
  'linear-gradient(270deg, color-mix(in srgb, var(--scrim) 36%, transparent) 0%, transparent 16%)'

const metaText: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  lineHeight: '20px',
  color: 'var(--text-strong)',
  fontVariantNumeric: 'tabular-nums',
}

// The title at the display size: the heading when there is no logo, and the
// logo's stand-in under forced colours.
const titleText: React.CSSProperties = {
  fontSize: 'clamp(var(--text-3xl), 6vw, var(--text-5xl))',
  lineHeight: 1.05,
  fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
  letterSpacing: 'var(--tracking-tighter)',
}

/**
 * The hero every title gets: a glass frame around the sharp backdrop with the
 * smoked slab on the left carrying logo (or title), tagline, overview, meta
 * line, the status block and the actions. Below `lg` the art is a band above
 * the slab (220px on phones, 320px beside the rail), the slab loses its
 * radius and margin, and the actions wrap. From `lg` the slab takes 60% of
 * the stage less its margins, capped at 480, as on HomeHero: beside the rail
 * a fixed 480 slab would leave a strip of art.
 *
 * Nothing in here fetches or knows about the library; the page and the media
 * modal feed it from their own data for movies and shows alike.
 */
export function TitleHero({
  title,
  type = 'show',
  backdropUrl,
  logoUrl,
  logoAspect,
  posterUrl,
  tagline,
  overview,
  certification,
  year,
  genres = [],
  tmdbScore,
  runtimeMins,
  eyebrow,
  platform,
  status,
  actions,
  preload = false,
  headingLevel = 1,
  headingId,
}: TitleHeroProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1'
  const art = backdropUrl ?? posterUrl ?? null
  const percent = tmdbPercent(tmdbScore)

  // Everything after the certification chip is one run of prose, as in the
  // reference, with at most three genres so the line stays a line. The dot is
  // bound to the item before it with a no-break space, so a wrap can only
  // happen after a dot and never leaves one starting the next line.
  const meta = [
    year,
    type === 'movie' && runtimeMins ? formatMinutes(runtimeMins) : null,
    genres.length > 0 ? genres.slice(0, 3).join('\u00a0· ') : null,
    percent ? `TMDB\u00a0${percent}` : null,
  ]
    .filter((part) => part != null && part !== '')
    .join('\u00a0· ')

  return (
    <div
      // The frame takes .glass-panel for the one sanctioned blur and overrides
      // its gradient, radius and shadow with the hero's own (the reference's
      // 32, not the panel's 28); it is the only tier-1 surface here besides
      // the slab. The gradient goes in by retargeting the token .glass-panel
      // paints with, not as an inline background, so the opaque fallback
      // under reduced transparency and without backdrop-filter still wins.
      className="glass-panel glass-rim [--glass-panel:var(--glass-hero)] p-2 shadow-[var(--shadow-xl)]"
      style={{ borderRadius: 32 }}
    >
      <div
        // Inner radius is the frame's 32 minus its 8px padding. min-height,
        // not height: a slab with two rows of actions must grow the stage
        // rather than be clipped by it.
        className="@container relative flex flex-col overflow-hidden lg:min-h-[520px] lg:flex-row"
        style={{ borderRadius: 24, background: 'var(--bg-deep)' }}
      >
        <div className="relative h-[220px] w-full md:h-[320px] lg:absolute lg:inset-0 lg:h-auto">
          {art && (
            <Image
              src={art}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 1023px) 100vw, 1200px"
              preload={preload}
              fetchPriority={preload ? 'high' : undefined}
              // A poster standing in for a backdrop is cropped to its top,
              // where the title art usually is.
              style={{ objectFit: 'cover', objectPosition: backdropUrl ? '50% 18%' : '50% 20%' }}
            />
          )}
          <div aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ background: STAGE_SCRIM, pointerEvents: 'none' }} />
        </div>

        <div
          className="glass-slab glass-rim relative z-[1] flex flex-col rounded-none p-5 md:p-7 lg:m-4 lg:w-[min(480px,60cqw-32px)] lg:rounded-[var(--radius-slab)]"
          style={{ flex: 'none', maxWidth: '100%' }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="inline-flex items-center gap-2"
              style={{
                fontSize: 'var(--text-sm)',
                lineHeight: '18px',
                fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--text-primary)',
              }}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--accent)', boxShadow: 'var(--accent-ring)' }}
              />
              {eyebrow ?? (type === 'show' ? 'TV Show' : 'Movie')}
            </span>
            {platform && <Badge>{platform.name}</Badge>}
          </div>

          <Heading
            id={headingId}
            style={{
              margin: '24px 0 0',
              color: 'var(--text-primary)',
              ...(logoUrl ? { lineHeight: 0 } : titleText),
            }}
          >
            {logoUrl ? (
              <>
                {/* The logo is the title drawn as art; the heading keeps the
                    text so the page is still named for assistive tech, and
                    the text takes the logo's place under forced colours,
                    where a white PNG on the Canvas slab can vanish. Logos
                    come in every ratio, so the CSS fixes the width and the
                    height follows the art, capped at 96 for the tall ones.
                    The props are a 2x intrinsic size: Next warns when the
                    rendered box differs from the props on one axis only.
                    Their ratio is the logo's when known, so the reserved
                    box is the one it fills; otherwise 3:1. */}
                <Image
                  src={logoUrl}
                  alt=""
                  aria-hidden="true"
                  width={576}
                  height={logoAspect ? Math.round(576 / logoAspect) : 192}
                  sizes="288px"
                  className="forced-colors:hidden"
                  style={{ width: 288, maxWidth: '100%', height: 'auto', maxHeight: 96, objectFit: 'contain', objectPosition: 'left' }}
                />
                <span className="sr-only forced-colors:not-sr-only" style={{ display: 'block', ...titleText }}>{title}</span>
              </>
            ) : (
              title
            )}
          </Heading>

          {tagline && (
            <p style={{ margin: '14px 0 0', fontSize: 'var(--text-body)', lineHeight: '22px', color: 'var(--text-strong)' }}>
              {tagline}
            </p>
          )}

          {overview && (
            <p
              style={{
                margin: tagline ? '8px 0 0' : '14px 0 0',
                fontSize: 'var(--text-base)',
                lineHeight: '20px',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {overview}
            </p>
          )}

          {(certification || meta) && (
            <p
              style={{
                ...metaText,
                margin: '10px 0 0',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px 10px',
              }}
            >
              {certification && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 20,
                    padding: '0 6px',
                    // The reference's 5px and neutral ring, as on HomeHero.
                    borderRadius: 5,
                    boxShadow: 'inset 0 0 0 1px var(--border-medium)',
                    fontSize: 'var(--text-xs)',
                    lineHeight: '16px',
                    fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--text-primary)',
                  }}
                >
                  {certification}
                </span>
              )}
              {meta && <span>{meta}</span>}
            </p>
          )}

          {status && <div style={{ marginTop: 24 }}>{status}</div>}

          {actions && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 'auto', paddingTop: 20 }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
