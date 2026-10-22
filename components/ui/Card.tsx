'use client'
import React from 'react'
import { activatableProps } from './activatable'

type CardVariant = 'surface' | 'panel' | 'slab' | 'row' | 'inset'

// Attributes are typed over HTMLElement rather than HTMLDivElement so the same
// handlers can land on whichever element `as` picks.
interface CardProps extends React.HTMLAttributes<HTMLElement> {
  onClick?: () => void
  /**
   * Which glass tier the card is. `surface` (the default) is the panel tint
   * without the blur, so it is safe anywhere — the watchlist and person pages
   * render one per list item, and blur is never allowed inside a list. `panel`
   * and `slab` are the blurred tier-1 containers (section panels, hero slab):
   * never render those per item. `row` and `inset` are the flat tier-2 fills
   * for things inside a panel.
   */
  variant?: CardVariant
  /** Landmark or list semantics without a wrapper element. */
  as?: 'div' | 'section' | 'article' | 'aside' | 'li'
}

// Panels tighten from 20px to 14px padding under the 760px content
// breakpoint (spec 4.4), where .glass-panel drops to its 24px radius. The
// padding is a variable so a rail that bleeds to the rim (CastStrip,
// MoreLikeThisRail) can cancel exactly as much as the panel adds.
const VARIANT_CLASS: Record<CardVariant, string> = {
  surface: 'card-surface',
  panel: 'glass-panel glass-rim [--panel-pad:14px] min-[760px]:[--panel-pad:var(--space-5)] p-[var(--panel-pad)]',
  slab: 'glass-slab glass-rim p-7',
  row: 'glass-row p-3',
  inset: 'glass-inset p-4',
}

// The hover treatment is `.card-interactive` in globals.css rather than a
// `useState(hover)` inline style: no render per pointer move, keyboard focus
// gets the same affordance, and reduced-motion can reach the lift. The lift
// and glow suit a standalone surface or panel; a row inside a panel already
// has its own hover fill, so it only takes the cursor.
export function Card({
  children,
  onClick,
  variant = 'surface',
  as: Tag = 'div',
  style,
  className,
  ...rest
}: CardProps) {
  const interactive = variant === 'surface' || variant === 'panel' ? 'card-interactive' : 'cursor-pointer'
  return (
    <Tag
      onClick={onClick}
      // Spread before `rest` so a caller can still supply its own aria-label.
      {...activatableProps(onClick, rest['aria-label'])}
      className={[VARIANT_CLASS[variant], onClick && interactive, className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
