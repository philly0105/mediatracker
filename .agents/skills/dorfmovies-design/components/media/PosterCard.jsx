import React from 'react'
import { StarRating } from './StarRating.jsx'

/**
 * DorfMovies PosterCard — portrait 2:3 poster artwork in a rounded well, with
 * a title + year footer on a frosted strip. On hover the poster zooms/rotates
 * slightly, a violet glow appears, and a date pill fades up over the art.
 */
export function PosterCard({
  title,
  year,
  posterUrl,
  rating = null,
  overlay,
  onClick,
  width,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false)
  const [imgErr, setImgErr] = React.useState(false)
  const hasImg = posterUrl && !imgErr

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: width || '100%',
        textAlign: 'left',
        padding: 0,
        border: `1px solid ${hover ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'var(--bg-void)',
        cursor: 'pointer',
        boxShadow: hover ? 'var(--glow-violet), var(--shadow-md)' : 'var(--shadow-poster)',
        transform: hover ? 'var(--lift-poster)' : 'none',
        transition: 'all var(--dur-slow) var(--ease-out-expo)',
        ...style,
      }}
      {...rest}
    >
      <div style={{ position: 'relative', aspectRatio: '2 / 3', overflow: 'hidden', background: 'var(--zinc-900)' }}>
        {hasImg ? (
          <img
            src={posterUrl}
            alt={title}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hover ? 'scale(1.10) rotate(1deg)' : 'none',
              transition: 'transform var(--dur-slower) var(--ease-out-expo)',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)',
            textAlign: 'center', padding: '16px',
            background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
          }}>{title}</div>
        )}
        {overlay && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '14px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1) 60%, transparent)',
            opacity: hover ? 1 : 0, transition: 'opacity var(--dur-slow) var(--ease-standard)',
          }}>
            <span style={{
              fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)', color: 'var(--white)',
              background: 'var(--glass-chip)', backdropFilter: 'blur(var(--blur-md))',
              padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
            }}>{overlay}</span>
          </div>
        )}
      </div>
      <div style={{
        padding: '14px', borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-raised)',
      }}>
        <p style={{
          margin: 0, fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)',
          color: hover ? 'var(--violet-300)' : 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color var(--dur-base) var(--ease-standard)',
        }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)' }}>{year}</span>
          {rating != null && <StarRating value={rating} readOnly size={14} showValue={false} />}
        </div>
      </div>
    </button>
  )
}
