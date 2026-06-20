import React from 'react'

/**
 * DorfMovies StarRating — five ★ glyphs over a gray track, amber fill clipped
 * by width to support half-stars. Interactive (hover + click in 0.5 steps)
 * unless `readOnly`.
 */
export function StarRating({ value = null, onChange, readOnly = false, size = 24, showValue = true, style, ...rest }) {
  const [hover, setHover] = React.useState(null)
  const display = hover ?? value ?? 0

  return (
    <div
      onMouseLeave={() => setHover(null)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', ...style }}
      {...rest}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} style={{ position: 'relative', width: size, height: size }}>
            <span style={{ color: 'var(--zinc-700)', fontSize: size, lineHeight: 1 }}>★</span>
            {(full || half) && (
              <span style={{
                position: 'absolute', inset: 0, color: 'var(--amber-400)', fontSize: size, lineHeight: 1,
                overflow: 'hidden', width: full ? '100%' : '50%',
              }}>★</span>
            )}
            {!readOnly && (
              <>
                <div
                  onMouseEnter={() => setHover(star - 0.5)}
                  onClick={() => onChange && onChange(star - 0.5)}
                  style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', cursor: 'pointer' }}
                />
                <div
                  onMouseEnter={() => setHover(star)}
                  onClick={() => onChange && onChange(star)}
                  style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', cursor: 'pointer' }}
                />
              </>
            )}
          </div>
        )
      })}
      {showValue && value != null && (
        <span style={{ marginLeft: '8px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)' }}>
          {value}/5
        </span>
      )}
    </div>
  )
}
