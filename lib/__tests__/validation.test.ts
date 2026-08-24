import { describe, it, expect } from 'vitest'
import {
  parseRating,
  parseMediaType,
  parseTmdbId,
  parseDate,
  parsePriority,
  badRequest,
  readJson,
} from '@/lib/validation'

describe('validation', () => {
  describe('parseRating', () => {
    it('accepts null and undefined as optional (null)', () => {
      expect(parseRating(null)).toEqual({ ok: true, value: null })
      expect(parseRating(undefined)).toEqual({ ok: true, value: null })
    })

    it('accepts valid ratings at 0.5 granularity', () => {
      expect(parseRating(0.5)).toEqual({ ok: true, value: 0.5 })
      expect(parseRating(1.0)).toEqual({ ok: true, value: 1.0 })
      expect(parseRating(2.5)).toEqual({ ok: true, value: 2.5 })
      expect(parseRating(5.0)).toEqual({ ok: true, value: 5.0 })
    })

    it('rejects below lower bound: 0.4', () => {
      const res = parseRating(0.4)
      expect(res.ok).toBe(false)
      expect(res.error).toBeDefined()
    })

    it('rejects above upper bound: 5.1 and 7', () => {
      expect(parseRating(5.1).ok).toBe(false)
      expect(parseRating(7).ok).toBe(false)
    })

    it('rejects non-0.5 step numbers', () => {
      expect(parseRating(2.3).ok).toBe(false)
      expect(parseRating(4.7).ok).toBe(false)
    })

    it('rejects string rating like "4"', () => {
      expect(parseRating('4').ok).toBe(false)
      expect(parseRating('0.5').ok).toBe(false)
    })

    it('rejects non-finite numbers', () => {
      expect(parseRating(NaN).ok).toBe(false)
      expect(parseRating(Infinity).ok).toBe(false)
    })
  })

  describe('parseMediaType', () => {
    it('accepts movie and show', () => {
      expect(parseMediaType('movie')).toEqual({ ok: true, value: 'movie' })
      expect(parseMediaType('show')).toEqual({ ok: true, value: 'show' })
    })

    it('rejects tv and invalid strings', () => {
      expect(parseMediaType('tv').ok).toBe(false)
      expect(parseMediaType('series').ok).toBe(false)
      expect(parseMediaType('').ok).toBe(false)
      expect(parseMediaType(null).ok).toBe(false)
    })
  })

  describe('parseTmdbId', () => {
    it('accepts positive integers', () => {
      expect(parseTmdbId(1)).toEqual({ ok: true, value: 1 })
      expect(parseTmdbId(550)).toEqual({ ok: true, value: 550 })
    })

    it('rejects zero, negative numbers, floats, and strings', () => {
      expect(parseTmdbId(0).ok).toBe(false)
      expect(parseTmdbId(-10).ok).toBe(false)
      expect(parseTmdbId(1.5).ok).toBe(false)
      expect(parseTmdbId('550').ok).toBe(false)
      expect(parseTmdbId(null).ok).toBe(false)
    })
  })

  describe('parseDate', () => {
    it('accepts valid calendar dates formatted as YYYY-MM-DD', () => {
      expect(parseDate('2026-08-14')).toEqual({ ok: true, value: '2026-08-14' })
      expect(parseDate('2024-02-29')).toEqual({ ok: true, value: '2024-02-29' }) // Leap year
    })

    it('rejects invalid calendar dates like 2026-02-30', () => {
      expect(parseDate('2026-02-30').ok).toBe(false)
      expect(parseDate('2025-02-29').ok).toBe(false) // Non-leap year
      expect(parseDate('2026-04-31').ok).toBe(false) // April has 30 days
      expect(parseDate('2026-13-01').ok).toBe(false) // Invalid month
    })

    it('rejects invalid date formats', () => {
      expect(parseDate('2026/08/14').ok).toBe(false)
      expect(parseDate('08-14-2026').ok).toBe(false)
      expect(parseDate('invalid').ok).toBe(false)
      expect(parseDate(null).ok).toBe(false)
    })
  })

  describe('parsePriority', () => {
    it('accepts valid priorities from schema check constraint', () => {
      expect(parsePriority('must_watch')).toEqual({ ok: true, value: 'must_watch' })
      expect(parsePriority('want_to_watch')).toEqual({ ok: true, value: 'want_to_watch' })
      expect(parsePriority('someday')).toEqual({ ok: true, value: 'someday' })
    })

    it('rejects invalid priorities', () => {
      expect(parsePriority('high').ok).toBe(false)
      expect(parsePriority('low').ok).toBe(false)
      expect(parsePriority('').ok).toBe(false)
      expect(parsePriority(null).ok).toBe(false)
    })
  })

  describe('badRequest', () => {
    it('returns a 400 response with error message', async () => {
      const response = badRequest('Test bad request')
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({ error: 'Test bad request' })
    })
  })

  describe('readJson', () => {
    it('successfully parses valid JSON objects', async () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: 550, type: 'movie' }),
      })
      const result = await readJson<{ tmdb_id: number; type: string }>(request)
      expect(result).toEqual({ ok: true, value: { tmdb_id: 550, type: 'movie' } })
    })

    it('returns ok: false for malformed JSON syntax', async () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ "invalid_json": ',
      })
      const result = await readJson(request)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid or malformed JSON body')
    })

    it('returns ok: false for empty or non-object JSON values', async () => {
      const requestNull = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'null',
      })
      const resultNull = await readJson(requestNull)
      expect(resultNull.ok).toBe(false)
      expect(resultNull.error).toBe('Invalid or malformed JSON body')

      const requestPrimitive = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"just a string"',
      })
      const resultPrimitive = await readJson(requestPrimitive)
      expect(resultPrimitive.ok).toBe(false)
      expect(resultPrimitive.error).toBe('Invalid or malformed JSON body')
    })
  })
})
