import { describe, it, expect } from 'vitest'
import {
  computeGenreBreakdown,
  computeRatingDistribution,
  computeMonthlyActivity,
  computeTotalHours,
  computeTopRated,
  computeRewatchCount,
  computeStreaks,
  computeYearlyActivity,
  availableYears,
} from '@/lib/stats'
import type { WatchEntry } from '@/types'

describe('computeGenreBreakdown', () => {
  it('counts genres across entries', () => {
    const entries = [
      { media: { genres: ['Drama', 'Thriller'] } },
      { media: { genres: ['Drama'] } },
      { media: { genres: ['Comedy'] } },
    ] as unknown as WatchEntry[]
    const result = computeGenreBreakdown(entries)
    expect(result).toContainEqual({ genre: 'Drama', count: 2 })
    expect(result).toContainEqual({ genre: 'Thriller', count: 1 })
    expect(result[0].count).toBeGreaterThanOrEqual(result[1].count)
  })
})

describe('computeRatingDistribution', () => {
  it('counts entries per rating value', () => {
    const entries = [
      { rating: 4.5 }, { rating: 4.5 }, { rating: 3.0 }, { rating: null }
    ] as unknown as WatchEntry[]
    const result = computeRatingDistribution(entries)
    const r45 = result.find(r => r.rating === 4.5)
    expect(r45?.count).toBe(2)
    const r30 = result.find(r => r.rating === 3.0)
    expect(r30?.count).toBe(1)
  })
})

describe('computeMonthlyActivity', () => {
  it('groups activity by month for last 12 months', () => {
    const entries = [
      { watched_at: '2026-05-10', media: { type: 'movie' } },
      { watched_at: '2026-05-15', media: { type: 'show' } },
    ] as unknown as WatchEntry[]
    const result = computeMonthlyActivity(entries, [], 12)
    expect(result).toHaveLength(12)
    const may = result.find(r => r.month === '2026-05')
    expect(may).toBeDefined()
  })

  it('does not count a show watch_entries row as an episode', () => {
    const entries = [
      { watched_at: '2026-05-10', media: { type: 'show' } },
    ] as unknown as WatchEntry[]
    const result = computeMonthlyActivity(entries, [], 12)
    const may = result.find(r => r.month === '2026-05')
    expect(may?.movies).toBe(0)
    expect(may?.episodes).toBe(0)
  })

  it('buckets episodes by their own watched_at, even when it differs from the show entry', () => {
    const entries = [
      { watched_at: '2026-05-10', media: { type: 'show' } },
    ] as unknown as WatchEntry[]
    const episodes = [
      { watched_at: '2026-06-01', runtime_mins: 45 },
      { watched_at: '2026-06-02', runtime_mins: 45 },
    ]
    const result = computeMonthlyActivity(entries, episodes, 12)
    const may = result.find(r => r.month === '2026-05')
    const jun = result.find(r => r.month === '2026-06')
    expect(may?.episodes).toBe(0)
    expect(jun?.episodes).toBe(2)
  })
})

describe('computeTotalHours', () => {
  it('sums two movies at 120 and 90 minutes to 3.5 hours', () => {
    const entries = [
      { media: { type: 'movie', runtime_mins: 120 } },
      { media: { type: 'movie', runtime_mins: 90 } },
    ] as unknown as WatchEntry[]
    expect(computeTotalHours(entries, [])).toBe(3.5)
  })

  it('sums 10 watched episodes of a 45-minute show to 7.5 hours and ignores the show entry', () => {
    const entries = [
      { media: { type: 'show', runtime_mins: 45 } },
    ] as unknown as WatchEntry[]
    const episodes = Array.from({ length: 10 }, () => ({ watched_at: '2026-06-01', runtime_mins: 45 }))
    expect(computeTotalHours(entries, episodes)).toBe(7.5)
  })

  it('treats null runtimes as 0 and does not produce NaN', () => {
    const entries = [
      { media: { type: 'movie', runtime_mins: null } },
      { media: { type: 'show', runtime_mins: null } },
    ] as unknown as WatchEntry[]
    const episodes = [{ watched_at: '2026-06-01', runtime_mins: null }]
    expect(computeTotalHours(entries, episodes)).toBe(0)
  })

  it('does not throw for an entry with no media', () => {
    const entries = [{}] as unknown as WatchEntry[]
    expect(() => computeTotalHours(entries, [])).not.toThrow()
    expect(computeTotalHours(entries, [])).toBe(0)
  })
})

describe('computeTopRated', () => {
  it('deduplicates by title taking the highest rating and sorts descending', () => {
    const entries = [
      { rating: 3.5, watched_at: '2026-01-01', media: { type: 'movie', title: 'Inception' } },
      { rating: 5.0, watched_at: '2026-02-01', media: { type: 'movie', title: 'Inception' } }, // higher rewatch
      { rating: 4.5, watched_at: '2026-01-15', media: { type: 'movie', title: 'Interstellar' } },
      { rating: 4.0, watched_at: '2026-01-10', media: { type: 'show', title: 'Dark' } },
      { rating: null, watched_at: '2026-01-20', media: { type: 'movie', title: 'Tenet' } }, // unrated
    ] as unknown as WatchEntry[]

    const result = computeTopRated(entries, 5)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      title: 'Inception',
      type: 'movie',
      rating: 5.0,
      watched_at: '2026-02-01',
    })
    expect(result[1].title).toBe('Interstellar')
    expect(result[2].title).toBe('Dark')
  })

  it('respects the limit argument', () => {
    const entries = [
      { rating: 5.0, watched_at: '2026-01-01', media: { type: 'movie', title: 'Movie A' } },
      { rating: 4.5, watched_at: '2026-01-02', media: { type: 'movie', title: 'Movie B' } },
      { rating: 4.0, watched_at: '2026-01-03', media: { type: 'movie', title: 'Movie C' } },
    ] as unknown as WatchEntry[]

    expect(computeTopRated(entries, 2)).toHaveLength(2)
  })
})

