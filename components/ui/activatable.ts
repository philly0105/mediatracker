import type { KeyboardEvent } from 'react'

/**
 * Props that make a clickable card reachable from the keyboard.
 *
 * The cards these serve — `Card`, `MediaRow`, the recommendation grid — all
 * carry their own buttons (rating stars, action chips), so their root cannot be
 * a `<button>` the way `PosterCard`'s is without nesting interactive elements.
 * `role="button"` plus an explicit Enter/Space handler puts the card in tab
 * order and makes it activate, while the nested controls stay reachable by
 * tabbing past it.
 *
 * Pass `label` wherever a title is available: without it a screen reader falls
 * back to reading the card's entire text content as the button's name.
 *
 * Returns nothing when there is no `onClick`, so display-only cards stay inert
 * and out of the tab order.
 */
export function activatableProps(onClick: (() => void) | undefined, label?: string) {
  if (!onClick) return {}
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      // A nested control owns its own activation — Space on a rating star must
      // set the rating, not also open the card.
      if (e.target !== e.currentTarget) return
      e.preventDefault()
      onClick()
    },
  }
}
