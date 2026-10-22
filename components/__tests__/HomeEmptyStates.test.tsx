import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EmptyHero from '../home/EmptyHero'
import HomeLoading from '@/app/(app)/loading'

describe('EmptyHero', () => {
  it('invites a first pick, with the last watch as its art when there is one', () => {
    const { container } = render(<EmptyHero recent={{ title: 'Sinners', backdrop_url: 'https://image.tmdb.org/t/p/w1280/sinners.jpg' }} />)

    expect(screen.getByRole('heading', { name: 'Pick something to watch' })).toBeInTheDocument()
    expect(screen.getByText('Last watched · Sinners')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Recommendations' })).toHaveAttribute('href', '/recommendations')
    expect(screen.getByRole('link', { name: 'Watchlist' })).toHaveAttribute('href', '/watchlist')
    // Decorative art: one image, hidden from assistive tech.
    const art = container.querySelector('img')
    expect(art).not.toBeNull()
    expect(art).toHaveAttribute('alt', '')
  })

  it('renders without any art or recent watch', () => {
    const { container } = render(<EmptyHero recent={null} />)

    expect(screen.getByRole('heading', { name: 'Pick something to watch' })).toBeInTheDocument()
    expect(screen.getByText('Nothing in progress')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('Home loading state', () => {
  it('is one busy status region with its content hidden from assistive tech', () => {
    render(<HomeLoading />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading your dashboard...')).toHaveClass('sr-only')
  })
})
