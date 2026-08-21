'use client'
import { ChevronDown } from 'lucide-react'
import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Required. These sit in a filter row with no visible label, so this is the
   * only name a screen reader has to work with — without it the announcement
   * is just the current value ("combo box, All Genres") with no clue what it
   * filters.
   */
  label: string
}

/**
 * The filter dropdowns on Library and Watchlist, which were five verbatim
 * copies of the same markup. Every one stripped the native arrow with
 * `appearance-none` and never drew a replacement, so they read as static text
 * with no affordance that they were interactive.
 */
export function Select({ label, className = '', children, ...rest }: SelectProps) {
  return (
    <div className="relative inline-flex">
      <select
        aria-label={label}
        className={`w-full appearance-none pl-4 pr-9 py-2 rounded-sm bg-[var(--surface-input)] border border-[var(--border-default)] text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] ${className}`}
        {...rest}
      >
        {children}
      </select>
      {/* pointer-events-none so the chevron does not swallow the click that
          opens the menu. */}
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
      />
    </div>
  )
}
