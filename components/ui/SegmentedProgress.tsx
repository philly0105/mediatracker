import React from 'react'

// Past this many episodes the segments would be a few pixels each and the
// 3px gaps would outweigh them, so a season that long gets one continuous bar.
// A season with nothing to count yet (max 0) takes the same bar as an empty
// track, so the header keeps its shape instead of collapsing to nothing.
const MAX_SEGMENTS = 24

interface SegmentedProgressProps {
  /** Episodes watched. */
  value: number
  /** Episodes in the season. */
  max: number
  /** Defaults to "6 of 10 episodes watched". */
  'aria-label'?: string
  /** The "6 of 10" count to the right. On by default. */
  count?: boolean
  className?: string
  style?: React.CSSProperties
}

const segment: React.CSSProperties = { flex: 1, height: 4, borderRadius: 2 }

// Watched segments take the accent, the next episode its tint, the rest the
// track, which is what the reference's "Up next" rows do. The fills are classes
// rather than inline styles so forced colours can swap them for system colours;
// an inline background would be flattened to Canvas and every segment would
// look the same. Highlight for watched, GrayText for the rest: the "next" tint
// is a nicety the count beside the bar already covers.
const WATCHED = 'bg-[var(--accent)] forced-colors:bg-[color:Highlight]'
const UNWATCHED = 'bg-[var(--progress-track)] forced-colors:bg-[color:GrayText]'
const NEXT = 'bg-[var(--accent-tint)] forced-colors:bg-[color:GrayText]'

export function SegmentedProgress({
  value,
  max,
  'aria-label': ariaLabel,
  count = true,
  className,
  style,
}: SegmentedProgressProps) {
  const total = Math.max(0, Math.floor(max))
  const watched = Math.min(total, Math.max(0, Math.floor(value)))
  const label = ariaLabel ?? `${watched} of ${total} episodes watched`

  const state = (index: number) => (index < watched ? 'watched' : index === watched ? 'next' : 'unwatched')
  const fill = { watched: WATCHED, next: NEXT, unwatched: UNWATCHED }

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      {total > MAX_SEGMENTS || total === 0 ? (
        <div role="img" aria-label={label} className={UNWATCHED} style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' }}>
          <div data-progress-fill className={WATCHED} style={{ width: `${total ? (watched / total) * 100 : 0}%`, height: '100%', borderRadius: 2 }} />
        </div>
      ) : (
        <div role="img" aria-label={label} style={{ flex: 1, display: 'flex', gap: 3 }}>
          {Array.from({ length: total }, (_, index) => (
            <span key={index} data-segment={state(index)} className={fill[state(index)]} style={segment} />
          ))}
        </div>
      )}
      {count && (
        <span
          aria-hidden="true"
          style={{
            flex: 'none',
            fontSize: 'var(--text-xs)',
            lineHeight: '16px',
            fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
            color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {watched} of {total}
        </span>
      )}
    </div>
  )
}
