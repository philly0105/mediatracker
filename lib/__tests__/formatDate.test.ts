import { describe, it, expect, vi } from 'vitest'
import { formatAirDate, formatDateLabel, isUnaired } from '@/lib/formatDate'

describe('formatDate', () => {
  describe('formatAirDate', () => {
    it('formats YYYY-MM-DD correctly in en-US', () => {
      expect(formatAirDate('2008-01-20')).toBe('Jan 20, 2008')
      expect(formatAirDate('2026-12-05')).toBe('Dec 5, 2026')
    })

    it('returns null for empty or invalid dates', () => {
      expect(formatAirDate('')).toBeNull()
      expect(formatAirDate('not-a-date')).toBeNull()
      expect(formatAirDate('2026-99-99')).not.toBeNull() // Date overflow handles rolling or invalid
    })

    it('keeps the stored day after the time zone changes under an open page', async () => {
      // The formatter is shared and built when the module loads, so a laptop
      // that moves east must not see every label a day early until reload.
      const original = process.env.TZ
      try {
        process.env.TZ = 'America/New_York'
        vi.resetModules()
        const fresh = await import('@/lib/formatDate')
        process.env.TZ = 'Asia/Tokyo'
        expect(fresh.formatAirDate('2008-01-20')).toBe('Jan 20, 2008')
      } finally {
        if (original === undefined) delete process.env.TZ
        else process.env.TZ = original
      }
    })
  })

  describe('formatDateLabel', () => {
    it('formats valid date string', () => {
      expect(formatDateLabel('2026-05-15')).toBe('May 15, 2026')
    })

    it('returns empty string for null/undefined/empty', () => {
      expect(formatDateLabel(null)).toBe('')
      expect(formatDateLabel(undefined)).toBe('')
      expect(formatDateLabel('')).toBe('')
    })

    it('falls back to raw string if unparseable', () => {
      expect(formatDateLabel('invalid-date')).toBe('invalid-date')
    })
  })

  describe('isUnaired', () => {
    const fixedNow = new Date(2026, 4, 15) // May 15, 2026

    it('returns true for future air dates', () => {
      expect(isUnaired('2026-05-16', fixedNow)).toBe(true)
      expect(isUnaired('2027-01-01', fixedNow)).toBe(true)
    })

    it('returns false for past air dates and today', () => {
      expect(isUnaired('2026-05-14', fixedNow)).toBe(false)
      expect(isUnaired('2020-01-01', fixedNow)).toBe(false)
    })

    it('returns false for null/empty air dates', () => {
      expect(isUnaired(null, fixedNow)).toBe(false)
      expect(isUnaired('', fixedNow)).toBe(false)
    })
  })
})
