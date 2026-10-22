'use client'
import Image from 'next/image'
import React, { useId, useState } from 'react'
import RatingStars from '@/components/RatingStars'
import { Calendar, Star } from 'lucide-react'
import { formatDateLabel } from '@/lib/formatDate'

interface MediaRowProps {
  title: string
  year?: string | number
  type?: 'movie' | 'show'
  posterUrl?: string | null
  /** A 16:9 episode still; shown in place of the poster thumb when given. */
  stillUrl?: string | null
  /**
   * The placeholder's shape when there is no art. Defaults to a still when a
   * still was given and a poster otherwise; an episode list passes 'still' so
   * an episode with no still keeps its siblings' 16:9 shape.
   */
  thumbShape?: 'poster' | 'still'
  /**
   * The still's size under the content breakpoint: 104x58, or 72x40 ('sm') for
   * an episode list, whose rows also fit a two-line synopsis and a wide toggle.
   * 160x90 from md up either way.
   */
  stillSize?: 'md' | 'sm'
  rating?: number | null
  onRate?: (rating: number | null) => void
  review?: string | null
  watchedAt?: string | null
  tmdbRating?: number | null
  /** The line under the title, e.g. the next episode's name. */
  subtitle?: React.ReactNode
  /** Small muted text at the top-right of the text column (a platform); defaults to the type. */
  aside?: React.ReactNode
  onClick?: () => void
  /** Trailing slot at the row's end: a 44px check button, edit and delete, etc. */
  actions?: React.ReactNode
  /** Rendered under the text, for a SegmentedProgress or similar. */
  children?: React.ReactNode
}

const metaStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-sm)',
  lineHeight: '18px',
  color: 'var(--text-muted)',
  fontVariantNumeric: 'tabular-nums',
}

// The reference's 16 gap and 10/12 padding from the content breakpoint up. A
// phone's 330px row tightens both to 8 so the text column keeps a usable
// width beside the still and the trailing action.
const ROW_LAYOUT = 'relative flex items-center gap-2 p-2 md:gap-4 md:py-2.5 md:pl-2.5 md:pr-3'

// Controls inside a clickable row sit above its stretched opener (which is the
// row's first child, so DOM order alone would paint them under it). Kept below
// SelectableOverlay's z-10 select-mode shield.
const ABOVE_OPENER = 'relative z-[1]'

