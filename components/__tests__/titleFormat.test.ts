import { describe, it, expect } from 'vitest'
import { formatMinutes, tmdbPercent } from '../title/format'

describe('formatMinutes', () => {
  it('writes hours and minutes, dropping whichever is zero', () => {
    expect(formatMinutes(222)).toBe('3h 42m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(53)).toBe('53m')
    expect(formatMinutes(0)).toBe('0m')
  })

  it('rounds fractional minutes', () => {
    expect(formatMinutes(59.6)).toBe('1h')
  })
})

describe('tmdbPercent', () => {
  it('turns the 0–10 average into a whole percentage', () => {
    expect(tmdbPercent(8.4)).toBe('84%')
    expect(tmdbPercent(7.25)).toBe('73%')
  })

  it('is null for a missing or zero score', () => {
    expect(tmdbPercent(0)).toBeNull()
    expect(tmdbPercent(null)).toBeNull()
    expect(tmdbPercent(undefined)).toBeNull()
  })
})
