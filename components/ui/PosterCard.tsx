'use client'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import RatingStars from '@/components/RatingStars'

interface PosterCardProps {
  title: string
  /** The small tabular line at the end of the caption: a year, or a date. */
  year?: string | number
  posterUrl?: string | null
  rating?: number | null
  /** A chip revealed over the bottom of the poster on hover. */
  overlay?: string
  onClick?: () => void
  /** Renders the card as a link instead of a button. Give one of href/onClick. */
  href?: string
  /** Preloads the poster for LCP optimization using Next.js 16 Image preload. */
  preload?: boolean
  /** Pills pinned to the top-left of the poster; pass one or more `PosterBadge`s. */
  badges?: React.ReactNode
  /** Anything else positioned over the poster (the frame is position: relative). */
  children?: React.ReactNode
}

// A badge over artwork: dark glass rather than the white chip used on panels,
// so it reads on a bright poster. No blur, because posters live in grids.
export function PosterBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 8px 0 6px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-badge)',
        boxShadow: 'var(--glass-badge-edge)',
        fontSize: 'var(--text-xs)',
        lineHeight: '16px',
        fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export function PosterCard({
  title,
  year,
  posterUrl,
  rating = null,
  overlay,
  onClick,
  href,
  preload = false,
  badges,
  children,
}: PosterCardProps) {
  const [imgErr, setImgErr] = useState(false)
  const hasImg = posterUrl && !imgErr

  // The Franchises grid used to wrap this whole card in a <Link>, which put an
  // <a> around a <button> — invalid, and keyboard activation landed on the
  // inner button, which had no handler. `href` renders the root as the link
  // instead, so there is exactly one control per card either way.
  // The lift, the poster's scale, the overlay fade and the title colour are all
  // `.poster-card*` rules in globals.css. They were four inline styles driven by
  // one `useState(hover)`, so hovering a grid re-rendered a card per pointer
  // move, keyboard focus showed nothing, and reduced-motion could not reach any
  // of the transforms.
  // The root no longer clips: the caption sits under the poster in the open,
  // so the ring, drop shadow and hover glow are `.poster-card-frame` rules on
  // the frame below. No border here: `.poster-card` already zeroes it, and
  // the forced-colours rule needs to be able to draw one on the frame.
  const rootStyle: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    textDecoration: 'none',
    padding: 0,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
  }

  const body = (
    <>
      <div
        className="poster-card-frame"
        style={{
          position: 'relative',
          aspectRatio: '2 / 3',
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--zinc-900)',
        }}
      >
        {hasImg ? (
          // `fill` rather than fixed dimensions: the wrapper above is already
          // position:relative with a 2/3 aspect ratio, so the box is reserved
          // before the image loads and the grid no longer reflows as posters
          // arrive. `sizes` matches the responsive grid this card sits in
          // (2 columns on mobile, 3 on tablet, 5 on desktop). The caption
          // always carries the title, so the art is decorative: alt={title}
          // named every card twice ("Hamnet Hamnet 2025").
          <Image
            src={posterUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            preload={preload}
            onError={() => setImgErr(true)}
            className="poster-card-img"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          // Hidden for the same reason: the caption already says the title.
          <div aria-hidden="true" style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
            textAlign: 'center', padding: '16px',
            background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
          }}>{title}</div>
        )}
        {overlay && (
          <div className="poster-card-overlay" style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '8px',
            background: 'linear-gradient(to top, var(--scrim), transparent 60%)',
          }}>
            <PosterBadge>{overlay}</PosterBadge>
          </div>
        )}
        {badges && (
          // A SelectableOverlay sets `--poster-badge-top` while its select chip
          // is showing, which slides the badges under the chip (below rather
          // than beside, because a rail poster is only 118 wide); otherwise
          // they keep the corner.
          <div className="absolute left-2 top-[var(--poster-badge-top,8px)] z-[1] flex flex-wrap gap-1.5 transition-[top] duration-200">
            {badges}
          </div>
        )}
        {children}
      </div>
      <div style={{ paddingTop: 10 }}>
        <p className="poster-card-title" style={{
          margin: 0, fontSize: 'var(--text-sm)', lineHeight: '18px',
          fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</p>
        {(rating != null || year != null) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
            {rating != null && <RatingStars value={rating} readOnly size="sm" />}
            {year != null && (
              <span style={{
                fontSize: 'var(--text-xs)', lineHeight: '16px', color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{year}</span>
            )}
          </div>
        )}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="poster-card" style={rootStyle}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="poster-card" style={rootStyle}>
      {body}
    </button>
  )
}
