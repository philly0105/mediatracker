'use client'

import { useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

export interface SegmentedControlOption<T extends string> {
  id: T
  label: string
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  /** A muted tally after the label, e.g. the items in a bucket. */
  count?: number
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

// Brings `el` wholly inside the nearest sideways scroller around it. Only that
// box's scrollLeft moves: scrollIntoView would scroll the page as well, and
// Chromium's focus scroll leaves a half-visible item where it is. The 8px past
// the edge clears the focus ring and leaves a sliver of the next item.
export function revealInScroller(el: HTMLElement) {
  for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
    if (box.scrollWidth <= box.clientWidth || !/auto|scroll/.test(getComputedStyle(box).overflowX)) continue
    const outer = box.getBoundingClientRect()
    const inner = el.getBoundingClientRect()
    if (inner.left - 8 < outer.left) box.scrollLeft -= outer.left - inner.left + 8
    else if (inner.right + 8 > outer.right) box.scrollLeft += inner.right - outer.right + 8
    return
  }
}

// The track is the inset well (`.glass-inset`, radius 14) and the segments sit
// 4px inside it, 36px tall, so the whole control still clears the 44px target.
// The selected segment is the glass-button fill with its top highlight; the
// rest are text only until hovered. Keyboard focus is the global outline.
// Forced colours drop the shadow and repaint the fill, which would leave the
// selected segment looking like the others, so there it takes the system
// Highlight pair, as the nav's current item does. It opts out of the forced
// palette there, or the Canvas backplate hides its label, so the muted count
// inside is set to HighlightText by hand.
//
// Both states carry the same weight. They used to be semibold and medium, so
// selecting a segment re-measured its label and the whole track changed width,
// sliding its neighbours — worst on the episode-season switcher, which lives
// inside a sideways scroller. The fill and the colour already say which one is
// on.
//
// The group announces as a radio group, so it has to behave like one: one tab
// stop (roving tabindex) and the arrows moving through it. Without that, a
// screen reader switched to forms mode on entering the group and the arrows
// it tells the user to press did nothing, while Tab stopped on all N segments.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const sizeClasses = size === 'sm'
    ? 'px-3 text-xs'
    : 'px-4 text-sm'

  // Segments never shrink or wrap, so a control wider than its column
  // overflows into whatever scroller the call site gives it (EpisodeTracker's
  // seasons, the watchlist's priorities on a phone). The selected segment is
  // brought into that box, or a show opening on its latest season starts with
  // it off the edge, and so is a focused one. Keyboard focus only: a click or
  // tap focuses too, and scrolling the track under a pressed pointer moves the
  // segment away before the click lands. A clicked segment comes in anyway
  // once it is selected.
  const groupRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const radio = groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (radio) revealInScroller(radio)
  }, [value])

  // The selected segment is the group's single tab stop. A `value` matching no
  // option would otherwise leave every segment at -1 and the control
  // unreachable from the keyboard, so the first one holds the stop instead.
  const selectedIndex = options.findIndex((option) => option.id === value)
  const tabStopIndex = selectedIndex === -1 ? 0 : selectedIndex

  // Selection follows focus, which is the radio-group pattern: the arrows pick
  // a segment rather than merely visiting it. The segments render in `options`
  // order, so the index addresses the button directly.
  function selectAt(index: number) {
    const next = (index + options.length) % options.length
    onChange(options[next].id)
    groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    // Both axes: a horizontal track is still a radio group, and nothing here
    // scrolls vertically, so Up/Down would otherwise just move the page.
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
      : 0
    if (!step && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    if (event.key === 'Home') selectAt(0)
    else if (event.key === 'End') selectAt(options.length - 1)
    else selectAt(index + step)
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) revealInScroller(e.target) }}
      className={`glass-inset inline-flex items-center gap-0.5 p-1 relative select-none ${className}`}
    >
      {options.map((option, index) => {
        const isSelected = value === option.id
        const Icon = option.icon

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={index === tabStopIndex ? 0 : -1}
            // The visible tally is decoration; the name carries it instead.
            aria-label={option.count != null ? `${option.label} · ${option.count}` : undefined}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`relative flex shrink-0 items-center justify-center gap-1.5 h-9 whitespace-nowrap rounded-[var(--radius-thumb)] font-semibold transition-colors duration-200 ${sizeClasses} ${
              isSelected
                ? 'text-[var(--text-primary)] bg-[var(--btn-ghost-bg)] shadow-[var(--glass-btn-edge)] forced-colors:forced-color-adjust-none forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)]'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" strokeWidth={1.8} />}
            <span>{option.label}</span>
            {option.count != null && (
              <span
                aria-hidden="true"
                className={`tabular font-medium text-[var(--text-muted)] ${isSelected ? 'forced-colors:text-[color:HighlightText]' : ''}`}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
