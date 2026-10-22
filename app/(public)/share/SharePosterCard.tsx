'use client'
import Image from 'next/image'
import { useState, type CSSProperties } from 'react'
import RatingStars from '@/components/RatingStars'

// The share pages' poster tiles. A share link is read-only and signed out, so
// a tile has nowhere to go; ui/PosterCard always renders a button or a link,
// and a button that does nothing is worse for a screen reader than a plain
// image. These are its frame and caption (2:3, radius 14, ring and poster
// shadow, title 13/18/600 over stars and a tabular date) with no control.

interface SharePosterCardProps {
  title: string
  /** The small tabular line at the end of the caption: a year, or a date. */
  caption?: string | number | null
  posterUrl?: string | null
  rating?: number | null
}

const semibold = 'var(--weight-semibold)' as CSSProperties['fontWeight']

export function SharePosterCard({ title, caption, posterUrl, rating = null }: SharePosterCardProps) {
  // TMDB posters 404 often enough that a failed one should show the title
  // rather than the browser's broken-image glyph.
  const [imgErr, setImgErr] = useState(false)
  const hasImg = posterUrl && !imgErr

  return (
    <div>
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
          // `sizes` follows the share grid: 2 columns on phones, 3 on
          // tablets, 6 at the content max. The caption carries the title, so
          // the art is decorative.
          <Image
            src={posterUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
            onError={() => setImgErr(true)}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: semibold,
              textAlign: 'center', padding: '16px',
              background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
            }}
          >
            {title}
          </div>
        )}
      </div>
      <div style={{ paddingTop: 10 }}>
        <p
          style={{
            margin: 0, fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: semibold,
            color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {title}
        </p>
        {(rating != null || caption != null) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
            {rating != null && <RatingStars value={rating} readOnly size="sm" />}
            {caption != null && (
              <span
                style={{
                  fontSize: 'var(--text-xs)', lineHeight: '16px', color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {caption}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The header panel's art: the first few posters fanned behind one another,
 * 40x60 thumbs at radius 8. Decorative; the heading beside it says what the
 * list is.
 */
export function SharePosterFan({ posterUrls }: { posterUrls: (string | null)[] }) {
  const urls = posterUrls.filter((url): url is string => Boolean(url)).slice(0, 3)
  if (urls.length === 0) return null
  return (
    <div aria-hidden="true" style={{ display: 'flex', flex: 'none', paddingLeft: 12 }}>
      {urls.map((url, i) => (
        <Image
          key={`${url}-${i}`}
          src={url}
          alt=""
          width={40}
          height={60}
          style={{
            marginLeft: -12,
            borderRadius: 'var(--radius-sm)',
            objectFit: 'cover',
            boxShadow: 'var(--shadow-sm)',
            background: 'var(--zinc-900)',
            // The first poster sits on top, the way a stack reads.
            zIndex: urls.length - i,
            position: 'relative',
          }}
        />
      ))}
    </div>
  )
}
