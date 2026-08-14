import { NextResponse } from 'next/server'
import type { MediaType, WatchlistPriority } from '@/types'

export type ValidationResult<T> =
  | { ok: true; value: T; error?: never }
  | { ok: false; error: string; value?: never }

/**
 * Returns a JSON 400 Bad Request response with standard `{ error: message }` shape.
 */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * Validates rating: optional (null/undefined returns null), otherwise a number
 * in [0.5, 5.0] at 0.5 increments.
 */
export function parseRating(v: unknown): ValidationResult<number | null> {
  if (v === null || v === undefined) {
    return { ok: true, value: null }
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return { ok: false, error: 'Rating must be a number between 0.5 and 5.0' }
  }
  if (v < 0.5 || v > 5.0) {
    return { ok: false, error: 'Rating must be between 0.5 and 5.0' }
  }
  // Require 0.5 granularity: (v * 2) must be an integer
  if (Math.round(v * 2) !== v * 2) {
    return { ok: false, error: 'Rating must be at 0.5 increments' }
  }
  return { ok: true, value: v }
}

/**
 * Validates media type: must be exactly 'movie' or 'show'.
 */
export function parseMediaType(v: unknown): ValidationResult<MediaType> {
  if (v === 'movie' || v === 'show') {
    return { ok: true, value: v }
  }
  return { ok: false, error: 'Media type must be "movie" or "show"' }
}

/**
 * Validates TMDB ID: must be a positive integer.
 */
export function parseTmdbId(v: unknown): ValidationResult<number> {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) {
    return { ok: true, value: v }
  }
  return { ok: false, error: 'TMDB ID must be a positive integer' }
}

/**
 * Validates calendar date string: YYYY-MM-DD matching a real calendar date.
 */
export function parseDate(v: unknown): ValidationResult<string> {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return { ok: false, error: 'Date must be formatted as YYYY-MM-DD' }
  }

  const [yearStr, monthStr, dayStr] = v.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)

  if (month < 1 || month > 12) {
    return { ok: false, error: 'Date has invalid month' }
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, error: 'Date is not a valid calendar day' }
  }

  return { ok: true, value: v }
}

/**
 * Validates watchlist priority against the check constraint on watchlist_items:
 * ('must_watch', 'want_to_watch', 'someday').
 */
export function parsePriority(v: unknown): ValidationResult<WatchlistPriority> {
  if (v === 'must_watch' || v === 'want_to_watch' || v === 'someday') {
    return { ok: true, value: v }
  }
  return { ok: false, error: 'Priority must be one of: must_watch, want_to_watch, someday' }
}
