import { describe, it, expect } from 'vitest'
import { computeGenreBreakdown, computeRatingDistribution, computeMonthlyActivity } from '@/lib/stats'

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
    const result = computeMonthlyActivity(entries, 12)
    expect(result).toHaveLength(12)
    const may = result.find(r => r.month === '2026-05')
    expect(may).toBeDefined()
  })
})
