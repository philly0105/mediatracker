import React, { useState } from 'react'
import RatingStars from '@/components/RatingStars'
import { Badge } from './Badge'
import { Calendar } from 'lucide-react'

interface MediaRowProps {
  title: string
  year?: string | number
  type?: 'movie' | 'show'
  posterUrl?: string | null
  rating?: number | null
  onRate?: (rating: number) => void
  review?: string | null
  watchedAt?: string | null
  tmdbRating?: number | null
  onClick?: () => void
  actions?: React.ReactNode
}

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
  actions,
}: MediaRowProps) {
  const [hover, setHover] = useState(false)
  const [imgErr, setImgErr] = useState(false)
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
        borderRadius: 'var(--radius-md)',
        background: hover ? 'var(--glass-card-hover)' : 'var(--glass-card)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        backdropFilter: 'blur(var(--blur-md))',
        boxShadow: hover ? 'var(--glow-violet), var(--inset-hairline)' : 'none',
        transform: hover ? 'translateY(-2px) scale(1.01)' : 'none',
        transition: 'all var(--dur-base) var(--ease-out-expo)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {hasImg ? (
        <img src={posterUrl!} alt={title} onError={() => setImgErr(true)} style={{
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
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{type === 'show' ? 'TV' : 'Movie'}</span>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px' }}>
            <p style={{
              margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)' as any, color: 'var(--text-primary)',
              lineHeight: 'var(--leading-snug)', overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>{title}</p>
            {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <Badge tone="neutral">{type === 'show' ? 'TV' : 'Movie'}</Badge>
            {year && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{year}</span>}
            {tmdbRating != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)' as any, color: 'var(--amber-400)' }}>
                ★ {tmdbRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ transform: 'scale(0.9)', transformOrigin: 'left' }}>
            <RatingStars value={rating} onChange={onRate} readOnly={!onRate} />
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
              <Calendar style={{ width: 12, height: 12 }} /> Watched {watchedAt}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
