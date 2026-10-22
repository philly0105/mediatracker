import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CalendarClient, { countdownLabel } from '../CalendarClient'
import { MultiSelectProvider } from '../MultiSelectProvider'
import { ToastProvider } from '../ToastProvider'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/components/MediaModalProvider', () => ({
  useMediaModal: () => ({ openMedia: vi.fn(), closeMedia: vi.fn() }),
}))

describe('countdownLabel', () => {
  // Mid-afternoon rather than midnight, so the rounding has something to absorb.
  const today = new Date(2026, 9, 22, 15, 30)

  it('names today and tomorrow', () => {
    expect(countdownLabel('2026-10-22', today)).toBe('Today')
    expect(countdownLabel('2026-10-23', today)).toBe('Tomorrow')
  })

  it('counts whole days ahead across a month boundary', () => {
    expect(countdownLabel('2026-10-30', today)).toBe('in 8 days')
    expect(countdownLabel('2026-11-01', today)).toBe('in 10 days')
  })

  it('does not go negative for a date that has already arrived', () => {
    expect(countdownLabel('2026-10-21', today)).toBe('Today')
  })
})

describe('release row name', () => {
  const base = {
    poster_url: null,
    full_release_date: '2026-11-03',
    priority: 'must_watch',
    overview: '',
    release_year: 2026,
  }

  // The row is a button named by aria-label, so the type icon and the
  // bookmark state are only reachable through that name.
  it('carries the type and the watchlist state', () => {
    render(
      <ToastProvider>
        <MultiSelectProvider>
          <CalendarClient
            releases={[
              { ...base, tmdb_id: 1, type: 'movie', title: 'Godzilla Minus Zero', onWatchlist: true },
              { ...base, tmdb_id: 2, type: 'show', title: 'Pluribus' },
            ]}
          />
        </MultiSelectProvider>
      </ToastProvider>
    )

    expect(screen.getByRole('button', { name: 'Godzilla Minus Zero, movie, on your watchlist' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pluribus, TV show' })).toBeTruthy()
  })
})
