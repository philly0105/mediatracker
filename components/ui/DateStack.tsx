import React from 'react'

interface DateStackProps {
  /** YYYY-MM-DD, or an ISO datetime whose date part is used. */
  date: string
  className?: string
  style?: React.CSSProperties
}

// The month-over-day stack the reference's "Coming soon" list and the calendar
// use: a 40px column with the month small and muted over a big tabular day.
export function DateStack({ date, className, style }: DateStackProps) {
  // Split rather than `new Date(string)`: a bare YYYY-MM-DD parses as UTC and
  // shows the previous day west of Greenwich (see lib/formatDate).
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!match) return null
  const [iso, y, m, d] = match
  const day = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(day.getTime())) return null

  return (
    <time
      dateTime={iso}
      className={className}
      style={{ display: 'block', flex: 'none', width: 40, textAlign: 'center', ...style }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 'var(--text-xs)',
          lineHeight: '16px',
          fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--text-muted)',
        }}
      >
        {day.toLocaleDateString('en-US', { month: 'short' })}
      </span>
      <span
        style={{
          display: 'block',
          fontSize: 'var(--text-xl)',
          lineHeight: '24px',
          fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
          letterSpacing: 'var(--tracking-tight)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
        }}
      >
        {day.getDate()}
      </span>
    </time>
  )
}
