import React from 'react'
import { StarRating } from './StarRating.jsx'
import { Badge } from '../core/Badge.jsx'

/**
 * DorfMovies MediaRow — the horizontal "watch entry" card: a small 2:3 poster
 * thumb beside a title, type/year meta, an interactive star rating, and
 * optional review snippet. Lifts slightly on hover (glass-card treatment).
 */
export function MediaRow({
  title,
  year,
  type = 'movie',
  posterUrl,
  rating = null,
  onRate,
  review,
  watchedAt,
  tmdbRating,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false)
  const [imgErr, setImgErr] = React.useState(false)
  const hasImg = posterUrl && !imgErr

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        padding: '14px',
        borderRadius: 'var(--radius-lg)',
        background: hover ? 'var(--glass-card-hover)' : 'var(--glass-card)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        backdropFilter: 'blur(var(--blur-md))',
        boxShadow: hover ? 'var(--glow-violet), var(--inset-hairline)' : 'none',
        transform: hover ? 'translateY(-2px) scale(1.01)' : 'none',
        transition: 'all var(--dur-base) var(--ease-out-expo)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {hasImg ? (
        <img src={posterUrl} alt={title} onError={() => setImgErr(true)} style={{
          width: 64, height: 96, borderRadius: 'var(--radius-md)', objectFit: 'cover',
          boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: 64, height: 96, borderRadius: 'var(--radius-md)', flexShrink: 0,
          border: '1px solid var(--border-subtle)',
          background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i data-lucide={type === 'show' ? 'tv' : 'film'} style={{ width: 18, height: 18, color: 'var(--text-faint)' }} />
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)',
            lineHeight: 'var(--leading-snug)', overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <Badge tone="neutral">{type === 'show' ? 'TV' : 'Movie'}</Badge>
            {year && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{year}</span>}
            {tmdbRating != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: 'var(--amber-400)' }}>
                <i data-lucide="star" style={{ width: 12, height: 12, fill: 'var(--amber-400)' }} /> {tmdbRating}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ transform: 'scale(0.9)', transformOrigin: 'left' }}>
            <StarRating value={rating} onChange={onRate} readOnly={!onRate} size={20} showValue={false} />
          </div>
          {review && (
            <p style={{
              margin: 0, fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-faint)', padding: '6px 8px',
              borderRadius: 'var(--radius-sm)', lineHeight: 'var(--leading-relaxed)',
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>{review}</p>
          )}
          {watchedAt && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>
              <i data-lucide="calendar" style={{ width: 12, height: 12 }} /> Watched {watchedAt}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
