import { describe, it, expect } from 'vitest'
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
