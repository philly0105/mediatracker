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
 * with no affordance that they were interactive. The well itself is
 * `.input-field`, the same inset recipe as `Input`; focus is the global outline.
 */
export function Select({ label, className = '', children, ...rest }: SelectProps) {
  return (
    <div className="relative inline-flex">
      <select
        aria-label={label}
        className={`input-field appearance-none cursor-pointer pl-4 pr-10 ${className}`}
        {...rest}
      >
        {children}
      </select>
      {/* pointer-events-none so the chevron does not swallow the click that
          opens the menu. */}
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.8}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)]"
      />
    </div>
  )
}
