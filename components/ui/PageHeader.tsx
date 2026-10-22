'use client'
import React from 'react'
import { Eyebrow } from './Eyebrow'
import { useOptionalMultiSelect } from '@/components/MultiSelectProvider'
import { Button } from './Button'
import { CheckSquare } from 'lucide-react'

interface PageHeaderProps {
  /** The muted 13px line above the title: a date, or the page's context. */
  eyebrow?: string
  title: React.ReactNode
  /** One quiet sentence. Skip it when the title already says everything. */
  sub?: React.ReactNode
  /** Right-aligned slot for a primary action, filter, or search field. */
  action?: React.ReactNode
  /** Show a visible Select / Done button wired to the multi-select provider. */
  selectable?: boolean
}

/**
 * The single page-title treatment. Every route used to hand-roll its own —
 * seven different h1 recipes across fourteen pages. The H1 is 28/34 at weight
 * 650 and drops to 24/30 under the content breakpoint, which Tailwind's `md`
 * stands in for.
 */
export function PageHeader({ eyebrow, title, sub, action, selectable }: PageHeaderProps) {
  const multiSelect = useOptionalMultiSelect()
  const showSelectButton = selectable && multiSelect != null

  return (
    <header className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1
          className="text-[length:var(--text-2xl)] leading-[30px] md:text-[length:var(--text-3xl)] md:leading-[34px]"
          style={{
            margin: eyebrow ? '2px 0 0' : 0,
            fontFamily: 'var(--font-sans)',
            fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h1>
        {sub && (
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              lineHeight: '18px',
              fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--text-secondary)',
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {(action || showSelectButton) && (
        <div className="flex-shrink-0 flex items-center gap-3">
          {showSelectButton && (
            <Button
              variant="secondary"
              size="sm"
              onClick={multiSelect.toggleSelectMode}
              // Accent while selecting: the pill is a current-state control then.
              style={multiSelect.isSelectMode ? { color: 'var(--accent)' } : undefined}
            >
              <CheckSquare className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
              <span>{multiSelect.isSelectMode ? 'Done' : 'Select'}</span>
            </Button>
          )}
          {action}
        </div>
      )}
    </header>
  )
}