export function MediaRow({
  title,
  year,
  type = 'movie',
  posterUrl,
  stillUrl,
  thumbShape,
  stillSize = 'md',
  rating = null,
  onRate,
  review,
  watchedAt,
  tmdbRating,
  subtitle,
  aside,
  onClick,
  actions,
  children,
}: MediaRowProps) {
  // Tracked separately: TMDB stills 404 often enough that a failed still should
  // fall back to the poster rather than straight to the placeholder.
  const [stillErr, setStillErr] = useState(false)
  const [posterErr, setPosterErr] = useState(false)
  const titleId = useId()
  const typeLabel = type === 'show' ? 'TV' : 'Movie'
  const thumbStyle: React.CSSProperties = {
    flexShrink: 0,
    borderRadius: 'var(--radius-thumb)',
    objectFit: 'cover',
    boxShadow: 'var(--shadow-sm)',
  }
  // The still is the reference's 160x90 from the content breakpoint up and
  // 104x58 under it, or 72x40 when the row asks for the small still. The
  // placeholder for a missing still uses the same class so it shrinks with its
  // siblings instead of widening that one row on phones.
  const stillClass = stillSize === 'sm'
    ? 'w-[72px] h-10 md:w-40 md:h-[90px]'
    : 'w-[104px] h-[58px] md:w-40 md:h-[90px]'

  // Fixed thumbs, so width/height props rather than `fill`. They also reserve
  // the space, which is what stops the list jumping as images load. The
  // still's `sizes` follows its phone width, so phones fetch a smaller file.
  let thumb: React.ReactNode
  if (stillUrl && !stillErr) {
    thumb = (
      <Image src={stillUrl} alt="" width={160} height={90} onError={() => setStillErr(true)}
        sizes={stillSize === 'sm' ? '(max-width: 767px) 72px, 160px' : '(max-width: 767px) 104px, 160px'}
        className={stillClass} style={thumbStyle} />
    )
  } else if (posterUrl && !posterErr) {
    // Both sides pinned: preflight's `height: auto` would otherwise let the
    // poster's own ratio set the height, which Next warns about in dev.
    thumb = (
      <Image src={posterUrl} alt={title} width={60} height={90} onError={() => setPosterErr(true)}
        style={{ ...thumbStyle, width: 60, height: 90 }} />
    )
  } else {
    const stillShaped = thumbShape ? thumbShape === 'still' : !!stillUrl
    thumb = (
      <div className={stillShaped ? stillClass : undefined} style={{
        ...thumbStyle, ...(stillShaped ? {} : { width: 60, height: 90 }),
        background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>{typeLabel}</span>
      </div>
    )
  }

  const showStars = !!onRate || rating != null
  const showMeta = year != null || tmdbRating != null

  return (
    <div
      // The reference's "Up next" row: a tier-2 fill with the gradient rim,
      // no blur, because rows render once per list item. A clickable row also
      // takes the hover fill while its opener has keyboard focus.
      className={onClick
        ? `glass-row glass-rim media-row-interactive has-[.media-row-open:focus-visible]:bg-[var(--glass-card-hover)] ${ROW_LAYOUT}`
        : `glass-row glass-rim ${ROW_LAYOUT}`}
    >
      {onClick && (
        // The row's one opener: a real button stretched over the row, named by
        // the visible title. The root is not a button, so the stars and actions
        // are siblings rather than nested controls, and the button's own focus
        // ring wraps the row as the root's did.
        <button
          type="button"
          onClick={onClick}
          aria-labelledby={titleId}
          className="media-row-open absolute inset-0 cursor-pointer rounded-[inherit]"
        />
      )}

      {thumb}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 12 }}>
          <p id={titleId} style={{
            margin: 0, fontSize: 'var(--text-md)', lineHeight: '22px',
            fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-text)', color: 'var(--text-primary)',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{title}</p>
          <span style={{
            fontSize: 'var(--text-xs)', lineHeight: '16px',
            fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
            color: 'var(--text-muted)', whiteSpace: 'nowrap',
          }}>{aside ?? typeLabel}</span>
        </div>
        {subtitle != null && (
          <p style={{
            margin: '2px 0 0', fontSize: 'var(--text-base)', lineHeight: '20px',
            fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
            color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subtitle}</p>
        )}
        {showMeta && (
          <p style={{ ...metaStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            {year != null && <span>{year}</span>}
            {year != null && tmdbRating != null && <span aria-hidden="true">·</span>}
            {tmdbRating != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Star size={12} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--rating)', fill: 'var(--rating)' }} />
                {tmdbRating.toFixed(1)}
              </span>
            )}
          </p>
        )}

        {(showStars || review || watchedAt || children) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {showStars && (
              <div className={`${ABOVE_OPENER} self-start`}>
                <RatingStars value={rating} onChange={onRate} readOnly={!onRate} size={onRate ? 'md' : 'sm'} />
              </div>
            )}
            {review && (
              <p style={{
                margin: 0, fontSize: 'var(--text-sm)', lineHeight: '18px', fontStyle: 'italic', color: 'var(--text-secondary)',
                background: 'var(--glass-inset-card)', boxShadow: 'var(--glass-inset-card-edge)', padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>{review}</p>
            )}
            {watchedAt && (
              <span style={{ ...metaStyle, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', lineHeight: '16px' }}>
                <Calendar size={12} strokeWidth={1.8} aria-hidden="true" /> Watched {formatDateLabel(watchedAt)}
              </span>
            )}
            {children}
          </div>
        )}
      </div>

      {actions && (
        <div className={ABOVE_OPENER} style={{ flex: 'none', display: 'flex', alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
