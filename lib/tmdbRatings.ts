'use client'
import { useEffect, useState } from 'react'
import type { MediaType } from '@/types'

// Coalesces per-card TMDB rating lookups into one request.
//
// Every MediaCard whose media.vote_average is null needs one number. Fetching
// per card meant ~24 concurrent requests per library page (and another 24 on
// every scroll). Requests raised inside the same tick-plus-a-bit are collected
// into a single batch, results are memoised for the life of the page, and
// duplicate keys in one render share a single lookup.

const BATCH_WINDOW_MS = 50
/** Matches MAX_IDS in app/api/tmdb/rating; anything over spills to the next batch. */
const MAX_BATCH = 40

const cache = new Map<string, number | null>()
const pending = new Map<string, Array<(value: number | null) => void>>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function cacheKey(tmdbId: number, type: MediaType) {
  return `${type}:${tmdbId}`
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flush, BATCH_WINDOW_MS)
}

async function flush() {
  flushTimer = null
  const keys = Array.from(pending.keys()).slice(0, MAX_BATCH)
  if (keys.length === 0) return

  // Detach the callbacks before awaiting so anything raised during the request
  // queues into the next batch rather than being resolved by this one.
  const claimed = keys.map((key) => {
    const callbacks = pending.get(key)!
    pending.delete(key)
    return [key, callbacks] as const
  })
  if (pending.size > 0) scheduleFlush()

  let ratings: Record<string, number> = {}
  try {
    const res = await fetch(`/api/tmdb/rating?ids=${encodeURIComponent(keys.join(','))}`)
    if (res.ok) ratings = (await res.json()).ratings ?? {}
  } catch {
    // Every waiter resolves null — the card just renders without a score.
  }

  for (const [key, callbacks] of claimed) {
    const value = ratings[key] ?? null
    cache.set(key, value)
    for (const resolve of callbacks) resolve(value)
  }
}

/** Resolves the TMDB score for one title, batched with everything else in flight. */
export function getTmdbRating(tmdbId: number, type: MediaType): Promise<number | null> {
  const key = cacheKey(tmdbId, type)
  const cached = cache.get(key)
  if (cached !== undefined) return Promise.resolve(cached)

  return new Promise((resolve) => {
    const existing = pending.get(key)
    if (existing) existing.push(resolve)
    else pending.set(key, [resolve])
    scheduleFlush()
  })
}

/**
 * `initial` is media.vote_average. Once the column is backfilled this hook
 * never issues a request at all.
 */
export function useTmdbRating(tmdbId: number, type: MediaType, initial: number | null): number | null {
  const [rating, setRating] = useState<number | null>(initial)

  useEffect(() => {
    if (initial != null) return
    let active = true
    getTmdbRating(tmdbId, type).then((value) => {
      if (active && value != null) setRating(value)
    })
    return () => { active = false }
  }, [tmdbId, type, initial])

  return rating
}

export function _resetForTesting() {
  cache.clear()
  pending.clear()
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

