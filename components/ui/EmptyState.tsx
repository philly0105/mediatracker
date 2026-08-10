import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card } from './Card'

interface EmptyStateProps {
  /** A lucide icon component, e.g. `BarChart3`. Rendered muted and oversized. */
  icon?: React.ComponentType<{ className?: string }>
  /** Sentence case, and say what is missing rather than what went wrong. */
  title: string
  /** Optional second line telling the user how this page fills up. */
  hint?: string
  actionLabel?: string
  /** Give one of these two. `onAction` wins when both are set. */
  actionHref?: string
  onAction?: () => void
}

/**
 * The shared "there is nothing here yet" surface. A dashed card rather than a
 * solid one so it reads as a placeholder for content, not as content.
 */
export function EmptyState({ icon: Icon, title, hint, actionLabel, actionHref, onAction }: EmptyStateProps) {
  const actionClass =
    'group mt-6 inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-bold transition-colors'
  const actionStyle = {
    color: 'var(--accent)',
    background: 'var(--green-tint-bg)',
    border: '1px solid var(--green-tint-border)',
  }

  return (
    <Card style={{ padding: '48px 32px', textAlign: 'center', borderStyle: 'dashed' }}>
      {Icon && (
        <Icon className="w-12 h-12 mx-auto mb-4 opacity-40 text-[var(--text-muted)]" />
      )}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-md)',
          fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
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
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-normal)',
            color: 'var(--text-secondary)',
          }}
        >
          {hint}
        </p>
      )}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={actionClass} style={actionStyle}>
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link href={actionHref} className={actionClass} style={actionStyle}>
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </Card>
  )
}
