import type { WatchEntry } from '@/types'

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
