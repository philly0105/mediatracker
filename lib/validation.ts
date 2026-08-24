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

  if (year < 1878 || year > new Date().getUTCFullYear() + 1) {
    return { ok: false, error: 'Date is out of range' }
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates UUIDv4 or standard UUID format.
 */
export function parseUuid(v: unknown): ValidationResult<string> {
  if (typeof v === 'string' && UUID_RE.test(v)) {
    return { ok: true, value: v }
  }
  return { ok: false, error: 'Invalid UUID format' }
}

/**
 * Validates bounded string text length to prevent memory exhaustion and storage bloat.
 */
export function parseText(v: unknown, maxLen = 5000, fieldName = 'Text'): ValidationResult<string | null> {
  if (v === null || v === undefined) {
    return { ok: true, value: null }
  }
  if (typeof v !== 'string') {
    return { ok: false, error: `${fieldName} must be a string` }
  }
  if (v.length > maxLen) {
    return { ok: false, error: `${fieldName} cannot exceed ${maxLen} characters` }
  }
  return { ok: true, value: v }
}

/**
 * Safely parses the JSON body of a Request.
 * Returns `{ ok: true, value }` on success, or `{ ok: false, error: 'Invalid or malformed JSON body' }` if body is malformed or invalid JSON.
 */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<ValidationResult<T>> {
  try {
    const value = await request.json()
    if (value === null || typeof value !== 'object') {
      return { ok: false, error: 'Invalid or malformed JSON body' }
    }
    return { ok: true, value: value as T }
  } catch {
    return { ok: false, error: 'Invalid or malformed JSON body' }
  }
}
