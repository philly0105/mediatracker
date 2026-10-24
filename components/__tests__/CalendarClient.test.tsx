import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

  // The countdown is read off the clock, so the row's name moves with the
  // calendar unless the day is pinned. Only Date is faked; React's scheduling
  // still runs on real timers.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 22, 15, 30))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function renderCalendar(releases: Parameters<typeof CalendarClient>[0]['releases']) {
    render(
      <ToastProvider>
        <MultiSelectProvider>
          <CalendarClient releases={releases} />
        </MultiSelectProvider>
      </ToastProvider>
    )
  }

  // The row is a button, which is children-presentational, so the date stack,
  // the weekday, the countdown, the type icon and the bookmark are only
  // reachable through its name.
  it('carries the date, the countdown, the type and the watchlist state', () => {
    renderCalendar([
      { ...base, tmdb_id: 1, type: 'movie', title: 'Godzilla Minus Zero', onWatchlist: true },
      { ...base, tmdb_id: 2, type: 'show', title: 'Pluribus' },
    ])

    expect(screen.getByRole('button', {
      name: 'Godzilla Minus Zero, movie, Tuesday, Nov 3, 2026, in 12 days, on your watchlist',
    })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pluribus, TV show, Tuesday, Nov 3, 2026, in 12 days' })).toBeTruthy()
  })

  it('names the episode a followed show is counting down to', () => {
    renderCalendar([
      { ...base, tmdb_id: 3, type: 'show', title: 'Slow Horses', followed: true, episode_label: 'S05E04' },
      { ...base, tmdb_id: 4, type: 'show', title: 'Severance', followed: true },
    ])

    expect(screen.getByRole('button', {
      name: 'Slow Horses, TV show, Tuesday, Nov 3, 2026, in 12 days, S05E04',
    })).toBeTruthy()
    // The badge falls back to a generic label, and so does the name.
    expect(screen.getByRole('button', {
      name: 'Severance, TV show, Tuesday, Nov 3, 2026, in 12 days, Next Episode',
    })).toBeTruthy()
  })
})
