import type { MediaType, WatchEntry } from '@/types'

// A single watched episode: its own watch date plus the runtime of its show.
export interface WatchedEpisode {
  watched_at: string
  runtime_mins: number | null
}

export function computeGenreBreakdown(entries: WatchEntry[]): Array<{ genre: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    for (const g of (e.media?.genres ?? [])) {
      counts[g] = (counts[g] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
}

export function computeRatingDistribution(entries: WatchEntry[]): Array<{ rating: number; count: number }> {
  const counts: Record<number, number> = {}
  for (const e of entries) {
    if (e.rating != null) counts[e.rating] = (counts[e.rating] ?? 0) + 1
  }
  return Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5)
    .map(rating => ({ rating, count: counts[rating] ?? 0 }))
}

// Why episodes are passed in separately: a show's watch_entries row represents a
// whole show but its media.runtime_mins is a single episode's length, and the row
// itself is neither a movie nor an episode. So we bucket movies from watch_entries
// and bucket episodes from the episode_progress rows (WatchedEpisode[]) by each
// episode's own watched_at. A show's watch_entries row must not count toward either.
export function computeMonthlyActivity(
  entries: WatchEntry[],
  episodes: WatchedEpisode[],
  months: number
): Array<{ month: string; movies: number; episodes: number }> {
  const now = new Date()
  const result = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { month, movies: 0, episodes: 0 }
  })

  for (const e of entries) {
    if (e.media?.type !== 'movie') continue
    const month = e.watched_at.slice(0, 7)
    const bucket = result.find(r => r.month === month)
    if (!bucket) continue
    bucket.movies++
  }

  for (const ep of episodes) {
    const month = ep.watched_at.slice(0, 7)
    const bucket = result.find(r => r.month === month)
    if (!bucket) continue
    bucket.episodes++
  }

  return result
}

// Why episodes are counted separately: movie entries contribute their full runtime,
// but a show's media.runtime_mins is a single episode's length (per-episode), so each
// watched episode contributes that runtime and the show's own watch_entries row adds
// nothing on top (its per-episode runtime would double count). Returns hours as a
// float; callers that want a whole number round it themselves.
export function computeTotalHours(
  entries: WatchEntry[],
  episodes: WatchedEpisode[]
): number {
  let totalMinutes = 0
  for (const e of entries) {
    if (e.media?.type !== 'movie') continue
    totalMinutes += e.media.runtime_mins ?? 0
  }
  for (const ep of episodes) {
    totalMinutes += ep.runtime_mins ?? 0
  }
  return totalMinutes / 60
}

export function computeTopDirectors(entries: WatchEntry[]): Array<{ name: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    if (e.media?.director) counts[e.media.director] = (counts[e.media.director] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

export function computeTopActors(entries: WatchEntry[]): Array<{ name: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const e of entries) {
    for (const actor of (e.media?.cast_members ?? [])) {
      counts[actor] = (counts[actor] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

// --- Date helpers -----------------------------------------------------------
// All of these work on YYYY-MM-DD strings and construct local dates rather than
// going through `new Date(str)`, which parses a bare date as UTC and shifts the
// day west of Greenwich. Same reasoning as lib/formatDate.

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isNextDay(earlier: string, later: string): boolean {
  const [y, m, d] = earlier.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return dayKey(next) === later
}

/**
 * The user's own best-of list. Ratings are the one thing the app collects and
 * never showed back. Deduplicated by title so a rewatch does not occupy two
 * slots — the best rating given to a title wins.
 */
export function computeTopRated(
  entries: WatchEntry[],
  limit = 5
): Array<{ title: string; type: MediaType; rating: number; watched_at: string }> {
  const best = new Map<string, { title: string; type: MediaType; rating: number; watched_at: string }>()

  for (const e of entries) {
    if (e.rating == null || !e.media) continue
    const key = `${e.media.type}-${e.media.title}`
    const existing = best.get(key)
    if (!existing || e.rating > existing.rating) {
      best.set(key, {
        title: e.media.title,
        type: e.media.type,
        rating: e.rating,
        watched_at: e.watched_at,
      })
    }
  }

  return Array.from(best.values())
    .sort((a, b) => b.rating - a.rating || b.watched_at.localeCompare(a.watched_at))
    .slice(0, limit)
}

/** The `rewatch` column has been queried by the stats page and never used. */
export function computeRewatchCount(entries: WatchEntry[]): number {
  return entries.filter(e => e.rewatch).length
}

/**
 * Consecutive days on which anything was watched — a movie entry or an episode.
 *
 * A day still in progress must not read as a broken streak, so a run ending
 * today or yesterday still counts as current. Show `watch_entries` rows are
 * included: unlike the runtime maths, a "day you watched something" is true
 * whichever kind of row recorded it.
 */
export function computeStreaks(
  entries: WatchEntry[],
  episodes: WatchedEpisode[],
  today = new Date()
): { current: number; longest: number } {
  const days = new Set<string>()
  for (const e of entries) if (e.watched_at) days.add(e.watched_at.slice(0, 10))
  for (const ep of episodes) if (ep.watched_at) days.add(ep.watched_at.slice(0, 10))
  if (days.size === 0) return { current: 0, longest: 0 }

  const sorted = Array.from(days).sort()

  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = isNextDay(sorted[i - 1], sorted[i]) ? run + 1 : 1
    if (run > longest) longest = run
  }

  const todayKey = dayKey(today)
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const last = sorted[sorted.length - 1]

  let current = 0
  if (last === todayKey || last === dayKey(yesterday)) {
    current = 1
    for (let i = sorted.length - 1; i > 0; i--) {
      if (!isNextDay(sorted[i - 1], sorted[i])) break
      current++
    }
  }

  return { current, longest }
}

/** Jan–Dec buckets for one calendar year, in the shape the activity chart takes. */
export function computeYearlyActivity(
  entries: WatchEntry[],
  episodes: WatchedEpisode[],
  year: number
): Array<{ month: string; movies: number; episodes: number }> {
  const result = Array.from({ length: 12 }, (_, i) => ({
    month: `${year}-${pad(i + 1)}`,
    movies: 0,
    episodes: 0,
  }))

  for (const e of entries) {
    if (e.media?.type !== 'movie') continue
    const bucket = result.find(r => r.month === e.watched_at.slice(0, 7))
    if (bucket) bucket.movies++
  }

  for (const ep of episodes) {
    const bucket = result.find(r => r.month === ep.watched_at.slice(0, 7))
    if (bucket) bucket.episodes++
  }

  return result
}

/** Every year with activity, newest first — the options for the year selector. */
export function availableYears(entries: WatchEntry[], episodes: WatchedEpisode[]): number[] {
  const years = new Set<number>()
  for (const e of entries) if (e.watched_at) years.add(Number(e.watched_at.slice(0, 4)))
  for (const ep of episodes) if (ep.watched_at) years.add(Number(ep.watched_at.slice(0, 4)))
  return Array.from(years).filter(Number.isFinite).sort((a, b) => b - a)
}
