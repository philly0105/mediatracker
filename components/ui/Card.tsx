'use client'
import React from 'react'
import { activatableProps } from './activatable'
import { CARD_VARIANT_CLASS, type CardVariant } from './cardVariants'

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
      className={[CARD_VARIANT_CLASS[variant], onClick && interactive, className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
