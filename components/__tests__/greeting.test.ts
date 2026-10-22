import { describe, it, expect } from 'vitest'
import { firstNameFromEmail, formatEyebrowDate, greetingFor, parseTimeKey, timeKey } from '../home/greeting'
import { formatCountdown, formatMinutes, formatShortDate } from '../home/format'

describe('greetingFor', () => {
  it('splits the day at 5, 12 and 18', () => {
    expect(greetingFor(4)).toBe('Good evening')
    expect(greetingFor(5)).toBe('Good morning')
    expect(greetingFor(11)).toBe('Good morning')
    expect(greetingFor(12)).toBe('Good afternoon')
    expect(greetingFor(17)).toBe('Good afternoon')
    expect(greetingFor(18)).toBe('Good evening')
    expect(greetingFor(23)).toBe('Good evening')
  })
})

describe('firstNameFromEmail', () => {
  it('takes the first word of the local part, capitalised', () => {
    expect(firstNameFromEmail('richard@example.com')).toBe('Richard')
    expect(firstNameFromEmail('richard.dorf@example.com')).toBe('Richard')
    expect(firstNameFromEmail('RICHARD_dorf+films@example.com')).toBe('Richard')
    expect(firstNameFromEmail('rich2000@example.com')).toBe('Rich')
  })

  it('gives up rather than greeting a number or nothing', () => {
    expect(firstNameFromEmail('2000@example.com')).toBeNull()
    expect(firstNameFromEmail('')).toBeNull()
    expect(firstNameFromEmail(undefined)).toBeNull()
  })
})

describe('time key', () => {
  it('round-trips the local date and hour', () => {
    const key = timeKey(new Date(2026, 9, 22, 19, 45))
    expect(key).toBe('2026-10-22T19')
    const { date, hour } = parseTimeKey(key)
    expect(hour).toBe(19)
    expect(formatEyebrowDate(date)).toBe('Thursday, October 22')
  })
})

describe('home formatters', () => {
  it('formats minutes as hours and minutes', () => {
    expect(formatMinutes(222)).toBe('3h 42m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(53)).toBe('53m')
    expect(formatMinutes(0)).toBeNull()
    expect(formatMinutes(null)).toBeNull()
  })

  it('formats the logged date as month and day, in local time', () => {
    expect(formatShortDate('2026-10-19')).toBe('Oct 19')
    expect(formatShortDate('2026-10-19T23:30:00+00:00')).toBe('Oct 19')
    expect(formatShortDate(null)).toBeUndefined()
  })

  it('counts down to a release from today', () => {
    const today = new Date(2026, 9, 22)
    expect(formatCountdown('2026-10-22', today)).toBe('Today')
    expect(formatCountdown('2026-10-23', today)).toBe('Tomorrow')
    expect(formatCountdown('2026-10-30', today)).toBe('Fri · in 8 days')
    expect(formatCountdown('not a date', today)).toBeNull()
  })
})
