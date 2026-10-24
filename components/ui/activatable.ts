import type { KeyboardEvent } from 'react'

/**
 * Props that make a clickable card reachable from the keyboard.
 *
 * For a card whose root cannot be a `<button>` the way `PosterCard`'s is:
 * `role="button"` plus an explicit Enter/Space handler puts it in tab order
 * and makes it activate.
 *
 * Reach for the stretched-opener pattern in `MediaRow` instead whenever the
 * card holds its own buttons. `role="button"` is children-presentational, so
 * everything inside — headings, prose, the nested controls' own names — is
 * dropped from the accessibility tree. RecommendationCard used this and
 * announced as nothing but its title until it moved to the opener.
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
