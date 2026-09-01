'use client'
import React from 'react'
import { Eyebrow } from './Eyebrow'
import { useOptionalMultiSelect } from '@/components/MultiSelectProvider'
import { Button } from './Button'
import { CheckSquare } from 'lucide-react'

interface PageHeaderProps {
  /** Tiny tracked uppercase label above the title — the system's signature cue. */
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
 * seven different h1 recipes across fourteen pages, half of them fading into
 * a cold grey that fights the warm canvas.
 */
export function PageHeader({ eyebrow, title, sub, action, selectable }: PageHeaderProps) {
  const multiSelect = useOptionalMultiSelect()
  const showSelectButton = selectable && multiSelect != null

  return (
    <header className="flex flex-col gap-4 mb-8 md:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <Eyebrow style={{ marginBottom: '6px' }}>{eyebrow}</Eyebrow>}
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--weight-extrabold)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 'var(--leading-tight)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h1>
        {sub && (
          <p
            style={{
              margin: '6px 0 0',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
              lineHeight: 'var(--leading-normal)',
              color: 'var(--text-secondary)',
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {(action || showSelectButton) && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {showSelectButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={multiSelect.toggleSelectMode}
              className={multiSelect.isSelectMode ? 'text-[var(--accent)] font-semibold' : 'text-zinc-400 hover:text-white'}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{multiSelect.isSelectMode ? 'Done' : 'Select'}</span>
            </Button>
          )}
          {action}
        </div>
      )}
    </header>
  )
}
