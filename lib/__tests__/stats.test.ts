import { describe, it, expect } from 'vitest'
import { computeGenreBreakdown, computeRatingDistribution, computeMonthlyActivity, computeTotalHours } from '@/lib/stats'
import type { WatchEntry } from '@/types'

describe('computeGenreBreakdown', () => {
  it('counts genres across entries', () => {
    const entries = [
      { media: { genres: ['Drama', 'Thriller'] } },
      { media: { genres: ['Drama'] } },
      { media: { genres: ['Comedy'] } },
    ] as any
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
    ] as any
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
    ] as any
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
