import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BecauseYouWatchedCard from '../home/BecauseYouWatchedCard'
import type { TmdbSearchResult } from '@/types'

const openMedia = vi.fn()
vi.mock('@/components/MediaModalProvider', () => ({
  useMediaModal: () => ({ openMedia, closeMedia: vi.fn() }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

const item: TmdbSearchResult = {
  tmdb_id: 225171,
  type: 'show',
  title: 'Pluribus',
  overview: '',
  poster_url: null,
  release_year: 2025,
  genres: ['Drama', 'Sci-Fi'],
}

function renderCard(logoUrl: string | null) {
  return render(
    <BecauseYouWatchedCard
      item={item}
      seedTitle="Severance"
      backdropUrl="https://image.tmdb.org/t/p/w1280/pluribus.jpg"
      logoUrl={logoUrl}
      platform="Apple TV+"
      year={2025}
      genres={item.genres ?? []}
    />
  )
}

describe('BecauseYouWatchedCard', () => {
  beforeEach(() => {
    openMedia.mockReset()
  })

  it('is a section headed by the title, with the seed line beside it', () => {
    renderCard(null)

    expect(screen.getByRole('region', { name: 'Pluribus' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Pluribus' })).toBeInTheDocument()
    expect(screen.getByText('Because you watched Severance')).toBeInTheDocument()
    expect(screen.getByText('Apple TV+ · 2025 · Drama · Sci-Fi')).toBeInTheDocument()
  })

  it('keeps the heading when the logo stands in for the title', () => {
    renderCard('https://image.tmdb.org/t/p/w500/pluribus-logo.png')

    const heading = screen.getByRole('heading', { level: 2, name: 'Pluribus' })
    expect(heading.querySelector('img')).toHaveAttribute('alt', 'Pluribus')
  })

  it('opens the title into the Must watch bucket', () => {
    renderCard(null)

    fireEvent.click(screen.getByRole('button', { name: 'Add Pluribus to Must watch' }))
    expect(openMedia).toHaveBeenCalledTimes(1)
    expect(openMedia.mock.calls[0][0]).toMatchObject({ tmdb_id: 225171, type: 'show' })
    expect(openMedia.mock.calls[0][1]).toMatchObject({ priority: 'must_watch' })
  })
})