describe('computeRewatchCount', () => {
  it('counts entries marked as rewatch', () => {
    const entries = [
      { rewatch: true },
      { rewatch: false },
      { rewatch: true },
      { rewatch: false },
    ] as unknown as WatchEntry[]
    expect(computeRewatchCount(entries)).toBe(2)
  })

  it('returns 0 for empty entries', () => {
    expect(computeRewatchCount([])).toBe(0)
  })
})

describe('computeStreaks', () => {
  const refDate = new Date(2026, 4, 20) // 2026-05-20

  it('returns 0 for empty history', () => {
    expect(computeStreaks([], [], refDate)).toEqual({ current: 0, longest: 0 })
  })

  it('recognizes a streak active today', () => {
    const entries = [
      { watched_at: '2026-05-18' },
      { watched_at: '2026-05-19' },
      { watched_at: '2026-05-20' }, // today
    ] as unknown as WatchEntry[]

    const result = computeStreaks(entries, [], refDate)
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
  })

  it('recognizes a streak ending yesterday as still current', () => {
    const entries = [
      { watched_at: '2026-05-18' },
      { watched_at: '2026-05-19' }, // yesterday
    ] as unknown as WatchEntry[]

    const result = computeStreaks(entries, [], refDate)
    expect(result.current).toBe(2)
    expect(result.longest).toBe(2)
  })

  it('recognizes a broken streak when last watch was 2+ days ago', () => {
    const entries = [
      { watched_at: '2026-05-15' },
      { watched_at: '2026-05-16' },
      { watched_at: '2026-05-17' }, // ended 3 days before 2026-05-20
    ] as unknown as WatchEntry[]

    const result = computeStreaks(entries, [], refDate)
    expect(result.current).toBe(0)
    expect(result.longest).toBe(3)
  })

  it('correctly calculates longest streak distinct from current streak', () => {
    const entries = [
      { watched_at: '2026-01-01' },
      { watched_at: '2026-01-02' },
      { watched_at: '2026-01-03' },
      { watched_at: '2026-01-04' }, // 4-day streak in Jan
      { watched_at: '2026-05-20' }, // 1-day current streak in May
    ] as unknown as WatchEntry[]

    const result = computeStreaks(entries, [], refDate)
    expect(result.current).toBe(1)
    expect(result.longest).toBe(4)
  })

  it('handles multiple entries and episodes on the same day without inflating streak count', () => {
    const entries = [
      { watched_at: '2026-05-19' },
      { watched_at: '2026-05-19' },
      { watched_at: '2026-05-20' },
    ] as unknown as WatchEntry[]
    const episodes = [
      { watched_at: '2026-05-19', runtime_mins: 30 },
      { watched_at: '2026-05-20', runtime_mins: 45 },
    ]

    const result = computeStreaks(entries, episodes, refDate)
    expect(result.current).toBe(2)
    expect(result.longest).toBe(2)
  })
})

describe('computeYearlyActivity', () => {
  it('creates 12 monthly buckets for the target year and places entries accurately', () => {
    const entries = [
      { watched_at: '2026-01-15', media: { type: 'movie' } },
      { watched_at: '2026-01-20', media: { type: 'movie' } },
      { watched_at: '2026-06-10', media: { type: 'movie' } },
      { watched_at: '2025-01-15', media: { type: 'movie' } }, // different year
    ] as unknown as WatchEntry[]
    const episodes = [
      { watched_at: '2026-01-10', runtime_mins: 50 },
      { watched_at: '2026-12-25', runtime_mins: 45 },
    ]

    const result = computeYearlyActivity(entries, episodes, 2026)
    expect(result).toHaveLength(12)
    expect(result[0]).toEqual({ month: '2026-01', movies: 2, episodes: 1 })
    expect(result[5]).toEqual({ month: '2026-06', movies: 1, episodes: 0 })
    expect(result[11]).toEqual({ month: '2026-12', movies: 0, episodes: 1 })
    expect(result[1]).toEqual({ month: '2026-02', movies: 0, episodes: 0 })
  })
})

describe('availableYears', () => {
  it('returns sorted unique descending years from entries and episodes', () => {
    const entries = [
      { watched_at: '2024-05-10' },
      { watched_at: '2026-01-15' },
      { watched_at: '2024-11-20' },
    ] as unknown as WatchEntry[]
    const episodes = [
      { watched_at: '2025-08-01', runtime_mins: 40 },
    ]

    expect(availableYears(entries, episodes)).toEqual([2026, 2025, 2024])
  })

  it('returns empty array when no valid dates exist', () => {
    expect(availableYears([], [])).toEqual([])
  })
})
