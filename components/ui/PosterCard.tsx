'use client'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import RatingStars from '@/components/RatingStars'

interface PosterCardProps {
  title: string
  year?: string | number
  posterUrl?: string | null
  rating?: number | null
  overlay?: string
  onClick?: () => void
  /** Renders the card as a link instead of a button. Give one of href/onClick. */
  href?: string
  /** Preloads the poster for LCP optimization using Next.js 16 Image preload. */
  preload?: boolean
  children?: React.ReactNode
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
  const rootStyle: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    textDecoration: 'none',
    padding: 0,
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    background: 'var(--bg-void)',
    cursor: 'pointer',
  }

  const body = (
    <>
      <div style={{ position: 'relative', aspectRatio: '2 / 3', overflow: 'hidden', background: 'var(--zinc-900)' }}>
        {hasImg ? (
          // `fill` rather than fixed dimensions: the wrapper above is already
          // position:relative with a 2/3 aspect ratio, so the box is reserved
          // before the image loads and the grid no longer reflows as posters
          // arrive. `sizes` matches the responsive grid this card sits in
          // (2 columns on mobile, 3 on tablet, 5 on desktop).
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            preload={preload}
            onError={() => setImgErr(true)}
            className="poster-card-img"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' as React.CSSProperties['fontWeight'],
            textAlign: 'center', padding: '16px',
            background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
          }}>{title}</div>
        )}
        {overlay && (
          <div className="poster-card-overlay" style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '14px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1) 60%, transparent)',
          }}>
            <span style={{
              fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--text-primary)',
              background: 'var(--glass-chip)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
            }}>{overlay}</span>
          </div>
        )}
        {children}
      </div>
      <div style={{
        padding: '14px', borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-raised)',
      }}>
        <p className="poster-card-title" style={{
          margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)' as React.CSSProperties['fontWeight'],
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'] }}>{year}</span>
          {rating != null && <RatingStars value={rating} readOnly />}
        </div>
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
