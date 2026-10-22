import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface SectionHeaderProps {
  title: React.ReactNode
  /** The muted line under the title, e.g. "4 more shows in progress". */
  sub?: React.ReactNode
  /** Trailing "See all ›" link. */
  action?: { label: string; href: string }
  /** Extra controls before the link, e.g. a rail's scroll arrows. */
  actions?: React.ReactNode
  /** Put on the heading so the section can point at it with aria-labelledby. */
  id?: string
  className?: string
  style?: React.CSSProperties
}

// The header of every glass panel: title, optional sub line and a trailing
// link, laid out as in the reference's "Up next" and "Coming soon" panels.
export function SectionHeader({ title, sub, action, actions, id, className, style }: SectionHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 12,
        paddingLeft: 4,
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          id={id}
          style={{
            margin: 0,
            fontSize: 'var(--text-xl)',
            lineHeight: '26px',
            fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-snug)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h2>
        {sub != null && (
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
      {(actions || action) && (
        <div className="flex items-center gap-1" style={{ flex: 'none' }}>
          {actions}
          {action && (
            <Link
              href={action.href}
              className="inline-flex items-center gap-0.5 min-h-11 pl-3 pr-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--white)] hover:bg-[var(--glass-fill-hover)] transition-colors"
              style={{ fontSize: 'var(--text-base)', lineHeight: '20px', fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'], letterSpacing: 'var(--tracking-text)' }}
            >
              {action.label}
              <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
