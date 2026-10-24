import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RecommendationCard, type RecommendationCardItem } from '@/components/grid/RecommendationCard'

const item: RecommendationCardItem = {
  title: 'Sicario',
  type: 'movie',
  overview: 'An idealistic FBI agent is enlisted by a government task force.',
  poster_url: null,
  release_year: 2015,
  vote_average: 7.6,
  seed_title: 'Prisoners',
}

function renderCard(props: Partial<React.ComponentProps<typeof RecommendationCard>> = {}) {
  return render(
    <RecommendationCard
      item={item}
      actioning={false}
      onOpen={vi.fn()}
      onAddToWatchlist={vi.fn()}
      onMarkWatched={vi.fn()}
      {...props}
    />
  )
}

// The row used to be a clickable Card, so its root was a role="button" with
// the two action pills inside it. role="button" is children-presentational, so
// the heading, the year and rating, the seed line and the overview were all
// dropped from the accessibility tree and the card announced as "Sicario,
// button" — and axe's nested-interactive fired on the pills.
describe('RecommendationCard', () => {
  it('puts no interactive element inside another', () => {
    const { container } = renderCard()

    const interactive = container.querySelectorAll('button,[role="button"],a[href]')
    expect(interactive.length).toBeGreaterThan(0)
    for (const el of interactive) {
      expect(el.querySelector('button,[role="button"],a[href]')).toBeNull()
    }
  })

  it('leaves the card root out of the accessibility tree entirely', () => {
    const { container } = renderCard()
    const root = container.firstElementChild!

    // Both come from activatableProps, which returns nothing without onClick.
    expect(root).not.toHaveAttribute('role')
    expect(root).not.toHaveAttribute('tabindex')
    // An aria-label on a roleless div is ignored at best; the opener owns the
    // name now.
    expect(root).not.toHaveAttribute('aria-label')
  })

  it('keeps the title and the overview readable, with one opener named by the title', () => {
    const onOpen = vi.fn()
    renderCard({ onOpen })

    expect(screen.getByRole('heading', { level: 2, name: 'Sicario' })).toBeInTheDocument()
    expect(screen.getByText(item.overview)).toBeInTheDocument()
    expect(screen.getByText('Because you watched Prisoners')).toBeInTheDocument()

    screen.getByRole('button', { name: 'Sicario' }).click()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('still fires each action without the opener swallowing the press', () => {
    const onAddToWatchlist = vi.fn()
    const onMarkWatched = vi.fn()
    const onOpen = vi.fn()
    renderCard({ onAddToWatchlist, onMarkWatched, onOpen })

    screen.getByRole('button', { name: 'Watchlist' }).click()
    screen.getByRole('button', { name: 'Watched' }).click()

    expect(onAddToWatchlist).toHaveBeenCalledTimes(1)
    expect(onMarkWatched).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })
})
