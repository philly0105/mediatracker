import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card } from './Card'
import { Button } from './Button'

interface EmptyStateProps {
  /** A lucide icon component, e.g. `BarChart3`. Rendered in a glass circle. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  /** Sentence case, and say what is missing rather than what went wrong. */
  title: string
  /** Optional second line telling the user how this page fills up. */
  hint?: string
  actionLabel?: string
  /** Give one of these two. `onAction` wins when both are set. */
  actionHref?: string
  onAction?: () => void
  /** `error` colours the icon and the action with `--danger`, so the two
   *  hand-rolled error cards on /recommendations can use this component too. */
  tone?: 'default' | 'error'
  /** `compact` for empty states that sit inside a section rather than replacing
   *  a page — the watchlist renders three sections at once under an active
   *  filter, and three full-height panels stacked up is worse than the italic
   *  line it replaced. It is a flat row rather than a blurred panel, so it is
   *  safe inside a panel that already blurs. */
  size?: 'default' | 'compact'
}

/**
 * The shared "there is nothing here yet" surface: a centred glass panel with
 * the icon in a glass circle, a card-title line, a secondary line and one
 * secondary pill.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  actionLabel,
  actionHref,
  onAction,
  tone = 'default',
  size = 'default',
}: EmptyStateProps) {
  const isError = tone === 'error'
  const compact = size === 'compact'
  const circle = compact ? 40 : 48
  const actionStyle = { marginTop: compact ? 16 : 24 }
  const arrow = (
    <ArrowRight
      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
      strokeWidth={1.8}
      aria-hidden="true"
    />
  )

  return (
    <Card
      variant={compact ? 'row' : 'panel'}
      // A row's hover fill is for clickable rows; an empty state is not one.
      className={compact ? 'hover:bg-[var(--glass-card)]' : undefined}
      style={{ padding: compact ? '24px 20px' : '48px 32px', textAlign: 'center' }}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className="glass-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: circle,
            height: circle,
            borderRadius: '50%',
            marginBottom: compact ? 12 : 16,
            color: isError ? 'var(--danger)' : 'var(--text-secondary)',
          }}
        >
          <Icon className={compact ? 'w-[18px] h-[18px]' : 'w-5 h-5'} strokeWidth={1.8} />
        </span>
      )}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: compact ? 'var(--text-base)' : 'var(--text-md)',
          lineHeight: compact ? '20px' : '24px',
          fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </p>
      {hint && (
        <p
          style={{
            margin: '8px auto 0',
            maxWidth: '42ch',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            lineHeight: '20px',
            color: 'var(--text-secondary)',
          }}
        >
          {hint}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="secondary"
          tone={isError ? 'destructive' : 'default'}
          onClick={onAction}
          className="group"
          style={actionStyle}
        >
          <span>{actionLabel}</span>
          {arrow}
        </Button>
      )}
      {actionLabel && actionHref && !onAction && (
        // A link cannot wrap a <button>, so it wears the same pill classes the
        // secondary Button does.
        <Link
          href={actionHref}
          className="group btn glass-btn inline-flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ ...actionStyle, padding: '0 18px', color: isError ? 'var(--danger)' : 'var(--text-primary)' }}
        >
          <span>{actionLabel}</span>
          {arrow}
        </Link>
      )}
    </Card>
  )
}
