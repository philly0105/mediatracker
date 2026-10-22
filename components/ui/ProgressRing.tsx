import React from 'react'

interface ProgressRingProps {
  /** Episodes watched. */
  value: number
  /** Episodes in the season (or whatever the ring measures). */
  max: number
  /** Outer diameter in px. The Home hero uses the reference's 52. */
  size?: number
  /** Stroke width in px. The Home hero uses the reference's 5. */
  stroke?: number
  /** Centred inside the ring, e.g. "S2". */
  label?: React.ReactNode
  /** Defaults to "6 of 10 episodes watched". */
  'aria-label'?: string
  className?: string
  style?: React.CSSProperties
}

export function ProgressRing({
  value,
  max,
  size = 48,
  stroke = 4,
  label,
  'aria-label': ariaLabel,
  className,
  style,
}: ProgressRingProps) {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const centre = size / 2
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `${value} of ${max} episodes watched`}
      className={className}
      style={{ position: 'relative', flex: 'none', width: size, height: size, ...style }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: 'block' }}>
        <circle cx={centre} cy={centre} r={radius} fill="none" stroke="var(--progress-track)" strokeWidth={stroke} />
        {/* Skipped at zero: a round cap on a zero-length dash still paints a dot.
            The caps add half a stroke at each end, so the dash is shortened by
            one stroke and pushed half a stroke along, as the reference does;
            otherwise the arc starts before twelve o'clock and overstates the
            count. At full it still closes, because the caps bridge the gap. */}
        {fraction > 0 && (
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, circumference * fraction - stroke)} ${circumference}`}
            strokeDashoffset={-stroke / 2}
            transform={`rotate(-90 ${centre} ${centre})`}
          />
        )}
      </svg>
      {label != null && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-sm)',
            lineHeight: '18px',
            fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-text)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
