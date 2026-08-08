import { describe, it, expect } from 'vitest'
import { isValidInviteCode, safeNextPath } from '@/lib/auth'

describe('isValidInviteCode', () => {
  it('accepts the configured code', () => {
    expect(isValidInviteCode('open-sesame', 'open-sesame')).toBe(true)
  })

  it('rejects a wrong code', () => {
    expect(isValidInviteCode('open-sesam', 'open-sesame')).toBe(false)
    expect(isValidInviteCode('open-sesamee', 'open-sesame')).toBe(false)
    expect(isValidInviteCode('OPEN-SESAME', 'open-sesame')).toBe(false)
  })

  it('fails closed when no code is configured', () => {
    // A missing secret must not mean "everything passes" — that would open
    // signup on any instance that forgot to set the variable.
    expect(isValidInviteCode('anything', undefined)).toBe(false)
    expect(isValidInviteCode('', undefined)).toBe(false)
    expect(isValidInviteCode('', '')).toBe(false)
  })

  it('rejects non-strings rather than throwing', () => {
    // The body is parsed JSON, so the field can be any shape at all.
    expect(isValidInviteCode(undefined, 'code')).toBe(false)
    expect(isValidInviteCode(null, 'code')).toBe(false)
    expect(isValidInviteCode({ toString: () => 'code' }, 'code')).toBe(false)
    expect(isValidInviteCode(['code'], 'code')).toBe(false)
  })

  it('does not throw on a length mismatch', () => {
    // timingSafeEqual throws on unequal buffer lengths; hashing first is what
    // stops a wrong-length guess from becoming a 500 that reveals the length.
    expect(() => isValidInviteCode('x', 'a-much-longer-code')).not.toThrow()
  })
})

describe('safeNextPath', () => {
  it('keeps an ordinary in-app path', () => {
    expect(safeNextPath('/reset-password')).toBe('/reset-password')
    expect(safeNextPath('/show/abc?tab=1')).toBe('/show/abc?tab=1')
  })

  it('refuses to leave the app', () => {
    // `next` arrives through an emailed link, so it is attacker-influenced: a
    // crafted reset email must not be able to land a freshly authenticated
    // user on someone else's site.
    expect(safeNextPath('https://evil.example')).toBe('/')
    expect(safeNextPath('//evil.example')).toBe('/')
    expect(safeNextPath('/\\evil.example')).toBe('/')
    expect(safeNextPath('javascript:alert(1)')).toBe('/')
  })

  it('falls back when there is nothing usable', () => {
    expect(safeNextPath(undefined)).toBe('/')
    expect(safeNextPath('')).toBe('/')
    expect(safeNextPath(42)).toBe('/')
    expect(safeNextPath('relative/path')).toBe('/')
  })

  it('honours an explicit fallback', () => {
    expect(safeNextPath(null, '/login')).toBe('/login')
  })
})
